import { useService } from "@/constants/serviceContext";
import { useLanguage } from "@/constants/languageContext";
import { translations } from "@/constants/translations";
import { useTheme } from "@/constants/themeContext";
import { useRouter } from "expo-router";
import { useAuth } from "@/constants/authContext";
import * as Location from "expo-location";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  MapPin,
  Truck,
  Navigation,
  AlertCircle,
  Settings,
  Copy,
  ArrowRight,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
  ImageBackground,
  Image,
  TextInput,
} from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { requests } = useService();
  const { isAuthenticated, user } = useAuth();
  const { colors } = useTheme();

  const { language, changeLanguage } = useLanguage();
  const t = translations[language] || translations.en;
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [address, setAddress] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingLocation(true);
        
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setLocationError("Location services are disabled. Please enable them in Settings.");
          setIsLoadingLocation(false);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== "granted") {
          setLocationError("Location permission denied. Please enable in Settings.");
          setIsLoadingLocation(false);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 0,
        });
        setLocation(currentLocation);
        setLocationError(null);
      } catch (error: any) {
        console.error("Error getting location:", error);
        const errorMessage = error?.message || "Unable to get location";
        
        if (errorMessage.includes("kCLErrorDomain") || errorMessage.includes("location")) {
          setLocationError("Cannot access location. Please check that Location Services are enabled in Settings > Privacy > Location Services.");
        } else {
          setLocationError("Unable to get location. Please try again.");
        }
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);



  const pendingRequests = requests.filter((r) => r.status === "pending");

  const copyCoordinates = async () => {
    if (!location) return;
    
    const coordText = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
    await Clipboard.setStringAsync(coordText);
    
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useThisLocation = () => {
    if (!location) return;
    
    router.push({
      pathname: "/(tabs)/request",
      params: {
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
        address: address || undefined,
      },
    });
  };



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.camoBackground, { backgroundColor: colors.background }]}>
        <ImageBackground
          source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/qk0o9iz3d1u2fd4x94ud3" }}
          style={styles.robotBackground}
          imageStyle={styles.robotImage}
          resizeMode="contain"
        >
          <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.languageButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                { borderColor: colors.border },
                language === "en" && [styles.languageButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
              ]}
              onPress={() => changeLanguage("en")}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  { color: colors.textSecondary },
                  language === "en" && [styles.languageButtonTextActive, { color: colors.white }],
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                { borderColor: colors.border },
                language === "es" && [styles.languageButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
              ]}
              onPress={() => changeLanguage("es")}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  { color: colors.textSecondary },
                  language === "es" && [styles.languageButtonTextActive, { color: colors.white }],
                ]}
              >
                Spanish
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>{t.appTitle}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.subtitle}</Text>
            </View>
          </View>

          {pendingRequests.length > 0 && (
            <View style={[styles.queueCounter, { borderColor: colors.primary }]}>
              <View style={styles.queueCounterContent}>
                <View style={[styles.queueBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.queueNumber, { color: colors.white }]}>{pendingRequests.length}</Text>
                </View>
                <View style={styles.queueInfo}>
                  <Text style={[styles.queueTitle, { color: colors.text }]}>{t.serviceQueue}</Text>
                  <Text style={[styles.queueSubtitle, { color: colors.textSecondary }]}>
                    {pendingRequests.length === 1 ? `1 ${t.requestInQueue}` : `${pendingRequests.length} ${t.requestsInQueue}`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <MapPin color={colors.primary} size={20} />
              <Text style={[styles.locationTitle, { color: colors.text }]}>{t.currentLocation}</Text>
            </View>
            
            {isLoadingLocation && (
              <View style={styles.locationLoading}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.locationLoadingText, { color: colors.textSecondary }]}>
                  {t.gettingLocation}
                </Text>
              </View>
            )}

            {locationError && !isLoadingLocation && (
              <View style={[styles.locationErrorContainer, { backgroundColor: colors.error + "15", borderColor: colors.error }]}>
                <View style={styles.locationErrorHeader}>
                  <AlertCircle color={colors.error} size={20} />
                  <Text style={[styles.locationErrorTitle, { color: colors.error }]}>{t.locationRequired}</Text>
                </View>
                <Text style={[styles.locationErrorText, { color: colors.text }]}>
                  {t.locationRequiredDesc}
                </Text>
                <TouchableOpacity
                  style={[styles.enableLocationButton, { backgroundColor: colors.error }]}
                  onPress={async () => {
                    if (Platform.OS === 'web') {
                      Alert.alert(
                        t.enableLocation,
                        t.enableLocationWeb
                      );
                    } else {
                      Alert.alert(
                        t.enableLocation,
                        t.enableLocationNative,
                        [
                          { text: t.cancel, style: "cancel" },
                          {
                            text: t.openSettings,
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
                  <Text style={[styles.enableLocationButtonText, { color: colors.white }]}>{t.enableLocation}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={async () => {
                    setIsLoadingLocation(true);
                    try {
                      const servicesEnabled = await Location.hasServicesEnabledAsync();
                      if (!servicesEnabled) {
                        setLocationError("Location services are disabled. Please enable them in Settings.");
                        setIsLoadingLocation(false);
                        return;
                      }

                      const { status } = await Location.requestForegroundPermissionsAsync();
                      if (status === "granted") {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        const currentLocation = await Location.getCurrentPositionAsync({
                          accuracy: Location.Accuracy.Balanced,
                          timeInterval: 10000,
                          distanceInterval: 0,
                        });
                        setLocation(currentLocation);
                        setLocationError(null);
                      } else {
                        setLocationError("Location permission denied. Please enable in Settings.");
                      }
                    } catch (error: any) {
                      console.error("Error getting location:", error);
                      const errorMessage = error?.message || "Unable to get location";
                      
                      if (errorMessage.includes("kCLErrorDomain") || errorMessage.includes("location")) {
                        setLocationError("Cannot access location. Please check that Location Services are enabled in Settings > Privacy > Location Services.");
                      } else {
                        setLocationError("Unable to get location. Please try again.");
                      }
                    } finally {
                      setIsLoadingLocation(false);
                    }
                  }}
                >
                  <Text style={[styles.retryButtonText, { color: colors.error }]}>{t.tryAgain}</Text>
                </TouchableOpacity>
              </View>
            )}

            {location && !isLoadingLocation && (
              <View style={styles.locationInfo}>
                <View style={[styles.addressInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>Service Address</Text>
                  <TextInput
                    style={[styles.addressInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter service address (optional)"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                  />
                </View>
                <View style={[styles.coordinatesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.coordinatesTitle, { color: colors.textSecondary }]}>GPS Coordinates</Text>
                  <View style={styles.coordinateRow}>
                    <Text style={[styles.coordinateLabel, { color: colors.textSecondary }]}>{t.latitude}</Text>
                    <Text style={[styles.coordinateValue, { color: colors.text }]}>
                      {location.coords.latitude.toFixed(6)}°
                    </Text>
                  </View>
                  <View style={styles.coordinateRow}>
                    <Text style={[styles.coordinateLabel, { color: colors.textSecondary }]}>{t.longitude}</Text>
                    <Text style={[styles.coordinateValue, { color: colors.text }]}>
                      {location.coords.longitude.toFixed(6)}°
                    </Text>
                  </View>
                  {location.coords.accuracy && (
                    <Text style={[styles.accuracyText, { color: colors.textTertiary }]}>
                      {t.accuracy} ±{Math.round(location.coords.accuracy)}m
                    </Text>
                  )}
                </View>
                
                <View style={styles.locationActions}>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: colors.background, borderColor: colors.primary }]}
                    onPress={copyCoordinates}
                  >
                    <Copy color={colors.primary} size={16} />
                    <Text style={[styles.copyButtonText, { color: colors.primary }]}>
                      {copied ? t.copied : t.copy}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.useLocationButton, { backgroundColor: colors.primary }]}
                    onPress={useThisLocation}
                  >
                    <Image
                      source={{ uri: "https://r2-pub.rork.com/generated-images/a17fb1cf-ad47-403c-9754-ed7a59d6e7d8.png" }}
                      style={styles.mascotSmallIcon}
                      resizeMode="contain"
                    />
                    <Text style={[styles.useLocationButtonText, { color: colors.white }]}>
                      {t.isServiceAtLocation}
                    </Text>
                    <ArrowRight color={colors.white} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.servicesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.services}</Text>
            <View style={styles.serviceCards}>
              <TouchableOpacity
                style={[styles.serviceCard, { backgroundColor: colors.roadside }]}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/request",
                    params: { type: "roadside" },
                  })
                }
              >
                <View style={styles.serviceContent}>
                  <View style={styles.serviceIconContainer}>
                    <Truck color={colors.white} size={32} />
                  </View>
                  <Text style={[styles.serviceTitle, { color: colors.white }]}>{t.roadsideAssistance}</Text>
                  <Text style={[styles.serviceDescription, { color: colors.white }]}>
                    {t.roadsideDesc}
                  </Text>
                </View>
                <Image
                  source={{ uri: "https://r2-pub.rork.com/generated-images/a17fb1cf-ad47-403c-9754-ed7a59d6e7d8.png" }}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.serviceCard, { backgroundColor: colors.charging }]}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/request",
                    params: { type: "charging" },
                  })
                }
              >
                <View style={styles.serviceContent}>
                  <View style={styles.serviceIconContainer}>
                    <Zap color={colors.white} size={36} />
                  </View>
                  <Text style={[styles.serviceTitle, { color: colors.white }]}>{t.scheduledCharging}</Text>
                  <Text style={[styles.serviceDescription, { color: colors.white }]}>
                    {t.scheduledChargingDesc}
                  </Text>
                </View>
                <Image
                  source={{ uri: "https://r2-pub.rork.com/generated-images/a17fb1cf-ad47-403c-9754-ed7a59d6e7d8.png" }}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {pendingRequests.length > 0 && (
            <View style={styles.activeSection}>
              <View style={styles.activeSectionHeader}>
                <Navigation color={colors.primary} size={20} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.activeRequests}</Text>
              </View>
              <View style={[styles.activeCard, { borderColor: colors.primary }]}>
                <Text style={[styles.activeCount, { color: colors.primary }]}>{pendingRequests.length}</Text>
                <Text style={[styles.activeLabel, { color: colors.textSecondary }]}>
                  {pendingRequests.length === 1
                    ? t.requestPending
                    : t.requestsPending}
                </Text>
                <TouchableOpacity
                  style={[styles.viewButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/(tabs)/history")}
                >
                  <Text style={[styles.viewButtonText, { color: colors.white }]}>{t.viewAll}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}


          {!isAuthenticated && (
            <TouchableOpacity
              style={[styles.employeeLoginButton, { borderColor: colors.border }]}
              onPress={() => router.push("/login")}
            >
              <Text style={[styles.employeeLoginText, { color: colors.textSecondary }]}>Employee Login</Text>
            </TouchableOpacity>
          )}

          {isAuthenticated && user && (
            <View style={[styles.employeeInfoCard, { borderColor: colors.primary }]}>
              <Text style={[styles.employeeInfoTitle, { color: colors.textSecondary }]}>Logged in as:</Text>
              <Text style={[styles.employeeInfoName, { color: colors.text }]}>{user.fullName}</Text>
              <Text style={[styles.employeeInfoRole, { color: colors.primary }]}>{user.role.replace('_', ' ').toUpperCase()}</Text>
            </View>
          )}

          </ScrollView>
        </ImageBackground>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camoBackground: {
    flex: 1,
  },
  robotBackground: {
    flex: 1,
  },
  robotImage: {
    opacity: 0.15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  languageButtonsContainer: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 20,
    marginTop: 8,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  languageButtonActive: {
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  languageButtonTextActive: {
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  locationCard: {
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "rgba(220, 38, 38, 0.3)",
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  locationLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  locationLoadingText: {
    fontSize: 14,
  },
  locationErrorContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
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
  },
  locationErrorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  enableLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  enableLocationButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  retryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  locationInfo: {
    gap: 16,
  },
  addressInputContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  addressInput: {
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: "top",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  coordinatesBox: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  coordinatesTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  coordinateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  coordinateLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  coordinateValue: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  accuracyText: {
    fontSize: 12,
    marginTop: 4,
  },
  locationActions: {
    flexDirection: "row",
    gap: 12,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  useLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 2,
  },
  useLocationButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  servicesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 16,
  },
  serviceCards: {
    gap: 16,
  },
  serviceCard: {
    borderRadius: 16,
    padding: 24,
    minHeight: 140,
    borderWidth: 2,
    borderColor: "rgba(220, 38, 38, 0.3)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  serviceContent: {
    flex: 1,
  },
  mascotImage: {
    width: 100,
    height: 100,
    marginLeft: 8,
    opacity: 0.9,
  },
  serviceIconContainer: {
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 14,
    opacity: 0.9,
  },
  activeSection: {
    marginBottom: 20,
  },
  activeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  activeCard: {
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
  },
  activeCount: {
    fontSize: 48,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  activeLabel: {
    fontSize: 16,
    marginBottom: 16,
  },
  viewButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  queueCounter: {
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
  },
  queueCounterContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  queueBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  queueNumber: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  queueInfo: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  queueSubtitle: {
    fontSize: 14,
  },

  mascotSmallIcon: {
    width: 28,
    height: 28,
  },
  employeeLoginButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center" as const,
  },
  employeeLoginText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  employeeInfoCard: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center" as const,
  },
  employeeInfoTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  employeeInfoName: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  employeeInfoRole: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
});
