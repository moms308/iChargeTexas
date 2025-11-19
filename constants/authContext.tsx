import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SystemUser } from "./types";

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("@current_user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading stored user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const SUPER_ADMIN = {
      id: "super_admin_001",
      username: "Moms308",
      password: "Wowcows123!123!",
      role: "super_admin" as const,
      fullName: "Super Administrator",
      email: "admin@ichargetexas.com",
      phone: "",
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
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

    if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
      const userToStore = { ...SUPER_ADMIN, lastLogin: new Date().toISOString() };
      await AsyncStorage.setItem("@current_user", JSON.stringify(userToStore));
      setUser(userToStore);
      return true;
    }

    return false;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("@current_user");
    setUser(null);
  }, []);

  return useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );
});
