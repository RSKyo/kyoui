import { useEffect, useRef, useCallback } from "react";

/**
 * 返回一个稳定函数引用，始终调用最新的 fn。
 * 适用于事件监听、定时器、回调传递等场景。
 */
export const useRefFn = (fn) => {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args) => {
    if (typeof fnRef.current === "function") return fnRef.current(...args);
  }, []);
};

/**
 * 返回一个防抖函数，在 delay 毫秒后调用 fn。
 * 调用间隔内如有新调用会重置计时。
 */
export const useDebounceFn = (fn, delay = 300) => {
  const fnRef = useRefFn(fn);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fnRef(...args);
      }, delay);
    },
    [delay]
  );
};

/**
 * 返回一个节流函数，在 interval 间隔内最多调用一次 fn。
 */
export const useThrottleFn = (fn, interval = 100) => {
  const fnRef = useRefFn(fn);
  const lastTimeRef = useRef(0);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastTimeRef.current >= interval) {
        lastTimeRef.current = now;
        fnRef(...args);
      }
    },
    [interval]
  );
};
