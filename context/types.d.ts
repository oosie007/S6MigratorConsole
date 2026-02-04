/**
 * TypeScript Type Definitions for S6 Catalyst Migration Dashboard API
 *
 * These types match the C# models in the migration tool backend.
 * Use these types when integrating the dashboard with TypeScript/JavaScript.
 *
 * @version 1.0.0
 * @see api-contract-openapi.yaml - REST API specification
 * @see api-contract-asyncapi.yaml - SSE events specification
 */

// ============================================================================
// Core Models (matching C# backend models)
// ============================================================================

/**
 * Migration status and progress information.
 *
 * Sent via:
 * - SSE: `status-update` event on `/api/migration/events/status`
 * - REST: `GET /api/migration/status`
 */
export interface MigrationStatus {
  /**
   * Unique migration session ID (UUID format)
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  id: string;

  /**
   * Current migration state
   * - `running`: Migration is actively processing
   * - `paused`: Migration is paused (can be resumed)
   * - `completed`: Migration finished successfully
   * - `error`: Migration encountered critical error
   * - `stopped`: Migration was stopped by user
   */
  status: 'running' | 'paused' | 'completed' | 'error' | 'stopped';

  /**
   * Migration progress percentage (0-100)
   * @minimum 0
   * @maximum 100
   * @example 45.2
   */
  progress: number;

  /**
   * Elapsed time since migration started (HH:mm:ss format)
   * @pattern ^[0-9]{2}:[0-9]{2}:[0-9]{2}$
   * @example "00:15:32"
   */
  elapsed: string;

  /**
   * Estimated total time to completion (HH:mm:ss format)
   * @pattern ^[0-9]{2}:[0-9]{2}:[0-9]{2}$
   * @example "00:34:28"
   */
  estimated: string;

  /**
   * Description of the next task to be executed
   * @example "Processing batch 12 of 25"
   */
  nextTask: string;

  /**
   * Most recent status message
   * @example "Migrating policy ABC-123456"
   */
  latestStatus: string;

  /**
   * Migration start timestamp (ISO 8601 format)
   * @example "2026-02-04T14:00:00Z"
   */
  startTime: string;
}

/**
 * Log entry with level, message, and optional action button.
 *
 * Sent via:
 * - SSE: `log-entry` event on `/api/migration/events/logs`
 * - REST: `GET /api/migration/logs?limit=N`
 */
export interface LogEntry {
  /**
   * Unique log entry ID
   * @example "log-001"
   */
  id: string;

  /**
   * Log entry timestamp (ISO 8601 format)
   * @example "2026-02-04T14:30:00Z"
   */
  timestamp: string;

  /**
   * Log severity level
   * - `success`: Operation completed successfully
   * - `warning`: Operation completed with warnings
   * - `error`: Operation failed
   * - `info`: Informational message
   */
  level: 'success' | 'warning' | 'error' | 'info';

  /**
   * Log message
   * @example "Policy ABC-123456 migrated successfully"
   */
  message: string;

  /**
   * Additional log details (optional)
   * @example "Coverage code XYZ not found in reference data"
   */
  details?: string | null;

  /**
   * Operation duration (HH:mm:ss.fff format, optional)
   * @pattern ^[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?$
   * @example "00:00:02.345"
   */
  duration?: string | null;

  /**
   * Action button type (optional)
   * - `view`: View details
   * - `retry`: Retry operation
   * - `view-details`: View detailed error information
   */
  action?: 'view' | 'retry' | 'view-details' | null;

  /**
   * Action button label (optional)
   * @example "View Details"
   */
  actionLabel?: string | null;
}

/**
 * Migration statistics and counters.
 *
 * Sent via:
 * - SSE: `stats-update` event on `/api/migration/events/stats`
 * - REST: `GET /api/migration/stats`
 */
export interface MigrationStats {
  /**
   * Total number of records to process
   * @example 1000
   */
  totalRecords: number;

  /**
   * Number of records processed so far
   * @example 452
   */
  processedRecords: number;

  /**
   * Number of successful migrations
   * @example 420
   */
  successCount: number;

  /**
   * Number of migrations with warnings
   * @example 25
   */
  warningCount: number;

  /**
   * Number of failed migrations
   * @example 7
   */
  errorCount: number;

  /**
   * Average processing time per record (milliseconds)
   * @example 2345.67
   */
  averageProcessingTime: number;
}

