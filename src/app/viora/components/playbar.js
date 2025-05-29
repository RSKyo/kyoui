export default function Playbar({folio}) {
  const handleRun = () => {
    if (!folio) return;
    folio.run();
  };

  const handlePause = () => {
    if (!folio) return;
    folio.pause();
  };

  const handleStop = () => {
    if (!folio) return;
    folio.stop();
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
