export interface Theme {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  accentDim: string;
  accentGlow: string;
  /** Second accent colour — every theme carries two, shown as a duotone bar on theme cards. */
  accent2: string;
  accent2Dim: string;
  accent2Glow: string;
  blobs: [string, string, string, string, string, string];
}

function dim(hex: string) {
  return hexToRgba(hex, 0.5);
}
function glow(hex: string) {
  return hexToRgba(hex, 0.2);
}
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const raw: Array<Omit<Theme, 'accentDim' | 'accentGlow' | 'accent2Dim' | 'accent2Glow'>> = [
  {
    id: 'spectre',
    name: 'SPECTRE',
    tagline: 'Emerald surveillance',
    accent: '#10b981',
    accent2: '#38bdf8',
    blobs: ['#4a148c', '#1e3a8a', '#881337', '#4a148c', '#b45309', '#0f9d58'],
  },
  {
    id: 'neonova',
    name: 'NEONOVA',
    tagline: 'Electric grid pulse',
    accent: '#00d9ff',
    accent2: '#f472b6',
    blobs: ['#0c4a6e', '#164e63', '#1e3a8a', '#0c4a6e', '#0369a1', '#06b6d4'],
  },
  {
    id: 'voidrunner',
    name: 'VOIDRUNNER',
    tagline: 'Deep space violet',
    accent: '#a78bfa',
    accent2: '#22d3ee',
    blobs: ['#4c1d95', '#2e1065', '#3b0764', '#4c1d95', '#6d28d9', '#7c3aed'],
  },
  {
    id: 'aurorex',
    name: 'AUROREX',
    tagline: 'Coral system breach',
    accent: '#fb7185',
    accent2: '#fbbf24',
    blobs: ['#881337', '#4c0519', '#7f1d1d', '#881337', '#9f1239', '#e11d48'],
  },
  {
    id: 'goldcore',
    name: 'GOLDCORE',
    tagline: 'Sovereign amber protocol',
    accent: '#fbbf24',
    accent2: '#f97316',
    blobs: ['#78350f', '#451a03', '#713f12', '#78350f', '#92400e', '#b45309'],
  },
  {
    id: 'axiom',
    name: 'AXIOM',
    tagline: 'Silver monochrome logic',
    accent: '#94a3b8',
    accent2: '#38bdf8',
    blobs: ['#1e293b', '#0f172a', '#334155', '#1e293b', '#475569', '#334155'],
  },
  {
    id: 'helix',
    name: 'HELIX',
    tagline: 'Teal genomic cipher',
    accent: '#2dd4bf',
    accent2: '#a3e635',
    blobs: ['#134e4a', '#042f2e', '#0f766e', '#134e4a', '#0d9488', '#0f766e'],
  },
  {
    id: 'phantom',
    name: 'PHANTOM',
    tagline: 'Indigo ghost signal',
    accent: '#818cf8',
    accent2: '#e879f9',
    blobs: ['#1e1b4b', '#312e81', '#3730a3', '#1e1b4b', '#1d4ed8', '#4338ca'],
  },
  {
    id: 'crimsontide',
    name: 'CRIMSONTIDE',
    tagline: 'Wartime red override',
    accent: '#ef4444',
    accent2: '#fb923c',
    blobs: ['#7f1d1d', '#450a0a', '#7c2d12', '#7f1d1d', '#991b1b', '#c2410c'],
  },
  {
    id: 'lumenfrost',
    name: 'LUMENFROST',
    tagline: 'Arctic clean-room glass',
    accent: '#7dd3fc',
    accent2: '#c4b5fd',
    blobs: ['#0c4a6e', '#082f49', '#1e3a5f', '#0c4a6e', '#075985', '#5b21b6'],
  },
  {
    id: 'verdantcore',
    name: 'VERDANTCORE',
    tagline: 'Overgrown reactor bloom',
    accent: '#4ade80',
    accent2: '#facc15',
    blobs: ['#14532d', '#052e16', '#365314', '#14532d', '#166534', '#3f6212'],
  },
  {
    id: 'solflare',
    name: 'SOLFLARE',
    tagline: 'Dying star transmission',
    accent: '#fb923c',
    accent2: '#f43f5e',
    blobs: ['#7c2d12', '#431407', '#78350f', '#7c2d12', '#9a3412', '#9f1239'],
  },
];

export const THEMES: Theme[] = raw.map(t => ({
  ...t,
  accentDim: dim(t.accent),
  accentGlow: glow(t.accent),
  accent2Dim: dim(t.accent2),
  accent2Glow: glow(t.accent2),
}));

export const DEFAULT_THEME_ID = 'spectre';

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
