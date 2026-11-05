// Member view: browser side. The gate keeps the site simple for newcomers; it
// is not secrecy (the repo and every page are public). A member is anyone whose
// wallet holds ZAO Respect, checked by POST /api/member (api/member.js).
//
// The visitor's own wallet signs a short message. No key, relayer or
// transaction exists on our side.

export const STORAGE_KEY = 'zao-member'; // also read by public/member-early.js
export const MEMBER_DAYS = 7;

export interface MemberRecord {
  address: string;
  member: true;
  expires: number;
}

export function readMember(): MemberRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const r = raw ? JSON.parse(raw) : null;
    if (r && r.member === true && typeof r.expires === 'number' && r.expires > Date.now()) return r;
  } catch {}
  return null;
}

export function saveMember(address: string): void {
  const rec: MemberRecord = { address, member: true, expires: Date.now() + MEMBER_DAYS * 864e5 };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {}
}

export function clearMember(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** Same text as buildMemberMessage in api/_lib/member-core.js. Keep in step. */
export function buildMemberMessage(host: string, address: string, nonce: string, issuedAt: string): string {
  return [
    `${host} asks you to confirm this wallet for ZAO member view.`,
    '',
    'This only reads your ZAO Respect balance. It is free and sends no transaction.',
    '',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** UTF-8 text to 0x hex, the form personal_sign expects. */
export function toHex(text: string): string {
  return '0x' + Array.from(new TextEncoder().encode(text), (b) => b.toString(16).padStart(2, '0')).join('');
}
