import type { ThemeDef } from './types';

const cream: ThemeDef = {
  id: 'editorial-cream',
  name: 'Editorial Cream',
  category: 'Editorial',
  description: 'Magazine-like narrative presentation with cream background',
  tokens: {
    background: '#FAF3E7',
    foreground: '#0F172A',
    primary: '#2B2118',
    secondary: '#B45309',
    surface: '#F1EADF',
    muted: '#64748B',
    surfaceElevated: '#EAE3D8',
    border: '#D7D1C7',
    focus: '#B45309',
  },
  typography: { headingFont: 'Libre Baskerville', bodyFont: 'Inter', codeFont: 'JetBrains Mono' },
  chartPalette: ['#2B2118', '#B45309', '#15803D', '#C2410C', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'soft',
  motionStyle: 'cinematic',
  scrollbar: {
    default: 'minimal-thin',
    grid: 'gradient-slim',
    'speaker-notes': 'gradient-slim',
    presenter: 'none',
    'slide-stage': 'none',
  },
  gradients: {
    hero: 'radial-gradient(120% 120% at 80% 0%, #FBE9D2 0%, #FAF3E7 48%, #F4E7D5 100%)',
    emphasis: 'linear-gradient(135deg, #F0E3D0 0%, #F6ECDC 100%)',
    progress: 'linear-gradient(90deg, #B45309 0%, #D97706 100%)',
    highlight: 'linear-gradient(180deg, transparent 62%, #F3D9B0 62%)',
    accent: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)',
  },
};

