import { clamp, lerp, rgba, smootherstep, smoothstep } from "../core/math.js";

export class QuantumCat {
  constructor(config, bounds, timeline) {
    this.config = config;
    this.bounds = bounds;
    this.timeline = timeline;
    this.image = new Image();
    this.image.src = config.cat.asset;
  }

  render(ctx, mapper, time) {
    const scenes = this.timeline.scenes;
    if (time >= scenes.tail.start && time <= scenes.tail.end) this.drawTailGlimpse(ctx, mapper, time);
    if (time >= scenes.astronautCat.start && time <= scenes.astronautCat.end) this.drawJourney(ctx, mapper, time);
    if (time >= scenes.peek.start && time <= scenes.peek.end) this.drawFinale(ctx, mapper, time);
  }

  journeyProgress(time) {
    if (time < 63) return smootherstep(23, 63, time) * .69;
    if (time < 69) return lerp(.69, .77, smootherstep(63, 69, time));
    if (time < 74) return .77;
    return lerp(.77, 1, smootherstep(74, 81, time));
  }

  getJourneyPosition(mapper, time) {
    const scene = this.timeline.scenes.astronautCat;
    const progress = this.journeyProgress(time);
    const route = mapper.routePosition(progress, scene.end - scene.start, this.config.cat.trajectoryY);
    const drift = Math.sin((time - scene.start) * .19) * 22;
    return { ...route, y: route.y + drift, progress };
  }

  drawJourney(ctx, mapper, time) {
    if (!this.image.complete || !this.image.naturalWidth) return;
    const position = this.getJourneyPosition(mapper, time);
    if (!position.visible || !mapper.isVisible(position.x, position.y, this.config.cat.width)) return;
    const superScene = this.timeline.scenes.superposition;
    const inSuperposition = time >= superScene.start && time <= superScene.end;
    const entry = smoothstep(23, 28, time);
    const exit = 1 - smoothstep(78, 81, time);
    const opacity = this.config.cat.opacity * entry * exit;
    const rotation = Math.sin((time - 23) * .11) * .022;

    if (inSuperposition) {
      const pulse = Math.sin((time - superScene.start) / (superScene.end - superScene.start) * Math.PI);
      this.drawImage(ctx, mapper, position.x - 24 * pulse, position.y - 13 * pulse, rotation - .012, opacity * .52, this.config.palette.cyan);
      this.drawImage(ctx, mapper, position.x + 27 * pulse, position.y + 15 * pulse, rotation + .015, opacity * .48, this.config.palette.magenta);
    } else {
      this.drawImage(ctx, mapper, position.x, position.y, rotation, opacity, this.config.palette.violet);
    }
  }

  drawImage(ctx, mapper, worldX, worldY, rotation, opacity, glow) {
    const point = mapper.point(worldX, worldY);
    const width = mapper.radius(this.config.cat.width);
    const height = width * this.image.naturalHeight / this.image.naturalWidth;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(rotation);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = opacity;
    ctx.shadowBlur = 24;
    ctx.shadowColor = rgba(glow, .45);
    ctx.drawImage(this.image, -width * .5, -height * .5, width, height);
    ctx.restore();
  }

  drawTailGlimpse(ctx, mapper, time) {
    const progress = smoothstep(16, 18.2, time) * (1 - smoothstep(20, 23, time));
    if (progress <= .001) return;
    const baseX = this.bounds.x + this.bounds.width * .985;
    const baseY = this.bounds.y + this.bounds.height * (.69 - (time - 16) * .006);
    if (!mapper.isVisible(baseX, baseY, 280)) return;
    const p = mapper.point(baseX, baseY);
    const scale = mapper.scale;
    ctx.save();
    ctx.globalAlpha = progress * .42;
    ctx.lineCap = "round";
    ctx.lineWidth = 54 * scale;
    ctx.strokeStyle = "#01030a";
    ctx.shadowBlur = 12;
    ctx.shadowColor = rgba(this.config.palette.violet, .45);
    ctx.beginPath();
    ctx.moveTo(p.x + 120 * scale, p.y + 60 * scale);
    ctx.bezierCurveTo(p.x + 10 * scale, p.y + 70 * scale, p.x - 90 * scale, p.y - 25 * scale, p.x - 185 * scale, p.y + 20 * scale);
    ctx.stroke();
    ctx.globalAlpha = progress * .18;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba(this.config.palette.violet, .8);
    ctx.stroke();
    ctx.restore();
  }

  drawFinale(ctx, mapper, time) {
    const reveal = smoothstep(94, 98, time) * (1 - smoothstep(103, 106, time));
    if (reveal <= .001) return;
    const center = mapper.point(this.bounds.x + this.bounds.width * .5, this.bounds.y + this.bounds.height);
    const scale = mapper.scale;
    const rise = reveal * 122 * scale;
    const y = center.y + 58 * scale - rise;
    const eyeReveal = smoothstep(97, 99, time) * (1 - smoothstep(103, 106, time));

    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.fillStyle = "#010208";
    ctx.strokeStyle = rgba(this.config.palette.violet, .2);
    ctx.lineWidth = 1;
    ctx.shadowBlur = 18;
    ctx.shadowColor = rgba(this.config.palette.violet, .25);
    ctx.beginPath();
    ctx.moveTo(center.x - 88 * scale, y + 72 * scale);
    ctx.quadraticCurveTo(center.x - 92 * scale, y - 18 * scale, center.x - 57 * scale, y - 48 * scale);
    ctx.lineTo(center.x - 38 * scale, y - 111 * scale);
    ctx.lineTo(center.x - 3 * scale, y - 67 * scale);
    ctx.quadraticCurveTo(center.x + 28 * scale, y - 72 * scale, center.x + 45 * scale, y - 58 * scale);
    ctx.lineTo(center.x + 82 * scale, y - 102 * scale);
    ctx.lineTo(center.x + 91 * scale, y - 34 * scale);
    ctx.quadraticCurveTo(center.x + 104 * scale, y + 38 * scale, center.x + 82 * scale, y + 72 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = eyeReveal * .64;
    ctx.strokeStyle = rgba(this.config.palette.cyan, .9);
    ctx.lineWidth = 1.4 * scale;
    ctx.shadowBlur = 12;
    ctx.shadowColor = rgba(this.config.palette.cyan, .9);
    [[-37, -22], [40, -22]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(center.x + (dx - 11) * scale, y + dy * scale);
      ctx.quadraticCurveTo(center.x + dx * scale, y + (dy + 7) * scale, center.x + (dx + 11) * scale, y + dy * scale);
      ctx.stroke();
    });
    ctx.restore();

    this.drawFinaleText(ctx, mapper, time);
  }

  drawFinaleText(ctx, mapper, time) {
    const opacity = smoothstep(97.8, 100, time) * (1 - smoothstep(103, 106, time));
    if (opacity <= .001) return;
    const p = mapper.point(this.bounds.x + this.bounds.width * .5, this.bounds.y + this.bounds.height * .55);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = opacity * .78;
    ctx.textAlign = "center";
    ctx.fillStyle = rgba(this.config.palette.white, .92);
    ctx.shadowBlur = 18;
    ctx.shadowColor = rgba(this.config.palette.cyan, .5);
    ctx.font = `300 ${Math.max(18, mapper.radius(34))}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText("Qiskit Fall Fest", p.x, p.y);
    ctx.fillStyle = rgba(this.config.palette.cyan, .72);
    ctx.font = `500 ${Math.max(9, mapper.radius(14))}px ui-monospace, monospace`;
    ctx.fillText("Guadalajara 2026", p.x, p.y + mapper.radius(34));
    ctx.restore();
  }
}
