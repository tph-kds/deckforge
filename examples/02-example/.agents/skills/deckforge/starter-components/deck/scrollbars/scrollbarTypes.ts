export type ScrollSurface =
  | 'app-page'
  | 'slide-list'
  | 'inspector'
  | 'grid'
  | 'speaker-notes'
  | 'modal'
  | 'asset-library'
  | 'theme-library'
  | 'presenter'
  | 'slide-stage';

export type ScrollbarStyleId =
  | 'gradient-slim'
  | 'aurora-glow'
  | 'minimal-thin'
  | 'neon-edge'
  | 'mono-ink'
  | 'high-contrast'
  | 'system-native'
  | 'none';

export type ScrollAxis = 'vertical' | 'horizontal' | 'both';

export interface ScrollbarThemeMapping {
  default: ScrollbarStyleId;
  'app-page'?: ScrollbarStyleId;
  'slide-list'?: ScrollbarStyleId;
  inspector?: ScrollbarStyleId;
  grid?: ScrollbarStyleId;
  'speaker-notes'?: ScrollbarStyleId;
  modal?: ScrollbarStyleId;
  'asset-library'?: ScrollbarStyleId;
  'theme-library'?: ScrollbarStyleId;
  presenter: 'none';
  'slide-stage': 'none';
}
