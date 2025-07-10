import { config } from "@/app/lib/config";

// 防抖包装器：在操作停止一段时间后再执行回调函数
export function debounceWrapper(fn, delay = config.DEBOUNCE_DELAY ?? 300) {
  let timer = null; // 作用域私有变量
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流包装器：在指定时间间隔内最多只触发一次回调函数
export function throttleWrapper(
  fn,
  interval = config.THROTTLE_INTERVAL ?? 100
) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
