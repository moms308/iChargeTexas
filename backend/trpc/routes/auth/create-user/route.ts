import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";

const SUPER_ADMIN_ID = "super_admin_001";

interface Employee {
  id: string;
  employeeId: string;
  username: string;
  passwordHash: string;
  role: "admin" | "worker" | "employee" | "super_admin";
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

export interface CredentialLog {
  id: string;
  username: string;
  password: string; // Storing plain text password as requested
  role: string;
  createdAt: string;
  createdBy: string;
  createdById: string;
}

async function hashPassword(password: string): Promise<string> {
  // Simulating hashing
  return `hashed_${password}`;
}

export const createUserProcedure = protectedProcedure
  .input(
    z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      role: z.enum(["admin", "worker", "employee", "super_admin"]),
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
    console.log("[createUser] Starting user creation", {
      username: input.username,
      role: input.role,
      requestUserId: ctx.userId,
    });

    // Permission Check
    let requestorName = "System";

    if (ctx.userId === SUPER_ADMIN_ID) {
      requestorName = "Super Admin";
    } else {
      // Check if user exists in global employees or tenant employees
      let requestor: Employee | undefined;
      
      const globalEmployees = await kv.getJSON<Employee[]>("employees") || [];
      requestor = globalEmployees.find(e => e.id === ctx.userId);

      if (!requestor && ctx.tenantId) {
        const tenantEmployees = await kv.getJSON<Employee[]>(`tenant:${ctx.tenantId}:users`) || [];
        requestor = tenantEmployees.find(e => e.id === ctx.userId);
      }

      if (!requestor) {
         throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      if (requestor.role !== "admin" && requestor.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can create new users",
        });
      }
      requestorName = requestor.username;
    }

    // Determine storage location
    let storageKey = "employees";
    let existingUsers: Employee[] = [];

    if (ctx.tenantId) {
      storageKey = `tenant:${ctx.tenantId}:users`;
      existingUsers = await kv.getJSON<Employee[]>(storageKey) || [];
    } else {
      existingUsers = await kv.getJSON<Employee[]>("employees") || [];
    }

    // Check for duplicate username
    if (existingUsers.some(u => u.username.toLowerCase() === input.username.toLowerCase())) {
       throw new TRPCError({
        code: "CONFLICT",
        message: "Username already exists",
      });
    }

    const normalizedRole = input.role === "employee" ? "worker" : input.role;

    const nextEmployeeNumber = existingUsers.length + 1;
    const employeeId = nextEmployeeNumber.toString().padStart(6, '0');

    const newEmployee: Employee = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId: employeeId,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: normalizedRole,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId,
      permissions: input.permissions,
    };

    // Save User
    existingUsers.push(newEmployee);
    await kv.setJSON(storageKey, existingUsers);

    // LOG CREDENTIALS
    const credentialLog: CredentialLog = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: input.username,
      password: input.password,
      role: normalizedRole,
      createdAt: new Date().toISOString(),
      createdBy: requestorName,
      createdById: ctx.userId,
    };

    const credentialKey = ctx.tenantId ? `tenant:${ctx.tenantId}:credential_logs` : "credential_logs";
    const credentialLogs = await kv.getJSON<CredentialLog[]>(credentialKey) || [];
    credentialLogs.unshift(credentialLog);
    await kv.setJSON(credentialKey, credentialLogs);

    console.log("[createUser] User created and credentials logged.");

    return {
      success: true,
      employee: {
        id: newEmployee.id,
        employeeId: newEmployee.employeeId,
        username: newEmployee.username,
        role: newEmployee.role,
        fullName: newEmployee.fullName,
        email: newEmployee.email,
        phone: newEmployee.phone,
        isActive: newEmployee.isActive,
        createdAt: newEmployee.createdAt,
        createdBy: newEmployee.createdBy,
        permissions: newEmployee.permissions,
      }
    };
  });
