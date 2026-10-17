const shades = (v) =>
  Object.fromEntries([300, 400, 500, 600, 700].map((n) => [n, `rgb(var(${v}) / <alpha-value>)`]));

export const statusColors = {
  emerald: shades("--st-success"),
  green: shades("--st-success"),
  red: shades("--st-danger"),
  amber: shades("--st-warning"),
  sky: shades("--st-info"),
};

export const accentColors = {
  accent: "rgb(var(--skin-accent) / <alpha-value>)",
  "accent-hover": "rgb(var(--skin-accent-hover) / <alpha-value>)",
  "accent-text": "rgb(var(--skin-accent-text) / <alpha-value>)",
  "on-accent": "rgb(var(--skin-on-accent) / <alpha-value>)",
  header: "rgb(var(--skin-header) / <alpha-value>)",
  neutral: "rgb(var(--skin-neutral) / <alpha-value>)",
  "neutral-hover": "rgb(var(--skin-neutral-hover) / <alpha-value>)",
};
