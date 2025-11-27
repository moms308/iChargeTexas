# Multi-Tenancy Implementation Guide

## Overview

This application has been enhanced with full multi-tenancy support, allowing multiple businesses to use the same platform with complete data isolation. Each tenant (business) has their own isolated data, users, and billing.

## Architecture

### Data Isolation

All tenant data is stored with tenant-scoped keys in the format:
```
tenant:{tenantId}:users
tenant:{tenantId}:requests
tenant:{tenantId}:archived_requests
```

The storage layer includes a helper method `kv.tenant(tenantId)` that automatically scopes all operations to a specific tenant.

### Authentication Flow

1. **Super Admin**: Can log in without a tenant ID and has access to all tenants
2. **Tenant Users**: Must provide a tenant ID during login and can only access their tenant's data

### Tenant Context

All tRPC requests include the tenant ID via the `x-tenant-id` header. The tRPC middleware (`isTenantScoped`) validates:
- User is authenticated
- Tenant ID is provided
- User belongs to the specified tenant (or is a super admin)

## API Endpoints

### Tenant Management

#### Register New Tenant
```typescript
trpc.tenant.register.mutate({
  businessName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  adminUsername: string;
  adminPassword: string;
  plan: "starter" | "professional" | "enterprise";
})
```

Creates a new tenant with:
- Unique subdomain (auto-generated from business name)
- 14-day free trial
- Admin user account
- Default settings

#### Get Tenant Info
```typescript
trpc.tenant.getTenant.query({
  subdomain?: string;
  tenantId?: string;
})
```

#### List All Tenants (Super Admin Only)
```typescript
trpc.tenant.listTenants.query()
```

Returns all tenants with statistics (users, requests, etc.)

#### Update Tenant (Super Admin Only)
```typescript
trpc.tenant.updateTenant.mutate({
  tenantId: string;
  status?: "trial" | "active" | "suspended" | "canceled";
  plan?: "starter" | "professional" | "enterprise";
  subscriptionEndsAt?: string;
  logo?: string;
  settings?: {
    timeZone?: string;
    currency?: string;
    language?: string;
  };
})
```

### Billing

#### Create Subscription (Super Admin Only)
```typescript
trpc.billing.createSubscription.mutate({
  tenantId: string;
  plan: "starter" | "professional" | "enterprise";
  billingInterval: "monthly" | "yearly";
  paymentMethodId?: string;
})
```

Pricing:
- **Starter**: $49/month or $490/year
- **Professional**: $149/month or $1,490/year
- **Enterprise**: $499/month or $4,990/year

#### Cancel Subscription (Super Admin Only)
```typescript
trpc.billing.cancelSubscription.mutate({
  tenantId: string;
  immediate: boolean;
})
```

#### Get Usage
```typescript
trpc.billing.getUsage.query()
```

Returns current usage vs limits for the authenticated tenant.

### Authentication

#### Login (Tenant-Aware)
```typescript
trpc.auth.login.mutate({
  username: string;
  password: string;
  tenantId?: string; // Required for non-super-admin users
})
```

Response includes:
```typescript
{
  success: boolean;
  user: SystemUser;
  tenantId: string | null;
  tenant?: {
    businessName: string;
    logo?: string;
  };
}
```

## Plan Features

### Starter ($49/mo)
- 5 users
- 100 requests/month
- Basic features

### Professional ($149/mo)
- 20 users
- 500 requests/month
- Custom branding
- API access

### Enterprise ($499/mo)
- 100 users
- Unlimited requests
- Custom branding
- API access
- Advanced reporting

## Frontend Implementation

### Storing Tenant Context

When a user logs in, store the tenant ID:
```typescript
await AsyncStorage.setItem("@current_tenant_id", tenantId);
```

The tRPC client automatically includes this in all requests via the `x-tenant-id` header.

### Tenant Selector for Super Admin

Super admins should have a UI to:
1. List all tenants
2. Switch between tenants
3. View tenant details and usage
4. Manage subscriptions

### Onboarding Flow

1. User visits registration page
2. Fills out tenant registration form
3. Backend creates tenant + admin user
4. User receives confirmation with subdomain
5. User can log in using their credentials + tenant ID

## Data Migration

To migrate existing data to the new multi-tenant structure:

1. Create a "default" tenant for existing data:
```typescript
const defaultTenant = {
  id: "tenant_default",
  businessName: "iCharge Texas",
  subdomain: "default",
  status: "active",
  // ... other fields
};
```

2. Move existing users to tenant-scoped storage:
```typescript
// Old: kv.getJSON("employees")
// New: kv.getJSON("tenant:tenant_default:users")
```

3. Move existing requests:
```typescript
// Old: Service context state
// New: kv.getJSON("tenant:tenant_default:requests")
```

## Security Considerations

1. **Data Isolation**: All tenant data is strictly isolated by tenant ID
2. **Access Control**: Users can only access their tenant's data (except super admins)
3. **Audit Logging**: All authentication attempts are logged
4. **Tenant Validation**: Suspended/canceled tenants cannot log in
5. **API Security**: All API endpoints validate tenant access

## Deployment

### Environment Variables

Set these environment variables for production:
```
EXPO_PUBLIC_RORK_API_BASE_URL=https://your-api-domain.com
```

### Subdomain Routing (Optional)

For subdomain-based routing (tenant1.yourdomain.com):
1. Configure DNS wildcard: *.yourdomain.com → your server
2. Extract subdomain from request hostname
3. Look up tenant by subdomain
4. Include tenant ID in all requests

### Database Considerations

For production at scale, migrate from in-memory storage to:
- PostgreSQL with tenant_id column on all tables
- Row Level Security (RLS) policies for automatic tenant isolation
- Or use a multi-database approach (one database per tenant)

## Testing Multi-Tenancy

1. Register multiple test tenants
2. Create users in each tenant
3. Verify data isolation (Tenant A cannot see Tenant B's data)
4. Test super admin access to all tenants
5. Test subscription lifecycle (trial → active → canceled)

## Next Steps

1. **Frontend UI**: Build tenant registration and management screens
2. **Payment Integration**: Connect Stripe for real billing
3. **Usage Tracking**: Implement request/storage counting
4. **Webhooks**: Handle subscription events (payment failed, etc.)
5. **Tenant Dashboard**: Build admin dashboard showing usage, billing, users
6. **Email Notifications**: Welcome emails, trial expiring, payment failed, etc.

## Support

For questions or issues with multi-tenancy:
1. Check the audit logs for authentication issues
2. Verify tenant status is "active" or "trial"
3. Ensure tenant ID is being sent in requests
4. Check that users exist in the correct tenant scope
