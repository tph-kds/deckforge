import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { DeckProject } from '../deck/types';

export interface SlideStageProps {
  deck: DeckProject;
  children: (scale: number) => ReactNode;
  className?: string;
  /** Minimum usable scale (defaults to a tiny value so content never disappears). */
  minScale?: number;
  style?: CSSProperties;
}

/**
 * Measures its own available space with a ResizeObserver and derives a scale
 * that fits the deck's fixed logical canvas (16:9) inside it. The stage never
 * changes the logical slide size — it only scales a transform, so authoring
 * coordinates, type tokens, and cqw units stay stable (plan §7.1).
 */
export function SlideStage({ deck, children, className, minScale = 0.01, style }: SlideStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(() => computeScale(deck, 0, 0));

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setScale(computeScale(deck, node.clientWidth, node.clientHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [deck]);

  const guard = Math.max(minScale, scale);

  return (
    <div ref={containerRef} className={`slide-stage ${className ?? ''}`} style={style}>
      <div
        className="slide-stage-origin"
        style={{ width: deck.canvas.width * guard, height: deck.canvas.height * guard }}
      >
        {children(guard)}
      </div>
    </div>
  );
}

function computeScale(deck: DeckProject, availWidth: number, availHeight: number): number {
  if (availWidth <= 0 || availHeight <= 0) return 1;
  const canvasW = deck.canvas.width || 1920;
  const canvasH = deck.canvas.height || 1080;
  return Math.min(availWidth / canvasW, availHeight / canvasH);
}
