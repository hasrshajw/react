import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

/* Schedy theme: Astryx neutral structure + the app's EXISTING colours (see src/index.css).
   Tuples are [light, dark]. The app is light-only (<Theme mode="light">), so the dark values simply keep neutral's
   dark defaults and are not visible today. Source of each value is noted so it can be traced back to the old CSS vars. */
export const schedyTheme = defineTheme({
  name: 'schedy',
  extends: neutralTheme,
  tokens: {
    /* Brand (old --primary / --primary-light) */
    '--color-accent': ['#673de6', '#8564eb'],
    '--color-on-accent': ['#ffffff', '#ffffff'],
    '--color-accent-muted': ['#ebe4ff', '#673de63f'],
    '--color-text-accent': ['#673de6', '#b39ef3'],
    '--color-icon-accent': ['#673de6', '#b39ef3'],

    /* Surfaces (old --page-bg, --white) */
    '--color-background-body': ['#f2f3f6', '#111112'],
    '--color-background-surface': ['#ffffff', '#1f1f22'],
    '--color-background-card': ['#ffffff', '#1f1f22'],
    '--color-background-popover': ['#ffffff', '#28292c'],

    /* Text and icons (old --dark, --gray-dark, --gray) */
    '--color-text-primary': ['#1d1e20', '#dfe2e5'],
    '--color-text-secondary': ['#6d7081', '#aaafb5'],
    '--color-icon-primary': ['#1d1e20', '#dfe2e5'],
    '--color-icon-secondary': ['#6d7081', '#aaafb5'],
    '--color-background-inverted': ['#1d1e20', '#ffffff'],

    /* Borders (old --gray-border) */
    '--color-border-emphasized': ['#dadce0', '#494d53'],

    /* Status (old --success*, --danger*, --warning*, --info-light) */
    '--color-success': ['#00b090', '#00b090'],
    '--color-success-muted': ['#def4f0', '#00b0903f'],
    '--color-text-success': ['#008361', '#3ccfae'],
    '--color-on-success-muted': ['#008361', '#3ccfae'],
    '--color-error': ['#fc5185', '#fc5185'],
    '--color-on-error': ['#ffffff', '#0a1317'],
    '--color-error-muted': ['#ffe8ef', '#fc51853f'],
    '--color-text-error': ['#d63163', '#ff7aa0'],
    '--color-on-error-muted': ['#d63163', '#ff7aa0'],
    '--color-warning': ['#ffcd35', '#ffcd35'],
    '--color-warning-muted': ['#fff8e2', '#ffcd353f'],
    /* old warning-dark #fea419 is too light for text on white; this is the darker amber used for text only */
    '--color-text-warning': ['#9a6700', '#ffcd35'],
    '--color-on-warning-muted': ['#9a6700', '#ffcd35'],
    '--color-info-muted': ['#e0f8ff', '#0082fb3f'],

    /* Fonts (old body font stack; keeps Telugu support) */
    '--font-family-body': '"DM Sans", "Noto Sans Telugu", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    '--font-family-heading': '"DM Sans", "Noto Sans Telugu", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});
