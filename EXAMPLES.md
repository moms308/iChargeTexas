# Quick Start Example

This is a complete example showing how to use the multi-tenancy system.

## Example 1: Register a New Business

```typescript
import { trpc } from "@/lib/trpc";

// Register new tenant
const registerBusiness = async () => {
  try {
    const result = await trpc.tenant.register.mutate({
      businessName: "Texas EV Services",
      contactName: "Sarah Johnson",
      contactEmail: "sarah@texasev.com",
      contactPhone: "+1-512-555-0199",
      adminUsername: "sarahj",
      adminPassword: "MySecurePass2024!",
      plan: "professional"
    });

    console.log("✅ Registration successful!");
    console.log("Tenant ID:", result.tenant.id);
    console.log("Subdomain:", result.tenant.subdomain); // "texas-ev-services"
    console.log("Trial ends:", result.tenant.trialEndsAt);
    
    return result;
  } catch (error) {
    console.error("❌ Registration failed:", error.message);
  }
};
```

## Example 2: Login and Use the App

```typescript
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Login with tenant credentials
const loginUser = async (username: string, password: string, tenantId: string) => {
  try {
    const result = await trpc.auth.login.mutate({
      username,
      password,
      tenantId
    });

    // Store session
    await AsyncStorage.setItem("@current_user", JSON.stringify(result.user));
    await AsyncStorage.setItem("@current_tenant_id", result.tenantId);
    await AsyncStorage.setItem("@current_tenant_info", JSON.stringify(result.tenant));

    console.log("✅ Login successful!");
    console.log("User:", result.user.fullName);
    console.log("Business:", result.tenant.businessName);
    
    return result;
  } catch (error) {
    console.error("❌ Login failed:", error.message);
  }
};

// Example usage
const tenantId = "tenant_1234567890_abc123";
await loginUser("sarahj", "MySecurePass2024!", tenantId);
```

## Example 3: Check Usage and Limits

```typescript
import { trpc } from "@/lib/trpc";

// Get current usage (automatically uses tenant from context)
const checkUsage = async () => {
  try {
    const result = await trpc.billing.getUsage.query();

    console.log("📊 Usage Statistics");
    console.log("Plan:", result.tenant.plan);
    console.log("Status:", result.tenant.status);
    console.log("");
    console.log("Users:", result.usage.activeUsers, "/", result.limits.maxUsers);
    console.log("Requests:", result.usage.totalRequests, "/", result.limits.maxRequests);
    console.log("");
    console.log("Within limits?", result.withinLimits.users && result.withinLimits.requests ? "✅ Yes" : "⚠️ No");
    
    if (result.tenant.subscriptionEndsAt) {
      console.log("Subscription ends:", new Date(result.tenant.subscriptionEndsAt).toLocaleDateString());
    }
    
    return result;
  } catch (error) {
    console.error("❌ Failed to get usage:", error.message);
  }
};

await checkUsage();
```

## Example 4: Super Admin - Manage Tenants

```typescript
import { trpc } from "@/lib/trpc";

// Login as super admin first
await trpc.auth.login.mutate({
  username: "Moms308",
  password: "Wowcows123!123!"
  // No tenantId for super admin
});

// List all tenants
const listAllTenants = async () => {
  const result = await trpc.tenant.listTenants.query();
  
  console.log(`📋 Total Tenants: ${result.tenants.length}\n`);
  
  result.tenants.forEach(tenant => {
    console.log(`• ${tenant.businessName}`);
    console.log(`  ID: ${tenant.id}`);
    console.log(`  Plan: ${tenant.plan} (${tenant.status})`);
    console.log(`  Users: ${tenant.stats.activeUsers}/${tenant.features.maxUsers}`);
    console.log(`  Requests: ${tenant.stats.totalRequests}`);
    console.log("");
  });
  
  return result;
};

await listAllTenants();
```

## Example 5: Super Admin - Create Subscription

```typescript
import { trpc } from "@/lib/trpc";

// Convert trial to paid subscription
const createSubscription = async (tenantId: string) => {
  try {
    const result = await trpc.billing.createSubscription.mutate({
      tenantId,
      plan: "professional",
      billingInterval: "yearly" // yearly = 10 months free
    });

    console.log("✅ Subscription created!");
    console.log("Plan:", result.subscription.plan);
    console.log("Amount:", `$${result.subscription.amount}`);
    console.log("Billing:", result.subscription.billingInterval);
    console.log("Next payment:", result.subscription.subscriptionEndsAt);
    
    return result;
  } catch (error) {
    console.error("❌ Failed to create subscription:", error.message);
  }
};

await createSubscription("tenant_1234567890_abc123");
```

## Example 6: Super Admin - Update Tenant

