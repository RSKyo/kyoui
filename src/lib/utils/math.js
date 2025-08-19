// 安全除法，避免除以 0
export function safeDiv(a, b) {
  return b === 0 ? 0 : a / b;
}

// 限制数值在指定区间内
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
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
  decimals = 0,
  mode = 0
) {
  const f = decimals > 0 ? Math.pow(10, decimals) : 1;
  const fn = mode === 0 ? Math.round : mode < 0 ? Math.floor : Math.ceil;
  return fn(n * f) / f;
}