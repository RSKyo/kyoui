"use client";
import React from "react";
import { useRef, useEffect } from "react";
import { getFolio } from "@/app/viora/utils/folio";

export default function Viora() {
  const canvasRef = useRef(null);
  const folioRef = useRef(null);
  const pointsRef = useRef([]);

  const randomPoints = (c, w, h,createAt,lifeTime) => {
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

  function generateRainData(totalPoints = 100, maxRain = 50, noise = 5, timeJitter = 200) {
    const data = [];
    const points = [];
  
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
  
  

  function animate (timestamp)  {
    const folio = folioRef.current;

    // 过滤过期点
    const points = pointsRef.current.filter(
      (p) =>  folio.getElapsed(timestamp)  - p.createAt < p.lifeTime
    );
    // 没有点则推出
    if(points.length===0){
      stop();
      return;
    }

    // 清空画布
    folio.clear();

    // 绘制所有点
    const fillPoints = points.filter(
      (p) =>  p.createAt <= folio.getElapsed(timestamp) 
    );
    
    for (const p of fillPoints) {
      const age = folio.getElapsed(timestamp) - p.createAt;
      const alpha = 1 - age / p.lifeTime;

      folio.drawCircle(p.x,p.y,5,"0,0,0",alpha.toFixed(2));
    }
    folio.animationFrameId = requestAnimationFrame(animate);
  };

  function initData  (){
    const folio = folioRef.current;
    const points = pointsRef.current;
    points.length=0;
    const data = generateRainData(100,50,5,200);
    data.forEach(d=>{
      const newPoints = randomPoints(
        d.amount,
        folio.width,
        folio.height,
        d.time,
        3000,
      );
      points.push(...newPoints);
    });
  };
 function run  ()  {
    const folio = folioRef.current;
    if(folio.isIdle() || folio.isStopped()) initData();
    folio.run(animate);
  };

  function pause  ()  {
    const folio = folioRef.current;
    folio.pause();
  };
  function stop  () {
    const folio = folioRef.current;
    folio.stop();
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    folioRef.current = getFolio(canvasRef.current);
    run();

    return () => {
      stop();
    };
  }, []);

  return <>
    <canvas ref={canvasRef} className="w-[500px] h-[500px]"></canvas>
    <button onClick={run} className="px-4 py-1 bg-blue-500 text-white rounded">
          Run
        </button>
        <button onClick={pause} className="px-4 py-1 bg-green-500 text-white rounded">
        Pause
        </button>
        <button onClick={stop} className="px-4 py-1 bg-red-500 text-white rounded">
        Stop
        </button>
    </>;
}
