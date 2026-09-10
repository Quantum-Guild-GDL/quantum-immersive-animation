import { clamp, lerp } from "./math.js";

function normalizeOrientation(value) {
  const angle = ((Number(value) % 360) + 360) % 360;
  return [0, 90, 180, 270].includes(angle) ? angle : 0;
}

export class ScreenMapper {
  constructor(config, canvas) {
    this.config = config;
    this.canvas = canvas;
    this.outputId = this.readOutputId();
    this.screens = config.screens.map((screen) => ({
      ...screen,
      orientation: normalizeOrientation(screen.orientation),
      transitionDelay: Number(screen.transitionDelay) || 0,
    }));
    this.bounds = this.calculateBounds(this.screens);
    this.output = this.screens.find((screen) => screen.id === this.outputId) || null;
    this.view = this.output || this.bounds;
  }

  readOutputId() {
    const raw = new URLSearchParams(location.search).get("screen");
    if (!raw) return null;
    return /^\d+$/.test(raw) ? `SCREEN_${Number(raw)}` : raw.toUpperCase();
  }

  calculateBounds(screens) {
    const minX = Math.min(...screens.map((screen) => screen.x));
    const minY = Math.min(...screens.map((screen) => screen.y));
    const maxX = Math.max(...screens.map((screen) => screen.x + screen.width));
    const maxY = Math.max(...screens.map((screen) => screen.y + screen.height));
    return { id: "VIRTUAL_CANVAS", x: minX, y: minY, width: maxX - minX, height: maxY - minY, orientation: 0 };
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    const rotated = this.output && [90, 270].includes(this.output.orientation);
    const viewWidth = rotated ? this.view.height : this.view.width;
    const viewHeight = rotated ? this.view.width : this.view.height;
    this.scaleX = width / viewWidth;
    this.scaleY = height / viewHeight;
    this.scale = Math.min(this.scaleX, this.scaleY);
  }

  point(x, y) {
    let u = (x - this.view.x) / this.view.width;
    let v = (y - this.view.y) / this.view.height;
    const orientation = this.output?.orientation || 0;
    if (orientation === 90) [u, v] = [1 - v, u];
    if (orientation === 180) [u, v] = [1 - u, 1 - v];
    if (orientation === 270) [u, v] = [v, 1 - u];
    return { x: u * this.width, y: v * this.height };
  }

  isVisible(x, y, margin = 120) {
    return x >= this.view.x - margin && x <= this.view.x + this.view.width + margin
      && y >= this.view.y - margin && y <= this.view.y + this.view.height + margin;
  }

  radius(worldRadius) {
    return worldRadius * this.scale;
  }

  // Returns a position along the configured screen route. A transition delay creates
  // a brief invisible interval after one screen and before the next.
  routePosition(progress, duration, yRatio = .5) {
    const route = [...this.screens].sort((a, b) => a.x - b.x || a.y - b.y);
    const delays = route.slice(0, -1).reduce((sum, screen) => sum + screen.transitionDelay, 0);
    const travelTime = Math.max(.001, duration - delays);
    const totalWidth = route.reduce((sum, screen) => sum + screen.width, 0);
    let cursor = clamp(progress) * duration;

    for (let index = 0; index < route.length; index++) {
      const screen = route[index];
      const segmentTime = travelTime * screen.width / totalWidth;
      if (cursor <= segmentTime || index === route.length - 1) {
        const local = clamp(cursor / segmentTime);
        return {
          x: lerp(screen.x - screen.width * .18, screen.x + screen.width * 1.18, local),
          y: screen.y + screen.height * yRatio,
          visible: true,
          screenId: screen.id,
        };
      }
      cursor -= segmentTime;
      if (index < route.length - 1) {
        if (cursor < screen.transitionDelay) {
          return { x: screen.x + screen.width * 1.2, y: screen.y + screen.height * yRatio, visible: false, screenId: screen.id };
        }
        cursor -= screen.transitionDelay;
      }
    }
    const last = route.at(-1);
    return { x: last.x + last.width, y: last.y + last.height * yRatio, visible: false, screenId: last.id };
  }
}
