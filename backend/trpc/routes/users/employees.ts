import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { kv } from "../../../storage";
import { TRPCError } from "@trpc/server";

const SUPER_ADMIN_ID = "super_admin_001";

export interface Employee {
  id: string;
  employeeId: string;
  username: string;
  password: string;
  role: "admin" | "worker" | "super_admin";
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
  password: string;
  role: string;
  createdAt: string;
  createdBy: string;
  createdById: string;
}

function getStorageKey(tenantId: string | null): string {
  return tenantId ? `tenant:${tenantId}:users` : "employees";
}

function getCredentialKey(tenantId: string | null): string {
  return tenantId ? `tenant:${tenantId}:credential_logs` : "credential_logs";
}

async function findRequestor(userId: string, tenantId: string | null): Promise<Employee | null> {
  if (userId === SUPER_ADMIN_ID) {
    return {
      id: SUPER_ADMIN_ID,
      employeeId: "000000",
      username: "super_admin",
      password: "",
      role: "super_admin",
      fullName: "Super Admin",
      email: "admin@system.local",
      phone: "",
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "system",
      permissions: {
        canManageUsers: true,
        canViewReports: true,
        canHandleRequests: true,
        canCreateInvoices: true,
        canViewCustomerInfo: true,
        canDeleteData: true,
      },
    };
  }

  const globalEmployees = (await kv.getJSON<Employee[]>("employees")) || [];
  let requestor = globalEmployees.find((e) => e.id === userId);

  if (!requestor && tenantId) {
    const tenantEmployees = (await kv.getJSON<Employee[]>(`tenant:${tenantId}:users`)) || [];
    requestor = tenantEmployees.find((e) => e.id === userId);
  }

  return requestor || null;
}

export const getEmployeesProcedure = protectedProcedure.query(async ({ ctx }) => {
  console.log("[getEmployees] Starting", {
    userId: ctx.userId,
    tenantId: ctx.tenantId,
  });

  const storageKey = getStorageKey(ctx.tenantId);
  const employees = (await kv.getJSON<Employee[]>(storageKey)) || [];

  console.log(`[getEmployees] Found ${employees.length} employees in ${storageKey}`);

  const employeesWithoutPasswords = employees.map(({ password, ...employee }) => ({
    ...employee,
    permissions: employee.permissions || {
      canManageUsers: false,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: false,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  }));

  return employeesWithoutPasswords;
});

export const createEmployeeProcedure = protectedProcedure
  .input(
    z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      role: z.enum(["admin", "worker"]),
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
    console.log("[createEmployee] Starting", {
      username: input.username,
      role: input.role,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    });

    const requestor = await findRequestor(ctx.userId, ctx.tenantId);

    if (!requestor) {
      console.error("[createEmployee] Requestor not found");
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not found",
      });
    }

    if (requestor.role !== "admin" && requestor.role !== "super_admin") {
      console.error("[createEmployee] Insufficient permissions");
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can create new users",
      });
    }

    const storageKey = getStorageKey(ctx.tenantId);
    const existingUsers = (await kv.getJSON<Employee[]>(storageKey)) || [];

    if (existingUsers.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
      console.error("[createEmployee] Username already exists");
      throw new TRPCError({
        code: "CONFLICT",
        message: "Username already exists",
      });
    }

    const nextEmployeeNumber = existingUsers.length + 1;
    const employeeId = nextEmployeeNumber.toString().padStart(6, "0");

    const newEmployee: Employee = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      employeeId: employeeId,
      username: input.username,
      password: input.password,
      role: input.role,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId,
      permissions: input.permissions,
    };

    existingUsers.push(newEmployee);
    await kv.setJSON(storageKey, existingUsers);

    console.log("[createEmployee] Employee created, logging credentials");

    const credentialLog: CredentialLog = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: input.username,
      password: input.password,
      role: input.role,
      createdAt: new Date().toISOString(),
      createdBy: requestor.fullName,
      createdById: ctx.userId,
    };

    const credentialKey = getCredentialKey(ctx.tenantId);
    const credentialLogs = (await kv.getJSON<CredentialLog[]>(credentialKey)) || [];
    credentialLogs.unshift(credentialLog);
    await kv.setJSON(credentialKey, credentialLogs);

    console.log("[createEmployee] Success");

    const { password, ...employeeWithoutPassword } = newEmployee;

    return {
      success: true,
      employee: employeeWithoutPassword,
    };
  });

