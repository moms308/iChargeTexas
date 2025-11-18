import { useAuth } from "@/constants/authContext";
import colors from "@/constants/colors";
import { SystemUser, UserRole } from "@/constants/types";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Users,
  Shield,
  Edit,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Lock,
  Settings,
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
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  Switch,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ModalType = "create" | "edit" | "view" | "permissions" | null;

export default function UserManagementScreen() {
  const { allUsers, currentUser, createUser, updateUser, getRoleDisplayName } = useAuth();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  const [showPassword, setShowPassword] = useState(false);

  const handleOpenEditModal = (user: SystemUser) => {
    setModalType("edit");
    setSelectedUser(user);
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
    setShowPassword(false);
    setModalVisible(true);
  };

  const canEditPermissions = (userRole: UserRole): boolean => {
    if (!currentUser) {
      console.log("[UserManagement] canEditPermissions: no current user");
      return false;
    }
    console.log("[UserManagement] canEditPermissions check - current user role:", currentUser.role, "target role:", userRole);
    if (currentUser.role === "super_admin") {
      const result = userRole === "admin" || userRole === "worker";
      console.log("[UserManagement] Super admin can edit:", result);
      return result;
    }
    if (currentUser.role === "admin") {
      const result = userRole === "worker";
      console.log("[UserManagement] Admin can edit:", result);
      return result;
    }
    console.log("[UserManagement] Default: cannot edit permissions");
    return false;
  };

  const handleOpenPermissionsModal = (user: SystemUser) => {
    setModalType("permissions");
    setSelectedUser(user);
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
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setModalType(null);
    setSelectedUser(null);
  };

  const handleSubmit = async () => {
    if (!formData.username.trim() || !formData.password.trim() || !formData.fullName.trim() || !formData.email.trim()) {
      Alert.alert("Required Fields", "Please fill in all required fields (username, password, full name, and email)");
      return;
    }

    setIsLoading(true);

    try {
      if (modalType === "create") {
        const result = await createUser(formData);
        
        if (result.success) {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          Alert.alert("Success", "User created successfully");
          handleCloseModal();
        } else {
          Alert.alert("Error", result.message);
        }
      } else if (modalType === "edit" && selectedUser) {
        const result = await updateUser(selectedUser.id, formData);
        
        if (result.success) {
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          Alert.alert("Success", "User updated successfully");
          handleCloseModal();
        } else {
          Alert.alert("Error", result.message);
        }
      }
    } catch (error) {
      console.error("[UserManagement] Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };



  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return <Shield color={colors.error} size={18} />;
      case "admin":
        return <Shield color={colors.primary} size={18} />;
      case "worker":
        return <Users color={colors.success} size={18} />;
      default:
        return <Users color={colors.textTertiary} size={18} />;
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

  const managedUsers = allUsers.filter(u => u.role !== "user");

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
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>{managedUsers.length} staff members</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {managedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Users color={colors.textTertiary} size={64} />
              </View>
              <Text style={styles.emptyTitle}>No Staff Members</Text>
              <Text style={styles.emptyMessage}>No admin or worker accounts have been created yet. Create new staff members using the Admin tab.</Text>
            </View>
          ) : (
            <View style={styles.userList}>
              {managedUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userCard,
                    !user.isActive && styles.userCardInactive,
                  ]}
                  onPress={() => router.push(`/user-detail?id=${user.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userCardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.userIconContainer}>
                        {getRoleIcon(user.role)}
                      </View>
                      <View style={styles.userTextContainer}>
                        <Text style={styles.userName}>{user.fullName}</Text>
                        <Text style={styles.userUsername}>@{user.username}</Text>
                      </View>
                    </View>
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
                              console.error('[UserManagement] Error opening phone dialer:', err);
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
                    <View style={styles.actionButtons}>
                      {canEditPermissions(user.role) && (
                        <TouchableOpacity
                          style={styles.permissionsButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenPermissionsModal(user);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Settings color="#FFC107" size={16} />
                        </TouchableOpacity>
                      )}
                      {user.role !== "super_admin" && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(user);
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Edit color={colors.primary} size={16} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              style={styles.modalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <Text style={styles.modalTitle}>
                  {modalType === "create" && "Create New User"}
                  {modalType === "edit" && "Edit User"}
                  {modalType === "view" && "User Details"}
                  {modalType === "permissions" && "Edit Permissions"}
                </Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseModal}>
                  <XCircle color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScrollView} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {modalType === "permissions" && selectedUser ? (
                  <View style={styles.permissionsOnlyContainer}>
                    <View style={styles.permissionsOnlyHeader}>
                      <View style={styles.userIconContainer}>
                        {getRoleIcon(selectedUser.role)}
                      </View>
                      <Text style={styles.permissionsOnlyName}>{selectedUser.fullName}</Text>
                      <Text style={styles.permissionsOnlyUsername}>@{selectedUser.username}</Text>
                      <View
                        style={[
                          styles.viewRoleBadge,
                          { backgroundColor: getRoleBadgeColor(selectedUser.role) + "20" },
                        ]}
                      >
                        <Text style={[styles.viewRoleText, { color: getRoleBadgeColor(selectedUser.role) }]}>
                          {getRoleDisplayName(selectedUser.role)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.permissionsSection}>
                      <Text style={styles.permissionsSectionTitle}>User Permissions</Text>
                      <Text style={styles.permissionsSectionSubtitle}>
                        Configure what this user can do in the system
                      </Text>
                      {Object.entries(formData.permissions).map(([key, value]) => (
                        <View key={key} style={styles.permissionSwitch}>
                          <View style={styles.permissionLabelContainer}>
                            {value ? (
                              <CheckCircle color={colors.success} size={16} />
                            ) : (
                              <XCircle color={colors.textTertiary} size={16} />
                            )}
                            <Text style={styles.permissionLabel}>
                              {key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                            </Text>
                          </View>
                          <Switch
                            value={value}
                            onValueChange={(newValue) =>
                              setFormData({
                                ...formData,
                                permissions: { ...formData.permissions, [key]: newValue },
                              })
                            }
                            trackColor={{ false: colors.border, true: colors.primary + "60" }}
                            thumbColor={value ? colors.primary : colors.textTertiary}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                ) : modalType === "view" && selectedUser ? (
                  <View style={styles.viewContainer}>
                    <View style={styles.viewHeader}>
                      <View style={styles.viewIconContainer}>
                        {getRoleIcon(selectedUser.role)}
                      </View>
                      <Text style={styles.viewName}>{selectedUser.fullName}</Text>
                      <Text style={styles.viewUsername}>@{selectedUser.username}</Text>
                      <View
                        style={[
                          styles.viewRoleBadge,
                          { backgroundColor: getRoleBadgeColor(selectedUser.role) + "20" },
                        ]}
                      >
                        <Text style={[styles.viewRoleText, { color: getRoleBadgeColor(selectedUser.role) }]}>
                          {getRoleDisplayName(selectedUser.role)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.viewSection}>
                      <Text style={styles.viewSectionTitle}>Contact Information</Text>
                      <View style={styles.viewDetailRow}>
                        <Mail color={colors.textSecondary} size={18} />
                        <Text style={styles.viewDetailText}>{selectedUser.email}</Text>
                      </View>
                      {selectedUser.phone && (
                        <View style={styles.viewDetailRow}>
                          <Phone color={colors.textSecondary} size={18} />
                          <Text style={styles.viewDetailText}>{selectedUser.phone}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.viewSection}>
                      <Text style={styles.viewSectionTitle}>Account Details</Text>
                      <View style={styles.viewDetailRow}>
                        <Calendar color={colors.textSecondary} size={18} />
                        <Text style={styles.viewDetailText}>
                          Created: {new Date(selectedUser.createdAt).toLocaleString()}
                        </Text>
                      </View>
                      {selectedUser.lastLogin && (
                        <View style={styles.viewDetailRow}>
                          <Lock color={colors.textSecondary} size={18} />
                          <Text style={styles.viewDetailText}>
                            Last Login: {new Date(selectedUser.lastLogin).toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {selectedUser.permissions && (
                      <View style={styles.viewSection}>
                        <Text style={styles.viewSectionTitle}>Permissions</Text>
                        {Object.entries(selectedUser.permissions).map(([key, value]) => (
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
                ) : (
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
                      {modalType === "edit" && (
                        <Text style={styles.fieldHelpText}>Username can be changed for this account</Text>
                      )}
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Password *</Text>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={styles.passwordInput}
                          value={formData.password}
                          onChangeText={(text) => setFormData({ ...formData, password: text })}
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
                )}
              </ScrollView>

              {modalType !== "view" && modalType !== null && (
                <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {modalType === "create" && "Create User"}
                        {modalType === "edit" && "Save Changes"}
                        {modalType === "permissions" && "Update Permissions"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </Modal>
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
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    padding: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 280,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.white,
  },
  userList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCardInactive: {
    opacity: 0.6,
  },
  userCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  userCardDetails: {
    gap: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
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
    paddingTop: 12,
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
    fontSize: 12,
    fontWeight: "600" as const,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  permissionsButton: {
    padding: 10,
    backgroundColor: "#FFC10720",
    borderRadius: 8,
  },
  editButton: {
    padding: 10,
    backgroundColor: colors.primary + "15",
    borderRadius: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    height: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingRight: 14,
    borderWidth: 2,
    borderColor: colors.primary + "40",
    minHeight: 50,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: colors.text,
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
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    marginBottom: 12,
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
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  viewContainer: {
    padding: 24,
  },
  viewHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  viewIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  viewName: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  viewUsername: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  viewRoleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  viewRoleText: {
    fontSize: 13,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  viewSection: {
    marginBottom: 24,
  },
  viewSectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 12,
    textTransform: "uppercase" as const,
  },
  viewDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  viewDetailText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    paddingVertical: 6,
  },
  permissionText: {
    fontSize: 14,
    color: colors.text,
  },
  permissionsOnlyContainer: {
    padding: 24,
  },
  permissionsOnlyHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  permissionsOnlyName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  permissionsOnlyUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  fieldHelpText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: "italic" as const,
  },
});
