// The ZAO's navy and gold (thezao.com tokens, same as ZAOfractal PR 39). Gold means
// action: buttons, links, active states, and the living flake. Headings stay in text color.
// Depth comes from background lightness, not shadows. Fonts by role: Syne display,
// Outfit interface, Spectral long reading, JetBrains Mono numbers and addresses.
export const c = {
  bg: '#03182F',
  elev: '#022449',
  card: '#0A2E57',
  line: '#12385F',
  rule: '#1B4470',
  ink: '#EAF0F8',
  muted: '#B4C0D2',
  dim: '#93A1B5',
  gold: '#F5C518',
};

export const f = {
  display: 'Syne_800ExtraBold',
  displayMid: 'Syne_700Bold',
  ui: 'Outfit_400Regular',
  uiMid: 'Outfit_500Medium',
  uiBold: 'Outfit_600SemiBold',
  read: 'Spectral_400Regular',
  readMid: 'Spectral_500Medium',
  readBold: 'Spectral_600SemiBold',
  readIt: 'Spectral_400Regular_Italic',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
};

export const stageColor: Record<string, string> = {
  Executed: c.ink,
  Voting: c.gold,
  Veto: c.gold,
  Executable: c.gold,
  Failed: c.dim,
  ExecutionFailed: c.dim,
  Canceled: c.dim,
};

export const LINKS = {
  frapps: 'https://zao.frapps.xyz',
  submit: 'https://zao.frapps.xyz/submitBreakout',
  discord: 'https://discord.com/invite/ACJyYQH3BE',
  site: 'https://fractal.thezao.com',
  privacy: 'https://fractal.thezao.com/privacy',
  address: (a: string) => `https://optimistic.etherscan.io/address/${a}`,
  tx: (t: string) => `https://optimistic.etherscan.io/tx/${t}`,
};
