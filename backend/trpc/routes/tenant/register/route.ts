import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";
import { Tenant, SystemUser } from "../../../../../constants/types";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSubdomain(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 30);
}

async function hashPassword(password: string): Promise<string> {
  return `hashed_${password}`;
}

export const registerTenantProcedure = publicProcedure
  .input(
    z.object({
      businessName: z.string().min(2).max(100),
      contactName: z.string().min(2).max(100),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      adminUsername: z.string().min(3).max(50),
      adminPassword: z.string().min(8),
      plan: z.enum(["starter", "professional", "enterprise"]).default("starter"),
    })
  )
  .mutation(async ({ input }) => {
    console.log(`[Tenant Registration] Starting registration for: ${input.businessName}`);

    const existingTenants = await kv.getJSON<Tenant[]>("tenants") || [];
    const baseSubdomain = generateSubdomain(input.businessName);
    let subdomain = baseSubdomain;
    let counter = 1;

    while (existingTenants.some(t => t.subdomain === subdomain)) {
      subdomain = `${baseSubdomain}-${counter}`;
      counter++;
    }

    const emailExists = existingTenants.some(
      t => t.contactEmail.toLowerCase() === input.contactEmail.toLowerCase()
    );

    if (emailExists) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An account with this email already exists",
      });
    }

    const now = new Date().toISOString();
    const trialDays = 14;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

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

    const tenant: Tenant = {
      id: generateId("tenant"),
      businessName: input.businessName,
      subdomain,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      contactName: input.contactName,
      status: "trial",
      plan: input.plan,
      createdAt: now,
      updatedAt: now,
      trialEndsAt,
      features: planFeatures[input.plan],
      settings: {
        timeZone: "America/Chicago",
        currency: "USD",
        language: "en",
      },
    };

    existingTenants.push(tenant);
    await kv.setJSON("tenants", existingTenants);

    const adminUser: SystemUser = {
      id: generateId("user"),
      username: input.adminUsername,
      password: await hashPassword(input.adminPassword),
      role: "admin",
      fullName: input.contactName,
      email: input.contactEmail,
      phone: input.contactPhone,
      isActive: true,
      createdAt: now,
      createdBy: "system",
      tenantId: tenant.id,
      permissions: {
        canManageUsers: true,
        canViewReports: true,
        canHandleRequests: true,
        canCreateInvoices: true,
        canViewCustomerInfo: true,
        canDeleteData: true,
      },
    };

    const tenantKey = `tenant:${tenant.id}:users`;
    const tenantUsers = await kv.getJSON<SystemUser[]>(tenantKey) || [];
    tenantUsers.push(adminUser);
    await kv.setJSON(tenantKey, tenantUsers);

    await kv.setJSON(`tenant:${tenant.id}:requests`, []);
    await kv.setJSON(`tenant:${tenant.id}:archived_requests`, []);

    console.log(`[Tenant Registration] Success - Tenant ID: ${tenant.id}, Subdomain: ${subdomain}`);

    return {
      success: true,
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        subdomain: tenant.subdomain,
        status: tenant.status,
        plan: tenant.plan,
        trialEndsAt: tenant.trialEndsAt,
      },
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
      },
    };
  });
