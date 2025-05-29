/**
 * 创建一个 folio 动画控制器。
 * 用于管理 canvas 上的动画播放控制、图层更新与渲染、生命周期钩子等。
 *
 * 核心功能包括：
 * - 通过 requestAnimationFrame 实现帧调度和动画驱动
 * - 支持 duration + repeat 控制循环动画次数
 * - 支持自定义更新逻辑（updater）与渲染函数（render）注册到图层
 * - 支持事件生命周期钩子：onStart、onFrame、onRepeat、onStop、onEnd
 * - 提供暂停 / 恢复 / 停止控制，适合游戏逻辑或演示动画
 * - 自动适配高分屏（通过 devicePixelRatio）
 * - 提供辅助方法如 setBackground、clear、resize 等
 *
 * @param {HTMLCanvasElement} canvas - 要绑定的 canvas 元素。
 * @param {number} [width] - 可选，初始宽度（CSS 像素）。
 * @param {number} [height] - 可选，初始高度（CSS 像素）。
 * @param {number} [duration] - 可选，单次动画持续时间（毫秒），0 表示无限制。
 * @param {number} [repeat] - 可选，动画重复次数，默认 1；可设为 Infinity。
 * @param {Function} [onStart] - 动画开始时触发。
 * @param {Function} [onFrame] - 每一帧执行完毕后触发。
 * @param {Function} [onRepeat] - 每次动画循环结束后触发。
 * @param {Function} [onStop] - 主动停止动画时触发（manual=true）。
 * @param {Function} [onEnd] - 动画完成全部循环后触发。
 * @returns {object} folio 对象，包含 run, stop, pause, addDrawable 等方法。
 */
