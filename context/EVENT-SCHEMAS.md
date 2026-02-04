# S6 Catalyst Migration Dashboard - Event Schemas

**Version:** 1.0.0
**Last Updated:** 2026-02-04

## Table of Contents

1. [Overview](#overview)
2. [Schema Versioning](#schema-versioning)
3. [Core Event Schemas](#core-event-schemas)
4. [API Response Schemas](#api-response-schemas)
5. [SSE Event Payloads](#sse-event-payloads)
6. [Validation Rules](#validation-rules)
7. [Schema Evolution](#schema-evolution)

---

## Overview

This document provides complete JSON Schema definitions for all data structures used in the S6 Catalyst Migration Dashboard API. These schemas are authoritative and match the C# backend models exactly.

**Schema Format:** JSON Schema Draft 2020-12

**Use Cases:**
- Client-side validation (TypeScript, JavaScript, C#)
- API contract testing
- Code generation
- Documentation

---

## Schema Versioning

### Versioning Strategy

The API uses **semantic versioning** (MAJOR.MINOR.PATCH) aligned with the OpenAPI/AsyncAPI specifications:

- **MAJOR**: Breaking changes (field removal, type changes, new required fields)
- **MINOR**: Backward-compatible additions (new optional fields, new event types)
- **PATCH**: Bug fixes, documentation updates (no schema changes)

**Current Version:** 1.0.0

### Version Headers

While MVP has no authentication, future versions will include version headers:

```http
X-API-Version: 1.0.0
Content-Type: application/json
```

### Backward Compatibility

**Guaranteed for MVP:**
- Field names will not change
- Field types will not change
- Required fields will not be removed
- New optional fields may be added (clients must ignore unknown fields)

**Not Guaranteed:**
- Event ordering
- Event delivery timing
- Heartbeat interval (currently 30s)

---

## Core Event Schemas

### MigrationStatus

Complete migration status and progress information.

**Sent via:**
- SSE: `status-update` event on `/api/migration/events/status`
- REST: `GET /api/migration/status`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/MigrationStatus.json",
  "title": "MigrationStatus",
  "description": "Current migration status and progress information",
  "type": "object",
  "required": [
    "id",
    "status",
    "progress",
    "elapsed",
    "estimated",
    "nextTask",
    "latestStatus",
    "startTime"
  ],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique migration session ID",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
      "examples": ["550e8400-e29b-41d4-a716-446655440000"]
    },
    "status": {
      "type": "string",
      "enum": ["running", "paused", "completed", "error", "stopped"],
      "description": "Current migration state",
      "examples": ["running"]
    },
    "progress": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Migration progress percentage (0-100)",
      "examples": [45.2]
    },
    "elapsed": {
      "type": "string",
      "pattern": "^[0-9]{2}:[0-9]{2}:[0-9]{2}$",
      "description": "Elapsed time since migration started (HH:mm:ss format)",
      "examples": ["00:15:32"]
    },
    "estimated": {
      "type": "string",
      "pattern": "^[0-9]{2}:[0-9]{2}:[0-9]{2}$",
      "description": "Estimated total time to completion (HH:mm:ss format)",
      "examples": ["00:34:28"]
    },
    "nextTask": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Description of the next task to be executed",
      "examples": ["Processing batch 12 of 25"]
    },
    "latestStatus": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Most recent status message",
      "examples": ["Migrating policy ABC-123456"]
    },
    "startTime": {
      "type": "string",
      "format": "date-time",
      "description": "Migration start timestamp (ISO 8601 format)",
      "examples": ["2026-02-04T14:00:00Z"]
    }
  },
  "additionalProperties": false
}
```

**Validation Rules:**
- `id` must be valid UUID v4
- `status` must be one of 5 enumerated values
- `progress` must be 0-100 (inclusive)
- `elapsed` and `estimated` must match HH:mm:ss pattern (00:00:00 to 99:59:59)
- `nextTask` and `latestStatus` cannot be empty strings
- `startTime` must be valid ISO 8601 datetime with timezone

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "progress": 45.2,
  "elapsed": "00:15:32",
  "estimated": "00:34:28",
  "nextTask": "Processing batch 12 of 25",
  "latestStatus": "Migrating policy ABC-123456",
  "startTime": "2026-02-04T14:00:00Z"
}
```

---

### LogEntry

Log entry with level, message, and optional action button.

**Sent via:**
- SSE: `log-entry` event on `/api/migration/events/logs`
- REST: `GET /api/migration/logs?limit=N`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/LogEntry.json",
  "title": "LogEntry",
  "description": "Log entry with level, message, and optional action button",
  "type": "object",
  "required": ["id", "timestamp", "level", "message"],
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Unique log entry ID",
      "examples": ["log-001"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Log entry timestamp (ISO 8601 format)",
      "examples": ["2026-02-04T14:30:00Z"]
    },
    "level": {
      "type": "string",
      "enum": ["success", "warning", "error", "info"],
      "description": "Log severity level",
      "examples": ["success"]
    },
    "message": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000,
      "description": "Log message",
      "examples": ["Policy ABC-123456 migrated successfully"]
    },
    "details": {
      "type": ["string", "null"],
      "maxLength": 5000,
      "description": "Additional log details (optional)",
      "examples": ["Coverage code XYZ not found in reference data", null]
    },
    "duration": {
      "type": ["string", "null"],
      "pattern": "^[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{3})?$",
      "description": "Operation duration (HH:mm:ss.fff format, optional)",
      "examples": ["00:00:02.345", null]
    },
    "action": {
      "type": ["string", "null"],
      "enum": ["view", "retry", "view-details", null],
      "description": "Action button type (optional)",
      "examples": ["view", null]
    },
    "actionLabel": {
      "type": ["string", "null"],
      "minLength": 1,
      "maxLength": 100,
      "description": "Action button label (optional)",
      "examples": ["View Details", null]
    }
  },
  "additionalProperties": false,
  "dependentSchemas": {
    "action": {
      "properties": {
        "actionLabel": {
          "type": "string",
          "minLength": 1
        }
      },
      "required": ["actionLabel"]
    }
  }
}
```

**Validation Rules:**
- `id` cannot be empty
- `timestamp` must be valid ISO 8601 datetime
- `level` must be one of 4 enumerated values
- `message` cannot be empty (max 1000 chars)
- `details` optional, max 5000 chars
- `duration` optional, must match HH:mm:ss or HH:mm:ss.fff pattern
- `action` and `actionLabel` are co-dependent: if `action` is not null, `actionLabel` is required
- `actionLabel` required when `action` is present

**Examples:**

Success log:
```json
{
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

Error log with details:
```json
{
  "id": "log-003",
  "timestamp": "2026-02-04T14:29:55Z",
  "level": "error",
  "message": "Policy GHI-345678 migration failed",
  "details": "Database connection timeout after 30 seconds. Check network connectivity and database server status.",
  "duration": "00:00:05.678",
  "action": "view-details",
  "actionLabel": "View Error Details"
}
```

Info log without action:
```json
{
  "id": "log-004",
  "timestamp": "2026-02-04T14:29:50Z",
  "level": "info",
  "message": "Starting batch 12 of 25",
  "details": "Batch contains 40 policies",
  "duration": null,
  "action": null,
  "actionLabel": null
}
```

---

### MigrationStats

Migration statistics and counters.

**Sent via:**
- SSE: `stats-update` event on `/api/migration/events/stats`
- REST: `GET /api/migration/stats`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/MigrationStats.json",
  "title": "MigrationStats",
  "description": "Migration statistics and counters",
  "type": "object",
  "required": [
    "totalRecords",
    "processedRecords",
    "successCount",
    "warningCount",
    "errorCount",
    "averageProcessingTime"
  ],
  "properties": {
    "totalRecords": {
      "type": "integer",
      "minimum": 0,
      "description": "Total number of records to process",
      "examples": [1000]
    },
    "processedRecords": {
      "type": "integer",
      "minimum": 0,
      "description": "Number of records processed so far",
      "examples": [452]
    },
    "successCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Number of successful migrations",
      "examples": [420]
    },
    "warningCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Number of migrations with warnings",
      "examples": [25]
    },
    "errorCount": {
      "type": "integer",
      "minimum": 0,
      "description": "Number of failed migrations",
      "examples": [7]
    },
    "averageProcessingTime": {
      "type": "number",
      "minimum": 0,
      "description": "Average processing time per record (milliseconds)",
      "examples": [2345.67]
    }
  },
  "additionalProperties": false
}
```

**Validation Rules:**
- All counts must be non-negative integers
- `processedRecords` should be ≤ `totalRecords` (not enforced by schema)
- `processedRecords` should equal `successCount + warningCount + errorCount` (not enforced by schema)
- `averageProcessingTime` must be non-negative number (milliseconds)

**Invariants (enforced by backend, not schema):**
- `processedRecords ≤ totalRecords`
- `successCount + warningCount + errorCount = processedRecords`
- All counters monotonically increase during migration

**Example:**
```json
{
  "totalRecords": 1000,
  "processedRecords": 452,
  "successCount": 420,
  "warningCount": 25,
  "errorCount": 7,
  "averageProcessingTime": 2345.67
}
```

---

## API Response Schemas

### CommandResponse

Standard response for command endpoints (pause, resume, stop, restart).

**Returned by:**
- `POST /api/migration/pause`
- `POST /api/migration/resume`
- `POST /api/migration/stop`
- `POST /api/migration/restart`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/CommandResponse.json",
  "title": "CommandResponse",
  "description": "Standard response for command endpoints",
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500,
      "description": "Success message",
      "examples": ["Migration paused successfully"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Response timestamp (ISO 8601 format)",
      "examples": ["2026-02-04T14:30:00Z"]
    }
  },
  "additionalProperties": false
}
```

