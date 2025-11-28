import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";

interface Employee {
  id: string;
  employeeId?: string;
  username: string;
  passwordHash: string;
  role: "admin" | "employee";
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

export const getEmployeesProcedure = protectedProcedure.query(async ({ ctx }) => {
  console.log("[getEmployees] Fetching employees", {
    userId: ctx.userId,
    tenantId: ctx.tenantId,
  });

  let employees: Employee[];
  let storageKey: string;
  
  if (ctx.tenantId) {
    storageKey = `tenant:${ctx.tenantId}:users`;
    employees = await kv.getJSON<Employee[]>(storageKey) || [];
    console.log(`[getEmployees] Loaded ${employees.length} employees from ${storageKey}`);
  } else {
    storageKey = "employees";
    employees = await kv.getJSON<Employee[]>(storageKey) || [];
    console.log(`[getEmployees] Loaded ${employees.length} employees from ${storageKey}`);
  }
  
  const employeesWithoutPasswords = employees.map(({ passwordHash, ...employee }) => ({
    ...employee,
    employeeId: employee.employeeId || 'N/A',
    permissions: employee.permissions || {
      canManageUsers: false,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: false,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  }));
  
  console.log(`[getEmployees] Returning ${employeesWithoutPasswords.length} employees`);
  return employeesWithoutPasswords;
});
