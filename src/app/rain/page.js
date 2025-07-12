"use client";

import { useRef, useEffect, useState, useMemo } from "react";

import { createFolio } from "@/app/lib/canvas/folio";
import { useGlobalMap } from "@/app/lib/utils/store";
import { whenElementReady } from "@/app/lib/utils/dom";
import { debounceWrapper } from "@/app/lib/utils/timing";
import { initializeCanvas } from "@/app/lib/canvas/transform";

export default function RainPage() {
  const canvasParentRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasInfo, setCanvasInfo] = useState(null);
  const [folio, setFolio] = useState(null);

  const folioOptions = {
    duration: 0,
    repeat: 1,
    onStart: null,
    onFrame: null,
    onRepeat: null,
    onStop: null,
    onEnd: null,
  };

  const timedValues = useGlobalMap((state) => state.globalMap["timedValues"]);

  useEffect(() => {
    whenElementReady(() => canvasRef.current).then((element) => {
      setCanvasInfo(initializeCanvas(element));
      setFolio(createFolio(folioOptions));
    });
    const observer = new ResizeObserver(debounceHandleResize);
    observer.observe(canvasParentRef.current);

    window.addEventListener("storage", handleStorage);
    return () => {
      observer.disconnect();
      folio.stop();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (timedValues) {
      console.log("✅ B 页面终于拿到值了", timedValues);
      // 你可以在这里触发 folio 渲染或其他副作用
    }
  }, [timedValues]);

  const handleResize = (entries) => {
    const { width, height } = entries[0].contentRect;
    setCanvasInfo(initializeCanvas(canvasRef.current, { width, height }));
  };

  const debounceHandleResize = useMemo(() => debounceWrapper(handleResize), []);

  const handleStorage = (event) => {
    if (event.key === "globalMap-storage") {
      const parsed = JSON.parse(event.newValue);
      
      // 将新值同步到当前 tab 的 Zustand 状态中
      if (parsed?.state?.globalMap) {
        // 更新当前 store 的状态
        const current = useGlobalMap.getState().globalMap;
        const incoming = parsed.state.globalMap;

        // 简单去重逻辑：仅更新变化的键
        Object.entries(incoming).forEach(([key, value]) => {
          if (!Object.is(current[key], value)) {
            useGlobalMap.getState().setGlobalMap(key, value);
          }
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="space-x-1">
        <button
          onClick={() => folio?.run()}
          className="px-4 py-1 bg-blue-500 text-white rounded"
        >
          Run
        </button>
        <button
          onClick={() => folio?.pause()}
          className="px-4 py-1 bg-green-500 text-white rounded"
        >
          Pause
        </button>
        <button
          onClick={() => folio?.stop()}
          className="px-4 py-1 bg-red-500 text-white rounded"
        >
          Stop
        </button>
        <pre>{timedValues ? JSON.stringify(timedValues) : "empty"}</pre>
      </div>
      <div className="flex-1 bg-neutral-50 p-4 overflow-hidden">
        <div
          className="w-full h-full rounded border border-gray-300 bg-white "
          ref={canvasParentRef}
        >
          <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />
        </div>
      </div>
    </div>
  );
}
