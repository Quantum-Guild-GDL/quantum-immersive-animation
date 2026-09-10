import { rgba } from "../core/math.js";

export function drawDebugOverlay(ctx, mapper, time, cat, timeline, palette) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.font = "11px ui-monospace, monospace";
  ctx.lineWidth = 1;
  mapper.screens.forEach((screen) => {
    const corners = [
      mapper.point(screen.x, screen.y),
      mapper.point(screen.x + screen.width, screen.y),
      mapper.point(screen.x + screen.width, screen.y + screen.height),
      mapper.point(screen.x, screen.y + screen.height),
    ];
    ctx.strokeStyle = rgba(palette.cyan, .72);
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    corners.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.stroke();
    const label = mapper.point(screen.x + 12, screen.y + 24);
    ctx.fillStyle = rgba(palette.cyan, .86);
    ctx.fillText(screen.id, label.x, label.y);
  });

  ctx.setLineDash([2, 6]);
  ctx.strokeStyle = rgba(palette.magenta, .8);
  ctx.beginPath();
  for (let step = 0; step <= 120; step++) {
    const progress = step / 120;
    const route = mapper.routePosition(progress, timeline.scenes.astronautCat.end - timeline.scenes.astronautCat.start, cat.config.cat.trajectoryY);
    const point = mapper.point(route.x, route.y);
    step ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y);
  }
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(0,0,0,.72)";
  ctx.fillRect(12, 12, 190, 44);
  ctx.fillStyle = rgba(palette.white, .92);
  ctx.fillText(`t = ${time.toFixed(2)} s`, 22, 31);
  ctx.fillText(mapper.output?.id || "VIRTUAL_CANVAS", 22, 48);
  ctx.restore();
}
