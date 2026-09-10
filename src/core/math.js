export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function sceneProgress(time, scene) {
  return clamp((time - scene.start) / (scene.end - scene.start));
}

export function envelope(time, start, end, feather = 1) {
  return smoothstep(start, start + feather, time) * (1 - smoothstep(end - feather, end, time));
}

export function seeded(index) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

export function rgba(rgb, alpha = 1) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

