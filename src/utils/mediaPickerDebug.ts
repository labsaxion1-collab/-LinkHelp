/** Dev-only logs for file picker / upload flows */
export function logMediaPicker(step: string, detail?: unknown) {
  if (import.meta.env.DEV) {
    if (detail !== undefined) console.log(step, detail);
    else console.log(step);
  }
}
