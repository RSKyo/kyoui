"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { config } from "@/app/lib/config";
import { whenElementReady } from "@/app/lib/utils/dom";
import { throttleWrapper, debounceWrapper } from "@/app/lib/utils/timing";
import { locateHitPoint } from "@/app/lib/utils/points";
import { sampleBezierTimedValues } from "@/app/lib/bezier/sampler";
import { updateBezier } from "@/app/lib/bezier/updater";
import {
  initializeCanvas,
  getCanvasTransform,
  getCanvasMouseInfo,
  mapToCanvas,
  mapFromCanvas,
} from "@/app/lib/canvas/transform";
import { kyouiInSine_canvas } from "@/app/bezier/presets/gesture";
import { useBroadcastChannel, useElementResize } from "@/app/lib/utils/hooks";
import {
  drawCircle,
  drawGrid,
  drawBezier,
  drawBezierControlPolygon,
  drawBezierControlPoints,
} from "@/app/lib/canvas/drawing";

export default function BezierPage() {
  const canvasParentRef = useRef(null);
  const canvasRef = useRef(null);
  const defaultSamplingOptions = {
    minValue: 1,
    maxValue: 50,
    valueJitterRatio: 0.3,
    interval: 100,
    intervalJitterRatio: 0.2,
    axis: config.constants.AXIS.DY,
    includeXY: true,
    includeDXY: false,
  };

  const [canvasInfo, setCanvasInfo] = useState(null);
  const [sourcePoints, setSourcePoints] = useState(kyouiInSine_canvas);
  const [samples, setSamples] = useState(10);

  const [canvasTransform, setCanvasTransform] = useState(null);
  const [beziers, setBeziers] = useState(null);
  const [timedValues, setTimedValues] = useState(null);

  const bc = useBroadcastChannel("sample-draw");

  const dragging = useRef({ segmentIndex: null, pointIndex: null });

  const syncDataState = (options = {}) => {
    const isCanvasInfoChanged = "canvasInfo" in options;
    const isSourcePointsChanged = "sourcePoints" in options;
    const isSamplesChanged = "samples" in options;
    const isCanvasTransformChanged =
      isCanvasInfoChanged || isSourcePointsChanged;
    const isBeziersChanged = isCanvasTransformChanged || "beziers" in options;
    const isTimedValuesChanged = isBeziersChanged || isSamplesChanged;

    const _canvasInfo = isCanvasInfoChanged ? options.canvasInfo : canvasInfo;
    const _sourcePoints = isSourcePointsChanged
      ? options.sourcePoints
      : sourcePoints;
    const _samples = isSamplesChanged ? options.samples : samples;

    const _canvasTransform = isCanvasTransformChanged
      ? getCanvasTransform(_sourcePoints, _canvasInfo)
      : canvasTransform;
    const _beziers = isCanvasTransformChanged
      ? mapToCanvas(_sourcePoints, _canvasTransform)
      : options.beziers ?? beziers;
    const _timedValues = isTimedValuesChanged
      ? sampleBezierTimedValues(_beziers, _samples, defaultSamplingOptions)
      : timedValues;

    if (isCanvasInfoChanged) setCanvasInfo(_canvasInfo);
    if (isSourcePointsChanged) setSourcePoints(_sourcePoints);
    if (isSamplesChanged) setSamples(_samples);
    if (isCanvasTransformChanged) setCanvasTransform(_canvasTransform);
    if (isBeziersChanged) setBeziers(_beziers);
    if (isTimedValuesChanged) {
      setTimedValues(_timedValues);
      // bc.postMessage(_timedValues);
    }
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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
    timedValues.forEach(({ x, y }) => {
      drawCircle(ctx, x, y, 2, { fill: { color: "red" } });
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

  const handleUpdateBezier = (beziers, segmentIndex, pointIndex, x, y) => {
    const newBeziers = updateBezier(beziers, segmentIndex, pointIndex, x, y);
    syncDataState({ beziers: newBeziers });
  };

  const throttleUpdateBezier = useMemo(
    () => throttleWrapper(handleUpdateBezier),
    []
  );

  const handleResize = (entry) => {
    const { contentWidth: width, contentHeight: height } = entry.metrics;
    whenElementReady(() => canvasRef.current).then((element) => {
      const canvasInfo = initializeCanvas(element, { width, height });
      syncDataState({ canvasInfo });
    });
  };

  useElementResize(() => canvasParentRef.current, handleResize);

  return (
    <div className="flex h-full">
      {/* 左侧固定宽度面板 */}
      <div className="w-[280px] bg-white border-r border-gray-200 p-4 space-y-2 flex flex-col">
        {/* 源点输入 */}
        <div className="space-y-1">
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
        {/* 采样结果 */}
        <div className="flex-1 overflow-hidden flex flex-col">
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
