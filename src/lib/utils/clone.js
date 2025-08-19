import { isObject } from "./is";

export function safeClone(value) {
  // 原始值直接返回
  if (!isObject(value)) return value;

  // 现代浏览器 / Node.js >= 17.0 提供原生 structuredClone，能克隆 Map、Set、Date 等复杂结构
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (err) {
      console.warn("structuredClone failed, falling back to JSON:", err);
    }
  }

  // 如果失败（如循环引用、DOM 元素等），回退 JSON
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    console.warn(
      "Fallback clone failed for:",
      Object.prototype.toString.call(value),
      err
    );
    return value;
  }
}