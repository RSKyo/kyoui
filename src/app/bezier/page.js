"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { config } from "@/app/lib/config";
import { whenElementReady } from "@/app/lib/utils/dom";
import { throttleWrapper, debounceWrapper } from "@/app/lib/utils/timing";
import { useGlobalMap } from "@/app/lib/utils/store";
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


  const [sourcePoints, setSourcePoints] = useState(kyouiInSine_canvas);
  const [samples, setSamples] = useState(10);

  const [canvasInfo, setCanvasInfo] = useState(null);
  const [canvasTransform, setCanvasTransform] = useState(null);
  const [beziers, setBeziers] = useState(null);
  const [timedValues, setTimedValues] = useState(null);

  const { setGlobalMap } = useGlobalMap();

  const dragging = useRef({ segmentIndex: null, pointIndex: null });

  const prepareData = ({
    _canvasElement,
    _canvasWidth,
    _canvasHeight,
    _sourcePoints,
    _samples,
    _beziers,
  } = {}) => {
    const __canvasInfo = _canvasElement
      ? initializeCanvas(_canvasElement, {
          width: _canvasWidth,
          height: _canvasHeight,
        })
      : canvasInfo;
    const __sourcePoints = _sourcePoints || sourcePoints;
    const __samples = _samples || samples;

    const __canvasTransform =
      _canvasElement || _sourcePoints
        ? getCanvasTransform(__sourcePoints, __canvasInfo)
        : canvasTransform;
    const __beziers =
      _canvasElement || _sourcePoints
        ? mapToCanvas(__sourcePoints, __canvasTransform)
        : _beziers || beziers;
    const __timedValues =
      _canvasElement || _sourcePoints || _beziers || _samples
        ? sampleBezierTimedValues(__beziers, __samples, defaultSamplingOptions)
        : timedValues;

    if (_canvasElement) setCanvasInfo(__canvasInfo);
    if (_sourcePoints) setSourcePoints(__sourcePoints);
    if (_samples) setSamples(__samples);
    if (_canvasElement || _sourcePoints) setCanvasTransform(__canvasTransform);
    if (_canvasElement || _sourcePoints || _beziers) setBeziers(__beziers);
    if (_canvasElement || _sourcePoints || _beziers || _samples)
      setTimedValues(__timedValues);
  };

  // 首次加载
  useEffect(() => {
    whenElementReady(() => canvasRef.current).then((element) => {
      prepareData({ _canvasElement: element });
    });

    const observer = new ResizeObserver(debounceHandleResize);
    observer.observe(canvasParentRef.current);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      observer.disconnect();
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!timedValues) return;

    const { width, height } = canvasInfo;
    const ctx = canvasInfo.ctx;
    canvasInfo.clear();

    // background grid
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // draw curves and handles
    beziers.forEach((points) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.bezierCurveTo(
        points[1].x,
        points[1].y,
        points[2].x,
        points[2].y,
        points[3].x,
        points[3].y
      );
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.strokeStyle = "gray";
      ctx.stroke();
      ctx.setLineDash([]);

      points.forEach((pt, i) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 || i === 3 ? "black" : "red";
        ctx.fill();
      });
    });

    // draw sampled points
    timedValues.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "green";
      ctx.fill();
    });

    setGlobalMap("timedValues", timedValues);
  }, [timedValues]);

  const handlePointsChanged = (e) => {
    try {
      const _sourcePoints = JSON.parse(e.target.value);
      prepareData({ _sourcePoints });
    } catch (err) {
      e.target.value = JSON.stringify(sourcePoints);
    }
  };

  const handleSamplesChanged = (e) => {
    const _samples = e.target.value;
    prepareData({ _samples });
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

  const handlerUpdateBezier = (beziers, segmentIndex, pointIndex, x, y) => {
    const updated = updateBezier(beziers, segmentIndex, pointIndex, x, y);
    prepareData({ _beziers: updated });
  };

  const throttleUpdateBezier = useMemo(
    () => throttleWrapper(handlerUpdateBezier),
    []
  );

  const handleResize = (entries) => {
    const { width, height } = entries[0].contentRect;
    prepareData({
      _canvasElement: canvasRef.current,
      _canvasWidth: width,
      _canvasHeight: height,
    });
  };

  const debounceHandleResize = useMemo(() => debounceWrapper(handleResize), []);

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
            className="w-full h-full cursor-pointer"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        </div>
      </div>
    </div>
  );
}