export function createFolio(
  canvas,
  {
    width = 0,
    height = 0,
    duration = 0,
    repeat = 1,
    onStart = null,
    onFrame = null,
    onRepeat = null,
    onStop = null,
    onEnd = null,
    onResize = null,
    debug = false,
  }
) {
  if (!canvas) throw new Error("canvas element is required.");

  const folio = {
    // 初始化 canvas 和动画配置参数
    canvas: null,
    ctx: null,
    _dpr: 1,
    width: 0,
    height: 0,

    // 动画控制状态
    _status: "idle",
    _animationFrameId: null,
    _startTime: null,
    _pausedAt: null,
    _totalPaused: 0,
    _duration: 0,
    _repeat: 1,
    _playCount: 0,

    // 图层管理
    _updaters: [],
    _renders: [],

    // 生命周期钩子
    handleStart: null,
    handleFrame: null,
    handleRepeat: null,
    handleStop: null,
    handleEnd: null,
    handleResize: null,

    // 调试
    _debug: false,

    get center() {
      return {
        x: this.width / 2,
        y: this.height / 2,
      };
    },

    /** 初始化 folio 对象 */
    init(
      canvas,
      {
        width = 0,
        height = 0,
        duration = 0,
        repeat = 1,
        onStart = null,
        onFrame = null,
        onRepeat = null,
        onStop = null,
        onEnd = null,
        onResize = null,
        debug = false,
      }
    ) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this._dpr = window.devicePixelRatio || 1;

      this._duration = duration > 0 ? duration : 0;
      this._repeat = repeat >= 1 ? repeat : 1;
      this._boundAnimate = this.animate.bind(this);

      const rect = canvas.getBoundingClientRect();
      const w = width > 0 ? width : rect.width;
      const h = height > 0 ? height : rect.height;
      this.setSize(w, h);

      this.handleStart = typeof onStart === "function" ? onStart : null;
      this.handleFrame = typeof onFrame === "function" ? onFrame : null;
      this.handleRepeat = typeof onRepeat === "function" ? onRepeat : null;
      this.handleStop = typeof onStop === "function" ? onStop : null;
      this.handleEnd = typeof onEnd === "function" ? onEnd : null;
      this.handleResize = typeof onResize === "function" ? onResize : null;
      this._debug = debug;
    },

    /** 设置 canvas 大小并适配高分屏 */
    setSize(width, height) {
      this.canvas.width = width * this._dpr;
      this.canvas.height = height * this._dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.width = width;
      this.height = height;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this._dpr, this._dpr);
    },

    /** 自动根据容器尺寸更新画布大小 */
    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.setSize(rect.width, rect.height);
      this.handleResize?.(this);
    },

    /** 判断当前是否空闲状态 */
    isIdle() {
      return this._status === "idle";
    },

    /** 判断是否正在播放 */
    isRunning() {
      return this._status === "running";
    },

    /** 判断是否处于暂停状态 */
    isPaused() {
      return this._status === "paused";
    },

    /** 判断是否已停止 */
    isStopped() {
      return this._status === "stopped";
    },

    /** 启动动画主循环 */
    run() {
      if (this.isRunning()) return;
      this.logDebug("Animation started");

      if (this.isIdle() || this.isStopped()) {
        this._startTime = performance.now();
        this._totalPaused = 0;
        this.handleStart?.(this);
      }
      if (this.isPaused()) {
        this._totalPaused += performance.now() - this._pausedAt;
        this._pausedAt = null;
      }
      this._status = "running";
      this._animationFrameId = requestAnimationFrame(this._boundAnimate);
    },

    /** 暂停动画 */
    pause() {
      if (!this.isRunning()) return;
      this.logDebug("Animation paused");

      this._status = "paused";
      this._pausedAt = performance.now();
      if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId);
    },

    /** 停止动画并重置状态 */
    stop(manual = true) {
      if (this.isStopped() || this.isIdle()) return;
      if (manual) this.logDebug("Animation stopped");

      this.handleStop?.(this);
      this._status = "stopped";
      if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
      this._startTime = null;
      this._pausedAt = null;
      this._totalPaused = 0;
      this._playCount = 0;
    },

    /** 动画主循环，每帧触发 */
    animate(timestamp) {
      if (!this.isRunning()) return;
      const elapsed = this.getElapsed(timestamp);
      if (
        this._duration > 0 &&
        elapsed >= (this._playCount + 1) * this._duration
      ) {
        this._playCount++;
        this.logDebug(`Loop #${this._playCount}`);
        if (this._playCount >= this._repeat) {
          this.logDebug("Animation ended");
          this.handleEnd?.(this);
          this.stop(false);
          return;
        } else {
          this.handleRepeat?.(this);
          return (this._animationFrameId = requestAnimationFrame(
            this._boundAnimate
          ));
        }
      }

      this._updaters.forEach(({ id, data, updater }) => {
        updater(elapsed, { id, data, folio: this });
      });

      this.clear();
      this._renders.forEach(({ id, data, render, zIndex }) => {
        render(elapsed, { id, data, zIndex, folio: this });
      });

      this.handleFrame?.(elapsed, this);
      this._animationFrameId = requestAnimationFrame(this._boundAnimate);
    },

    /** 计算动画运行时间（排除暂停时间） */
    getElapsed(timestamp) {
      if (!this._startTime) return 0;
      return timestamp - this._startTime - this._totalPaused;
    },

    /** 添加图层（支持 updater 和 render） */
    addDrawable({ id, data, updater, render, zIndex = 0 }) {
      if (!id) id = this.generateId("drawable");
      // 若已有相同 ID 的图层，发出警告，避免覆盖或误删
      if (this._renders.some((d) => d.id === id)) {
        this.logWarn(`重复 drawable ID: ${id}`);
      }
      if (typeof zIndex !== "number") zIndex = this._renders.length;
      if (typeof updater === "function")
        this._updaters.push({ id, data, updater });
      if (typeof render === "function")
        this._renders.push({ id, data, render, zIndex });
      // 根据 zIndex 从小到大排序，确保绘制顺序正确
      this._renders.sort((a, b) => a.zIndex - b.zIndex);
    },

    /** 移除指定 ID 的图层 */
    removeDrawable(id) {
      this._updaters = this._updaters.filter((item) => item.id !== id);
      this._renders = this._renders.filter((item) => item.id !== id);
    },

    /** 清空画布 */
    clear() {
      this.ctx.clearRect(0, 0, this.width, this.height);
    },

    /** 设置背景填充颜色 */
    setBackground(color = "rgb(255, 255, 255)", alpha = 1) {
      const fillStyle = this.convertToRgba(color, alpha);
      this.ctx.fillStyle = fillStyle;
      this.ctx.fillRect(0, 0, this.width, this.height);
    },

    /** 将 rgb / hex 颜色转换为 rgba 字符串 */
    convertToRgba(color, alpha) {
      if (color.startsWith("rgba(") && color.endsWith(")")) {
        return color;
      }
      if (color.startsWith("rgb(")) {
        return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
      }
      if (color.startsWith("#")) {
        let r, g, b;
        if (color.length === 4) {
          r = parseInt(color[1] + color[1], 16);
          g = parseInt(color[2] + color[2], 16);
          b = parseInt(color[3] + color[3], 16);
        } else {
          r = parseInt(color.slice(1, 3), 16);
          g = parseInt(color.slice(3, 5), 16);
          b = parseInt(color.slice(5, 7), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      return color;
    },

    /** 生成唯一 ID（带前缀） */
    generateId(prefix = "id") {
      const fallback = () => prefix + "-" + Math.random().toString(36).slice(2);
      return typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : fallback();
    },

    /** 内部调试输出方法 */
    logWarn(...args) {
      console.log("[folio]", ...args);
    },
    logDebug(...args) {
      if (this._debug) console.log("[folio]", ...args);
    },
  };

  folio.init(canvas, {
    width,
    height,
    duration,
    repeat,
    onStart,
    onFrame,
    onRepeat,
    onStop,
    onEnd,
    onResize,
    debug,
  });
  return folio;
}
