(() => {
  "use strict";

  const canvas = document.querySelector("#quantum-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const params = new URLSearchParams(location.search);
  const requestedScreen = params.has("screen") ? Number(params.get("screen")) : 0;
  const selectedScreen = Number.isFinite(requestedScreen) && requestedScreen >= 1
    ? Math.min(8, Math.floor(requestedScreen))
    : 0;
  const isOutput = selectedScreen > 0;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    running: !reducedMotion,
    guides: !isOutput,
    pausedAt: 0,
    pauseOffset: 0,
    duration: 72,
    particles: [],
    stars: [],
    secretBuffer: "",
    catActivatedAt: 0,
  };

  const palette = {
    cyan: [65, 232, 255],
    blue: [54, 105, 255],
    violet: [164, 76, 255],
    magenta: [255, 70, 218],
    white: [226, 252, 255],
  };

  const quantumCat = new Image();
  quantumCat.src = "assets/easter-eggs/quantum-cat.png";

  try {
    const storedActivation = Number(localStorage.getItem("quantum-cat-at"));
    if (Date.now() - storedActivation < 12000) state.catActivatedAt = storedActivation;
  } catch (_) {
    // The animation still works when browser storage is unavailable.
  }

  if (isOutput) {
    document.body.classList.add("output-mode");
    document.querySelector("#screen-badge").textContent = `0${selectedScreen}`;
  }

  function rgba(rgb, alpha = 1) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  function phaseEnvelope(time, start, end, feather = 3) {
    return smoothstep(start, start + feather, time) * (1 - smoothstep(end - feather, end, time));
  }

  function seeded(index) {
    const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function setupField() {
    state.stars = Array.from({ length: 340 }, (_, i) => ({
      x: seeded(i * 5 + 1),
      y: seeded(i * 5 + 2),
      z: .2 + seeded(i * 5 + 3) * .8,
      phase: seeded(i * 5 + 4) * Math.PI * 2,
    }));

    state.particles = Array.from({ length: 520 }, (_, i) => ({
      lane: i % 8,
      x: seeded(i * 7 + 1),
      y: seeded(i * 7 + 2),
      speed: .02 + seeded(i * 7 + 3) * .08,
      size: .4 + seeded(i * 7 + 4) * 1.7,
      phase: seeded(i * 7 + 5) * Math.PI * 2,
      color: i % 11 === 0 ? palette.magenta : i % 5 === 0 ? palette.violet : palette.cyan,
    }));
  }

  function resize() {
    state.dpr = Math.min(2, devicePixelRatio || 1);
    state.width = innerWidth;
    state.height = innerHeight;
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  // Converts a point in the eight-screen panoramic space into this viewport.
  function viewPoint(nx, ny) {
    const panoramaX = isOutput ? nx * 8 - (selectedScreen - 1) : nx;
    return { x: panoramaX * state.width, y: ny * state.height };
  }

  function visibleX(nx, margin = .2) {
    if (!isOutput) return nx > -margin && nx < 1 + margin;
    const local = nx * 8 - (selectedScreen - 1);
    return local > -margin && local < 1 + margin;
  }

  function background(time) {
    const gradient = ctx.createRadialGradient(
      state.width * (.5 + Math.sin(time * .08) * .08), state.height * .48, 0,
      state.width * .5, state.height * .5, Math.max(state.width, state.height) * .82
    );
    gradient.addColorStop(0, "#071a35");
    gradient.addColorStop(.38, "#040b1b");
    gradient.addColorStop(1, "#010207");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.globalCompositeOperation = "lighter";
    for (const star of state.stars) {
      const nx = (star.x + time * .0015 * star.z) % 1;
      if (!visibleX(nx)) continue;
      const p = viewPoint(nx, star.y);
      const pulse = .25 + .75 * Math.pow(Math.sin(time * .7 + star.phase) * .5 + .5, 3);
      ctx.fillStyle = rgba(palette.cyan, pulse * .42 * star.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, star.z * 1.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawEnergyRibbon(time, intensity) {
    if (intensity <= .001) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let strand = 0; strand < 5; strand++) {
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const nx = i / 180;
        const wave = Math.sin(nx * Math.PI * (4 + strand * .16) - time * (1.1 + strand * .04));
        const envelope = Math.sin(nx * Math.PI);
        const ny = .5 + wave * (.05 + strand * .013) * envelope;
        const p = viewPoint(nx, ny);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.strokeStyle = rgba(strand % 2 ? palette.violet : palette.cyan, intensity * (.16 + strand * .06));
      ctx.lineWidth = 1 + strand * .45;
      ctx.shadowBlur = 20;
      ctx.shadowColor = rgba(strand % 2 ? palette.violet : palette.cyan, .8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function projectSphere(cx, cy, radius, x, y, z) {
    const depth = 1 + z * .16;
    return { x: cx + x * radius * depth, y: cy + y * radius * depth, alpha: .32 + (z + 1) * .34 };
  }

  function drawBlochSphere(nx, ny, normalizedRadius, time, index, intensity = 1) {
    if (!visibleX(nx, .35) || intensity <= .002) return;
    const c = viewPoint(nx, ny);
    const radius = normalizedRadius * Math.min(isOutput ? state.width * 2.35 : state.width, state.height);
    const spin = time * (.22 + index * .013) + index * .84;
    const tilt = .52 + Math.sin(time * .14 + index) * .13;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    const halo = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius * 1.25);
    halo.addColorStop(0, rgba(index % 2 ? palette.violet : palette.cyan, .08 * intensity));
    halo.addColorStop(.68, rgba(palette.blue, .025 * intensity));
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius * 1.28, 0, Math.PI * 2);
    ctx.fill();

    // Outer sphere and latitude rings.
    ctx.shadowBlur = 13;
    ctx.shadowColor = rgba(palette.cyan, .75);
    ctx.strokeStyle = rgba(palette.cyan, .4 * intensity);
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    [-.58, 0, .58].forEach((latitude) => {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + latitude * radius * .7, radius * Math.sqrt(1 - latitude * latitude), radius * .18, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(palette.cyan, .17 * intensity);
      ctx.stroke();
    });

    // Rotating longitudes.
    for (let longitude = 0; longitude < 3; longitude++) {
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const a = i / 80 * Math.PI * 2;
        const lon = longitude * Math.PI / 3 + spin * .18;
        const x = Math.cos(a) * Math.cos(lon);
        const z = Math.cos(a) * Math.sin(lon);
        const y = Math.sin(a) * .93;
        const p = projectSphere(c.x, c.y, radius, x, y, z);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.strokeStyle = rgba(palette.violet, .15 * intensity);
      ctx.stroke();
    }

    // Axes.
    const axes = [
      { x: .9, y: .12 }, { x: -.54, y: .46 },
      { x: 0, y: -1 }, { x: 0, y: 1 },
    ];
    axes.forEach((axis) => {
      ctx.beginPath();
      ctx.moveTo(c.x - axis.x * radius, c.y - axis.y * radius);
      ctx.lineTo(c.x + axis.x * radius, c.y + axis.y * radius);
      ctx.strokeStyle = rgba(palette.white, .12 * intensity);
      ctx.stroke();
    });

    // Qubit state vector |ψ⟩.
    const vx = Math.sin(tilt) * Math.cos(spin);
    const vz = Math.sin(tilt) * Math.sin(spin);
    const vy = -Math.cos(tilt);
    const tip = projectSphere(c.x, c.y, radius * .9, vx, vy, vz);
    const vectorGradient = ctx.createLinearGradient(c.x, c.y, tip.x, tip.y);
    vectorGradient.addColorStop(0, rgba(palette.cyan, .8 * intensity));
    vectorGradient.addColorStop(1, rgba(palette.magenta, intensity));
    ctx.strokeStyle = vectorGradient;
    ctx.lineWidth = Math.max(2, radius * .018);
    ctx.shadowBlur = 22;
    ctx.shadowColor = rgba(palette.magenta, .9);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    ctx.fillStyle = rgba(palette.white, intensity);
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, Math.max(2.4, radius * .035), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(time, intensity) {
    if (intensity <= .001) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of state.particles) {
      const travel = (particle.x + time * particle.speed) % 1;
      const convergence = smoothstep(44, 55, time) * (1 - smoothstep(61, 68, time));
      const sourceY = .12 + particle.y * .76;
      const targetY = .5 + Math.sin(particle.phase + time * 1.8) * .025;
      const ny = sourceY * (1 - convergence) + targetY * convergence;
      if (!visibleX(travel)) continue;
      const p = viewPoint(travel, ny);
      const alpha = intensity * (.18 + .55 * Math.sin(particle.phase + time * 2) ** 2);
      ctx.fillStyle = rgba(particle.color, alpha);
      ctx.shadowBlur = 8;
      ctx.shadowColor = rgba(particle.color, .7);
      ctx.beginPath();
      ctx.arc(p.x, p.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGate(nx, ny, symbol, time, delay, intensity) {
    if (!visibleX(nx) || intensity <= .002) return;
    const p = viewPoint(nx, ny);
    const unit = Math.min(isOutput ? state.width : state.width / 5, state.height) * .09;
    const pulse = .8 + Math.sin(time * 2.4 + delay) * .2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(time * .3 + delay) * .08);
    ctx.shadowBlur = 26;
    ctx.shadowColor = rgba(symbol === "H" ? palette.cyan : palette.violet, .8);
    ctx.fillStyle = rgba([5, 18, 38], .82 * intensity);
    ctx.strokeStyle = rgba(symbol === "H" ? palette.cyan : palette.violet, pulse * intensity);
    ctx.lineWidth = 1.5;
    ctx.fillRect(-unit / 2, -unit / 2, unit, unit);
    ctx.strokeRect(-unit / 2, -unit / 2, unit, unit);
    ctx.strokeStyle = rgba(palette.white, intensity * .9);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (symbol === "H" || symbol === "S") {
      ctx.moveTo(-unit * .22, 0); ctx.lineTo(unit * .22, 0);
      ctx.moveTo(0, -unit * .22); ctx.lineTo(0, unit * .22);
    } else if (symbol === "X" || symbol === "T") {
      ctx.moveTo(-unit * .2, -unit * .2); ctx.lineTo(unit * .2, unit * .2);
      ctx.moveTo(unit * .2, -unit * .2); ctx.lineTo(-unit * .2, unit * .2);
    } else {
      ctx.arc(0, 0, unit * .2, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawCircuit(time, intensity) {
    if (intensity <= .001) return;
    const rows = [.33, .5, .67];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    rows.forEach((row, rowIndex) => {
      const a = viewPoint(.04, row);
      const b = viewPoint(.96, row);
      ctx.strokeStyle = rgba(rowIndex === 1 ? palette.violet : palette.cyan, .25 * intensity);
      ctx.lineWidth = 1;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    const gates = [
      [.12, .33, "H"], [.25, .5, "X"], [.38, .67, "Z"], [.51, .33, "S"],
      [.64, .5, "H"], [.77, .67, "X"], [.89, .33, "T"],
    ];
    gates.forEach((gate, i) => drawGate(gate[0], gate[1], gate[2], time, i, intensity));

    // Entanglement links between circuit rows.
    [.3, .56, .82].forEach((nx, i) => {
      const top = viewPoint(nx, rows[i % 2]);
      const bottom = viewPoint(nx, rows[(i % 2) + 1]);
      ctx.strokeStyle = rgba(palette.magenta, .55 * intensity);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
      [top, bottom].forEach((point) => {
        ctx.fillStyle = rgba(palette.magenta, intensity);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    ctx.restore();
  }

  function drawEntanglement(time, intensity) {
    if (intensity <= .001) return;
    const left = viewPoint(.31, .5);
    const right = viewPoint(.69, .5);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.4;
    ctx.shadowBlur = 18;
    ctx.shadowColor = rgba(palette.magenta, .8);
    for (let strand = 0; strand < 7; strand++) {
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const t = i / 90;
        const x = left.x + (right.x - left.x) * t;
        const y = left.y + Math.sin(t * Math.PI * 4 + time * 2 + strand) * (10 + strand * 2) * Math.sin(t * Math.PI);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = rgba(strand % 2 ? palette.cyan : palette.magenta, intensity * .2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawImmersiveField(time) {
    const center = viewPoint(.5, .5);
    const worldWidth = isOutput ? state.width * 8 : state.width;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // A moving quantum tunnel creates depth across the entire installation.
    for (let ring = 0; ring < 18; ring++) {
      const depth = (ring / 18 + time * .045) % 1;
      const eased = depth * depth;
      const rx = worldWidth * (.015 + eased * .62);
      const ry = state.height * (.018 + eased * .6);
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(ring % 3 ? palette.blue : palette.violet, (1 - depth) * .14);
      ctx.lineWidth = .5 + depth * 1.8;
      ctx.shadowBlur = 16;
      ctx.shadowColor = rgba(palette.violet, .55);
      ctx.stroke();
    }

    // Light sheets sweep through the eight channels as one continuous space.
    for (let beam = 0; beam < 4; beam++) {
      const nx = (time * (.018 + beam * .003) + beam * .27) % 1;
      const p = viewPoint(nx, .5);
      const width = Math.max(30, worldWidth * .035);
      const glow = ctx.createLinearGradient(p.x - width, 0, p.x + width, 0);
      glow.addColorStop(0, "rgba(0,0,0,0)");
      glow.addColorStop(.5, rgba(beam % 2 ? palette.cyan : palette.violet, .045));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - width, 0, width * 2, state.height);
    }
    ctx.restore();
  }

  function drawQuantumCat() {
    if (!quantumCat.complete || !quantumCat.naturalWidth || !state.catActivatedAt) return;
    const elapsed = (Date.now() - state.catActivatedAt) / 1000;
    if (elapsed < 0 || elapsed > 12) return;

    const visibility = smoothstep(0, 2.2, elapsed) * (1 - smoothstep(8.5, 12, elapsed));
    const worldWidth = isOutput ? state.width * 8 : state.width;
    const center = viewPoint(.5 + Math.sin(elapsed * .24) * .025, .52 + Math.sin(elapsed * .42) * .018);
    const width = worldWidth * .19;
    const height = width * quantumCat.naturalHeight / quantumCat.naturalWidth;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = visibility * .28;
    ctx.shadowBlur = 34;
    ctx.shadowColor = rgba(palette.violet, .7);
    ctx.drawImage(quantumCat, center.x - width / 2, center.y - height / 2, width, height);
    ctx.restore();
  }

  function drawGuides() {
    if (!state.guides || isOutput) return;
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const x = state.width * i / 8;
      ctx.fillStyle = i % 2 ? "rgba(81,229,255,.018)" : "rgba(164,76,255,.018)";
      ctx.fillRect(x, 0, state.width / 8, state.height);
      ctx.strokeStyle = "rgba(112,235,255,.17)";
      ctx.setLineDash([3, 7]);
      ctx.strokeRect(x + .5, .5, state.width / 8 - 1, state.height - 1);
      ctx.fillStyle = "rgba(176,247,255,.42)";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(`0${i + 1}`, x + 11, state.height - 14);
    }
    ctx.restore();
  }

  function currentTime() {
    // Date.now keeps separate browser windows and computers on the same frame
    // as long as their system clocks are synchronized.
    const clock = state.running ? Date.now() : state.pausedAt;
    return (((clock - state.pauseOffset) / 1000) % state.duration + state.duration) % state.duration;
  }

  function render() {
    const time = currentTime();
    background(time);

    const intro = phaseEnvelope(time, 0, 14, 3);
    const bloch = phaseEnvelope(time, 8, 34, 4);
    const circuit = phaseEnvelope(time, 26, 49, 4);
    const entangle = phaseEnvelope(time, 43, 65, 4);
    const collapse = phaseEnvelope(time, 58, 72, 3);

    drawImmersiveField(time);
    drawEnergyRibbon(time, intro * .8 + collapse);
    drawParticles(time, .38 + intro * .62 + entangle * .55 + collapse * .7);

    if (bloch > .001) {
      for (let i = 0; i < 8; i++) {
        drawBlochSphere((i + .5) / 8, .5 + Math.sin(i * 1.7) * .08, .065, time, i, bloch);
      }
    }

    drawCircuit(time, circuit);

    if (entangle > .001) {
      drawBlochSphere(.31, .5, .12, -time, 2, entangle);
      drawBlochSphere(.69, .5, .12, time, 6, entangle);
      drawEntanglement(time, entangle);
    }

    if (collapse > .001) {
      drawBlochSphere(.5, .5, .16 + collapse * .03, time * 1.5, 0, collapse);
    }

    drawQuantumCat();
    drawGuides();

    if (state.running) requestAnimationFrame(render);
  }

  function togglePause() {
    if (state.running) {
      state.running = false;
      state.pausedAt = Date.now();
    } else {
      state.pauseOffset += Date.now() - state.pausedAt;
      state.running = true;
      requestAnimationFrame(render);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "f") toggleFullscreen();
    if (event.code === "Space") {
      event.preventDefault();
      togglePause();
    }
    if (event.key.toLowerCase() === "g" && !isOutput) {
      state.guides = !state.guides;
      if (!state.running) render();
    }
    if (/^[a-z]$/i.test(event.key)) {
      state.secretBuffer = (state.secretBuffer + event.key.toUpperCase()).slice(-4);
      if (state.secretBuffer === "QCAT") {
        state.catActivatedAt = Date.now();
        try { localStorage.setItem("quantum-cat-at", String(state.catActivatedAt)); } catch (_) {}
        if (!state.running) render();
      }
    }
  });
  addEventListener("storage", (event) => {
    if (event.key === "quantum-cat-at") state.catActivatedAt = Number(event.newValue) || 0;
  });
  addEventListener("dblclick", toggleFullscreen);
  addEventListener("resize", resize);

  setupField();
  resize();
  requestAnimationFrame(render);
})();