**Note:** In MVP, both fields are optional (backend may omit them). Future versions will require both fields.

**Example:**
```json
{
  "message": "Migration paused successfully",
  "timestamp": "2026-02-04T14:30:00Z"
}
```

---

### ErrorResponse

Standard error response for all API endpoints.

**Returned with HTTP status codes:** 400 (Bad Request), 500 (Internal Server Error), 503 (Service Unavailable)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/ErrorResponse.json",
  "title": "ErrorResponse",
  "description": "Standard error response",
  "type": "object",
  "required": ["error", "timestamp"],
  "properties": {
    "error": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1000,
      "description": "Error message",
      "examples": ["Failed to pause migration"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Error timestamp (ISO 8601 format)",
      "examples": ["2026-02-04T14:30:00Z"]
    }
  },
  "additionalProperties": false
}
```

**Validation Rules:**
- `error` cannot be empty
- `timestamp` must be valid ISO 8601 datetime

**Example:**
```json
{
  "error": "Migration is not currently running",
  "timestamp": "2026-02-04T14:30:00Z"
}
```

---

### HealthResponse

Health check response with connection counts.

**Returned by:** `GET /api/health`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/HealthResponse.json",
  "title": "HealthResponse",
  "description": "Health check response with connection counts",
  "type": "object",
  "required": ["status", "version", "timestamp", "connections", "migration"],
  "properties": {
    "status": {
      "type": "string",
      "enum": ["healthy", "degraded", "unhealthy"],
      "description": "Overall health status",
      "examples": ["healthy"]
    },
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$",
      "description": "API version (semantic versioning)",
      "examples": ["1.0.0"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Health check timestamp (ISO 8601 format)",
      "examples": ["2026-02-04T14:35:00Z"]
    },
    "connections": {
      "type": "object",
      "required": ["status", "logs", "stats", "total"],
      "properties": {
        "status": {
          "type": "integer",
          "minimum": 0,
          "description": "Number of clients connected to status stream",
          "examples": [3]
        },
        "logs": {
          "type": "integer",
          "minimum": 0,
          "description": "Number of clients connected to logs stream",
          "examples": [2]
        },
        "stats": {
          "type": "integer",
          "minimum": 0,
          "description": "Number of clients connected to stats stream",
          "examples": [1]
        },
        "total": {
          "type": "integer",
          "minimum": 0,
          "description": "Total number of connected clients",
          "examples": [6]
        }
      },
      "additionalProperties": false
    },
    "migration": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": {
          "type": "string",
          "enum": ["running", "paused", "completed", "error", "stopped"],
          "description": "Current migration state",
          "examples": ["running"]
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

**Validation Rules:**
- `version` must match semantic versioning pattern (MAJOR.MINOR.PATCH)
- `connections.total` should equal `status + logs + stats` (not enforced by schema)
- All connection counts must be non-negative

**Example:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-02-04T14:35:00Z",
  "connections": {
    "status": 3,
    "logs": 2,
    "stats": 1,
    "total": 6
  },
  "migration": {
    "status": "running"
  }
}
```

