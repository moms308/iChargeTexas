import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";

const SUPER_ADMIN = {
  id: "super_admin_001",
  username: "Moms308",
  passwordHash: "hashed_Wowcows123!123!",
  role: "super_admin" as const,
  fullName: "Super Administrator",
  email: "admin@ichargetexas.com",
  phone: "",
  isActive: true,
  createdAt: new Date().toISOString(),
  permissions: {
    canManageUsers: true,
    canViewReports: true,
    canHandleRequests: true,
    canCreateInvoices: true,
    canViewCustomerInfo: true,
    canDeleteData: true,
  },
};

interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  action: "login_success" | "login_failed" | "logout" | "user_created" | "user_updated" | "password_changed";
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  userId?: string;
}

async function logAuditEntry(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
  const auditEntry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const existingLogs = await kv.getJSON<AuditLogEntry[]>("audit_logs") || [];
  existingLogs.push(auditEntry);
  
  const last1000Logs = existingLogs.slice(-1000);
  await kv.setJSON("audit_logs", last1000Logs);
  
  console.log(`[Audit Log] ${auditEntry.action} - ${auditEntry.username} at ${auditEntry.timestamp}`);
}

async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  return `hashed_${plainPassword}` === storedHash;
}

export const loginProcedure = publicProcedure
  .input(
    z.object({
      username: z.string(),
      password: z.string(),
      tenantId: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { username, password, tenantId } = input;

    if (username === SUPER_ADMIN.username && await verifyPassword(password, SUPER_ADMIN.passwordHash)) {
      const userToReturn = {
        ...SUPER_ADMIN,
        lastLogin: new Date().toISOString(),
      };

      await logAuditEntry({
        username,
        action: "login_success",
        userId: SUPER_ADMIN.id,
        details: "Super admin login successful",
      });

      const { passwordHash, ...userWithoutPassword } = userToReturn;
      return { success: true, user: userWithoutPassword, tenantId: null };
    }

    if (!tenantId) {
      await logAuditEntry({
        username,
        action: "login_failed",
        details: "Missing tenant ID for non-super admin login",
      });

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Tenant ID is required",
      });
    }

    const tenants = await kv.getJSON<any[]>("tenants") || [];
    const tenant = tenants.find(t => t.id === tenantId);

    if (!tenant) {
      await logAuditEntry({
        username,
        action: "login_failed",
        details: "Invalid tenant ID",
      });

      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant not found",
      });
    }

    if (tenant.status === "suspended" || tenant.status === "canceled") {
      await logAuditEntry({
        username,
        action: "login_failed",
        details: `Tenant account is ${tenant.status}`,
      });

      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This account is ${tenant.status}. Please contact support.`,
      });
    }

    const employees = await kv.getJSON<any[]>(`tenant:${tenantId}:users`) || [];
    const employee = employees.find((e) => e.username === username && e.isActive);

    if (employee && await verifyPassword(password, employee.passwordHash)) {
      const updatedEmployee = {
        ...employee,
        lastLogin: new Date().toISOString(),
      };

      const updatedEmployees = employees.map((e) => 
        e.id === employee.id ? updatedEmployee : e
      );
      await kv.setJSON(`tenant:${tenantId}:users`, updatedEmployees);

      await logAuditEntry({
        username,
        action: "login_success",
        userId: employee.id,
        details: `${employee.role} login successful`,
      });

      const { passwordHash, ...userWithoutPassword } = updatedEmployee;
      return { success: true, user: userWithoutPassword, tenantId: tenantId, tenant: { businessName: tenant.businessName, logo: tenant.logo } };
    }

    await logAuditEntry({
      username,
      action: "login_failed",
      details: "Invalid credentials",
    });

    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid username or password",
    });
  });
