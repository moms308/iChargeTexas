import { useService } from "@/constants/serviceContext";
import colors from "@/constants/colors";
import { ServiceRequest, Message } from "@/constants/types";
import { LinearGradient } from "expo-linear-gradient";
import {
  MessageSquare,
  Truck,
  BatteryCharging,
  MapPin,
  Calendar,
  Bell,
  Send,
} from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Modal,
} from "react-native";

import * as Haptics from "expo-haptics";

export default function MessagesScreen() {
  const { requests, isLoading, addMessage } = useService();
  const insets = useSafeAreaInsets();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [messageText, setMessageText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const [fullscreenInput, setFullscreenInput] = useState<{
    visible: boolean;
    value: string;
    placeholder: string;
  } | null>(null);

  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    setHasNotificationPermission(false);
  };

  const requestNotificationPermissions = async () => {
    setHasNotificationPermission(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (selectedRequest && messageText.trim()) {
      await addMessage(selectedRequest.id, messageText.trim(), "user");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setMessageText("");
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");

  const renderRequestCard = (request: ServiceRequest) => {
    const isSelected = selectedRequest?.id === request.id;
    const messages = request.messages || [];
    const hasMessages = messages.length > 0;
    const lastMessage = hasMessages ? messages[messages.length - 1] : null;

    return (
      <TouchableOpacity
        key={request.id}
        style={[styles.requestCard, isSelected && styles.requestCardSelected]}
        onPress={() => setSelectedRequest(request)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor:
                  request.type === "roadside"
                    ? colors.roadside + "20"
                    : colors.charging + "20",
              },
            ]}
          >
            {request.type === "roadside" ? (
              <Truck color={colors.roadside} size={20} />
            ) : (
              <BatteryCharging color={colors.charging} size={20} />
            )}
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {request.title}
            </Text>
            {lastMessage ? (
              <Text style={styles.lastMessagePreview} numberOfLines={1}>
                {lastMessage.sender === "admin" ? "Admin: " : "You: "}
                {lastMessage.text}
              </Text>
            ) : (
              <Text style={styles.noMessages}>No messages yet</Text>
            )}
          </View>
          {hasMessages && (
            <View style={styles.messageBadge}>
              <Text style={styles.messageBadgeText}>{messages.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderConversation = () => {
    if (!selectedRequest) {
      return (
        <View style={styles.noSelectionState}>
          <MessageSquare color={colors.textTertiary} size={64} />
          <Text style={styles.noSelectionTitle}>Select a Request</Text>
          <Text style={styles.noSelectionMessage}>
            Choose a pending service request to view and send messages
          </Text>
        </View>
      );
    }

    const messages = selectedRequest.messages || [];

    return (
      <KeyboardAvoidingView 
        style={styles.conversationContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.conversationHeader, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.conversationHeaderLeft}>
            <View
              style={[
                styles.smallIconContainer,
                {
                  backgroundColor:
                    selectedRequest.type === "roadside"
                      ? colors.roadside + "20"
                      : colors.charging + "20",
                },
              ]}
            >
              {selectedRequest.type === "roadside" ? (
                <Truck color={colors.roadside} size={16} />
              ) : (
                <BatteryCharging color={colors.charging} size={16} />
              )}
            </View>
            <View>
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {selectedRequest.title}
              </Text>
              <View style={styles.locationBadge}>
                <MapPin size={10} color={colors.textTertiary} />
                <Text style={styles.locationText}>
                  {selectedRequest.location.latitude.toFixed(4)}°, {selectedRequest.location.longitude.toFixed(4)}°
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedRequest(null)}
          >
            <Text style={styles.backButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesScrollView}
          contentContainerStyle={styles.messagesScrollContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyConversation}>
              <MessageSquare color={colors.textTertiary} size={48} />
              <Text style={styles.emptyConversationText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            messages.map((msg: Message) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.sender === "user" ? styles.userMessage : styles.adminMessage,
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text
                    style={[
                      styles.messageSender,
                      msg.sender === "user" ? styles.userSender : styles.adminSender,
                    ]}
                  >
                    {msg.sender === "user" ? "You" : "Admin"}
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
            ))
          )}
        </ScrollView>

        <View style={[styles.messageInputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.messageInput}
            onPress={() =>
              setFullscreenInput({
                visible: true,
                value: messageText,
                placeholder: "Type your message...",
              })
            }
          >
            <Text style={[styles.messageInputText, !messageText && styles.messageInputPlaceholder]}>
              {messageText || "Type your message..."}
            </Text>
          </TouchableOpacity>
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
    );
  };

  const renderFullscreenInput = () => (
    <Modal
      visible={fullscreenInput?.visible || false}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setFullscreenInput(null)}
    >
      <KeyboardAvoidingView
        style={styles.fullscreenModal}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.fullscreenHeader, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity
            style={styles.fullscreenCancelButton}
            onPress={() => setFullscreenInput(null)}
          >
            <Text style={styles.fullscreenCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.fullscreenTitle}>Message</Text>
          <TouchableOpacity
            style={styles.fullscreenDoneButton}
            onPress={() => {
              if (fullscreenInput) {
                setMessageText(fullscreenInput.value);
              }
              setFullscreenInput(null);
            }}
          >
            <Text style={styles.fullscreenDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.fullscreenInput}
          value={fullscreenInput?.value || ""}
          onChangeText={(text) =>
            setFullscreenInput((prev) => (prev ? { ...prev, value: text } : null))
          }
          placeholder={fullscreenInput?.placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          autoFocus
          textAlignVertical="top"
        />
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.gradient}
      >
        {!hasNotificationPermission && Platform.OS !== 'web' && (
          <View style={styles.permissionBanner}>
            <View style={styles.permissionContent}>
              <Bell color={colors.warning} size={20} />
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>Enable Notifications</Text>
                <Text style={styles.permissionSubtitle}>
                  Get instant updates when admins send you messages
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.enableButton}
              onPress={requestNotificationPermissions}
            >
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.contentContainer}>
          {selectedRequest ? (
            renderConversation()
          ) : (
            <View style={styles.listContainer}>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                  />
                }
              >
                <View style={styles.header}>
                  <MessageSquare color={colors.primary} size={24} />
                  <Text style={styles.headerTitle}>Messages</Text>
                </View>

                <Text style={styles.headerDescription}>
                  Chat with our team about your pending service requests
                </Text>

                {isLoading ? (
                  <View style={styles.loadingState}>
                    <Text style={styles.loadingText}>Loading messages...</Text>
                  </View>
                ) : pendingRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                      <MessageSquare color={colors.textTertiary} size={48} />
                    </View>
                    <Text style={styles.emptyTitle}>No Pending Requests</Text>
                    <Text style={styles.emptyMessage}>
                      You'll be able to message our team once you have a pending service request
                    </Text>
                  </View>
                ) : (
                  <View style={styles.requestsContainer}>
                    <Text style={styles.sectionTitle}>
                      Pending Requests ({pendingRequests.length})
                    </Text>
                    {pendingRequests.map(renderRequestCard)}
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
        {renderFullscreenInput()}
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
  permissionBanner: {
    backgroundColor: colors.warning + "15",
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + "30",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  permissionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 2,
  },
  permissionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  enableButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.white,
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: colors.text,
  },
  headerDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  requestsContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  requestCardSelected: {
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 4,
  },
  lastMessagePreview: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  noMessages: {
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  messageBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.white,
  },
  noSelectionState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noSelectionTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  noSelectionMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  conversationContainer: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  conversationHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  smallIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 2,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  messagesScrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesScrollContent: {
    padding: 16,
    gap: 12,
  },
  emptyConversation: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyConversationText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: "80%",
    marginBottom: 8,
  },
  userMessage: {
    backgroundColor: colors.primary + "20",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  adminMessage: {
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
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
    textTransform: "uppercase",
  },
  userSender: {
    color: colors.primary,
  },
  adminSender: {
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
  messageInputText: {
    fontSize: 14,
    color: colors.text,
  },
  messageInputPlaceholder: {
    color: colors.textTertiary,
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  fullscreenCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  fullscreenCancelText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: "600" as const,
  },
  fullscreenDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  fullscreenDoneText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700" as const,
  },
  fullscreenInput: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    padding: 20,
    textAlignVertical: "top",
  },
});
