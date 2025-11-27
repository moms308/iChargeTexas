import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import { kv } from "../storage";
import superjson from "superjson";

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get("authorization");
  const userId = authHeader?.replace("Bearer ", "") || null;
  const tenantIdHeader = opts.req.headers.get("x-tenant-id") || null;

  return {
    req: opts.req,
    kv,
    userId,
    tenantId: tenantIdHeader,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    console.log("[tRPC] Unauthenticated request to protected procedure");
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

const isTenantScoped = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    console.log("[tRPC] Unauthenticated request to tenant-scoped procedure");
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  if (!ctx.tenantId) {
    console.log("[tRPC] Missing tenant ID in request");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Tenant ID is required",
    });
  }

  const allUsers = await kv.getJSON<any[]>("employees") || [];
  const superAdmin = allUsers.find(u => u.id === ctx.userId && u.role === "super_admin");

  if (!superAdmin) {
    const tenantUsers = await kv.getJSON<any[]>(`tenant:${ctx.tenantId}:users`) || [];
    const user = tenantUsers.find(u => u.id === ctx.userId);

    if (!user) {
      console.log(`[tRPC] User ${ctx.userId} not found in tenant ${ctx.tenantId}`);
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this tenant",
      });
    }
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
export const tenantProcedure = t.procedure.use(isTenantScoped);
