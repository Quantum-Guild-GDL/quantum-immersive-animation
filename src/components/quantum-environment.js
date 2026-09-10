import { rgba, seeded } from "../core/math.js";

export class QuantumEnvironment {
  constructor(config, bounds) {
    this.config = config;
    this.palette = config.palette;
    this.bounds = bounds;
    this.quality = 1;
    this.particles = Array.from({ length: config.particleCount }, (_, index) => ({
      x: bounds.x + seeded(index * 8 + 1) * bounds.width,
      y: bounds.y + (.08 + seeded(index * 8 + 2) * .84) * bounds.height,
      depth: .15 + seeded(index * 8 + 3) * .85,
      size: .35 + seeded(index * 8 + 4) * 1.45,
      speed: 1.5 + seeded(index * 8 + 5) * 7,
      phase: seeded(index * 8 + 6) * Math.PI * 2,
      violet: seeded(index * 8 + 7) > .82,
    }));
    const sphereLayout = [
      [.08, .3, 38], [.22, .68, 88], [.42, .34, 66], [.58, .82, 108],
      [.71, .24, 48], [.86, .78, 76], [.96, .42, 34],
    ];
    this.spheres = Array.from({ length: config.sphereCount }, (_, index) => ({
      x: bounds.x + sphereLayout[index % sphereLayout.length][0] * bounds.width,
      y: bounds.y + sphereLayout[index % sphereLayout.length][1] * bounds.height,
      radius: sphereLayout[index % sphereLayout.length][2],
      phase: seeded(index + 800) * Math.PI * 2,
      speed: .08 + seeded(index + 900) * .1,
    }));
    this.reactionSphere = this.spheres[2];
  }

  setQuality(quality) {
    this.quality = Math.max(this.config.performance.minimumQuality, Math.min(1, quality));
  }

  render(ctx, mapper, time, interaction = 0) {
    this.drawBackground(ctx, mapper, time);
    this.drawOrbitalField(ctx, mapper, time);
    this.drawParticles(ctx, mapper, time, interaction);
    this.spheres.forEach((sphere, index) => this.drawSphere(ctx, mapper, sphere, time, index === 2 ? interaction : 0));
    this.drawVignette(ctx, mapper);
  }

