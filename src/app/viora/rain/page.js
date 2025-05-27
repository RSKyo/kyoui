"use client";
import React from "react";
import { useRef, useEffect, useState } from "react";
import Playbar from "@/app/viora/components/playbar";
import { createFolio } from "@/app/viora/components/folio";
import {
  generateWaveData,
  generateEasingData,
} from "@/app/viora/components/curves";

export default function RainPage() {
  const canvasRef = useRef(null);
  const folioRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  function handleRender(elapsed) {
    
    this.drawWaveCurve();
    this.drawEasingCurve();
    return false;

    //     // 过滤过期点
    //     this.points = this.points.filter((p) => elapsed - p.createAt < p.lifeTime);
    //     // 没有点则推出
    //     if (this.points.length == 0) {
    //       this.stop();
    //       return;
    //     }

    //     // 清空画布
    //     this.clear();

    //     // 获取已经存在的点
    //     const points = this.points.filter((p) => p.createAt <= elapsed);
    //     for (const p of points) {
    //       const age = elapsed - p.createAt;
    //       const progress = age / p.lifeTime;
    //       const radius = p.radius + progress * p.radius * p.maxGrowthRatio;

    //       const alpha = 1 - progress;
    // this.drawSineCurve(this.data);
    //       this.drawCircle(p.x, p.y, radius, p.color, alpha);
    //     }
  }

  function handleStart(folio) {
    this.data = generateEasingData(100, "easeInOutSine");
    folio.addDrawable("easeInOutSine",this.data,handleRender);
  }

  useEffect(() => {
    if (!canvasRef.current) return;
    folioRef.current = createFolio(canvasRef.current, {onStart: handleStart});
    setIsReady(true);

    return () => {
      folioRef.current.stop(false);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="w-[500px] h-[500px]"></canvas>
      {isReady && <Playbar folio={folioRef.current} onPreRun={preRun} />}
    </>
  );
}
