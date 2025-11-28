import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createInvoiceProcedure } from "./routes/stripe/create-invoice/route";
import { loginProcedure } from "./routes/auth/login/route";
import { getAuditLogsProcedure } from "./routes/auth/get-audit-logs/route";
import { createUserProcedure } from "./routes/auth/create-user/route";
import { getCredentialLogsProcedure } from "./routes/auth/get-credentials/route";
import { getEmployeesProcedure } from "./routes/auth/get-employees/route";
import { updateEmployeeProcedure } from "./routes/auth/update-employee/route";
import { registerTenantProcedure } from "./routes/tenant/register/route";
import { getTenantProcedure } from "./routes/tenant/get-tenant/route";
import { listTenantsProcedure } from "./routes/tenant/list-tenants/route";
import { updateTenantProcedure } from "./routes/tenant/update-tenant/route";
import { createSubscriptionProcedure } from "./routes/billing/create-subscription/route";
import { cancelSubscriptionProcedure } from "./routes/billing/cancel-subscription/route";
import { getTenantUsageProcedure } from "./routes/billing/get-usage/route";
import { calculateDistanceProcedure } from "./routes/requests/calculate-distance/route";
import { getMileageLogsProcedure } from "./routes/requests/get-mileage-logs/route";
import { calculateRoundTripProcedure } from "./routes/requests/calculate-round-trip/route";

const exampleRouter = createTRPCRouter({
  hi: hiRoute,
});

const stripeRouter = createTRPCRouter({
  createInvoice: createInvoiceProcedure,
});

const authRouter = createTRPCRouter({
  login: loginProcedure,
  getAuditLogs: getAuditLogsProcedure,
  createEmployee: createUserProcedure,
  getCredentialLogs: getCredentialLogsProcedure,
  getEmployees: getEmployeesProcedure,
  updateEmployee: updateEmployeeProcedure,
});

const tenantRouter = createTRPCRouter({
  register: registerTenantProcedure,
  getTenant: getTenantProcedure,
  listTenants: listTenantsProcedure,
  updateTenant: updateTenantProcedure,
});

const billingRouter = createTRPCRouter({
  createSubscription: createSubscriptionProcedure,
  cancelSubscription: cancelSubscriptionProcedure,
  getUsage: getTenantUsageProcedure,
});

const requestsRouter = createTRPCRouter({
  calculateDistance: calculateDistanceProcedure,
  getMileageLogs: getMileageLogsProcedure,
  calculateRoundTrip: calculateRoundTripProcedure,
});

console.log("[Router] example procedures:", Object.keys(exampleRouter._def.procedures));
console.log("[Router] auth procedures:", Object.keys(authRouter._def.procedures));

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  stripe: stripeRouter,
  auth: authRouter,
  tenant: tenantRouter,
  billing: billingRouter,
  requests: requestsRouter,
});

console.log("[Router] namespaces registered:", Object.keys(appRouter._def.procedures));
console.log("[Router] Full app router structure:", JSON.stringify({
  example: Object.keys(exampleRouter._def.procedures),
  auth: Object.keys(authRouter._def.procedures),
  stripe: Object.keys(stripeRouter._def.procedures),
  tenant: Object.keys(tenantRouter._def.procedures),
  billing: Object.keys(billingRouter._def.procedures),
  requests: Object.keys(requestsRouter._def.procedures),
}, null, 2));

export type AppRouter = typeof appRouter;
