import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SystemUser } from "./types";

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<{ businessName: string; logo?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("@current_user");
      const storedTenantId = await AsyncStorage.getItem("@current_tenant_id");
      const storedTenantInfo = await AsyncStorage.getItem("@current_tenant_info");
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedTenantId) {
        setTenantId(storedTenantId);
      }
      if (storedTenantInfo) {
        setTenantInfo(JSON.parse(storedTenantInfo));
      }
    } catch (error) {
      console.error("Error loading stored user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string, tenantIdInput?: string): Promise<boolean> => {
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
      await AsyncStorage.removeItem("@current_tenant_id");
      await AsyncStorage.removeItem("@current_tenant_info");
      setUser(userToStore);
      setTenantId(null);
      setTenantInfo(null);
      return true;
    }

    return false;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("@current_user");
    await AsyncStorage.removeItem("@current_tenant_id");
    await AsyncStorage.removeItem("@current_tenant_info");
    setUser(null);
    setTenantId(null);
    setTenantInfo(null);
  }, []);

  const setTenantContext = useCallback(async (newTenantId: string | null, info?: { businessName: string; logo?: string }) => {
    setTenantId(newTenantId);
    setTenantInfo(info || null);
    
    if (newTenantId) {
      await AsyncStorage.setItem("@current_tenant_id", newTenantId);
      if (info) {
        await AsyncStorage.setItem("@current_tenant_info", JSON.stringify(info));
      }
    } else {
      await AsyncStorage.removeItem("@current_tenant_id");
      await AsyncStorage.removeItem("@current_tenant_info");
    }
  }, []);

  return useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      tenantId,
      tenantInfo,
      login,
      logout,
      setTenantContext,
    }),
    [user, isLoading, tenantId, tenantInfo, login, logout, setTenantContext]
  );
});
