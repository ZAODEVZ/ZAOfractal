// The hexaflake: a hexagon made of seven hexagons, repeated. It is the app's mark
// because it is the game itself: six people in a room, rooms making up a fractal.
export interface Cell {
  x: number;
  y: number;
  r: number;
}

/** All leaf cells of a hexaflake of the given depth, centered on 0,0. */
export function hexaflake(radius: number, depth: number): Cell[] {
  if (depth === 0) return [{ x: 0, y: 0, r: radius }];
  const child = radius / 3;
  const out: Cell[] = [];
  const add = (dx: number, dy: number) => {
    for (const c of hexaflake(child, depth - 1)) out.push({ x: c.x + dx, y: c.y + dy, r: c.r });
  };
  add(0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    add(Math.cos(a) * child * 2, Math.sin(a) * child * 2);
  }
  return out;
}

/** Cells ordered from the outer edge inward, sweeping by angle within each band. */
export function outsideIn(cells: Cell[]): Cell[] {
  const band = (c: Cell) => Math.round(Math.hypot(c.x, c.y) / (c.r * 2));
  const angle = (c: Cell) => Math.atan2(c.y, c.x);
  return cells.slice().sort((a, b) => band(b) - band(a) || angle(a) - angle(b));
}

export function hexPath(c: Cell, inset = 0.86): string {
  const r = c.r * inset;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy side up, rotated 30 degrees from the children's axis, so cells tile.
    const a = (Math.PI / 3) * i + Math.PI / 6;
    pts.push(`${(c.x + Math.cos(a) * r).toFixed(2)} ${(c.y + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

export function pathOf(cells: Cell[], inset?: number): string {
  return cells.map((c) => hexPath(c, inset)).join('');
}
