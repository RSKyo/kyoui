import { config } from "../config";

// 扁平化嵌套数组（生成器）
export function* flattenArray(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flattenArray(item);
    } else {
      yield item;
    }
  }
}

// 扁平化嵌套数组（返回新数组）
export function flattenArrayToList(arr) {
  return [...flattenArray(arr)];
}

// 递归对一维或多维数组执行映射操作
export function mapNested(data, fn) {
  if (Array.isArray(data)) {
    return data.map((d) => mapNested(d, fn));
  }
  return fn(data);
}

const roundingMethods = {
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
};

// 保留指定小数位（支持 round / floor / ceil）
export function roundFixed(n, options = {}) {
  const { decimals = config.DEFAULT_DECIMALS ?? 0, method = "round" } = options;
  const f = config.FIXED ? Math.pow(10, decimals) : 1;
  return roundingMethods[method]?.(n * f) / f;
}

// 安全除法，避免除以 0
export function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

// 限制数值在指定区间内
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

// 对数值添加抖动扰动（以 base 为基础，在 ±jitterBase * ratio 范围内变动）
export function applyJitter(base, ratio, { jitterBase = base } = {}) {
  return base + jitterBase * (Math.random() * 2 - 1) * ratio;
}

export function generateId(prefix = "") {
  const id =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  return `${prefix ? prefix + "-" : ""}${id}`;
}

export const filterEntries = (obj, fn) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(k, v)));

export const isEqualJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const isEqualRef = (a, b) => Object.is(a, b);

export const safeClone = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    console.warn("Fallback clone failed, data may be corrupted");
    return value;
  }
};
