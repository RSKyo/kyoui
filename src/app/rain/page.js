"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { createFolio } from "@/app/lib/canvas/folio";
import { whenElementReady } from "@/app/lib/utils/dom";
import { debounceWrapper } from "@/app/lib/utils/timing";
import { initializeCanvas } from "@/app/lib/canvas/transform";
import {
  useBroadcastChannel,
  useDebouncedResizeObserver,
} from "@/app/lib/utils/hooks";

export default function RainPage() {
  const canvasParentRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasInfo, setCanvasInfo] = useState(null);

  const [timedValues, setTimedValues] = useState(null);
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

  useEffect(() => {

    return () => {
      folio.stop();
    };
  }, []);

  useEffect(() => {
    if (timedValues) {
      console.log("✅ B 页面终于拿到值了", timedValues);
      // 你可以在这里触发 folio 渲染或其他副作用
    }
  }, [timedValues]);

  const handleMessage = (event) => {
    setTimedValues(event.data);
  };

  useBroadcastChannel("sample-draw", handleMessage);

  const handleResize = (entry) => {
    const { contentWidth: width, contentHeight: height } = entry.metrics;
    setCanvasInfo(initializeCanvas(canvasRef.current, { width, height }));
    whenElementReady(() => canvasRef.current).then((element) => {
      const canvasInfo = initializeCanvas(element, { width, height });
      setCanvasInfo(canvasInfo);
    });
  };

  useDebouncedResizeObserver(() => canvasParentRef.current, handleResize, 300);

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
