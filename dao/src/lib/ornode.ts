// Runtime validation for ornode API responses.
//
// The ornode is an external service, so its payload shape is never trusted.
// Every entry is validated and coerced here; anything malformed is dropped
// rather than rendered, so bad or hostile data cannot surface as governance
// numbers, and a wrong shape cannot crash the tab (e.g. sorting on a missing
// `respect`). Callers get back a clean, typed array or an empty one.

export interface Member {
  address: string;
  respect: number;
  name?: string;
}

export interface Proposal {
  id: string;
  title: string;
  status: 'active' | 'passed' | 'vetoed' | 'executed';
  yesWeight: number;
  noWeight: number;
  createTime: number;
  memo?: string;
}

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const PROPOSAL_STATUSES = ['active', 'passed', 'vetoed', 'executed'] as const;

const isFiniteNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined;

// Accept either a bare array or a { holders | proposals } wrapper object.
function unwrap(data: unknown, key: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const inner = (data as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

export function parseMembers(data: unknown): Member[] {
  return unwrap(data, 'holders').flatMap((raw): Member[] => {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const address = asString(r.address);
    if (!address || !ADDR_RE.test(address)) return [];
    if (!isFiniteNum(r.respect) || r.respect < 0) return [];
    const name = asString(r.name);
    return [{ address, respect: r.respect, name: name || undefined }];
  });
}

export function parseProposals(data: unknown): Proposal[] {
  return unwrap(data, 'proposals').flatMap((raw): Proposal[] => {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const id = asString(r.id);
    if (!id) return [];
    const status = asString(r.status);
    if (!status || !(PROPOSAL_STATUSES as readonly string[]).includes(status)) return [];
    if (!isFiniteNum(r.yesWeight) || r.yesWeight < 0) return [];
    if (!isFiniteNum(r.noWeight) || r.noWeight < 0) return [];
    const title = asString(r.title) ?? '';
    const memo = asString(r.memo);
    return [{
      id,
      title,
      status: status as Proposal['status'],
      yesWeight: r.yesWeight,
      noWeight: r.noWeight,
      createTime: isFiniteNum(r.createTime) ? r.createTime : 0,
      memo: memo || undefined,
    }];
  });
}
