/** Vercel entry point. All routes are handled by the Hono app. */
import { handle } from "hono/vercel";
import { app } from "../src/app.js";

export const config = { runtime: "nodejs" };

export const GET = handle(app);
export const POST = handle(app);