---

### VersionResponse

API version and endpoint information.

**Returned by:** `GET /api/version`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/VersionResponse.json",
  "title": "VersionResponse",
  "description": "API version and endpoint information",
  "type": "object",
  "required": ["version", "apiVersion", "protocol", "specVersion", "endpoints"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$",
      "description": "API version (semantic versioning)",
      "examples": ["1.0.0"]
    },
    "apiVersion": {
      "type": "string",
      "pattern": "^v[0-9]+$",
      "description": "API version prefix",
      "examples": ["v1"]
    },
    "protocol": {
      "type": "string",
      "enum": ["SSE"],
      "description": "Communication protocol",
      "examples": ["SSE"]
    },
    "specVersion": {
      "type": "object",
      "required": ["openapi", "asyncapi"],
      "properties": {
        "openapi": {
          "type": "string",
          "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$",
          "description": "OpenAPI specification version",
          "examples": ["3.0.3"]
        },
        "asyncapi": {
          "type": "string",
          "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$",
          "description": "AsyncAPI specification version",
          "examples": ["2.6.0"]
        }
      },
      "additionalProperties": false
    },
    "endpoints": {
      "type": "object",
      "required": ["events", "commands", "queries"],
      "properties": {
        "events": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 3,
          "description": "SSE event stream endpoints",
          "examples": [[
            "/api/migration/events/status",
            "/api/migration/events/logs",
            "/api/migration/events/stats"
          ]]
        },
        "commands": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 4,
          "description": "Command endpoints",
          "examples": [[
            "POST /api/migration/pause",
            "POST /api/migration/resume",
            "POST /api/migration/stop",
            "POST /api/migration/restart"
          ]]
        },
        "queries": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 3,
          "description": "Query endpoints",
          "examples": [[
            "GET /api/migration/status",
            "GET /api/migration/logs?limit=N",
            "GET /api/migration/stats"
          ]]
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

