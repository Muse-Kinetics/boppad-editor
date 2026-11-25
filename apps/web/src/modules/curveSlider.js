// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

// Canvas multislider for velocity curves: drag across the bars to draw values.
export default class CurveSlider {
  constructor(container, { width = 500, height = 200, count = 128, max = 127, fill = "#333", accent = "#00adef" } = {}) {
    this.count = count;
    this.max = max;
    this.fill = fill;
    this.accent = accent;
    this.values = new Array(count).fill(0);

    const ratio = window.devicePixelRatio || 1;
    this.canvas = document.createElement("canvas");
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none";
    this.ctx = this.canvas.getContext("2d");
    this.ctx.scale(ratio, ratio);
    this.width = width;
    this.height = height;
    container.appendChild(this.canvas);

    this.canvas.addEventListener("pointerdown", (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      this.last = null;
      this.drawAt(e);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (this.canvas.hasPointerCapture(e.pointerId)) this.drawAt(e);
    });

    this.render();
  }

  setAllSliders(values) {
    this.values = values.slice(0, this.count).map((v) => Math.max(0, Math.min(this.max, Math.round(v))));
    this.render();
  }

  drawAt(e) {
    const rect = this.canvas.getBoundingClientRect(),
      index = Math.max(0, Math.min(this.count - 1, Math.floor(((e.clientX - rect.left) / rect.width) * this.count))),
      value = Math.max(0, Math.min(this.max, Math.round((1 - (e.clientY - rect.top) / rect.height) * this.max)));

    // fill the bars skipped between pointer events so fast drags leave no gaps
    const from = this.last || { index, value },
      steps = Math.abs(index - from.index) || 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.values[Math.round(from.index + (index - from.index) * t)] = Math.round(from.value + (value - from.value) * t);
    }

    this.last = { index, value };
    this.render();
  }

  render() {
    const { ctx, width, height } = this,
      barWidth = width / this.count;

    ctx.fillStyle = this.fill;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = this.accent;
    this.values.forEach((v, i) => {
      const barHeight = (v / this.max) * height;
      ctx.fillRect(i * barWidth, height - barHeight, Math.max(1, barWidth - 1), barHeight);
    });
  }
}
