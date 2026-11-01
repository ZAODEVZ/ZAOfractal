#!/usr/bin/env node
// Draws every icon and splash from one source: the hexaflake on the site's brand
// colors. Run with sharp available (site/node_modules has it): npm run icons
// Output in assets/ is committed, so builds do not need this script.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'assets');
mkdirSync(OUT, { recursive: true });
const sharp = createRequire(join(HERE, '..', '..', 'site', 'package.json'))('sharp');

function cells(r, depth, x = 0, y = 0) {
  if (depth === 0) return [{ x, y, r }];
  const ch = r / 3;
  const out = cells(ch, depth - 1, x, y);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    out.push(...cells(ch, depth - 1, x + Math.cos(a) * ch * 2, y + Math.sin(a) * ch * 2));
  }
  return out;
}
function hex({ x, y, r }, inset = 0.9) {
  const p = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    p.push(`${(x + Math.cos(a) * r * inset).toFixed(2)} ${(y + Math.sin(a) * r * inset).toFixed(2)}`);
  }
  return `M${p.join('L')}Z`;
}
const BG = '#03182F';
const flakePath = (radius, depth) => cells(radius, depth).map((c) => hex(c)).join('');
const gradient = (radius) =>
  `<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${radius}"><stop offset="0" stop-color="#FFE27A"/><stop offset=".5" stop-color="#F5C518"/><stop offset="1" stop-color="#C4940C"/></radialGradient></defs>`;

function svg(size, radius, { bg = BG, fill = 'url(#g)', depth = 2 } = {}) {
  const rect = bg ? `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" fill="${bg}"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-size / 2} ${-size / 2} ${size} ${size}">${gradient(radius)}${rect}<path d="${flakePath(radius, depth)}" fill="${fill}"/></svg>`,
  );
}
const png = (name, input, opts = {}) => {
  const img = sharp(input);
  return (opts.flatten ? img.flatten({ background: BG }) : img).png().toFile(join(OUT, name));
};

await png('icon.png', svg(1024, 390), { flatten: true }); // iOS: no transparency allowed
await png('adaptive-icon.png', svg(1024, 280, { bg: null })); // Android keeps a safe zone
await png('adaptive-monochrome.png', svg(1024, 280, { bg: null, fill: '#ffffff' }));
await png('notification-icon.png', svg(192, 84, { bg: null, fill: '#ffffff', depth: 1 }));
await png('splash-icon.png', svg(1024, 400, { bg: null }));
await png('favicon.png', svg(96, 42, { depth: 1 }));
writeFileSync(join(OUT, 'mark.svg'), svg(1024, 390));
console.log('wrote', OUT);
