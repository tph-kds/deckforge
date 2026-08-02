export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerSnapshot {
  status: TimerStatus;
  elapsedMs: number;
}

export interface TimerMachine {
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  setNow(now: number): void;
  get snapshot(): TimerSnapshot;
}

/**
 * A stable presenter timer that accumulates elapsed time across
 * pause/resume and must never reset when unrelated UI toggles
 * (blackout, speaker view, notes, grid, focus loss) occur.
 *
 * Mirrors the plan's TimerState contract:
 *   { status: 'idle'|'running'|'paused', elapsedBeforeStart, startedAt }
 */
export function createTimerMachine(initialNow: number = Date.now()): TimerMachine {
  let status: TimerStatus = 'idle';
  let elapsedBeforeStart = 0;
  let startedAt: number | null = null;
  let lastNow = initialNow;

  function elapsedSinceStart(): number {
    return startedAt == null ? 0 : Math.max(0, lastNow - startedAt);
  }

  return {
    start(): void {
      if (status !== 'idle') return;
      status = 'running';
      elapsedBeforeStart = 0;
      startedAt = lastNow;
    },
    pause(): void {
      if (status !== 'running') return;
      elapsedBeforeStart += elapsedSinceStart();
      startedAt = null;
      status = 'paused';
    },
    resume(): void {
      if (status !== 'paused') return;
      startedAt = lastNow;
      status = 'running';
    },
    reset(): void {
      status = 'idle';
      elapsedBeforeStart = 0;
      startedAt = null;
    },
    setNow(now: number): void {
      lastNow = now;
    },
    get snapshot(): TimerSnapshot {
      const elapsedMs =
        status === 'running' && startedAt != null
          ? elapsedBeforeStart + elapsedSinceStart()
          : elapsedBeforeStart;
      return { status, elapsedMs };
    },
  };
}

export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
