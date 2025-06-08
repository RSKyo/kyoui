"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  getPointsBounds,
  mapPointsToCanvas,
  getMultiBezierPoints,
  updateLinkedBezierPoint
} from "@/app/viora/components/bezier";

export default function Rain2() {
  const canvasRef = useRef(null);
  const canvasWidth = 600;
  const canvasHeight = 400;
  const [segments, setSegments] = useState(10);
  const [beziers, setBeziers] = useState([
    [
      { x: 0, y: 0 },
      { x: 0.4, y: 1.2 },
      { x: 0.6, y: 1.2 },
      { x: 1, y: 0 }
    ],
    [
      { x: 1, y: 0 },
      { x: 1.4, y: -1.2 },
      { x: 1.6, y: -1.2 },
      { x: 2, y: 0 }
    ]
  ]);

  const dragging = useRef({ segmentIdx: null, pointIdx: null });
  const [samplePoints, setSamplePoints] = useState([]);

  const bounds = useMemo(
    () => getPointsBounds(beziers, { width: canvasWidth, height: canvasHeight, marginRatio: 0.05 }),
    [beziers]
  );

  const pixelCurves = useMemo(
    () => mapPointsToCanvas(beziers, canvasWidth, canvasHeight, { bounds }),
    [bounds]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

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

    pixelCurves.forEach((points) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y);
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

    const relPoints = getMultiBezierPoints(beziers, segments);
    const normPoints = mapPointsToCanvas(relPoints.map(p => [{ x: p.x, y: p.y }]), canvasWidth, canvasHeight, { bounds });

    setSamplePoints(relPoints);
    normPoints.forEach(([pt]) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "green";
      ctx.fill();
    });
  }, [beziers, segments, bounds, pixelCurves]);

  function onMouseDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = 0; i < pixelCurves.length; i++) {
      for (let j = 0; j < 4; j++) {
        const p = pixelCurves[i][j];
        if (Math.hypot(p.x - mx, p.y - my) < 10) {
          dragging.current = { segmentIdx: i, pointIdx: j };
          return;
        }
      }
    }
  }

  function onMouseMove(e) {
    const { segmentIdx, pointIdx } = dragging.current;
    if (segmentIdx === null) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 我们知道画布坐标是通过以下计算的
    // canvasX = marginX + (x - minX) * minScale;
    // canvasY = marginY + (y - minY) * minScale;
    // 所以反算逻辑坐标应该是：
    const newX = (mx - bounds.marginX) / bounds.minScale + bounds.minX;
    const newY = (my - bounds.marginY) / bounds.minScale + bounds.minY;

    const updated = updateLinkedBezierPoint(
      beziers,
      segmentIdx,
      pointIdx,
      { x: newX, y: newY }
    );

    setBeziers(updated);
  }

  function onMouseUp() {
    dragging.current = { segmentIdx: null, pointIdx: null };
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(samplePoints, null, 2));
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <label>Segment Count: </label>
        <input
          type="number"
          value={segments}
          min={2}
          onChange={(e) => setSegments(Math.max(2, parseInt(e.target.value) || 2))}
        />
      </div>

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{ border: "1px solid #ccc", cursor: "pointer" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />

      <div style={{ marginTop: 10, fontFamily: "monospace" }}>
        <strong>Sampled Points:</strong>
        <button onClick={copyToClipboard} style={{ marginLeft: 10 }}>Copy</button>
        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #ccc", padding: 5, marginTop: 5 }}>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(samplePoints, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
