import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { SystemUser, UserRole } from "@/constants/types";

const USERS_STORAGE_KEY = "system_users";

export const createUserProcedure = protectedProcedure
  .input(
    z.object({
      username: z.string(),
      password: z.string(),
      fullName: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      role: z.enum(["super_admin", "admin", "worker", "user"]),
      isActive: z.boolean(),
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
    console.log("[Backend Auth] Creating user:", input.username);

    const usersData = await ctx.kv.get(USERS_STORAGE_KEY);
    const users: SystemUser[] = usersData
      ? JSON.parse(usersData as string)
      : [];

    const existingUser = users.find((u) => u.username.toLowerCase() === input.username.toLowerCase());
    if (existingUser) {
      return {
        success: false,
        message: "Username already exists",
      };
    }

    const newUser: SystemUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: input.username,
      password: input.password,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      role: input.role as UserRole,
      isActive: input.isActive,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId || "system",
      permissions: input.permissions,
    };

    const updatedUsers = [...users, newUser];
    await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

    console.log("[Backend Auth] User created:", newUser.username);

    return {
      success: true,
      message: "User created successfully",
      user: newUser,
    };
  });

export default createUserProcedure;
