// Draw in physical-screen coordinates, including rotated individual outputs.
export function screenTransform(mapper, screen) {
  const origin = mapper.point(screen.x, screen.y);
  const right = mapper.point(screen.x + screen.width, screen.y);
  const bottom = mapper.point(screen.x, screen.y + screen.height);
  return [(right.x - origin.x) / screen.width, (right.y - origin.y) / screen.width,
    (bottom.x - origin.x) / screen.height, (bottom.y - origin.y) / screen.height, origin.x, origin.y];
}

export function onScreen(ctx, mapper, screen, draw) {
  const view = mapper.view;
  if (screen.x >= view.x + view.width || screen.x + screen.width <= view.x
    || screen.y >= view.y + view.height || screen.y + screen.height <= view.y) return;
  ctx.save();
  ctx.transform(...screenTransform(mapper, screen));
  ctx.beginPath();
  ctx.rect(0, 0, screen.width, screen.height);
  ctx.clip();
  const scale = Math.min(screen.width / 1080, screen.height / 1920);
  ctx.translate((screen.width - 1080 * scale) / 2, (screen.height - 1920 * scale) / 2);
  ctx.scale(scale, scale);
  draw();
  ctx.restore();
}
