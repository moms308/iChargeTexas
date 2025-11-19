import { useService } from "@/constants/serviceContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SystemUser } from "@/constants/types";
import colors from "@/constants/colors";
import { ServiceRequest, Message } from "@/constants/types";
import PhotoGalleryModal from "@/constants/PhotoGalleryModal";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import {
  Truck,
  BatteryCharging,
  MapPin,
  Calendar,
  Share2,
  Clock,
  Copy,
  Navigation,
  MessageSquare,
  Send,
  X,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Image as ImageIcon,
} from "lucide-react-native";
import React, { useState, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function HistoryScreen() {
  const { requests, updateRequestStatus, updateRequestNote, addMessage, updateRequestAddress, clearPastRequests, addPhoto, removePhoto } = useService();
  
  React.useEffect(() => {
    loadSystemUsers();
  }, []);

  const loadSystemUsers = async () => {
    try {
      const stored = await AsyncStorage.getItem("@system_users");
      if (stored) {
        const users: SystemUser[] = JSON.parse(stored);
        setSystemUsers(users);
      }
    } catch (error) {
      console.error("Error loading system users:", error);
    }
  };
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messagesModalVisible, setMessagesModalVisible] = useState<boolean>(false);
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [editAddressModalVisible, setEditAddressModalVisible] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [messageText, setMessageText] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<string>("");
  const [editingAddress, setEditingAddress] = useState<string>("");
  const [photoGalleryVisible, setPhotoGalleryVisible] = useState<boolean>(false);
  const [photoGalleryRequest, setPhotoGalleryRequest] = useState<ServiceRequest | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  const handleShare = async (request: ServiceRequest) => {
    const shareMessage = `EV Service Request
Type: ${request.type === "roadside" ? "Roadside Assistance" : "Scheduled Charging"}
Title: ${request.title}
${request.description ? `Description: ${request.description}\n` : ""}${request.vehicleInfo ? `Vehicle: ${request.vehicleInfo}\n` : ""}
Location:
Latitude: ${request.location.latitude.toFixed(6)}°
Longitude: ${request.location.longitude.toFixed(6)}°

Date: ${request.preferredDate || "ASAP"}
Time: ${request.preferredTime || "Any"}

Status: ${request.status.toUpperCase()}
Request ID: ${request.id}
Created: ${new Date(request.createdAt).toLocaleString()}`;

    try {
      await Share.share({
        message: shareMessage,
        title: "EV Service Request",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
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

  const handleNavigate = async (request: ServiceRequest) => {
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



  const handleCancelRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setCancelModalVisible(true);
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenMessagesModal = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setMessagesModalVisible(true);
  };

  const handleCloseMessagesModal = () => {
    setMessagesModalVisible(false);
    setSelectedRequest(null);
    setMessageText("");
  };

  const handleCloseCancelModal = () => {
    setCancelModalVisible(false);
    setSelectedRequest(null);
    setCancelReason("");
  };

  const handleOpenEditAddressModal = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setEditingAddress(request.location.address || "");
    setEditAddressModalVisible(true);
  };

  const handleCloseEditAddressModal = () => {
    setEditAddressModalVisible(false);
    setSelectedRequest(null);
    setEditingAddress("");
  };

  const handleSaveAddress = async () => {
    if (!selectedRequest) return;

    await updateRequestAddress(selectedRequest.id, editingAddress);
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    Alert.alert(
      "Success",
      "Service address updated successfully. The admin will see the new address."
    );
    
    handleCloseEditAddressModal();
  };

  const handleConfirmCancel = async () => {
    if (!selectedRequest || !cancelReason.trim()) {
      Alert.alert("Required", "Please enter a reason for cancellation");
      return;
    }

    try {
      console.log("[User] Canceling request:", selectedRequest.id, "Reason:", cancelReason.trim());
      
      updateRequestStatus(selectedRequest.id, "canceled");
      
      await addMessage(
        selectedRequest.id,
        `Request canceled by User. Reason: ${cancelReason.trim()}`,
        "user"
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      console.log("[User] Request canceled successfully:", selectedRequest.id);
      handleCloseCancelModal();

      setTimeout(() => {
        Alert.alert(
          "Request Canceled",
          "The request has been canceled and the admin has been notified."
        );
      }, 200);
    } catch (error) {
      console.error("[User] Error canceling request:", error);
      Alert.alert("Error", "Failed to cancel request. Please try again.");
    }
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

  const renderRequestCard = (request: ServiceRequest) => {
    const isExpanded = expandedId === request.id;
    const isPending = request.status === "pending";

    return (
      <TouchableOpacity
        key={request.id}
        style={styles.requestCard}
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
              <Truck
                color={colors.roadside}
                size={20}
              />
            ) : (
              <BatteryCharging
                color={colors.charging}
                size={20}
              />
            )}
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {request.title}
            </Text>
            <Text style={styles.cardDate}>
              {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  request.status === "pending"
                    ? colors.warning + "20"
                    : request.status === "completed"
                    ? colors.success + "20"
                    : request.status === "canceled"
                    ? colors.error + "20"
                    : colors.primary + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    request.status === "pending"
                      ? colors.warning
                      : request.status === "completed"
                      ? colors.success
                      : request.status === "canceled"
                      ? colors.error
                      : colors.primary,
                },
              ]}
            >
              {request.status}
            </Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.cardDetails}>
            {request.description && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{request.description}</Text>
              </View>
            )}

            {request.vehicleInfo && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue}>{request.vehicleInfo}</Text>
              </View>
            )}

            <View style={styles.detailSection}>
              <View style={styles.locationHeaderRow}>
                <Text style={styles.detailLabel}>
                  <MapPin size={12} color={colors.textSecondary} /> Location
                </Text>
                {isPending && (
                  <TouchableOpacity
                    style={styles.editAddressButton}
                    onPress={() => handleOpenEditAddressModal(request)}
                  >
                    <Edit color={colors.primary} size={14} />
                    <Text style={styles.editAddressButtonText}>Edit Address</Text>
                  </TouchableOpacity>
                )}
              </View>
              {request.location.address && (
                <View style={styles.addressContainer}>
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressLabel}>Service Address:</Text>
                    <Text style={styles.addressText}>{request.location.address}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyAddressButton}
                    onPress={() => handleCopyAddress(request.location.address!)}
                  >
                    <Copy color={colors.primary} size={16} />
                  </TouchableOpacity>
                </View>
              )}
              {!request.location.address && isPending && (
                <View style={styles.noAddressContainer}>
                  <Text style={styles.noAddressText}>No service address set</Text>
                  <TouchableOpacity
                    style={styles.addAddressButton}
                    onPress={() => handleOpenEditAddressModal(request)}
                  >
                    <Text style={styles.addAddressButtonText}>+ Add Address</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.locationDetails}>
                <Text style={styles.coordinateText}>
                  Lat: {request.location.latitude.toFixed(6)}°
                </Text>
                <Text style={styles.coordinateText}>
                  Lng: {request.location.longitude.toFixed(6)}°
                </Text>
              </View>
              {isPending && (
                <View style={styles.locationActions}>
                  <TouchableOpacity
                    style={styles.locationActionButton}
                    onPress={() => handleCopyCoordinates(request)}
                  >
                    <Copy color={colors.primary} size={16} />
                    <Text style={styles.locationActionText}>Copy Coordinates</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.locationActionButton, styles.navigateButton]}
                    onPress={() => handleNavigate(request)}
                  >
                    <Navigation color={colors.success} size={16} />
                    <Text style={[styles.locationActionText, { color: colors.success }]}>
                      Navigate
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {request.status === "canceled" && request.adminNote && (
              <View style={styles.cancellationNoteSection}>
                <View style={styles.cancellationNoteHeader}>
                  <XCircle color={colors.error} size={14} />
                  <Text style={styles.cancellationNoteLabel}>Cancellation Reason</Text>
                </View>
                <View style={styles.cancellationNoteBox}>
                  <Text style={styles.cancellationNoteText}>
                    {request.adminNote.replace('Cancellation Reason: ', '')}
                  </Text>
                </View>
              </View>
            )}

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

            {request.assignedStaff && request.assignedStaff.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Assigned Employees</Text>
                <View style={styles.assignedStaffContainer}>
                  {request.assignedStaff.map((staffId) => {
                    const staff = systemUsers.find(u => u.id === staffId);
                    return staff ? (
                      <View key={staffId} style={styles.assignedStaffBadge}>
                        <View style={[
                          styles.assignedStaffAvatar,
                          staff.role === 'admin' ? styles.staffAvatarAdmin : styles.staffAvatarWorker
                        ]}>
                          <Text style={styles.assignedStaffAvatarText}>
                            {staff.fullName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.assignedStaffInfo}>
                          <Text style={styles.assignedStaffName}>{staff.fullName}</Text>
                          <Text style={styles.assignedStaffRole}>
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
              <View style={styles.detailSection}>
                <TouchableOpacity
                  style={styles.messagesButton}
                  onPress={() => handleOpenMessagesModal(request)}
                >
                  <Image
                    source={{ uri: "https://r2-pub.rork.com/generated-images/a17fb1cf-ad47-403c-9754-ed7a59d6e7d8.png" }}
                    style={styles.mascotButtonIconSmall}
                    resizeMode="contain"
                  />
                  <View style={styles.messagesButtonContent}>
                    <MessageSquare color={colors.white} size={18} />
                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                      Messages {request.messages && request.messages.length > 0 ? `(${request.messages.length})` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {isPending && (
              <View style={styles.detailSection}>
                <TouchableOpacity
                  style={styles.photosButton}
                  onPress={() => {
                    setPhotoGalleryRequest(request);
                    setPhotoGalleryVisible(true);
                  }}
                >
                  <ImageIcon color={colors.white} size={18} />
                  <Text style={[styles.actionButtonText, { color: colors.white }]}>
                    Photos {request.photos && request.photos.length > 0 ? `(${request.photos.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShare(request)}
              >
                <Share2 color={colors.primary} size={18} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>

              {isPending && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => updateRequestStatus(request.id, "completed")}
                >
                  <Clock color={colors.success} size={18} />
                  <Text
                    style={[styles.actionButtonText, { color: colors.success }]}
                  >
                    Complete
                  </Text>
                </TouchableOpacity>
              )}

              {request.status !== "completed" && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleCancelRequest(request)}
                >
                  <XCircle color={colors.error} size={18} />
                  <Text style={[styles.actionButtonText, { color: colors.error }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const completedRequests = requests.filter((r) => r.status === "completed");
  const scheduledRequests = requests.filter((r) => r.status === "scheduled");
  const canceledRequests = requests.filter((r) => r.status === "canceled");

  console.log('[HistoryScreen] Current requests:', requests.map(r => ({ id: r.id, status: r.status })));
  console.log('[HistoryScreen] Pending:', pendingRequests.length, 'Canceled:', canceledRequests.length);

  const hasPastRequests = completedRequests.length > 0 || canceledRequests.length > 0;

  const handleClearPastRequests = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Clear Past Requests",
      `This will permanently remove ${completedRequests.length + canceledRequests.length} ${completedRequests.length + canceledRequests.length === 1 ? 'request' : 'requests'} (completed and canceled) from your history. This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearPastRequests();
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Alert.alert("Success", "Past requests have been cleared.");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasPastRequests && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearPastRequests}
              activeOpacity={0.7}
            >
              <Trash2 color={colors.error} size={18} />
              <Text style={styles.clearButtonText}>
                Clear Past Requests ({completedRequests.length + canceledRequests.length})
              </Text>
            </TouchableOpacity>
          )}

          {(pendingRequests.length === 0 && scheduledRequests.length === 0 && completedRequests.length === 0 && canceledRequests.length === 0) ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Truck color={colors.textTertiary} size={48} />
              </View>
              <Text style={styles.emptyTitle}>No Active Requests</Text>
              <Text style={styles.emptyMessage}>
                Your active service requests will appear here. Canceled requests are removed from this view.
              </Text>
            </View>
          ) : (
            <>
              {pendingRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Pending ({pendingRequests.length})
                  </Text>
                  {pendingRequests.map(renderRequestCard)}
                </View>
              )}

              {scheduledRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Scheduled ({scheduledRequests.length})
                  </Text>
                  {scheduledRequests.map(renderRequestCard)}
                </View>
              )}

              {completedRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Completed ({completedRequests.length})
                  </Text>
                  {completedRequests.map(renderRequestCard)}
                </View>
              )}

              {canceledRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Canceled ({canceledRequests.length})
                  </Text>
                  {canceledRequests.map(renderRequestCard)}
                </View>
              )}
            </>
          )}
        </ScrollView>

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
                <View style={styles.modalHeaderContent}>
                  <MessageSquare color={colors.primary} size={24} />
                  <View>
                    <Text style={styles.modalTitle}>Messages</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedRequest?.title}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseMessagesModal}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                ref={scrollViewRef}
                style={styles.messagesScrollView}
                contentContainerStyle={styles.messagesScrollContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {(!selectedRequest?.messages || selectedRequest.messages.length === 0) ? (
                  <View style={styles.emptyMessagesState}>
                    <MessageSquare color={colors.textTertiary} size={48} />
                    <Text style={styles.emptyMessagesText}>
                      No messages yet. Start the conversation!
                    </Text>
                  </View>
                ) : (
                  selectedRequest.messages.map((msg: Message) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageBubble,
                        msg.sender === "user"
                          ? styles.userMessage
                          : styles.adminMessage,
                      ]}
                    >
                      <View style={styles.messageHeader}>
                        <Text
                          style={[
                            styles.messageSender,
                            msg.sender === "user"
                              ? styles.userSender
                              : styles.adminSender,
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
                <TextInput
                  style={styles.messageInput}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Type your message..."
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
                <View style={styles.modalHeaderContent}>
                  <AlertCircle color={colors.error} size={24} />
                  <View>
                    <Text style={styles.modalTitle}>Cancel Request</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedRequest?.title}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseCancelModal}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.cancelModalBody}>
                <Text style={styles.inputLabel}>
                  Please enter the reason for canceling this request
                </Text>
                <TextInput
                  style={styles.cancelInput}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="Example: Found another service provider, resolved the issue, changed plans, etc."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCloseCancelModal}
                  >
                    <Text style={styles.cancelButtonText}>Go Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.confirmCancelButton,
                      !cancelReason.trim() && styles.confirmCancelButtonDisabled,
                    ]}
                    onPress={handleConfirmCancel}
                    disabled={!cancelReason.trim()}
                  >
                    <XCircle color={colors.white} size={18} />
                    <Text style={styles.confirmCancelButtonText}>Cancel Request</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal
          visible={editAddressModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseEditAddressModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              style={styles.modalContent}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <View style={styles.modalHeaderContent}>
                  <MapPin color={colors.primary} size={24} />
                  <View>
                    <Text style={styles.modalTitle}>Edit Service Address</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedRequest?.title}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleCloseEditAddressModal}
                >
                  <X color={colors.textSecondary} size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.editAddressModalBody}>
                <Text style={styles.inputLabel}>
                  Enter the service location address
                </Text>
                <TextInput
                  style={styles.addressEditInput}
                  value={editingAddress}
                  onChangeText={setEditingAddress}
                  placeholder="123 Main St, City, State 12345"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  autoFocus
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCloseEditAddressModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveAddressButton}
                    onPress={handleSaveAddress}
                  >
                    <Text style={styles.saveAddressButtonText}>Save Address</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {photoGalleryRequest && (
          <PhotoGalleryModal
            visible={photoGalleryVisible}
            onClose={() => {
              setPhotoGalleryVisible(false);
              setPhotoGalleryRequest(null);
            }}
            request={photoGalleryRequest}
            onAddPhoto={async (photoUri) => {
              await addPhoto(photoGalleryRequest.id, photoUri);
            }}
            onRemovePhoto={async (photoUri) => {
              await removePhoto(photoGalleryRequest.id, photoUri);
            }}
          />
        )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
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
    borderWidth: 1,
    borderColor: colors.border,
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
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  messagesModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    height: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  messagesScrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messagesScrollContent: {
    padding: 16,
    gap: 12,
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
  cancelModalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  cancelInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 140,
    maxHeight: 200,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
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
  confirmCancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: colors.error,
    borderRadius: 12,
  },
  confirmCancelButtonDisabled: {
    opacity: 0.5,
  },
  confirmCancelButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
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
  locationHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.primary + "15",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  editAddressButtonText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  noAddressContainer: {
    padding: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed" as const,
    borderColor: colors.border,
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  noAddressText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic" as const,
  },
  addAddressButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + "15",
    borderRadius: 6,
  },
  addAddressButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  editAddressModalBody: {
    padding: 20,
  },
  addressEditInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 100,
    maxHeight: 200,
    marginBottom: 20,
  },
  saveAddressButton: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveAddressButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.white,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    backgroundColor: colors.error + "10",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + "30",
    marginBottom: 20,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.error,
  },
  photosButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    padding: 14,
    backgroundColor: "#FFA500",
    borderRadius: 10,
  },
  assignedStaffContainer: {
    gap: 8,
    marginTop: 4,
  },
  assignedStaffBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    padding: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  assignedStaffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  staffAvatarAdmin: {
    backgroundColor: colors.primary,
  },
  staffAvatarWorker: {
    backgroundColor: colors.success,
  },
  assignedStaffAvatarText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  assignedStaffInfo: {
    flex: 1,
    gap: 2,
  },
  assignedStaffName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  assignedStaffRole: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
