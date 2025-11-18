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
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useService } from "@/constants/serviceContext";
import { useAuth } from "@/constants/authContext";
import { useMessenger } from "@/constants/messengerContext";
import colors from "@/constants/colors";
import { Message, SystemUser, ServiceRequest } from "@/constants/types";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  UserPlus,
  CheckCircle,
  X,
} from "lucide-react-native";

export default function AssignmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { requests, addMessage, updateRequestAssignedStaff, updateRequestStatus } = useService();
  const { currentUser, allUsers } = useAuth();
  const { addNotification } = useMessenger();
  
  const [messageText, setMessageText] = useState<string>("");
  const [assignModalVisible, setAssignModalVisible] = useState<boolean>(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [availableStaff, setAvailableStaff] = useState<SystemUser[]>([]);

  const assignment = requests.find((r) => r.id === id);

  useEffect(() => {
    loadAvailableStaff();
  }, []);

  useEffect(() => {
    if (assignment && assignment.assignedStaff) {
      setSelectedWorkerIds(assignment.assignedStaff);
    }
  }, [assignment?.id]);

  const loadAvailableStaff = async () => {
    try {
      const stored = await AsyncStorage.getItem("@system_users");
      if (stored && stored !== 'null' && stored !== 'undefined' && typeof stored === 'string') {
        let users: SystemUser[] = [];
        try {
          users = JSON.parse(stored);
        } catch (parseError) {
          console.error("[AssignmentDetail] Error parsing users JSON:", parseError);
          return;
        }
        
        if (!Array.isArray(users)) {
          console.error("[AssignmentDetail] Users data is not an array:", typeof users);
          return;
        }
        
        const staff = users.filter(u => 
          u.isActive && (u.role === 'admin' || u.role === 'worker')
        );
        setAvailableStaff(staff);
      }
    } catch (error) {
      console.error("[AssignmentDetail] Error loading staff:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!assignment || !messageText.trim()) return;

    await addMessage(
      assignment.id,
      messageText.trim(),
      "admin"
    );

    if (assignment.assignedStaff && assignment.assignedStaff.length > 0) {
      for (const staffId of assignment.assignedStaff) {
        const staff = availableStaff.find(s => s.id === staffId);
        if (staff) {
          await addNotification({
            userId: staffId,
            type: 'message',
            title: `💬 New Message: ${assignment.title}`,
            message: messageText.trim(),
            relatedId: assignment.id,
          });
        }
      }
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setMessageText("");
  };

  const handleToggleWorker = (userId: string) => {
    if (selectedWorkerIds.includes(userId)) {
      setSelectedWorkerIds(selectedWorkerIds.filter(id => id !== userId));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, userId]);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignment) return;

    const previouslyAssignedStaff = assignment.assignedStaff || [];
    const newlyAddedStaff = selectedWorkerIds.filter(
      staffId => !previouslyAssignedStaff.includes(staffId)
    );

    await updateRequestAssignedStaff(assignment.id, selectedWorkerIds);
    
    for (const staffId of newlyAddedStaff) {
      const staff = availableStaff.find(s => s.id === staffId);
      if (staff) {
        await addNotification({
          userId: staffId,
          type: 'task_assignment',
          title: '📋 New Task Assignment',
          message: `You have been assigned to: ${assignment.title}`,
          relatedId: assignment.id,
        });
      }
    }
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setAssignModalVisible(false);
  };

  if (!assignment) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={colors.white} size={24} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <MessageSquare color={colors.textTertiary} size={64} />
          <Text style={styles.emptyTitle}>Assignment Not Found</Text>
          <Text style={styles.emptyMessage}>
            This assignment could not be found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.back();
            }}
          >
            <ArrowLeft color={colors.white} size={24} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assignment Details</Text>
          {currentUser && assignment.assignedStaff?.includes(currentUser.id) && assignment.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={async () => {
                  if (Platform.OS !== "web") {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                  updateRequestStatus(assignment.id, 'scheduled');
                  
                  const adminAndSuperAdminUsers = allUsers.filter(
                    (user) => user.role === 'admin' || user.role === 'super_admin'
                  );
                  
                  for (const admin of adminAndSuperAdminUsers) {
                    await addNotification({
                      userId: admin.id,
                      type: 'task_assignment',
                      title: '✅ Assignment Accepted',
                      message: `${currentUser?.fullName || 'Staff member'} accepted: ${assignment.title}`,
                      relatedId: assignment.id,
                    });
                  }
                  
                  Alert.alert('✅ Assignment Accepted', 'You have accepted this work order.');
                }}
              >
                <CheckCircle color={colors.white} size={18} />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  }
                  Alert.alert(
                    '❌ Decline Assignment',
                    'Are you sure you want to decline this work order?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Decline',
                        style: 'destructive',
                        onPress: async () => {
                          const updatedStaff = assignment.assignedStaff?.filter(id => id !== currentUser.id) || [];
                          updateRequestAssignedStaff(assignment.id, updatedStaff);
                          
                          const adminAndSuperAdminUsers = allUsers.filter(
                            (user) => user.role === 'admin' || user.role === 'super_admin'
                          );
                          
                          for (const admin of adminAndSuperAdminUsers) {
                            await addNotification({
                              userId: admin.id,
                              type: 'task_assignment',
                              title: '❌ Assignment Declined',
                              message: `${currentUser?.fullName || 'Staff member'} declined: ${assignment.title}`,
                              relatedId: assignment.id,
                            });
                          }
                          
                          Alert.alert('✅ Assignment Declined', 'You have declined this work order.');
                          router.back();
                        },
                      },
                    ]
                  );
                }}
              >
                <X color={colors.white} size={18} />
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
          {(!currentUser || !assignment.assignedStaff?.includes(currentUser.id) || assignment.status !== 'pending') && (
            <View style={{ width: 80 }} />
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.assignmentTitle}>{assignment.title}</Text>
          <View style={styles.recipientsContainer}>
            <Text style={styles.recipientsLabel}>Recipients:</Text>
            <Text style={styles.recipientsText}>
              Customer ({assignment.name})
              {assignment.assignedStaff && assignment.assignedStaff.length > 0 && (
                <Text>, {assignment.assignedStaff.length} Staff Member{assignment.assignedStaff.length > 1 ? 's' : ''}</Text>
              )}
            </Text>
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => setAssignModalVisible(true)}
          >
            <UserPlus color={colors.white} size={18} />
            <Text style={styles.buttonText}>Assign Staff</Text>
          </TouchableOpacity>
        </View>

        {assignment.assignedStaff && assignment.assignedStaff.length > 0 && (
          <View style={styles.assignedStaffPreview}>
            <Text style={styles.assignedStaffPreviewLabel}>Message will be sent to:</Text>
            <View style={styles.assignedStaffPreviewGrid}>
              <View style={styles.assignedStaffPreviewItem}>
                <Text style={styles.assignedStaffPreviewName}>👤 {assignment.name}</Text>
              </View>
              {assignment.assignedStaff.map((staffId) => {
                const staff = availableStaff.find(s => s.id === staffId);
                return staff ? (
                  <View key={staffId} style={styles.assignedStaffPreviewItem}>
                    <Text style={styles.assignedStaffPreviewName}>
                      {staff.role === 'admin' ? '👨‍💼' : '🔧'} {staff.fullName}
                    </Text>
                  </View>
                ) : null;
              })}
            </View>
          </View>
        )}

        <ScrollView
          style={styles.messagesScrollView}
          contentContainerStyle={styles.messagesContent}
        >
          {(!assignment.messages || assignment.messages.length === 0) ? (
            <View style={styles.emptyMessagesState}>
              <MessageSquare color={colors.textTertiary} size={48} />
              <Text style={styles.emptyMessagesText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            <View style={styles.messagesContainer}>
              {assignment.messages.map((msg: Message) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBoxContainer,
                    msg.sender === "admin"
                      ? styles.adminMessageBox
                      : styles.userMessageBox,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      msg.sender === "admin"
                        ? styles.adminMessage
                        : styles.userMessage,
                    ]}
                  >
                    <View style={styles.messageHeader}>
                      <Text
                        style={[
                          styles.messageSender,
                          msg.sender === "admin"
                            ? styles.adminSender
                            : styles.userSender,
                        ]}
                      >
                        {msg.sender === "admin" ? "Admin" : "Customer"}
                      </Text>
                      <Text style={styles.messageTime}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <Text style={styles.messageText}>{msg.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.messageInputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type your message to everyone involved..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !messageText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <Send color={colors.white} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {assignModalVisible && (
        <View style={styles.assignModalOverlay}>
          <View style={styles.assignModalContent}>
            <View style={styles.assignModalHeader}>
              <Text style={styles.assignModalTitle}>Assign Staff to Job</Text>
              <TouchableOpacity
                style={styles.assignModalCloseButton}
                onPress={() => setAssignModalVisible(false)}
              >
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.staffListScroll}>
              {availableStaff.length === 0 ? (
                <View style={styles.emptyStaffState}>
                  <Text style={styles.emptyStaffText}>
                    No staff members available
                  </Text>
                </View>
              ) : (
                <View style={styles.staffList}>
                  {availableStaff.map((staff) => {
                    const isSelected = selectedWorkerIds.includes(staff.id);
                    return (
                      <TouchableOpacity
                        key={staff.id}
                        style={[
                          styles.staffItem,
                          isSelected && styles.staffItemSelected,
                        ]}
                        onPress={() => handleToggleWorker(staff.id)}
                      >
                        <View style={styles.staffItemLeft}>
                          <View
                            style={[
                              styles.staffAvatar,
                              staff.role === 'admin'
                                ? styles.staffAvatarAdmin
                                : styles.staffAvatarWorker,
                            ]}
                          >
                            <Text style={styles.staffAvatarText}>
                              {staff.fullName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.staffInfo}>
                            <Text style={styles.staffName}>{staff.fullName}</Text>
                            <Text style={styles.staffRole}>
                              {staff.role === 'admin' ? '👨‍💼 Admin' : '🔧 Worker'}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.staffCheckbox,
                            isSelected && styles.staffCheckboxSelected,
                          ]}
                        >
                          {isSelected && (
                            <CheckCircle color={colors.white} size={20} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={styles.assignModalActions}>
              <TouchableOpacity
                style={styles.assignCancelButton}
                onPress={() => setAssignModalVisible(false)}
              >
                <Text style={styles.assignCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.assignSaveButton}
                onPress={async () => {
                  await handleSaveAssignment();
                  Alert.alert(
                    "Success",
                    `Assigned ${selectedWorkerIds.length} staff member${selectedWorkerIds.length !== 1 ? 's' : ''} to this job`
                  );
                }}
              >
                <UserPlus color={colors.white} size={18} />
                <Text style={styles.assignSaveButtonText}>
                  Save ({selectedWorkerIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#DC143C",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  infoSection: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assignmentTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 12,
  },
  recipientsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recipientsLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  recipientsText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  buttonsRow: {
    flexDirection: "row" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assignButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFA726",
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.white,
  },
  assignedStaffPreview: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  assignedStaffPreviewLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    marginBottom: 8,
  },
  assignedStaffPreviewGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
  },
  assignedStaffPreviewItem: {
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  assignedStaffPreviewName: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyMessagesState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyMessagesText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
  messagesContainer: {
    gap: 16,
  },
  messageBoxContainer: {
    width: "100%",
    marginBottom: 4,
  },
  adminMessageBox: {
    alignItems: "flex-end",
  },
  userMessageBox: {
    alignItems: "flex-start",
    backgroundColor: colors.border,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary + "30",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: "85%",
  },
  adminMessage: {
    backgroundColor: colors.primary + "20",
    borderBottomRightRadius: 4,
  },
  userMessage: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 12,
  },
  messageSender: {
    fontSize: 11,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  adminSender: {
    color: colors.primary,
  },
  userSender: {
    color: colors.textSecondary,
  },
  messageTime: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  messageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  messageInputContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.5,
  },
  assignModalOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 20,
  },
  assignModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  assignModalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  assignModalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  assignModalCloseButton: {
    padding: 4,
  },
  staffListScroll: {
    maxHeight: 400,
    marginVertical: 16,
  },
  staffList: {
    gap: 12,
  },
  staffItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  staffItemSelected: {
    borderColor: "#FFA726",
    backgroundColor: "#FFA726" + "15",
  },
  staffItemLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  staffAvatarAdmin: {
    backgroundColor: colors.primary,
  },
  staffAvatarWorker: {
    backgroundColor: colors.success,
  },
  staffAvatarText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.white,
  },
  staffInfo: {
    flex: 1,
    gap: 4,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
  },
  staffRole: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  staffCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  staffCheckboxSelected: {
    backgroundColor: "#FFA726",
    borderColor: "#FFA726",
  },
  emptyStaffState: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 40,
  },
  emptyStaffText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textAlign: "center" as const,
  },
  assignModalActions: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 20,
  },
  assignCancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  assignCancelButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  assignSaveButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    padding: 16,
    backgroundColor: "#FFA726",
    borderRadius: 12,
  },
  assignSaveButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  actionButtons: {
    flexDirection: "row" as const,
    gap: 8,
  },
  acceptButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#22C55E",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.white,
  },
  declineButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#DC143C",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.white,
  },
});
