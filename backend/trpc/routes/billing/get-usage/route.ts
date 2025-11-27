import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";
import { Tenant, TenantUsage } from "../../../../../constants/types";

export const getTenantUsageProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    if (!tenantId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Tenant ID is required",
      });
    }

    const tenants = await kv.getJSON<Tenant[]>("tenants") || [];
    const tenant = tenants.find(t => t.id === tenantId);

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    const users = await kv.getJSON<any[]>(`tenant:${tenantId}:users`) || [];
    const requests = await kv.getJSON<any[]>(`tenant:${tenantId}:requests`) || [];

    const activeUsers = users.filter(u => u.isActive).length;
    const totalRequests = requests.length;

    const currentMonth = new Date().toISOString().substring(0, 7);

    const usage: TenantUsage = {
      tenantId,
      month: currentMonth,
      activeUsers,
      totalRequests,
      storageUsed: 0,
      apiCalls: 0,
    };

    const withinLimits = {
      users: tenant.features.maxUsers === -1 || activeUsers <= tenant.features.maxUsers,
      requests: tenant.features.maxRequests === -1 || totalRequests <= tenant.features.maxRequests,
    };

    return {
      success: true,
      usage,
      limits: tenant.features,
      withinLimits,
      tenant: {
        plan: tenant.plan,
        status: tenant.status,
        subscriptionEndsAt: tenant.subscriptionEndsAt,
      },
    };
  });
