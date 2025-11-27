# Multi-Tenancy API Reference

## Quick Start

### 1. Register a New Business (Tenant)

**Endpoint**: `tenant.register`  
**Type**: Mutation (Public)

```typescript
const result = await trpc.tenant.register.mutate({
  businessName: "Acme Roadside Services",
  contactName: "John Doe",
  contactEmail: "john@acme.com",
  contactPhone: "+1-555-0123",
  adminUsername: "johndoe",
  adminPassword: "SecurePass123!",
  plan: "professional" // or "starter", "enterprise"
});

// Response:
{
  success: true,
  tenant: {
    id: "tenant_1234567890_abc123",
    businessName: "Acme Roadside Services",
    subdomain: "acme-roadside-services",
    status: "trial",
    plan: "professional",
    trialEndsAt: "2024-02-15T00:00:00.000Z"
  },
  admin: {
    id: "user_1234567890_def456",
    username: "johndoe",
    email: "john@acme.com"
  }
}
```

### 2. Login with Tenant Context

**Endpoint**: `auth.login`  
**Type**: Mutation (Public)

```typescript
// For tenant users (require tenantId):
const result = await trpc.auth.login.mutate({
  username: "johndoe",
  password: "SecurePass123!",
  tenantId: "tenant_1234567890_abc123"
});

// For super admin (no tenantId):
const result = await trpc.auth.login.mutate({
  username: "Moms308",
  password: "Wowcows123!123!"
});

// Response:
{
  success: true,
  user: {
    id: "user_1234567890_def456",
    username: "johndoe",
    role: "admin",
    fullName: "John Doe",
    email: "john@acme.com",
    // ... other user fields
  },
  tenantId: "tenant_1234567890_abc123",
  tenant: {
    businessName: "Acme Roadside Services",
    logo: "https://..."
  }
}
```

**After successful login**, store the tenant context:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

await AsyncStorage.setItem("@current_user", JSON.stringify(result.user));
await AsyncStorage.setItem("@current_tenant_id", result.tenantId);
await AsyncStorage.setItem("@current_tenant_info", JSON.stringify(result.tenant));

// Or using the auth context:
const { setTenantContext } = useAuth();
await setTenantContext(result.tenantId, result.tenant);
```

### 3. Get Tenant Information

**Endpoint**: `tenant.getTenant`  
**Type**: Query (Public)

```typescript
// By tenant ID:
const result = await trpc.tenant.getTenant.query({
  tenantId: "tenant_1234567890_abc123"
});

// Or by subdomain:
const result = await trpc.tenant.getTenant.query({
  subdomain: "acme-roadside-services"
});

// Response:
{
  success: true,
  tenant: {
    id: "tenant_1234567890_abc123",
    businessName: "Acme Roadside Services",
    subdomain: "acme-roadside-services",
    status: "trial",
    plan: "professional",
    logo: "https://...",
    features: {
      maxUsers: 20,
      maxRequests: 500,
      customBranding: true,
      apiAccess: true,
      advancedReporting: false
    },
    settings: {
      timeZone: "America/Chicago",
      currency: "USD",
      language: "en"
    }
  }
}
```

### 4. List All Tenants (Super Admin Only)

**Endpoint**: `tenant.listTenants`  
**Type**: Query (Protected - Super Admin)

```typescript
const result = await trpc.tenant.listTenants.query();

// Response:
{
  success: true,
  tenants: [
    {
      id: "tenant_1234567890_abc123",
      businessName: "Acme Roadside Services",
      subdomain: "acme-roadside-services",
      status: "active",
      plan: "professional",
      // ... other tenant fields
      stats: {
        totalUsers: 5,
        activeUsers: 4,
        totalRequests: 123,
        pendingRequests: 3
      }
    },
    // ... more tenants
  ]
}
```

### 5. Update Tenant (Super Admin Only)

**Endpoint**: `tenant.updateTenant`  
**Type**: Mutation (Protected - Super Admin)

```typescript
const result = await trpc.tenant.updateTenant.mutate({
  tenantId: "tenant_1234567890_abc123",
  status: "active", // or "trial", "suspended", "canceled"
  plan: "enterprise",
  subscriptionEndsAt: "2025-01-15T00:00:00.000Z",
  logo: "https://...",
  settings: {
    timeZone: "America/New_York",
    currency: "USD",
    language: "en"
  }
});

// Response:
{
  success: true,
  tenant: {
    // updated tenant object
  }
}
```

### 6. Create Subscription (Super Admin Only)

**Endpoint**: `billing.createSubscription`  
**Type**: Mutation (Protected - Super Admin)

```typescript
const result = await trpc.billing.createSubscription.mutate({
  tenantId: "tenant_1234567890_abc123",
  plan: "professional",
  billingInterval: "yearly", // or "monthly"
  paymentMethodId: "pm_1234567890" // optional Stripe payment method ID
});

// Response:
{
  success: true,
  subscription: {
    tenantId: "tenant_1234567890_abc123",
    plan: "professional",
    status: "active",
    amount: 1490, // $1,490/year
    billingInterval: "yearly",
    subscriptionEndsAt: "2025-01-15T00:00:00.000Z"
  }
}
```

**Pricing**:
- Starter: $49/month or $490/year
- Professional: $149/month or $1,490/year  
- Enterprise: $499/month or $4,990/year

### 7. Cancel Subscription (Super Admin Only)

**Endpoint**: `billing.cancelSubscription`  
**Type**: Mutation (Protected - Super Admin)

```typescript
const result = await trpc.billing.cancelSubscription.mutate({
  tenantId: "tenant_1234567890_abc123",
  immediate: false // true = cancel now, false = at end of period
});

