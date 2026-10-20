import { envelope, rgba, seeded } from "../core/math.js";
import { onScreen } from "../core/screen-canvas.js";

const TITLES = ["SUPERPOSICIÓN", "CAMPO CUÁNTICO", "INTERFERENCIA", "ENTRELAZAMIENTO", "ÓRBITAS CUÁNTICAS"];
const SUBTITLES = ["Un universo de posibilidades", "Explora lo que aún no imaginas", "Las posibilidades se encuentran", "Conectados más allá de la distancia", "El futuro está en movimiento"];

export class QuantumPanels {
  constructor(timeline, logo) {
    this.timeline = timeline;
    this.logo = logo;
    this.stars = Array.from({ length: 110 }, (_, i) => ({
      x: seeded(i * 7 + 4) * 1080, y: seeded(i * 7 + 5) * 1920,
      size: 1.4 + seeded(i * 7 + 6) * 2.5, phase: seeded(i * 7 + 7) * Math.PI * 2,
    }));
  }

  render(ctx, mapper, time, assignments, quality = 1) {
    const finale = envelope(time, 92, 108, 2);
    mapper.screens.forEach((screen, index) => onScreen(ctx, mapper, screen, () => {
      const kind = index % TITLES.length;
      const feature = assignments.some((item) => item.screenId === screen.id);
      const brightness = (feature ? .22 : 1) * (1 - finale * .75);
      this.drawNebula(ctx, time, index);
      this.drawStars(ctx, time, index, quality);
      ctx.save();
      ctx.globalAlpha = brightness;
      ctx.globalCompositeOperation = "lighter";
      if (kind === 2) this.drawWaves(ctx, time, index, quality);
      else if (kind === 3) this.drawEntanglement(ctx, time, index, quality);
      else this.drawOrb(ctx, time, index, kind === 4, quality);
      this.drawCircuit(ctx, time, index);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = (1 - finale) * (feature ? .15 : 1);
      ctx.textAlign = "center";
      ctx.font = "500 45px system-ui, sans-serif";
      ctx.fillStyle = "#d8f5ff";
      ctx.fillText(TITLES[kind], 540, 1435);
      ctx.fillStyle = "#94a6c9";
      ctx.font = "30px system-ui, sans-serif";
      ctx.fillText(SUBTITLES[kind], 540, 1495);
      ctx.restore();
      this.drawBrand(ctx, 1 - finale);
    }));
  }

