import { useMemo, useEffect, useRef, useCallback } from "react";
import { whenElementReady } from "@/app/lib/utils/dom";

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

/**
 * 创建一个 BroadcastChannel 并监听 message 消息。
 * 会在卸载时自动移除监听并关闭频道。
 * onmessage 会始终调用最新的回调函数。
 */
export const useBroadcastChannel = (name, onmessage) => {
  const bc = useMemo(() => new BroadcastChannel(name), [name]);
  const onMessageRef = useRefFn(onmessage);

  useEffect(() => {
    const handler = (e) => onMessageRef(e);
    bc.addEventListener("message", handler);

    return () => {
      bc.removeEventListener("message", handler);
      bc.close();
    };
  }, [name]);

  return bc;
};

/**
 * 提取元素尺寸、边距、边框、内边距等完整信息。
 */
const extractStyleMetrics = (element) => {
  const offsetWidth = element.offsetWidth;
  const offsetHeight = element.offsetHeight;
  const clientWidth = element.clientWidth;
  const clientHeight = element.clientHeight;
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const boxSizing = style.boxSizing;
  const border = {
    top: parseFloat(style.borderTopWidth),
    right: parseFloat(style.borderRightWidth),
    bottom: parseFloat(style.borderBottomWidth),
    left: parseFloat(style.borderLeftWidth),
  };
  const padding = {
    top: parseFloat(style.paddingTop),
    right: parseFloat(style.paddingRight),
    bottom: parseFloat(style.paddingBottom),
    left: parseFloat(style.paddingLeft),
  };
  const margin = {
    top: parseFloat(style.marginTop),
    right: parseFloat(style.marginRight),
    bottom: parseFloat(style.marginBottom),
    left: parseFloat(style.marginLeft),
  };
  const contentWidth = clientWidth - padding.left - padding.right;
  const contentHeight = clientHeight - padding.top - padding.bottom;

  return {
    offsetWidth,
    offsetHeight,
    clientWidth,
    clientHeight,
    contentWidth,
    contentHeight,
    rect,
    boxSizing,
    border,
    padding,
    margin,
  };
};

/**
 * 使用 ResizeObserver 监听元素尺寸变化。
 */
export const useResizeObserver = (getElement, onResize) => {
  useEffect(() => {
    let observer;
    whenElementReady(getElement).then((element) => {
      if (!element) return;

      const resizeCallback = (entries) => {
        for (const entry of entries) {
          onResize({
            element: entry.target,
            metrics: extractStyleMetrics(entry.target),
          });
        }
      };
      observer = new ResizeObserver(resizeCallback);
      observer.observe(element);
    });

    return () => {
      if (observer) observer.disconnect();
    };
  }, []);
};

/**
 * 防抖版本的 useResizeObserver。
 */
export const useDebouncedResizeObserver = (
  getElement,
  onResize,
  delay = 300
) => {
  const debounced = useDebounceFn(onResize, delay);
  useResizeObserver(getElement, debounced);
};

/**
 * 节流版本的 useResizeObserver。
 */
export const useThrottledResizeObserver = (
  getElement,
  onResize,
  interval = 100
) => {
  const throttled = useThrottleFn(onResize, interval);
  useResizeObserver(getElement, throttled);
};

/**
 * 等待元素准备好后触发 onReady，并在卸载时触发 onClean。
 */
export const useElementReady = (getElement, onReady, onClean) => {
  const elementRef = useRef(null);
  const handleReadyRef = useRefFn(onReady);
  const handleCleanRef = useRefFn(onClean);

  useEffect(() => {
    whenElementReady(getElement).then((element) => {
      elementRef.current = element;
      handleReadyRef(element);
    });

    return () => {
      const element = elementRef.current;
      if (element) handleCleanRef(element);
    };
  }, []);
};

/**
 * 在元素准备好后添加事件监听器，并在卸载时移除。
 */
export const useEventListener = (
  getElement,
  eventType,
  onListener,
  eventOptions
) => {
  const elementRef = useRef(null);
  const handleListenerRef = useRefFn(onListener);

  useEffect(() => {
    whenElementReady(getElement).then((element) => {
      elementRef.current = element;
      element.addEventListener(eventType, handleListenerRef, eventOptions);
    });
    return () => {
      const element = elementRef.current;
      if (element)
        element.removeEventListener(eventType, handleListenerRef, eventOptions);
    };
  }, []);
};
