import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { LogIn, Shield, Eye, EyeOff, Users, FileText, LogOut } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import colors from "@/constants/colors";
import { useAuth } from "@/constants/authContext";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, logout, isAuthenticated, currentUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Required Fields", "Please enter both username and password");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("[Login] Attempting login for:", username);
      const result = await login(username.trim(), password.trim());

      if (result.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        console.log("[Login] Login successful");
        
        Alert.alert(
          "Welcome!",
          `Logged in successfully as ${result.user?.role || 'admin'}`
        );
      } else {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert("Login Failed", result.message);
      }
    } catch (error) {
      console.error("[Login] Error during login:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  if (isAuthenticated && currentUser) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[colors.background, colors.surface]}
          style={styles.gradient}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Shield color={colors.primary} size={48} />
              </View>
              <Text style={styles.title}>Admin Dashboard</Text>
              <Text style={styles.subtitle}>
                Welcome back, {currentUser.role}
              </Text>
            </View>

            <View style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <Text style={styles.adminCardTitle}>Staff Functions</Text>
              </View>
              
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => router.push("/(tabs)/admin")}
              >
                <View style={styles.adminButtonContent}>
                  <View style={styles.adminButtonIconContainer}>
                    <FileText color={colors.primary} size={24} />
                  </View>
                  <View style={styles.adminButtonText}>
                    <Text style={styles.adminButtonTitle}>Admin Log</Text>
                    <Text style={styles.adminButtonDesc}>View and manage service requests</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => router.push("/(tabs)/users")}
              >
                <View style={styles.adminButtonContent}>
                  <View style={styles.adminButtonIconContainer}>
                    <Users color={colors.primary} size={24} />
                  </View>
                  <View style={styles.adminButtonText}>
                    <Text style={styles.adminButtonTitle}>User Management</Text>
                    <Text style={styles.adminButtonDesc}>Manage users and permissions</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <LogOut color={colors.error} size={20} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Shield color={colors.primary} size={48} />
            </View>
            <Text style={styles.title}>Business Login</Text>
            <Text style={styles.subtitle}>
              Sign in to access admin features and manage service requests
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff color={colors.textSecondary} size={20} />
                  ) : (
                    <Eye color={colors.textSecondary} size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <LogIn color={colors.white} size={20} />
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By logging in, you acknowledge that you are a business user with authorized access to manage service requests.
            </Text>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  form: {
    gap: 20,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    padding: 16,
  },
  loginButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 12,
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  adminCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 16,
  },
  adminCardHeader: {
    marginBottom: 8,
  },
  adminCardTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  adminButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary + "30",
  },
  adminButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  adminButtonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  adminButtonText: {
    flex: 1,
  },
  adminButtonTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
  },
  adminButtonDesc: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: colors.error + "10",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.error,
  },
});
