import type {
  MigrationStatus,
  MigrationStats,
  LogEntry,
  CommandResponse,
  ErrorResponse,
} from "context/types";

const DEFAULT_BASE_URL = "http://localhost:5209";

const BASE_URL =
  process.env.NEXT_PUBLIC_MIGRATION_API_URL ?? DEFAULT_BASE_URL;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let error: ErrorResponse | undefined;
    try {
      error = (await res.json()) as ErrorResponse;
    } catch {
      // ignore JSON parse errors and fall back to generic error
    }
    const message =
      error?.error ?? `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  if (res.status === 204) {
    // No content
    return undefined as unknown as T;
  }
  return (await res.json()) as T;
}

export async function fetchMigrationStatus(): Promise<MigrationStatus> {
  const res = await fetch(`${BASE_URL}/api/migration/status`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  return handleResponse<MigrationStatus>(res);
}

export async function fetchMigrationStats(): Promise<MigrationStats> {
  const res = await fetch(`${BASE_URL}/api/migration/stats`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  return handleResponse<MigrationStats>(res);
}

export async function fetchMigrationLogs(
  limit = 100
): Promise<LogEntry[]> {
  const res = await fetch(
    `${BASE_URL}/api/migration/logs?limit=${encodeURIComponent(limit)}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );
  return handleResponse<LogEntry[]>(res);
}

export type MigrationCommand = "pause" | "resume" | "stop" | "restart";

export async function executeMigrationCommand(
  command: MigrationCommand
): Promise<CommandResponse> {
  const res = await fetch(`${BASE_URL}/api/migration/${command}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<CommandResponse>(res);
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

export type StatusEventHandler = (status: MigrationStatus) => void;
export type LogsEventHandler = (log: LogEntry) => void;
export type StatsEventHandler = (stats: MigrationStats) => void;

export interface StreamHandlers<T> {
  onConnected?: (data: unknown) => void;
  onData: (data: T) => void;
  onHeartbeat?: (data: unknown) => void;
  onError?: (error: Event) => void;
}

function createEventSource<T>(
  path: string,
  eventMap: Record<string, keyof StreamHandlers<T>>,
  handlers: StreamHandlers<T>
): EventSource {
  const source = new EventSource(`${BASE_URL}${path}`);

  Object.entries(eventMap).forEach(([eventName, handlerKey]) => {
    source.addEventListener(eventName, (event) => {
      const handler = handlers[handlerKey];
      if (!handler) return;
      try {
        const data = JSON.parse((event as MessageEvent).data);
        // @ts-expect-error generic handler types
        handler(data);
      } catch (err) {
        console.error(`Failed to parse SSE event "${eventName}"`, err);
      }
    });
  });

  source.onerror = (error) => {
    if (handlers.onError) {
      handlers.onError(error);
    } else {
      console.error("SSE connection error", error);
    }
  };

  return source;
}

export function connectStatusStream(
  handlers: StreamHandlers<MigrationStatus>
): EventSource {
  return createEventSource<MigrationStatus>(
    "/api/migration/events/status",
    {
      connected: "onConnected",
      "status-update": "onData",
      heartbeat: "onHeartbeat",
    },
    handlers
  );
}

export function connectLogsStream(
  handlers: StreamHandlers<LogEntry>
): EventSource {
  return createEventSource<LogEntry>(
    "/api/migration/events/logs",
    {
      connected: "onConnected",
      "log-entry": "onData",
      heartbeat: "onHeartbeat",
    },
    handlers
  );
}

export function connectStatsStream(
  handlers: StreamHandlers<MigrationStats>
): EventSource {
  return createEventSource<MigrationStats>(
    "/api/migration/events/stats",
    {
      connected: "onConnected",
      "stats-update": "onData",
      heartbeat: "onHeartbeat",
    },
    handlers
  );
}

