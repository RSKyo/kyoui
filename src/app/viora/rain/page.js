"use client";
import React from "react";
import { useRef, useEffect, useState } from "react";
import { getFolio } from "@/app/viora/utils/folio";
import Playbar from "@/app/viora/components/playbar";

export default function Viora() {
  const canvasRef = useRef(null);
  const folioRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  const randomPoints = (c, w, h, createAt, lifeTime) => {
    const points = [];
    for (let i = 0; i < c; i++) {
      points.push({
        x: Math.random() * w,
        y: Math.random() * h,
        createAt: createAt,
        lifeTime: lifeTime,
      });
    }
    return points;
  };

  function generateRainData(
    totalPoints = 100,
    maxRain = 50,
    noise = 5,
    timeJitter = 200
  ) {
    const data = [];

    for (let i = 0; i < totalPoints; i++) {
      const t = i / (totalPoints - 1);

      // 雨量 = 正弦曲线 + 扰动
      const baseAmount = Math.sin(t * Math.PI) * maxRain;
      const variation = (Math.random() * 2 - 1) * noise;
      const rainAmount = Math.max(0, Math.round(baseAmount + variation));

      // 时间点扰动，单位毫秒
      const jitter = (Math.random() * 2 - 1) * timeJitter;
      const time = Math.round(i * 100 + jitter); // 假设平均每滴间隔 100ms

      data.push({
        time: time,
        amount: rainAmount,
      });
    }

    // 可选：按时间排序，避免倒序雨滴
    data.sort((a, b) => a.time - b.time);

    return data;
  }

  function getData(w, h) {
    const points = [];
    const data = generateRainData(100, 50, 5, 200);
    data.forEach((d) => {
      const newPoints = randomPoints(d.amount, w, h, d.time, 3000);
      points.push(...newPoints);
    });
    return points;
  }

  function animate(startTime, elapsed) {

    // 过滤过期点
    const points = this.data.filter((p) => elapsed - p.createAt < p.lifeTime);
    // 没有点则推出
    if (points.length == 0) {
      this.stop();
      return;
    }

    // 清空画布
    this.clear();

    // 绘制所有点
    const fillPoints = points.filter((p) => p.createAt <= elapsed);

    for (const p of fillPoints) {
      const age = elapsed - p.createAt;
      const alpha = 1 - age / p.lifeTime;

      this.drawCircle(p.x, p.y, 5, "0,0,0", alpha.toFixed(2));
    }
  }

  function preRun() {
    if (this.isIdle() || this.isStopped()) {
      this.data = getData(this.width, this.height);
    }
  }

  useEffect(() => {
    if (!canvasRef.current) return;
    folioRef.current = getFolio(canvasRef.current, animate);
    setIsReady(true);

    return () => {
      folioRef.current.stop();
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="w-[500px] h-[500px]"></canvas>
      {isReady && <Playbar folio={folioRef.current} onPreRun={preRun} />}
    </>
  );
}
