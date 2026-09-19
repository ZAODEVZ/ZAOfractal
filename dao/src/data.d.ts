// The snapshot JSON in ../data is large; letting TypeScript infer literal types
// from it would slow the build to no benefit. Declare the modules as unknown
// and give them real shapes in src/lib/data.ts instead.
declare module '@data/summary.json' { const value: unknown; export default value; }
declare module '@data/zor-respect.json' { const value: unknown; export default value; }
declare module '@data/og-respect.json' { const value: unknown; export default value; }
declare module '@data/award-events.json' { const value: unknown; export default value; }
declare module '@data/periods.json' { const value: unknown; export default value; }
declare module '@data/orec-proposals.json' { const value: unknown; export default value; }
declare module '@data/members.json' { const value: unknown; export default value; }