// ============================================================================
// API Response Models
// ============================================================================

/**
 * Standard response for command endpoints (pause, resume, stop, restart).
 *
 * Returned by:
 * - `POST /api/migration/pause`
 * - `POST /api/migration/resume`
 * - `POST /api/migration/stop`
 * - `POST /api/migration/restart`
 */
export interface CommandResponse {
  /**
   * Success message
   * @example "Migration paused successfully"
   */
  message?: string;

  /**
   * Response timestamp (ISO 8601 format)
   * @example "2026-02-04T14:30:00Z"
   */
  timestamp?: string;
}

/**
 * Standard error response for all API endpoints.
 *
 * Returned with HTTP status codes 400, 500, 503.
 */
export interface ErrorResponse {
  /**
   * Error message
   * @example "Failed to pause migration"
   */
  error: string;

  /**
   * Error timestamp (ISO 8601 format)
   * @example "2026-02-04T14:30:00Z"
   */
  timestamp: string;
}

/**
 * Health check response.
 *
 * Returned by: `GET /api/health`
 */
export interface HealthResponse {
  /**
   * Overall health status
   * - `healthy`: Server is operating normally
   * - `degraded`: Server is running but with issues
   * - `unhealthy`: Server is not functioning properly
   */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /**
   * API version
   * @example "1.0.0"
   */
  version: string;

  /**
   * Health check timestamp (ISO 8601 format)
   * @example "2026-02-04T14:35:00Z"
   */
  timestamp: string;

  /**
   * SSE connection counts by stream type
   */
  connections: {
    /**
     * Number of clients connected to status stream
     * @example 3
     */
    status: number;

    /**
     * Number of clients connected to logs stream
     * @example 2
     */
    logs: number;

    /**
     * Number of clients connected to stats stream
     * @example 1
     */
    stats: number;

    /**
     * Total number of connected clients
     * @example 6
     */
    total: number;
  };

  /**
   * Current migration status
   */
  migration: {
    /**
     * Current migration state
     */
    status: MigrationStatus['status'];
  };
}

/**
 * API version and endpoint information.
 *
 * Returned by: `GET /api/version`
 */
export interface VersionResponse {
  /**
   * API version
   * @example "1.0.0"
   */
  version: string;

  /**
   * API version prefix
   * @example "v1"
   */
  apiVersion: string;

  /**
   * Communication protocol
   * @example "SSE"
   */
  protocol: string;

  /**
   * Specification versions
   */
  specVersion: {
    /**
     * OpenAPI specification version
     * @example "3.0.3"
     */
    openapi: string;

    /**
     * AsyncAPI specification version
     * @example "2.6.0"
     */
    asyncapi: string;
  };

  /**
   * Available endpoints by category
   */
  endpoints: {
    /**
     * SSE event stream endpoints
     */
    events: string[];

    /**
     * Command endpoints
     */
    commands: string[];

    /**
     * Query endpoints
     */
    queries: string[];
  };
}

// ============================================================================
// SSE Event Payloads
// ============================================================================

/**
 * Connection established event payload.
 *
 * Sent once when client connects to any SSE stream.
 * Event name: `connected`
 */
export interface ConnectedEvent {
  /**
   * Event type (always 'connection')
   */
  type: 'connection';

  /**
   * Unique client connection ID
   * @example "abc-123-def-456"
   */
  clientId: string;

  /**
   * Stream type this client is connected to
   */
  streamType: 'status' | 'logs' | 'stats';

  /**
   * Connection timestamp (ISO 8601 format)
   * @example "2026-02-04T14:30:00Z"
   */
  timestamp: string;

  /**
   * Connection success message
   * @example "Connected to status stream"
   */
  message: string;
}

/**
 * Heartbeat event payload.
 *
 * Sent every 30 seconds on all SSE streams.
 * Event name: `heartbeat`
 */
export interface HeartbeatEvent {
  /**
   * Heartbeat timestamp (ISO 8601 format)
   * @example "2026-02-04T14:30:30Z"
   */
  timestamp: string;
}

// ============================================================================
// SSE Event Types (discriminated unions)
// ============================================================================

/**
 * All possible events on the status stream.
 */
export type StatusStreamEvent =
  | { event: 'connected'; data: ConnectedEvent }
  | { event: 'status-update'; data: MigrationStatus }
  | { event: 'heartbeat'; data: HeartbeatEvent };

