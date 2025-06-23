import { config } from "@/app/lib/config";

// 获取调用者函数名（用于 log 输出定位调用源）
function getCallerInfo() {
  const err = new Error();
  const stack = err.stack?.split("\n");
  if (stack && stack.length > 3) {
    const line = stack[3];
    const match = line.match(/at (.+?) \(/);
    return match?.[1] || "<anonymous>";
  }
  return "<unknown>";
}

// 简单封装的 log 工具，支持级别区分和可选 emoji 标识 + 调用者函数名
export const log = {
  debug: (...args) => {
    if (config.DEBUG)
      console.log(`🟢 [viora][debug][${getCallerInfo()}]`, ...args);
  },
  info: (...args) => {
    if (config.DEBUG)
      console.info(`🔵 [viora][info][${getCallerInfo()}]`, ...args);
  },
  warn: (...args) => {
    if (config.DEBUG)
      console.warn(`🟡 [viora][warn][${getCallerInfo()}]`, ...args);
  },
  error: (...args) => {
    if (config.DEBUG)
      console.error(`🔴 [viora][error][${getCallerInfo()}]`, ...args);
  },
  group: (label) => {
    // 分组日志输出（方便浏览器 console 折叠展开）
    if (config.DEBUG) console.group(`🧩 [viora] ${label}`);
  },
  groupEnd: () => {
    // 结束分组日志输出
    if (config.DEBUG) console.groupEnd();
  },
};

// 安全除法，避免除以 0，保留默认小数位数
export function safeDiv(a, b) {
  return +(b === 0 ? 0 : a / b).toFixed(config.DEFAULT_DECIMALS);
}

/**
 * 初始化 canvas 并返回包含绘图上下文和布局信息的对象。
 *
 * 主要职责：
 * - 根据传入尺寸或 DOM 实际尺寸设置 canvas 大小；
 * - 适配高分屏（根据 devicePixelRatio 进行缩放）；
 * - 重置 context 的绘图状态与变换矩阵；
 * - 计算带 padding 的绘图区域（drawArea）；
 *
 * @param {HTMLCanvasElement} canvas - 要初始化的 canvas 元素
 * @param {number} [width=0] - 可选的目标宽度（CSS 像素）
 * @param {number} [height=0] - 可选的目标高度（CSS 像素）
 * @returns {{
 *   canvas: HTMLCanvasElement,         // 原始 canvas 元素
 *   dpr: number,                       // 当前设备的像素比
 *   rect: DOMRect,                     // canvas 的 DOM 边界快照
 *   width: number,                     // 设置的宽度（CSS 像素）
 *   height: number,                    // 设置的高度（CSS 像素）
 *   ctx: CanvasRenderingContext2D,     // canvas 的绘图上下文
 *   drawArea: {                        // 限制绘图的有效区域（单位仍为 CSS 像素）
 *     left: number,
 *     right: number,
 *     top: number,
 *     bottom: number,
 *   },
 *   paddingRatio: number               // 实际使用的 padding 比例（0 ~ 0.5）
 * }}
 */
export function initializeCanvas(canvas, width = 0, height = 0) {
  const dpr = window.devicePixelRatio || 1;

  // rect 是调用时的边界信息，是 DOM 的“快照”，就不会反映后续变化。
  const rect = canvas.getBoundingClientRect();
  const w = width > 0 ? width : rect.width;
  const h = height > 0 ? height : rect.height;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  // 先设置尺寸，再设置缩放
  // 虽然 ctx 是引用对象，但如果 canvas 的分辨率变了（即 .width 或 .height 变了），ctx 的绘图状态会被清除。
  // 清除所有绘图内容；
  // 清除 ctx 的样式（如 strokeStyle, lineWidth）；
  // 清除变换矩阵（如 scale, translate, rotate）；
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const MAX_PADDING_RATIO = 0.5;
  const DEFAULT_PADDING_RATIO = config.PADDING_RATIO ?? 0;
  const paddingRatio = Math.max(
    0,
    Math.min(DEFAULT_PADDING_RATIO, MAX_PADDING_RATIO)
  );
  const left = w * paddingRatio;
  const right = w * (1 - paddingRatio);
  const top = h * paddingRatio;
  const bottom = h * (1 - paddingRatio);

  return {
    canvas,
    dpr,
    rect,
    width: w,
    height: h,
    ctx,
    drawArea: { left, right, top, bottom },
    paddingRatio,
  };
}

/**
 * 获取鼠标在 canvas 上的位置
 *
 * @param {object} canvasInfo - initializeCanvas 返回对象
 * @param {MouseEvent} e - 鼠标事件对象
 * @returns {{
 *   e: MouseEvent,
 *   viewport: { x: number, y: number },  // 鼠标在浏览器视口中的位置
 *   canvas: { x: number, y: number },    // 相对于 canvas 左上角的坐标，已限制在 drawArea 范围内
 * }}
 */
export function getMousePositionInCanvas(canvasInfo, e) {
  const { rect, drawArea } = canvasInfo;
  const { left, top, right, bottom } = drawArea;

  const vx = e.clientX;
  const vy = e.clientY;
  const cx = Math.min(right, Math.max(left, vx - rect.left));
  const cy = Math.min(bottom, Math.max(top, vy - rect.top));
  return {
    e,
    viewport: { x: vx, y: vy },
    canvas: { x: cx, y: cy },
  };
}

// 判断是否为分段结构（二维点数组）
export function isSegmented(points) {
  return Array.isArray(points[0]);
}

// 标准化为二维结构，统一处理格式
export function getSegments(points) {
  return isSegmented(points) ? points : [points];
}

// 对一维或二维点数组执行映射操作
export function mapNested(points, fn) {
  return isSegmented(points)
    ? points.map((segment) => segment.map(fn))
    : points.map(fn);
}

// 对数值添加抖动扰动（以 base 为基础，在 ±jitterBase * ratio 范围内变动）
export function applyJitter(base, ratio, jitterBase = base) {
  return base + jitterBase * (Math.random() * 2 - 1) * ratio;
}

// 判断两个点是否近似相等（坐标差值小于容差）
export function isSamePoint(a, b) {
  return (
    Math.abs(a?.x - b?.x) < config.TOLERANCE &&
    Math.abs(a?.y - b?.y) < config.TOLERANCE
  );
}

// 获取一个点相对于 anchor 的镜像点（保持原属性）
export function mirrorPoint(point, anchor) {
  return {
    ...point,
    x: anchor.x * 2 - point.x,
    y: anchor.y * 2 - point.y,
  };
}

export function findMatchingPoint(points, x, y) {
  const pp = getSegments(points);
  for (let i = 0; i < pp.length; i++) {
    for (let j = 0; j < 4; j++) {
      const p = pp[i][j];
      if (Math.hypot(p.x - x, p.y - y) < config.HIT_RADIUS) {
        return { segmentIdx: i, pointIdx: j };
      }
    }
  }

  return null;
}

// 深度克隆
export function deepClone(points) {
  return mapNested(points, (p) => ({ ...p }));
}

/**
 * 防抖包装器：在操作停止一段时间后再执行回调函数
 * - 常用于用户输入、窗口 resize 等高频但最终只需要一次响应的场景
 *
 * @param {Object} timerRef - 来自 useRef() 的引用对象，用于保存计时器 ID
 * @param {Function} fn - 需要执行的目标函数
 * @param {number} [delay=300] - 延迟时间（毫秒）
 * @returns {Function} 包装后的函数
 */
export function debounceWrapper(fn, delay = config.DEBOUNCE_DELAY) {
  let timer = null; // 作用域私有变量
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流包装器：在指定时间间隔内最多只触发一次回调函数
 * - 常用于滚动、拖拽等持续高频事件的节流处理
 *
 * @param {Object} lastTimeRef - 来自 useRef() 的引用对象，用于保存上次触发时间戳
 * @param {Function} fn - 需要执行的目标函数
 * @param {number} [interval=100] - 最小触发间隔（毫秒）
 * @returns {Function} 包装后的函数
 */
export function throttleWrapper(fn, interval = config.THROTTLE_INTERVAL) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
