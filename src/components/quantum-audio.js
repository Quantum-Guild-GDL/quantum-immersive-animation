import { clamp, envelope, seeded, smoothstep } from "../core/math.js";

const frequency = (note) => 440 * 2 ** ((note - 69) / 12);
const PAD_CHORDS = [
  [50, 57, 62, 66], // D major
  [59, 62, 66, 69], // B minor 7
  [55, 59, 62, 69], // G add 9
  [57, 62, 64, 69], // A suspended
];
const MELODY = [
  [1, 69], [8, 74], [15, 76], [22, 78],
  [29, 71], [36, 74], [43, 78], [50, 81],
  [57, 71], [64, 74], [71, 76], [78, 78],
  [95, 74], [98, 78], [101, 81], [105, 76], [109, 74],
];

// One stereo mix for the whole installation, driven by the animation's clock.
// The audio graph is created only after the listener activates sound.
export class QuantumAudio {
  constructor(timeline) {
    this.timeline = timeline;
    this.volume = .4;
    this.enabled = false;
    this.hidden = false;
    this.frame = { time: 0, running: true, catPan: 0, catVisible: false };
    this.lastUpdate = -Infinity;
  }

  initialize(context) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 3;
    compressor.attack.value = .03;
    compressor.release.value = .3;
    this.master.connect(compressor).connect(context.destination);

    const reverb = context.createConvolver();
    const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * 3.8), context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const fadeIn = Math.min(1, i / (context.sampleRate * .015));
        data[i] = (seeded(i + channel * data.length) * 2 - 1) * (1 - i / data.length) ** 3 * fadeIn;
      }
    }
    reverb.buffer = impulse;
    const wet = context.createGain();
    wet.gain.value = .24;
    reverb.connect(wet).connect(this.master);
    this.reverb = reverb;

    // Different echo times and opposite pans keep the space wide in stereo.
    const echoLeft = context.createDelay(1);
    const echoRight = context.createDelay(1);
    const feedback = context.createGain();
    const leftPan = context.createStereoPanner();
    const rightPan = context.createStereoPanner();
    const echoLevel = context.createGain();
    echoLeft.delayTime.value = .37;
    echoRight.delayTime.value = .53;
    feedback.gain.value = .24;
    echoLevel.gain.value = .16;
    leftPan.pan.value = -.85;
    rightPan.pan.value = .85;
    this.echo = echoLeft;
    echoLeft.connect(leftPan).connect(echoLevel);
    echoLeft.connect(echoRight).connect(rightPan).connect(echoLevel);
    echoRight.connect(feedback).connect(echoLeft);
    echoLevel.connect(this.master);

    // Musical harmonies replace the low drone and looping wind texture.
    // No noise source or detuned unison oscillators are used in the mix.
    this.padWave = context.createPeriodicWave(
      new Float32Array(5), new Float32Array([0, 1, .12, .035, .01]),
    );
    this.bellWave = context.createPeriodicWave(
      new Float32Array(5), new Float32Array([0, 1, .24, .07, .025]),
    );
    this.bed = [...new Set(PAD_CHORDS.flat())].map((note) => ({
      ...this.createVoice(frequency(note), false, this.padWave), note,
    }));
    this.melody = [...new Set(MELODY.map(([, note]) => note))].map((note) => ({
      ...this.createVoice(frequency(note), true, this.bellWave), note,
    }));
    this.journey = [587.3295, 880].map((hz) => this.createVoice(hz, true));
    this.shimmer = [659.2551, 987.7666].map((hz) => this.createVoice(hz, true));
    this.finale = [293.6648, 369.9944, 440].map((hz) => this.createVoice(hz, true, this.padWave));
  }

  createLayer(source, echo = false) {
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(pan).connect(this.master);
    pan.connect(this.reverb);
    if (echo) pan.connect(this.echo);
    return { gain: gain.gain, pan: pan.pan, source };
  }

  createVoice(hz, echo = false, wave = null) {
    const oscillator = this.context.createOscillator();
    if (wave) oscillator.setPeriodicWave(wave);
    else oscillator.type = "sine";
    oscillator.frequency.value = hz;
    const layer = this.createLayer(oscillator, echo);
    oscillator.start();
    return { ...layer, oscillator };
  }

  melodyLevel(note, time) {
    let level = 0;
    let pan = 0;
    MELODY.forEach(([start, pitch], index) => {
      if (pitch !== note) return;
      const age = (time - start + this.timeline.loopDuration) % this.timeline.loopDuration;
      if (age >= 8.5) return;
      const strength = smoothstep(0, .35, age) * Math.exp(-age / 2.5) * (1 - smoothstep(6.5, 8.5, age));
      level += strength;
      pan += strength * Math.sin(index * 2.4) * .75;
    });
    return { level, pan: level > 0 ? pan / level : 0 };
  }

  target(parameter, value, smoothing = .14) {
    parameter.setTargetAtTime(value, this.context.currentTime, smoothing);
  }

  setVolume(value) {
    if (!Number.isFinite(Number(value))) return;
    this.volume = clamp(Number(value));
    this.update(this.frame, true);
  }

  async setEnabled(enabled) {
    if (enabled) {
      if (!this.context) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) throw new Error("Este navegador no admite audio espacial.");
        this.initialize(new AudioContext({ latencyHint: "playback" }));
      }
      await this.context.resume();
      if (this.context.state !== "running") throw new Error("Pulsa otra vez para activar el sonido.");
      this.enabled = true;
      this.update(this.frame, true);
    } else {
      this.enabled = false;
      this.update(this.frame, true);
      if (this.context) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        await this.context.suspend();
      }
    }
  }

  update(frame, force = false) {
    if (!Number.isFinite(frame.time) || !Number.isFinite(frame.catPan)) return;
    this.frame = frame;
    if (!this.context) return;
    const now = this.context.currentTime;
    if (!force && now - this.lastUpdate < .075) return;
    this.lastUpdate = now;
    const { time, running, catPan, catVisible } = frame;
    const scenes = this.timeline.scenes;
    const scene = (name, fade) => envelope(time, scenes[name].start, scenes[name].end, fade);
    const quiet = 1 - scene("quietFinale", 3) * .8;
    const journey = scene("astronautCat", 4) * (catVisible ? 1 : 0);
    const reaction = scene("interaction", 2.4);
    const split = scene("superposition", .25);
    const finale = scene("peek", 2.5);
    const phase = time / this.timeline.loopDuration * Math.PI * 2;
    const chordLength = this.timeline.loopDuration / PAD_CHORDS.length;
    const chordIndex = Math.floor(time / chordLength) % PAD_CHORDS.length;
    const chord = PAD_CHORDS[chordIndex];
    const previousChord = PAD_CHORDS[(chordIndex + PAD_CHORDS.length - 1) % PAD_CHORDS.length];
    const blend = smoothstep(0, 3.5, time % chordLength);
    this.target(this.master.gain, this.enabled && running && !this.hidden ? this.volume : 0, .08);

    this.bed.forEach((voice, index) => {
      const weight = Number(previousChord.includes(voice.note)) * (1 - blend) + Number(chord.includes(voice.note)) * blend;
      this.target(voice.gain, .024 * weight * quiet * (.9 + .1 * Math.sin(phase + index)), .45);
      this.target(voice.pan, (index % 3 - 1) * .45 + Math.sin(phase + index) * .18, .6);
    });
    this.melody.forEach((voice) => {
      const note = this.melodyLevel(voice.note, time);
      this.target(voice.gain, note.level * .075 * quiet, .045);
      this.target(voice.pan, note.pan, .2);
    });
    this.journey.forEach((voice, index) => {
      this.target(voice.gain, journey * (.009 + reaction * .006) / (index + 1));
      this.target(voice.pan, clamp(catPan, -1, 1), .12);
    });
    this.shimmer.forEach((voice, index) => {
      this.target(voice.gain, split * .014 + reaction * .003);
      this.target(voice.pan, index ? .95 : -.95);
    });
    this.finale.forEach((voice, index) => {
      this.target(voice.gain, finale * .014 / (1 + index * .5), .5);
      this.target(voice.pan, (index - 1) * .65, .4);
    });
  }
}

