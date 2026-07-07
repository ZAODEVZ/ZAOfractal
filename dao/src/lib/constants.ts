// ZAO Fractal on-chain addresses (OP Mainnet)
export const ZAO_CONTRACTS = {
  OREC: '0xcB05F9254765CA521F7698e61E0A6CA6456Be532',
  OG_RESPECT: '0x34cE89baA7E4a4B00E17F7E4C0cb97105C216957',
  ZOR_RESPECT: '0x9885CCeEf7E8371Bf8d6f2413723D25917E7445c',
  HATS: '0x3bc1A0Ad72417f2d411118085256fC53CBdDd137',
} as const;

export const ORNODE_URL = 'https://zao-ornode.frapps.xyz';
export const FRAPPS_URL = 'https://zao.frapps.xyz';
export const CHAIN_ID = 10; // OP Mainnet

export const ETHERSCAN = 'https://optimistic.etherscan.io';

// Known member display names (expand from Discord bot CSV)
export const KNOWN_MEMBERS: Record<string, string> = {
  // Add wallet → name mappings here
  // '0x...': 'Zaal',
};

export const FIBONACCI = [55, 34, 21, 13, 8, 5] as const;
export const ZAO_MULTIPLIER = 2; // ZAO uses 2× Fibonacci
export const ZAO_FIBONACCI = FIBONACCI.map((n) => n * ZAO_MULTIPLIER) as unknown as number[];
