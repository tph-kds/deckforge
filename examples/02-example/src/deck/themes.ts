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
  chartPalette: ['#2B2118', '#B45309', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'soft',
  motionStyle: 'cinematic',
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
  chartPalette: ['#111827', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'technical',
  motionStyle: 'precise',
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
  chartPalette: ['#0F172A', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'soft',
  motionStyle: 'cinematic',
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
  chartPalette: ['#1F2937', '#F97316', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'sharp',
  motionStyle: 'subtle',
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
  chartPalette: ['#18181B', '#71717A', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'],
  shapeLanguage: 'editorial',
  motionStyle: 'snappy',
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
};

const THEMES: ThemeDef[] = [cream, oceanic, research, warm, carbon, monoInk, greenfield];

const THEME_INDEX = new Map<string, ThemeDef>(THEMES.map((theme) => [theme.id, theme]));

export function getTheme(id: string): ThemeDef {
  return THEME_INDEX.get(id) ?? cream;
}

export function listThemes(): ThemeDef[] {
  return THEMES;
}