export function mountAudioControls(container, timeline) {
  const audio = new QuantumAudio(timeline);
  container.classList.add("audio-controls");
  container.innerHTML = `
    <button type="button" class="audio-toggle" aria-pressed="false">Activar sonido espacial</button>
    <label class="audio-volume">Volumen
      <input type="range" min="0" max="100" value="40" step="1" aria-label="Volumen del sonido espacial" />
      <output>40%</output>
    </label>
    <span class="audio-status" role="status">Estéreo · Mejor con audífonos o dos bocinas</span>`;
  const button = container.querySelector("button");
  const slider = container.querySelector("input");
  const output = container.querySelector("output");
  const status = container.querySelector(".audio-status");
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await audio.setEnabled(!audio.enabled);
      button.textContent = audio.enabled ? "Silenciar sonido" : "Activar sonido espacial";
      button.setAttribute("aria-pressed", String(audio.enabled));
      container.dataset.enabled = String(audio.enabled);
      container.dataset.error = "false";
      status.textContent = audio.enabled ? "Ambiente espacial estéreo activo" : "Sonido desactivado";
    } catch (error) {
      container.dataset.error = "true";
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  slider.addEventListener("input", () => {
    audio.setVolume(Number(slider.value) / 100);
    output.value = `${slider.value}%`;
  });
  document.addEventListener("visibilitychange", () => {
    audio.hidden = document.hidden;
    audio.update(audio.frame, true);
  });
  addEventListener("pagehide", (event) => {
    if (!event.persisted) audio.context?.close();
  });
  return audio;
}
