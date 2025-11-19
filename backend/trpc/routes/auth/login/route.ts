import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { SystemUser } from "@/constants/types";

const USERS_STORAGE_KEY = "system_users";

const DEFAULT_USERS: SystemUser[] = [
  {
    id: "super_admin_001",
    username: "superadmin",
    password: "Wowcows123!123!",
    role: "super_admin",
    fullName: "Super Administrator",
    email: "admin@ichargetexas.com",
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
  },
  {
    id: "admin_vernon",
    username: "Vernon",
    password: "bacon",
    role: "admin",
    fullName: "Vernon",
    email: "vernon@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: true,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: true,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  },
  {
    id: "admin_cindi",
    username: "Cindi",
    password: "bacon",
    role: "admin",
    fullName: "Cindi",
    email: "cindi@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: true,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: true,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  },
  {
    id: "admin_mark",
    username: "Mark",
    password: "bacon",
    role: "admin",
    fullName: "Mark",
    email: "mark@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: true,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: true,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  },
  {
    id: "worker_dustin",
    username: "Dustin",
    password: "bacon",
    role: "worker",
    fullName: "Dustin",
    email: "dustin@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: false,
      canViewReports: false,
      canHandleRequests: true,
      canCreateInvoices: false,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  },
];

export const loginProcedure = publicProcedure
  .input(
    z.object({
      username: z.string(),
      password: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log("[Backend Auth] Login attempt for:", input.username);

    const usersData = await ctx.kv.get(USERS_STORAGE_KEY);
    let users: SystemUser[] = [];

    if (!usersData) {
      console.log("[Backend Auth] No users found, creating default users");
      users = DEFAULT_USERS;
      await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(users));
    } else {
      users = JSON.parse(usersData as string);
      
      // Check if default users exist, if not add them (simple migration for this session)
      const existingUsernames = users.map(u => u.username.toLowerCase());
      let addedNew = false;
      
      for (const defaultUser of DEFAULT_USERS) {
        if (!existingUsernames.includes(defaultUser.username.toLowerCase())) {
          users.push(defaultUser);
          addedNew = true;
        }
      }
      
      if (addedNew) {
        console.log("[Backend Auth] Added missing default users");
        await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }

    const user = users.find(
      (u) => u.username.toLowerCase() === input.username.toLowerCase() && u.password === input.password
    );

    if (!user) {
      console.log("[Backend Auth] Invalid credentials for:", input.username);
      return {
        success: false,
        message: "Invalid username or password",
      };
    }

    if (!user.isActive) {
      console.log("[Backend Auth] User account is inactive:", input.username);
      return {
        success: false,
        message: "This account has been deactivated",
      };
    }

    const updatedUser: SystemUser = {
      ...user,
      lastLogin: new Date().toISOString(),
    };

    const updatedUsers = users.map((u) =>
      u.id === user.id ? updatedUser : u
    );
    await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

    console.log(
      "[Backend Auth] Login successful for:",
      input.username,
      "role:",
      user.role
    );

    return {
      success: true,
      message: "Login successful",
      user: updatedUser,
    };
  });

export default loginProcedure;
