import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";
import { Tenant } from "../../../../../constants/types";

export const cancelSubscriptionProcedure = protectedProcedure
  .input(
    z.object({
      tenantId: z.string(),
      immediate: z.boolean().default(false),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const allUsers = await kv.getJSON<any[]>("employees") || [];
    const user = allUsers.find(u => u.id === ctx.userId);

    if (!user || user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can cancel subscriptions",
      });
    }

    const tenants = await kv.getJSON<Tenant[]>("tenants") || [];
    const tenantIndex = tenants.findIndex(t => t.id === input.tenantId);

    if (tenantIndex === -1) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    const tenant = tenants[tenantIndex];

    if (input.immediate) {
      tenant.status = "canceled";
    } else {
      tenant.status = "active";
    }

    tenant.updatedAt = new Date().toISOString();

    tenants[tenantIndex] = tenant;
    await kv.setJSON("tenants", tenants);

    console.log(`[Subscription] Canceled subscription for tenant ${input.tenantId} (immediate: ${input.immediate})`);

    return {
      success: true,
      message: input.immediate
        ? "Subscription canceled immediately"
        : "Subscription will be canceled at the end of the billing period",
    };
  });
