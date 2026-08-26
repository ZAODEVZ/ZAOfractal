/** Local dev server: `npm run dev`. Vercel uses api/index.ts instead. */
import { serve } from "@hono/node-server";
import { app } from "./app.js";

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`frapp-gh listening on http://localhost:${port}`);
