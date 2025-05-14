export default function Playbar({ folio, onPreRun, onRun, onPause, onStop }) {
  const handleRun = () => {
    if (!folio) return;
    if (typeof onPreRun === "function") {
      const boundOnPreRun = onPreRun.bind(folio);
      boundOnPreRun();
    }
    if (typeof onRun === "function") {
      const boundOnRun = onRun.bind(folio);
      boundOnRun();
    } else {
      folio.run();
    }
  };

  const handlePause = () => {
    if (!folio) return;
    if (typeof onPause === "function") {
      const boundOnPause = onPause.bind(folio);
      boundOnPause();
    } else {
      folio.pause();
    }
  };

  const handleStop = () => {
    if (!folio) return;
    if (typeof onStop === "function") {
      const boundOnStop = onStop.bind(folio);
      boundOnStop();
    } else {
      folio.stop();
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={handleRun}
        className="px-4 py-1 bg-blue-500 text-white rounded"
      >
        Run
      </button>
      <button
        onClick={handlePause}
        className="px-4 py-1 bg-green-500 text-white rounded"
      >
        Pause
      </button>
      <button
        onClick={handleStop}
        className="px-4 py-1 bg-red-500 text-white rounded"
      >
        Stop
      </button>
    </div>
  );
}
