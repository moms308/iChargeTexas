import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";
import { Tenant } from "../../../../../constants/types";

export const listTenantsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const allUsers = await kv.getJSON<any[]>("employees") || [];
    const user = allUsers.find(u => u.id === ctx.userId);

    if (!user || user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can list all tenants",
      });
    }

    const tenants = await kv.getJSON<Tenant[]>("tenants") || [];

    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const users = await kv.getJSON<any[]>(`tenant:${tenant.id}:users`) || [];
        const requests = await kv.getJSON<any[]>(`tenant:${tenant.id}:requests`) || [];

        return {
          ...tenant,
          stats: {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.isActive).length,
            totalRequests: requests.length,
            pendingRequests: requests.filter(r => r.status === "pending").length,
          },
        };
      })
    );

    return {
      success: true,
      tenants: tenantsWithStats,
    };
  });
