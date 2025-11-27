# Multi-Tenant Deployment Guide

## Production Deployment Checklist

### 1. Database Setup

**Current State**: In-memory storage (Map)
**Production Requirement**: Persistent database

#### Recommended Options:

**Option A: PostgreSQL with Row-Level Security (Best for Scale)**
```sql
-- Create tenants table
CREATE TABLE tenants (
  id VARCHAR(255) PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  -- ... other fields
);

-- Create users table with tenant_id
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  username VARCHAR(255) NOT NULL,
  -- ... other fields
  CONSTRAINT unique_username_per_tenant UNIQUE (tenant_id, username)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to isolate tenant data
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::text);
```

**Option B: Separate Databases per Tenant**
- Create one database per tenant
- Use connection pooling with tenant-specific connections
- More isolated but harder to manage at scale

**Option C: Redis/KV Store (Upstash, Vercel KV)**
- Replace `backend/storage.ts` Map with Redis client
- Keeps the same API interface
- Good for quick deployment

### 2. Environment Variables

Create a `.env` file (never commit this):

```bash
# API Configuration
EXPO_PUBLIC_RORK_API_BASE_URL=https://api.yourdomain.com
NODE_ENV=production

# Database (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (if using Redis)
REDIS_URL=redis://default:password@redis.yourdomain.com:6379

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Service (for notifications)
SENDGRID_API_KEY=SG...
EMAIL_FROM=noreply@yourdomain.com

# JWT Secret (for better auth)
JWT_SECRET=your-super-secret-key-here

# App Configuration
APP_NAME=Your Business Name
APP_URL=https://yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com
```

### 3. Authentication Enhancement

For production, replace the simple password hashing with bcrypt:

```bash
bun add bcrypt
bun add -d @types/bcrypt
```

Update password hashing in `backend/trpc/routes/auth/login/route.ts`:
```typescript
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
```

### 4. Rate Limiting

Add rate limiting to prevent abuse:

```bash
bun add hono-rate-limiter
```

In `backend/hono.ts`:
```typescript
import { rateLimiter } from "hono-rate-limiter";

// Add before routes
app.use("*", rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later"
}));
```

### 5. CORS Configuration

Update CORS for production in `backend/hono.ts`:

```typescript
app.use("*", cors({
  origin: [
    "https://yourdomain.com",
    "https://app.yourdomain.com",
    "https://*.yourdomain.com", // for subdomain routing
  ],
  credentials: true,
}));
```

### 6. HTTPS/SSL

- **Required**: All production traffic must use HTTPS
- Use Let's Encrypt for free SSL certificates
- Configure your reverse proxy (nginx/Caddy) to handle SSL

Example Caddy configuration:
```
api.yourdomain.com {
  reverse_proxy localhost:8081
}

*.yourdomain.com {
  reverse_proxy localhost:3000
}
```

### 7. Monitoring & Logging

Add structured logging:

```bash
bun add pino pino-pretty
```

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

logger.info({ tenantId, userId }, 'User logged in');
```

### 8. Error Tracking

Integrate Sentry for error tracking:

```bash
bun add @sentry/node
```

### 9. Backup Strategy

**Daily Backups**:
- Database snapshots
- Configuration backups
- User data exports

**Backup Locations**:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage

### 10. Scaling Considerations

**Horizontal Scaling**:
- Deploy multiple instances behind a load balancer
- Use Redis for session storage (shared across instances)
- Ensure database supports concurrent connections

**Caching**:
- Cache tenant info (rarely changes)
- Cache user permissions
- Use Redis or in-memory cache with TTL

**CDN**:
- Serve static assets through CDN
- Use Cloudflare or AWS CloudFront

### 11. Subdomain Routing (Optional)

If you want tenant-based subdomains (tenant1.yourdomain.com):

1. **DNS Setup**: Add wildcard DNS record `*.yourdomain.com → your-server-ip`

2. **Update middleware** to extract subdomain:
```typescript
app.use("*", async (c, next) => {
  const hostname = c.req.header("host") || "";
  const subdomain = hostname.split(".")[0];
  
  // Fetch tenant by subdomain
  const tenants = await kv.getJSON<Tenant[]>("tenants") || [];
  const tenant = tenants.find(t => t.subdomain === subdomain);
  
  if (tenant) {
    c.set("tenantId", tenant.id);
  }
  
  await next();
});
```

3. **Auto-login tenant context**: Extract from URL and pre-fill login form

### 12. Payment Integration

Integrate Stripe for subscriptions:

```bash
bun add stripe
```

Create webhook handler in `backend/hono.ts`:
```typescript
app.post("/webhooks/stripe", async (c) => {
  const sig = c.req.header("stripe-signature");
  const event = stripe.webhooks.constructEvent(
    await c.req.text(),
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  switch (event.type) {
    case "customer.subscription.updated":
      // Update tenant subscription status
      break;
    case "invoice.payment_failed":
      // Suspend tenant
      break;
  }
  
  return c.json({ received: true });
});
```

### 13. Email Notifications

Set up transactional emails:

- Welcome email on registration
- Trial expiring warnings (7 days, 3 days, 1 day before)
- Payment successful/failed
- User invitations

Use SendGrid, AWS SES, or similar service.

### 14. Admin Dashboard

Create a super admin panel at `/admin` (super admin only):

Features:
- List all tenants
- View tenant details & usage
- Manage subscriptions
- Suspend/activate accounts
- View audit logs
- System health monitoring

### 15. Terms of Service & Privacy Policy

Add legal pages:
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy
- Add acceptance during registration

### 16. Testing Before Launch

1. **Load Testing**: Use tools like k6 or Apache JMeter
2. **Security Audit**: Run penetration tests
3. **Data Isolation Test**: Verify tenants cannot access each other's data
4. **Backup & Restore**: Test recovery procedures
5. **Failover Testing**: Ensure redundancy works

### 17. Launch Checklist

- [ ] Database migrated to production
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Monitoring & alerting configured
- [ ] Backups automated
- [ ] Domain configured
- [ ] DNS records set
- [ ] Payment gateway tested
- [ ] Email service configured
- [ ] Legal pages published
- [ ] Load tested
- [ ] Security reviewed

### 18. Post-Launch

- Monitor error rates
- Track performance metrics
- Collect user feedback
- Plan feature updates
- Regular security updates
- Monitor subscription metrics

## Cost Estimation (Monthly)

### Starter Scale (< 100 tenants):
- **Hosting**: $20-50 (DigitalOcean/Railway)
- **Database**: $15-30 (Managed PostgreSQL)
- **Email**: $10 (SendGrid)
- **Storage**: $5 (AWS S3)
- **Monitoring**: Free tier (Sentry, DataDog)
- **Total**: ~$50-100/month

### Growth Scale (100-1000 tenants):
- **Hosting**: $100-300 (Multiple instances)
- **Database**: $50-150 (Scaled PostgreSQL)
- **Email**: $30-80
- **Storage**: $20-50
- **Monitoring**: $30-100
- **CDN**: $20-50
- **Total**: ~$250-730/month

### Enterprise Scale (1000+ tenants):
- **Hosting**: $500-2000 (Kubernetes cluster)
- **Database**: $300-1000 (High-availability setup)
- **Email**: $200-500
- **Storage**: $100-300
- **Monitoring**: $200-500
- **CDN**: $100-300
- **Support team**: $5000+ (3-5 people)
- **Total**: ~$6400-9600/month (excluding team)

## Support & Maintenance

Budget for:
- Security patches
- Feature updates
- Bug fixes
- Customer support
- Infrastructure monitoring
- Performance optimization

Recommended: 20-30% of revenue for maintenance & support.
