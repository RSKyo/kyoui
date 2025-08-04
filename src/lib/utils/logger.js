import { config } from "../config";

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