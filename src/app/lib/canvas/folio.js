import { generateId } from "@/app/lib/utils/common";
import { log } from "@/app/lib/utils/logger";

const FOLIO_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  PAUSED: "paused",
  STOPPED: "stopped",
};

export function createFolio(options = {}) {
  const {
    duration = 0,
    repeat = 1,
    onStart = null,
    onFrame = null,
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
  let updaters = new Map();
  let renders = new Map();

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

  function run() {
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
  }

  function pause() {
    if (!is.running()) return;
    log.debug("Animation paused");

    set.paused();
    pausedAt = performance.now();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  }

  function stop(manual = true) {
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
  }

  function seek(timestamp) {
    if (!startTime) return;

    const now = performance.now();
    totalPaused = now - startTime - timestamp;
  }

  function restart() {
    stop(false);
    run();
  }

  const getElapsed = (timestamp) => {
    if (!startTime) return 0;
    return timestamp - startTime - totalPaused;
  };

  function animate(timestamp) {
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

    updaters.forEach((entry) => {
      const { id, data, updater } = entry;
      const updated = updater(elapsed, id, data);
      if (updated) entry.data = updated;
    });

    renders.forEach(({ id, data, render, zIndex }) => {
      render(elapsed, id, data, zIndex);
    });

    onFrame?.(elapsed);
    animationFrameId = requestAnimationFrame(animate);
  }

  function addDrawable(data, updater, render, zIndex) {
    const id = generateId("drawable");
    updaters.set(id, { id, data, updater });

    if (typeof zIndex !== "number") zIndex = renders.size;
    renders.set(id, { id, data, render, zIndex });
    const orderRenders = [...renders.values()].sort(
      (a, b) => a.zIndex - b.zIndex
    );
    renders.clear();
    orderRenders.forEach((item) => {
      renders.set(item.id, item);
    });

    return id;
  }

  function removeDrawable(id) {
    updaters.delete(id);
    renders.delete(id);
  }

  function clearDrawables() {
    updaters.clear();
    renders.clear();
  }

  function getElapsedTime() {
    if (!startTime) return 0;
    return performance.now() - startTime - totalPaused;
  }

  const folio = {
    isIdle: is.idle,
    isRunning: is.running,
    isPaused: is.paused,
    isStopped: is.stopped,
    run,
    pause,
    stop,
    seek,
    restart,
    addDrawable,
    removeDrawable,
    clearDrawables,
    getElapsedTime,
  };

  return folio;
}
