
/**
 * 根据条件筛选对象中的键值对。
 * @param {Object} obj - 输入对象
 * @param {(key: string, value: any) => boolean} fn - 判断是否保留的函数
 * @returns {Object} 新对象，仅包含满足条件的键值对
 */
export const filterEntries = (obj, fn) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => fn(k, v)));






