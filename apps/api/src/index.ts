import { serve } from "@hono/node-server";
import { app } from "./app";

const port = Number(process.env.PORT || 3001);

console.log(`🏥 caresync API running on http://localhost:${port}`);
console.log(`📖 API Docs: http://localhost:${port}/api/docs`);

serve({ fetch: app.fetch, port });