/**
 * All possible events on the logs stream.
 */
export type LogsStreamEvent =
  | { event: 'connected'; data: ConnectedEvent }
  | { event: 'log-entry'; data: LogEntry }
  | { event: 'heartbeat'; data: HeartbeatEvent };

/**
 * All possible events on the stats stream.
 */
export type StatsStreamEvent =
  | { event: 'connected'; data: ConnectedEvent }
  | { event: 'stats-update'; data: MigrationStats }
  | { event: 'heartbeat'; data: HeartbeatEvent };

// ============================================================================
// API Client Helper Types
// ============================================================================

/**
 * SSE stream types
 */
export type StreamType = 'status' | 'logs' | 'stats';

/**
 * Command operation types
 */
export type CommandOperation = 'pause' | 'resume' | 'stop' | 'restart';

/**
 * Configuration for SSE connection
 */
export interface SseConnectionConfig {
  /**
   * Base URL for SSE server
   * @default "http://localhost:5209"
   */
  baseUrl?: string;

  /**
   * Whether to log connection events to console
   * @default false
   */
  debug?: boolean;

  /**
   * Whether to log heartbeat events to console
   * @default false
   */
  logHeartbeats?: boolean;

  /**
   * Event handlers
   */
  handlers: {
    /**
     * Called when connection is established
     */
    onConnected?: (event: ConnectedEvent) => void;

    /**
     * Called when connection error occurs
     */
    onError?: (error: Event) => void;

    /**
     * Called when heartbeat is received
     */
    onHeartbeat?: (event: HeartbeatEvent) => void;
  };
}

/**
 * Configuration for status stream
 */
export interface StatusStreamConfig extends SseConnectionConfig {
  handlers: SseConnectionConfig['handlers'] & {
    /**
     * Called when status update is received
     */
    onStatusUpdate: (status: MigrationStatus) => void;
  };
}

/**
 * Configuration for logs stream
 */
export interface LogsStreamConfig extends SseConnectionConfig {
  handlers: SseConnectionConfig['handlers'] & {
    /**
     * Called when log entry is received
     */
    onLogEntry: (log: LogEntry) => void;
  };
}

/**
 * Configuration for stats stream
 */
export interface StatsStreamConfig extends SseConnectionConfig {
  handlers: SseConnectionConfig['handlers'] & {
    /**
     * Called when stats update is received
     */
    onStatsUpdate: (stats: MigrationStats) => void;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract log level from LogEntry
 */
export type LogLevel = LogEntry['level'];

/**
 * Extract migration status from MigrationStatus
 */
export type MigrationState = MigrationStatus['status'];

/**
 * Extract action type from LogEntry
 */
export type LogAction = NonNullable<LogEntry['action']>;

/**
 * Log entry filter predicate
 */
export type LogFilterPredicate = (log: LogEntry) => boolean;

/**
 * Common log filters
 */
export const LogFilters = {
  /**
   * Filter logs by level
   */
  byLevel: (level: LogLevel): LogFilterPredicate => (log) => log.level === level,

  /**
   * Filter logs by multiple levels
   */
  byLevels: (levels: LogLevel[]): LogFilterPredicate => (log) =>
    levels.includes(log.level),

  /**
   * Filter only error logs
   */
  errorsOnly: (): LogFilterPredicate => (log) => log.level === 'error',

  /**
   * Filter only warning and error logs
   */
  warningsAndErrors: (): LogFilterPredicate => (log) =>
    log.level === 'warning' || log.level === 'error',

  /**
   * Filter logs with action buttons
   */
  withActions: (): LogFilterPredicate => (log) => log.action !== null,
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for MigrationStatus
 */
export function isMigrationStatus(value: unknown): value is MigrationStatus {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'status' in value &&
    'progress' in value
  );
}

/**
 * Type guard for LogEntry
 */
export function isLogEntry(value: unknown): value is LogEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'timestamp' in value &&
    'level' in value &&
    'message' in value
  );
}

/**
 * Type guard for MigrationStats
 */
export function isMigrationStats(value: unknown): value is MigrationStats {
  return (
    typeof value === 'object' &&
    value !== null &&
    'totalRecords' in value &&
    'processedRecords' in value &&
    'successCount' in value
  );
}

/**
 * Type guard for ErrorResponse
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    'timestamp' in value
  );
}
