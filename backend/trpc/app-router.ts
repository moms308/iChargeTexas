import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createInvoiceProcedure } from "./routes/stripe/create-invoice/route";
import { loginProcedure } from "./routes/auth/login/route";
import { getAuditLogsProcedure } from "./routes/auth/get-audit-logs/route";
import { createEmployeeProcedure } from "./routes/auth/create-employee/route";
import { getEmployeesProcedure } from "./routes/auth/get-employees/route";
import { registerTenantProcedure } from "./routes/tenant/register/route";
import { getTenantProcedure } from "./routes/tenant/get-tenant/route";
import { listTenantsProcedure } from "./routes/tenant/list-tenants/route";
import { updateTenantProcedure } from "./routes/tenant/update-tenant/route";
import { createSubscriptionProcedure } from "./routes/billing/create-subscription/route";
import { cancelSubscriptionProcedure } from "./routes/billing/cancel-subscription/route";
import { getTenantUsageProcedure } from "./routes/billing/get-usage/route";
import { calculateDistanceProcedure } from "./routes/requests/calculate-distance/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  stripe: createTRPCRouter({
    createInvoice: createInvoiceProcedure,
  }),
  auth: createTRPCRouter({
    login: loginProcedure,
    getAuditLogs: getAuditLogsProcedure,
    createEmployee: createEmployeeProcedure,
    getEmployees: getEmployeesProcedure,
  }),
  tenant: createTRPCRouter({
    register: registerTenantProcedure,
    getTenant: getTenantProcedure,
    listTenants: listTenantsProcedure,
    updateTenant: updateTenantProcedure,
  }),
  billing: createTRPCRouter({
    createSubscription: createSubscriptionProcedure,
    cancelSubscription: cancelSubscriptionProcedure,
    getUsage: getTenantUsageProcedure,
  }),
  requests: createTRPCRouter({
    calculateDistance: calculateDistanceProcedure,
  }),
});

export type AppRouter = typeof appRouter;
