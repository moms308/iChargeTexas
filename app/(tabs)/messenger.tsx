import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useMessenger } from "@/constants/messengerContext";
import colors from "@/constants/colors";
import { Send, MessageCircle, Bell, Shield, Wrench, Crown, Camera, Image as ImageIcon, X, ArrowLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

export default function MessengerScreen() {
  const currentUser = null;
  const isAuthenticated = false;
  const allUsers: any[] = [];
  const {
    messages,
    notifications,
    sendMessage,
    markMessageAsRead,
    markNotificationAsRead,
  } = useMessenger();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  const [messageText, setMessageText] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "notifications">("messages");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  const staffMembers = useMemo(() => {
    return [];
  }, []);

  const filteredMentionSuggestions = useMemo(() => {
    if (!mentionSearchQuery) {
      return [
        { id: "everyone", fullName: "everyone", username: "everyone", role: "special" as any },
        ...staffMembers,
      ];
    }

    const query = mentionSearchQuery.toLowerCase();
    const filtered = staffMembers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
    );

    if ("everyone".includes(query)) {
      return [
        { id: "everyone", fullName: "everyone", username: "everyone", role: "special" as any },
        ...filtered,
      ];
    }

    return filtered;
  }, [mentionSearchQuery, staffMembers]);

  useEffect(() => {
    if (!currentUser) return;
    
    messages.forEach((msg) => {
      const shouldMarkAsRead =
        msg.senderId !== currentUser.id &&
        !msg.readBy.includes(currentUser.id) &&
        (msg.mentions?.includes(currentUser.id) || !msg.mentions);
      
      if (shouldMarkAsRead) {
        markMessageAsRead(msg.id, currentUser.id);
      }
    });
  }, [messages, currentUser]);

  useEffect(() => {
    if (activeTab === "notifications" && currentUser) {
      const unreadNotifs = notifications.filter(
        (n) => n.userId === currentUser.id && !n.read
      );
      unreadNotifs.forEach((notif) => {
        markNotificationAsRead(notif.id);
      });
    }
  }, [activeTab, notifications, currentUser]);

  if (!isAuthenticated || !currentUser) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyState}>
          <MessageCircle color={colors.textTertiary} size={64} />
          <Text style={styles.emptyTitle}>Staff Only</Text>
          <Text style={styles.emptyMessage}>
            You must be logged in as staff to access the messenger
          </Text>
        </View>
      </View>
    );
  }

  const isStaff =
    currentUser.role === "super_admin" ||
    currentUser.role === "admin" ||
    currentUser.role === "worker";

  if (!isStaff) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyState}>
          <Shield color={colors.error} size={64} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptyMessage}>
            Only staff members can access the messenger
          </Text>
        </View>
      </View>
    );
  }

  const handleSendMessage = async () => {
    if ((!messageText.trim() && selectedImages.length === 0) || !currentUser) return;

    try {
      await sendMessage(
        currentUser.id,
        currentUser.fullName,
        currentUser.role as "super_admin" | "admin" | "worker",
        messageText.trim() || "📷 Image",
        selectedImages.length > 0 ? selectedImages : undefined,
        allUsers.map(u => ({ id: u.id, fullName: u.fullName, username: u.username }))
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setMessageText("");
      setSelectedImages([]);
      setShowMentionSuggestions(false);
      setMentionSearchQuery("");
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } catch (error) {
      console.error("[Messenger] Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images" as const,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = result.assets[0].base64
          ? `data:image/jpeg;base64,${result.assets[0].base64}`
          : result.assets[0].uri;
        setSelectedImages((prev) => [...prev, base64Image]);
        
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      console.error("[Messenger] Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is needed to select images."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as const,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const base64Images = result.assets.map((asset) =>
          asset.base64
            ? `data:image/jpeg;base64,${asset.base64}`
            : asset.uri
        );
        setSelectedImages((prev) => [...prev, ...base64Images]);
        
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      console.error("[Messenger] Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);

    const lastAtIndex = text.lastIndexOf("@");
    if (lastAtIndex === -1) {
      setShowMentionSuggestions(false);
      setMentionSearchQuery("");
      return;
    }

    const textAfterAt = text.substring(lastAtIndex + 1);
    const hasSpaceAfter = textAfterAt.includes(" ");

    if (hasSpaceAfter) {
      const spaceIndex = textAfterAt.indexOf(" ");
      const textBeforeSpace = textAfterAt.substring(0, spaceIndex);
      setMentionSearchQuery(textBeforeSpace);
      setShowMentionSuggestions(false);
    } else {
      setMentionSearchQuery(textAfterAt);
      setShowMentionSuggestions(true);
      setSelectedSuggestionIndex(0);
    }
  };

  const handleSelectMention = (user: { id: string; fullName: string; username: string }) => {
    const lastAtIndex = messageText.lastIndexOf("@");
    if (lastAtIndex === -1) return;

    const beforeAt = messageText.substring(0, lastAtIndex);
    const afterAt = messageText.substring(lastAtIndex + 1);
    const afterMention = afterAt.includes(" ")
      ? afterAt.substring(afterAt.indexOf(" "))
      : "";

    const mentionText = user.username === "everyone" ? "everyone" : user.username;
    const newText = `${beforeAt}@${mentionText} ${afterMention}`;
    setMessageText(newText);
    setShowMentionSuggestions(false);
    setMentionSearchQuery("");

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin":
        return <Crown color="#FFD700" size={16} />;
      case "admin":
        return <Shield color={colors.primary} size={16} />;
      case "worker":
        return <Wrench color={colors.success} size={16} />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "#FFD700";
      case "admin":
        return colors.primary;
      case "worker":
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const userNotifications = notifications.filter(
    (n) => n.userId === currentUser.id
  );

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
        keyboardVerticalOffset={100}
      >
        <View style={[styles.tabContainer, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "messages" && styles.tabActive]}
            onPress={() => setActiveTab("messages")}
          >
            <MessageCircle
              color={activeTab === "messages" ? colors.white : colors.textSecondary}
              size={20}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "messages" && styles.tabTextActive,
              ]}
            >
              Messages
            </Text>
            {messages.filter(
              (msg) =>
                msg.senderId !== currentUser.id &&
                !msg.readBy.includes(currentUser.id) &&
                (msg.mentions?.includes(currentUser.id) || !msg.mentions)
            ).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {
                    messages.filter(
                      (msg) =>
                        msg.senderId !== currentUser.id &&
                        !msg.readBy.includes(currentUser.id) &&
                        (msg.mentions?.includes(currentUser.id) || !msg.mentions)
                    ).length
                  }
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "notifications" && styles.tabActive,
            ]}
            onPress={() => setActiveTab("notifications")}
          >
            <Bell
              color={
                activeTab === "notifications" ? colors.white : colors.textSecondary
              }
              size={20}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "notifications" && styles.tabTextActive,
              ]}
            >
              Notifications
            </Text>
            {userNotifications.filter((n) => !n.read).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {userNotifications.filter((n) => !n.read).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeMessengerButton}
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.back();
            }}
          >
            <X color={colors.white} size={40} strokeWidth={5} />
          </TouchableOpacity>
        </View>

        {activeTab === "messages" && (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyMessages}>
                  <MessageCircle color={colors.textTertiary} size={48} />
                  <Text style={styles.emptyMessagesText}>No messages yet</Text>
                  <Text style={styles.emptyMessagesSubtext}>
                    Start a conversation with your team
                  </Text>
                </View>
              ) : (
                <View style={styles.messagesList}>
                  {messages.map((msg) => {
                    const isOwnMessage = msg.senderId === currentUser.id;
                    const shouldShowMessage =
                      isOwnMessage ||
                      (msg.mentions?.includes(currentUser.id) || !msg.mentions);
                    const isUnread =
                      !isOwnMessage && !msg.readBy.includes(currentUser.id);
                    const isMentioned = msg.mentions?.includes(currentUser.id);

                    if (!shouldShowMessage) return null;

                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageContainer,
                          isOwnMessage && styles.ownMessageContainer,
                        ]}
                      >
                        <View
                          style={[
                            styles.messageBubble,
                            isOwnMessage
                              ? styles.ownMessageBubble
                              : styles.otherMessageBubble,
                            isUnread && styles.unreadMessage,
                          ]}
                        >
                          <View style={styles.messageHeader}>
                            <View style={styles.senderInfo}>
                              {getRoleIcon(msg.senderRole)}
                              <Text
                                style={[
                                  styles.senderName,
                                  { color: getRoleColor(msg.senderRole) },
                                ]}
                              >
                                {msg.senderName}
                              </Text>
                            </View>
                            <Text style={styles.messageTime}>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </View>
                          {isMentioned && (
                            <View style={styles.mentionBadge}>
                              <Text style={styles.mentionBadgeText}>@mentioned</Text>
                            </View>
                          )}
                          <Text style={styles.messageText}>{msg.text}</Text>
                          {msg.images && msg.images.length > 0 && (
                            <View style={styles.messageImagesContainer}>
                              {msg.images.map((imageUri, idx) => (
                                <TouchableOpacity
                                  key={`${msg.id}-img-${idx}`}
                                  style={styles.messageImageWrapper}
                                  onPress={() => {
                                    Alert.alert("Image", "Image preview", [
                                      { text: "OK" },
                                    ]);
                                  }}
                                >
                                  <Image
                                    source={{ uri: imageUri }}
                                    style={styles.messageImage}
                                    contentFit="cover"
                                  />
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                          {isUnread && (
                            <View style={styles.unreadIndicator}>
                              <Text style={styles.unreadIndicatorText}>NEW</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.inputContainer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <View style={styles.inputWrapper}>
                {selectedImages.length > 0 && (
                  <ScrollView
                    horizontal
                    style={styles.selectedImagesScroll}
                    contentContainerStyle={styles.selectedImagesContent}
                    showsHorizontalScrollIndicator={false}
                  >
                    {selectedImages.map((imageUri, index) => (
                      <View key={index} style={styles.selectedImageWrapper}>
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.selectedImage}
                          contentFit="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => handleRemoveImage(index)}
                        >
                          <X color={colors.white} size={24} strokeWidth={4} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
                <View style={styles.inputRow}>
                  <TouchableOpacity
                    style={styles.cameraButton}
                    onPress={handleTakePhoto}
                  >
                    <Camera color="#9C27B0" size={24} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={handlePickImage}
                  >
                    <ImageIcon color="#9C27B0" size={24} />
                  </TouchableOpacity>
                  <View style={styles.inputWithSuggestions}>
                    {showMentionSuggestions && filteredMentionSuggestions.length > 0 && (
                      <View style={styles.mentionSuggestionsContainer}>
                        <ScrollView
                          style={styles.mentionSuggestionsScroll}
                          contentContainerStyle={styles.mentionSuggestionsContent}
                          keyboardShouldPersistTaps="handled"
                        >
                          {filteredMentionSuggestions.map((user, index) => (
                            <TouchableOpacity
                              key={user.id}
                              style={[
                                styles.mentionSuggestionItem,
                                index === selectedSuggestionIndex &&
                                  styles.mentionSuggestionItemSelected,
                              ]}
                              onPress={() => handleSelectMention(user)}
                            >
                              <View style={styles.mentionSuggestionContent}>
                                <View style={styles.mentionSuggestionLeft}>
                                  {user.username === "everyone" ? (
                                    <View style={styles.everyoneIcon}>
                                      <Bell color={colors.white} size={16} />
                                    </View>
                                  ) : (
                                    getRoleIcon(user.role)
                                  )}
                                  <View style={styles.mentionSuggestionText}>
                                    <Text style={styles.mentionSuggestionName}>
                                      {user.fullName}
                                    </Text>
                                    <Text style={styles.mentionSuggestionUsername}>
                                      @{user.username}
                                    </Text>
                                  </View>
                                </View>
                                {index === selectedSuggestionIndex && (
                                  <View style={styles.selectedIndicator}>
                                    <Text style={styles.selectedIndicatorText}>↵</Text>
                                  </View>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                    <TextInput
                      style={styles.input}
                      value={messageText}
                      onChangeText={handleTextChange}
                      placeholder="Type a message to staff... Use @ to mention"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      maxLength={500}
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!messageText.trim() && selectedImages.length === 0) &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim() && selectedImages.length === 0}
                  >
                    <Send color={colors.white} size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === "notifications" && (
          <ScrollView
            style={styles.notificationsScroll}
            contentContainerStyle={styles.notificationsContent}
            showsVerticalScrollIndicator={false}
          >
            {userNotifications.length === 0 ? (
              <View style={styles.emptyMessages}>
                <Bell color={colors.textTertiary} size={48} />
                <Text style={styles.emptyMessagesText}>No notifications</Text>
                <Text style={styles.emptyMessagesSubtext}>
                  You&apos;ll see task assignments here
                </Text>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {userNotifications.map((notif) => (
                  <View
                    key={notif.id}
                    style={[
                      styles.notificationCard,
                      !notif.read && styles.unreadNotification,
                    ]}
                  >
                    <View style={styles.notificationHeader}>
                      <View
                        style={[
                          styles.notificationIcon,
                          notif.type === "task_assignment"
                            ? styles.taskIcon
                            : styles.messageIcon,
                        ]}
                      >
                        {notif.type === "task_assignment" ? (
                          <Shield color={colors.white} size={20} />
                        ) : (
                          <MessageCircle color={colors.white} size={20} />
                        )}
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>
                          {notif.title}
                        </Text>
                        <Text style={styles.notificationMessage}>
                          {notif.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {new Date(notif.timestamp).toLocaleString()}
                        </Text>
                      </View>
                      {!notif.read && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  closeMessengerButton: {
    position: "absolute" as const,
    top: 8,
    right: 12,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#DC143C",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 1000,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: "#9C27B0",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  tabBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  messagesScroll: {
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
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyMessagesText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.text,
    marginTop: 16,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  messagesList: {
    gap: 12,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  ownMessageContainer: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    position: "relative",
  },
  ownMessageBubble: {
    backgroundColor: "#9C27B0",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadMessage: {
    borderColor: "#9C27B0",
    borderWidth: 2,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  senderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "700" as const,
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
  unreadIndicator: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unreadIndicatorText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.white,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#9C27B0",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.5,
  },
  notificationsScroll: {
    flex: 1,
  },
  notificationsContent: {
    padding: 16,
    flexGrow: 1,
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadNotification: {
    borderColor: "#9C27B0",
    borderWidth: 2,
    backgroundColor: "#9C27B0" + "10",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  taskIcon: {
    backgroundColor: "#FFA726",
  },
  messageIcon: {
    backgroundColor: "#9C27B0",
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
  notificationBadge: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.white,
  },
  messageImagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  messageImageWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  messageImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9C27B0",
  },
  imageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9C27B0",
  },
  selectedImagesScroll: {
    marginBottom: 8,
  },
  selectedImagesContent: {
    gap: 8,
  },
  selectedImageWrapper: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DC143C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  mentionBadge: {
    backgroundColor: "#FF9800",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  mentionBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.white,
  },
  inputWithSuggestions: {
    flex: 1,
    position: "relative" as const,
  },
  mentionSuggestionsContainer: {
    position: "absolute" as const,
    bottom: "100%",
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: "#9C27B0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mentionSuggestionsScroll: {
    maxHeight: 240,
  },
  mentionSuggestionsContent: {
    padding: 4,
  },
  mentionSuggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  mentionSuggestionItemSelected: {
    backgroundColor: "#9C27B0" + "15",
  },
  mentionSuggestionContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  mentionSuggestionLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  mentionSuggestionText: {
    flex: 1,
  },
  mentionSuggestionName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 2,
  },
  mentionSuggestionUsername: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectedIndicator: {
    backgroundColor: "#9C27B0",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  selectedIndicatorText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: "700" as const,
  },
  everyoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
});
