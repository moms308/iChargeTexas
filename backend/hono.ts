import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

// Log all incoming requests for debugging
app.use("*", async (c, next) => {
  console.log(`[Hono Incoming] ${c.req.method} ${c.req.path}`);
  await next();
});

app.onError((err, c) => {
  console.error("[Hono Error]", err);
  return c.json(
    {
      error: err.message || "Internal server error",
      success: false,
    },
    500
  );
});

// Handle /api/trpc requests
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError({ error, type, path, input, ctx, req }) {
      console.error("[tRPC Error /api/trpc]", {
        type,
        path,
        error: error.message,
        code: error.code,
      });
    },
  })
);

// Handle /trpc requests (fallback)
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError({ error, type, path, input, ctx, req }) {
      console.error("[tRPC Error /trpc]", {
        type,
        path,
        error: error.message,
        code: error.code,
      });
    },
  })
);

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Service Management API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

app.get("/api/health", (c) => {
  return c.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
  });
});

app.notFound((c) => {
  console.log(`[Hono 404] Route not found: ${c.req.method} ${c.req.path}`);
  return c.json({ error: "Not found", success: false, path: c.req.path }, 404);
});

export default app;
