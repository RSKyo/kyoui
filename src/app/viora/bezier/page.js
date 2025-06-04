"use client";

import { useEffect, useRef, useState } from "react";
import { getMultiBezierPoints, mapPointsToCanvas } from "@/app/viora/components/curves";

export default function Rain2() {
  const canvasRef = useRef(null);
  const [segments, setSegments] = useState(10);
  const [samplePoints, setSamplePoints] = useState([]);
  const canvasWidth = 600;
  const canvasHeight = 400;
  const normalizedCurves = [
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
  ];

  const [curvePoints, setCurvePoints] = useState(
    mapPointsToCanvas(normalizedCurves, canvasWidth, canvasHeight)
  );

  const draggingInfo = useRef({ curveIdx: null, pointIdx: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#eee";
      ctx.lineWidth = 1;
      const gridSpacing = 50;
      for (let x = 0; x < canvas.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = "#ccc";
      ctx.setLineDash([3, 3]);
      const origin = curvePoints[0][0];
      ctx.beginPath();
      ctx.moveTo(0, origin.y);
      ctx.lineTo(canvas.width, origin.y);
      ctx.moveTo(origin.x, 0);
      ctx.lineTo(origin.x, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      curvePoints.forEach((points, curveIdx) => {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.bezierCurveTo(
          points[1].x, points[1].y,
          points[2].x, points[2].y,
          points[3].x, points[3].y
        );
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.strokeStyle = "gray";
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        points.forEach((pt, i) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
          const isSharedPoint =
            (curveIdx > 0 && i === 0 &&
              pt.x === curvePoints[curveIdx - 1][3].x &&
              pt.y === curvePoints[curveIdx - 1][3].y) ||
            (curveIdx < curvePoints.length - 1 && i === 3 &&
              pt.x === curvePoints[curveIdx + 1][0].x &&
              pt.y === curvePoints[curveIdx + 1][0].y);

          if (isSharedPoint) {
            ctx.fillStyle = "orange";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
            ctx.strokeStyle = "orange";
            ctx.stroke();
          } else {
            ctx.fillStyle = i === 0 || i === 3 ? "black" : "red";
            ctx.fill();
          }
        });
      });

      const allRelPoints = getMultiBezierPoints(curvePoints, segments, {
        valueMax: 50,
        valueJitter: 0.3,
        intervalMs: 100,
        intervalJitter: 0.2
      });

      setSamplePoints(allRelPoints);

      for (let i = 0; i < allRelPoints.length; i++) {
        const absX = allRelPoints[i].x;
        const absY = allRelPoints[i].y;
        ctx.beginPath();
        ctx.arc(absX, absY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "green";
        ctx.fill();

        ctx.font = "10px sans-serif";
        ctx.fillStyle = "green";
        ctx.fillText(`progress=${allRelPoints[i].progress}, v=${allRelPoints[i].value}`, absX + 5, absY - 5);
      }
    }

    function onMouseDown(e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (let curveIdx = 0; curveIdx < curvePoints.length; curveIdx++) {
        const curve = curvePoints[curveIdx];
        const pointIdx = curve.findIndex(p => Math.hypot(p.x - mx, p.y - my) < 10);
        if (pointIdx !== -1) {
          draggingInfo.current = { curveIdx, pointIdx };
          return;
        }
      }
    }

    function onMouseMove(e) {
      const dragging = draggingInfo.current;
      if (dragging.curveIdx !== null && dragging.pointIdx !== null) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const updated = curvePoints.map((curve, i) => {
          if (i === dragging.curveIdx) {
            return curve.map((pt, j) =>
              j === dragging.pointIdx ? { x: mx, y: my } : pt
            );
          }
          if (
            dragging.curveIdx + 1 === i &&
            dragging.pointIdx === 3 &&
            curvePoints[i][0].x === curvePoints[dragging.curveIdx][3].x &&
            curvePoints[i][0].y === curvePoints[dragging.curveIdx][3].y
          ) {
            const p2 = curvePoints[dragging.curveIdx][2];
            const dx = mx - p2.x;
            const dy = my - p2.y;
            return curve.map((pt, j) =>
              j === 0 ? { x: mx, y: my } :
              j === 1 ? { x: mx + dx, y: my + dy } : pt
            );
          }
          if (
            dragging.curveIdx - 1 === i &&
            dragging.pointIdx === 0 &&
            curvePoints[i][3].x === curvePoints[dragging.curveIdx][0].x &&
            curvePoints[i][3].y === curvePoints[dragging.curveIdx][0].y
          ) {
            const p1 = curvePoints[dragging.curveIdx][1];
            const dx = mx - p1.x;
            const dy = my - p1.y;
            return curve.map((pt, j) =>
              j === 3 ? { x: mx, y: my } :
              j === 2 ? { x: mx + dx, y: my + dy } : pt
            );
          }
          return curve;
        });

        setCurvePoints(updated);
      }
    }

    function onMouseUp() {
      draggingInfo.current = { curveIdx: null, pointIdx: null };
    }

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);

    draw();

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
    };
  }, [segments, curvePoints]);

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(samplePoints, null, 2));
  }

  return (
    <div>
      <div style={{ marginBottom: "8px" }}>
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
        id="canvas"
        width={canvasWidth}
        height={canvasHeight}
        style={{ border: "1px solid #ccc", cursor: "pointer" }}
      />
      <div style={{ marginTop: "10px", fontFamily: "monospace" }}>
        <strong>Sampled Points (relative to P0, y up is positive):</strong>
        <button onClick={copyToClipboard} style={{ marginLeft: "10px" }}>Copy</button>
        <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #ccc", padding: "5px", marginTop: "5px" }}>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(samplePoints, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