  drawBackground(ctx, mapper, time) {
    const center = mapper.point(
      this.bounds.x + this.bounds.width * (.47 + Math.sin(time * .025) * .03),
      this.bounds.y + this.bounds.height * .48,
    );
    const reach = Math.max(mapper.width, mapper.height) * 1.1;
    const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, reach);
    gradient.addColorStop(0, "#07162d");
    gradient.addColorStop(.38, "#030a19");
    gradient.addColorStop(1, "#010207");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, mapper.width, mapper.height);

    const breathing = .018 + Math.sin(time * .16) * .006;
    const haze = ctx.createLinearGradient(0, 0, mapper.width, mapper.height);
    haze.addColorStop(0, rgba(this.palette.violet, 0));
    haze.addColorStop(.48, rgba(this.palette.blue, breathing));
    haze.addColorStop(1, rgba(this.palette.cyan, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, mapper.width, mapper.height);
  }

  drawOrbitalField(ctx, mapper, time) {
    const centerX = this.bounds.x + this.bounds.width * .5;
    const centerY = this.bounds.y + this.bounds.height * .5;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let orbit = 0; orbit < this.config.orbitCount; orbit++) {
      const rx = this.bounds.width * (.08 + orbit * .036);
      const ry = this.bounds.height * (.035 + orbit * .022);
      const tilt = Math.sin(orbit * 1.43) * .34;
      ctx.beginPath();
      const steps = Math.max(36, Math.round(this.config.orbitSteps * this.quality));
      for (let step = 0; step <= steps; step++) {
        const angle = step / steps * Math.PI * 2 + time * (.003 + orbit * .0002);
        const ox = Math.cos(angle) * rx;
        const oy = Math.sin(angle) * ry;
        const x = centerX + ox * Math.cos(tilt) - oy * Math.sin(tilt);
        const y = centerY + ox * Math.sin(tilt) * .17 + oy * Math.cos(tilt);
        const p = mapper.point(x, y);
        step ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.strokeStyle = rgba(orbit % 4 === 0 ? this.palette.violet : this.palette.blue, .026 + orbit * .0018);
      ctx.lineWidth = .55 + (orbit % 3) * .18;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(ctx, mapper, time, interaction) {
    const target = this.reactionSphere;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowBlur = 0;
    const particleLimit = Math.round(this.particles.length * this.quality);
    for (let index = 0; index < particleLimit; index++) {
      const particle = this.particles[index];
      let x = this.bounds.x + ((particle.x - this.bounds.x + time * particle.speed * particle.depth) % this.bounds.width);
      let y = particle.y + Math.sin(time * (.08 + particle.depth * .08) + particle.phase) * 8 * particle.depth;
      if (interaction > .001) {
        const dx = x - target.x;
        const dy = y - target.y;
        const distance = Math.hypot(dx, dy) || 1;
        const influence = Math.max(0, 1 - distance / 340) * interaction;
        x += dx / distance * influence * 54;
        y += dy / distance * influence * 54;
      }
      if (!mapper.isVisible(x, y, 20)) continue;
      const p = mapper.point(x, y);
      const flicker = .25 + Math.pow(Math.sin(time * .7 + particle.phase) * .5 + .5, 3) * .65;
      const color = particle.violet ? this.palette.violet : this.palette.cyan;
      ctx.fillStyle = rgba(color, flicker * (.12 + particle.depth * .34));
      ctx.beginPath();
      ctx.arc(p.x, p.y, particle.size * mapper.scale * (.7 + particle.depth * .4), 0, Math.PI * 2);
      ctx.fill();
    }

    // A small second pass provides bloom without applying an expensive shadow
    // filter to every particle.
    for (let index = 0; index < particleLimit; index += 31) {
      const particle = this.particles[index];
      const x = this.bounds.x + ((particle.x - this.bounds.x + time * particle.speed * particle.depth) % this.bounds.width);
      const y = particle.y + Math.sin(time * (.08 + particle.depth * .08) + particle.phase) * 8 * particle.depth;
      if (!mapper.isVisible(x, y, 20)) continue;
      const p = mapper.point(x, y);
      const color = particle.violet ? this.palette.violet : this.palette.cyan;
      ctx.fillStyle = rgba(color, .08);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.5, particle.size * mapper.scale * 3.2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSphere(ctx, mapper, sphere, time, reaction) {
    if (!mapper.isVisible(sphere.x, sphere.y, sphere.radius * 2)) return;
    const c = mapper.point(sphere.x, sphere.y);
    const radius = mapper.radius(sphere.radius);
    const orientation = time * sphere.speed + sphere.phase + reaction * 1.4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.shadowBlur = 12 + reaction * 18;
    ctx.shadowColor = rgba(reaction > .05 ? this.palette.violet : this.palette.cyan, .55);
    ctx.strokeStyle = rgba(this.palette.cyan, .24 + reaction * .18);
    ctx.lineWidth = .8 + reaction * .6;
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    [-.55, 0, .55].forEach((latitude) => {
      ctx.strokeStyle = rgba(this.palette.cyan, .09 + reaction * .08);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + latitude * radius * .66, radius * Math.sqrt(1 - latitude ** 2), radius * .16, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    for (let longitude = 0; longitude < 3; longitude++) {
      const rotation = orientation * .22 + longitude * Math.PI / 3;
      ctx.strokeStyle = rgba(this.palette.violet, .1 + reaction * .09);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, Math.max(1, Math.abs(Math.cos(rotation)) * radius), radius, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const theta = .6 + Math.sin(time * .07 + sphere.phase) * .23;
    const tipX = c.x + Math.cos(orientation) * Math.sin(theta) * radius * .84;
    const tipY = c.y - Math.cos(theta) * radius * .84;
    const vector = ctx.createLinearGradient(c.x, c.y, tipX, tipY);
    vector.addColorStop(0, rgba(this.palette.cyan, .58));
    vector.addColorStop(1, rgba(this.palette.magenta, .78));
    ctx.strokeStyle = vector;
    ctx.lineWidth = 1.4 + reaction;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.fillStyle = rgba(this.palette.white, .72);
    ctx.beginPath();
    ctx.arc(tipX, tipY, 1.7 + reaction, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawVignette(ctx, mapper) {
    const gradient = ctx.createRadialGradient(
      mapper.width * .5, mapper.height * .5, Math.min(mapper.width, mapper.height) * .18,
      mapper.width * .5, mapper.height * .5, Math.max(mapper.width, mapper.height) * .72,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,.42)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, mapper.width, mapper.height);
  }
}
