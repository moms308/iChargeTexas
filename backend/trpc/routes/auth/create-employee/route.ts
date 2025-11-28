import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";

const SUPER_ADMIN_ID = "super_admin_001";

interface Employee {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "worker" | "employee";
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  createdBy: string;
  permissions: {
    canManageUsers: boolean;
    canViewReports: boolean;
    canHandleRequests: boolean;
    canCreateInvoices: boolean;
    canViewCustomerInfo: boolean;
    canDeleteData: boolean;
  };
}

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

async function hashPassword(password: string): Promise<string> {
  return `hashed_${password}`;
}

export const createEmployeeProcedure = protectedProcedure
  .input(
    z.object({
      username: z.string().min(3),
      password: z.string().min(8),
      role: z.enum(["admin", "worker", "employee"]),
      fullName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      permissions: z.object({
        canManageUsers: z.boolean(),
        canViewReports: z.boolean(),
        canHandleRequests: z.boolean(),
        canCreateInvoices: z.boolean(),
        canViewCustomerInfo: z.boolean(),
        canDeleteData: z.boolean(),
      }),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log("[createEmployee] Starting user creation", {
      username: input.username,
      role: input.role,
      requestUserId: ctx.userId,
      tenantId: ctx.tenantId,
    });

    const isSuperAdminRequest = ctx.userId === SUPER_ADMIN_ID;
    console.log("[createEmployee] Is super admin request:", isSuperAdminRequest);
    
    let employees: Employee[];
    let storageKey: string;
    
    if (ctx.tenantId) {
      storageKey = `tenant:${ctx.tenantId}:users`;
      employees = await kv.getJSON<Employee[]>(storageKey) || [];
      console.log(`[createEmployee] Loading tenant users from ${storageKey}:`, employees.length, "users");
    } else {
      storageKey = "employees";
      employees = await kv.getJSON<Employee[]>(storageKey) || [];
      console.log(`[createEmployee] Loading employees from ${storageKey}:`, employees.length, "users");
    }
    
    const requestingUser = employees.find((e) => e.id === ctx.userId);
    console.log("[createEmployee] Requesting user:", requestingUser ? {
      id: requestingUser.id,
      username: requestingUser.username,
      role: requestingUser.role,
    } : "not found");

    if (!isSuperAdminRequest) {
      if (!requestingUser) {
        console.log("[createEmployee] FORBIDDEN: Requesting user not found");
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User not found. Please log in again.",
        });
      }
      
      if (requestingUser.role !== "admin") {
        console.log("[createEmployee] FORBIDDEN: User is not an admin", requestingUser.role);
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can create new users",
        });
      }
    }

    const existingUser = employees.find((e) => e.username.toLowerCase() === input.username.toLowerCase());
    if (existingUser) {
      console.log("[createEmployee] CONFLICT: Username already exists");
      throw new TRPCError({
        code: "CONFLICT",
        message: "Username already exists",
      });
    }

    const normalizedRole: Employee["role"] = input.role === "employee" ? "worker" : input.role;
    console.log("[createEmployee] Normalized role:", normalizedRole);

    const newEmployee: Employee = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: normalizedRole,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId || "system",
      permissions: input.permissions,
    };

    console.log("[createEmployee] New employee created:", {
      id: newEmployee.id,
      username: newEmployee.username,
      role: newEmployee.role,
      email: newEmployee.email,
      permissions: newEmployee.permissions,
    });

    employees.push(newEmployee);
    await kv.setJSON(storageKey, employees);
    console.log(`[createEmployee] Saved to ${storageKey}. Total users:`, employees.length);

    await logAuditEntry({
      username: isSuperAdminRequest ? "super_admin" : requestingUser?.username || "system",
      action: "user_created",
      userId: ctx.userId,
      details: `Created ${normalizedRole} account for ${input.username} with email ${input.email}`,
    });

    const { passwordHash, ...employeeWithoutPassword } = newEmployee;
    console.log("[createEmployee] SUCCESS: User created successfully");
    return { success: true, employee: employeeWithoutPassword };
  });
