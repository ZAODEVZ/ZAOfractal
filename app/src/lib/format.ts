// Display helpers. V1 shows short wallet addresses, never member names.
export function shortAddress(a: string): string {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

/** A stable number for an address, used to draw its glyph. */
export function addressSeed(a: string): number {
  let h = 0;
  for (const c of a.toLowerCase().slice(2)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function num(n: number): string {
  return n.toLocaleString('en-US');
}

const STAGE_LABEL: Record<string, string> = {
  Executed: 'Executed',
  ExecutionFailed: 'Execution failed',
  Failed: 'Did not pass',
  Executable: 'Ready to execute',
  Voting: 'Voting',
  Veto: 'Veto window',
  Canceled: 'Canceled',
};

export function stageLabel(stage: string): string {
  return STAGE_LABEL[stage] ?? stage;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Date unknown';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatMeetingLocal(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMeetingNy(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