```typescript
import { trpc } from "@/lib/trpc";

// Upgrade tenant plan
const upgradeTenant = async (tenantId: string) => {
  try {
    const result = await trpc.tenant.updateTenant.mutate({
      tenantId,
      plan: "enterprise",
      status: "active",
      subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      settings: {
        timeZone: "America/New_York",
        currency: "USD",
        language: "en"
      }
    });

    console.log("✅ Tenant upgraded!");
    console.log("New plan:", result.tenant.plan);
    console.log("Max users:", result.tenant.features.maxUsers);
    console.log("Max requests:", result.tenant.features.maxRequests);
    console.log("Custom branding:", result.tenant.features.customBranding ? "✅" : "❌");
    console.log("API access:", result.tenant.features.apiAccess ? "✅" : "❌");
    
    return result;
  } catch (error) {
    console.error("❌ Failed to update tenant:", error.message);
  }
};

await upgradeTenant("tenant_1234567890_abc123");
```

## Example 7: Using in React Component

```typescript
import React, { useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/constants/authContext";

export default function TenantDashboard() {
  const { tenantId, tenantInfo } = useAuth();
  
  const usageQuery = trpc.billing.getUsage.useQuery();
  
  const upgradeMutation = trpc.billing.createSubscription.useMutation({
    onSuccess: () => {
      Alert.alert("Success", "Subscription created!");
      usageQuery.refetch();
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    }
  });

  if (usageQuery.isLoading) {
    return <Text>Loading...</Text>;
  }

  const { usage, limits, withinLimits, tenant } = usageQuery.data!;

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>
        {tenantInfo?.businessName}
      </Text>
      
      <Text style={{ fontSize: 18, marginTop: 20 }}>Current Plan: {tenant.plan}</Text>
      <Text>Status: {tenant.status}</Text>
      
      <View style={{ marginTop: 20 }}>
        <Text>Users: {usage.activeUsers} / {limits.maxUsers}</Text>
        <Text>Requests: {usage.totalRequests} / {limits.maxRequests}</Text>
        
        {!withinLimits.users && (
          <Text style={{ color: "red" }}>⚠️ User limit exceeded!</Text>
        )}
        
        {!withinLimits.requests && (
          <Text style={{ color: "red" }}>⚠️ Request limit exceeded!</Text>
        )}
      </View>
      
      {tenant.status === "trial" && (
        <View style={{ marginTop: 30 }}>
          <Text>Trial ends: {new Date(tenant.subscriptionEndsAt!).toLocaleDateString()}</Text>
          <Button
            title="Upgrade to Paid Plan"
            onPress={() => upgradeMutation.mutate({
              tenantId: tenantId!,
              plan: tenant.plan,
              billingInterval: "monthly"
            })}
          />
        </View>
      )}
    </View>
  );
}
```

## Example 8: Tenant Registration Screen

```typescript
import React from "react";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function RegisterScreen() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const registerMutation = trpc.tenant.register.useMutation({
    onSuccess: async (data) => {
      Alert.alert(
        "Success!",
        `Account created for ${data.tenant.businessName}`,
        [
          {
            text: "Login",
            onPress: () => router.replace({
              pathname: "/login",
              params: { tenantId: data.tenant.id }
            })
          }
        ]
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message);
    }
  });

  const handleRegister = () => {
    registerMutation.mutate({
      businessName,
      contactName,
      contactEmail,
      adminUsername: username,
      adminPassword: password,
      plan: "starter"
    });
  };

  return (
    // Your form UI here
    <View>
      {/* Inputs for businessName, contactName, etc. */}
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}
```

## Testing Checklist

Use these examples to test your multi-tenancy setup:

- [ ] Register a new tenant
- [ ] Login with tenant credentials
- [ ] Check usage statistics
- [ ] Login as super admin
- [ ] List all tenants
- [ ] Update a tenant's plan
- [ ] Create a subscription
- [ ] Cancel a subscription
- [ ] Verify data isolation (Tenant A can't see Tenant B's data)
- [ ] Test trial expiration
- [ ] Test exceeding limits

## Common Errors and Solutions

### Error: "Tenant ID is required"
**Solution**: Make sure you're passing `tenantId` in login for non-super-admin users.

### Error: "You do not have access to this tenant"
**Solution**: The user's `tenantId` doesn't match the request. Check AsyncStorage has correct tenant ID.

### Error: "This account is suspended"
**Solution**: Tenant status is not "active" or "trial". Super admin needs to activate it.

### Error: "Tenant not found"
**Solution**: Invalid tenant ID. Check the ID exists in storage.

## Tips

1. **Always store tenant ID after login**
2. **Check tenant status before allowing operations**
3. **Display usage stats to encourage upgrades**
4. **Send trial expiration reminders**
5. **Show clear upgrade paths**
6. **Handle suspended accounts gracefully**

For more details, see:
- `API_REFERENCE.md` - Complete API documentation
- `MULTI_TENANCY.md` - Architecture overview
- `DEPLOYMENT_GUIDE.md` - Production setup
