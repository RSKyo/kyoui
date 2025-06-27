"use client";
import React from "react";
import { useRef, useEffect, useState } from "react";
import Foliobar from "@/app/components/foliobar/foliobar";
import { createFolio } from "@/app/lib/folio";
// import {
//   generateWaveData,
//   generateEasingData,
//   drawWaveCurve,
//   drawEasingCurve,
// } from "@/app/viora/components/curves";

export default function RainPage() {
  const canvasRef = useRef(null);
  const folioRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  function handleRender(elapsed, { id, data, zIndex, folio }) {
    
  }

  function handleStart(folio) {
    // const data = generateEasingData(100, "easeInOutSine");
    // folio.addDrawable({data:data,render: handleRender});
  }

  useEffect(() => {
    if (!canvasRef.current) return;
    folioRef.current = createFolio(canvasRef.current, {onStart: handleStart,debug: true});
    setIsReady(true);

    return () => {
      folioRef.current.stop(false);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="w-[500px] h-[500px]"></canvas>
      {isReady && <Foliobar folio={folioRef.current} />}
    </>
  );
}
