"use client";

import { useRef, useState, useEffect } from "react";
// 通用工具
import { roundFixed, whenElementReady } from "@/lib/utils";

// 画布与几何
import {
  locateHitPoint,
  sampleBezierTimedValues,
  updateBezier,
  initializeCanvas,
  getCanvasTransform,
  getCanvasMouseInfo,
  mapToCanvas,
} from "@/lib/bezier";

// 绘图工具
import {
  drawCircle,
  drawGrid,
  drawBezier,
  drawBezierControlPolygon,
  drawBezierControlPoints,
  drawText,
} from "@/lib/canvas";

// 预设
import { kyouiInSine_canvas } from "./presets/gesture";

// hooks
import {
  useThrottleFn,
  useBroadcastChannel,
  useDebouncedResizeObserver,
  useEventListener,
} from "@/hooks";

export default function BezierPage() {
  const canvasParentRef = useRef(null);
  const canvasRef = useRef(null);

  const [canvasInfo, setCanvasInfo] = useState(null);
  const [sourcePoints, setSourcePoints] = useState(kyouiInSine_canvas);
  const [samples, setSamples] = useState(10);
  const [timedValuesOptions, setTimedValuesOptions] = useState({
    minValue: 0,
    maxValue: 50,
    valueJitterRatio: 0.3,
    minTime: 0,
    maxTime: 1000,
    timeJitterRatio: 0,
  });

  const [canvasTransform, setCanvasTransform] = useState(null);
  const [beziers, setBeziers] = useState(null);
  const [timedValues, setTimedValues] = useState(null);

  const handleMessage = (event) => {
    test();
    if (event.data === "timedValues" && timedValues) {
      channel.postMessage(timedValues);
    }
  };
  const test = () => {};

  const channel = useBroadcastChannel("sample-draw", {
    onMessage: handleMessage,
  });

  const dragging = useRef({ segmentIndex: null, pointIndex: null });

  const syncDataState = (options = {}) => {
    const isCanvasInfoChanged = "canvasInfo" in options;
    const isSourcePointsChanged = "sourcePoints" in options;
    const isSamplesChanged = "samples" in options;
    const isTimedValuesOptionsChanged = "timedValuesOptions" in options;
    const isCanvasTransformChanged =
      isCanvasInfoChanged || isSourcePointsChanged;
    const isBeziersChanged = isCanvasTransformChanged || "beziers" in options;
    const isTimedValuesChanged =
      isBeziersChanged || isSamplesChanged || isTimedValuesOptionsChanged;

    const _canvasInfo = isCanvasInfoChanged ? options.canvasInfo : canvasInfo;
    const _sourcePoints = isSourcePointsChanged
      ? options.sourcePoints
      : sourcePoints;
    const _samples = isSamplesChanged ? options.samples : samples;
    const _timedValuesOptions = isTimedValuesOptionsChanged
      ? options.timedValuesOptions
      : timedValuesOptions;

    const _canvasTransform = isCanvasTransformChanged
      ? getCanvasTransform(_sourcePoints, _canvasInfo)
      : canvasTransform;
    const _beziers = isCanvasTransformChanged
      ? mapToCanvas(_sourcePoints, _canvasTransform)
      : options.beziers ?? beziers;
    const _timedValues = isTimedValuesChanged
      ? sampleBezierTimedValues(_beziers, _samples, _timedValuesOptions)
      : timedValues;

    if (isCanvasInfoChanged) setCanvasInfo(_canvasInfo);
    if (isSourcePointsChanged) setSourcePoints(_sourcePoints);
    if (isSamplesChanged) setSamples(_samples);
    if (isTimedValuesOptionsChanged) setTimedValuesOptions(_timedValuesOptions);
    if (isCanvasTransformChanged) setCanvasTransform(_canvasTransform);
    if (isBeziersChanged) setBeziers(_beziers);
    if (isTimedValuesChanged) {
      setTimedValues(_timedValues);
      channel.postMessage(_timedValues);
    }
  };

  useEffect(() => {
    if (!canvasInfo) return;
    const { ctx, width, height } = canvasInfo;
    canvasInfo.clear();

    // draw grid
    drawGrid(ctx, width, height, 50, { color: "#eee" });

    // draw beziers
    beziers.forEach(([p0, p1, p2, p3]) => {
      drawBezier(ctx, p0, p1, p2, p3, { color: "blue" });
      drawBezierControlPolygon(ctx, p0, p1, p2, p3, {
        color: "gray",
        dash: [5, 5],
      });
      drawBezierControlPoints(ctx, p0, p1, p2, p3, {
        p0: { radius: 4, fill: { color: "black" } },
        p1: { radius: 4, fill: { color: "red" } },
        p2: { radius: 4, fill: { color: "red" } },
        p3: { radius: 4, fill: { color: "black" } },
      });
    });

    // draw timedValues
    timedValues.forEach(({ x, y, dx, dy, time, value, jitteredValue }) => {
      drawCircle(ctx, x, y, 2, { fill: { color: "red" } });
      // drawText(ctx, value, x + 5, y);

      const y2 = y + roundFixed(((value - jitteredValue) * dy) / value);
      drawCircle(ctx, x, y2, 2, { fill: { color: "green" } });
      drawText(ctx, jitteredValue, x + 5, y2);
    });
  }, [timedValues]);

  const handlePointsChanged = (e) => {
    try {
      const newSourcePoints = JSON.parse(e.target.value);
      syncDataState({ sourcePoints: newSourcePoints });
    } catch (err) {
      e.target.value = JSON.stringify(sourcePoints);
    }
  };

  const handleSamplesChanged = (e) => {
    const newSamples = Number(e.target.value);
    syncDataState({ samples: newSamples });
  };

  const handleTimedValuesOptionsChanged = (e) => {
    try {
      const newTimedValuesOptions = JSON.parse(e.target.value);
      syncDataState({ timedValuesOptions: newTimedValuesOptions });
    } catch (err) {
      e.target.value = JSON.stringify(sourcePoints);
    }
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCanvasMouseInfo(e, canvasInfo);
    const match = locateHitPoint(beziers, x, y);
    if (match) dragging.current = match;
  };

  const handleMouseMove = (e) => {
    if (dragging.current.segmentIndex === null) return;
    const { x, y } = getCanvasMouseInfo(e, canvasInfo);
    const { segmentIndex, pointIndex } = dragging.current;
    throttleUpdateBezier(beziers, segmentIndex, pointIndex, x, y);
  };

  const handleMouseUp = () => {
    dragging.current = { segmentIndex: null, pointIndex: null };
  };

  useEventListener(() => window, "mouseup", handleMouseUp);

  const handleUpdateBezier = (beziers, segmentIndex, pointIndex, x, y) => {
    const newBeziers = updateBezier(beziers, segmentIndex, pointIndex, x, y);
    syncDataState({ beziers: newBeziers });
  };

  const throttleUpdateBezier = useThrottleFn(handleUpdateBezier);

  const handleResize = (entry) => {
    const { contentWidth: width, contentHeight: height } = entry.metrics;
    whenElementReady(() => canvasRef.current).then((element) => {
      const canvasInfo = initializeCanvas(element, { width, height });
      syncDataState({ canvasInfo });
    });
  };

  useDebouncedResizeObserver(() => canvasParentRef.current, handleResize, 300);

  return (
    <div className="flex h-full">
      {/* 左侧固定宽度面板 */}
      <div className="w-[280px] bg-white border-r border-gray-200 p-4 space-y-2 flex flex-col">
        {/* 源点输入 */}
        <div className="space-y-1 flex flex-col">
          <label className="block text-xs text-gray-500">
            源曲线点 (Points)
          </label>
          <textarea
            defaultValue={JSON.stringify(sourcePoints, null, 2)}
            onBlur={handlePointsChanged}
            rows={6}
            className="input-basic w-full font-mono text-xs"
          />
        </div>
        {/* 采样数 */}
        <div className="space-y-1 flex flex-col">
          <label className="block text-xs text-gray-500">
            采样数 (Samples)
          </label>
          <input
            type="number"
            defaultValue={samples}
            min={2}
            onBlur={handleSamplesChanged}
            className="input-basic w-full"
          />
        </div>
        {/* 其他参数 */}
        <div className="space-y-1 flex flex-col">
          <label className="block text-xs text-gray-500">
            其他参数 (Options)
          </label>
          <textarea
            defaultValue={JSON.stringify(timedValuesOptions, null, 2)}
            onBlur={handleTimedValuesOptionsChanged}
            rows={6}
            className="input-basic w-full font-mono text-xs"
          />
        </div>
        {/* 采样结果 */}
        <div className="flex-1 overflow-hidden space-y-1 flex flex-col">
          <label className="block text-xs text-gray-500">
            采样结果 (Sampled Timed Values)
          </label>
          <textarea
            readOnly
            value={
              timedValues ? JSON.stringify(timedValues, null, 2) : "Loading..."
            }
            className="flex-1 input-basic font-mono text-xs"
          />
        </div>
      </div>
      <div className="flex-1 bg-neutral-50 p-4 overflow-hidden">
        <div
          className="w-full h-full rounded border border-gray-300 bg-white "
          ref={canvasParentRef}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        </div>
      </div>
    </div>
  );
}