// Response:
{
  success: true,
  message: "Subscription will be canceled at the end of the billing period"
}
```

### 8. Get Usage Statistics

**Endpoint**: `billing.getUsage`  
**Type**: Query (Protected - Requires Tenant Context)

```typescript
// Automatically uses tenant from auth context (x-tenant-id header)
const result = await trpc.billing.getUsage.query();

// Response:
{
  success: true,
  usage: {
    tenantId: "tenant_1234567890_abc123",
    month: "2024-01",
    activeUsers: 4,
    totalRequests: 123,
    storageUsed: 0,
    apiCalls: 0
  },
  limits: {
    maxUsers: 20,
    maxRequests: 500,
    customBranding: true,
    apiAccess: true,
    advancedReporting: false
  },
  withinLimits: {
    users: true, // 4 of 20 used
    requests: true // 123 of 500 used
  },
  tenant: {
    plan: "professional",
    status: "active",
    subscriptionEndsAt: "2025-01-15T00:00:00.000Z"
  }
}
```

## Authentication Flow

### For New Businesses:

1. User visits `/tenant-registration`
2. Fills out registration form
3. System creates:
   - Tenant record
   - Admin user account
   - Isolated data storage
4. User receives tenant ID and subdomain
5. User can now log in

### For Existing Users:

1. User goes to `/login`
2. Enters username, password, and tenant ID
3. System validates credentials
4. Sets tenant context in AsyncStorage
5. All subsequent API calls include tenant ID in headers

### For Super Admin:

1. Super admin logs in without tenant ID
2. Can access all tenants
3. Can switch between tenants using tenant switcher
4. Can manage subscriptions and settings

## Data Isolation

All tenant-scoped data is stored with prefixed keys:

```
tenant:{tenantId}:users          # User accounts
tenant:{tenantId}:requests       # Service requests
tenant:{tenantId}:archived_requests
tenant:{tenantId}:messages       # Messages
tenant:{tenantId}:settings       # Custom settings
```

The storage helper automatically handles this:

```typescript
// Instead of:
await kv.getJSON(`tenant:${tenantId}:users`);

// Use:
await kv.tenant(tenantId).getJSON("users");
```

## Headers Required

All tenant-scoped API calls must include:

```typescript
headers: {
  "authorization": "Bearer {userId}",
  "x-tenant-id": "{tenantId}"
}
```

The tRPC client automatically includes these from AsyncStorage.

## Error Codes

- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: User doesn't have permission / tenant is suspended
- `BAD_REQUEST`: Missing required fields (like tenant ID)
- `NOT_FOUND`: Tenant or resource not found
- `CONFLICT`: Duplicate tenant (email already exists)

## Plan Features Comparison

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Max Users | 5 | 20 | 100 |
| Max Requests/Month | 100 | 500 | Unlimited |
| Custom Branding | ❌ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ |
| Advanced Reporting | ❌ | ❌ | ✅ |
| Price (Monthly) | $49 | $149 | $499 |
| Price (Yearly) | $490 | $1,490 | $4,990 |

## Trial Period

- Duration: 14 days
- Full access to selected plan features
- No credit card required
- Can upgrade/downgrade during trial
- Account suspended after trial unless subscription created

## Best Practices

1. **Always check tenant context**: Ensure tenant ID is set before making tenant-scoped calls
2. **Handle suspended accounts**: Display friendly message if tenant is suspended/canceled
3. **Cache tenant info**: Tenant data rarely changes, cache it locally
4. **Monitor usage**: Show users their current usage vs limits
5. **Trial warnings**: Notify users 7, 3, and 1 days before trial expires
6. **Graceful degradation**: Handle cases where tenant doesn't exist or is inactive

## Example: Complete Registration → Login Flow

```typescript
// 1. Register new tenant
const registration = await trpc.tenant.register.mutate({
  businessName: "My Business",
  contactName: "Jane Smith",
  contactEmail: "jane@mybusiness.com",
  adminUsername: "janesmith",
  adminPassword: "SecurePass123!",
  plan: "starter"
});

console.log("Registered:", registration.tenant.subdomain);
console.log("Tenant ID:", registration.tenant.id);

// 2. Login with credentials
const login = await trpc.auth.login.mutate({
  username: "janesmith",
  password: "SecurePass123!",
  tenantId: registration.tenant.id
});

// 3. Store session
await AsyncStorage.setItem("@current_user", JSON.stringify(login.user));
await AsyncStorage.setItem("@current_tenant_id", login.tenantId);
await AsyncStorage.setItem("@current_tenant_info", JSON.stringify(login.tenant));

// 4. Now all API calls will include tenant context automatically
const usage = await trpc.billing.getUsage.query();
console.log("Current usage:", usage.usage);

// 5. Logout
await AsyncStorage.removeItem("@current_user");
await AsyncStorage.removeItem("@current_tenant_id");
await AsyncStorage.removeItem("@current_tenant_info");
```

## Support

For issues or questions:
- Check `MULTI_TENANCY.md` for architecture details
- Check `DEPLOYMENT_GUIDE.md` for production setup
- Review audit logs for authentication issues
- Verify tenant status is active/trial