export const updateEmployeeProcedure = protectedProcedure
  .input(
    z.object({
      employeeId: z.string(),
      username: z.string().min(3).optional(),
      password: z.string().min(6).optional(),
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
      permissions: z
        .object({
          canManageUsers: z.boolean(),
          canViewReports: z.boolean(),
          canHandleRequests: z.boolean(),
          canCreateInvoices: z.boolean(),
          canViewCustomerInfo: z.boolean(),
          canDeleteData: z.boolean(),
        })
        .optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log("[updateEmployee] Starting", {
      employeeId: input.employeeId,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    });

    const requestor = await findRequestor(ctx.userId, ctx.tenantId);

    if (!requestor) {
      console.error("[updateEmployee] Requestor not found");
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not found",
      });
    }

    if (requestor.role !== "admin" && requestor.role !== "super_admin") {
      console.error("[updateEmployee] Insufficient permissions");
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can update users",
      });
    }

    const storageKey = getStorageKey(ctx.tenantId);
    const employees = (await kv.getJSON<Employee[]>(storageKey)) || [];

    const employeeIndex = employees.findIndex((e) => e.id === input.employeeId);

    if (employeeIndex === -1) {
      console.error("[updateEmployee] Employee not found");
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Employee not found",
      });
    }

    const employee = employees[employeeIndex];

    if (employee.role === "super_admin" && requestor.role !== "super_admin") {
      console.error("[updateEmployee] Cannot update super admin");
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot update super admin accounts",
      });
    }

    if (input.username && input.username !== employee.username) {
      const newUsername = input.username;
      const usernameExists = employees.some(
        (u) => u.id !== input.employeeId && u.username.toLowerCase() === newUsername.toLowerCase()
      );
      if (usernameExists) {
        console.error("[updateEmployee] Username already exists");
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already exists",
        });
      }
    }

    const updatedEmployee: Employee = {
      ...employee,
      ...(input.username && { username: input.username }),
      ...(input.password && { password: input.password }),
      ...(input.fullName && { fullName: input.fullName }),
      ...(input.email && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.permissions && { permissions: input.permissions }),
    };

    employees[employeeIndex] = updatedEmployee;
    await kv.setJSON(storageKey, employees);

    console.log("[updateEmployee] Success");

    const { password, ...employeeWithoutPassword } = updatedEmployee;

    return {
      success: true,
      employee: employeeWithoutPassword,
    };
  });

export const getCredentialLogsProcedure = protectedProcedure.query(async ({ ctx }) => {
  console.log("[getCredentialLogs] Starting", {
    userId: ctx.userId,
    tenantId: ctx.tenantId,
  });

  const requestor = await findRequestor(ctx.userId, ctx.tenantId);

  if (!requestor) {
    console.error("[getCredentialLogs] Requestor not found");
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    });
  }

  if (requestor.role !== "admin" && requestor.role !== "super_admin") {
    console.error("[getCredentialLogs] Insufficient permissions");
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators can view credential logs",
    });
  }

  const credentialKey = getCredentialKey(ctx.tenantId);
  const logs = (await kv.getJSON<CredentialLog[]>(credentialKey)) || [];

  console.log(`[getCredentialLogs] Found ${logs.length} logs`);

  if (ctx.userId === SUPER_ADMIN_ID) {
    return logs;
  } else {
    return logs.filter((log) => log.createdById === ctx.userId);
  }
});
