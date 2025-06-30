import { config } from "@/app/lib/config";
import { create } from "zustand";

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

export function* flattenArray(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flattenArray(item);
    } else {
      yield item;
    }
  }
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function roundFixed(
  n,
  decimals = config.DEFAULT_DECIMALS ?? 0,
  method = "round"
) {
  const f = Math.pow(10, decimals);
  const map = {
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
  };
  return map[method]?.(n * f) / f;
}

// 安全除法，避免除以 0，保留默认小数位数
export function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

// 判断是否为分段结构（二维点数组）
export function isSegmented(points) {
  return Array.isArray(points[0]);
}

// 标准化为二维结构，统一处理格式
export function getSegments(points) {
  return isSegmented(points) ? points : [points];
}

// 对一维或多维点数组执行映射操作
export function mapNested(data, fn) {
  if (Array.isArray(data)) {
    return data.map((d) => mapNested(d, fn));
  }
  return fn(data);
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

function shallowEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const useGlobalStore = create((set, get) => ({
  globalDataMap: {},

  setGlobalData: (key, value) => {
    const oldValue = get().globalDataMap[key];
    if (!shallowEqual(oldValue, value)) {
      set((state) => ({
        globalDataMap: {
          ...state.globalDataMap,
          [key]: value,
        },
      }));
    }
  },

  getGlobalData: (key) => get().globalDataMap[key],

  removeGlobalData: (key) => {
    set((state) => {
      const updated = { ...state.globalDataMap };
      delete updated[key];
      return { globalDataMap: updated };
    });
  },

  clearGlobalData: () => set({ globalDataMap: {} }),
}));

export function whenElementReady(getElementFn, { attempt = 10 } = {}) {
  return new Promise((resolve, reject) => {
    let count = 0;

    const tryFn = () => {
      const element = getElementFn();
      if (element) {
        resolve(element);
        return;
      }

      if (count >= attempt) {
        reject(null);
        return;
      }
      count++;
      requestAnimationFrame(tryFn);
    };

    tryFn();
  });
}
