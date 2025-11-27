import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";
import { Tenant } from "../../../../../constants/types";

export const createSubscriptionProcedure = protectedProcedure
  .input(
    z.object({
      tenantId: z.string(),
      plan: z.enum(["starter", "professional", "enterprise"]),
      billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
      paymentMethodId: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const allUsers = await kv.getJSON<any[]>("employees") || [];
    const user = allUsers.find(u => u.id === ctx.userId);

    if (!user || user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only super admins can create subscriptions",
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

    const pricingMap = {
      starter: { monthly: 49, yearly: 490 },
      professional: { monthly: 149, yearly: 1490 },
      enterprise: { monthly: 499, yearly: 4990 },
    };

    const amount = pricingMap[input.plan][input.billingInterval];
    const now = new Date();
    const subscriptionEndsAt = new Date(
      input.billingInterval === "monthly"
        ? now.setMonth(now.getMonth() + 1)
        : now.setFullYear(now.getFullYear() + 1)
    ).toISOString();

    tenant.status = "active";
    tenant.plan = input.plan;
    tenant.subscriptionEndsAt = subscriptionEndsAt;
    tenant.billing = {
      customerId: `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastPaymentDate: new Date().toISOString(),
      nextPaymentDate: subscriptionEndsAt,
      amount,
    };
    tenant.updatedAt = new Date().toISOString();

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

    tenants[tenantIndex] = tenant;
    await kv.setJSON("tenants", tenants);

    console.log(`[Subscription] Created ${input.plan} subscription for tenant ${input.tenantId}`);

    return {
      success: true,
      subscription: {
        tenantId: tenant.id,
        plan: tenant.plan,
        status: tenant.status,
        amount,
        billingInterval: input.billingInterval,
        subscriptionEndsAt,
      },
    };
  });
