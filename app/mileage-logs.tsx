import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import colors from "@/constants/colors";
import { JobAcceptanceLog } from "@/constants/types";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Calendar,
  User,
  Truck,
  BatteryCharging,
  Clock,
  Route as RouteIcon,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

type SortOption = "date" | "distance" | "customer" | "status";
type FilterOption = "all" | "completed" | "scheduled" | "pending";

export default function MileageLogsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data, isLoading, error, refetch } = trpc.requests.getMileageLogs.useQuery({});

  const handleCopyCoordinates = async (lat: number, lon: number) => {
    const coordinates = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    await Clipboard.setStringAsync(coordinates);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Copied!", "GPS coordinates copied to clipboard");
  };

  const handleNavigate = async (lat: number, lon: number) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lon}`,
      android: `geo:${lat},${lon}?q=${lat},${lon}`,
      default: `https://maps.apple.com/?daddr=${lat},${lon}`,
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

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "ios":
        return "📱";
      case "android":
        return "🤖";
      case "web":
        return "🌐";
      default:
        return "💻";
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.background, colors.surface]} style={styles.gradient}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mileage Logs</Text>
            <View style={styles.backButton} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading mileage logs...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.background, colors.surface]} style={styles.gradient}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mileage Logs</Text>
            <View style={styles.backButton} />
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load mileage logs</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  let mileageLogs = data?.mileageLogs || [];

  if (filterBy !== "all") {
    mileageLogs = mileageLogs.filter((log) => log.status === filterBy);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    mileageLogs = mileageLogs.filter(
      (log) =>
        log.requestTitle.toLowerCase().includes(query) ||
        log.customerName.toLowerCase().includes(query)
    );
  }

  mileageLogs = [...mileageLogs].sort((a, b) => {
    const aLatestLog = a.acceptanceLogs[a.acceptanceLogs.length - 1];
    const bLatestLog = b.acceptanceLogs[b.acceptanceLogs.length - 1];

    switch (sortBy) {
      case "date":
        return (
          new Date(bLatestLog.acceptedAt).getTime() -
          new Date(aLatestLog.acceptedAt).getTime()
        );
      case "distance": {
        const aDistance = calculateHaversineDistance(
          a.requestLocation.latitude,
          a.requestLocation.longitude,
          aLatestLog.coordinates.latitude,
          aLatestLog.coordinates.longitude
        );
        const bDistance = calculateHaversineDistance(
          b.requestLocation.latitude,
          b.requestLocation.longitude,
          bLatestLog.coordinates.latitude,
          bLatestLog.coordinates.longitude
        );
        return bDistance - aDistance;
      }
      case "customer":
        return a.customerName.localeCompare(b.customerName);
      case "status":
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={styles.gradient}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mileage Logs</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => refetch()}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.total || 0}</Text>
            <Text style={styles.statLabel}>Total Logs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {(data?.mileageLogs || []).filter((log) => log.status === "completed").length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {(data?.mileageLogs || []).filter((log) => log.status === "pending" || log.status === "scheduled").length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer or title..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Filter:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {(["all", "completed", "scheduled", "pending"] as FilterOption[]).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.filterChip, filterBy === filter && styles.filterChipActive]}
                    onPress={() => setFilterBy(filter)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filterBy === filter && styles.filterChipTextActive,
                      ]}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sort:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {(["date", "distance", "customer", "status"] as SortOption[]).map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={[styles.filterChip, sortBy === sort && styles.filterChipActive]}
                    onPress={() => setSortBy(sort)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        sortBy === sort && styles.filterChipTextActive,
                      ]}
                    >
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              Showing {mileageLogs.length} of {data?.total || 0} logs
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        >
          {mileageLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <RouteIcon color={colors.textTertiary} size={64} />
              <Text style={styles.emptyTitle}>No Mileage Logs</Text>
              <Text style={styles.emptyMessage}>
                Mileage logs will appear here when jobs are accepted with GPS tracking
              </Text>
            </View>
          ) : (
            mileageLogs.map((log) => {
              const isExpanded = expandedLogId === log.requestId;
              const latestAcceptanceLog = log.acceptanceLogs[log.acceptanceLogs.length - 1];

              const distanceKm = calculateHaversineDistance(
                log.requestLocation.latitude,
                log.requestLocation.longitude,
                latestAcceptanceLog.coordinates.latitude,
                latestAcceptanceLog.coordinates.longitude
              );
              const distanceMiles = distanceKm * 0.621371;

              return (
                <TouchableOpacity
                  key={log.requestId}
                  style={styles.logCard}
                  onPress={() => setExpandedLogId(isExpanded ? null : log.requestId)}
                  activeOpacity={0.7}
                >
                  <View style={styles.logHeader}>
                    <View
                      style={[
                        styles.logIconContainer,
                        {
                          backgroundColor:
                            log.serviceType === "Roadside Assistance"
                              ? colors.roadside + "20"
                              : colors.charging + "20",
                        },
                      ]}
                    >
                      {log.serviceType === "Roadside Assistance" ? (
                        <Truck color={colors.roadside} size={20} />
                      ) : (
                        <BatteryCharging color={colors.charging} size={20} />
                      )}
                    </View>
                    <View style={styles.logHeaderText}>
                      <Text style={styles.logTitle} numberOfLines={1}>
                        {log.requestTitle}
                      </Text>
                      <Text style={styles.logSubtitle}>{log.customerName}</Text>
                    </View>
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>{distanceMiles.toFixed(1)} mi</Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.logDetails}>
                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Request Information</Text>
                        <View style={styles.detailRow}>
                          <User color={colors.textSecondary} size={16} />
                          <Text style={styles.detailLabel}>Customer:</Text>
                          <Text style={styles.detailValue}>{log.customerName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Calendar color={colors.textSecondary} size={16} />
                          <Text style={styles.detailLabel}>Created:</Text>
                          <Text style={styles.detailValue}>
                            {new Date(log.createdAt).toLocaleDateString()}{" "}
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Clock color={colors.textSecondary} size={16} />
                          <Text style={styles.detailLabel}>Status:</Text>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  log.status === "completed"
                                    ? colors.success + "20"
                                    : log.status === "canceled"
                                    ? colors.error + "20"
                                    : colors.warning + "20",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    log.status === "completed"
                                      ? colors.success
                                      : log.status === "canceled"
                                      ? colors.error
                                      : colors.warning,
                                },
                              ]}
                            >
                              {log.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Request Location</Text>
                        <View style={styles.coordinatesBox}>
                          <View style={styles.coordinatesRow}>
                            <MapPin color={colors.primary} size={16} />
                            <Text style={styles.coordinatesText}>
                              {log.requestLocation.latitude.toFixed(6)},{" "}
                              {log.requestLocation.longitude.toFixed(6)}
                            </Text>
                          </View>
                          {log.requestLocation.address && (
                            <Text style={styles.addressText}>{log.requestLocation.address}</Text>
                          )}
                          <View style={styles.locationActions}>
                            <TouchableOpacity
                              style={styles.locationButton}
                              onPress={() =>
                                handleCopyCoordinates(
                                  log.requestLocation.latitude,
                                  log.requestLocation.longitude
                                )
                              }
                            >
                              <Text style={styles.locationButtonText}>Copy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.locationButton, styles.navigateButton]}
                              onPress={() =>
                                handleNavigate(
                                  log.requestLocation.latitude,
                                  log.requestLocation.longitude
                                )
                              }
                            >
                              <Navigation color={colors.white} size={16} />
                              <Text style={styles.navigateButtonText}>Navigate</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>
                          Acceptance Logs ({log.acceptanceLogs.length})
                        </Text>
                        {log.acceptanceLogs.map((acceptanceLog: JobAcceptanceLog, index: number) => {
                          const distanceFromRequest = calculateHaversineDistance(
                            log.requestLocation.latitude,
                            log.requestLocation.longitude,
                            acceptanceLog.coordinates.latitude,
                            acceptanceLog.coordinates.longitude
                          );
                          const distanceFromRequestMiles = distanceFromRequest * 0.621371;

                          return (
                            <View key={acceptanceLog.id} style={styles.acceptanceLogCard}>
                              <View style={styles.acceptanceLogHeader}>
                                <Text style={styles.acceptanceLogNumber}>#{index + 1}</Text>
                                <Text style={styles.acceptanceLogPlatform}>
                                  {getPlatformIcon(acceptanceLog.platform)} {acceptanceLog.platform}
                                </Text>
                              </View>

                              {acceptanceLog.acceptedBy && (
                                <View style={styles.acceptedBySection}>
                                  <Text style={styles.acceptedByLabel}>Accepted by:</Text>
                                  <Text style={styles.acceptedByName}>
                                    {acceptanceLog.acceptedBy.name || "Unknown"}{" "}
                                    {acceptanceLog.acceptedBy.role &&
                                      `(${acceptanceLog.acceptedBy.role})`}
                                  </Text>
                                </View>
                              )}

                              <View style={styles.acceptanceDetailRow}>
                                <Clock color={colors.textSecondary} size={14} />
                                <Text style={styles.acceptanceDetailLabel}>Accepted at:</Text>
                                <Text style={styles.acceptanceDetailValue}>
                                  {new Date(acceptanceLog.acceptedAt).toLocaleString()}
                                </Text>
                              </View>

                              <View style={styles.coordinatesBox}>
                                <View style={styles.coordinatesRow}>
                                  <MapPin color={colors.success} size={14} />
                                  <Text style={styles.coordinatesTextSmall}>
                                    {acceptanceLog.coordinates.latitude.toFixed(6)},{" "}
                                    {acceptanceLog.coordinates.longitude.toFixed(6)}
                                  </Text>
                                </View>
                                {acceptanceLog.coordinates.accuracy && (
                                  <Text style={styles.accuracyText}>
                                    Accuracy: ±{acceptanceLog.coordinates.accuracy.toFixed(1)}m
                                  </Text>
                                )}
                                <View style={styles.locationActions}>
                                  <TouchableOpacity
                                    style={styles.locationButtonSmall}
                                    onPress={() =>
                                      handleCopyCoordinates(
                                        acceptanceLog.coordinates.latitude,
                                        acceptanceLog.coordinates.longitude
                                      )
                                    }
                                  >
                                    <Text style={styles.locationButtonTextSmall}>Copy</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.locationButtonSmall, styles.navigateButtonSmall]}
                                    onPress={() =>
                                      handleNavigate(
                                        acceptanceLog.coordinates.latitude,
                                        acceptanceLog.coordinates.longitude
                                      )
                                    }
                                  >
                                    <Navigation color={colors.white} size={12} />
                                    <Text style={styles.navigateButtonTextSmall}>Navigate</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>

                              <View style={styles.mileageBox}>
                                <RouteIcon color={colors.primary} size={16} />
                                <Text style={styles.mileageLabel}>Distance from request:</Text>
                                <Text style={styles.mileageValue}>
                                  {distanceFromRequestMiles.toFixed(2)} mi (
                                  {distanceFromRequest.toFixed(2)} km)
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 8,
    width: 80,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 16,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: "center" as const,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.white,
  },
  statsContainer: {
    flexDirection: "row" as const,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center" as const,
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
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center" as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  emptyState: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  logIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  logHeaderText: {
    flex: 1,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 4,
  },
  logSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  distanceBadge: {
    backgroundColor: colors.primary + "20",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  distanceText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  logDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 20,
  },
  detailSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.text,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  coordinatesBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  coordinatesRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  coordinatesText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  coordinatesTextSmall: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.text,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  addressText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 24,
  },
  locationActions: {
    flexDirection: "row" as const,
    gap: 8,
    marginTop: 8,
  },
  locationButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  locationButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  navigateButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    flexDirection: "row" as const,
    gap: 6,
    justifyContent: "center" as const,
  },
  navigateButtonText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.white,
  },
  locationButtonSmall: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  locationButtonTextSmall: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  navigateButtonSmall: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    flexDirection: "row" as const,
    gap: 4,
    justifyContent: "center" as const,
  },
  navigateButtonTextSmall: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.white,
  },
  acceptanceLogCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    gap: 12,
    marginBottom: 12,
  },
  acceptanceLogHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  acceptanceLogNumber: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  acceptanceLogPlatform: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  acceptedBySection: {
    backgroundColor: colors.primary + "10",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  acceptedByLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  acceptedByName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
  },
  acceptanceDetailRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  acceptanceDetailLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  acceptanceDetailValue: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  accuracyText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: "italic" as const,
    marginLeft: 24,
  },
  mileageBox: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.success + "10",
    padding: 12,
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.success + "30",
  },
  mileageLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    flex: 1,
  },
  mileageValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.success,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterRow: {
    gap: 12,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  resultsInfo: {
    paddingTop: 4,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic" as const,
  },
});
