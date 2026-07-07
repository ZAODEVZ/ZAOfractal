import { KNOWN_MEMBERS } from './constants';

export const shortAddr = (addr: string) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

export const displayName = (addr: string) =>
  KNOWN_MEMBERS[addr?.toLowerCase()] ?? shortAddr(addr);

export const formatRespect = (n: number | bigint) =>
  Number(n).toLocaleString();

export const formatDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

export const explorerLink = (addr: string) =>
  `https://optimistic.etherscan.io/address/${addr}`;
