
import colors from "@/constants/colors";
import { UserRole } from "@/constants/types";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Users,
  Shield,
  Trash2,
  Edit,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Lock,
  Save,
} from "lucide-react-native";
import React, { useState, useEffect } from "react";
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

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams();
  const allUsers: any[] = [];
  const updateUser = async () => ({ success: false, message: "Auth disabled" });
  const deleteUser = async () => ({ success: false, message: "Auth disabled" });
  const getRoleDisplayName = (role: any) => role;
  const currentUser = null;
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const user = allUsers.find(u => u.id === id);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    role: "worker" as UserRole,
    isActive: true,
    permissions: {
      canManageUsers: false,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: false,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: user.password,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions || {
          canManageUsers: false,
          canViewReports: true,
          canHandleRequests: true,
          canCreateInvoices: false,
          canViewCustomerInfo: true,
          canDeleteData: false,
        },
      });
    }
  }, [user]);

  const canEditPermissions = (userRole: UserRole): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "super_admin") {
      return userRole === "admin" || userRole === "worker";
    }
    if (currentUser.role === "admin") {
      return userRole === "worker";
    }
    return false;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.username.trim() || !formData.password.trim() || !formData.fullName.trim() || !formData.email.trim()) {
      Alert.alert("Required Fields", "Please fill in all required fields (username, password, full name, and email)");
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateUser(user.id, formData);
      
      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Success", "User updated successfully");
        setIsEditing(false);
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      console.error("[UserDetail] Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!user) return;

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
              Alert.alert("Success", "User deleted successfully", [
                { text: "OK", onPress: () => router.back() }
              ]);
            } else {
              Alert.alert("Error", result.message);
            }
          },
        },
      ]
    );
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return <Shield color={colors.error} size={32} />;
      case "admin":
        return <Shield color={colors.primary} size={32} />;
      case "worker":
        return <Users color={colors.success} size={32} />;
      default:
        return <Users color={colors.textTertiary} size={32} />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "super_admin": return colors.error;
      case "admin": return colors.primary;
      case "worker": return colors.success;
      default: return colors.textTertiary;
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.background, colors.surface]} style={styles.gradient}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User Not Found</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={styles.gradient}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Details</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.userHeader}>
            <View style={styles.userIconContainer}>
              {getRoleIcon(user.role)}
            </View>
            <Text style={styles.userName}>{isEditing ? formData.fullName : user.fullName}</Text>
            <Text style={styles.userUsername}>@{isEditing ? formData.username : user.username}</Text>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: getRoleBadgeColor(user.role) + "20" },
              ]}
            >
              <Text style={[styles.roleText, { color: getRoleBadgeColor(user.role) }]}>
                {getRoleDisplayName(user.role)}
              </Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Username *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  placeholder="Enter username"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>

              {user.role !== "super_admin" && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Role *</Text>
                  <View style={styles.roleSelector}>
                    {(["admin", "worker"] as UserRole[]).map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleOption,
                          formData.role === role && styles.roleOptionActive,
                        ]}
                        onPress={() => setFormData({ ...formData, role })}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            formData.role === role && styles.roleOptionTextActive,
                          ]}
                        >
                          {getRoleDisplayName(role)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Active Status</Text>
                  <Switch
                    value={formData.isActive}
                    onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                    trackColor={{ false: colors.border, true: colors.primary + "60" }}
                    thumbColor={formData.isActive ? colors.primary : colors.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.permissionsSection}>
                <Text style={styles.permissionsSectionTitle}>Permissions</Text>
                <Text style={styles.permissionsSectionSubtitle}>
                  {canEditPermissions(formData.role) 
                    ? "Configure user permissions" 
                    : "View-only: You can only edit permissions for users with lower privileges"}
                </Text>
                {Object.entries(formData.permissions).map(([key, value]) => {
                  const canEdit = canEditPermissions(formData.role);
                  return (
                    <View key={key} style={[styles.permissionSwitch, !canEdit && styles.permissionSwitchDisabled]}>
                      <View style={styles.permissionLabelContainer}>
                        {value ? (
                          <CheckCircle color={colors.success} size={16} />
                        ) : (
                          <XCircle color={colors.textTertiary} size={16} />
                        )}
                        <Text style={[styles.permissionLabel, !canEdit && styles.permissionLabelDisabled]}>
                          {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                        </Text>
                      </View>
                      <Switch
                        value={value}
                        onValueChange={(newValue) => {
                          if (canEdit) {
                            setFormData({
                              ...formData,
                              permissions: { ...formData.permissions, [key]: newValue },
                            });
                          }
                        }}
                        disabled={!canEdit}
                        trackColor={{ false: colors.border, true: colors.primary + "60" }}
                        thumbColor={value ? colors.primary : colors.textTertiary}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.viewContainer}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <View style={styles.detailRow}>
                  <Mail color={colors.textSecondary} size={18} />
                  <Text style={styles.detailText}>{user.email}</Text>
                </View>
                {user.phone && (
                  <View style={styles.detailRow}>
                    <Phone color={colors.textSecondary} size={18} />
                    <Text style={styles.detailText}>{user.phone}</Text>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Details</Text>
                <View style={styles.detailRow}>
                  <Calendar color={colors.textSecondary} size={18} />
                  <Text style={styles.detailText}>
                    Created: {new Date(user.createdAt).toLocaleString()}
                  </Text>
                </View>
                {user.lastLogin && (
                  <View style={styles.detailRow}>
                    <Lock color={colors.textSecondary} size={18} />
                    <Text style={styles.detailText}>
                      Last Login: {new Date(user.lastLogin).toLocaleString()}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  {user.isActive ? (
                    <CheckCircle color={colors.success} size={18} />
                  ) : (
                    <XCircle color={colors.error} size={18} />
                  )}
                  <Text style={[styles.detailText, { color: user.isActive ? colors.success : colors.error }]}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              {user.permissions && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Permissions</Text>
                  {Object.entries(user.permissions).map(([key, value]) => (
                    <View key={key} style={styles.permissionRow}>
                      {value ? (
                        <CheckCircle color={colors.success} size={16} />
                      ) : (
                        <XCircle color={colors.error} size={16} />
                      )}
                      <Text style={styles.permissionText}>
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  if (user) {
                    setFormData({
                      username: user.username,
                      password: user.password,
                      fullName: user.fullName,
                      email: user.email,
                      phone: user.phone || "",
                      role: user.role,
                      isActive: user.isActive,
                      permissions: user.permissions || {
                        canManageUsers: false,
                        canViewReports: true,
                        canHandleRequests: true,
                        canCreateInvoices: false,
                        canViewCustomerInfo: true,
                        canDeleteData: false,
                      },
                    });
                  }
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Save color={colors.white} size={18} />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {user.role !== "super_admin" && (
                <>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <Edit color={colors.white} size={18} />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                  >
                    <Trash2 color={colors.white} size={18} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  userHeader: {
    alignItems: "center",
    marginBottom: 32,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  viewContainer: {
    gap: 20,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 16,
    textTransform: "uppercase" as const,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingVertical: 4,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    paddingVertical: 4,
  },
  permissionText: {
    fontSize: 14,
    color: colors.text,
  },
  formContainer: {
    gap: 16,
  },
  formGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.primary + "40",
    minHeight: 50,
  },
  roleSelector: {
    flexDirection: "row",
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
  },
  roleOptionActive: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionsSectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  permissionsSectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 16,
  },
  permissionSwitch: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  permissionSwitchDisabled: {
    opacity: 0.6,
  },
  permissionLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  permissionLabel: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  permissionLabelDisabled: {
    color: colors.textSecondary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 20,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.error,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.success,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
});
