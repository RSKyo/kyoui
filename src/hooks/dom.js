import { useEffect, useRef } from "react";
import { whenElementReady } from "@/lib";
import { useRefFn } from "@/hooks/common";

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
