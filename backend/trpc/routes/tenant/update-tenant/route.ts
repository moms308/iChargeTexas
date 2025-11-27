import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";
import { Tenant } from "../../../../../constants/types";

export const updateTenantProcedure = protectedProcedure
  .input(
    z.object({
      tenantId: z.string(),
      status: z.enum(["trial", "active", "suspended", "canceled"]).optional(),
      plan: z.enum(["starter", "professional", "enterprise"]).optional(),
      subscriptionEndsAt: z.string().optional(),
      logo: z.string().optional(),
      settings: z.object({
        timeZone: z.string().optional(),
        currency: z.string().optional(),
        language: z.string().optional(),
      }).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const allUsers = await kv.getJSON<any[]>("employees") || [];
    const user = allUsers.find(u => u.id === ctx.userId);

    if (!user || user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can update tenants",
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

    if (input.status) tenant.status = input.status;
    if (input.plan) {
      tenant.plan = input.plan;

      const planFeatures = {
        starter: {
          maxUsers: 5,
          maxRequests: 100,
          customBranding: false,
          apiAccess: false,
          advancedReporting: false,
        },
        professional: {
          maxUsers: 20,
          maxRequests: 500,
          customBranding: true,
          apiAccess: true,
          advancedReporting: false,
        },
        enterprise: {
          maxUsers: 100,
          maxRequests: -1,
          customBranding: true,
          apiAccess: true,
          advancedReporting: true,
        },
      };

      tenant.features = planFeatures[input.plan];
    }
    if (input.subscriptionEndsAt) tenant.subscriptionEndsAt = input.subscriptionEndsAt;
    if (input.logo) tenant.logo = input.logo;
    if (input.settings) {
      tenant.settings = {
        timeZone: input.settings.timeZone || tenant.settings?.timeZone || "America/Chicago",
        currency: input.settings.currency || tenant.settings?.currency || "USD",
        language: input.settings.language || tenant.settings?.language || "en",
      };
    }

    tenant.updatedAt = new Date().toISOString();

    tenants[tenantIndex] = tenant;
    await kv.setJSON("tenants", tenants);

    console.log(`[Tenant Update] Tenant ${input.tenantId} updated by ${ctx.userId}`);

    return {
      success: true,
      tenant,
    };
  });
