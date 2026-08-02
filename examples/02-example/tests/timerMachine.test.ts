import { describe, expect, it } from 'vitest';
import { createTimerMachine, formatElapsed } from '../src/presenter/timerMachine';

describe('presenter timer state machine', () => {
  it('starts idle at zero and starts running from the current anchor', () => {
    const timer = createTimerMachine(1_000);
    expect(timer.snapshot).toEqual({ status: 'idle', elapsedMs: 0 });

    timer.setNow(5_000);
    timer.start();
    expect(timer.snapshot.status).toBe('running');
    expect(timer.snapshot.elapsedMs).toBe(0);

    timer.setNow(8_000);
    expect(timer.snapshot.elapsedMs).toBe(3_000);
  });

  it('accumulates elapsed time across pause and resume', () => {
    const timer = createTimerMachine(0);
    timer.start();
    timer.setNow(10_000);
    timer.pause();
    expect(timer.snapshot).toEqual({ status: 'paused', elapsedMs: 10_000 });

    timer.resume();
    timer.setNow(15_000);
    expect(timer.snapshot.elapsedMs).toBe(15_000);

    timer.pause();
    timer.setNow(99_000);
    expect(timer.snapshot.elapsedMs).toBe(15_000);
  });

  it('resets to idle and clears elapsed time', () => {
    const timer = createTimerMachine(0);
    timer.start();
    timer.setNow(30_000);
    timer.reset();
    expect(timer.snapshot).toEqual({ status: 'idle', elapsedMs: 0 });

    timer.start();
    expect(timer.snapshot.status).toBe('running');
  });

  it('start is a no-op when already running or paused', () => {
    const timer = createTimerMachine(0);
    timer.start();
    timer.setNow(5_000);
    timer.start();
    expect(timer.snapshot.elapsedMs).toBe(5_000);

    timer.pause();
    timer.setNow(7_000);
    timer.start();
    expect(timer.snapshot.elapsedMs).toBe(5_000);
  });

  it('does not reset when unrelated UI events occur (blackout/speaker/grid)', () => {
    const timer = createTimerMachine(0);
    timer.start();
    timer.setNow(12_000);
    timer.pause();
    timer.setNow(14_000);
    // A blackout/speaker/grid toggle must never call reset().
    expect(timer.snapshot.elapsedMs).toBe(12_000);
    timer.resume();
    timer.setNow(16_000);
    expect(timer.snapshot.elapsedMs).toBe(14_000);
  });

  it('clamps negative elapsed time to zero', () => {
    const timer = createTimerMachine(10_000);
    timer.start();
    timer.setNow(4_000);
    expect(timer.snapshot.elapsedMs).toBe(0);
  });
});

describe('formatElapsed', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(59_000)).toBe('0:59');
    expect(formatElapsed(61_000)).toBe('1:01');
    expect(formatElapsed(600_000)).toBe('10:00');
  });

  it('floors sub-second time', () => {
    expect(formatElapsed(1_999)).toBe('0:01');
  });
});