  drawNebula(ctx, time, index) {
    const colors = [[157, 87, 255], [64, 105, 255], [78, 224, 255]];
    colors.forEach((color, layer) => {
      const x = 540 + Math.sin(time * .035 + index + layer * 2) * 300;
      const y = 930 + Math.cos(time * .04 + index * .7 + layer * 2) * 410;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 850);
      gradient.addColorStop(0, rgba(color, layer === 0 ? .19 : .10));
      gradient.addColorStop(.45, rgba(color, .045));
      gradient.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1920);
    });
  }

  drawStars(ctx, time, index, quality) {
    const count = Math.round(this.stars.length * quality);
    for (let i = 0; i < count; i++) {
      const star = this.stars[i];
      const x = (star.x + index * 137 + time * (1 + i % 3)) % 1080;
      const y = (star.y + index * 211 + Math.sin(time * .09 + star.phase) * 20) % 1920;
      ctx.fillStyle = rgba(i % 4 ? [140, 222, 255] : [197, 147, 255], .28 + .48 * (Math.sin(time * .4 + star.phase) * .5 + .5));
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (i % 19 === 0) {
        ctx.fillStyle = "rgba(139,198,255,.10)";
        ctx.beginPath();
        ctx.arc(x, y, star.size * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  project(x, y, z, angle) {
    const dx = x * Math.cos(angle) + z * Math.sin(angle);
    const dz = -x * Math.sin(angle) + z * Math.cos(angle);
    return { x: dx, y: y * .9 - dz * .44, z: dz * .9 + y * .44 };
  }

  drawOrb(ctx, time, index, torus, quality) {
    ctx.save();
    ctx.translate(540, 940 + Math.sin(time * .13 + index) * 35);
    const angle = time * .12 + index;
    const radius = torus ? 330 : 350;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 540);
    glow.addColorStop(0, "rgba(116,122,255,.18)");
    glow.addColorStop(.65, "rgba(105,75,255,.07)");
    glow.addColorStop(1, "rgba(78,224,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-600, -600, 1200, 1200);
    const steps = Math.round(64 * quality);
    for (let ring = 0; ring < 13; ring++) {
      ctx.beginPath();
      for (let step = 0; step <= steps; step++) {
        const a = step / steps * Math.PI * 2;
        const b = ring / 13 * Math.PI * 2;
        const p = torus
          ? this.project((radius + Math.cos(b) * 105) * Math.cos(a), Math.sin(b) * 105, (radius + Math.cos(b) * 105) * Math.sin(a), angle)
          : this.project(Math.cos(a) * Math.sin(b) * radius, Math.cos(b) * radius, Math.sin(a) * Math.sin(b) * radius, angle);
        step ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.strokeStyle = ring % 3 ? "rgba(98,195,255,.37)" : "rgba(186,123,255,.56)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    if (!torus) {
      for (let ring = 0; ring < 9; ring++) {
        ctx.beginPath();
        for (let step = 0; step <= steps; step++) {
          const a = step / steps * Math.PI * 2;
          const b = ring / 9 * Math.PI;
          const p = this.project(Math.cos(a) * Math.cos(b) * radius, Math.sin(a) * radius, Math.cos(a) * Math.sin(b) * radius, angle);
          step ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(129,173,255,.24)";
        ctx.stroke();
      }
    }
    for (let i = 0; i < Math.round(250 * quality); i++) {
      const a = seeded(i * 3 + 1) * Math.PI * 2 + time * .09;
      const b = seeded(i * 3 + 2) * Math.PI * 2;
      const p = torus
        ? this.project((radius + Math.cos(b) * 105) * Math.cos(a), Math.sin(b) * 105, (radius + Math.cos(b) * 105) * Math.sin(a), angle)
        : this.project(Math.cos(a) * Math.sin(b) * radius, Math.cos(b) * radius, Math.sin(a) * Math.sin(b) * radius, angle);
      ctx.fillStyle = rgba(i % 3 ? [113, 222, 255] : [206, 150, 255], .38 + (p.z / 500 + 1) * .25);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.z > 0 ? 3.4 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let ring = 0; ring < 3; ring++) {
      ctx.strokeStyle = ring % 2 ? "rgba(186,123,255,.42)" : "rgba(98,220,255,.34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 460 + ring * 28, 150 + ring * 20, time * .035 + ring * .6, 0, Math.PI * 2);
      ctx.stroke();
    }
    const p = this.project(radius * .55, -radius * .58, radius * .45, angle);
    ctx.strokeStyle = "rgba(232,182,255,.9)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.fillStyle = "#effdff";
    ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawWaves(ctx, time, index, quality) {
    const rows = Math.round(42 * quality);
    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      for (let step = 0; step <= 72; step++) {
        const u = step / 72;
        const y = 920 + (row / rows - .5) * 370 + Math.sin(u * 11 - time * .6 + row * .11 + index) * Math.sin(Math.PI * u) ** 1.5 * 285;
        step ? ctx.lineTo(76 + u * 928, y) : ctx.moveTo(76 + u * 928, y);
      }
      ctx.strokeStyle = rgba(row % 3 ? [91, 205, 255] : [192, 111, 255], .22 + Math.sin(row / rows * Math.PI) * .4);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  drawEntanglement(ctx, time, index, quality) {
    ctx.save();
    ctx.translate(0, -80);
    for (let i = 0; i < Math.round(24 * quality); i++) {
      ctx.beginPath();
      ctx.moveTo(344, 780);
      ctx.bezierCurveTo(80 + Math.sin(time * .25 + i) * 80, 1200 + i * 4, 920, 690 + i * 9, 720, 1120);
      ctx.strokeStyle = rgba(i % 2 ? [112, 215, 255] : [190, 118, 255], .12 + i / 150);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    [[344, 780], [720, 1120]].forEach(([x, y], orb) => {
      ctx.save(); ctx.translate(x, y);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 350);
      glow.addColorStop(0, orb ? "rgba(192,111,255,.3)" : "rgba(78,224,255,.24)");
      glow.addColorStop(1, "rgba(78,224,255,0)");
      ctx.fillStyle = glow; ctx.fillRect(-350, -350, 700, 700);
      for (let ring = 0; ring < 8; ring++) {
        ctx.strokeStyle = orb ? "rgba(195,132,255,.65)" : "rgba(112,225,255,.58)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 210, Math.max(15, Math.abs(Math.cos(time * .16 + ring * .4 + index)) * 210), ring * .4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#dbf6ff"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  drawCircuit(ctx, time, index) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(122,177,255,.28)";
    [1610, 1730].forEach((y) => { ctx.beginPath(); ctx.moveTo(136, y); ctx.lineTo(944, y); ctx.stroke(); });
    ctx.font = "32px ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.fillStyle = "#94c5e7";
    [[312, 1610], [512, 1730]].forEach(([x, y]) => {
      ctx.fillStyle = "#111c3a"; ctx.fillRect(x - 38, y - 38, 76, 76); ctx.strokeRect(x - 38, y - 38, 76, 76);
      ctx.fillStyle = "#a5dfff"; ctx.fillText("H", x, y + 11);
    });
    ctx.beginPath(); ctx.moveTo(720, 1610); ctx.lineTo(720, 1730); ctx.stroke();
    ctx.beginPath(); ctx.arc(720, 1730, 23, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(720, 1610, 7, 0, Math.PI * 2); ctx.fill();
    const x = 136 + ((time * 68 + index * 136) % 808);
    ctx.fillStyle = "#b0eaff"; ctx.beginPath(); ctx.arc(x, 1610, 5, 0, Math.PI * 2); ctx.fill();
  }

  drawBrand(ctx, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    if (this.logo.complete && this.logo.naturalWidth) ctx.drawImage(this.logo, 215, 90, 650, 325);
    ctx.textAlign = "center"; ctx.font = "26px ui-monospace, monospace";
    ctx.fillStyle = "#a3b9dc"; ctx.fillText("GUADALAJARA · 2026", 540, 445);
    ctx.restore();
  }
}
