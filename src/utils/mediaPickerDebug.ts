/** Temporary debug logs for file picker / upload (always on until flow is stable). */
export function logMediaPicker(step: string, detail?: unknown) {
  if (detail !== undefined) console.log(`[media-picker] ${step}`, detail);
  else console.log(`[media-picker] ${step}`);
}
