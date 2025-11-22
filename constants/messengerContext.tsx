import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StaffMessage, StaffNotification } from "./types";
import { Platform } from "react-native";

const MESSAGES_STORAGE_KEY = "@staff_messages";
const NOTIFICATIONS_STORAGE_KEY = "@staff_notifications";

export const [MessengerContext, useMessenger] = createContextHook(() => {
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    loadNotifications();
  }, []);

  const loadMessages = async () => {
    try {
      const stored = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
      if (stored && stored !== 'null' && stored !== 'undefined' && typeof stored === 'string') {
        let parsed;
        try {
          parsed = JSON.parse(stored);
          setMessages(Array.isArray(parsed) ? parsed : []);
        } catch (parseError) {
          console.error("[Messenger] Error parsing messages JSON:", parseError, "Raw data:", stored.substring(0, 100));
          await AsyncStorage.removeItem(MESSAGES_STORAGE_KEY);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("[Messenger] Error loading messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored && stored !== 'null' && stored !== 'undefined' && typeof stored === 'string') {
        let parsed;
        try {
          parsed = JSON.parse(stored);
          setNotifications(Array.isArray(parsed) ? parsed : []);
        } catch (parseError) {
          console.error("[Messenger] Error parsing notifications JSON:", parseError, "Raw data:", stored.substring(0, 100));
          await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
          setNotifications([]);
        }
      }
    } catch (error) {
      console.error("[Messenger] Error loading notifications:", error);
    }
  };

  const sendMessage = useCallback(
    async (
      senderId: string,
      senderName: string,
      senderRole: "super_admin" | "admin" | "worker",
      text: string,
      images?: string[],
      allUsers?: { id: string; fullName: string; username: string }[]
    ) => {
      const mentionPattern = /@([\w]+)/g;
      const mentionMatches = Array.from(text.matchAll(mentionPattern));
      const mentionedUserIds: string[] = [];
      let isEveryoneMentioned = false;

      if (mentionMatches.length > 0 && allUsers) {
        mentionMatches.forEach((match) => {
          const mentionText = match[1].toLowerCase();
          
          if (mentionText === "everyone") {
            isEveryoneMentioned = true;
            const staffUsers = allUsers.filter(
              (u) =>
                u.id !== senderId &&
                (u as any).role &&
                ((u as any).role === "super_admin" ||
                  (u as any).role === "admin" ||
                  (u as any).role === "worker")
            );
            staffUsers.forEach((user) => {
              if (!mentionedUserIds.includes(user.id)) {
                mentionedUserIds.push(user.id);
              }
            });
          } else {
            const matchedUser = allUsers.find(
              (u) =>
                u.username.toLowerCase() === mentionText ||
                u.fullName.toLowerCase().includes(mentionText) ||
                u.fullName.toLowerCase().replace(/\s+/g, "") === mentionText
            );
            if (matchedUser && !mentionedUserIds.includes(matchedUser.id)) {
              mentionedUserIds.push(matchedUser.id);
            }
          }
        });
      }

      const newMessage: StaffMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId,
        senderName,
        senderRole,
        text,
        timestamp: new Date().toISOString(),
        readBy: [senderId],
        images: images && images.length > 0 ? images : undefined,
        mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      };

      setMessages((prevMessages) => {
        const updated = [newMessage, ...prevMessages];
        AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });



      return newMessage;
    },
    []
  );

  const markMessageAsRead = useCallback(
    async (messageId: string, userId: string) => {
      setMessages((prevMessages) => {
        const updated = prevMessages.map((msg) => {
          if (msg.id === messageId && !msg.readBy.includes(userId)) {
            return { ...msg, readBy: [...msg.readBy, userId] };
          }
          return msg;
        });
        AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const addNotification = useCallback(
    async (notification: Omit<StaffNotification, "id" | "timestamp" | "read">) => {
      const newNotification: StaffNotification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setNotifications((prevNotifications) => {
        const updated = [newNotification, ...prevNotifications];
        AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });



      return newNotification;
    },
    []
  );

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      setNotifications((prevNotifications) => {
        const updated = prevNotifications.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        );
        AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const clearNotifications = useCallback(
    async (userId: string) => {
      setNotifications((prevNotifications) => {
        const updated = prevNotifications.filter((notif) => notif.userId !== userId);
        AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const getUnreadCount = useCallback(
    (userId: string) => {
      const unreadMessages = messages.filter(
        (msg) =>
          msg.senderId !== userId &&
          !msg.readBy.includes(userId) &&
          (msg.mentions?.includes(userId) || !msg.mentions)
      ).length;
      const unreadNotifications = notifications.filter(
        (notif) => notif.userId === userId && !notif.read
      ).length;
      return unreadMessages + unreadNotifications;
    },
    [messages, notifications]
  );

  return useMemo(
    () => ({
      messages,
      notifications,
      isLoading,
      sendMessage,
      markMessageAsRead,
      addNotification,
      markNotificationAsRead,
      clearNotifications,
      getUnreadCount,
    }),
    [
      messages,
      notifications,
      isLoading,
      sendMessage,
      markMessageAsRead,
      addNotification,
      markNotificationAsRead,
      clearNotifications,
      getUnreadCount,
    ]
  );
});
