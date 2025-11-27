import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";
import { Tenant } from "../../../../../constants/types";

export const getTenantProcedure = publicProcedure
  .input(
    z.object({
      subdomain: z.string().optional(),
      tenantId: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const { subdomain, tenantId } = input;

    if (!subdomain && !tenantId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Either subdomain or tenantId is required",
      });
    }

    const tenants = await kv.getJSON<Tenant[]>("tenants") || [];

    let tenant: Tenant | undefined;

    if (tenantId) {
      tenant = tenants.find(t => t.id === tenantId);
    } else if (subdomain) {
      tenant = tenants.find(t => t.subdomain === subdomain);
    }

    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    if (tenant.status === "suspended" || tenant.status === "canceled") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This account is ${tenant.status}. Please contact support.`,
      });
    }

    return {
      success: true,
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        subdomain: tenant.subdomain,
        status: tenant.status,
        plan: tenant.plan,
        logo: tenant.logo,
        features: tenant.features,
        settings: tenant.settings,
      },
    };
  });
