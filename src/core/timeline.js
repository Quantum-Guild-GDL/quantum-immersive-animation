export class Timeline {
  constructor(config) {
    this.config = config;
    this.pausedAt = 0;
    this.pauseOffset = 0;
    this.running = true;
  }

  get seconds() {
    const clock = this.running ? Date.now() : this.pausedAt;
    return (clock - this.pauseOffset) / 1000;
  }

  get time() {
    return ((this.seconds % this.config.loopDuration) + this.config.loopDuration) % this.config.loopDuration;
  }

  get cycle() { return Math.floor(this.seconds / this.config.loopDuration); }

  toggle() {
    if (this.running) {
      this.running = false;
      this.pausedAt = Date.now();
    } else {
      this.pauseOffset += Date.now() - this.pausedAt;
      this.running = true;
    }
  }

  seek(seconds) {
    this.pauseOffset = Date.now() - seconds * 1000;
    if (!this.running) this.pausedAt = Date.now();
  }
}

