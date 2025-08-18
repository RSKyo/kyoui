import { config } from "../config";

/**
 * 扁平化嵌套数组（生成器），支持指定展开层数。
 *
 * @param {any[]} arr - 输入嵌套数组
 * @param {number} [depth=Infinity] - 要展开的最大层数（默认为 Infinity 表示完全展开）
 * @yields {any} 每一项非数组元素，按原始顺序产出
 *
 * 说明：
 * - “展开 1 层”表示只展开最外层数组中的嵌套数组；
 * - 每增加 1 层 depth，相当于进一步展开更深一层的嵌套；
 * - 与 Array.prototype.flat(depth) 的行为一致。
 */
export function* flattenArrayGen(arr, depth = Infinity) {
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      yield* flattenArrayGen(item, depth - 1);
    } else {
      yield item;
    }
  }
}

/**
 * 扁平化嵌套数组（返回新数组），等价于 [...flattenArrayGen(arr, depth)]
 *
 * @param {any[]} arr - 输入嵌套数组
 * @param {number} [depth=Infinity] - 最大展开层数
 * @returns {any[]} 扁平化结果数组
 */
export function flattenArray(arr, depth = Infinity) {
  return [...flattenArrayGen(arr, depth)];
}

/**
 * 提取嵌套数组中指定层级以内的所有非数组元素（生成器版）。
 *
 * @param {any[]} arr - 输入嵌套数组
 * @param {number} [depth=Infinity] - 最大提取深度（0 表示只提取最外层的非数组元素）
 * @yields {any} 非数组元素，按原始顺序依次产出
 *
 * 说明：
 * - 每遇到一个数组，就视为“进入下一层”
 * - 仅当当前层级 ≤ depth 时才继续递归提取
 */
export function* extractArrayGen(arr, depth = Infinity) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      if (depth > 0) {
        yield* extractArrayGen(item, depth - 1);
      }
    } else {
      yield item;
    }
  }
}

/**
 * 提取嵌套数组中指定层级以内的所有非数组元素（数组版）。
 *
 * @param {any[]} arr - 输入嵌套数组
 * @param {number} [depth=Infinity] - 最大提取深度
 * @returns {any[]} 扁平的一维数组，仅包含非数组元素
 */
export function extractArray(arr, depth = Infinity) {
  return [...extractArrayGen(arr, depth)];
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
