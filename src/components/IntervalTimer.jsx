import { useEffect, useState } from "react";

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function IntervalTimer({ workSec = 30, restSec = 20 }) {
  const [phase, setPhase] = useState("work");
  const [remaining, setRemaining] = useState(workSec);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setPhase("work");
    setRemaining(workSec);
    setRunning(false);
  }, [workSec, restSec]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        if (phase === "work") {
          setPhase("rest");
          return restSec;
        }
        setPhase("work");
        return workSec;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, workSec, restSec]);

  const onReset = () => {
    setPhase("work");
    setRemaining(workSec);
    setRunning(false);
  };

  return (
    <div className="timer">
      <div className={`timer-display ${phase}`}>
        <span className="timer-phase">
          {phase === "work" ? "Trabajo" : "Descanso"}
        </span>
        <strong>{formatTime(remaining)}</strong>
      </div>
      <div className="timer-controls">
        <button
          type="button"
          className="tiny primary-btn"
          onClick={() => setRunning((v) => !v)}
        >
          {running ? "Pausar" : "Iniciar"}
        </button>
        <button type="button" className="tiny" onClick={onReset}>
          Reiniciar
        </button>
      </div>
    </div>
  );
}
