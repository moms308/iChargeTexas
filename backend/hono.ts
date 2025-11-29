import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { kv } from "./storage";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
  credentials: true,
}));

// Log all incoming requests for debugging
app.use("*", async (c, next) => {
  console.log(`[Hono Incoming] ${c.req.method} ${c.req.path}`);
  console.log(`[Hono Incoming] Full URL: ${c.req.url}`);
  await next();
});

// Seed data function
async function seedData() {
  const employees = await kv.getJSON<any[]>("employees") || [];
  
  // Seed super admin
  if (!employees.some((e) => e.username === "admin")) {
    console.log("[Seed] Creating admin user");
    employees.push({
      id: "super_admin_001",
      employeeId: "000001",
      username: "admin",
      passwordHash: "hashed_admin123", // In real app, hash this
      role: "super_admin",
      fullName: "System Admin",
      email: "admin@rork.app",
      phone: "",
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "system",
      permissions: {
        canManageUsers: true,
        canViewReports: true,
        canHandleRequests: true,
        canCreateInvoices: true,
        canViewCustomerInfo: true,
        canDeleteData: true,
      }
    });
    
    // Also log credentials for admin
    const credentialLogs = await kv.getJSON<any[]>("credential_logs") || [];
    credentialLogs.push({
      id: "cred_admin",
      username: "admin",
      password: "admin123",
      role: "super_admin",
      createdAt: new Date().toISOString(),
      createdBy: "system",
      createdById: "system"
    });
    await kv.setJSON("credential_logs", credentialLogs);
  }

  // Seed user "elena" as requested by user
  if (!employees.some((e) => e.username === "elena")) {
    console.log("[Seed] Creating user elena");
    const elenaEmployeeId = (employees.length + 1).toString().padStart(6, '0');
    employees.push({
      id: `emp_${Date.now()}_elena`,
      employeeId: elenaEmployeeId,
      username: "elena",
      passwordHash: "hashed_bacon",
      role: "worker",
      fullName: "elena",
      email: "ichargetexas@gmail.com",
      phone: "9034520052",
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "super_admin_001",
      permissions: {
        canManageUsers: false,
        canViewReports: true,
        canHandleRequests: true,
        canCreateInvoices: true,
        canViewCustomerInfo: true,
        canDeleteData: false,
      }
    });
    
    // Log credentials for elena
    const credentialLogs = await kv.getJSON<any[]>("credential_logs") || [];
    credentialLogs.push({
      id: `cred_${Date.now()}_elena`,
      username: "elena",
      password: "bacon",
      role: "worker",
      createdAt: new Date().toISOString(),
      createdBy: "Super Admin",
      createdById: "super_admin_001"
    });
    await kv.setJSON("credential_logs", credentialLogs);
  }

  await kv.setJSON("employees", employees);
}

// Run seed on first request (lazy init)
let seedPromise: Promise<void> | null = null;
const ensureSeed = () => {
  if (!seedPromise) {
    seedPromise = seedData().catch(err => {
      console.error("[Seed Error]", err);
      seedPromise = null;
    });
  }
  return seedPromise;
};

// Middleware to ensure seed runs before requests
app.use("*", async (c, next) => {
  try {
    await ensureSeed();
  } catch (err) {
    console.error("[Seed] Failed to seed data", err);
  }
  return next();
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

console.log("[Hono] Setting up tRPC middleware");

// Handle tRPC requests at /api/trpc with both POST and GET
app.all(
  "/api/trpc/*",
  async (c, next) => {
    console.log(`[tRPC Middleware] Handling request: ${c.req.method} ${c.req.path}`);
    return trpcServer({
      router: appRouter,
      createContext,
      onError({ error, type, path, input, ctx, req }) {
        console.error("[tRPC Error]", {
          type,
          path,
          error: error.message,
          code: error.code,
          stack: error.stack,
        });
      },
    })(c, next);
  }
);

console.log("[Hono] tRPC middleware configured at /api/trpc/*");

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

app.get("/api/debug/routes", (c) => {
  const procedures = appRouter._def.procedures as any;
  const debugInfo: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    routes: {},
  };
  
  for (const [key, value] of Object.entries(procedures)) {
    if (value && typeof value === 'object' && '_def' in value) {
      const router = value as any;
      if (router._def && router._def.procedures) {
        debugInfo.routes[key] = Object.keys(router._def.procedures);
      }
    }
  }
  
  return c.json(debugInfo);
});

app.notFound((c) => {
  console.log(`[Hono 404] Route not found: ${c.req.method} ${c.req.path}`);
  return c.json({ error: "Not found", success: false, path: c.req.path }, 404);
});

export default app;
