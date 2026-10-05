export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = units[0] ?? 'KB';

  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index] ?? unit;
  }

  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${unit}`;
}

export function formatSavings(inputBytes: number, outputBytes: number): string {
  if (inputBytes <= 0) return '—';
  const percent = ((inputBytes - outputBytes) / inputBytes) * 100;
  const rounded = Math.round(Math.abs(percent));

  if (rounded === 0) return 'Same size';
  return percent > 0 ? `${rounded}% smaller` : `${rounded}% larger`;
}
