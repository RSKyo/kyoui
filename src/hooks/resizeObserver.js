import { useEffect } from "react";
import { whenElementReady } from "@/lib";

/**
 * 提取元素尺寸、边距、边框、内边距等完整信息。
 */
export const extractStyleMetrics = (element) => {
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
