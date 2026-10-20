import { envelope, seeded } from "../core/math.js";
import { onScreen } from "../core/screen-canvas.js";

export function resourceAssignments(screens, time, cycle, config) {
  const slot = Math.floor(time / config.slotDuration);
  const rank = (index, salt) => seeded(cycle * 7919 + slot * 131 + index * 23 + salt);
  const order = screens.map((screen, index) => ({ screenId: screen.id, rank: rank(index, 17) }))
    .sort((a, b) => a.rank - b.rank);
  const videos = Object.keys(config.videos).map((type, index) => ({ type, rank: seeded(cycle * 101 + index * 37 + 29) }))
    .sort((a, b) => a.rank - b.rank);
  const videoType = videos[slot % videos.length].type;
  const types = ["discord", "checkin", (cycle + slot) % 2 ? "qiskit" : "ibm",
    ...Array(config.videoScreenCount).fill(videoType)];
  return order.slice(0, types.length).map((item, index) => ({ screenId: item.screenId, type: types[index] }));
}

export class ResourceScreens {
  constructor(config, timeline) {
    this.config = config;
    this.timeline = timeline;
    this.images = Object.fromEntries(Object.entries(config.images).map(([key, path]) => {
      const image = new Image(); image.src = path; return [key, image];
    }));
    this.ready = Promise.all(Object.values(this.images).map((image) => image.decode().catch(() => null)));
    this.videos = new Map();
    this.playPending = new Set();
  }

  frame(mapper, time, cycle = 0) {
    const start = Math.floor(time / this.config.slotDuration) * this.config.slotDuration;
    const end = Math.min(start + this.config.slotDuration, this.timeline.loopDuration);
    const alpha = envelope(time, start, end, 1.2) * (1 - envelope(time, 92, 108, 2));
    return { assignments: resourceAssignments(mapper.screens, time, cycle, this.config), alpha, offset: time - start };
  }

  image(ctx, type, x, y, width, height) {
    const image = this.images[type];
    if (!image?.complete || !image.naturalWidth) return;
    ctx.drawImage(image, x, y, width, height);
  }

  render(ctx, mapper, time, cycle = 0, running = true) {
    const frame = this.frame(mapper, time, cycle);
    const activeVideos = new Set();
    frame.assignments.forEach((item) => {
      const screen = mapper.screens.find((screen) => screen.id === item.screenId);
      onScreen(ctx, mapper, screen, () => {
        if (frame.alpha <= .001) return;
        ctx.globalAlpha = frame.alpha;
        if (this.config.videos[item.type]) {
          const video = this.video(item.type, frame.offset, running);
          activeVideos.add(item.type);
          this.drawVideo(ctx, item.type, video);
          return;
        }
        ctx.fillStyle = "rgba(2,6,20,.88)";
        ctx.fillRect(30, 465, 1020, 1325);
        if (this.config.qr[item.type]) this.drawQR(ctx, item.type);
        else if (item.type === "qiskit" || item.type === "ibm") this.drawLogo(ctx, item.type);
      });
    });
    this.videos.forEach((video, type) => { if (!activeVideos.has(type)) video.pause(); });
    return frame;
  }

  drawQR(ctx, type) {
    const resource = this.config.qr[type];
    ctx.textAlign = "center";
    ctx.font = "500 72px system-ui, sans-serif";
    ctx.fillStyle = "#ecf8ff"; ctx.fillText(resource.title[0], 540, 575);
    ctx.fillStyle = type === "discord" ? "#b6a2ff" : "#7beaff";
    ctx.fillText(resource.title[1], 540, 665);
    ctx.fillStyle = "#afc2dc"; ctx.font = "32px system-ui, sans-serif";
    ctx.fillText(resource.description, 540, 740);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.roundRect(155, 815, 770, 770, 24); ctx.fill();
    ctx.imageSmoothingEnabled = false;
    this.image(ctx, type, 190, 850, 700, 700);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = "#d9f1ff"; ctx.font = "32px ui-monospace, monospace";
    ctx.fillText(resource.label, 540, 1675);
    ctx.fillStyle = "#8eabc9"; ctx.font = "28px system-ui, sans-serif";
    ctx.fillText("Escanea el código con tu celular", 540, 1740);
  }

  drawLogo(ctx, type) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#a8c9e7"; ctx.font = "30px ui-monospace, monospace";
    ctx.fillText("EXPLORA · CONSTRUYE · COMPARTE", 540, 650);
    if (type === "ibm") this.image(ctx, type, 95, 830, 890, 890 * 1500 / 3904);
    else {
      this.image(ctx, type, 130, 880, 210, 210);
      ctx.font = "500 170px system-ui, sans-serif"; ctx.fillStyle = "#fff";
      ctx.textAlign = "left"; ctx.fillText("Qiskit", 390, 1055); ctx.textAlign = "center";
    }
    ctx.fillStyle = "#d1e9ff"; ctx.font = "42px system-ui, sans-serif";
    ctx.fillText("El futuro se construye en comunidad.", 540, 1370);
    ctx.fillStyle = "#899fbe"; ctx.font = "30px system-ui, sans-serif";
    ctx.fillText("Qiskit Fall Fest Guadalajara 2026", 540, 1450);
  }

  video(type, offset, running) {
    if (typeof document === "undefined") return null;
    let video = this.videos.get(type);
    if (!video) {
      video = document.createElement("video");
      video.src = this.config.videos[type];
      video.muted = true; video.defaultMuted = true; video.playsInline = true;
      video.preload = "auto"; video.loop = true; video.hidden = true;
      video.dataset.resourceVideo = type;
      document.body.append(video);
      this.videos.set(type, video);
    }
    if (Number.isFinite(video.duration)) {
      const desired = offset % video.duration;
      if (Math.abs(video.currentTime - desired) > .8) video.currentTime = desired;
    }
    if (!running) video.pause();
    else if (video.paused && !this.playPending.has(type)) {
      this.playPending.add(type);
      video.play().catch(() => {}).finally(() => this.playPending.delete(type));
    }
    return video;
  }

  drawVideo(ctx, type, video) {
    // Both IBM clips match the physical screen's 9:16 aspect ratio.
    ctx.fillStyle = "#02050b"; ctx.fillRect(0, 0, 1080, 1920);
    if (video?.readyState >= 2) ctx.drawImage(video, 0, 0, 1080, 1920);
    else this.image(ctx, type, 0, 0, 1080, 1920);
  }
}
