import { useMemo, useEffect, useRef } from "react";
import { whenElementReady } from "@/app/lib/utils/dom";
import { debounceWrapper, throttleWrapper } from "@/app/lib/utils/timing";

const isFn = (fn) => typeof fn === "function";

export function useBroadcastChannel(name) {
  const bc = useMemo(() => new BroadcastChannel(name), [name]);

  useEffect(() => {
    return () => {
      bc.close();
    };
  }, [bc]);

  return bc;
}

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

export function useElementResize(
  getElement,
  handleResize,
  { isDebounce = true, delay, isThrottle = false, interval } = {}
) {
  const handleResizeRef = useRef(handleResize);
  useEffect(() => {
    handleResizeRef.current = handleResize;
  }, [handleResize]);

  const callLatest = (...args) => {
    handleResizeRef.current(...args);
  };

  const wrapperHandleResize = useMemo(() => {
    if (isDebounce) return debounceWrapper(callLatest, delay);
    if (isThrottle) return throttleWrapper(callLatest, interval);
    return callLatest;
  }, [isDebounce, isThrottle, delay, interval]);

  useEffect(() => {
    let observer;
    whenElementReady(getElement).then((element) => {
      if (!element) return;

      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          wrapperHandleResize({
            element: entry.target,
            metrics: extractStyleMetrics(entry.target),
          });
        }
      });
      observer.observe(element);
    });

    return () => {
      if (observer) observer.disconnect();
    };
  }, []);
}

export const useRefFn = (fn) => {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  return useCallback((...args) => fnRef.current(...args), []);
};

export const useElementReady = (
  getTargetElement,
  handleReady,
  { handleClean, isStateful = false } = {}
) => {
  const targetRef = useRef(null);
  const ready = isFn(handleReady)
    ? isStateful
      ? useRefFn(handleReady)
      : handleReady
    : undefined;
  const clean = isFn(handleClean)
    ? isStateful
      ? useRefFn(handleClean)
      : handleClean
    : undefined;

  useEffect(() => {
    whenElementReady(getTargetElement).then((element) => {
      targetRef.current = element;
      if (ready) ready(element);
    });

    return () => {
      if (clean) clean(targetRef.current);
    };
  }, []);
};

export const useEventListener = (
  getTargetElement,
  eventType,
  handleListener,
  { eventOptions, isStateful = false } = {}
) => {
  const targetRef = useRef(null);
  const listener = isFn(handleListener)
    ? isStateful
      ? useRefFn(handleListener)
      : handleListener
    : undefined;

  useEffect(() => {
    whenElementReady(getTargetElement).then((target) => {
      targetRef.current = target;
      if (target && listener)
        target.addEventListener(eventType, listener, eventOptions);
    });
    return () => {
      const target = targetRef.current;
      if (target && listener)
        target.removeEventListener(eventType, listener, eventOptions);
    };
  }, []);
};
