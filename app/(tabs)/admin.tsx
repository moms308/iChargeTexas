import { useService } from "@/constants/serviceContext";
import { useUser } from "@/constants/userContext";
import { useAuth } from "@/constants/authContext";

import { useMessenger } from "@/constants/messengerContext";
import { SystemUser } from "@/constants/types";
import colors from "@/constants/colors";
import { ServiceRequest, Message } from "@/constants/types";
import { createStripeInvoice } from "@/constants/stripe";
import { generateText } from "@rork-ai/toolkit-sdk";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import {
  Truck,
  BatteryCharging,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  LogOut,
  Copy,
  Trash2,
  MessageSquare,
  Send,
  X,
  RefreshCw,
  Navigation,
  Phone,
  Mail,
  Archive,
  Download,
  Share2,
  FileText,
  CreditCard,
  Users as UsersIcon,
  UserPlus,
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
  Linking,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterType = "all" | "pending" | "scheduled" | "completed" | "canceled";
type AdminTab = "active" | "archive";

export default function AdminScreen() {
  const { requests, deleteRequest, updateRequestStatus, updateRequestNote, updateRequestReason, addMessage, errors, resetErrors, createTestInvoice, updateRequestAssignedStaff } = useService();
  const { addNotification, messages: staffMessages } = useMessenger();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [adminTab, setAdminTab] = useState<AdminTab>("active");
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState<boolean>(false);
  const [messagesModalVisible, setMessagesModalVisible] = useState<boolean>(false);
  const [conversationListVisible, setConversationListVisible] = useState<boolean>(false);
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [deleteReason, setDeleteReason] = useState<string>("");
  const [appError, setAppError] = useState<Error | null>(null);
  const [fullscreenInput, setFullscreenInput] = useState<{
    visible: boolean;
    value: string;
    placeholder: string;
    label: string;
    type: "note" | "message" | "cancel";
  } | null>(null);
  const [stripeApiModalVisible, setStripeApiModalVisible] = useState<boolean>(false);
  const [stripeApiKey, setStripeApiKey] = useState<string>("");
  const [isTestingStripe, setIsTestingStripe] = useState<boolean>(false);
  const [assignModalVisible, setAssignModalVisible] = useState<boolean>(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [fullscreenAssignment, setFullscreenAssignment] = useState<ServiceRequest | null>(null);
  const [assignmentMessengerVisible, setAssignmentMessengerVisible] = useState<boolean>(false);
  const [assignmentMessengerRequest, setAssignmentMessengerRequest] = useState<ServiceRequest | null>(null);
  const [assignmentMessageText, setAssignmentMessageText] = useState<string>("");

  const { logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  };

  const handleOpenUserManagement = () => {
    router.push("/user-management");
  };

  const handleDeleteAllMessages = () => {
    const requestsWithMessages = requests.filter(
      (r) => r.messages && r.messages.length > 0
    );

    if (requestsWithMessages.length === 0) {
      Alert.alert(
        "No Messages",
        "There are no messages to delete."
      );
      return;
    }

    const totalMessages = requestsWithMessages.reduce(
      (total, r) => total + (r.messages?.length || 0),
      0
    );

    Alert.alert(
      "Delete All Messages",
      `This will permanently delete ${totalMessages} message${totalMessages > 1 ? 's' : ''} from ${requestsWithMessages.length} request${requestsWithMessages.length > 1 ? 's' : ''}. This action cannot be undone.\n\nAre you sure you want to proceed?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete All Messages",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("[Admin] Deleting all messages from", requestsWithMessages.length, "requests");

              const updatedRequests = requests.map((request) => ({
                ...request,
                messages: [],
              }));

              const STORAGE_KEY = "@ev_service_requests";
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));
              queryClient.setQueryData(["serviceRequests"], updatedRequests);

              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }

              Alert.alert(
                "✅ Messages Deleted",
                `Successfully deleted ${totalMessages} message${totalMessages > 1 ? 's' : ''} from all requests.`
              );

              console.log("[Admin] All messages deleted successfully");
            } catch (error) {
              console.error("[Admin] Error deleting all messages:", error);
              Alert.alert("Error", "Failed to delete messages. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleCancelAllOrders = () => {
    const activeRequests = requests.filter((r) => r.status === "pending" || r.status === "scheduled");
    
    if (activeRequests.length === 0) {
      Alert.alert(
        "No Active Orders",
        "There are no pending or scheduled orders to cancel."
      );
      return;
    }

    Alert.alert(
      "Cancel All Active Orders",
      `This will permanently delete ${activeRequests.length} active order${activeRequests.length > 1 ? 's' : ''}. This action cannot be undone.\n\nAre you sure you want to proceed?`,
      [
        {
          text: "Go Back",
          style: "cancel",
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("[Admin] Deleting all active orders:", activeRequests.length);
              console.log("[Admin] Active requests to delete:", activeRequests.map(r => ({ id: r.id, status: r.status })));
              
              const requestIds = activeRequests.map(r => r.id);
              
              for (const request of activeRequests) {
                await updateRequestReason(
                  request.id,
                  'cancel',
                  'Bulk cancellation and deletion by admin'
                );
                
                await addMessage(
                  request.id,
                  `Request canceled and deleted by Admin. Reason: Bulk deletion`,
                  "admin"
                );
              }
              
              const remainingRequests = requests.filter(r => !requestIds.includes(r.id));
              console.log("[Admin] Remaining requests after deletion:", remainingRequests.map(r => ({ id: r.id, status: r.status })));
              
              const STORAGE_KEY = "@ev_service_requests";
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remainingRequests));
              queryClient.setQueryData(["serviceRequests"], remainingRequests);

              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }

              Alert.alert(
                "✅ Orders Deleted",
                `Successfully deleted ${activeRequests.length} order${activeRequests.length > 1 ? 's' : ''}.`
              );

              console.log("[Admin] All active orders deleted successfully");
            } catch (error) {
              console.error("[Admin] Error deleting all orders:", error);
              Alert.alert("Error", "Failed to delete all orders. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleCopyCoordinates = async (request: ServiceRequest) => {
    const coordinates = `${request.location.latitude.toFixed(6)}, ${request.location.longitude.toFixed(6)}`;
    await Clipboard.setStringAsync(coordinates);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Copied!", "Grid coordinates copied to clipboard");
  };

  const handleCopyAddress = async (address: string) => {
    await Clipboard.setStringAsync(address);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Copied!", "Address copied to clipboard");
  };

  const handleNavigateToCoordinates = async (request: ServiceRequest) => {
    const { latitude, longitude } = request.location;
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
      default: `https://maps.apple.com/?daddr=${latitude},${longitude}`,
    });

    try {
      const supported = await Linking.canOpenURL(url!);
      if (supported) {
        await Linking.openURL(url!);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        Alert.alert("Error", "Unable to open maps application");
      }
    } catch (error) {
      console.error("Error opening maps:", error);
      Alert.alert("Error", "Failed to open navigation");
    }
  };

  const handleNavigateToAddress = async (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps://app?daddr=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
      default: `https://maps.apple.com/?address=${encodedAddress}`,
    });

    try {
      const supported = await Linking.canOpenURL(url!);
      if (supported) {
        await Linking.openURL(url!);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        Alert.alert("Error", "Unable to open maps application");
      }
    } catch (error) {
      console.error("Error opening maps:", error);
      Alert.alert("Error", "Failed to open navigation");
    }
  };

  const handleNavigateToCurrentLocation = async (latitude: number, longitude: number) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
      default: `https://maps.apple.com/?daddr=${latitude},${longitude}`,
    });

    try {
      const supported = await Linking.canOpenURL(url!);
      if (supported) {
        await Linking.openURL(url!);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        Alert.alert("Error", "Unable to open maps application");
      }
    } catch (error) {
      console.error("Error opening maps:", error);
      Alert.alert("Error", "Failed to open navigation");
    }
  };

  const [geocodedCoordinates, setGeocodedCoordinates] = React.useState<{
    [requestId: string]: { latitude: number; longitude: number } | null;
  }>({});

  const [translatedRequests, setTranslatedRequests] = React.useState<{
    [requestId: string]: {
      name?: string;
      title?: string;
      description?: string;
      vehicleInfo?: string;
      isTranslating: boolean;
      originalLanguage?: string;
    };
  }>({});

  const geocodeAddress = async (address: string, requestId: string) => {
    try {
      console.log('[Admin] Geocoding address:', address);
      const geocodedLocations = await Location.geocodeAsync(address);
      
      if (geocodedLocations && geocodedLocations.length > 0) {
        const location = geocodedLocations[0];
        console.log('[Admin] Geocoded coordinates:', location);
        const coords = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        setGeocodedCoordinates(prev => ({ ...prev, [requestId]: coords }));
        return coords;
      } else {
        console.log('[Admin] No geocoded results found');
        setGeocodedCoordinates(prev => ({ ...prev, [requestId]: null }));
        return null;
      }
    } catch (error) {
      console.error('[Admin] Geocoding error:', error);
      setGeocodedCoordinates(prev => ({ ...prev, [requestId]: null }));
      return null;
    }
  };

  const translateRequestToEnglish = async (request: ServiceRequest) => {
    if (translatedRequests[request.id]) {
      return;
    }

    setTranslatedRequests(prev => ({
      ...prev,
      [request.id]: { isTranslating: true },
    }));

    try {
      console.log('[Admin] Translating request:', request.id);
      
      const textToTranslate = `Name: ${request.name}\nTitle: ${request.title}\nDescription: ${request.description}\nVehicle Info: ${request.vehicleInfo || 'N/A'}`;
      
      const translatedText = await generateText({
        messages: [
          {
            role: "user",
            content: `You are a professional translator. Detect the language of the following service request and translate it to English. If it's already in English, return the original text. Return the translation in this exact format:\n\nName: [translated name]\nTitle: [translated title]\nDescription: [translated description]\nVehicle Info: [translated vehicle info]\nOriginal Language: [language code like 'es', 'en', 'fr', etc.]\n\nText to translate:\n${textToTranslate}`,
          },
        ],
      });

      const lines = translatedText.split('\n');
      const translation: any = { isTranslating: false };
      
      for (const line of lines) {
        if (line.startsWith('Name:')) {
          translation.name = line.replace('Name:', '').trim();
        } else if (line.startsWith('Title:')) {
          translation.title = line.replace('Title:', '').trim();
        } else if (line.startsWith('Description:')) {
          translation.description = line.replace('Description:', '').trim();
        } else if (line.startsWith('Vehicle Info:')) {
          translation.vehicleInfo = line.replace('Vehicle Info:', '').trim();
        } else if (line.startsWith('Original Language:')) {
          translation.originalLanguage = line.replace('Original Language:', '').trim();
        }
      }

      console.log('[Admin] Translation complete:', translation);
      setTranslatedRequests(prev => ({
        ...prev,
        [request.id]: translation,
      }));
    } catch (error) {
      console.error('[Admin] Translation error:', error);
      setTranslatedRequests(prev => ({
        ...prev,
        [request.id]: { isTranslating: false },
      }));
    }
  };

  const handleDelete = (request: ServiceRequest) => {
    Alert.alert(
      "Cancel or Delete Request",
      `What would you like to do with this ${request.type} request?`,
      [
        { text: "Go Back", style: "cancel" },
        {
          text: "Cancel Request",
          onPress: () => {
            setSelectedRequest(request);
            setCancelModalVisible(true);
          },
        },
        {
          text: "Delete Request",
          style: "destructive",
          onPress: () => {
            setSelectedRequest(request);
            setDeleteModalVisible(true);
          },
        },
      ]
    );
  };

  const toggleExpanded = async (id: string) => {
    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);
    
    if (newExpandedId !== null) {
      const request = requests.find(r => r.id === newExpandedId);
      if (request) {
        if (request.location.address && !geocodedCoordinates[newExpandedId]) {
          await geocodeAddress(request.location.address, newExpandedId);
        }
        if (!translatedRequests[newExpandedId] || !translatedRequests[newExpandedId].name) {
          await translateRequestToEnglish(request);
        }
      }
    }
  };

  const handleOpenNoteModal = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setNoteText(request.adminNote || "");
    setNoteModalVisible(true);
  };

  const handleOpenMessagesModal = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setMessagesModalVisible(true);
    setConversationListVisible(false);
  };

  const handleOpenConversationList = () => {
    const requestsWithMessages = requests.filter(
      (r) => r.messages && r.messages.length > 0
    );
    if (requestsWithMessages.length > 0) {
      setConversationListVisible(true);
    } else {
      Alert.alert(
        "No Messages",
        "There are no messages from any requests yet."
      );
    }
  };

  const handleCloseConversationList = () => {
    setConversationListVisible(false);
  };

  const handleCloseMessagesModal = () => {
    setMessagesModalVisible(false);
    setSelectedRequest(null);
    setMessageText("");
  };

  const handleSendMessage = async () => {
    if (selectedRequest && messageText.trim()) {
      await addMessage(selectedRequest.id, messageText.trim(), "admin");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setMessageText("");
    }
  };

  const handleSaveNote = async () => {
    if (selectedRequest) {
      await updateRequestNote(selectedRequest.id, noteText);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Success",
        "Note saved and notification sent to user"
      );
      setNoteModalVisible(false);
      setSelectedRequest(null);
      setNoteText("");
    }
  };

  const handleCloseNoteModal = () => {
    setNoteModalVisible(false);
    setSelectedRequest(null);
    setNoteText("");
  };

  const handleOpenCancelModal = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setCancelModalVisible(true);
  };

  const handleCloseCancelModal = () => {
    setCancelModalVisible(false);
    setSelectedRequest(null);
    setCancelReason("");
  };

  const handleOpenDeleteModal = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setDeleteModalVisible(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalVisible(false);
    setSelectedRequest(null);
    setDeleteReason("");
  };

  const handleOpenAssignModal = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setSelectedWorkerIds(request.assignedStaff || []);
    setAssignModalVisible(true);
  };

  const handleCloseAssignModal = () => {
    setAssignModalVisible(false);
    setSelectedRequest(null);
    setSelectedWorkerIds([]);
  };

  const handleToggleWorker = (userId: string) => {
    if (selectedWorkerIds.includes(userId)) {
      setSelectedWorkerIds(selectedWorkerIds.filter(id => id !== userId));
    } else {
      setSelectedWorkerIds([...selectedWorkerIds, userId]);
    }
  };

  const handleOpenAssignmentMessenger = (request: ServiceRequest) => {
    setAssignmentMessengerRequest(request);
    setAssignmentMessengerVisible(true);
  };

  const handleCloseAssignmentMessenger = () => {
    setAssignmentMessengerVisible(false);
    setAssignmentMessengerRequest(null);
    setAssignmentMessageText("");
  };

  const handleOpenInvoiceModal = (request: ServiceRequest) => {
    router.push(`/invoice-detail?id=${request.id}`);
  };

  const handleSendAssignmentMessage = async () => {
    if (!assignmentMessengerRequest || !assignmentMessageText.trim()) return;

    await addMessage(
      assignmentMessengerRequest.id,
      assignmentMessageText.trim(),
      "admin"
    );

    if (assignmentMessengerRequest.assignedStaff && assignmentMessengerRequest.assignedStaff.length > 0) {
      for (const staffId of assignmentMessengerRequest.assignedStaff) {
        const staff = availableStaff.find(s => s.id === staffId);
        if (staff) {
          await addNotification({
            userId: staffId,
            type: 'message',
            title: `💬 New Message: ${assignmentMessengerRequest.title}`,
            message: assignmentMessageText.trim(),
            relatedId: assignmentMessengerRequest.id,
          });
        }
      }
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setAssignmentMessageText("");
    Alert.alert(
      "Message Sent",
      "Message sent to customer and all assigned staff members"
    );
  };

  const handleSaveAssignment = async () => {
    if (selectedRequest) {
      await updateRequestAssignedStaff(selectedRequest.id, selectedWorkerIds);
      
      for (const staffId of selectedWorkerIds) {
        const staff = availableStaff.find(s => s.id === staffId);
        if (staff) {
          await addNotification({
            userId: staffId,
            type: 'task_assignment',
            title: '📋 New Task Assignment',
            message: `You have been assigned to: ${selectedRequest.title}`,
            relatedId: selectedRequest.id,
          });
        }
      }
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Success",
        `Assigned ${selectedWorkerIds.length} staff member${selectedWorkerIds.length !== 1 ? 's' : ''} to this job and sent notifications`
      );
      handleCloseAssignModal();
    }
  };

  const [availableStaff, setAvailableStaff] = React.useState<SystemUser[]>([]);

  const handleConfirmCancel = async () => {
    if (!selectedRequest || !cancelReason.trim()) {
      Alert.alert("Required", "Please enter a reason for cancellation");
      return;
    }

    try {
      console.log("[Admin] Canceling request:", selectedRequest.id, "Reason:", cancelReason.trim());
      
      await updateRequestReason(
        selectedRequest.id,
        'cancel',
        cancelReason.trim()
      );
      
      await updateRequestNote(
        selectedRequest.id,
        `Cancellation Reason: ${cancelReason.trim()}`
      );
      
      updateRequestStatus(selectedRequest.id, "canceled");
      
      await addMessage(
        selectedRequest.id,
        `Request canceled by Admin. Reason: ${cancelReason.trim()}`,
        "admin"
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        "Request Canceled",
        "The request has been canceled and the user has been notified."
      );

      console.log("[Admin] Request canceled successfully:", selectedRequest.id);
      handleCloseCancelModal();
    } catch (error) {
      console.error("[Admin] Error canceling request:", error);
      Alert.alert("Error", "Failed to cancel request. Please try again.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRequest || !deleteReason.trim()) {
      Alert.alert("Required", "Please enter a reason for deletion");
      return;
    }

    try {
      console.log("[Admin] Deleting request:", selectedRequest.id, "Reason:", deleteReason.trim());
      
      await updateRequestReason(
        selectedRequest.id,
        'delete',
        deleteReason.trim()
      );
      
      updateRequestStatus(selectedRequest.id, "canceled");
      
      await addMessage(
        selectedRequest.id,
        `Request deleted by Admin. Reason: ${deleteReason.trim()}`,
        "admin"
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        "Request Deleted",
        "The request has been archived with deletion reason."
      );

      console.log("[Admin] Request deleted successfully:", selectedRequest.id);
      handleCloseDeleteModal();
    } catch (error) {
      console.error("[Admin] Error deleting request:", error);
      Alert.alert("Error", "Failed to delete request. Please try again.");
    }
  };

  const generateArchiveReport = (archiveRequests: ServiceRequest[]): string => {
    const timestamp = new Date().toLocaleString();
    const totalCompleted = archiveRequests.filter(r => r.status === "completed").length;
    const totalCanceled = archiveRequests.filter(r => r.status === "canceled").length;
    
    let report = `SERVICE REQUESTS ARCHIVE REPORT\n`;
    report += `====================================\n\n`;
    report += `Generated: ${timestamp}\n`;
    report += `iCharge Texas - Admin Panel\n`;
    report += `Email: ichargetexas@gmail.com\n\n`;
    
    report += `SUMMARY\n`;
    report += `-------\n`;
    report += `Total Archived Requests: ${archiveRequests.length}\n`;
    report += `Completed: ${totalCompleted}\n`;
    report += `Canceled: ${totalCanceled}\n\n`;
    
    report += `DETAILED RECORDS\n`;
    report += `================\n\n`;
    
    archiveRequests.forEach((request, index) => {
      report += `[${index + 1}] ${request.title}\n`;
      report += `${"-".repeat(50)}\n`;
      report += `Request ID: ${request.id}\n`;
      report += `Status: ${request.status.toUpperCase()}\n`;
      report += `Service Type: ${request.type === 'roadside' ? 'Roadside Assistance' : 'EV Charging'}\n`;
      report += `Created: ${new Date(request.createdAt).toLocaleString()}\n\n`;
      
      report += `Customer Information:\n`;
      report += `  Name: ${request.name}\n`;
      report += `  Phone: ${request.phone}\n`;
      report += `  Email: ${request.email}\n\n`;
      
      report += `Service Details:\n`;
      report += `  Description: ${request.description}\n`;
      if (request.vehicleInfo) {
        report += `  Vehicle: ${request.vehicleInfo}\n`;
      }
      report += `  Spare Tire Available: ${request.hasSpareTire ? 'Yes' : 'No'}\n\n`;
      
      report += `Location:\n`;
      report += `  GPS Coordinates: ${request.location.latitude.toFixed(6)}, ${request.location.longitude.toFixed(6)}\n`;
      if (request.location.address) {
        report += `  Address: ${request.location.address}\n`;
      }
      if (request.location.currentLocationCoordinates) {
        report += `  Current Location: ${request.location.currentLocationCoordinates.latitude.toFixed(6)}, ${request.location.currentLocationCoordinates.longitude.toFixed(6)}\n`;
      }
      report += `\n`;
      
      if (request.preferredDate || request.preferredTime) {
        report += `Scheduling:\n`;
        if (request.preferredDate) report += `  Date: ${request.preferredDate}\n`;
        if (request.preferredTime) report += `  Time: ${request.preferredTime}\n`;
        report += `\n`;
      }
      
      if (request.adminNote) {
        report += `Admin Note:\n`;
        report += `  ${request.adminNote}\n\n`;
      }
      
      if (request.cancelReason) {
        report += `Cancellation Reason:\n`;
        report += `  ${request.cancelReason}\n\n`;
      }
      
      if (request.deleteReason) {
        report += `Deletion Reason:\n`;
        report += `  ${request.deleteReason}\n\n`;
      }
      
      if (request.messages && request.messages.length > 0) {
        report += `Messages (${request.messages.length}):\n`;
        request.messages.forEach((msg) => {
          report += `  [${new Date(msg.timestamp).toLocaleString()}] ${msg.sender === 'admin' ? 'Admin' : 'Customer'}:\n`;
          report += `  ${msg.text}\n\n`;
        });
      }
      
      report += `\n`;
    });
    
    report += `\n====================================\n`;
    report += `End of Report\n`;
    report += `Generated by iCharge Texas Admin Panel\n`;
    
    return report;
  };

  const handleResetErrors = async () => {
    setAppError(null);
    setExpandedId(null);
    setNoteModalVisible(false);
    setMessagesModalVisible(false);
    setSelectedRequest(null);
    setNoteText("");
    setMessageText("");
    
    await resetErrors();
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    Alert.alert(
      "Errors Cleared",
      "All error states have been reset. The app should be back to normal.",
      [{ text: "OK" }]
    );
    
    console.log("[Admin] Error states cleared");
  };

  const filteredRequests = requests.filter((req) => {
    if (adminTab === "archive") {
      return req.status === "completed" || req.status === "canceled";
    }
    
    if (adminTab === "active") {
      if (filter === "all") return req.status === "pending" || req.status === "scheduled";
      return req.status === filter;
    }
    
    return false;
  });

  const sortedRequests = [...filteredRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getStatusConfig = (status: ServiceRequest["status"]) => {
    switch (status) {
      case "pending":
        return {
          icon: AlertCircle,
          color: colors.warning,
          bgColor: colors.warning + "20",
          label: "Pending",
        };
      case "scheduled":
        return {
          icon: Calendar,
          color: colors.primary,
          bgColor: colors.primary + "20",
          label: "Scheduled",
        };
      case "completed":
        return {
          icon: CheckCircle,
          color: colors.success,
          bgColor: colors.success + "20",
          label: "Completed",
        };
      case "canceled":
        return {
          icon: XCircle,
          color: colors.error,
          bgColor: colors.error + "20",
          label: "Canceled",
        };
    }
  };

  const renderRequestCard = (request: ServiceRequest) => {
    const isExpanded = expandedId === request.id;
    const isPending = request.status === "pending";
    const isArchived = request.status === "completed" || request.status === "canceled";
    const statusConfig = getStatusConfig(request.status);
    const StatusIcon = statusConfig.icon;
    const translation = translatedRequests[request.id];
    const displayName = translation?.name || request.name;
    const displayTitle = translation?.title || request.title;
    const displayDescription = translation?.description || request.description;
    const displayVehicleInfo = translation?.vehicleInfo || request.vehicleInfo;
    const isTranslating = translation?.isTranslating || false;
    const showTranslationBadge = translation?.originalLanguage && translation.originalLanguage !== 'en' && translation.originalLanguage !== 'English';

    return (
      <TouchableOpacity
        key={request.id}
        style={[styles.requestCard, isArchived && !isExpanded && styles.requestCardMinimized]}
        onPress={() => toggleExpanded(request.id)}
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
            <Text style={styles.cardTitle} numberOfLines={isArchived && !isExpanded ? 1 : undefined}>
              {displayTitle}
            </Text>
            <Text style={styles.cardDate}>
              {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.bgColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {request.status}
            </Text>
          </View>
        </View>

        {isArchived && !isExpanded && (
          <View style={styles.minimizedInfo}>
            <Text style={styles.minimizedText} numberOfLines={1}>
              {displayName} • {request.type === "roadside" ? "Roadside" : "Charging"}
            </Text>
            <Text style={styles.tapToExpandText}>Tap to expand</Text>
          </View>
        )}

        {isExpanded && (
          <View style={styles.cardDetails}>
            {showTranslationBadge && (
              <View style={styles.translationBadge}>
                <Text style={styles.translationBadgeText}>🌐 Translated from {translation.originalLanguage}</Text>
              </View>
            )}
            {isTranslating && (
              <View style={styles.translatingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.translatingText}>Translating to English...</Text>
              </View>
            )}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{displayName}</Text>
            </View>
            
            <View style={styles.contactSection}>
              <View style={styles.contactRow}>
                <Phone color={colors.primary} size={16} />
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={styles.contactValue}>{request.phone}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.contactCopyButton}
                    onPress={async (e) => {
                      e.stopPropagation();
                      await Clipboard.setStringAsync(request.phone);
                      if (Platform.OS !== "web") {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                      Alert.alert("Copied!", "Phone number copied to clipboard");
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Copy color={colors.white} size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.phoneCallButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      const phoneUrl = `tel:${request.phone}`;
                      Linking.openURL(phoneUrl).catch(() => {
                        Alert.alert("Error", "Unable to make phone call");
                      });
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Phone color={colors.white} size={18} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.contactRow}>
                <Mail color={colors.primary} size={16} />
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>{request.email}</Text>
                </View>
                <View style={styles.contactActions}>
                  <TouchableOpacity
                    style={styles.contactCopyButton}
                    onPress={async (e) => {
                      e.stopPropagation();
                      await Clipboard.setStringAsync(request.email);
                      if (Platform.OS !== "web") {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                      Alert.alert("Copied!", "Email address copied to clipboard");
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Copy color={colors.white} size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emailButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      
                      // Compile all submission information
                      const emailSubject = encodeURIComponent(`Service Request: ${request.title}`);
                      const emailBody = encodeURIComponent(
                        `SERVICE REQUEST DETAILS\n` +
                        `========================\n\n` +
                        `Request ID: ${request.id}\n` +
                        `Service Type: ${request.type === 'roadside' ? 'Roadside Assistance' : 'EV Charging'}\n` +
                        `Status: ${request.status.toUpperCase()}\n` +
                        `Created: ${new Date(request.createdAt).toLocaleString()}\n\n` +
                        `CUSTOMER INFORMATION\n` +
                        `====================\n` +
                        `Name: ${request.name}\n` +
                        `Phone: ${request.phone}\n` +
                        `Email: ${request.email}\n\n` +
                        `REQUEST DETAILS\n` +
                        `===============\n` +
                        `Title: ${request.title}\n` +
                        `Description: ${request.description}\n` +
                        `Vehicle: ${request.vehicleInfo || 'N/A'}\n` +
                        `Spare Tire Available: ${request.hasSpareTire ? 'Yes' : 'No'}\n\n` +
                        `SCHEDULING\n` +
                        `==========\n` +
                        `Preferred Date: ${request.preferredDate || 'N/A'}\n` +
                        `Preferred Time: ${request.preferredTime || 'N/A'}\n\n` +
                        `LOCATION\n` +
                        `========\n` +
                        `GPS Coordinates (Grid): ${request.location.latitude.toFixed(6)}, ${request.location.longitude.toFixed(6)}\n` +
                        `${request.location.address ? `Service Address: ${request.location.address}\n` : ''}` +
                        `${request.location.currentLocationCoordinates ? `Current Location: ${request.location.currentLocationCoordinates.latitude.toFixed(6)}, ${request.location.currentLocationCoordinates.longitude.toFixed(6)}\n` : ''}` +
                        `\n` +
                        `${request.adminNote ? `ADMIN NOTE\n==========\n${request.adminNote}\n\n` : ''}` +
                        `${request.messages && request.messages.length > 0 ? `MESSAGES (${request.messages.length})\n========\n${request.messages.map(m => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender === 'admin' ? 'Admin' : 'Customer'}: ${m.text}`).join('\n')}\n\n` : ''}` +
                        `---\n` +
                        `This is an automated compilation of service request data.\n` +
                        `\n` +
                        `Sent from: ichargetexas@gmail.com\n`
                      );
                      
                      const emailUrl = `mailto:${request.email}?subject=${emailSubject}&body=${emailBody}&from=ichargetexas@gmail.com`;
                      Linking.openURL(emailUrl).catch(() => {
                        Alert.alert("Error", "Unable to open email app");
                      });
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Mail color={colors.white} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {displayDescription && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{displayDescription}</Text>
              </View>
            )}

            {displayVehicleInfo && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue}>{displayVehicleInfo}</Text>
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>
                <MapPin size={12} color={colors.textSecondary} /> Location
              </Text>
              {request.location.address && (
                <View style={styles.addressContainer}>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressLabel}>User's Input Address:</Text>
                    <Text style={styles.addressText}>{request.location.address}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyAddressButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCopyAddress(request.location.address!);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Copy color={colors.primary} size={16} />
                  </TouchableOpacity>
                </View>
              )}
              {geocodedCoordinates[request.id] && (
                <View style={styles.coordinatesContainer}>
                  <View style={styles.coordinatesHeader}>
                    <Text style={styles.coordinatesTitle}>GPS Coordinates (Service Address)</Text>
                    <TouchableOpacity
                      style={styles.copyCoordinatesIconButton}
                      onPress={async (e) => {
                        e.stopPropagation();
                        const coords = geocodedCoordinates[request.id];
                        if (coords) {
                          const coordString = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
                          await Clipboard.setStringAsync(coordString);
                          if (Platform.OS !== "web") {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }
                          Alert.alert("Copied!", "Service address GPS coordinates copied to clipboard");
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Copy color={colors.primary} size={14} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.locationDetails}>
                    <Text style={styles.coordinateText}>
                      Lat: {geocodedCoordinates[request.id]!.latitude.toFixed(6)}°
                    </Text>
                    <Text style={styles.coordinateText}>
                      Lng: {geocodedCoordinates[request.id]!.longitude.toFixed(6)}°
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.coordinatesContainer}>
                <View style={styles.coordinatesHeader}>
                  <Text style={styles.coordinatesTitle}>GPS Coordinates (Grid Location)</Text>
                  <TouchableOpacity
                    style={styles.copyCoordinatesIconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCopyCoordinates(request);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Copy color={colors.primary} size={14} />
                  </TouchableOpacity>
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.coordinateText}>
                    Lat: {request.location.latitude.toFixed(6)}°
                  </Text>
                  <Text style={styles.coordinateText}>
                    Lng: {request.location.longitude.toFixed(6)}°
                  </Text>
                </View>
              </View>
              {isPending && (
                <View style={styles.navigationButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.navigationButton, styles.coordinatesNavigationButton]}
                    onPress={async (e) => {
                      e.stopPropagation();
                      if (request.location.address) {
                        await geocodeAddress(request.location.address!, request.id);
                        handleNavigateToAddress(request.location.address!);
                      } else {
                        handleNavigateToCoordinates(request);
                      }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Navigation color={colors.white} size={18} />
                    <Text style={styles.navigationButtonText}>
                      Navigate to User Address
                    </Text>
                  </TouchableOpacity>
                  {request.location.address && (
                    <TouchableOpacity
                      style={[styles.navigationButton, styles.addressNavigationButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleNavigateToCoordinates(request);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Navigation color={colors.white} size={18} />
                      <Text style={styles.navigationButtonText}>
                        Navigate to Grid
                      </Text>
                    </TouchableOpacity>
                  )}
                  {request.location.currentLocationCoordinates && (
                    <TouchableOpacity
                      style={[styles.navigationButton, styles.currentLocationNavigationButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleNavigateToCurrentLocation(
                          request.location.currentLocationCoordinates!.latitude,
                          request.location.currentLocationCoordinates!.longitude
                        );
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Navigation color={colors.white} size={18} />
                      <Text style={styles.navigationButtonText}>
                        Navigate to User Location
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {(request.preferredDate || request.preferredTime) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>
                  <Calendar size={12} color={colors.textSecondary} /> Scheduled
                </Text>
                <Text style={styles.detailValue}>
                  {request.preferredDate || "ASAP"}
                  {request.preferredTime && ` at ${request.preferredTime}`}
                </Text>
              </View>
            )}

            {request.status === "canceled" && request.cancelReason && (
              <View style={styles.cancellationNoteSection}>
                <View style={styles.cancellationNoteHeader}>
                  <XCircle color={colors.error} size={14} />
                  <Text style={styles.cancellationNoteLabel}>Cancellation Reason</Text>
                </View>
                <View style={styles.cancellationNoteBox}>
                  <Text style={styles.cancellationNoteText}>
                    {request.cancelReason}
                  </Text>
                </View>
              </View>
            )}

            {request.status === "canceled" && request.deleteReason && (
              <View style={styles.cancellationNoteSection}>
                <View style={styles.cancellationNoteHeader}>
                  <Trash2 color={colors.error} size={14} />
                  <Text style={styles.cancellationNoteLabel}>Deletion Reason</Text>
                </View>
                <View style={styles.cancellationNoteBox}>
                  <Text style={styles.cancellationNoteText}>
                    {request.deleteReason}
                  </Text>
                </View>
              </View>
            )}

            {request.status !== "canceled" && request.adminNote && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>
                  <MessageSquare size={12} color={colors.textSecondary} /> Admin Note
                </Text>
                <View style={styles.noteDisplay}>
                  <Text style={styles.noteText}>{request.adminNote}</Text>
                </View>
              </View>
            )}

            {isPending && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.messagesButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/assignment-detail?id=${request.id}`);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Image
                    source={{ uri: "https://r2-pub.rork.com/generated-images/a17fb1cf-ad47-403c-9754-ed7a59d6e7d8.png" }}
                    style={styles.mascotButtonIconSmall}
                    resizeMode="contain"
                  />
                  <View style={styles.messagesButtonContent}>
                    <MessageSquare color={colors.white} size={18} />
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      View Assignment Details
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {request.assignedStaff && request.assignedStaff.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Assigned Employees</Text>
                <View style={styles.assignedStaffListContainer}>
                  {request.assignedStaff.map((staffId) => {
                    const staff = availableStaff.find(s => s.id === staffId);
                    return staff ? (
                      <View key={staffId} style={styles.assignedStaffItemAdmin}>
                        <View style={[
                          styles.assignedStaffAvatarAdmin,
                          staff.role === 'admin' ? styles.staffAvatarAdminColor : styles.staffAvatarWorkerColor
                        ]}>
                          <Text style={styles.assignedStaffAvatarTextAdmin}>
                            {staff.fullName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.assignedStaffInfoAdmin}>
                          <Text style={styles.assignedStaffNameAdmin}>{staff.fullName}</Text>
                          <Text style={styles.assignedStaffRoleAdmin}>
                            {staff.role === 'admin' ? '👨‍💼 Admin' : '🔧 Worker'}
                          </Text>
                        </View>
                      </View>
                    ) : null;
                  })}
                </View>
              </View>
            )}

            {isPending && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleOpenAssignModal(request);
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <UserPlus color={"#FFA726"} size={20} />
                  <Text style={styles.assignButtonText}>
                    {request.assignedStaff && request.assignedStaff.length > 0
                      ? `Manage Assignments (${request.assignedStaff.length})`
                      : "Assign Staff"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isPending && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.stripeButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleOpenInvoiceModal(request);
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CreditCard color={colors.white} size={20} />
                  <Text style={styles.stripeButtonText}>View & Create Invoice</Text>
                </TouchableOpacity>
              </View>
            )}

            {false && isPending && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.stripeButton}
                  onPress={async (e) => {
                    e.stopPropagation();
                    try {
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }

                      const serviceType = request.type === "roadside" ? "Roadside Assistance" : "EV Charging";
                      
                      const lineItems: Array<{ description: string; amount: number; quantity?: number }> = [];
                      
                      if (request.selectedServices && request.selectedServices.length > 0) {
                        console.log("[Admin] Creating itemized invoice with selected services:", request.selectedServices);
                        
                        request.selectedServices.forEach((service) => {
                          lineItems.push({
                            description: `${service.serviceName}${service.isAfterHours ? ' (After Hours)' : ''}`,
                            amount: service.price,
                            quantity: 1,
                          });
                        });
                        
                        const subtotal = lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0);
                        const tax = subtotal * 0.0825;
                        
                        lineItems.push({
                          description: "Tax (8.25%)",
                          amount: tax,
                          quantity: 1,
                        });
                      } else {
                        console.log("[Admin] No selected services found, creating simple invoice");
                        
                        const amount = request.totalAmount || 100;
                        lineItems.push({
                          description: `${serviceType} - ${request.title}`,
                          amount: amount,
                          quantity: 1,
                        });
                      }
                      
                      const totalAmount = lineItems.reduce((sum, item) => sum + (item.amount * (item.quantity || 1)), 0);

                      console.log("[Admin] Invoice line items:", JSON.stringify(lineItems, null, 2));
                      console.log("[Admin] Total amount: $", totalAmount.toFixed(2));

                      const allMessengerImages: string[] = [];
                      staffMessages.forEach((msg) => {
                        if (msg.images && msg.images.length > 0) {
                          allMessengerImages.push(...msg.images);
                        }
                      });
                      
                      console.log(`[Admin] Found ${allMessengerImages.length} messenger images to include in invoice`);

                      const result = await createStripeInvoice({
                        requestId: request.id,
                        customer: {
                          name: request.name,
                          email: request.email,
                          phone: request.phone,
                        },
                        serviceType,
                        description: `${serviceType} - ${request.title}`,
                        lineItems,
                        totalAmount,
                        messengerImages: allMessengerImages.length > 0 ? allMessengerImages : undefined,
                      });

                      if (result.success && result.invoiceId) {
                        if (Platform.OS !== "web") {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }

                        const stripeUrl = `https://dashboard.stripe.com/invoices/${result.invoiceId}`;
                        
                        try {
                          await Linking.openURL(stripeUrl);
                          console.log("[Admin] Opened Stripe invoice URL:", stripeUrl);
                        } catch (linkError) {
                          console.error("[Admin] Failed to open Stripe URL:", linkError);
                        }

                        const itemizedList = lineItems.map((item, i) => 
                          `${i + 1}. ${item.description}: ${item.amount.toFixed(2)}`
                        ).join('\n');

                        Alert.alert(
                          "✅ Invoice Created!",
                          `Stripe invoice has been created and sent to ${request.email}\n\nTotal: ${totalAmount.toFixed(2)}\n\nItemized:\n${itemizedList}\n\nInvoice ID: ${result.invoiceId}\n\nOpening in Stripe Dashboard...`
                        );
                      } else {
                        Alert.alert(
                          "Error Creating Invoice",
                          `Failed to create Stripe invoice: ${result.error}\n\nOpening Stripe Dashboard to create manually.`,
                          [
                            {
                              text: "Open Dashboard",
                              onPress: async () => {
                                const invoiceDescription = `${serviceType} - ${request.title} | ${request.description || ""}`;
                                const invoiceMemo = [
                                  `Request ID: ${request.id}`,
                                  `Service: ${serviceType}`,
                                  request.description ? `Details: ${request.description}` : null,
                                  request.vehicleInfo ? `Vehicle: ${request.vehicleInfo}` : null,
                                  request.location.address ? `Service Address: ${request.location.address}` : `GPS: ${request.location.latitude.toFixed(6)}, ${request.location.longitude.toFixed(6)}`,
                                  `Schedule: ${request.preferredDate || "ASAP"}${request.preferredTime ? ` at ${request.preferredTime}` : ""}`,
                                  request.adminNote ? `Notes: ${request.adminNote}` : null,
                                ].filter(Boolean).join("\n");

                                const stripeUrl = `https://dashboard.stripe.com/invoices/create?` +
                                  `customer_email=${encodeURIComponent(request.email)}` +
                                  `&customer_name=${encodeURIComponent(request.email)}` +
                                  `${request.phone ? `&customer_phone=${encodeURIComponent(request.phone)}` : ""}` +
                                  `&description=${encodeURIComponent(invoiceDescription)}` +
                                  `&memo=${encodeURIComponent(invoiceMemo)}`;
                                
                                await Linking.openURL(stripeUrl);
                              },
                            },
                            { text: "Cancel", style: "cancel" },
                          ]
                        );
                      }
                    } catch (error) {
                      console.error("[Admin] Error creating Stripe invoice:", error);
                      Alert.alert(
                        "Error",
                        "Failed to create Stripe invoice. Please try again or create manually in Stripe Dashboard."
                      );
                    }
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <CreditCard color={colors.white} size={20} />
                  <Text style={styles.stripeButtonText}>Create Stripe Invoice</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.cardActions}>
              {isPending && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    updateRequestStatus(request.id, "completed");
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Clock color={colors.success} size={18} />
                  <Text style={[styles.actionButtonText, { color: colors.success }]}>
                    Complete
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(request);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 color={colors.error} size={18} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>
                  Cancel/Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    scheduled: requests.filter((r) => r.status === "scheduled").length,
    completed: requests.filter((r) => r.status === "completed").length,
    canceled: requests.filter((r) => r.status === "canceled").length,
  };

  const filters: Array<{ key: FilterType; label: string; count: number }> = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "scheduled", label: "Scheduled", count: stats.scheduled },
    { key: "completed", label: "Completed", count: stats.completed },
    { key: "canceled", label: "Canceled", count: stats.canceled },
  ];



  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.gradient}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerTitleSection}>
            <Text style={styles.adminTitle}>Admin Tab</Text>
            <Text style={styles.adminSubtitle}>
              Open access mode
            </Text>
          </View>
        </View>

        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.push('/(tabs)/messenger');
              }}
            >
              <MessageSquare color={"#9C27B0"} size={28} />
              <Text style={styles.quickActionLabel}>Staff Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleOpenConversationList}
            >
              <MessageSquare color={"#2196F3"} size={28} />
              <Text style={styles.quickActionLabel}>Messages</Text>
              {requests.some((r) => r.messages && r.messages.length > 0) && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>
                    {requests.reduce((total, r) => total + (r.messages?.length || 0), 0)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={handleOpenUserManagement}
            >
              <UsersIcon color={"#4CAF50"} size={28} />
              <Text style={styles.quickActionLabel}>Users</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => {
                const newRequest = createTestInvoice();
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert(
                  "✅ Test Invoice Created!",
                  `A test invoice has been created:\n\nID: ${newRequest.id}\nCustomer: ${newRequest.name}\nEmail: ${newRequest.email}\n\nSwitch to pending requests to see it.`,
                  [
                    { text: "OK" },
                  ]
                );
              }}
            >
              <FileText color={colors.success} size={28} />
              <Text style={styles.quickActionLabel}>Test Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>



        <View style={styles.tabContainer}>
          <Text style={styles.requestsSectionTitle}>View Requests</Text>
          <View style={styles.tabGrid}>
            <TouchableOpacity
              style={[styles.viewTabCard, adminTab === "active" && styles.viewTabCardActive]}
              onPress={() => {
                setAdminTab("active");
                setFilter("all");
              }}
            >
              <Clock size={18} color={adminTab === "active" ? colors.white : colors.warning} />
              <Text style={[styles.viewTabTitle, adminTab === "active" && styles.viewTabTitleActive]}>
                {requests.filter((r) => r.status === "pending" || r.status === "scheduled").length}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.viewTabCard, adminTab === "archive" && styles.viewTabCardActive]}
              onPress={() => {
                setAdminTab("archive");
                setFilter("all");
              }}
            >
              <Archive size={18} color={adminTab === "archive" ? colors.white : colors.textSecondary} />
              <Text style={[styles.viewTabTitle, adminTab === "archive" && styles.viewTabTitleActive]}>
                {requests.filter((r) => r.status === "completed" || r.status === "canceled").length}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats.completed}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => {
              if (stats.pending > 0) {
                router.push('/history');
              }
            }}
            disabled={stats.pending === 0}
            activeOpacity={stats.pending > 0 ? 0.7 : 1}
          >
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {stats.pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </TouchableOpacity>
        </View>



        {adminTab === "archive" && (
          <View style={styles.archiveActionsContainer}>
            <TouchableOpacity
              style={styles.downloadReportButton}
              onPress={async () => {
                if (filteredRequests.length === 0) {
                  Alert.alert("No Data", "There are no archived requests to export.");
                  return;
                }
                
                const report = generateArchiveReport(filteredRequests);
                
                try {
                  if (Platform.OS === "web") {
                    await Clipboard.setStringAsync(report);
                    Alert.alert("Success", "Report copied to clipboard!");
                  } else {
                    await Share.share({
                      message: report,
                      title: "Service Requests Archive Report",
                    });
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                } catch (error) {
                  console.error("Error sharing report:", error);
                  Alert.alert("Error", "Failed to share report. Please try again.");
                }
              }}
            >
              <Share2 color={colors.white} size={20} />
              <Text style={styles.downloadReportText}>Share Archive Report</Text>
            </TouchableOpacity>
            
            <View style={styles.archiveStats}>
              <FileText color={colors.textSecondary} size={16} />
              <Text style={styles.archiveStatsText}>
                {filteredRequests.length} archived request{filteredRequests.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sortedRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Filter color={colors.textTertiary} size={48} />
              </View>
              <Text style={styles.emptyTitle}>No Requests</Text>
              <Text style={styles.emptyMessage}>
                {filter === "all"
                  ? "No service requests have been created yet"
                  : `No ${filter} requests found`}
              </Text>
            </View>
          ) : (
            <View style={styles.logContainer}>{sortedRequests.map(renderRequestCard)}</View>
          )}
          
          <View style={styles.adminActionsSection}>
            <Text style={styles.adminActionsSectionTitle}>System Actions</Text>
            
            <TouchableOpacity
              style={styles.adminActionButton}
              onPress={handleCancelAllOrders}
            >
              <XCircle color={colors.error} size={20} />
              <View style={styles.adminActionContent}>
                <Text style={styles.adminActionTitle}>Clear Active Orders</Text>
                <Text style={styles.adminActionDescription}>Delete all pending and scheduled orders</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adminActionButton}
              onPress={handleDeleteAllMessages}
            >
              <Trash2 color={colors.warning} size={20} />
              <View style={styles.adminActionContent}>
                <Text style={styles.adminActionTitle}>Delete All Messages</Text>
                <Text style={styles.adminActionDescription}>Remove all messages from requests</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut color={colors.error} size={20} />
              <View style={styles.adminActionContent}>
                <Text style={styles.adminActionTitle}>Logout</Text>
                <Text style={styles.adminActionDescription}>Sign out of admin account</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.errorResetSection}>
            <Text style={styles.errorResetTitle}>System Maintenance</Text>
            <View style={styles.errorResetButtonContainer}>
              <TouchableOpacity
                style={styles.errorResetButton}
                onPress={handleResetErrors}
              >
                <RefreshCw color={colors.primary} size={18} />
                <Text style={styles.errorResetText}>Reset App Errors</Text>
              </TouchableOpacity>
              {errors.filter(err => err.count >= 2).length > 0 && (
                <View style={styles.persistentErrorBadge}>
                  <AlertCircle color={colors.error} size={16} />
                  <Text style={styles.persistentErrorBadgeText}>
                    {errors.filter(err => err.count >= 2).length}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.errorResetDescription}>
              Clears any error states in the application without affecting your data, orders, or messages.
              {errors.length > 0 && ` • ${errors.length} error${errors.length > 1 ? 's' : ''} tracked`}
            </Text>
            {errors.filter(err => err.count >= 2).length > 0 && (
              <View style={styles.persistentErrorsContainer}>
                <View style={styles.persistentErrorsHeader}>
                  <AlertCircle color={colors.error} size={18} />
                  <Text style={styles.persistentErrorsTitle}>Persistent Errors Detected</Text>
                </View>
                <Text style={styles.persistentErrorsDescription}>
                  The following errors have occurred 2 or more times. Please investigate:
                </Text>
                {errors.filter(err => err.count >= 2).map((error) => (
                  <View key={error.id} style={styles.persistentErrorItem}>
                    <View style={styles.persistentErrorItemHeader}>
                      <View style={styles.persistentErrorCountBadge}>
                        <Text style={styles.persistentErrorCountText}>{error.count}x</Text>
                      </View>
                      <Text style={styles.persistentErrorMessage}>{error.message}</Text>
                    </View>
                    <Text style={styles.persistentErrorTimestamp}>
                      Last: {new Date(error.lastOccurrence).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.stripeApiSection}>
              <Text style={styles.stripeApiTitle}>Stripe API Configuration</Text>
              <TouchableOpacity
                style={styles.stripeApiButton}
                onPress={() => setStripeApiModalVisible(true)}
              >
                <CreditCard color={"#635BFF"} size={18} />
                <Text style={styles.stripeApiText}>Configure Stripe API Key</Text>
              </TouchableOpacity>
              <Text style={styles.stripeApiDescription}>
                Set up your Stripe API key to enable invoice creation and payment processing.
              </Text>
            </View>
          </View>
        </ScrollView>

        <Modal
          visible={noteModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseNoteModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.modalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <View>
                  <Text style={styles.modalTitle}>Delay & ETA Note</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedRequest?.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseNoteModal}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Enter delay information and estimated time of arrival
              </Text>
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Example: Delayed by 30 mins due to traffic. New ETA: 3:45 PM"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />

              <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseNoteModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveNote}
                >
                  <Send color={colors.white} size={18} />
                  <Text style={styles.saveButtonText}>Save Note</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          visible={conversationListVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseConversationList}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.conversationListModal}>
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <View>
                  <Text style={styles.modalTitle}>Conversations</Text>
                  <Text style={styles.modalSubtitle}>
                    Select a request to view messages
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseConversationList}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.conversationListScroll}>
                {requests
                  .filter((r) => r.messages && r.messages.length > 0)
                  .sort(
                    (a, b) => {
                      const aLastMsg = a.messages![a.messages!.length - 1];
                      const bLastMsg = b.messages![b.messages!.length - 1];
                      return new Date(bLastMsg.timestamp).getTime() - new Date(aLastMsg.timestamp).getTime();
                    }
                  )
                  .map((request) => {
                    const lastMessage = request.messages![request.messages!.length - 1];
                    const unreadCount = request.messages!.filter(
                      (msg) => msg.sender === "user"
                    ).length;

                    return (
                      <TouchableOpacity
                        key={request.id}
                        style={styles.conversationItem}
                        onPress={() => handleOpenMessagesModal(request)}
                      >
                        <View
                          style={[
                            styles.conversationIcon,
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
                        <View style={styles.conversationInfo}>
                          <View style={styles.conversationHeader}>
                            <Text style={styles.conversationTitle} numberOfLines={1}>
                              {request.title}
                            </Text>
                            <Text style={styles.conversationTime}>
                              {new Date(lastMessage.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </View>
                          <View style={styles.conversationPreview}>
                            <Text
                              style={[
                                styles.conversationLastMessage,
                                lastMessage.sender === "user" && styles.unreadMessage,
                              ]}
                              numberOfLines={1}
                            >
                              {lastMessage.sender === "admin" ? "You: " : ""}
                              {lastMessage.text}
                            </Text>
                            {unreadCount > 0 && (
                              <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>
                                  {unreadCount}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={messagesModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseMessagesModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.messagesModalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <View>
                  <Text style={styles.modalTitle}>Customer Messages</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedRequest?.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseMessagesModal}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.messagesScrollView}>
                {(!selectedRequest?.messages || selectedRequest.messages.length === 0) ? (
                  <View style={styles.emptyMessagesState}>
                    <MessageSquare color={colors.textTertiary} size={48} />
                    <Text style={styles.emptyMessagesText}>
                      No messages yet. Start the conversation!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.messagesContainer}>
                    {selectedRequest.messages.map((msg: Message) => (
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
                <TouchableOpacity
                  style={styles.messageInput}
                  onPress={() => {
                    setMessagesModalVisible(false);
                    setTimeout(() => {
                      setFullscreenInput({
                        visible: true,
                        value: messageText,
                        placeholder: "Type your message to customer...",
                        label: "Message",
                        type: "message",
                      });
                    }, 300);
                  }}
                >
                  <Text style={[styles.messageInputText, !messageText && styles.messageInputPlaceholder]}>
                    {messageText || "Type your message to customer..."}
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
          </View>
        </Modal>

        <Modal
          visible={cancelModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseCancelModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.modalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <View>
                  <Text style={styles.modalTitle}>Cancel Request</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedRequest?.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseCancelModal}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Please enter the reason for canceling this request
              </Text>
              <TextInput
                style={styles.noteInput}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Example: Unable to reach location, service not available in area, etc."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseCancelModal}
                >
                  <Text style={styles.cancelButtonText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, styles.cancelRequestButton]}
                  onPress={handleConfirmCancel}
                  disabled={!cancelReason.trim()}
                >
                  <XCircle color={colors.white} size={18} />
                  <Text style={styles.saveButtonText}>Cancel Request</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          visible={deleteModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseDeleteModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.modalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <View>
                  <Text style={styles.modalTitle}>Delete Request</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedRequest?.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseDeleteModal}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Please enter the reason for deleting this request
              </Text>
              <TextInput
                style={styles.noteInput}
                value={deleteReason}
                onChangeText={setDeleteReason}
                placeholder="Example: Duplicate request, customer withdrew, invalid information, etc."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseDeleteModal}
                >
                  <Text style={styles.cancelButtonText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, styles.deleteRequestButton]}
                  onPress={handleConfirmDelete}
                  disabled={!deleteReason.trim()}
                >
                  <Trash2 color={colors.white} size={18} />
                  <Text style={styles.saveButtonText}>Delete Request</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

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
            <View style={[styles.fullscreenHeader, { paddingTop: insets.top + 16 }]}>
              <TouchableOpacity
                style={styles.fullscreenCancelButton}
                onPress={() => {
                  setFullscreenInput(null);
                  setTimeout(() => {
                    if (fullscreenInput?.type === "note") {
                      setNoteModalVisible(true);
                    } else if (fullscreenInput?.type === "message") {
                      setMessagesModalVisible(true);
                    } else if (fullscreenInput?.type === "cancel") {
                      setCancelModalVisible(true);
                    }
                  }, 300);
                }}
              >
                <Text style={styles.fullscreenCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.fullscreenTitle}>{fullscreenInput?.label}</Text>
              <TouchableOpacity
                style={styles.fullscreenDoneButton}
                onPress={async () => {
                  if (fullscreenInput) {
                    if (fullscreenInput.type === "note") {
                      setNoteText(fullscreenInput.value);
                      setFullscreenInput(null);
                      setTimeout(() => setNoteModalVisible(true), 300);
                    } else if (fullscreenInput.type === "message") {
                      setMessageText(fullscreenInput.value);
                      setFullscreenInput(null);
                      if (selectedRequest && fullscreenInput.value.trim()) {
                        await addMessage(selectedRequest.id, fullscreenInput.value.trim(), "admin");
                        if (Platform.OS !== "web") {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                        setMessageText("");
                        setMessagesModalVisible(false);
                        setSelectedRequest(null);
                      } else {
                        setTimeout(() => setMessagesModalVisible(true), 300);
                      }
                    } else if (fullscreenInput.type === "cancel") {
                      setCancelReason(fullscreenInput.value);
                      setFullscreenInput(null);
                      setTimeout(() => setCancelModalVisible(true), 300);
                    }
                  }
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

        <Modal
          visible={stripeApiModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setStripeApiModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.modalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <View>
                  <Text style={styles.modalTitle}>Configure Stripe API</Text>
                  <Text style={styles.modalSubtitle}>
                    Set up communication with Stripe
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setStripeApiModalVisible(false);
                    setStripeApiKey("");
                    setIsTestingStripe(false);
                  }}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Enter your Stripe Secret API Key
              </Text>
              <Text style={styles.stripeApiWarning}>
                ⚠️ Keep your secret key secure. It should start with "sk_live_" or "sk_test_".
              </Text>
              
              <TextInput
                style={styles.stripeApiInput}
                value={stripeApiKey}
                onChangeText={setStripeApiKey}
                placeholder="sk_live_... or sk_test_..."
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.stripeApiInfo}>
                <Text style={styles.stripeApiInfoTitle}>How to get your API key:</Text>
                <Text style={styles.stripeApiInfoText}>1. Go to dashboard.stripe.com</Text>
                <Text style={styles.stripeApiInfoText}>2. Click "Developers" in the menu</Text>
                <Text style={styles.stripeApiInfoText}>3. Select "API keys"</Text>
                <Text style={styles.stripeApiInfoText}>4. Copy your Secret key</Text>
              </View>

              <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setStripeApiModalVisible(false);
                    setStripeApiKey("");
                    setIsTestingStripe(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    styles.stripeApiSaveButton,
                    (!stripeApiKey.trim() || isTestingStripe) && styles.stripeApiSaveButtonDisabled
                  ]}
                  onPress={async () => {
                    if (!stripeApiKey.trim()) {
                      Alert.alert("Required", "Please enter your Stripe API key");
                      return;
                    }

                    if (!stripeApiKey.startsWith("sk_live_") && !stripeApiKey.startsWith("sk_test_")) {
                      Alert.alert(
                        "Invalid Format",
                        "Stripe secret keys should start with 'sk_live_' or 'sk_test_'. Please check your API key."
                      );
                      return;
                    }

                    setIsTestingStripe(true);
                    
                    try {
                      console.log("[Stripe API Setup] Testing connection...");
                      
                      const testResponse = await fetch("https://api.stripe.com/v1/customers", {
                        method: "GET",
                        headers: {
                          "Authorization": `Bearer ${stripeApiKey}`,
                        },
                      });

                      if (!testResponse.ok) {
                        const errorData = await testResponse.json();
                        console.error("[Stripe API Setup] Test failed:", errorData);
                        throw new Error(errorData.error?.message || "Invalid API key");
                      }

                      console.log("[Stripe API Setup] Connection successful!");
                      
                      await AsyncStorage.setItem("@stripe_api_key", stripeApiKey);
                      
                      if (Platform.OS !== "web") {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }

                      Alert.alert(
                        "✅ Success!",
                        "Your Stripe API key has been saved and tested successfully. The app will now use this key for invoice creation.",
                        [
                          {
                            text: "OK",
                            onPress: () => {
                              setStripeApiModalVisible(false);
                              setStripeApiKey("");
                              setIsTestingStripe(false);
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error("[Stripe API Setup] Error:", error);
                      setIsTestingStripe(false);
                      Alert.alert(
                        "Connection Failed",
                        `Failed to connect to Stripe: ${error instanceof Error ? error.message : "Unknown error"}\n\nPlease check your API key and try again.`
                      );
                    }
                  }}
                  disabled={!stripeApiKey.trim() || isTestingStripe}
                >
                  {isTestingStripe ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <CreditCard color={colors.white} size={18} />
                  )}
                  <Text style={styles.saveButtonText}>
                    {isTestingStripe ? "Testing Connection..." : "Save & Test Connection"}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          visible={assignModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseAssignModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.modalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <View>
                  <Text style={styles.modalTitle}>Assign Staff to Job</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedRequest?.title}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseAssignModal}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.staffListScroll}>
                {availableStaff.length === 0 ? (
                  <View style={styles.emptyStaffState}>
                    <UsersIcon color={colors.textTertiary} size={48} />
                    <Text style={styles.emptyStaffText}>
                      No staff members available
                    </Text>
                    <Text style={styles.emptyStaffSubtext}>
                      Create admin or worker accounts in User Management
                    </Text>
                  </View>
                ) : (
                  <View style={styles.staffList}>
                    {availableStaff.map((staff) => {
                      const isSelected = selectedWorkerIds.includes(staff.id);
                      const wasAssigned = selectedRequest?.assignedStaff?.includes(staff.id) || false;
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
                                {wasAssigned && !isSelected && ' (Will be removed)'}
                                {!wasAssigned && isSelected && ' (Will be added)'}
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

              <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseAssignModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    styles.assignSaveButton,
                  ]}
                  onPress={handleSaveAssignment}
                >
                  <UserPlus color={colors.white} size={18} />
                  <Text style={styles.saveButtonText}>
                    Assign ({selectedWorkerIds.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          visible={fullscreenAssignment !== null}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setFullscreenAssignment(null)}
        >
          <View style={styles.fullscreenAssignmentModal}>
            <View style={[styles.fullscreenAssignmentHeader, { paddingTop: insets.top + 16 }]}>
              <TouchableOpacity
                style={styles.fullscreenAssignmentBackButton}
                onPress={() => {
                  setFullscreenAssignment(null);
                  setExpandedId(null);
                }}
              >
                <Text style={styles.fullscreenAssignmentBackText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.fullscreenAssignmentTitle}>Assignment Details</Text>
              <View style={{ width: 80 }} />
            </View>
            
            <ScrollView 
              style={styles.fullscreenAssignmentContent}
              contentContainerStyle={styles.fullscreenAssignmentScrollContent}
            >
              {fullscreenAssignment && renderRequestCard(fullscreenAssignment)}
            </ScrollView>
          </View>
        </Modal>

        <Modal
          visible={assignmentMessengerVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseAssignmentMessenger}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.messagesModalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <TouchableOpacity
                  style={styles.messengerCloseButton}
                  onPress={handleCloseAssignmentMessenger}
                >
                  <X color={colors.white} size={36} strokeWidth={5} />
                </TouchableOpacity>
                <View style={styles.messengerHeaderContent}>
                  <Text style={styles.modalTitle}>Assignment Messenger</Text>
                  <Text style={styles.modalSubtitle}>
                    {assignmentMessengerRequest?.title}
                  </Text>
                  {assignmentMessengerRequest && (
                    <View style={styles.recipientsContainer}>
                      <Text style={styles.recipientsLabel}>Recipients:</Text>
                      <Text style={styles.recipientsText}>
                        Customer ({assignmentMessengerRequest.name})
                        {assignmentMessengerRequest.assignedStaff && assignmentMessengerRequest.assignedStaff.length > 0 && (
                          <Text>, {assignmentMessengerRequest.assignedStaff.length} Staff Member{assignmentMessengerRequest.assignedStaff.length > 1 ? 's' : ''}</Text>
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <ScrollView style={styles.messagesScrollView}>
                {(!assignmentMessengerRequest?.messages || assignmentMessengerRequest.messages.length === 0) ? (
                  <View style={styles.emptyMessagesState}>
                    <MessageSquare color={colors.textTertiary} size={48} />
                    <Text style={styles.emptyMessagesText}>
                      No messages yet. Start the conversation!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.messagesContainer}>
                    {assignmentMessengerRequest.messages.map((msg: Message) => (
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

              {assignmentMessengerRequest && assignmentMessengerRequest.assignedStaff && assignmentMessengerRequest.assignedStaff.length > 0 && (
                <View style={styles.assignedStaffPreview}>
                  <Text style={styles.assignedStaffPreviewLabel}>Message will be sent to:</Text>
                  <View style={styles.assignedStaffPreviewGrid}>
                    <View style={styles.assignedStaffPreviewItem}>
                      <Text style={styles.assignedStaffPreviewName}>👤 {assignmentMessengerRequest.name}</Text>
                    </View>
                    {assignmentMessengerRequest.assignedStaff.map((staffId) => {
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

              <View style={[styles.messageInputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TextInput
                  style={styles.messageInput}
                  value={assignmentMessageText}
                  onChangeText={setAssignmentMessageText}
                  placeholder="Type your message to everyone involved..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !assignmentMessageText.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendAssignmentMessage}
                  disabled={!assignmentMessageText.trim()}
                >
                  <Send color={colors.white} size={20} />
                </TouchableOpacity>
              </View>
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
  headerContainer: {
    flexDirection: "column",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative" as const,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.text,
    textAlign: "center" as const,
  },
  quickActionBadge: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  quickActionBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  requestsSectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 12,
  },
  tabGrid: {
    flexDirection: "row" as const,
    gap: 8,
  },
  viewTabCard: {
    flexDirection: "row" as const,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 60,
  },
  viewTabCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  viewTabTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
  viewTabTitleActive: {
    color: colors.white,
  },
  viewTabBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center" as const,
  },
  viewTabBadgeActive: {
    backgroundColor: colors.white + "30",
  },
  viewTabBadgeText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.text,
  },
  viewTabBadgeTextActive: {
    color: colors.white,
  },
  adminActionsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  adminActionsSectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  adminActionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminActionContent: {
    flex: 1,
    gap: 4,
  },
  adminActionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
  },
  adminActionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  staffMessengerButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#9C27B0",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#9C27B0",
    minWidth: 100,
  },
  staffMessengerText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  messengerHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#2196F3",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2196F3",
    minWidth: 100,
  },
  messengerHeaderText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  messengerBadge: {
    backgroundColor: colors.white,
    borderRadius: 12,
    minWidth: 21.6,
    height: 21.6,
    paddingHorizontal: 4.8,
    alignItems: "center",
    justifyContent: "center",
  },
  messengerBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#2196F3",
  },
  headerTitleSection: {
    flexDirection: "column" as const,
    gap: 4,
  },
  adminTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
  },
  adminSubtitle: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.error + "15",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
    minWidth: 100,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.error,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  filterScroll: {
    flex: 1,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeActive: {
    backgroundColor: colors.white + "30",
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.textSecondary,
  },
  filterBadgeTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  logContainer: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestCardMinimized: {
    paddingVertical: 12,
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
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
    textTransform: "uppercase",
  },
  cardDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  detailSection: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  locationDetails: {
    flexDirection: "row",
    gap: 16,
  },
  coordinateText: {
    fontSize: 13,
    color: colors.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  locationActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  locationActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  navigateButton: {
    borderColor: colors.success + "30",
  },
  locationActionText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: colors.error + "15",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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
  noteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    backgroundColor: colors.primary + "15",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  messagesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: 14,
    paddingLeft: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  messagesButtonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mascotButtonIconSmall: {
    width: 40,
    height: 40,
  },
  noteDisplay: {
    backgroundColor: colors.surfaceLight,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 160,
    maxHeight: 300,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  cancelRequestButton: {
    backgroundColor: colors.error,
  },
  deleteRequestButton: {
    backgroundColor: colors.error,
  },
  messagesModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: "80%",
    height: "80%",
    overflow: "hidden",
  },
  messagesScrollView: {
    flex: 1,
    padding: 16,
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
    textTransform: "uppercase",
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
    backgroundColor: colors.background,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.surface,
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
  errorResetSection: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
  },
  errorResetTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  errorResetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    minWidth: 200,
  },
  errorResetText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  errorResetDescription: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 280,
    lineHeight: 16,
  },
  cancellationNoteSection: {
    marginTop: 4,
  },
  cancellationNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  cancellationNoteLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.error,
    textTransform: "uppercase",
  },
  cancellationNoteBox: {
    backgroundColor: colors.error + "10",
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    borderRadius: 8,
    padding: 12,
  },
  cancellationNoteText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  conversationListModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: "95%",
    maxWidth: 600,
    height: "85%",
    overflow: "hidden",
  },
  conversationListScroll: {
    flex: 1,
    padding: 16,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conversationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationInfo: {
    flex: 1,
    gap: 6,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  conversationPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  conversationLastMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: "600" as const,
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
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
    paddingBottom: 16,
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
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.error + "20",
    borderRadius: 10,
  },
  fullscreenCancelText: {
    fontSize: 20,
    color: colors.error,
    fontWeight: "700" as const,
  },
  fullscreenDoneButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.primary + "20",
    borderRadius: 10,
  },
  fullscreenDoneText: {
    fontSize: 20,
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
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    marginBottom: 8,
  },
  addressTextContainer: {
    flex: 1,
    gap: 4,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  copyAddressButton: {
    padding: 8,
    backgroundColor: colors.primary + "15",
    borderRadius: 6,
  },
  coordinatesContainer: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  coordinatesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  coordinatesTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  copyCoordinatesIconButton: {
    padding: 6,
    backgroundColor: colors.primary + "15",
    borderRadius: 4,
  },
  navigationButtonsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  navigationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  coordinatesNavigationButton: {
    backgroundColor: colors.success,
  },
  addressNavigationButton: {
    backgroundColor: colors.primary,
  },
  currentLocationNavigationButton: {
    backgroundColor: colors.charging,
  },
  navigationButtonText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.white,
  },
  translationBadge: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + "40",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  translationBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  translatingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
  },
  translatingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500" as const,
  },
  errorResetButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "relative",
  },
  persistentErrorBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.error + "20",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.error,
  },
  persistentErrorBadgeText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.error,
  },
  persistentErrorsContainer: {
    marginTop: 20,
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.error + "10",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.error + "40",
  },
  persistentErrorsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  persistentErrorsTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.error,
  },
  persistentErrorsDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  persistentErrorItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  persistentErrorItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  persistentErrorCountBadge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center",
  },
  persistentErrorCountText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  persistentErrorMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.text,
    lineHeight: 18,
  },
  persistentErrorTimestamp: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row" as const,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.white,
  },
  tabBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tabBadgeActive: {
    backgroundColor: colors.white + "30",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.white,
  },
  archiveActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  downloadReportButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  downloadReportText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  archiveStats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  archiveStatsText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  contactSection: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  contactRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  contactTextContainer: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  contactActions: {
    flexDirection: "row" as const,
    gap: 8,
  },
  contactCopyButton: {
    padding: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  phoneCallButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.success,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success,
  },
  emailButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    backgroundColor: colors.primary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  minimizedInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  minimizedText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  tapToExpandText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
  },
  stripeButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    padding: 16,
    backgroundColor: "#635BFF",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stripeButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  testInvoiceButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.success,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success,
    minWidth: 100,
  },
  testInvoiceText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  cancelAllButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.error,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.error,
    minWidth: 100,
  },
  cancelAllText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  deleteMessagesButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.warning,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    minWidth: 100,
  },
  deleteMessagesText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  userManagementButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 100,
  },
  userManagementText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  usersSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  usersSectionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  usersSectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  manageUsersButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  manageUsersButtonText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.white,
  },
  usersScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  noUsersContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 32,
    paddingHorizontal: 48,
    backgroundColor: colors.background,
    borderRadius: 12,
    gap: 8,
  },
  noUsersText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },
  noUsersSubtext: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "400" as const,
    textAlign: "center" as const,
    marginTop: 4,
  },
  userCard: {
    width: 140,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: "center" as const,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  superAdminAvatar: {
    backgroundColor: "#FF6B35",
  },
  adminAvatar: {
    backgroundColor: colors.primary,
  },
  workerAvatar: {
    backgroundColor: colors.success,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.white,
  },
  userCardInfo: {
    alignItems: "center" as const,
    gap: 4,
    width: "100%",
  },
  userCardName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    textAlign: "center" as const,
  },
  userRoleBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  stripeApiSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center" as const,
  },
  stripeApiTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 16,
  },
  stripeApiButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#635BFF" + "15",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#635BFF",
    minWidth: 200,
  },
  stripeApiText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#635BFF",
  },
  stripeApiDescription: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center" as const,
    marginTop: 12,
    maxWidth: 280,
    lineHeight: 16,
  },
  stripeApiInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 2,
    borderColor: "#635BFF" + "40",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  stripeApiWarning: {
    fontSize: 12,
    color: colors.warning,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.warning + "15",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  stripeApiInfo: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stripeApiInfoTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 12,
  },
  stripeApiInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  stripeApiSaveButton: {
    backgroundColor: "#635BFF",
  },
  stripeApiSaveButtonDisabled: {
    opacity: 0.5,
  },
  assignButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    padding: 16,
    backgroundColor: "#FFA726",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  assignSaveButton: {
    backgroundColor: "#FFA726",
  },
  assignedStaffListContainer: {
    gap: 8,
    marginTop: 4,
  },
  assignedStaffItemAdmin: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFA726" + "30",
  },
  assignedStaffAvatarAdmin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  staffAvatarAdminColor: {
    backgroundColor: colors.primary,
  },
  staffAvatarWorkerColor: {
    backgroundColor: colors.success,
  },
  assignedStaffAvatarTextAdmin: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  assignedStaffInfoAdmin: {
    flex: 1,
    gap: 2,
  },
  assignedStaffNameAdmin: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  assignedStaffRoleAdmin: {
    fontSize: 11,
    color: colors.textSecondary,
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
    paddingHorizontal: 20,
  },
  emptyStaffText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
    marginTop: 16,
    textAlign: "center" as const,
  },
  emptyStaffSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center" as const,
  },
  fullscreenAssignmentModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenAssignmentHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  fullscreenAssignmentTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  fullscreenAssignmentBackButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.error + "20",
    borderRadius: 10,
  },
  fullscreenAssignmentBackText: {
    fontSize: 20,
    color: colors.error,
    fontWeight: "700" as const,
  },
  fullscreenAssignmentSaveButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.primary + "20",
    borderRadius: 10,
  },
  fullscreenAssignmentSaveText: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "700" as const,
  },
  fullscreenAssignmentContent: {
    flex: 1,
  },
  fullscreenAssignmentScrollContent: {
    padding: 20,
  },
  recipientsContainer: {
    marginTop: 8,
    paddingTop: 8,
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
  assignedStaffPreview: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceLight,
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
  messengerCloseButton: {
    position: "absolute" as const,
    top: 8,
    right: 12,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DC143C",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 1000,
  },
  messengerHeaderContent: {
    flex: 1,
    paddingRight: 70,
  },
});