const oceanic: ThemeDef = {
  id: 'oceanic-blueprint',
  name: 'Oceanic Blueprint',
  category: 'Architecture',
  description: 'Blueprint grid over ocean blues',
  tokens: {
    background: '#FFFFFF',
    foreground: '#0F172A',
    primary: '#111827',
    secondary: '#06B6D4',
    surface: '#F6F6F6',
    muted: '#64748B',
    surfaceElevated: '#EEEEEE',
    border: '#DBDBDB',
    focus: '#06B6D4',
  },
  typography: { headingFont: 'Manrope', bodyFont: 'Inter', codeFont: 'JetBrains Mono' },
  chartPalette: ['#111827', '#0891B2', '#15803D', '#D97706', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'technical',
  motionStyle: 'precise',
  scrollbar: {
    default: 'gradient-slim',
    'slide-list': 'minimal-thin',
    presenter: 'none',
    'slide-stage': 'none',
  },
  gradients: {
    hero: 'radial-gradient(120% 120% at 70% 0%, #E0F7FA 0%, #FFFFFF 55%, #F0FBFC 100%)',
    emphasis: 'linear-gradient(135deg, #E8F8FA 0%, #F7FEFF 100%)',
    progress: 'linear-gradient(90deg, #0891B2 0%, #06B6D4 100%)',
    highlight: 'linear-gradient(180deg, transparent 62%, #C9F2F7 62%)',
    accent: 'linear-gradient(135deg, #0891B2 0%, #06B6D4 100%)',
  },
};

const research: ThemeDef = {
  id: 'research-lab',
  name: 'Research Lab',
  category: 'Research',
  description: 'Academic but modern research slides with precise grids',
  tokens: {
    background: '#F8FAFC',
    foreground: '#0F172A',
    primary: '#0F172A',
    secondary: '#0EA5E9',
    surface: '#EFF1F3',
    muted: '#64748B',
    surfaceElevated: '#E8EAEC',
    border: '#D5D7D9',
    focus: '#0EA5E9',
  },
  typography: { headingFont: 'IBM Plex Sans', bodyFont: 'Inter', codeFont: 'JetBrains Mono' },
  chartPalette: ['#0F172A', '#0284C7', '#15803D', '#D97706', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'soft',
  motionStyle: 'cinematic',
  scrollbar: {
    default: 'minimal-thin',
    'speaker-notes': 'gradient-slim',
    presenter: 'none',
    'slide-stage': 'none',
  },
  gradients: {
    hero: 'radial-gradient(120% 120% at 75% 0%, #E0F2FE 0%, #F8FAFC 55%, #EDF5FC 100%)',
    emphasis: 'linear-gradient(135deg, #EAF3FB 0%, #F6FAFD 100%)',
    progress: 'linear-gradient(90deg, #0284C7 0%, #0EA5E9 100%)',
    highlight: 'linear-gradient(180deg, transparent 62%, #CFE7F8 62%)',
    accent: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
  },
};

const warm: ThemeDef = {
  id: 'warm-product',
  name: 'Warm Product',
  category: 'Product',
  description: 'Soft warm SaaS product storytelling',
  tokens: {
    background: '#FFF7ED',
    foreground: '#0F172A',
    primary: '#1F2937',
    secondary: '#F97316',
    surface: '#F6EEE5',
    muted: '#64748B',
    surfaceElevated: '#EEE7DE',
    border: '#DBD4CC',
    focus: '#F97316',
  },
  typography: { headingFont: 'Manrope', bodyFont: 'Inter', codeFont: 'JetBrains Mono' },
  chartPalette: ['#1F2937', '#C2410C', '#15803D', '#D97706', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'sharp',
  motionStyle: 'subtle',
  scrollbar: {
    default: 'gradient-slim',
    presenter: 'none',
    'slide-stage': 'none',
  },
  gradients: {
    hero: 'radial-gradient(120% 120% at 70% 0%, #FFEDD5 0%, #FFF7ED 55%, #FFF0E0 100%)',
    emphasis: 'linear-gradient(135deg, #FDEAD7 0%, #FFF5EC 100%)',
    progress: 'linear-gradient(90deg, #EA580C 0%, #F97316 100%)',
    highlight: 'linear-gradient(180deg, transparent 62%, #FFDFC2 62%)',
    accent: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
  },
};

const carbon: ThemeDef = {
  id: 'carbon-command',
  name: 'Carbon Command',
  category: 'Engineering',
  description: 'Carbon-black command center for deep technical demos',
  tokens: {
    background: '#0A0A0A',
    foreground: '#F8FAFC',
    primary: '#84CC16',
    secondary: '#38BDF8',
    surface: '#222222',
    muted: '#A7B0C0',
    surfaceElevated: '#343434',
    border: '#474747',
    focus: '#38BDF8',
  },
  typography: { headingFont: 'JetBrains Mono', bodyFont: 'Inter', codeFont: 'JetBrains Mono' },
  chartPalette: ['#84CC16', '#38BDF8', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'technical',
  motionStyle: 'precise',
  scrollbar: {
    default: 'gradient-slim',
    'slide-list': 'minimal-thin',
    presenter: 'none',
    'slide-stage': 'none',
  },
  gradients: {
    hero: 'radial-gradient(120% 120% at 75% 0%, #1E293B 0%, #0A0A0A 55%, #111827 100%)',
    emphasis: 'linear-gradient(135deg, #27272A 0%, #1A1A1A 100%)',
    progress: 'linear-gradient(90deg, #65A30D 0%, #84CC16 100%)',
    highlight: 'linear-gradient(180deg, transparent 62%, #2E3B2E 62%)',
    accent: 'linear-gradient(135deg, #65A30D 0%, #84CC16 100%)',
  },
};

const monoInk: ThemeDef = {
  id: 'mono-ink',
  name: 'Mono Ink',
  category: 'Minimal',
  description: 'Black-and-white consultant elegance',
  tokens: {
    background: '#FAFAFA',
    foreground: '#0F172A',
    primary: '#18181B',
    secondary: '#71717A',
    surface: '#F1F1F1',
    muted: '#64748B',
    surfaceElevated: '#EAEAEA',
    border: '#D7D7D7',
    focus: '#71717A',
  },
  typography: { headingFont: 'Sora', bodyFont: 'Inter', codeFont: 'JetBrains Mono' },
  chartPalette: ['#18181B', '#71717A', '#15803D', '#D97706', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'editorial',
  motionStyle: 'snappy',
  scrollbar: {
    default: 'mono-ink',
    presenter: 'none',
    'slide-stage': 'none',
  },
  gradients: {
    hero: 'radial-gradient(120% 120% at 80% 0%, #F4F4F5 0%, #FAFAFA 55%, #F0F0F0 100%)',
    emphasis: 'linear-gradient(135deg, #ECECEC 0%, #F7F7F7 100%)',
    progress: 'linear-gradient(90deg, #3F3F46 0%, #71717A 100%)',
    highlight: 'linear-gradient(180deg, transparent 62%, #DDDDE1 62%)',
    accent: 'linear-gradient(135deg, #3F3F46 0%, #71717A 100%)',
  },
};

const greenfield: ThemeDef = {
  id: 'greenfield-growth',
  name: 'Greenfield Growth',
  category: 'Climate',
  description: 'Green innovation and sustainability',
  tokens: {
    background: '#022C22',
    foreground: '#F8FAFC',
    primary: '#34D399',
    secondary: '#A7F3D0',
    surface: '#1B4138',
    muted: '#A7B0C0',
    surfaceElevated: '#2D5048',
    border: '#416159',
    focus: '#A7F3D0',
  },
  typography: { headingFont: 'IBM Plex Sans', bodyFont: 'Inter', codeFont: 'JetBrains Mono' },
  chartPalette: ['#34D399', '#A7F3D0', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'soft',
  motionStyle: 'cinematic',
  scrollbar: {
    default: 'gradient-slim',
    presenter: 'none',
    'slide-stage': 'none',
  },
  gradients: {
    hero: 'radial-gradient(120% 120% at 75% 0%, #0B3B2E 0%, #022C22 55%, #063528 100%)',
    emphasis: 'linear-gradient(135deg, #1B4138 0%, #12342C 100%)',
    progress: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
    highlight: 'linear-gradient(180deg, transparent 62%, #1E4A3D 62%)',
    accent: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  },
};

const THEMES: ThemeDef[] = [cream, oceanic, research, warm, carbon, monoInk, greenfield];

const THEME_INDEX = new Map<string, ThemeDef>(THEMES.map((theme) => [theme.id, theme]));

export function getTheme(id: string): ThemeDef {
  return THEME_INDEX.get(id) ?? cream;
}

export function listThemes(): ThemeDef[] {
  return THEMES;
}