**Example:**
```json
{
  "version": "1.0.0",
  "apiVersion": "v1",
  "protocol": "SSE",
  "specVersion": {
    "openapi": "3.0.3",
    "asyncapi": "2.6.0"
  },
  "endpoints": {
    "events": [
      "/api/migration/events/status",
      "/api/migration/events/logs",
      "/api/migration/events/stats"
    ],
    "commands": [
      "POST /api/migration/pause",
      "POST /api/migration/resume",
      "POST /api/migration/stop",
      "POST /api/migration/restart"
    ],
    "queries": [
      "GET /api/migration/status",
      "GET /api/migration/logs?limit=N",
      "GET /api/migration/stats"
    ]
  }
}
```

---

## SSE Event Payloads

### ConnectedEvent

Connection established event payload.

**Sent once when client connects to any SSE stream.**
**Event name:** `connected`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/ConnectedEvent.json",
  "title": "ConnectedEvent",
  "description": "Connection established event payload",
  "type": "object",
  "required": ["type", "clientId", "streamType", "timestamp", "message"],
  "properties": {
    "type": {
      "type": "string",
      "const": "connection",
      "description": "Event type (always 'connection')"
    },
    "clientId": {
      "type": "string",
      "minLength": 1,
      "description": "Unique client connection ID",
      "examples": ["abc-123-def-456"]
    },
    "streamType": {
      "type": "string",
      "enum": ["status", "logs", "stats"],
      "description": "Stream type this client is connected to",
      "examples": ["status"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Connection timestamp (ISO 8601 format)",
      "examples": ["2026-02-04T14:30:00Z"]
    },
    "message": {
      "type": "string",
      "minLength": 1,
      "description": "Connection success message",
      "examples": ["Connected to status stream"]
    }
  },
  "additionalProperties": false
}
```

**Example:**
```json
{
  "type": "connection",
  "clientId": "abc-123-def-456",
  "streamType": "status",
  "timestamp": "2026-02-04T14:30:00Z",
  "message": "Connected to status stream"
}
```

---

### HeartbeatEvent

Heartbeat event payload.

**Sent every 30 seconds on all SSE streams.**
**Event name:** `heartbeat`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://s6catalyst.example.com/schemas/HeartbeatEvent.json",
  "title": "HeartbeatEvent",
  "description": "Heartbeat event payload",
  "type": "object",
  "required": ["timestamp"],
  "properties": {
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Heartbeat timestamp (ISO 8601 format)",
      "examples": ["2026-02-04T14:30:30Z"]
    }
  },
  "additionalProperties": false
}
```

