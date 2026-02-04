"use client";

import { useEffect, useState } from "react";
import type {
  MigrationStatus,
  MigrationStats,
  LogEntry,
} from "context/types";
import {
  connectStatusStream,
  connectLogsStream,
  connectStatsStream,
} from "@/lib/migration-api";

export function useStatusStream(baseUrlDep?: string) {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = connectStatusStream({
      onConnected: () => {
        setConnected(true);
        setError(null);
      },
      onData: (data) => {
        setStatus(data);
        setConnected(true);
      },
      onHeartbeat: () => {
        // no-op; could be used for connection indicator
      },
      onError: () => {
        setConnected(false);
        setError("Disconnected from status stream");
      },
    });

    return () => {
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrlDep]);

  return { status, connected, error };
}

export function useStatsStream(baseUrlDep?: string) {
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = connectStatsStream({
      onConnected: () => {
        setConnected(true);
      },
      onData: (data) => {
        setStats(data);
        setConnected(true);
      },
      onError: () => {
        setConnected(false);
      },
    });

    return () => {
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrlDep]);

  return { stats, connected };
}

export function useLogsStream(limit = 100, baseUrlDep?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = connectLogsStream({
      onConnected: () => {
        setConnected(true);
      },
      onData: (log) => {
        setLogs((prev) => [log, ...prev].slice(0, limit));
      },
      onError: () => {
        setConnected(false);
      },
    });

    return () => {
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, baseUrlDep]);

  return { logs, connected };
}

