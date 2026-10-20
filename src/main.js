import { SCREEN_CONFIG } from "./config/screen-config.js";
import { TIMELINE } from "./config/timeline-config.js";
import { VISUAL_CONFIG } from "./config/scene-config.js";
import { Timeline } from "./core/timeline.js";
import { ScreenMapper } from "./core/screen-mapper.js";
import { QuantumEnvironment } from "./components/quantum-environment.js";
import { QuantumCat } from "./components/cat-component.js";
import { QuantumEffects } from "./components/quantum-effects.js";
import { drawDebugOverlay } from "./components/debug-overlay.js";
import { mountAudioControls } from "./components/quantum-audio.js";
import { clamp } from "./core/math.js";
import { RESOURCE_CONFIG } from "./config/resource-config.js";
import { QuantumPanels } from "./components/quantum-panels.js";
import { ResourceScreens } from "./components/resource-screens.js";

const canvas = document.querySelector("#quantum-canvas");
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
const mapper = new ScreenMapper(SCREEN_CONFIG, canvas);
const clock = new Timeline(TIMELINE);
const environment = new QuantumEnvironment(VISUAL_CONFIG, mapper.bounds);
const cat = new QuantumCat(VISUAL_CONFIG, mapper.bounds, TIMELINE);
const effects = new QuantumEffects(VISUAL_CONFIG, mapper.bounds, TIMELINE, environment);
const panels = new QuantumPanels(TIMELINE, cat.finaleLogo);
const resources = new ResourceScreens(RESOURCE_CONFIG, TIMELINE);
const performanceConfig = VISUAL_CONFIG.performance;
const frameInterval = 1000 / performanceConfig.targetFps;
const embeddedPreview = window.parent !== window && new URLSearchParams(location.search).has("preview");
let audio = null;
let lastAudioFrameAt = -Infinity;
if (!embeddedPreview) {
  const controls = document.createElement("aside");
  controls.className = "audio-floating";
  controls.setAttribute("aria-label", "Sonido espacial");
  document.body.append(controls);
  audio = mountAudioControls(controls, TIMELINE);
}
let lastFrameAt = 0;
let renderQuality = 1;
let overBudgetFrames = 0;
let stableFrames = 0;

if (SCREEN_CONFIG.debugMode) {
  const debugTime = new URLSearchParams(location.search).get("time");
  if (debugTime !== null && Number.isFinite(Number(debugTime))) {
    clock.seek(Number(debugTime));
    clock.toggle();
  }
}

function validateConfiguration() {
  if (!SCREEN_CONFIG.screens.length) throw new Error("At least one screen must be configured.");
  const ids = new Set();
  SCREEN_CONFIG.screens.forEach((screen) => {
    if (!screen.id || ids.has(screen.id)) throw new Error(`Invalid or duplicate screen ID: ${screen.id}`);
    if (screen.width <= 0 || screen.height <= 0) throw new Error(`Invalid dimensions for ${screen.id}`);
    ids.add(screen.id);
  });
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, performanceConfig.dprCap);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mapper.resize(innerWidth, innerHeight);
}

function updateAdaptiveQuality(renderCost) {
  const budget = frameInterval * .82;
  if (renderCost > budget) {
    overBudgetFrames += 1;
    stableFrames = 0;
  } else {
    stableFrames += 1;
    overBudgetFrames = Math.max(0, overBudgetFrames - 1);
  }

  if (overBudgetFrames >= 14 && renderQuality > performanceConfig.minimumQuality) {
    renderQuality = Math.max(performanceConfig.minimumQuality, renderQuality - performanceConfig.qualityStep);
    environment.setQuality(renderQuality);
    overBudgetFrames = 0;
  } else if (stableFrames >= 320 && renderQuality < 1) {
    renderQuality = Math.min(1, renderQuality + performanceConfig.qualityStep);
    environment.setQuality(renderQuality);
    stableFrames = 0;
  }
}

function render(timestamp) {
  requestAnimationFrame(render);
  if (timestamp - lastFrameAt < frameInterval) return;
  lastFrameAt = timestamp - ((timestamp - lastFrameAt) % frameInterval);
  const renderStartedAt = performance.now();
  const time = clock.time;
  const interaction = effects.interactionIntensity(time);
  environment.render(ctx, mapper, time, interaction);
  const resourceFrame = resources.frame(mapper, time, clock.cycle);
  panels.render(ctx, mapper, time, resourceFrame.alpha > .1 ? resourceFrame.assignments : [], renderQuality);
  effects.render(ctx, mapper, time);
  resources.render(ctx, mapper, time, clock.cycle, clock.running);
  cat.render(ctx, mapper, time);
  if (timestamp - lastAudioFrameAt >= 75) {
    const position = cat.getJourneyPosition(mapper, time);
    const frame = {
      time,
      running: clock.running,
      catPan: clamp((position.x - mapper.bounds.x) / mapper.bounds.width * 2 - 1, -1, 1),
      catVisible: position.visible,
    };
    if (embeddedPreview) window.parent.postMessage({ type: "quantum-audio-frame", ...frame }, location.origin);
    else audio.update(frame);
    lastAudioFrameAt = timestamp;
  }
  if (SCREEN_CONFIG.debugMode) {
    drawDebugOverlay(ctx, mapper, time, cat, TIMELINE, VISUAL_CONFIG.palette);
  }
  updateAdaptiveQuality(performance.now() - renderStartedAt);
}

addEventListener("resize", resize);
addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLElement && event.target.closest("button, input, select, textarea")) return;
  if (event.key.toLowerCase() === "f") {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }
  if (event.code === "Space" && SCREEN_CONFIG.debugMode) {
    event.preventDefault();
    clock.toggle();
  }
  if (SCREEN_CONFIG.debugMode && /^\d$/.test(event.key)) {
    clock.seek(Number(event.key) * 10);
  }
});
canvas.addEventListener("dblclick", () => document.documentElement.requestFullscreen?.());

// The HTML preview can replay the finale without changing the installation clock.
addEventListener("message", (event) => {
  if (!embeddedPreview || event.origin !== location.origin || event.source !== window.parent) return;
  if (event.data?.type !== "quantum-seek" || !Number.isFinite(event.data.time)) return;
  clock.seek(clamp(event.data.time, 0, TIMELINE.loopDuration));
  const shouldRun = event.data.paused !== true;
  if (clock.running !== shouldRun) clock.toggle();
});

validateConfiguration();
resize();
requestAnimationFrame(render);
