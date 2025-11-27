
import { Linking } from "react-native";
import colors from "@/constants/colors";
import { SystemUser, UserRole } from "@/constants/types";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function UsersScreen() {
  const allUsers: SystemUser[] = [];
  const currentUser: SystemUser | null = null;
  const isSuperAdmin = false;
  
  const createUser = async (userData: any) => {
    return { success: false, message: 'User creation not implemented' };
  };
  
  const deleteUser = async (userId: string) => {
    return { success: false, message: 'User deletion not implemented' };
  };
  
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'worker': return 'Worker';
      default: return 'User';
    }
  };
  const insets = useSafeAreaInsets();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("worker");
  const [isActive, setIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState({
    canManageUsers: false,
    canViewReports: true,
    canHandleRequests: true,
    canCreateInvoices: false,
    canViewCustomerInfo: true,
    canDeleteData: false,
  });

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("worker");
    setIsActive(true);
    setShowPassword(false);
    setPermissions({
      canManageUsers: false,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: false,
      canViewCustomerInfo: true,
      canDeleteData: false,
    });
  };

  const handleToggleCreateForm = () => {
    if (showCreateForm) {
      resetForm();
    }
    setShowCreateForm(!showCreateForm);
  };

  const handleCreateUser = async () => {
    if (!username.trim() || !password.trim() || !fullName.trim() || !email.trim()) {
      Alert.alert("Required Fields", "Please fill in username, password, full name, and email");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createUser({
        username: username.trim(),
        password: password.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        isActive,
        permissions,
      });
      
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Success", "User created successfully");
        resetForm();
        setShowCreateForm(false);
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      console.error("[UsersScreen] Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = (user: SystemUser) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${user.fullName} (${user.username})? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteUser(user.id);
            if (result.success) {
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              Alert.alert("Success", "User deleted successfully");
            } else {
              Alert.alert("Error", result.message);
            }
          },
        },
      ]
    );
  };

  const getRoleIcon = (userRole: UserRole) => {
    switch (userRole) {
      case "super_admin":
        return <Shield color={colors.error} size={20} />;
      case "admin":
        return <Shield color={colors.primary} size={20} />;
      case "worker":
        return <Users color={colors.success} size={20} />;
      default:
        return <Users color={colors.textTertiary} size={20} />;
    }
  };

  const getRoleBadgeColor = (userRole: UserRole) => {
    switch (userRole) {
      case "super_admin": return colors.error;
      case "admin": return colors.primary;
      case "worker": return colors.success;
      default: return colors.textTertiary;
    }
  };

  const managedUsers = allUsers.filter(u => u.role !== "user");
  const canDeleteUsers = false;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={styles.gradient}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <Text style={styles.title}>User Management</Text>
            <Text style={styles.subtitle}>{managedUsers.length} team members</Text>
            <TouchableOpacity
              style={[styles.createButton, showCreateForm && styles.createButtonActive]}
              onPress={handleToggleCreateForm}
            >
              {showCreateForm ? (
                <X color={colors.white} size={22} />
              ) : (
                <UserPlus color={colors.white} size={22} />
              )}
              <Text style={styles.createButtonText}>
                {showCreateForm ? "Cancel" : "Create New User"}
              </Text>
            </TouchableOpacity>
          </View>

          {showCreateForm && (
            <View style={styles.createFormContainer}>
              <Text style={styles.formTitle}>Create New User Account</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Username *</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff color={colors.textSecondary} size={20} />
                    ) : (
                      <Eye color={colors.textSecondary} size={20} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Role *</Text>
                <View style={styles.roleSelector}>
                  {(["admin", "worker"] as UserRole[]).map((roleOption) => (
                    <TouchableOpacity
                      key={roleOption}
                      style={[
                        styles.roleOption,
                        role === roleOption && styles.roleOptionActive,
                      ]}
                      onPress={() => setRole(roleOption)}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          role === roleOption && styles.roleOptionTextActive,
                        ]}
                      >
                        {getRoleDisplayName(roleOption)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {isSuperAdmin && (
                  <Text style={styles.roleHelpText}>
                    As Super Admin, you can create admin accounts with elevated privileges
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Active Status</Text>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ false: colors.border, true: colors.primary + "60" }}
                    thumbColor={isActive ? colors.primary : colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.permissionsSection}>
                <Text style={styles.permissionsSectionTitle}>Permissions</Text>
                <Text style={styles.permissionsHelpText}>Configure what this user can access and manage</Text>
                {Object.entries(permissions).map(([key, value]) => (
                  <View key={key} style={styles.permissionSwitch}>
                    <View style={styles.permissionInfo}>
                      <Text style={styles.permissionLabel}>
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                      </Text>
                      <Text style={styles.permissionDescription}>
                        {getPermissionDescription(key)}
                      </Text>
                    </View>
                    <Switch
                      value={value}
                      onValueChange={(newValue) =>
                        setPermissions({ ...permissions, [key]: newValue })
                      }
                      trackColor={{ false: colors.border, true: colors.primary + "60" }}
                      thumbColor={value ? colors.primary : colors.textTertiary}
                    />
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleCreateUser}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <UserPlus color={colors.white} size={20} />
                    <Text style={styles.submitButtonText}>Create User</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.userList}>
            {managedUsers.map((user) => (
              <View key={user.id} style={[styles.userCard, !user.isActive && styles.userCardInactive]}>
                <View style={styles.userCardHeader}>
                  <View style={styles.userInfo}>
                    <View style={[styles.userIconContainer, { backgroundColor: getRoleBadgeColor(user.role) + "20" }]}>
                      {getRoleIcon(user.role)}
                    </View>
                    <View style={styles.userTextContainer}>
                      <Text style={styles.userName}>{user.fullName}</Text>
                      <Text style={styles.userUsername}>@{user.username}</Text>
                    </View>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user.role) + "20" }]}>
                    <Text style={[styles.roleText, { color: getRoleBadgeColor(user.role) }]}>
                      {getRoleDisplayName(user.role)}
                    </Text>
                  </View>
                </View>

                <View style={styles.userCardDetails}>
                  <View style={styles.detailRow}>
                    <Mail color={colors.textSecondary} size={14} />
                    <Text style={styles.detailText}>{user.email}</Text>
                  </View>
                  {user.phone && (
                    <TouchableOpacity
                      style={styles.phoneButton}
                      onPress={() => {
                        const phoneNumber = user.phone?.replace(/[^0-9+]/g, '');
                        if (phoneNumber) {
                          Linking.openURL(`tel:${phoneNumber}`).catch((err) => {
                            console.error('[UsersScreen] Error opening phone dialer:', err);
                            Alert.alert('Error', 'Unable to open phone dialer');
                          });
                        }
                      }}
                      activeOpacity={0.6}
                    >
                      <Phone color={colors.primary} size={14} />
                      <Text style={styles.phoneButtonText}>{user.phone}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.detailRow}>
                    <Calendar color={colors.textSecondary} size={14} />
                    <Text style={styles.detailText}>
                      Created {new Date(user.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.userCardActions}>
                  <View style={styles.statusContainer}>
                    {user.isActive ? (
                      <View style={styles.activeStatus}>
                        <CheckCircle color={colors.success} size={14} />
                        <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
                      </View>
                    ) : (
                      <View style={styles.inactiveStatus}>
                        <XCircle color={colors.error} size={14} />
                        <Text style={[styles.statusText, { color: colors.error }]}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  {user.role !== "super_admin" && canDeleteUsers && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteUser(user)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 color={colors.error} size={16} />
                      <Text style={[styles.deleteButtonText, { color: colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {user.permissions && (
                  <View style={styles.permissionsPreview}>
                    <Text style={styles.permissionsTitle}>Permissions</Text>
                    <View style={styles.permissionsGrid}>
                      {Object.entries(user.permissions).filter(([, value]) => value).slice(0, 3).map(([key]) => (
                        <View key={key} style={styles.permissionTag}>
                          <CheckCircle color={colors.success} size={12} />
                          <Text style={styles.permissionTagText}>
                            {key.replace(/can/, '').replace(/([A-Z])/g, " $1").trim()}
                          </Text>
                        </View>
                      ))}
                      {Object.values(user.permissions).filter(v => v).length > 3 && (
                        <Text style={styles.morePermissions}>
                          +{Object.values(user.permissions).filter(v => v).length - 3} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function getPermissionDescription(key: string): string {
  const descriptions: Record<string, string> = {
    canManageUsers: "Create, edit, and delete user accounts",
    canViewReports: "Access reports and analytics",
    canHandleRequests: "Manage and respond to service requests",
    canCreateInvoices: "Create and manage invoices",
    canViewCustomerInfo: "View customer information and details",
    canDeleteData: "Delete records and data permanently",
  };
  return descriptions[key] || "";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 16,
  },
  createButtonActive: {
    backgroundColor: colors.error,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  createFormContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingRight: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  roleSelector: {
    flexDirection: "row",
    gap: 12,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
  },
  roleOptionActive: {
    backgroundColor: colors.primary + "15",
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  roleOptionTextActive: {
    color: colors.primary,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  permissionsSection: {
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  permissionsSectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  permissionsHelpText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  permissionSwitch: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "50",
  },
  permissionInfo: {
    flex: 1,
    marginRight: 16,
  },
  permissionLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 2,
  },
  permissionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  roleHelpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 16,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: colors.success,
    borderRadius: 16,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.white,
  },
  userList: {
    gap: 16,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  userCardInactive: {
    opacity: 0.6,
  },
  userCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  userCardDetails: {
    gap: 10,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  phoneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + "15",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  phoneButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  userCardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusContainer: {
    flex: 1,
  },
  activeStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inactiveStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    backgroundColor: colors.error + "15",
    borderRadius: 10,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  permissionsPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  permissionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  permissionTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.success + "15",
    borderRadius: 8,
  },
  permissionTagText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.success,
  },
  morePermissions: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
