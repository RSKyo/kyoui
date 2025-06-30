"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useRef, useState, useEffect, useMemo } from "react";
import {
  log,
  throttleWrapper,
  findMatchingPoint,
  useGlobalStore,
  whenElementReady,
} from "@/app/lib/utils";
import { sampleBezierTimedValues, updateBezier } from "@/app/lib/bezier";
import {
  initializeCanvas,
  getCanvasTransform,
  getCanvasMouseInfo,
  mapToCanvas,
  mapFromCanvas,
} from "@/app/lib/projector";
import { kyouiInSine_canvas } from "@/app/bezier/presets/gesture";

export default function BezierPage() {
  const canvasRef = useRef(null);
  const defaultSamplingOptions = {
    minValue: 1,
    maxValue: 50,
    valueJitterRatio: 0.3,
    interval: 100,
    intervalJitterRatio: 0.2,
    includeXY: true,
  };

  const [isClient, setIsClient] = useState(false);
  const [canvasInfo, setCanvasInfo] = useState(null);
  const [samples, setSamples] = useState(10);
  const [points, setPoints] = useState(kyouiInSine_canvas);
  const [canvasTransform, setCanvasTransform] = useState(null);
  const [beziers, setBeziers] = useState(null);
  const [timedValues, setTimedValues] = useState(null);

  const { setGlobalData } = useGlobalStore();

  const dragging = useRef({ segmentIdx: null, pointIdx: null });

  const throttleUpdateBezier = useMemo(
    () =>
      throttleWrapper((_beziers, _segmentIdx, _pointIdx, _newPoint) => {
        const updated = updateBezier(
          _beziers,
          _segmentIdx,
          _pointIdx,
          _newPoint
        );
        setBeziers(updated);
      }),
    []
  );

  // 首次加载
  useEffect(() => {
    whenElementReady(() => canvasRef.current)
      .then(() => {
        setCanvasInfo(initializeCanvas(canvasRef.current));
      });
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!canvasInfo) return;

    const _canvasTransform = getCanvasTransform(points, canvasInfo);
    setCanvasTransform(_canvasTransform);
    const _beziers = mapToCanvas(points, _canvasTransform);
    setBeziers(_beziers);
  }, [points, canvasInfo]);

  useEffect(() => {
    if (!beziers) return;

    setTimedValues(
      sampleBezierTimedValues(beziers, samples, defaultSamplingOptions)
    );
  }, [beziers, samples]);

  useEffect(() => {
    if (!timedValues) return;

    const { width, height } = canvasInfo;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

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
      ctx.lineWidth = 2;
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

    setGlobalData("timedValues", timedValues);
  }, [timedValues]);

  const handlePointsChanged = (e) => {
    try {
      const newPoints = JSON.parse(e.target.value);
      const newCanvasTransform = getCanvasTransform(
        newPoints,
        canvasInfo.width,
        canvasInfo.height
      );
      const newBeziers = mapToCanvas(newPoints, newCanvasTransform);
      setPoints(newPoints);
      setCanvasTransform(newCanvasTransform);
      setBeziers(newBeziers);
    } catch (err) {
      e.target.value = JSON.stringify(points);
    }
  };

  const handleSamplesChanged = (e) => {
    const v = e.target.value;
    setSamples(v);
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCanvasMouseInfo(e, canvasInfo);
    const match = findMatchingPoint(beziers, x, y);
    if (match) dragging.current = match;
  };

  const handleMouseMove = (e) => {
    if (dragging.current.segmentIdx === null) return;
    const { x, y } = getCanvasMouseInfo(e, canvasInfo);
    const { segmentIdx, pointIdx } = dragging.current;
    throttleUpdateBezier(beziers, segmentIdx, pointIdx, { x, y });
  };

  const handleMouseUp = () => {
    dragging.current = { segmentIdx: null, pointIdx: null };
  };

  return (
    <div className="flex flex-row h-full rounded-lg">
      <div className="flex-1 min-w-0 flex flex-col p-1">
        <div className="flex-initial  ">
          <div className="flex gap-1">
            <label>Points:</label>
            <input
              type="text"
              defaultValue={JSON.stringify(points)}
              onBlur={handlePointsChanged}
              className="flex-1"
            />
          </div>
          <div className="flex gap-1">
            <label>Samples:</label>
            <input
              type="number"
              defaultValue={samples}
              min={2}
              onBlur={handleSamplesChanged}
            />
          </div>
        </div>
        <div className="flex-1">
          <canvas
            className="w-full h-full"
            ref={canvasRef}
            style={{ border: "1px solid #ccc", cursor: "pointer" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        </div>
        <div className="flex-initial h-12 overflow-x-auto">
          <pre className="text-xs font-mono whitespace-pre">
            {beziers !== null
              ? JSON.stringify(mapFromCanvas(beziers, canvasTransform))
              : "Loading..."}
          </pre>
        </div>
      </div>
      <div className="flex-1 min-w-0  overflow-auto bg-neutral-100 p-1">
        <strong>Sampled Timed Values:</strong>
        <SyntaxHighlighter
          language="json"
          style={tomorrow}
          showLineNumbers={true}
          wrapLongLines
          customStyle={{
            borderRadius: "8px",
            padding: "1rem",
            fontSize: "10px",
          }}
          codeTagProps={{ style: { fontFamily: "Fira Code, monospace" } }}
        >
          {timedValues !== null
            ? JSON.stringify(timedValues, null, 2)
            : "Loading..."}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
