import {
  generateWaveData,
  generateEasingData,
} from "@/app/viora/components/rain";

export function getFolio(canvas, handleAnimate) {
  if (!canvas) return null;
  if (typeof handleAnimate !== "function") return null;

  const folio = {
    // canvas 基本信息
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    viewWidth: 0,
    viewHeight: 0,
    get center() {
      return {
        x: this.width / 2,
        y: this.height / 2,
      };
    },
    animationFrameId: null,
    animate: function (timestamp) {
      if (!this.isRunning()) return;
      const boundHandleAnimate = handleAnimate.bind(this);
      const rtn = boundHandleAnimate(this.getElapsed(timestamp));
      if(rtn !== false) {
        const boundAnimate = this.animate.bind(this);
        this.animationFrameId = requestAnimationFrame(boundAnimate);
      }
    },
    stat: "idle", // idle | running | paused | stopped
    startTime: null,
    pausedAt: null,
    totalPaused: 0,

    init(ref) {
      this.canvas = ref;
      this.ctx = ref.getContext("2d");
      this.stat = "idle";
      this.animationFrameId = null;
      this.startTime = null;
      this.pausedAt = null;
      this.totalPaused = 0;
      this.points = null;
      this.resize();
    },

    setSize(width, height) {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.width = width;
      this.height = height;
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
    run() {
      if (this.stat === "running") return;
      if (this.stat === "paused") {
        this.totalPaused += performance.now() - this.pausedAt;
        this.pausedAt = null;
      } else {
        this.startTime = performance.now();
        this.totalPaused = 0;
      }
      this.stat = "running";
      const boundAnimate = this.animate.bind(this);
      this.animationFrameId = requestAnimationFrame(boundAnimate);
    },
    pause() {
      if (this.stat !== "running") return;
      this.stat = "paused";
      this.pausedAt = performance.now();

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
    },
    // 停止动画（并重置时间）
    stop() {
      if (this.stat === "stopped" || this.stat === "idle") return;

      this.stat = "stopped";
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.clear();
      this.animationFrameId = null;
      this.startTime = null;
      this.pausedAt = null;
      this.totalPaused = 0;
      this.points = null;
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
    setBackground(color = "rgb(255, 255, 255)", alpha = 1) {
      const fillStyle = this.convertToRgba(color, alpha);
      this.ctx.fillStyle = fillStyle;
      this.ctx.fillRect(0, 0, this.width, this.height);
    },

    convertToRgba(color, alpha) {
      if (color.startsWith("rgb(")) {
        return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
      }
      if (color.startsWith("#")) {
        // 简单版本：只处理 #RRGGBB 格式
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      return color; // fallback，可能是 rgba 已带透明度
    },
    drawCircle(x, y, radius = 5, color = "rgb(0,0,0)", alpha = 1) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      const fillStyle = this.convertToRgba(color, alpha);
      this.ctx.fillStyle = fillStyle;
      this.ctx.fill();
    },

    drawEasingCurve() {
      const colors = [
            "red",
            "green",
            "blue",
            "orange",
            "purple",
            "brown",
            "teal",
            "pink",
            "gray",
          ];
          const funcs = [
            "easeInOutSine",
            "easeInOutQuad",
            "easeInCubic",
            "easeOutCubic",
            "easeInOutCubic",
            "easeInExpo",
            "easeOutExpo",
            "easeInBack",
            "easeOutBack",
          ];
          const easingData = [];
          funcs.forEach(d=>{
            easingData.push({ n: d, data: generateEasingData(100, d)});
          });

          easingData.forEach((d, i) => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = colors[i];
            d.data.forEach((d, j) => {
              const x = d.progress * this.width;
              const y = this.height / 4 + ((1 - d.y) * this.height) / 4;
              console.log(`x:${x},y:${y}`);
              if (j === 0) this.ctx.moveTo(x, y);
              else this.ctx.lineTo(x, y);
            });
            this.ctx.stroke();
            this.ctx.fillStyle = colors[i];
            this.ctx.fillText(d.n, 10, 10 + i * 10);
          });
    },
  };

  folio.init(canvas);
  return folio;
}
