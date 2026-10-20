import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, Image } from "@napi-rs/canvas";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
process.chdir(projectRoot);

globalThis.location = { search: "" };
globalThis.Image = Image;

const [
  { SCREEN_CONFIG },
  { TIMELINE },
  { VISUAL_CONFIG },
  { ScreenMapper },
  { QuantumEnvironment },
  { QuantumCat },
  { QuantumEffects },
  { RESOURCE_CONFIG },
  { QuantumPanels },
  { ResourceScreens },
] = await Promise.all([
  import("../src/config/screen-config.js"),
  import("../src/config/timeline-config.js"),
  import("../src/config/scene-config.js"),
  import("../src/core/screen-mapper.js"),
  import("../src/components/quantum-environment.js"),
  import("../src/components/cat-component.js"),
  import("../src/components/quantum-effects.js"),
  import("../src/config/resource-config.js"),
  import("../src/components/quantum-panels.js"),
  import("../src/components/resource-screens.js"),
]);

const mapper = new ScreenMapper(SCREEN_CONFIG);
const { width, height } = mapper.bounds;
const fps = VISUAL_CONFIG.performance.targetFps;
const frameCount = Math.round(TIMELINE.loopDuration * fps);
const outputPath = join(projectRoot, "exports", `quantum-cat-journey-${width}x${height}.mp4`);

await mkdir(dirname(outputPath), { recursive: true });

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
mapper.canvas = canvas;
mapper.resize(width, height);

const environment = new QuantumEnvironment(VISUAL_CONFIG, mapper.bounds);
const cat = new QuantumCat(VISUAL_CONFIG, mapper.bounds, TIMELINE);
const effects = new QuantumEffects(VISUAL_CONFIG, mapper.bounds, TIMELINE, environment);
const panels = new QuantumPanels(TIMELINE, cat.finaleLogo);
const resources = new ResourceScreens(RESOURCE_CONFIG, TIMELINE);

await Promise.all([
  cat.image.decode(),
  cat.finaleLogo.decode(),
  cat.finaleCat.decode(),
  resources.ready,
]);

const ffmpeg = spawn("ffmpeg", [
  "-hide_banner",
  "-loglevel", "error",
  "-f", "rawvideo",
  "-pix_fmt", "rgba",
  "-video_size", `${width}x${height}`,
  "-framerate", String(fps),
  "-i", "pipe:0",
  "-an",
  "-c:v", "hevc_videotoolbox",
  "-allow_sw", "1",
  "-realtime", "true",
  "-b:v", "80M",
  "-tag:v", "hvc1",
  "-movflags", "+faststart",
  "-y",
  outputPath,
], { stdio: ["pipe", "inherit", "inherit"] });

ffmpeg.on("error", (error) => {
  console.error(`No fue posible iniciar FFmpeg: ${error.message}`);
});

const startedAt = performance.now();

for (let frame = 0; frame < frameCount; frame += 1) {
  const time = frame / fps;
  const interaction = effects.interactionIntensity(time);

  environment.render(ctx, mapper, time, interaction);
  const resourceFrame = resources.frame(mapper, time);
  panels.render(ctx, mapper, time, resourceFrame.alpha > .1 ? resourceFrame.assignments : []);
  effects.render(ctx, mapper, time);
  resources.render(ctx, mapper, time);
  cat.render(ctx, mapper, time);

  if (!ffmpeg.stdin.write(canvas.data())) {
    await once(ffmpeg.stdin, "drain");
  }

  if (frame % (fps * 5) === 0 || frame === frameCount - 1) {
    const percent = ((frame + 1) / frameCount * 100).toFixed(1);
    const elapsed = ((performance.now() - startedAt) / 1000).toFixed(0);
    console.log(`Render ${percent}% · ${elapsed}s`);
  }
}

ffmpeg.stdin.end();
const [exitCode] = await once(ffmpeg, "close");

if (exitCode !== 0) {
  throw new Error(`FFmpeg terminó con código ${exitCode}`);
}

console.log(`MP4 creado: ${outputPath}`);
