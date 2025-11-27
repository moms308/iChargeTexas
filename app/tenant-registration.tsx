import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Building2, Mail, User, Lock, Phone } from "lucide-react-native";

export default function TenantRegistration() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "professional" | "enterprise">("starter");

  const registerMutation = trpc.tenant.register.useMutation({
    onSuccess: (data) => {
      Alert.alert(
        "Registration Successful!",
        `Your account has been created.\n\nBusiness: ${data.tenant.businessName}\nSubdomain: ${data.tenant.subdomain}\n\nYou can now log in with your credentials.`,
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/login"),
          },
        ]
      );
    },
    onError: (error) => {
      Alert.alert("Registration Failed", error.message);
    },
  });

  const handleRegister = () => {
    if (!businessName.trim()) {
      Alert.alert("Error", "Please enter your business name");
      return;
    }

    if (!contactName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (!adminUsername.trim() || adminUsername.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }

    if (!adminPassword || adminPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    if (adminPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    registerMutation.mutate({
      businessName,
      contactName,
      contactEmail,
      contactPhone,
      adminUsername,
      adminPassword,
      plan: selectedPlan,
    });
  };

  const plans = [
    {
      id: "starter" as const,
      name: "Starter",
      price: "$49/mo",
      features: ["5 users", "100 requests/month", "Email support"],
    },
    {
      id: "professional" as const,
      name: "Professional",
      price: "$149/mo",
      features: ["20 users", "500 requests/month", "Priority support", "Custom branding"],
    },
    {
      id: "enterprise" as const,
      name: "Enterprise",
      price: "$499/mo",
      features: ["100 users", "Unlimited requests", "24/7 support", "Advanced reporting"],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ title: "Create Your Account", headerShown: true }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Start Your Free Trial</Text>
          <Text style={styles.subtitle}>14 days free, no credit card required</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <View style={styles.inputContainer}>
            <Building2 size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Business Name"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <User size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your Full Name"
              value={contactName}
              onChangeText={setContactName}
              autoCapitalize="words"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Mail size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Phone size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Account</Text>

          <View style={styles.inputContainer}>
            <User size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Admin Username"
              value={adminUsername}
              onChangeText={setAdminUsername}
              autoCapitalize="none"
              autoComplete="username"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password (min. 8 characters)"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Your Plan</Text>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, selectedPlan === plan.id && styles.planCardSelected]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planHeader}>
                <View>
                  <Text style={[styles.planName, selectedPlan === plan.id && styles.planNameSelected]}>
                    {plan.name}
                  </Text>
                  <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceSelected]}>
                    {plan.price}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    selectedPlan === plan.id && styles.radioOuterSelected,
                  ]}
                >
                  {selectedPlan === plan.id && <View style={styles.radioInner} />}
                </View>
              </View>
              {plan.features.map((feature, index) => (
                <Text key={index} style={styles.planFeature}>
                  • {feature}
                </Text>
              ))}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.registerButton, registerMutation.isPending && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Start Free Trial</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
          <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1a1a1a",
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#1a1a1a",
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  planCardSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1a1a1a",
  },
  planNameSelected: {
    color: "#007AFF",
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#333",
    marginTop: 4,
  },
  planPriceSelected: {
    color: "#007AFF",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#007AFF",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
  planFeature: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  registerButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600" as const,
  },
  loginLink: {
    alignItems: "center",
    marginTop: 20,
  },
  loginLinkText: {
    color: "#007AFF",
    fontSize: 16,
  },
});
