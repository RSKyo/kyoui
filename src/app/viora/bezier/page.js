"use client";

import { config } from "@/app/shared/config";
import { throttleWrapper } from "@/app/shared/utils";
import {
  sampleBezierPoints,
  updateBezier,
} from "@/app/viora/components/bezier";
import {
  getCanvasTransform,
  mapToCanvas,
} from "@/app/viora/components/projector";

import { useRef, useState, useEffect, useMemo } from "react";
import { easeInQuad_canvas } from "@/app/shared/curves";

export default function BezierPage() {
  const canvasRef = useRef(null);
  const canvasWidth = 600;
  const canvasHeight = 400;
  const paddingRatio = config.PADDING_RATIO;
  const minX = canvasWidth * paddingRatio;
  const maxX = canvasWidth * (1 - paddingRatio);
  const minY = canvasHeight * paddingRatio;
  const maxY = canvasHeight * (1 - paddingRatio);

  const [segments, setSegments] = useState(10);
  const [beziers, setBeziers] = useState(() => {
    const points = easeInQuad_canvas;
    return mapToCanvas(
      points,
      getCanvasTransform(points, canvasWidth, canvasHeight)
    );
  });

  const sampledBezierPoints = useMemo(
    () => sampleBezierPoints(beziers, segments),
    [beziers, segments]
  );
  const dragging = useRef({ segmentIdx: null, pointIdx: null });
  const handleMouseUp = () => {
    dragging.current = { segmentIdx: null, pointIdx: null };
  };
  const throttleLastTimeRef = useRef(0);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener(handleMouseUp);
    };
  }, []);

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

    // 已通过 useMemo 生成 sampledBezierPoints，无需再次计算

    sampledBezierPoints.forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "green";
      ctx.fill();
    });
  }, [beziers, segments]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const clampedX = Math.min(maxX, Math.max(minX, mx));
    const clampedY = Math.min(maxY, Math.max(minY, my));

    for (let i = 0; i < beziers.length; i++) {
      for (let j = 0; j < 4; j++) {
        const p = beziers[i][j];
        if (Math.hypot(p.x - clampedX, p.y - clampedY) < 10) {
          dragging.current = { segmentIdx: i, pointIdx: j };
          return;
        }
      }
    }
  };

  const handleMouseMove = throttleWrapper(
    (e) => {
      const { segmentIdx, pointIdx } = dragging.current;
      if (segmentIdx === null) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const clampedX = Math.min(maxX, Math.max(minX, mx));
      const clampedY = Math.min(maxY, Math.max(minY, my));

      const updated = updateBezier(beziers, segmentIdx, pointIdx, {
        x: clampedX,
        y: clampedY,
      });

      setBeziers(updated);
    },
    100,
    throttleLastTimeRef
  );

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(sampledBezierPoints, null, 2));
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <label>Segment Count: </label>
        <input
          type="number"
          value={segments}
          min={2}
          onChange={(e) =>
            setSegments(Math.max(2, parseInt(e.target.value) || 2))
          }
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
        <strong>Sampled Points:</strong>
        <button onClick={copyToClipboard} style={{ marginLeft: 10 }}>
          Copy
        </button>
        <div
          style={{
            maxHeight: 200,
            overflowY: "auto",
            border: "1px solid #ccc",
            padding: 5,
            marginTop: 5,
          }}
        >
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {JSON.stringify(sampledBezierPoints, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
