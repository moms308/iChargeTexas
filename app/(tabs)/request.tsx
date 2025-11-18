import { useService } from "@/constants/serviceContext";
import colors from "@/constants/colors";
import { ServiceType } from "@/constants/types";
import { roadsideServices, isAfterHours, calculateServicePrice } from "@/constants/serviceData";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Truck, BatteryCharging, MapPin, Send, Calendar, Clock, Check, Settings, AlertCircle, Users, ChevronLeft, ChevronRight, Copy, Phone, Mail, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

export default function RequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; latitude?: string; longitude?: string; address?: string }>();
  const { addRequest, requests } = useService();
  const insets = useSafeAreaInsets();
  
  const [serviceType, setServiceType] = useState<ServiceType>(
    (params.type as ServiceType) || "roadside"
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [fullscreenInput, setFullscreenInput] = useState<{
    visible: boolean;
    value: string;
    placeholder: string;
    label: string;
    field: string;
    multiline: boolean;
  } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">("PM");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [spareTireStatus, setSpareTireStatus] = useState<'yes' | 'no' | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };

  const getMonthName = (month: number) => {
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return months[month];
  };

  const renderCalendarDays = () => {
    const { firstDay, daysInMonth, year, month } = getDaysInMonth(calendarDate);
    const days: React.ReactElement[] = [];
    const today = new Date();
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateToCheck = new Date(year, month, day);
      const isPast = dateToCheck < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isPast && styles.calendarDayDisabled,
          ]}
          disabled={isPast}
          onPress={() => {
            const selectedDate = new Date(year, month, day);
            const formatted = `${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${String(selectedDate.getDate()).padStart(2, '0')}/${selectedDate.getFullYear()}`;
            setPreferredDate(formatted);
            setShowDatePicker(false);
          }}
        >
          <Text style={[
            styles.calendarDayText,
            isPast && styles.calendarDayTextDisabled,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  useEffect(() => {
    if (params.type) {
      setServiceType(params.type as ServiceType);
    }
    if (params.address) {
      setAddress(params.address);
    }
  }, [params.type, params.address]);

  const getLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== "granted") {
        setIsLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error getting location:", error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    if (params.latitude && params.longitude) {
      const lat = parseFloat(params.latitude);
      const lng = parseFloat(params.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        setLocation({
          coords: {
            latitude: lat,
            longitude: lng,
            altitude: null,
            accuracy: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        setIsLoadingLocation(false);
        return;
      }
    }
    
    getLocation();
  }, [params.latitude, params.longitude]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleService = (serviceId: string) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
    } else {
      newSelected.add(serviceId);
    }
    setSelectedServices(newSelected);
  };

  const calculateTotal = (): { subtotal: number; tax: number; total: number } => {
    const subtotal = Array.from(selectedServices).reduce((sum, serviceId) => {
      const service = roadsideServices.find(s => s.id === serviceId);
      if (!service) return sum;
      return sum + calculateServicePrice(service, currentDateTime);
    }, 0);
    const tax = subtotal * 0.0825;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter your name");
      return;
    }

    if (!phone.trim()) {
      Alert.alert("Required Field", "Please enter your phone number");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Required Field", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Required Field", "Please enter a title for your request");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Required Field", "Please enter a description");
      return;
    }

    if (!vehicleInfo.trim()) {
      Alert.alert("Required Field", "Please enter vehicle information");
      return;
    }

    if (!preferredDate.trim()) {
      Alert.alert("Required Field", "Please enter a preferred date");
      return;
    }

    if (!preferredTime.trim()) {
      Alert.alert("Required Field", "Please enter a preferred time");
      return;
    }

    if (serviceType === "roadside") {
      if (spareTireStatus === null) {
        Alert.alert("Required Field", "Please indicate if you have a spare tire");
        return;
      }

      if (selectedServices.size === 0) {
        Alert.alert("Required Field", "Please select at least one service");
        return;
      }
    }

    if (serviceType === "charging" && selectedServices.size === 0) {
      Alert.alert("Required Field", "Please select at least one charging service");
      return;
    }

    if (!location) {
      Alert.alert("Location Required", "Please wait for location to be detected or try again");
      return;
    }

    let currentLocationCoords = undefined;
    
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      currentLocationCoords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      console.log('[Request] Captured current user location:', currentLocationCoords);
    } catch (error) {
      console.error('[Request] Could not get current location:', error);
    }

    const pendingCount = requests.filter(r => r.status === "pending").length;
    const newPosition = pendingCount + 1;

    const selectedServicesData = Array.from(selectedServices).map(serviceId => {
      const service = roadsideServices.find(s => s.id === serviceId);
      if (!service) return null;
      const price = calculateServicePrice(service, currentDateTime);
      return {
        serviceId: service.id,
        serviceName: service.name,
        price,
        isAfterHours: isAfterHours(currentDateTime),
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);

    const { total } = calculateTotal();

    addRequest({
      type: serviceType,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      title: title.trim(),
      description: description.trim(),
      vehicleInfo: vehicleInfo.trim(),
      preferredDate,
      preferredTime,
      hasSpareTire: serviceType === "roadside" ? spareTireStatus === 'yes' : false,
      selectedServices: selectedServicesData.length > 0 ? selectedServicesData : undefined,
      totalAmount: selectedServicesData.length > 0 ? total : undefined,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address.trim() || undefined,
        currentLocationCoordinates: currentLocationCoords,
      },
      status: "pending",
    });

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setQueuePosition(newPosition);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      router.push("/(tabs)/history");
    }, 1500);
  };

  if (showSuccess) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.background, colors.surface]}
          style={styles.gradient}
        >
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Check color={colors.success} size={64} />
            </View>
            <Text style={styles.successTitle}>Request Submitted!</Text>
            <Text style={styles.successMessage}>
              Your service request has been created successfully
            </Text>
            
            {queuePosition && (
              <View style={styles.queuePositionCard}>
                <View style={styles.queuePositionHeader}>
                  <Users color={colors.primary} size={24} />
                  <Text style={styles.queuePositionTitle}>Queue Position</Text>
                </View>
                <View style={styles.queuePositionBadge}>
                  <Text style={styles.queuePositionNumber}>#{queuePosition}</Text>
                </View>
                <Text style={styles.queuePositionText}>
                  You are number {queuePosition} in the service queue
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  }

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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                serviceType === "roadside" && styles.typeButtonActive,
                { borderColor: colors.roadside },
              ]}
              onPress={() => setServiceType("roadside")}
            >
              <Truck
                color={serviceType === "roadside" ? colors.white : colors.roadside}
                size={24}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  serviceType === "roadside" && styles.typeButtonTextActive,
                  { color: serviceType === "roadside" ? colors.white : colors.roadside },
                ]}
              >
                Roadside
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                serviceType === "charging" && styles.typeButtonActive,
                { borderColor: colors.charging },
              ]}
              onPress={() => setServiceType("charging")}
            >
              <BatteryCharging
                color={serviceType === "charging" ? colors.white : colors.charging}
                size={24}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  serviceType === "charging" && styles.typeButtonTextActive,
                  { color: serviceType === "charging" ? colors.white : colors.charging },
                ]}
              >
                Charging
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Name <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setFullscreenInput({
                visible: true,
                value: name,
                placeholder: "Your full name",
                label: "Name",
                field: "name",
                multiline: false,
              })}
            >
              <Text style={[styles.inputText, !name && styles.placeholderText]}>
                {name || "Your full name"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Phone size={14} color={colors.textSecondary} /> Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setFullscreenInput({
                visible: true,
                value: phone,
                placeholder: "(555) 123-4567",
                label: "Phone Number",
                field: "phone",
                multiline: false,
              })}
            >
              <Text style={[styles.inputText, !phone && styles.placeholderText]}>
                {phone || "(555) 123-4567"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              <Mail size={14} color={colors.textSecondary} /> Email <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setFullscreenInput({
                visible: true,
                value: email,
                placeholder: "your.email@example.com",
                label: "Email",
                field: "email",
                multiline: false,
              })}
            >
              <Text style={[styles.inputText, !email && styles.placeholderText]}>
                {email || "your.email@example.com"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setFullscreenInput({
                visible: true,
                value: title,
                placeholder: "Brief description of your request",
                label: "Title",
                field: "title",
                multiline: false,
              })}
            >
              <Text style={[styles.inputText, !title && styles.placeholderText]}>
                {title || "Brief description of your request"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.input, styles.textArea]}
              onPress={() => setFullscreenInput({
                visible: true,
                value: description,
                placeholder: "Additional details about your request",
                label: "Description",
                field: "description",
                multiline: true,
              })}
            >
              <Text style={[styles.inputText, !description && styles.placeholderText]}>
                {description || "Additional details about your request"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Vehicle Information <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setFullscreenInput({
                visible: true,
                value: vehicleInfo,
                placeholder: "Make, model, year",
                label: "Vehicle Information",
                field: "vehicleInfo",
                multiline: false,
              })}
            >
              <Text style={[styles.inputText, !vehicleInfo && styles.placeholderText]}>
                {vehicleInfo || "Make, model, year"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <Text style={styles.label}>
                <Calendar size={14} color={colors.textSecondary} /> Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.inputText, !preferredDate && styles.placeholderText]}>
                  {preferredDate || "MM/DD/YYYY"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.section, styles.halfWidth]}>
              <Text style={styles.label}>
                <Clock size={14} color={colors.textSecondary} /> Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  if (preferredTime) {
                    const [time, period] = preferredTime.split(" ");
                    const [hour, minute] = time.split(":");
                    setSelectedHour(parseInt(hour));
                    setSelectedMinute(parseInt(minute));
                    setSelectedPeriod(period as "AM" | "PM");
                  }
                  setShowTimePicker(true);
                }}
              >
                <Text style={[styles.inputText, !preferredTime && styles.placeholderText]}>
                  {preferredTime || "HH:MM"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {serviceType === "roadside" && (
            <View style={styles.section}>
              <Text style={styles.label}>
                Do you have a spare tire? <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={[
                    styles.checkboxOption,
                    spareTireStatus === 'yes' && styles.checkboxOptionSelected,
                  ]}
                  onPress={() => setSpareTireStatus('yes')}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkboxIcon,
                    spareTireStatus === 'yes' && styles.checkboxIconSelected,
                  ]}>
                    {spareTireStatus === 'yes' && (
                      <Check color={colors.white} size={20} strokeWidth={3} />
                    )}
                  </View>
                  <Text style={[
                    styles.checkboxText,
                    spareTireStatus === 'yes' && styles.checkboxTextSelected,
                  ]}>
                    Yes, I have a spare tire
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.checkboxOption,
                    spareTireStatus === 'no' && styles.checkboxOptionSelected,
                  ]}
                  onPress={() => setSpareTireStatus('no')}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkboxIcon,
                    spareTireStatus === 'no' && styles.checkboxIconSelected,
                  ]}>
                    {spareTireStatus === 'no' && (
                      <X color={colors.white} size={20} strokeWidth={3} />
                    )}
                  </View>
                  <Text style={[
                    styles.checkboxText,
                    spareTireStatus === 'no' && styles.checkboxTextSelected,
                  ]}>
                    No, I don&apos;t have a spare tire
                  </Text>
                </TouchableOpacity>
              </View>
              {spareTireStatus === 'no' && (
                <View style={styles.noSpareWarning}>
                  <View style={styles.noSpareWarningHeader}>
                    <AlertCircle color={colors.warning} size={18} />
                    <Text style={styles.noSpareWarningTitle}>Important Notice</Text>
                  </View>
                  <Text style={styles.noSpareWarningText}>
                    After-hours service (6 PM - 11 AM) is not available for tire changes without a spare tire.
                  </Text>
                </View>
              )}
            </View>
          )}

          {(serviceType === "roadside" || serviceType === "charging") && (
            <View style={styles.section}>
              <View style={styles.servicesHeader}>
                <Text style={styles.label}>
                  Select Services <Text style={styles.required}>*</Text>
                </Text>
                {isAfterHours(currentDateTime) && (
                  <View style={styles.afterHoursBadge}>
                    <Clock size={12} color={colors.white} />
                    <Text style={styles.afterHoursBadgeText}>After Hours</Text>
                  </View>
                )}
              </View>
              <Text style={styles.servicesSubtext}>
                {isAfterHours(currentDateTime)
                  ? "After-hours pricing (6 PM - 11 AM) is in effect"
                  : "Standard pricing (11 AM - 6 PM)"}
              </Text>
              <View style={styles.servicesGrid}>
                {roadsideServices
                  .filter(service => {
                    if (serviceType === "charging") {
                      return service.id === "generator_charging";
                    }
                    return service.id !== "generator_charging";
                  })
                  .map((service) => {
                    const price = calculateServicePrice(service, currentDateTime);
                    const isSelected = selectedServices.has(service.id);
                    const showBreakdown = service.travelFee > 0;
                    return (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.serviceCard,
                          isSelected && styles.serviceCardSelected,
                        ]}
                        onPress={() => toggleService(service.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.serviceCheckboxNew,
                          isSelected && styles.serviceCheckboxSelected,
                        ]}>
                          {isSelected && (
                            <Check color={colors.white} size={24} strokeWidth={3} />
                          )}
                        </View>
                        <View style={styles.serviceInfo}>
                          <Text style={[
                            styles.serviceName,
                            isSelected && styles.serviceNameSelected,
                          ]}>
                            {service.name}
                          </Text>
                          <View style={styles.servicePricing}>
                            <Text style={[
                              styles.servicePrice,
                              isSelected && styles.servicePriceSelected,
                            ]}>
                              ${price.toFixed(2)}
                            </Text>
                            {showBreakdown && (
                              <Text style={styles.servicePriceBreakdown}>
                                (${isAfterHours(currentDateTime) ? service.afterHoursPrice.toFixed(2) : service.basePrice.toFixed(2)} + ${service.travelFee} travel)
                              </Text>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
              {selectedServices.size > 0 && (
                <View style={styles.totalCard}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal:</Text>
                    <Text style={styles.totalValue}>
                      ${calculateTotal().subtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax (8.25%):</Text>
                    <Text style={styles.totalValue}>
                      ${calculateTotal().tax.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.totalRow, styles.totalRowFinal]}>
                    <Text style={styles.totalLabelFinal}>Total:</Text>
                    <Text style={styles.totalValueFinal}>
                      ${calculateTotal().total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.locationHeader}>
              <Text style={styles.label}>
                <MapPin size={14} color={colors.textSecondary} /> Location of Service
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={getLocation}
                disabled={isLoadingLocation}
              >
                <Text style={styles.refreshButtonText}>
                  {isLoadingLocation ? "Loading..." : "Refresh"}
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingLocation ? (
              <View style={styles.locationLoading}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.locationLoadingText}>
                  Getting your location...
                </Text>
              </View>
            ) : location ? (
              <View style={styles.locationSection}>
                <View style={styles.addressInputContainer}>
                  <Text style={styles.addressLabel}>Service Address</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter service address (optional)"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                  />
                </View>
                <View style={styles.locationInfoCard}>
                  <View style={styles.coordinatesTitleRow}>
                    <Text style={styles.coordinatesTitle}>GPS Coordinates</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={async () => {
                        const coords = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
                        await Clipboard.setStringAsync(coords);
                        if (Platform.OS !== "web") {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                        Alert.alert("Copied", "GPS coordinates copied to clipboard");
                      }}
                    >
                      <Copy color={colors.primary} size={18} />
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.locationInfo}>
                    <View style={styles.coordinateRow}>
                      <Text style={styles.coordinateLabel}>Latitude:</Text>
                      <Text style={styles.coordinateValue}>
                        {location.coords.latitude.toFixed(6)}°
                      </Text>
                    </View>
                    <View style={styles.coordinateRow}>
                      <Text style={styles.coordinateLabel}>Longitude:</Text>
                      <Text style={styles.coordinateValue}>
                        {location.coords.longitude.toFixed(6)}°
                      </Text>
                    </View>
                  </View>
                  {params.latitude && params.longitude && (
                    <View style={styles.locationBadge}>
                      <Check color={colors.success} size={14} />
                      <Text style={styles.locationBadgeText}>Using selected location</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.locationErrorContainer}>
                <View style={styles.locationErrorHeader}>
                  <AlertCircle color={colors.error} size={20} />
                  <Text style={styles.locationErrorTitle}>Location Required</Text>
                </View>
                <Text style={styles.locationErrorMessage}>
                  GPS coordinates are essential for roadside assistance. Please enable location tracking to submit your request.
                </Text>
                <TouchableOpacity
                  style={styles.enableLocationButton}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      Alert.alert(
                        "Enable Location",
                        "Please allow location access when prompted by your browser."
                      );
                      await getLocation();
                    } else {
                      Alert.alert(
                        "Enable Location Services",
                        "Go to Settings to enable location permissions for this app.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Open Settings",
                            onPress: () => {
                              if (Platform.OS === 'ios') {
                                Linking.openURL('app-settings:');
                              } else {
                                Linking.openSettings();
                              }
                            },
                          },
                        ]
                      );
                    }
                  }}
                >
                  <Settings color={colors.white} size={16} />
                  <Text style={styles.enableLocationButtonText}>Enable Location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.retryLocationButton}
                  onPress={getLocation}
                >
                  <Text style={styles.retryLocationButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Image
              source={{ uri: "https://r2-pub.rork.com/generated-images/a17fb1cf-ad47-403c-9754-ed7a59d6e7d8.png" }}
              style={styles.mascotButtonIcon}
              resizeMode="contain"
            />
            <View style={styles.submitButtonContent}>
              <Send color={colors.white} size={20} />
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.helpText}>
            Your request will be logged and viewable in the history tab
          </Text>
        </ScrollView>

        <Modal
          visible={showDatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Select Date</Text>
                <TouchableOpacity
                  style={styles.calendarCloseButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.calendarCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.calendarContent}>
                <View style={styles.calendarNavigation}>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() => {
                      const newDate = new Date(calendarDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setCalendarDate(newDate);
                    }}
                  >
                    <ChevronLeft color={colors.primary} size={24} />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthYear}>
                    {getMonthName(calendarDate.getMonth())} {calendarDate.getFullYear()}
                  </Text>
                  <TouchableOpacity
                    style={styles.calendarNavButton}
                    onPress={() => {
                      const newDate = new Date(calendarDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      const maxDate = new Date();
                      maxDate.setMonth(maxDate.getMonth() + 3);
                      if (newDate <= maxDate) {
                        setCalendarDate(newDate);
                      }
                    }}
                  >
                    <ChevronRight color={colors.primary} size={24} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekdays}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <Text key={day} style={styles.calendarWeekday}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.calendarDaysContainer}>
                  {renderCalendarDays()}
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showTimePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.timePickerModal}>
              <View style={styles.timePickerHeader}>
                <TouchableOpacity
                  style={styles.timePickerCancelButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.timePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.timePickerTitle}>Select Time</Text>
                <TouchableOpacity
                  style={styles.timePickerDoneButton}
                  onPress={() => {
                    const formattedTime = `${selectedHour}:${String(selectedMinute).padStart(2, '0')} ${selectedPeriod}`;
                    setPreferredTime(formattedTime);
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.timePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.timePickerContent}>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Hour</Text>
                  <ScrollView 
                    style={styles.timePickerScroll}
                    contentContainerStyle={styles.timePickerScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timePickerOption,
                          selectedHour === hour && styles.timePickerOptionSelected,
                        ]}
                        onPress={() => setSelectedHour(hour)}
                      >
                        <Text
                          style={[
                            styles.timePickerOptionText,
                            selectedHour === hour && styles.timePickerOptionTextSelected,
                          ]}
                        >
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Minute</Text>
                  <ScrollView 
                    style={styles.timePickerScroll}
                    contentContainerStyle={styles.timePickerScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timePickerOption,
                          selectedMinute === minute && styles.timePickerOptionSelected,
                        ]}
                        onPress={() => setSelectedMinute(minute)}
                      >
                        <Text
                          style={[
                            styles.timePickerOptionText,
                            selectedMinute === minute && styles.timePickerOptionTextSelected,
                          ]}
                        >
                          {String(minute).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Period</Text>
                  <ScrollView 
                    style={styles.timePickerScroll}
                    contentContainerStyle={styles.timePickerScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {["AM", "PM"].map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.timePickerOption,
                          selectedPeriod === period && styles.timePickerOptionSelected,
                        ]}
                        onPress={() => setSelectedPeriod(period as "AM" | "PM")}
                      >
                        <Text
                          style={[
                            styles.timePickerOptionText,
                            selectedPeriod === period && styles.timePickerOptionTextSelected,
                          ]}
                        >
                          {period}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
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
                onPress={() => setFullscreenInput(null)}
              >
                <Text style={styles.fullscreenCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.fullscreenTitle}>{fullscreenInput?.label}</Text>
              <TouchableOpacity
                style={styles.fullscreenDoneButton}
                onPress={() => {
                  if (fullscreenInput) {
                    switch (fullscreenInput.field) {
                      case "name":
                        setName(fullscreenInput.value);
                        break;
                      case "phone":
                        setPhone(fullscreenInput.value);
                        break;
                      case "email":
                        setEmail(fullscreenInput.value);
                        break;
                      case "title":
                        setTitle(fullscreenInput.value);
                        break;
                      case "description":
                        setDescription(fullscreenInput.value);
                        break;
                      case "vehicleInfo":
                        setVehicleInfo(fullscreenInput.value);
                        break;
                      case "preferredDate":
                        setPreferredDate(fullscreenInput.value);
                        break;
                      case "preferredTime":
                        setPreferredTime(fullscreenInput.value);
                        break;
                    }
                  }
                  setFullscreenInput(null);
                }}
              >
                <Text style={styles.fullscreenDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.fullscreenInput,
                fullscreenInput?.multiline && styles.fullscreenInputMultiline,
              ]}
              value={fullscreenInput?.value || ""}
              onChangeText={(text) =>
                setFullscreenInput((prev) => (prev ? { ...prev, value: text } : null))
              }
              placeholder={fullscreenInput?.placeholder}
              placeholderTextColor={colors.textTertiary}
              multiline={fullscreenInput?.multiline}
              autoFocus
              keyboardType={
                fullscreenInput?.field === "preferredDate" || fullscreenInput?.field === "preferredTime" 
                  ? "numeric" 
                  : fullscreenInput?.field === "phone" 
                    ? "phone-pad" 
                    : fullscreenInput?.field === "email" 
                      ? "email-address" 
                      : "default"
              }
              autoCapitalize={fullscreenInput?.field === "email" ? "none" : "sentences"}
            />
          </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  typeButtonTextActive: {
    color: colors.white,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.white,
  },
  locationLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  locationSection: {
    gap: 16,
  },
  addressInputContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  addressInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: "top",
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coordinatesTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  coordinatesTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  locationInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationInfo: {
    gap: 12,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.success + "20",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.success,
  },
  coordinateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coordinateLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500" as const,
  },
  coordinateValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600" as const,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  locationErrorContainer: {
    padding: 16,
    backgroundColor: colors.error + "15",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.error,
    gap: 12,
  },
  locationErrorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationErrorTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.error,
  },
  locationErrorMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  enableLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  enableLocationButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.white,
  },
  retryLocationButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  retryLocationButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.error,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: 18,
    paddingLeft: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mascotButtonIcon: {
    width: 50,
    height: 50,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  helpText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.success + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  queuePositionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    width: "100%",
    marginTop: 8,
  },
  queuePositionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  queuePositionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  queuePositionBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  queuePositionNumber: {
    fontSize: 36,
    fontWeight: "700" as const,
    color: colors.white,
  },
  queuePositionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
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
  fullscreenInputMultiline: {
    paddingTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 20,
  },
  calendarModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  calendarHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  calendarCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error + "20",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  calendarCloseText: {
    fontSize: 20,
    color: colors.error,
    fontWeight: "700" as const,
  },
  timePickerModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  timePickerHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  timePickerCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.error + "20",
    borderRadius: 8,
  },
  timePickerCancelText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: "600" as const,
  },
  timePickerDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
  },
  timePickerDoneText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  timePickerContent: {
    flexDirection: "row" as const,
    padding: 20,
    gap: 12,
  },
  timePickerColumn: {
    flex: 1,
    alignItems: "center" as const,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  timePickerScroll: {
    maxHeight: 200,
    width: "100%",
  },
  timePickerScrollContent: {
    alignItems: "center" as const,
    paddingVertical: 8,
  },
  timePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 4,
    width: "100%",
    alignItems: "center" as const,
    backgroundColor: colors.background,
  },
  timePickerOptionSelected: {
    backgroundColor: colors.primary,
  },
  timePickerOptionText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.text,
  },
  timePickerOptionTextSelected: {
    color: colors.white,
  },
  calendarContent: {
    padding: 20,
  },
  calendarNavigation: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  calendarNavButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  calendarWeekdays: {
    flexDirection: "row" as const,
    marginBottom: 12,
  },
  calendarWeekday: {
    flex: 1,
    textAlign: "center" as const,
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  calendarDaysContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 8,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
  },
  calendarDayTextDisabled: {
    color: colors.textTertiary,
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkboxOptionSelected: {
    backgroundColor: colors.primary + "15",
    borderColor: colors.primary,
    borderWidth: 2,
  },
  checkboxIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  checkboxIconSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxText: {
    fontSize: 16,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: "500" as const,
  },
  checkboxTextSelected: {
    color: colors.text,
    fontWeight: "600" as const,
  },
  servicesHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  afterHoursBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  afterHoursBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.white,
  },
  servicesSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  servicesGrid: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  serviceCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + "15",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceCheckboxNew: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  serviceCheckboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceInfo: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  serviceNameSelected: {
    color: colors.text,
    fontWeight: "700" as const,
  },
  servicePricing: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  servicePrice: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.textSecondary,
  },
  servicePriceSelected: {
    color: colors.primary,
    fontSize: 18,
  },
  servicePriceBreakdown: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  totalCard: {
    backgroundColor: colors.primary + "10",
    borderRadius: 14,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: 12,
    gap: 10,
  },
  totalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500" as const,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  totalRowFinal: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  totalValueFinal: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  noSpareWarning: {
    marginTop: 16,
    backgroundColor: colors.warning + "15",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.warning,
    gap: 8,
  },
  noSpareWarningHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  noSpareWarningTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.warning,
  },
  noSpareWarningText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
