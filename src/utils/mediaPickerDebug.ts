/** Dev-only logs for file picker / upload flows */
export function logMediaPicker(step: string, detail?: unknown) {
  if (!import.meta.env.DEV) return;
  if (detail !== undefined) console.log(`[media-picker] ${step}`, detail);
  else console.log(`[media-picker] ${step}`);
}
