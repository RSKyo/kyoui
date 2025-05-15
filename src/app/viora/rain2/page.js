"use client";
import React from "react";
import { useRef, useEffect, useState } from "react";
import { getFolio } from "@/app/viora/components/folio";
import Playbar from "@/app/viora/components/playbar";

class Raindrop {
  constructor(width, height) {
    this.reset(width, height);
  }

  reset(width, height) {
    this.width = width;
    this.height = height;
    this.xBase = Math.random() * width; // 横向中心点
    this.y = Math.random() * -height;   // 初始随机高度
    this.speed = 12 + Math.random() * 3;
    this.amplitude = 5 + Math.random() * 5; // 横向漂移幅度（小）
    this.frequency = 0.005 + Math.random() * 0.005; // 横向频率（低）
    this.phase = Math.random() * Math.PI * 2; // 起始偏移
    this.wind = 0.1; // 正值代表往右吹，负值代表往左吹
    this.beginTime = 0;
  }

  update(time) {
    
    if (this.y > this.height) {
      this.reset(this.width,this.height);
      this.beginTime = time;
    }
    this.y += this.speed;

    // 正弦漂移：随时间慢慢偏移
    this.x = this.xBase + Math.sin(time * this.frequency + this.phase) * this.amplitude;
    this.x += (time - this.beginTime) * this.wind;
    // console.log(`${this.x},${this.y},${this.height}`);
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y + 10);
    ctx.strokeStyle = 'rgba(174,194,224,0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

export default function Rain2() {
  const canvasRef = useRef(null);
  const folioRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const wind = 5.5; // 正值代表往右吹，负值代表往左吹

  function animate(startTime, elapsed) {

    this.data.forEach(drop => {
      drop.update(elapsed, this.height);
      drop.draw(this.ctx);
    });
    
  }

  function preRun() {
    if (this.isIdle() || this.isStopped()) {
      this.data = Array.from({ length: 1 }, () => new Raindrop(this.width, this.height));
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
