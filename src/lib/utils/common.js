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

/**
 * 按指定小数位数进行舍入，返回数值。
 * @param {number} n - 原始数字
 * @param {number} decimals=0 - 保留的小数位数
 * @param {number} mode=0 - 舍入方式：0=round，负数=floor，正数=ceil
 * @returns {number} 舍入后的数值
 */
export function toFixedNumber(
  n,
  decimals = config.DEFAULT_DECIMALS ?? 0,
  mode = 0
) {
  const f = decimals > 0 ? Math.pow(10, decimals) : 1;
  const fn = mode === 0 ? Math.round : mode < 0 ? Math.floor : Math.ceil;
  return fn(n * f) / f;
}

// 安全除法，避免除以 0
export function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

// 限制数值在指定区间内
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
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
