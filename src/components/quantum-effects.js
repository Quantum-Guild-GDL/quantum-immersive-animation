import { envelope, rgba, seeded, smoothstep } from "../core/math.js";

export class QuantumEffects {
  constructor(config, bounds, timeline, environment) {
    this.config = config;
    this.bounds = bounds;
    this.timeline = timeline;
    this.environment = environment;
  }

  interactionIntensity(time) {
    const scene = this.timeline.scenes.interaction;
    return envelope(time, scene.start, scene.end, 2.4);
  }

  render(ctx, mapper, time) {
    this.drawInteraction(ctx, mapper, time);
    this.drawPawPrints(ctx, mapper, time);
    this.drawPumpkin(ctx, mapper, time);
  }

  drawInteraction(ctx, mapper, time) {
    const intensity = this.interactionIntensity(time);
    if (intensity <= .001) return;
    const sphere = this.environment.reactionSphere;
    if (!mapper.isVisible(sphere.x, sphere.y, 420)) return;
    const c = mapper.point(sphere.x, sphere.y);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let ring = 0; ring < 5; ring++) {
      const phase = ((time - 37) * .36 + ring / 5) % 1;
      const radius = mapper.radius(sphere.radius + 20 + phase * 230);
      ctx.strokeStyle = rgba(ring % 2 ? this.config.palette.cyan : this.config.palette.violet, intensity * (1 - phase) * .16);
      ctx.lineWidth = .7;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, radius * 1.8, radius * .42, Math.sin(time * .08) * .15, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let ray = 0; ray < 9; ray++) {
      const angle = ray / 9 * Math.PI * 2 + time * .025;
      const start = mapper.radius(sphere.radius * 1.1);
      const end = mapper.radius(sphere.radius * (1.45 + seeded(ray) * .7));
      ctx.strokeStyle = rgba(this.config.palette.violet, intensity * .11);
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(angle) * start, c.y + Math.sin(angle) * start);
      ctx.lineTo(c.x + Math.cos(angle) * end, c.y + Math.sin(angle) * end);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPawPrints(ctx, mapper, time) {
    const scene = this.timeline.scenes.pawPrints;
    if (time < scene.start || time > scene.end) return;
    const positions = [
      [.46, .67, -.12], [.515, .61, .09], [.57, .68, -.08], [.625, .62, .11],
    ];
    positions.forEach(([nx, ny, rotation], index) => {
      const localStart = scene.start + index * .72;
      const opacity = smoothstep(localStart, localStart + 1.1, time) * (1 - smoothstep(localStart + 3.4, localStart + 6.4, time));
      if (opacity <= .001) return;
      const x = this.bounds.x + this.bounds.width * nx;
      const y = this.bounds.y + this.bounds.height * ny;
      if (!mapper.isVisible(x, y, 80)) return;
      const p = mapper.point(x, y);
      const fragment = smoothstep(localStart + 3.1, localStart + 6.2, time);
      this.drawParticlePaw(ctx, mapper, p.x, p.y, rotation, opacity, fragment, index);
    });
  }

  drawParticlePaw(ctx, mapper, x, y, rotation, opacity, fragment, seed) {
    const scale = mapper.scale;
    const pads = [[0, 8, 11], [-14, -6, 5], [-5, -14, 5], [6, -14, 5], [15, -5, 5]];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalCompositeOperation = "lighter";
    pads.forEach(([px, py, radius], padIndex) => {
      const dots = padIndex ? 7 : 15;
      for (let dot = 0; dot < dots; dot++) {
        const angle = seeded(seed * 100 + padIndex * 17 + dot) * Math.PI * 2;
        const distance = Math.sqrt(seeded(seed * 200 + padIndex * 31 + dot)) * radius;
        const drift = fragment * (8 + seeded(seed * 300 + dot) * 22);
        const dx = (px + Math.cos(angle) * (distance + drift)) * scale;
        const dy = (py + Math.sin(angle) * (distance + drift)) * scale;
        const color = (dot + padIndex) % 3 ? this.config.palette.cyan : this.config.palette.violet;
        ctx.fillStyle = rgba(color, opacity * (1 - fragment) * .52);
        ctx.shadowBlur = 7;
        ctx.shadowColor = rgba(color, .55);
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(.45, scale * .75), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  drawPumpkin(ctx, mapper, time) {
    const scene = this.timeline.scenes.halloween;
    if (time < scene.start || time > scene.end) return;
    const x = this.bounds.x + this.bounds.width * .765;
    const y = this.bounds.y + this.bounds.height * .64;
    if (!mapper.isVisible(x, y, 90)) return;
    const appearance = smoothstep(63, 67, time);
    const dissolve = smoothstep(74, 80, time);
    const opacity = appearance * (1 - dissolve);
    const p = mapper.point(x, y);
    const radius = mapper.radius(24);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = opacity * .48;
    ctx.strokeStyle = rgba(this.config.palette.pumpkin, .82);
    ctx.lineWidth = .8;
    ctx.shadowBlur = 13;
    ctx.shadowColor = rgba(this.config.palette.violet, .75);
    [-.42, 0, .42].forEach((offset) => {
      ctx.beginPath();
      ctx.ellipse(p.x + offset * radius, p.y, radius * .58, radius, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - radius);
    ctx.lineTo(p.x + radius * .14, p.y - radius * 1.34);
    ctx.stroke();
    ctx.restore();

    if (dissolve > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let particle = 0; particle < 34; particle++) {
        const angle = seeded(particle + 510) * Math.PI * 2;
        const distance = radius * (1 + dissolve * (1 + seeded(particle + 610) * 3));
        ctx.fillStyle = rgba(particle % 3 ? this.config.palette.violet : this.config.palette.pumpkin, (1 - dissolve) * .42);
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(angle) * distance, p.y + Math.sin(angle) * distance, .65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

