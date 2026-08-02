import type { ReactNode } from 'react';
import type { Block, DeckSlide } from '../deck/types';
import { ChartRenderer } from './Chart';

interface BlockViewProps {
  block: Block;
  slide: DeckSlide;
  themeId: string;
}

function styleFrom(style: Record<string, unknown> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!style) return result;
  if (style.align) result.alignSelf = String(style.align);
  if (style.gap) result.gap = `${style.gap}px`;
  if (style.variant === 'kicker') {
    result.textTransform = 'uppercase';
    result.letterSpacing = '0.14em';
    result.fontSize = '12px';
    result.fontWeight = '600';
  } else if (style.variant === 'meta') {
    result.fontSize = '13px';
    result.opacity = '0.75';
  } else if (style.variant === 'caption') {
    result.fontSize = '13px';
    result.fontWeight = '600';
  } else if (style.variant === 'callout') {
    result.fontSize = '15px';
    result.fontStyle = 'italic';
  }
  if (style.level === 1) {
    result.fontFamily = 'var(--font-heading)';
    result.fontSize = 'clamp(34px, 4.2cqw, 52px)';
    result.lineHeight = '1.05';
    result.fontWeight = '400';
    result.letterSpacing = '-0.02em';
    result.margin = '0';
  } else if (style.level === 3) {
    result.fontFamily = 'var(--font-heading)';
    result.fontSize = '24px';
    result.lineHeight = '1.25';
    result.margin = '0';
  }
  return result;
}

function MetricBlock({ block }: BlockViewProps) {
  const content = block.content as { value?: string; label?: string; delta?: string };
  return (
    <div className="block-metric" aria-label={block.ariaLabel}>
      <div className="metric-value">{content.value ?? ''}</div>
      {content.label ? <div className="metric-label">{content.label}</div> : null}
      {content.delta ? <div className="metric-delta">{content.delta}</div> : null}
    </div>
  );
}

function BulletsBlock({ block }: BlockViewProps) {
  const items = Array.isArray(block.content) ? (block.content as string[]) : [];
  return (
    <ul className="block-bullets" aria-label={block.ariaLabel}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function ProcessBlock({ block }: BlockViewProps) {
  const content = block.content as { steps?: Array<{ title: string; detail?: string }> };
  const steps = content?.steps ?? [];
  return (
    <ol className="block-process">
      {steps.map((step, index) => (
        <li key={index} className="process-step">
          <span className="process-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="process-body">
            <span className="process-title">{step.title}</span>
            {step.detail ? <span className="process-detail">{step.detail}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CalloutBlock({ block }: BlockViewProps) {
  return <div className="block-callout" aria-label={block.ariaLabel}>{String(block.content)}</div>;
}

function CitationBlock({ block }: BlockViewProps) {
  return <div className="block-citation" aria-label={block.ariaLabel}>{String(block.content)}</div>;
}

function ImageBlock({ block }: BlockViewProps) {
  const content = block.content as { src?: string; fit?: string };
  const fit = content?.fit ?? 'cover';
  return (
    <div className="block-image">
      <img
        src={content?.src}
        alt={block.alt ?? block.ariaLabel ?? ''}
        loading="lazy"
        draggable={false}
        style={{ objectFit: fit === 'contain' ? 'contain' : 'cover' }}
      />
    </div>
  );
}

export function BlockRenderer({ block, slide, themeId }: BlockViewProps): ReactNode {
  const style = styleFrom(block.style);
  const className = `deck-block block-${block.type}`;
  switch (block.type) {
    case 'heading':
      return (
        <h2 className={className} style={style}>
          {String(block.content)}
        </h2>
      );
    case 'text':
      return (
        <p className={className} style={style}>
          {String(block.content)}
        </p>
      );
    case 'metric':
      return <MetricBlock block={block} slide={slide} themeId={themeId} />;
    case 'bullets':
      return <BulletsBlock block={block} slide={slide} themeId={themeId} />;
    case 'chart':
      return (
        <div className="block-chart" aria-label={block.ariaLabel}>
          <ChartRenderer chart={block.content as never} themeId={themeId} />
        </div>
      );
    case 'process':
      return <ProcessBlock block={block} slide={slide} themeId={themeId} />;
    case 'callout':
      return <CalloutBlock block={block} slide={slide} themeId={themeId} />;
    case 'caption':
      return <p className={className} style={style}>{String(block.content)}</p>;
    case 'citation':
      return <CitationBlock block={block} slide={slide} themeId={themeId} />;
    case 'image':
      return <ImageBlock block={block} slide={slide} themeId={themeId} />;
    default:
      return (
        <div className={`${className} block-unknown`}>
          {typeof block.content === 'string' ? block.content : JSON.stringify(block.content)}
        </div>
      );
  }
}
