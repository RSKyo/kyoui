"use client";

import { useRef, useEffect, useState } from "react";
import {
  createFolio,
  whenElementReady,
  initializeCanvas,
  drawCircle,
} from "@/lib";
import {
  useRefFn,
  useBroadcastChannel,
  useDebouncedResizeObserver,
} from "@/hooks";

export default function RainPage() {
  const canvasParentRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasInfo, setCanvasInfo] = useState(null);

  const [timedValues, setTimedValues] = useState(null);
  const [folio, setFolio] = useState(null);

  const handleStartRef = useRefFn(() => {
    canvasInfo.clear();
  });

  const handleBeforeFrameRef = useRefFn((elapsed) => {
    canvasInfo.clear();
  });

  const handleUpdaterRef = useRefFn((elapsed, { __data }) => {
    if (!__data) return;
    return __data.filter((o) => o.time < elapsed);
  });

  const handleRenderRef = useRefFn((elapsed, { data }) => {
    if (!data) return;
    if (!canvasInfo?.ctx) return;
    const { ctx } = canvasInfo;
    data.forEach((o) => {
      drawCircle(ctx, o.x, o.y, 5, { fill: { color: "red" } });
    });
  });

  const handleMessage = (event) => {
    setTimedValues(event.data);
  };

  const channel = useBroadcastChannel("sample-draw", {
    onMessage: handleMessage,
  });

  const handleResize = (entry) => {
    const { contentWidth: width, contentHeight: height } = entry.metrics;
    setCanvasInfo(initializeCanvas(canvasRef.current, { width, height }));
    whenElementReady(() => canvasRef.current).then((element) => {
      const canvasInfo = initializeCanvas(element, { width, height });
      setCanvasInfo(canvasInfo);
    });
  };

  useDebouncedResizeObserver(() => canvasParentRef.current, handleResize, 300);

  useEffect(() => {
    whenElementReady(() => canvasRef.current).then((element) => {
      const folio = createFolio({
        onStart: handleStartRef,
        onBeforeFrame: handleBeforeFrameRef,
      });
      folio.addDrawable(timedValues, handleUpdaterRef, handleRenderRef);
      setFolio(folio);
      channel.postMessage("timedValues");
    });

    return () => {
      if (folio) folio.stop();
    };
  }, []);

  useEffect(() => {
    if (timedValues && folio) {
      folio.stop(false);
      folio.setDataAt(0, timedValues);
    }
  }, [timedValues]);

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
