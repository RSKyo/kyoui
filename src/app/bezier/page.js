"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import {
  debounceWrapper,
  throttleWrapper,
  findMatchingPoint,
  initializeCanvas,
  getMousePositionInCanvas,
} from "@/app/lib/utils";
import { sampleBezierTimedValues, updateBezier } from "@/app/lib/bezier";
import {
  getCanvasTransform,
  mapToCanvas,
  mapFromCanvas,
} from "@/app/lib/projector";
import { kyouiInSine_canvas } from "@/app/bezier/presets/gesture";

export default function BezierPage() {
  const canvasRef = useRef(null);
  const canvasWidth = 600;
  const canvasHeight = 400;

  const [isClient, setIsClient] = useState(false);
  const [canvasInfo, setCanvasInfo] = useState(null);
  const [samples, setSamples] = useState(10);
  const [points, setPoints] = useState(kyouiInSine_canvas);
  const [canvasTransform, setTransform] = useState(() => {
    return getCanvasTransform(points, canvasWidth, canvasHeight);
  });
  const [beziers, setBeziers] = useState(() => {
    return mapToCanvas(points, canvasTransform);
  });

  const sampledTimedValues = useMemo(
    () =>
      sampleBezierTimedValues(beziers, samples, {
        minValue: 1,
        maxValue: 50,
        valueJitterRatio: 0.3,
        interval: 100,
        intervalJitterRatio: 0.2,
        includeXY: true,
      }),
    [beziers, samples]
  );

  const dragging = useRef({ segmentIdx: null, pointIdx: null });

  const debouncedSetPoints = useMemo(() => debounceWrapper(setPoints), []);
  const debouncedSetSamples = useMemo(() => debounceWrapper(setSamples), []);
  const throttleUpdateBezier = useMemo(
    () =>
      throttleWrapper((mousePosition, beziers) => {
        const { segmentIdx, pointIdx } = dragging.current;
        const { x, y } = mousePosition.canvas;
        const updated = updateBezier(beziers, segmentIdx, pointIdx, { x, y });
        setBeziers(updated);
      }),
    []
  );

  useEffect(() => {
    setIsClient(true);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      setCanvasInfo(
        initializeCanvas(canvasRef.current, canvasWidth, canvasHeight)
      );
    }
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // background grid
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvasWidth; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
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
    sampledTimedValues.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "green";
      ctx.fill();
    });
  }, [beziers, samples]);

  const handlePointsChange = (e) => {
    const v = JSON.parse(e.target.value);
    if(v) debouncedSetPoints(v);
  };

  const handleSamplesChange = (e) => {
    const v = parseInt(e.target.value);
    debouncedSetSamples(v);
  };

  const handleMouseDown = (e) => {
    const mousePosition = getMousePositionInCanvas(canvasInfo, e);
    const { x, y } = mousePosition.canvas;
    const match = findMatchingPoint(beziers, x, y);
    if (match) dragging.current = match;
  };

  const handleMouseMove = (e) => {
    if (dragging.current.segmentIdx === null) return;
    const mousePosition = getMousePositionInCanvas(canvasInfo, e);
    throttleUpdateBezier(mousePosition, beziers);
  };

  const handleMouseUp = () => {
    dragging.current = { segmentIdx: null, pointIdx: null };
  };

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(sampledTimedValues, null, 2));
  }

  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: "none" }}>
         <div style={{ marginBottom: 8 }}>
          <input
            type="text"
            value={JSON.stringify(points)}
            onChange={handlePointsChange}
            placeholder="Input points JSON"
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Samples: </label>
          <input
            type="number"
            value={samples}
            min={2}
            onChange={handleSamplesChange}
          />
        </div>

        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ border: "1px solid #ccc", cursor: "pointer" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        />

        <div style={{ marginTop: 10, fontFamily: "monospace" }}>
          <div
            style={{
              maxHeight: 200,
              maxWidth: canvasWidth,
              overflow: "auto",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
              padding: 5,
              boxSizing: "border-box",
              fontSize: "10px",
            }}
          >
            <pre style={{ margin: 0 }}>
              {JSON.stringify(mapFromCanvas(beziers, canvasTransform))}
            </pre>
          </div>
          <strong>Sampled Points:</strong>
          <button onClick={copyToClipboard} style={{ marginLeft: 10 }}>
            Copy
          </button>
          <div
            style={{
              maxHeight: 200,
              maxWidth: canvasWidth,
              overflow: "auto",
              border: "1px solid #ccc",
              padding: 5,
              boxSizing: "border-box",
              fontSize: "10px",
            }}
          >
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {isClient
                ? JSON.stringify(sampledTimedValues)
                : "Loading..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