**Example:**
```json
{
  "timestamp": "2026-02-04T14:30:30Z"
}
```

---

## Validation Rules

### Common Validation Rules

#### String Formats

| Format | Pattern/Rule | Example |
|--------|-------------|---------|
| UUID | `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` | `550e8400-e29b-41d4-a716-446655440000` |
| ISO 8601 DateTime | `YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DDTHH:mm:ss±hh:mm` | `2026-02-04T14:30:00Z` |
| Time Duration (HH:mm:ss) | `^[0-9]{2}:[0-9]{2}:[0-9]{2}$` | `00:15:32` |
| Time Duration (HH:mm:ss.fff) | `^[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{3})?$` | `00:00:02.345` |
| Semantic Version | `^[0-9]+\\.[0-9]+\\.[0-9]+$` | `1.0.0` |

#### Enum Values

**Migration Status:**
- `running`: Migration is actively processing
- `paused`: Migration is paused (can be resumed)
- `completed`: Migration finished successfully
- `error`: Migration encountered critical error
- `stopped`: Migration was stopped by user

**Log Level:**
- `success`: Operation completed successfully
- `warning`: Operation completed with warnings
- `error`: Operation failed
- `info`: Informational message

**Log Action:**
- `view`: View details
- `retry`: Retry operation
- `view-details`: View detailed error information

**Health Status:**
- `healthy`: Server is operating normally
- `degraded`: Server is running but with issues
- `unhealthy`: Server is not functioning properly

#### Numeric Constraints

| Field | Type | Min | Max | Description |
|-------|------|-----|-----|-------------|
| `progress` | number | 0 | 100 | Progress percentage |
| `totalRecords` | integer | 0 | ∞ | Non-negative count |
| `processedRecords` | integer | 0 | ∞ | Non-negative count |
| `successCount` | integer | 0 | ∞ | Non-negative count |
| `warningCount` | integer | 0 | ∞ | Non-negative count |
| `errorCount` | integer | 0 | ∞ | Non-negative count |
| `averageProcessingTime` | number | 0 | ∞ | Non-negative milliseconds |

#### String Length Constraints

| Field | Min | Max | Description |
|-------|-----|-----|-------------|
| `message` (log) | 1 | 1000 | Cannot be empty |
| `details` | 0 | 5000 | Optional details |
| `nextTask` | 1 | 500 | Cannot be empty |
| `latestStatus` | 1 | 500 | Cannot be empty |
| `actionLabel` | 1 | 100 | Cannot be empty when present |

### Cross-Field Validation

These rules are enforced by the backend but not by JSON Schema:

1. **MigrationStats Invariants:**
   - `processedRecords ≤ totalRecords`
   - `successCount + warningCount + errorCount = processedRecords`

2. **LogEntry Dependencies:**
   - If `action` is not null, `actionLabel` must be provided
   - If `action` is null, `actionLabel` should be null

3. **HealthResponse Invariants:**
   - `connections.total = connections.status + connections.logs + connections.stats`

4. **Time Constraints:**
   - `startTime` should be in the past (not future)
   - `elapsed` should increase monotonically during migration
   - `estimated` should be ≥ `elapsed` (not enforced)

---

## Schema Evolution

### Adding New Fields (MINOR version bump)

New optional fields can be added without breaking backward compatibility:

