// The database stores the color name; the actual color comes from theme.css
export const COLOR_OPTIONS = ['pink', 'peach', 'yellow', 'mint', 'blue', 'lavender'];

export function colorVar(name) {
  return `var(--${COLOR_OPTIONS.includes(name) ? name : 'lavender'})`;
}
