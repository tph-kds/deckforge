import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createTimerMachine, type TimerSnapshot, type TimerStatus } from './timerMachine';

export interface UseTimerResult extends TimerSnapshot {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  toggleRunning: () => void;
  isRunning: boolean;
}

const TICK_MS = 250;

/**
 * React binding over the presenter timer state machine. The machine owns the
 * elapsed math; the hook only forwards ticks and re-reads the snapshot so the
 * UI updates without disturbing accumulated time.
 */
export function useTimer(): UseTimerResult {
  const machine = useMemo(() => createTimerMachine(Date.now()), []);
  const [snapshot, setSnapshot] = useState<TimerSnapshot>(() => machine.snapshot);

  const runningRef = useRef(snapshot.status === 'running');
  runningRef.current = snapshot.status === 'running';

  useEffect(() => {
    if (!runningRef.current) return;
    const interval = window.setInterval(() => {
      machine.setNow(Date.now());
      setSnapshot(machine.snapshot);
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [machine, snapshot.status]);

  const start = useCallback(() => {
    machine.setNow(Date.now());
    machine.start();
    setSnapshot(machine.snapshot);
  }, [machine]);

  const pause = useCallback(() => {
    machine.setNow(Date.now());
    machine.pause();
    setSnapshot(machine.snapshot);
  }, [machine]);

  const resume = useCallback(() => {
    machine.setNow(Date.now());
    machine.resume();
    setSnapshot(machine.snapshot);
  }, [machine]);

  const reset = useCallback(() => {
    machine.reset();
    setSnapshot(machine.snapshot);
  }, [machine]);

  const toggleRunning = useCallback(() => {
    if (machine.snapshot.status === 'running') pause();
    else if (machine.snapshot.status === 'paused') resume();
    else start();
  }, [machine, pause, resume, start]);

  return {
    ...snapshot,
    start,
    pause,
    resume,
    reset,
    toggleRunning,
    isRunning: snapshot.status === 'running',
  };
}