```json
// Current (v1.0.0)
{
  "id": "...",
  "status": "running",
  "progress": 45.2,
  ...
}

// Future (v1.1.0) - new optional field
{
  "id": "...",
  "status": "running",
  "progress": 45.2,
  "remainingTime": "00:19:56",  // NEW optional field
  ...
}
```

**Client behavior:** Clients must ignore unknown fields.

### Changing Field Types (MAJOR version bump)

Type changes break compatibility and require MAJOR version bump:

```json
// v1.0.0
{
  "progress": 45.2  // number (percentage)
}

// v2.0.0 - BREAKING CHANGE
{
  "progress": {     // object (detailed progress)
    "percentage": 45.2,
    "current": 452,
    "total": 1000
  }
}
```

### Removing Fields (MAJOR version bump)

Field removal breaks compatibility and requires MAJOR version bump. MVP will avoid field removal.

### Adding New Event Types (MINOR version bump)

New SSE event types can be added without breaking compatibility:

```javascript
// v1.0.0 - existing events
source.addEventListener('status-update', ...);
source.addEventListener('heartbeat', ...);

// v1.1.0 - new event type
source.addEventListener('error', ...);  // NEW event type
```

**Client behavior:** Clients should ignore unknown event types.

---

## Client-Side Validation Examples

### TypeScript with Zod

```typescript
import { z } from 'zod';

const MigrationStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['running', 'paused', 'completed', 'error', 'stopped']),
  progress: z.number().min(0).max(100),
  elapsed: z.string().regex(/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/),
  estimated: z.string().regex(/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/),
  nextTask: z.string().min(1).max(500),
  latestStatus: z.string().min(1).max(500),
  startTime: z.string().datetime()
});

// Usage
try {
  const status = MigrationStatusSchema.parse(eventData);
  console.log('Valid status:', status);
} catch (error) {
  console.error('Validation failed:', error);
}
```

### JavaScript with AJV

```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

const migrationStatusSchema = {
  type: 'object',
  required: ['id', 'status', 'progress', 'elapsed', 'estimated', 'nextTask', 'latestStatus', 'startTime'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: ['running', 'paused', 'completed', 'error', 'stopped'] },
    progress: { type: 'number', minimum: 0, maximum: 100 },
    elapsed: { type: 'string', pattern: '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' },
    estimated: { type: 'string', pattern: '^[0-9]{2}:[0-9]{2}:[0-9]{2}$' },
    nextTask: { type: 'string', minLength: 1, maxLength: 500 },
    latestStatus: { type: 'string', minLength: 1, maxLength: 500 },
    startTime: { type: 'string', format: 'date-time' }
  },
  additionalProperties: false
};

const validate = ajv.compile(migrationStatusSchema);

if (validate(eventData)) {
  console.log('Valid status:', eventData);
} else {
  console.error('Validation errors:', validate.errors);
}
```

---

## Schema Testing

### Validating Against Schema

Use online validators or command-line tools:

```bash
# Using ajv-cli
npm install -g ajv-cli
ajv validate -s MigrationStatus.json -d status-example.json

# Using jsonschema (Python)
pip install jsonschema
python -c "import jsonschema; import json; ..."
```

### Test Data Generation

Generate test data from schemas using tools like:
- **json-schema-faker** (JavaScript)
- **hypothesis-jsonschema** (Python)
- **Bogus** (C#)

Example with json-schema-faker:

```javascript
import jsf from 'json-schema-faker';
import schema from './MigrationStatus.json';

const sample = jsf.generate(schema);
console.log(JSON.stringify(sample, null, 2));
```

---

## Related Documentation

- [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md): Complete developer integration guide
- [TESTING-GUIDE.md](TESTING-GUIDE.md): Comprehensive testing scenarios
- [FUTURE-ENHANCEMENTS.md](FUTURE-ENHANCEMENTS.md): Roadmap and future schemas
- [api-contract-openapi.yaml](api-contract-openapi.yaml): OpenAPI specification
- [api-contract-asyncapi.yaml](api-contract-asyncapi.yaml): AsyncAPI specification
- [types.d.ts](types.d.ts): TypeScript type definitions
