import { config } from "@/app/shared/config";

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

// 深度克隆
export function deepClone(points) {
  return mapNested(points, (p) => ({ ...p }));
}

// 防抖：等你不动了我才执行
// 防抖包装器：在用户停止触发一定时间后才执行回调
// 适合输入框、窗口调整等高频操作
export function debounceWrapper(fn, delay = 300, timerRef) {
  return function (...args) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流：定时开闸放水
// 节流包装器：固定时间间隔内只执行一次回调
// 适合滚动、拖拽、resize 等连续触发事件
export function throttleWrapper(fn, interval = 100, lastTimeRef) {
  return function (...args) {
    const now = Date.now();
    if (now - lastTimeRef.current >= interval) {
      lastTimeRef.current = now;
      fn.apply(this, args);
    }
  };
}
