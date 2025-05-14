export function getFolio(canvas) {
  if (!canvas) return null;

  const folio = {
    // canvas 基本信息
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    get center() {
      return {
        x: this.width / 2,
        y: this.height / 2,
      }
    },
    animationFrameId: null,
    stat: "idle", // idle | running | paused | stopped
    startTime: null,
    pausedAt: null,
    totalPaused: 0,

    init(ref) {
      this.canvas = ref;
      this.ctx = ref.getContext("2d");
      this.resize();
      this.stat = "idle";
      this.animationFrameId = null;
      this.startTime = null;
      this.pausedAt = null;
      this.totalPaused = 0;
    },

    setSize(width, height) {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.width = width * dpr;
      this.height = height * dpr;
      // 缩放上下文坐标系
      this.ctx.scale(dpr, dpr);
    },
    resize() {
      // 可以在 window.resize 时调用 folio.resize()。
      const rect = this.canvas.getBoundingClientRect();
      this.setSize(rect.width, rect.height);
    },

    // 动画状态

    getStat() {
      return this.stat;
    },
    isIdle() {
      return this.stat === "idle";
    },
    isRunning() {
      return this.stat === "running";
    },
    isPaused() {
      return this.stat === "paused";
    },
    isStopped() {
      return this.stat === "stopped";
    },
    run(animate, prefn) {
      if (this.stat === "running") return;
      if (this.stat === "paused") {
        this.totalPaused += performance.now() - this.pausedAt;
        this.pausedAt = null;
      } else {
        this.startTime = performance.now();
        this.totalPaused = 0;
      }
      if (typeof prefn === "function") prefn();
      this.stat = "running";
      if (typeof animate === "function") {
        const boundAnimate = animate.bind(this);
        this.animationFrameId = requestAnimationFrame(boundAnimate);
      }
    },
    pause(afterfn) {
      if (this.stat !== "running") return;
      this.stat = "paused";
      this.pausedAt = performance.now();

      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      if (typeof afterfn === "function") afterfn();
    },
    // 停止动画（并重置时间）
    stop(afterfn) {
      if (this.stat === "stopped" || this.stat === "idle") return;

      this.stat = "stopped";
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.startTime = null;
      this.pausedAt = null;
      this.totalPaused = 0;

      if (typeof afterfn === "function") afterfn();
    },
    reset() {
      this.stop();
      this.stat = "idle";
    },
    // 时间控制

    setStartTime(timestamp) {
      if (!this.startTime) {
        this.startTime = timestamp;
      }
    },
    getElapsed(timestamp) {
      if (!this.startTime) return 0;
      return timestamp - this.startTime - this.totalPaused;
    },

    clear() {
      this.ctx.clearRect(0, 0, this.width, this.height);
    },
    setBackground(color = "0,0,0") {
      const fillStyle = color.includes(",")
        ? `rgba(${color}, ${alpha})`
        : color;
      this.ctx.fillStyle = fillStyle;
      this.ctx.fillRect(0, 0, this.width, this.height);
    },
    drawCircle(x, y, radius = 5, color = "0,0,0", alpha = 1) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      const fillStyle = color.includes(",")
        ? `rgba(${color}, ${alpha})`
        : color;
      this.ctx.fillStyle = fillStyle;
      this.ctx.fill();
    },
  };

  folio.init(canvas);
  return folio;
}
