"use client";
import React from "react";
import { useRef, useEffect, useState } from "react";
import Playbar from "@/app/viora/components/playbar";
import { getFolio } from "@/app/viora/components/folio";
import {
  generateWaveData,
  generateEasingData,
} from "@/app/viora/components/rain";

export default function RainPage() {
  const canvasRef = useRef(null);
  const folioRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  function animate(elapsed) {
    
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

  function preRun() {
    if (this.isIdle() || this.isStopped()) {
      this.data = generateEasingData(100, "easeInOutSine");
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
