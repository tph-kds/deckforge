import { useCallback, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Block, DeckProject, DeckSlide, ImageBlockContent } from '../deck/types';
import type { RenderSurface } from './SlideRenderer';
import { clampFocalPoint, focalPointToCss, imageContentOf, resolveImage, resolveAsset } from '../deck/assets';
import { ChartRenderer } from './Chart';

interface BlockViewProps {
  block: Block;
  slide: DeckSlide;
  deck?: DeckProject;
  themeId: string;
  surface?: RenderSurface;
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

function ImageBlock({ block, deck }: BlockViewProps) {
  const content: ImageBlockContent = imageContentOf(block);
  const assetDeck = deck ?? { assets: [] as DeckProject['assets'] };
  const resolved = resolveImage(assetDeck, block);
  const asset = resolved.asset ?? resolveAsset(assetDeck, content.assetId);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>(
    resolved.status === 'placeholder' || resolved.status === 'failed' ? 'error' : 'loading',
  );

  const handleLoad = useCallback(() => setLoadState('loaded'), []);
  const handleError = useCallback(() => setLoadState('error'), []);

  const decorative = content.decorative === true || block.decorative === true;
  const focal = clampFocalPoint(content.focalPoint ?? asset?.focalPoint);
  const fit = content.fit ?? 'cover';
  const caption = content.caption;
  const attribution = content.attribution ?? asset?.credit;
  const rounded = content.rounded === true;
  const alt = decorative ? '' : block.alt ?? content.alt ?? asset?.alt ?? '';

  const baseStyle: CSSProperties = {
    objectPosition: focalPointToCss(focal),
    objectFit: fit === 'contain' ? 'contain' : 'cover',
  };

  if (resolved.status === 'placeholder') {
    return (
      <figure className={`block-image is-placeholder${rounded ? ' is-rounded' : ''}`}>
        <div className="image-placeholder" role="presentation" aria-hidden="true">
          <span className="image-placeholder-mark" aria-hidden="true">◍</span>
          <span className="image-placeholder-label">Image</span>
        </div>
        <ImageMeta caption={caption} attribution={attribution} />
      </figure>
    );
  }

  if (resolved.status === 'failed' || loadState === 'error' || !resolved.src) {
    return (
      <figure className={`block-image is-error${rounded ? ' is-rounded' : ''}`}>
        <div className="image-placeholder is-error" role="img" aria-label={alt || 'Image unavailable'}>
          <span className="image-placeholder-mark" aria-hidden="true">✕</span>
          <span className="image-placeholder-label">Image unavailable</span>
        </div>
        <ImageMeta caption={caption} attribution={attribution} />
      </figure>
    );
  }

  return (
    <figure className={`block-image${rounded ? ' is-rounded' : ''}`}>
      <div className={`image-frame ${loadState === 'loading' ? 'is-loading' : ''}`}>
        {loadState === 'loading' ? <div className="image-skeleton" aria-hidden="true" /> : null}
        <img
          src={resolved.src}
          alt={alt}
          loading="lazy"
          draggable={false}
          style={baseStyle}
          onLoad={handleLoad}
          onError={handleError}
          {...(decorative ? { role: 'presentation', 'aria-hidden': true } : {})}
        />
      </div>
      <ImageMeta caption={caption} attribution={attribution} />
    </figure>
  );
}

function ImageMeta({ caption, attribution }: { caption?: string; attribution?: string }) {
  if (!caption && !attribution) return null;
  return (
    <figcaption className="image-meta">
      {caption ? <span className="image-caption">{caption}</span> : null}
      {attribution ? <span className="image-attribution">{attribution}</span> : null}
    </figcaption>
  );
}

export function BlockRenderer({ block, slide, deck, themeId, surface = 'editor' }: BlockViewProps): ReactNode {
  const style = styleFrom(block.style);
  void surface;
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
          <ChartRenderer chart={block.content as never} themeId={themeId} deck={deck} block={block} />
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
      return <ImageBlock block={block} slide={slide} deck={deck} themeId={themeId} />;
    default:
      return (
        <div className={`${className} block-unknown`}>
          {typeof block.content === 'string' ? block.content : JSON.stringify(block.content)}
        </div>
      );
  }
}
