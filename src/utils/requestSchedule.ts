export type RequestPriority = 'emergency' | 'urgent' | 'today' | 'flexible';
export type PreferredDateMode = 'today' | 'tomorrow' | 'pick';
export type TimeWindow = 'morning' | 'afternoon' | 'evening' | '';

export type RequestScheduleInput = {
  priority: RequestPriority;
  preferredDateMode: PreferredDateMode;
  preferredDateIso: string;
  preferredTimeWindow: TimeWindow;
  preferredTimeSpecific: string;
};

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function resolvePreferredDateIso(input: RequestScheduleInput): string | null {
  if (input.priority === 'emergency' || input.priority === 'urgent') {
    return todayIso();
  }
  if (input.preferredDateMode === 'today') return todayIso();
  if (input.preferredDateMode === 'tomorrow') return tomorrowIso();
  if (input.preferredDateMode === 'pick' && input.preferredDateIso) return input.preferredDateIso;
  return null;
}

/** Legacy schedule token used by matching + job cards */
export function buildJobDateLabel(input: RequestScheduleInput): string {
  if (input.priority === 'emergency') return '__now';
  if (input.priority === 'urgent') return '__today';
  if (input.priority === 'today') return '__soon';
  if (input.priority === 'flexible') return '__flexible';
  return '__flexible';
}

export function jobUrgencyFromPriority(priority: RequestPriority): 'high' | 'normal' {
  return priority === 'emergency' || priority === 'urgent' ? 'high' : 'normal';
}

export function isScheduleStepComplete(input: RequestScheduleInput): boolean {
  if (input.priority === 'emergency') return true;
  const dateOk =
    input.priority === 'urgent' ||
    input.preferredDateMode === 'today' ||
    input.preferredDateMode === 'tomorrow' ||
    (input.preferredDateMode === 'pick' && Boolean(input.preferredDateIso));
  const timeOk = Boolean(input.preferredTimeWindow) || Boolean(input.preferredTimeSpecific.trim());
  return dateOk && timeOk;
}
