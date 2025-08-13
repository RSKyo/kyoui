import { generateId, safeClone, log } from "../utils";

function isFn(fn) {
  return typeof fn === "function";
}

export function createFolio(options = {}) {
  const FOLIO_STATUS = {
    IDLE: "idle",
    RUNNING: "running",
    PAUSED: "paused",
    STOPPED: "stopped",
  };

  const {
    duration = 0,
    repeat = 1,
    onStart = null,
    onBeforeFrame = null,
    onAfterFrame = null,
    onBeforeUpdate = null,
    onAfterUpdate = null,
    onBeforeRender = null,
    onAfterRender = null,
    onRepeat = null,
    onStop = null,
    onEnd = null,
  } = options;

  // 动画控制状态
  let status = FOLIO_STATUS.IDLE;
  let animationFrameId = null;
  let startTime = null;
  let pausedAt = null;
  let totalPaused = 0;
  let playCount = 0;

  // 图层管理
  let drawables = new Map();

  const is = {
    idle: () => status === FOLIO_STATUS.IDLE,
    running: () => status === FOLIO_STATUS.RUNNING,
    paused: () => status === FOLIO_STATUS.PAUSED,
    stopped: () => status === FOLIO_STATUS.STOPPED,
  };
  const set = {
    idle: () => (status = FOLIO_STATUS.IDLE),
    running: () => (status = FOLIO_STATUS.RUNNING),
    paused: () => (status = FOLIO_STATUS.PAUSED),
    stopped: () => (status = FOLIO_STATUS.STOPPED),
  };

  const getElapsed = (timestamp) => {
    if (!startTime) return 0;
    return timestamp - startTime - totalPaused;
  };

  const getElapsedTime = () => {
    if (!startTime) return 0;
    return performance.now() - startTime - totalPaused;
  };

  const getElapsedSeconds = () => {
    return getElapsedTime() / 1000;
  };

  const update = (elapsed) => {
    const canUpdate = onBeforeUpdate?.(elapsed) !== false;
    if (canUpdate) {
      drawables.forEach((drawable) => {
        const { id, data, updater, __index, __data } = drawable;
        if (isFn(updater)) {
          const updated = updater(elapsed, { id, data, __index, __data });
          if (updated !== undefined) drawable.data = updated;
        }
      });

      onAfterUpdate?.(elapsed);
    }
  };

  const render = (elapsed) => {
    const canRender = onBeforeRender?.(elapsed) !== false;
    if (canRender) {
      drawables.forEach((drawable) => {
        const { id, data, render, zIndex, __index, __data } = drawable;
        if (isFn(render))
          render(elapsed, { id, data, zIndex, __index, __data });
      });

      onAfterRender?.(elapsed);
    }

    onAfterFrame?.(elapsed);
  };
  const animate = (timestamp) => {
    if (!is.running()) return;
    const elapsed = getElapsed(timestamp);

    if (duration > 0 && elapsed >= (playCount + 1) * duration) {
      playCount++;
      log.debug(`Loop #${playCount}`);

      if (playCount >= repeat) {
        log.debug("Animation ended");
        onEnd?.();
        stop(false);
        return;
      } else {
        onRepeat?.();
        return (animationFrameId = requestAnimationFrame(animate));
      }
    }

    const canFrame = onBeforeFrame?.(elapsed) !== false;
    if (!canFrame) return;

    update(elapsed);
    render(elapsed);

    animationFrameId = requestAnimationFrame(animate);
  };

  const run = () => {
    if (is.running()) return;

    log.debug("Animation started.");

    if (is.idle() || is.stopped()) {
      startTime = performance.now();
      totalPaused = 0;
      onStart?.();
    }
    if (is.paused()) {
      totalPaused += performance.now() - pausedAt;
      pausedAt = null;
    }
    set.running();
    animationFrameId = requestAnimationFrame(animate);
  };

  const pause = () => {
    if (!is.running()) return;
    log.debug("Animation paused");

    set.paused();
    pausedAt = performance.now();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  };

  const stop = (manual = true) => {
    if (is.stopped() || is.idle()) return;
    if (manual) log.debug("Animation stopped");

    onStop?.();
    set.stopped();

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    startTime = null;
    pausedAt = null;
    totalPaused = 0;
    playCount = 0;
  };

  const seek = (timestamp) => {
    if (!startTime) return;
    if (duration > 0 && timestamp >= repeat * duration) {
      log.debug(
        `Seek(${timestamp}) exceeds totalDuration, stopping animation.`
      );
      stop(false);
      return;
    }

    const now = performance.now();
    totalPaused = now - startTime - timestamp;
  };

  const restart = () => {
    stop(false);
    run();
  };

  const sortDrawables = () => {
    // 异步排序处理
    setTimeout(() => {
      const sorted = [...drawables.values()].sort(
        (a, b) => a.zIndex - b.zIndex
      );
      drawables.clear();
      sorted.forEach((item, index) => {
        item.__index = index; // 加一个内部的 index
        drawables.set(item.id, item);
      });
    }, 0);
  };

  const addDrawable = (data, updater, render, { id: inputId, zIndex } = {}) => {
    const id = inputId ?? generateId("drawable");
    if (typeof zIndex !== "number") zIndex = drawables.size;

    const __data = safeClone(data);
    drawables.set(id, { id, data, updater, render, zIndex, __data });
    sortDrawables();

    return id;
  };

  const removeDrawable = (id) => {
    drawables.delete(id);
  };

  const clearDrawables = () => {
    drawables.clear();
  };

  const getDrawables = () => [...drawables.values()];

  const setDataById = (id, newData) => {
    const item = drawables.get(id);
    if (item) {
      item.data = newData;
      item.__data = safeClone(newData);
      return true;
    }
    log.warn(`No drawable found by id: ${index}`);
    return false;
  };

  const setDataAt = (index, newData) => {
    if (index < 0 || index >= drawables.size) {
      log.warn(`No drawable found at index: ${index}`);
      return false;
    }

    let i = 0;
    for (const item of drawables.values()) {
      if (i === index) {
        item.data = newData;
        item.__data = safeClone(newData);
        return true;
      }
      i++;
    }

    // 理论上不会执行到这儿
    log.warn(`No drawable found at index: ${index}`);
    return false;
  };

  const setZIndex = (id, zIndex) => {
    const item = drawables.get(id);
    if (!item) return;
    item.zIndex = zIndex;

    sortDrawables();
  };

  const folio = {
    isIdle: is.idle,
    isRunning: is.running,
    isPaused: is.paused,
    isStopped: is.stopped,
    getElapsedTime,
    getElapsedSeconds,
    update,
    render,
    run,
    pause,
    stop,
    seek,
    restart,
    addDrawable,
    removeDrawable,
    clearDrawables,
    getDrawables,
    setDataById,
    setDataAt,
    setZIndex,
  };

  return folio;
}
