import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createInvoiceProcedure } from "./routes/stripe/create-invoice/route";
import { loginProcedure } from "./routes/auth/login/route";
import { getAuditLogsProcedure } from "./routes/auth/get-audit-logs/route";
import {
  createEmployeeProcedure,
  getEmployeesProcedure,
  updateEmployeeProcedure,
  getCredentialLogsProcedure,
} from "./routes/users/employees";
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
import { createTestJobProcedure } from "./routes/requests/create-test-job/route";
import { acceptJobProcedure } from "./routes/requests/accept-job/route";
import { postMileageLogProcedure } from "./routes/requests/post-mileage-log/route";

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
    getCredentialLogs: getCredentialLogsProcedure,
    getEmployees: getEmployeesProcedure,
    updateEmployee: updateEmployeeProcedure,
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
    getMileageLogs: getMileageLogsProcedure,
    calculateRoundTrip: calculateRoundTripProcedure,
    createTestJob: createTestJobProcedure,
    acceptJob: acceptJobProcedure,
    postMileageLog: postMileageLogProcedure,
  }),
});

console.log("[Router] App router initialized successfully");

export type AppRouter = typeof appRouter;
