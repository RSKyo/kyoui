/**
 * 生成唯一 ID，支持可选前缀。
 * 优先使用 crypto.randomUUID，若不支持则使用时间戳+随机数回退方案。
 *
 * @param {string} [prefix=""] - 可选前缀（如 'user'、'item'）
 * @returns {string} 唯一 ID，如 "user-1fbpx0lt25w3gfwjsrw5v8"
 */
export function generateId(prefix = "") {
  const id =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  return `${prefix ? prefix + "-" : ""}${id}`;
}