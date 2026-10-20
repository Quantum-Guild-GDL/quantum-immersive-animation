import { lerp, rgba, smootherstep, smoothstep } from "../core/math.js";

export class QuantumCat {
  constructor(config, bounds, timeline) {
    this.config = config;
    this.bounds = bounds;
    this.timeline = timeline;
    this.image = new Image();
    this.image.src = config.cat.asset;
    this.finaleLogo = new Image();
    this.finaleLogo.src = config.finale.logoAsset;
    this.finaleCat = new Image();
    this.finaleCat.src = config.finale.catAsset;
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
    const logoReveal = smoothstep(97.2, 99.5, time) * (1 - smoothstep(103, 106, time));
    if (reveal <= .001 && logoReveal <= .001) return;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    if (this.finaleLogo.complete && this.finaleLogo.naturalWidth) {
      const logoWidth = mapper.radius(this.config.finale.logoWidth);
      const logoHeight = logoWidth * this.finaleLogo.naturalHeight / this.finaleLogo.naturalWidth;
      ctx.globalAlpha = logoReveal * .72;
      ctx.shadowBlur = 15;
      ctx.shadowColor = rgba(this.config.palette.violet, .3);
      mapper.screens.forEach((screen) => {
        const x = screen.x + screen.width * .5;
        const y = screen.y + screen.height * .34;
        if (!mapper.isVisible(x, y, this.config.finale.logoWidth)) return;
        const logoCenter = mapper.point(x, y);
        ctx.drawImage(this.finaleLogo, logoCenter.x - logoWidth / 2, logoCenter.y - logoHeight / 2, logoWidth, logoHeight);
      });
    }

    if (this.finaleCat.complete && this.finaleCat.naturalWidth) {
      const catWidth = mapper.radius(this.config.finale.catWidth);
      const catHeight = catWidth * this.finaleCat.naturalHeight / this.finaleCat.naturalWidth;
      ctx.globalAlpha = reveal * .68;
      ctx.shadowBlur = 18;
      ctx.shadowColor = rgba(this.config.palette.violet, .32);
      mapper.screens.forEach((screen) => {
        const x = screen.x + screen.width * .5;
        const y = screen.y + screen.height;
        if (!mapper.isVisible(x, y, this.config.finale.catWidth)) return;
        const bottomCenter = mapper.point(x, y);
        const hiddenTop = bottomCenter.y + catHeight * .04;
        const visibleTop = bottomCenter.y - catHeight * .78;
        const top = lerp(hiddenTop, visibleTop, reveal);
        ctx.drawImage(this.finaleCat, bottomCenter.x - catWidth / 2, top, catWidth, catHeight);
      });
    }
    ctx.restore();
  }
}
