# S6 Catalyst Migration Dashboard - Future Enhancements

**Version:** 1.0.0
**Last Updated:** 2026-02-04

## Table of Contents

1. [Overview](#overview)
2. [Phase 2: Policy-Level Operations](#phase-2-policy-level-operations)
3. [Phase 3: Per-Policy State Tracking](#phase-3-per-policy-state-tracking)
4. [Phase 4: Authentication & Authorization](#phase-4-authentication--authorization)
5. [Phase 5: Advanced Queries & Filtering](#phase-5-advanced-queries--filtering)
6. [Phase 6: Multi-Environment Support](#phase-6-multi-environment-support)
7. [Phase 7: Reporting & Analytics](#phase-7-reporting--analytics)
8. [Timeline & Priorities](#timeline--priorities)

---

## Overview

This document outlines the roadmap for future enhancements to the S6 Catalyst Migration Dashboard API. The current MVP (v1.0.0) provides:

**Current MVP Features (v1.0.0):**
- ✅ Real-time migration monitoring via SSE (status, logs, stats)
- ✅ Migration control commands (pause, resume, stop, restart)
- ✅ Query endpoints for current state
- ✅ Health and version endpoints
- ✅ No authentication (internal tool, single machine)

**Future Enhancement Goals:**
- Policy-level operations (validate, migrate, verify individual policies)
- Per-policy state tracking (ALREADY EXISTS - see Phase 3!)
- Authentication and authorization
- Advanced filtering and querying
- Multi-environment support
- Comprehensive reporting and analytics

---

## Phase 2: Policy-Level Operations

**Priority:** HIGH
**Estimated Timeline:** Q2 2026 (2-3 months)
**Status:** Planned

### Overview

Extend the API to support operations on individual policies, enabling the dashboard to:
- Validate a specific policy before migration
- Migrate a single policy (retry failed migrations)
- Verify a migrated policy
- View detailed policy information

### New Endpoints

#### 2.1 Validate Policy

**Endpoint:** `POST /api/migration/policies/{policyId}/validate`

**Purpose:** Validate a policy without migrating it.

**Request:**
```http
POST /api/migration/policies/ABC-123456/validate
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "policyId": "ABC-123456",
  "valid": true,
  "validationResults": [
    {
      "check": "DataIntegrity",
      "status": "passed",
      "message": "All required fields present"
    },
    {
      "check": "ReferenceData",
      "status": "passed",
      "message": "All reference codes valid"
    }
  ],
  "timestamp": "2026-02-04T15:00:00Z"
}
```

**Response (200 OK - Validation Failed):**
```json
{
  "policyId": "DEF-789012",
  "valid": false,
  "validationResults": [
    {
      "check": "DataIntegrity",
      "status": "passed",
      "message": "All required fields present"
    },
    {
      "check": "ReferenceData",
      "status": "failed",
      "message": "Coverage code XYZ not found in reference data",
      "details": "Coverage code 'XYZ' referenced in policy does not exist in Catalyst reference data"
    }
  ],
  "timestamp": "2026-02-04T15:00:00Z"
}
```

**Schema:**
```json
{
  "type": "object",
  "required": ["policyId", "valid", "validationResults", "timestamp"],
  "properties": {
    "policyId": {
      "type": "string",
      "description": "Policy identifier"
    },
    "valid": {
      "type": "boolean",
      "description": "Whether policy passed all validations"
    },
    "validationResults": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["check", "status", "message"],
        "properties": {
          "check": {
            "type": "string",
            "description": "Validation check name"
          },
          "status": {
            "type": "string",
            "enum": ["passed", "failed", "warning"],
            "description": "Check result status"
          },
          "message": {
            "type": "string",
            "description": "Check result message"
          },
          "details": {
            "type": "string",
            "description": "Additional details (optional)"
          }
        }
      }
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

---

#### 2.2 Migrate Single Policy

**Endpoint:** `POST /api/migration/policies/{policyId}/migrate`

**Purpose:** Migrate a specific policy (useful for retrying failed migrations).

**Request:**
```http
POST /api/migration/policies/ABC-123456/migrate
Content-Type: application/json

{
  "force": false,
  "skipValidation": false
}
```

**Request Body Schema:**
```json
{
  "type": "object",
  "properties": {
    "force": {
      "type": "boolean",
      "default": false,
      "description": "Force migration even if policy was already migrated"
    },
    "skipValidation": {
      "type": "boolean",
      "default": false,
      "description": "Skip validation step (use with caution)"
    }
  }
}
```

**Response (200 OK - Success):**
```json
{
  "policyId": "ABC-123456",
  "status": "success",
  "message": "Policy migrated successfully",
  "duration": "00:00:02.345",
  "catalystPolicyId": "CAT-987654",
  "timestamp": "2026-02-04T15:05:00Z"
}
```

**Response (200 OK - Failed):**
```json
{
  "policyId": "DEF-789012",
  "status": "failed",
  "message": "Migration failed: Database connection timeout",
  "duration": "00:00:05.678",
  "error": {
    "code": "DB_TIMEOUT",
    "message": "Database connection timeout after 30 seconds",
    "details": "Check network connectivity and database server status"
  },
  "timestamp": "2026-02-04T15:05:00Z"
}
```

**SSE Event Broadcast:**

When a single-policy migration completes, broadcast a special log entry:

```
event: log-entry
data: {"id":"log-manual-001","timestamp":"2026-02-04T15:05:00Z","level":"success","message":"Manual migration: Policy ABC-123456 migrated successfully","details":"Triggered by dashboard user","duration":"00:00:02.345","action":"view","actionLabel":"View Policy"}
```

---

#### 2.3 Verify Migrated Policy

**Endpoint:** `POST /api/migration/policies/{policyId}/verify`

**Purpose:** Verify a migrated policy's data integrity in Catalyst.

**Request:**
```http
POST /api/migration/policies/ABC-123456/verify
```

**Response (200 OK - Verified):**
```json
{
  "policyId": "ABC-123456",
  "catalystPolicyId": "CAT-987654",
  "verified": true,
  "verificationResults": [
    {
      "check": "PolicyExists",
      "status": "passed",
      "message": "Policy found in Catalyst database"
    },
    {
      "check": "DataIntegrity",
      "status": "passed",
      "message": "All fields match source data"
    },
    {
      "check": "RelationshipsIntact",
      "status": "passed",
      "message": "All relationships preserved"
    }
  ],
  "timestamp": "2026-02-04T15:10:00Z"
}
```

**Response (200 OK - Verification Failed):**
```json
{
  "policyId": "DEF-789012",
  "catalystPolicyId": "CAT-111222",
  "verified": false,
  "verificationResults": [
    {
      "check": "PolicyExists",
      "status": "passed",
      "message": "Policy found in Catalyst database"
    },
    {
      "check": "DataIntegrity",
      "status": "failed",
      "message": "Field mismatch detected",
      "details": "Premium amount mismatch: Expected $1,234.56, Found $1,234.00"
    },
    {
      "check": "RelationshipsIntact",
      "status": "passed",
      "message": "All relationships preserved"
    }
  ],
  "timestamp": "2026-02-04T15:10:00Z"
}
```

---

#### 2.4 Get Policy Details

**Endpoint:** `GET /api/migration/policies/{policyId}`

**Purpose:** Get detailed information about a policy's migration status.

**Request:**
```http
GET /api/migration/policies/ABC-123456
```

**Response (200 OK):**
```json
{
  "policyId": "ABC-123456",
  "migrationStatus": "completed",
  "sourceSystem": "S6",
  "targetSystem": "Catalyst",
  "catalystPolicyId": "CAT-987654",
  "migratedAt": "2026-02-04T14:25:30Z",
  "duration": "00:00:02.345",
  "validation": {
    "validated": true,
    "validatedAt": "2026-02-04T14:25:28Z",
    "issues": []
  },
  "verification": {
    "verified": true,
    "verifiedAt": "2026-02-04T14:30:00Z",
    "issues": []
  },
  "retryCount": 0,
  "logs": [
    {
      "timestamp": "2026-02-04T14:25:28Z",
      "level": "info",
      "message": "Validation started"
    },
    {
      "timestamp": "2026-02-04T14:25:29Z",
      "level": "success",
      "message": "Validation passed"
    },
    {
      "timestamp": "2026-02-04T14:25:30Z",
      "level": "success",
      "message": "Migration completed"
    }
  ]
}
```

**Response (404 Not Found):**
```json
{
  "error": "Policy not found",
  "policyId": "INVALID-999",
  "timestamp": "2026-02-04T15:15:00Z"
}
```

---

### Dashboard Integration Examples

**React Component for Policy Operations:**

```typescript
interface PolicyOperationsProps {
  policyId: string;
}

function PolicyOperations({ policyId }: PolicyOperationsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const validatePolicy = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5209/api/migration/policies/${policyId}/validate`,
        { method: 'POST' }
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const migratePolicy = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5209/api/migration/policies/${policyId}/migrate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: false, skipValidation: false })
        }
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyPolicy = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5209/api/migration/policies/${policyId}/verify`,
        { method: 'POST' }
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="policy-operations">
      <h3>Policy Operations: {policyId}</h3>
      <div className="button-group">
        <button onClick={validatePolicy} disabled={loading}>
          Validate
        </button>
        <button onClick={migratePolicy} disabled={loading}>
          Migrate
        </button>
        <button onClick={verifyPolicy} disabled={loading}>
          Verify
        </button>
      </div>
      {result && (
        <div className="result">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 3: Per-Policy State Tracking

**Priority:** HIGH
**Estimated Timeline:** Q2 2026 (included with Phase 2)
**Status:** **ALREADY EXISTS via LogEntry SSE!**

### Overview

**IMPORTANT:** Per-policy state tracking is ALREADY IMPLEMENTED in v1.0.0 through the `LogEntry` SSE stream!

Each `log-entry` event contains:
- **Policy identifier** (in the message)
- **Migration outcome** (success, warning, error)
- **Duration** per policy
- **Detailed information** (in the details field)
- **Action buttons** (retry, view details)

**Current Implementation:**

The logs stream provides real-time per-policy updates:

```
event: log-entry
data: {
  "id": "log-001",
  "timestamp": "2026-02-04T14:30:00Z",
  "level": "success",
  "message": "Policy ABC-123456 migrated successfully",
  "details": null,
  "duration": "00:00:02.345",
  "action": "view",
  "actionLabel": "View Details"
}
```

### What's Already Available

**Dashboard can already:**

1. **Track individual policy migrations** via log stream
   ```javascript
   logsSource.addEventListener('log-entry', (event) => {
     const log = JSON.parse(event.data);
     // Extract policy ID from message (e.g., "Policy ABC-123456 migrated successfully")
     const policyId = extractPolicyId(log.message);
     updatePolicyStatus(policyId, log.level, log.duration);
   });
   ```

2. **Display per-policy success/failure**
   - Success logs: `level: "success"`
   - Failed logs: `level: "error"`
   - Warning logs: `level: "warning"`

3. **Show per-policy processing time**
   - Duration field: `"duration": "00:00:02.345"`

4. **Provide retry actions**
   - Action field: `"action": "retry"`
   - Action label: `"actionLabel": "Retry Migration"`

### Phase 3 Enhancements (Future)

While per-policy tracking exists via logs, Phase 3 will add:

#### 3.1 Structured Policy Status Endpoint

**Endpoint:** `GET /api/migration/policies?status={status}&limit={limit}`

**Purpose:** Query policies by migration status.

**Request:**
```http
GET /api/migration/policies?status=failed&limit=50
```

**Response (200 OK):**
```json
{
  "policies": [
    {
      "policyId": "ABC-123456",
      "status": "completed",
      "migratedAt": "2026-02-04T14:25:30Z",
      "duration": "00:00:02.345"
    },
    {
      "policyId": "DEF-789012",
      "status": "failed",
      "attemptedAt": "2026-02-04T14:26:00Z",
      "duration": "00:00:05.678",
      "error": "Database connection timeout"
    }
  ],
  "totalCount": 127,
  "filteredCount": 7
}
```

#### 3.2 SSE Policy Status Stream

**Endpoint:** `/api/migration/events/policy-status`

**Purpose:** Dedicated stream for policy-level state changes.

**Event Format:**
```
event: policy-status
data: {
  "policyId": "ABC-123456",
  "status": "migrating",
  "progress": 45,
  "currentStep": "Validating data",
  "timestamp": "2026-02-04T14:30:00Z"
}

event: policy-status
data: {
  "policyId": "ABC-123456",
  "status": "completed",
  "progress": 100,
  "currentStep": "Migration complete",
  "duration": "00:00:02.345",
  "timestamp": "2026-02-04T14:30:02Z"
}
```

**Benefits over current log-based tracking:**
- Structured policy state data
- Real-time progress within a single policy migration
- Dedicated stream (doesn't mix with other log messages)
- Easier to parse and filter

---

## Phase 4: Authentication & Authorization

**Priority:** MEDIUM
**Estimated Timeline:** Q3 2026 (3-4 months)
**Status:** Not started (MVP has no authentication)

### Overview

Add authentication and authorization to secure the API for:
- Multi-user environments
- Production deployments
- Role-based access control

### Authentication Methods

#### 4.1 OAuth2 / OpenID Connect

**Implementation:** Integrate with organization's OAuth2 provider (Azure AD, Okta, etc.)

**Authentication Flow:**

1. **Client obtains access token** from OAuth2 provider
2. **Client includes token** in requests:
   ```http
   GET /api/migration/status
   Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. **Server validates token** and checks permissions
4. **Server responds** with data or 401/403 error

**SSE Authentication:**

```javascript
// EventSource doesn't support custom headers, so use query parameter
const token = getAccessToken();
const source = new EventSource(
  `http://localhost:5209/api/migration/events/status?access_token=${token}`
);
```

**Alternative (better security):**

```javascript
// Use EventSource with credentials (cookies)
const source = new EventSource(
  'http://localhost:5209/api/migration/events/status',
  { withCredentials: true }
);
```

#### 4.2 API Keys

**Implementation:** Simple API key for machine-to-machine communication.

**Request:**
```http
GET /api/migration/status
X-API-Key: s6catalyst-abc123def456ghi789
```

**API Key Management Endpoints:**

- `POST /api/auth/keys` - Create new API key
- `GET /api/auth/keys` - List API keys
- `DELETE /api/auth/keys/{keyId}` - Revoke API key

---

### Authorization Roles

#### 4.3 Role-Based Access Control (RBAC)

**Roles:**

1. **Admin**
   - Full access to all endpoints
   - Can pause, resume, stop, restart migrations
   - Can create/revoke API keys
   - Can view all policies

2. **Operator**
   - Can view migration status, logs, stats
   - Can pause and resume migrations
   - Cannot stop or restart migrations
   - Cannot manage API keys

3. **Viewer** (Read-Only)
   - Can view migration status, logs, stats
   - Cannot execute commands
   - Cannot access policy-level operations

**Endpoint Authorization Matrix:**

| Endpoint | Admin | Operator | Viewer |
|----------|-------|----------|--------|
| `GET /api/migration/status` | ✅ | ✅ | ✅ |
| `GET /api/migration/logs` | ✅ | ✅ | ✅ |
| `GET /api/migration/stats` | ✅ | ✅ | ✅ |
| `POST /api/migration/pause` | ✅ | ✅ | ❌ |
| `POST /api/migration/resume` | ✅ | ✅ | ❌ |
| `POST /api/migration/stop` | ✅ | ❌ | ❌ |
| `POST /api/migration/restart` | ✅ | ❌ | ❌ |
| `POST /api/migration/policies/{id}/migrate` | ✅ | ❌ | ❌ |
| `POST /api/auth/keys` | ✅ | ❌ | ❌ |

---

### Error Responses

**401 Unauthorized (No Token):**
```json
{
  "error": "Authentication required",
  "message": "No access token provided",
  "timestamp": "2026-02-04T15:30:00Z"
}
```

**401 Unauthorized (Invalid Token):**
```json
{
  "error": "Invalid access token",
  "message": "Token has expired or is invalid",
  "timestamp": "2026-02-04T15:30:00Z"
}
```

**403 Forbidden (Insufficient Permissions):**
```json
{
  "error": "Insufficient permissions",
  "message": "User does not have permission to execute this operation",
  "requiredRole": "Admin",
  "userRole": "Viewer",
  "timestamp": "2026-02-04T15:30:00Z"
}
```

---

## Phase 5: Advanced Queries & Filtering

**Priority:** LOW
**Estimated Timeline:** Q4 2026 (2 months)
**Status:** Not started

### Overview

Add advanced querying capabilities for logs, policies, and statistics.

### 5.1 Log Filtering

**Endpoint:** `GET /api/migration/logs`

**New Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `level` | string | Filter by log level | `level=error` |
| `startTime` | datetime | Logs after timestamp | `startTime=2026-02-04T14:00:00Z` |
| `endTime` | datetime | Logs before timestamp | `endTime=2026-02-04T15:00:00Z` |
| `search` | string | Search in message/details | `search=timeout` |
| `policyId` | string | Filter by policy ID | `policyId=ABC-123456` |
| `hasAction` | boolean | Logs with action buttons | `hasAction=true` |

**Example Requests:**

```bash
# Get all error logs
curl "http://localhost:5209/api/migration/logs?level=error&limit=50"

# Get logs for specific policy
curl "http://localhost:5209/api/migration/logs?policyId=ABC-123456"

# Get logs with actions (retryable errors)
curl "http://localhost:5209/api/migration/logs?hasAction=true"

# Get logs in time range
curl "http://localhost:5209/api/migration/logs?startTime=2026-02-04T14:00:00Z&endTime=2026-02-04T15:00:00Z"

# Search for specific error
curl "http://localhost:5209/api/migration/logs?search=timeout"
```

**Response:**
```json
{
  "logs": [
    {
      "id": "log-003",
      "timestamp": "2026-02-04T14:29:55Z",
      "level": "error",
      "message": "Policy GHI-345678 migration failed",
      "details": "Database connection timeout",
      "duration": "00:00:05.678",
      "action": "view-details",
      "actionLabel": "View Error Details"
    }
  ],
  "totalCount": 127,
  "filteredCount": 7,
  "filters": {
    "level": "error"
  }
}
```

---

### 5.2 Statistics Time Series

**Endpoint:** `GET /api/migration/stats/timeseries`

**Purpose:** Get statistics over time for graphing.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `interval` | string | Time interval | `1m`, `5m`, `1h` |
| `startTime` | datetime | Start of time range | `2026-02-04T14:00:00Z` |
| `endTime` | datetime | End of time range | `2026-02-04T15:00:00Z` |

**Request:**
```bash
curl "http://localhost:5209/api/migration/stats/timeseries?interval=5m&startTime=2026-02-04T14:00:00Z"
```

**Response:**
```json
{
  "interval": "5m",
  "dataPoints": [
    {
      "timestamp": "2026-02-04T14:00:00Z",
      "processedRecords": 0,
      "successCount": 0,
      "warningCount": 0,
      "errorCount": 0,
      "averageProcessingTime": 0
    },
    {
      "timestamp": "2026-02-04T14:05:00Z",
      "processedRecords": 125,
      "successCount": 120,
      "warningCount": 4,
      "errorCount": 1,
      "averageProcessingTime": 2156.34
    },
    {
      "timestamp": "2026-02-04T14:10:00Z",
      "processedRecords": 248,
      "successCount": 238,
      "warningCount": 8,
      "errorCount": 2,
      "averageProcessingTime": 2234.12
    }
  ]
}
```

**Dashboard Integration:**

```typescript
// Fetch time series data for charting
async function fetchTimeSeries() {
  const response = await fetch(
    'http://localhost:5209/api/migration/stats/timeseries?interval=5m'
  );
  const data = await response.json();

  // Render with Chart.js or similar
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.dataPoints.map(dp => dp.timestamp),
      datasets: [
        {
          label: 'Success',
          data: data.dataPoints.map(dp => dp.successCount),
          borderColor: 'green'
        },
        {
          label: 'Errors',
          data: data.dataPoints.map(dp => dp.errorCount),
          borderColor: 'red'
        }
      ]
    }
  });
}
```

---

### 5.3 Aggregated Statistics

**Endpoint:** `GET /api/migration/stats/aggregated`

**Purpose:** Get aggregated statistics by various dimensions.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `groupBy` | string | Group by dimension | `hour`, `batch`, `policyType` |
| `startTime` | datetime | Start of time range | `2026-02-04T14:00:00Z` |
| `endTime` | datetime | End of time range | `2026-02-04T15:00:00Z` |

**Request:**
```bash
curl "http://localhost:5209/api/migration/stats/aggregated?groupBy=hour"
```

**Response:**
```json
{
  "groupBy": "hour",
  "aggregations": [
    {
      "group": "2026-02-04T14:00:00Z",
      "totalRecords": 452,
      "successCount": 420,
      "warningCount": 25,
      "errorCount": 7,
      "successRate": 92.92,
      "averageProcessingTime": 2345.67
    },
    {
      "group": "2026-02-04T15:00:00Z",
      "totalRecords": 548,
      "successCount": 530,
      "warningCount": 10,
      "errorCount": 8,
      "successRate": 96.72,
      "averageProcessingTime": 2123.45
    }
  ]
}
```

---

## Phase 6: Multi-Environment Support

**Priority:** LOW
**Estimated Timeline:** Q1 2027 (1-2 months)
**Status:** Future consideration

### Overview

Support multiple migration environments (dev, test, staging, production).

### 6.1 Environment Configuration

**Endpoint:** `GET /api/environments`

**Purpose:** List available migration environments.

**Response:**
```json
{
  "environments": [
    {
      "id": "dev",
      "name": "Development",
      "baseUrl": "http://localhost:5209",
      "status": "healthy",
      "lastSeen": "2026-02-04T15:00:00Z"
    },
    {
      "id": "test",
      "name": "Test",
      "baseUrl": "http://test-server:5209",
      "status": "healthy",
      "lastSeen": "2026-02-04T15:00:00Z"
    },
    {
      "id": "prod",
      "name": "Production",
      "baseUrl": "http://prod-server:5209",
      "status": "healthy",
      "lastSeen": "2026-02-04T15:00:00Z"
    }
  ]
}
```

### 6.2 Dashboard Multi-Environment Switcher

```typescript
function EnvironmentSwitcher() {
  const [environment, setEnvironment] = useState('dev');
  const [baseUrl, setBaseUrl] = useState('http://localhost:5209');

  const environments = [
    { id: 'dev', name: 'Development', url: 'http://localhost:5209' },
    { id: 'test', name: 'Test', url: 'http://test-server:5209' },
    { id: 'prod', name: 'Production', url: 'http://prod-server:5209' }
  ];

  const switchEnvironment = (envId: string) => {
    const env = environments.find(e => e.id === envId);
    if (env) {
      setEnvironment(envId);
      setBaseUrl(env.url);
      // Reconnect SSE streams with new base URL
      reconnectStreams(env.url);
    }
  };

  return (
    <select value={environment} onChange={(e) => switchEnvironment(e.target.value)}>
      {environments.map((env) => (
        <option key={env.id} value={env.id}>{env.name}</option>
      ))}
    </select>
  );
}
```

---

## Phase 7: Reporting & Analytics

**Priority:** LOW
**Estimated Timeline:** Q2 2027 (2-3 months)
**Status:** Future consideration

### Overview

Add comprehensive reporting and analytics capabilities.

### 7.1 Migration Reports

**Endpoint:** `GET /api/migration/reports/{sessionId}`

**Purpose:** Generate comprehensive migration report.

**Response:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "startTime": "2026-02-04T14:00:00Z",
  "endTime": "2026-02-04T14:34:28Z",
  "duration": "00:34:28",
  "summary": {
    "totalPolicies": 1000,
    "successful": 950,
    "warnings": 35,
    "errors": 15,
    "successRate": 95.0
  },
  "performance": {
    "averageProcessingTime": 2123.45,
    "fastestPolicy": "00:00:00.456",
    "slowestPolicy": "00:00:15.234",
    "throughput": 29.0
  },
  "errorBreakdown": [
    {
      "errorType": "Database Timeout",
      "count": 8,
      "percentage": 53.3
    },
    {
      "errorType": "Invalid Data",
      "count": 5,
      "percentage": 33.3
    },
    {
      "errorType": "Reference Data Missing",
      "count": 2,
      "percentage": 13.3
    }
  ],
  "recommendations": [
    "Investigate database connection timeouts (8 occurrences)",
    "Review data validation rules (5 failures)",
    "Update reference data tables (2 missing codes)"
  ]
}
```

### 7.2 Export Reports

**Endpoint:** `GET /api/migration/reports/{sessionId}/export`

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `format` | string | Export format | `pdf`, `csv`, `json`, `xlsx` |

**Request:**
```bash
curl "http://localhost:5209/api/migration/reports/{sessionId}/export?format=pdf" -o report.pdf
```

---

## Timeline & Priorities

### Roadmap Summary

| Phase | Features | Priority | Timeline | Effort |
|-------|----------|----------|----------|--------|
| **Phase 1 (MVP)** ✅ | SSE streams, commands, queries | CRITICAL | Q1 2026 | COMPLETE |
| **Phase 2** | Policy-level operations | HIGH | Q2 2026 | 2-3 months |
| **Phase 3** | Per-policy tracking enhancements | HIGH | Q2 2026 | Included in Phase 2 |
| **Phase 4** | Authentication & authorization | MEDIUM | Q3 2026 | 3-4 months |
| **Phase 5** | Advanced queries & filtering | LOW | Q4 2026 | 2 months |
| **Phase 6** | Multi-environment support | LOW | Q1 2027 | 1-2 months |
| **Phase 7** | Reporting & analytics | LOW | Q2 2027 | 2-3 months |

### Phase Dependencies

```
Phase 1 (MVP) ✅
    │
    ├─── Phase 2 (Policy Operations)
    │       │
    │       └─── Phase 3 (Per-Policy Tracking)
    │
    ├─── Phase 4 (Authentication)
    │       │
    │       └─── Phase 6 (Multi-Environment)
    │
    └─── Phase 5 (Advanced Queries)
            │
            └─── Phase 7 (Reporting)
```

### Priority Levels

**CRITICAL:** Required for MVP launch
- ✅ Complete

**HIGH:** Important for production use
- Policy-level operations (Phase 2)
- Per-policy tracking enhancements (Phase 3)

**MEDIUM:** Important for security and scalability
- Authentication & authorization (Phase 4)

**LOW:** Nice-to-have features
- Advanced queries & filtering (Phase 5)
- Multi-environment support (Phase 6)
- Reporting & analytics (Phase 7)

---

## Breaking Changes

### Versioning Strategy

When introducing breaking changes:

1. **MAJOR version bump** (e.g., v1.0.0 → v2.0.0)
2. **API version prefix** in URL (e.g., `/api/v2/migration/status`)
3. **Deprecation period** (minimum 6 months)
4. **Migration guide** for upgrading clients

**Example Breaking Change (Phase 4 - Authentication):**

```
v1.0.0 (MVP):
GET http://localhost:5209/api/migration/status
(No authentication required)

v2.0.0 (With Authentication):
GET http://localhost:5209/api/v2/migration/status
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
(Authentication required)

v1.0.0 continues to work but is deprecated.
```

---

## Feedback & Contributions

### Requesting Features

To request new features:

1. Create GitHub issue with label `enhancement`
2. Describe use case and benefits
3. Provide mockup or example if possible
4. Indicate priority (nice-to-have vs. critical)

### Contributing

Contributions welcome! Please:

1. Check roadmap to avoid duplicate work
2. Discuss major changes in issue before implementation
3. Follow existing code style and patterns
4. Add tests for new functionality
5. Update documentation

---

## Related Documentation

- [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md): Complete developer integration guide
- [EVENT-SCHEMAS.md](EVENT-SCHEMAS.md): JSON Schema definitions
- [TESTING-GUIDE.md](TESTING-GUIDE.md): Comprehensive testing scenarios
- [api-contract-openapi.yaml](api-contract-openapi.yaml): OpenAPI v1.0.0 specification
- [api-contract-asyncapi.yaml](api-contract-asyncapi.yaml): AsyncAPI v1.0.0 specification

---

## Conclusion

The S6 Catalyst Migration Dashboard API has a solid MVP foundation (v1.0.0) and a clear roadmap for future enhancements. The phased approach ensures:

- **Phase 2-3 (HIGH):** Critical policy-level operations for production use
- **Phase 4 (MEDIUM):** Security and multi-user support
- **Phase 5-7 (LOW):** Advanced features as needs arise

**Key Insight:** Per-policy state tracking is ALREADY AVAILABLE via the logs stream - dashboards can leverage this immediately without waiting for Phase 3!

The roadmap is flexible and will be adjusted based on user feedback and changing requirements.
