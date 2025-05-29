"use client";

import { useEffect, useRef, useState } from "react";

function getRelativeBezierPoints(P0, P1, P2, P3, segments, options = {}) {
  const {
    valueMax = 50,
    valueJitter = 0.3,
    intervalMs = 100,
    intervalJitter = 0.2,
    decimalPlaces = 5
  } = options;

  function bezierPoint(t) {
    const x =
      Math.pow(1 - t, 3) * P0.x +
      3 * Math.pow(1 - t, 2) * t * P1.x +
      3 * (1 - t) * Math.pow(t, 2) * P2.x +
      Math.pow(t, 3) * P3.x;

    const y =
      Math.pow(1 - t, 3) * P0.y +
      3 * Math.pow(1 - t, 2) * t * P1.y +
      3 * (1 - t) * Math.pow(t, 2) * P2.y +
      Math.pow(t, 3) * P3.y;

    return { x, y };
  }

  const relativePoints = [];
  let maxY = 1;

  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const abs = bezierPoint(t);
    const relX = parseFloat((abs.x - P0.x).toFixed(decimalPlaces));
    const relY = parseFloat((P0.y - abs.y).toFixed(decimalPlaces));

    maxY = Math.max(maxY, Math.abs(relY));

    relativePoints.push({
      progress: parseFloat(t.toFixed(decimalPlaces)),
      x: relX,
      y: relY
    });
  }

  relativePoints.forEach((p, i) => {
    const base = (p.y / maxY) * valueMax;
    const jitterValue = base * valueJitter * (Math.random() * 2 - 1);
    p.value = parseFloat((base + jitterValue).toFixed(decimalPlaces));

    const timeBase = i * intervalMs;
    const jitterTime = timeBase * intervalJitter * (Math.random() * 2 - 1);
    p.time = Math.round(timeBase + jitterTime);
  });

  return relativePoints;
}

export default function Rain2() {
  const canvasRef = useRef(null);
  const [segments, setSegments] = useState(10);
  const [samplePoints, setSamplePoints] = useState([]);
  const [points, setPoints] = useState([
    { x: 100, y: 300 },
    { x: 200, y: 100 },
    { x: 400, y: 100 },
    { x: 500, y: 300 }
  ]);
  const draggingPointRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const origin = points[0];
      const gridSpacing = 50;

      ctx.strokeStyle = "#eee";
      ctx.lineWidth = 1;
      for (let x = origin.x % gridSpacing; x < canvas.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = origin.y % gridSpacing; y < canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(0, origin.y);
      ctx.lineTo(canvas.width, origin.y);
      ctx.moveTo(origin.x, 0);
      ctx.lineTo(origin.x, canvas.height);
      ctx.strokeStyle = "#ccc";
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

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
        ctx.fillStyle = i === 0 || i === 3 ? "black" : "red";
        ctx.fill();
      });

      const relPoints = getRelativeBezierPoints(...points, segments, {
        valueMax: 50,
        valueJitter: 0.3,
        intervalMs: 100,
        intervalJitter: 0.2,
        decimalPlaces: 5
      });

      setSamplePoints(relPoints);

      for (let i = 0; i < segments; i++) {
        const absX = relPoints[i].x + points[0].x;
        const absY = points[0].y - relPoints[i].y;
        ctx.beginPath();
        ctx.arc(absX, absY, 3, 0, Math.PI * 2);
        ctx.fillStyle = "green";
        ctx.fill();

        ctx.font = "10px sans-serif";
        ctx.fillStyle = "green";
        ctx.fillText(`progress=${relPoints[i].progress}, v=${relPoints[i].value}`, absX + 5, absY - 5);
      }
    }

    function onMouseDown(e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const index = points.findIndex(p => Math.hypot(p.x - mx, p.y - my) < 10);
      if (index !== -1) draggingPointRef.current = index;
    }

    function onMouseMove(e) {
      if (draggingPointRef.current !== null) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const updated = [...points];
        updated[draggingPointRef.current] = { x: mx, y: my };
        setPoints(updated);
      }
    }

    function onMouseUp() {
      draggingPointRef.current = null;
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
  }, [segments, points]);

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(samplePoints, null, 2));
  }

  function updatePoint(index, axis, value) {
    const updated = [...points];
    updated[index][axis] = parseInt(value) || 0;
    setPoints(updated);
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

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        {points.map((pt, i) => (
          <div key={i}>
            <label>P{i}: </label>
            <input
              type="number"
              value={pt.x}
              onChange={(e) => updatePoint(i, "x", e.target.value)}
              style={{ width: "60px", marginRight: "4px" }}
            />
            <input
              type="number"
              value={pt.y}
              onChange={(e) => updatePoint(i, "y", e.target.value)}
              style={{ width: "60px" }}
            />
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        id="canvas"
        width="600"
        height="400"
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
