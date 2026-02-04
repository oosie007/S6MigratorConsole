# S6 Catalyst Migration Dashboard - Integration Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-04

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [JavaScript/TypeScript Integration](#javascripttypescript-integration)
4. [Blazor C# Integration](#blazor-c-integration)
5. [Command API Usage](#command-api-usage)
6. [Error Handling & Reconnection](#error-handling--reconnection)
7. [Complete Examples](#complete-examples)
8. [Testing with curl](#testing-with-curl)

---

## Quick Start

Get up and running in 5 minutes.

### 1. Start the Migration Tool

```bash
# The migration tool automatically starts the SSE server
dotnet run --project S6CatalystMigration
```

The SSE server starts on `http://localhost:5209` (configurable in `appsettings.json`).

### 2. Verify Server is Running

```bash
curl http://localhost:5209/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-02-04T14:35:00Z",
  "connections": {
    "status": 0,
    "logs": 0,
    "stats": 0,
    "total": 0
  },
  "migration": {
    "status": "running"
  }
}
```

### 3. Connect to Status Stream

```javascript
const statusSource = new EventSource('http://localhost:5209/api/migration/events/status');

statusSource.addEventListener('status-update', (event) => {
  const status = JSON.parse(event.data);
  console.log(`Progress: ${status.progress}%`);
});

statusSource.onerror = (error) => {
  console.error('Connection error:', error);
  // EventSource automatically reconnects
};
```

**That's it!** You're now receiving real-time migration updates.

---

## Architecture Overview

### Communication Pattern

```
┌─────────────────┐          ┌──────────────────┐          ┌──────────────┐
│  Migration Tool │          │   SSE Server     │          │  Dashboard   │
│   (C# Backend)  │◄─────────┤  (Port 5209)     │◄─────────┤  (Browser)   │
└─────────────────┘          └──────────────────┘          └──────────────┘
       MASTER                      BRIDGE                    SUBSCRIBER
```

- **Migration Tool = MASTER**: Controls all migration logic and state
- **SSE Server = BRIDGE**: Broadcasts events to connected dashboards
- **Dashboard = SUBSCRIBER**: Receives events and displays real-time updates

### Three Independent Streams

1. **Status Stream** (`/api/migration/events/status`): Progress, state, timing
2. **Logs Stream** (`/api/migration/events/logs`): Real-time log messages
3. **Stats Stream** (`/api/migration/events/stats`): Counters and averages

**Why 3 streams?** HTTP/2 multiplexing allows unlimited concurrent connections with zero performance penalty. Separate streams enable independent subscriptions (e.g., logs-only dashboard).

### Event Types

Each stream emits three event types:

| Event Type | Purpose | Frequency |
|------------|---------|-----------|
| `connected` | Connection established | Once on connect |
| `status-update` / `log-entry` / `stats-update` | Data updates | As they occur |
| `heartbeat` | Connection keepalive | Every 30 seconds |

---

## JavaScript/TypeScript Integration

### Basic EventSource Setup

The browser's native `EventSource` API provides automatic reconnection and proper HTTP/2 multiplexing.

```javascript
// Connect to all three streams
const baseUrl = 'http://localhost:5209';

const statusSource = new EventSource(`${baseUrl}/api/migration/events/status`);
const logsSource = new EventSource(`${baseUrl}/api/migration/events/logs`);
const statsSource = new EventSource(`${baseUrl}/api/migration/events/stats`);

// Status updates
statusSource.addEventListener('status-update', (event) => {
  const status = JSON.parse(event.data);
  updateProgressBar(status.progress);
  document.getElementById('elapsed').textContent = status.elapsed;
  document.getElementById('estimated').textContent = status.estimated;
});

// Log messages
logsSource.addEventListener('log-entry', (event) => {
  const log = JSON.parse(event.data);
  appendLogToUI(log);
});

// Statistics
statsSource.addEventListener('stats-update', (event) => {
  const stats = JSON.parse(event.data);
  updateStatsWidgets(stats);
});
```

### TypeScript React Hook

Complete type-safe React integration with automatic reconnection.

```typescript
import { useEffect, useState } from 'react';

interface MigrationStatus {
  id: string;
  status: 'running' | 'paused' | 'completed' | 'error' | 'stopped';
  progress: number;
  elapsed: string;
  estimated: string;
  nextTask: string;
  latestStatus: string;
  startTime: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string | null;
  duration?: string | null;
  action?: 'view' | 'retry' | 'view-details' | null;
  actionLabel?: string | null;
}

interface MigrationStats {
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  warningCount: number;
  errorCount: number;
  averageProcessingTime: number;
}

/**
 * Custom hook for migration status stream
 */
export function useMigrationStatus(baseUrl: string = 'http://localhost:5209') {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource(`${baseUrl}/api/migration/events/status`);

    source.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('Connected to status stream:', data.clientId);
      setConnected(true);
      setError(null);
    });

    source.addEventListener('status-update', (event) => {
      const data: MigrationStatus = JSON.parse(event.data);
      setStatus(data);
    });

    source.addEventListener('heartbeat', (event) => {
      // Optional: log heartbeats
      console.debug('Heartbeat received');
    });

    source.onerror = (err) => {
      console.error('SSE Error:', err);
      setConnected(false);
      setError('Connection lost. Reconnecting...');
      // EventSource automatically reconnects
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [baseUrl]);

  return { status, connected, error };
}

/**
 * Custom hook for logs stream with filtering
 */
export function useMigrationLogs(baseUrl: string = 'http://localhost:5209') {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`${baseUrl}/api/migration/events/logs`);

    source.addEventListener('connected', () => {
      setConnected(true);
    });

    source.addEventListener('log-entry', (event) => {
      const log: LogEntry = JSON.parse(event.data);
      setLogs((prev) => [log, ...prev].slice(0, 100)); // Keep last 100 logs
    });

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
    };
  }, [baseUrl]);

  return { logs, connected };
}

/**
 * Custom hook for stats stream
 */
export function useMigrationStats(baseUrl: string = 'http://localhost:5209') {
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`${baseUrl}/api/migration/events/stats`);

    source.addEventListener('connected', () => {
      setConnected(true);
    });

    source.addEventListener('stats-update', (event) => {
      const data: MigrationStats = JSON.parse(event.data);
      setStats(data);
    });

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
    };
  }, [baseUrl]);

  return { stats, connected };
}
```

### Usage in React Component

```typescript
import React from 'react';
import { useMigrationStatus, useMigrationLogs, useMigrationStats } from './hooks';

export function MigrationDashboard() {
  const { status, connected: statusConnected } = useMigrationStatus();
  const { logs, connected: logsConnected } = useMigrationLogs();
  const { stats, connected: statsConnected } = useMigrationStats();

  if (!statusConnected) {
    return <div>Connecting to migration server...</div>;
  }

  return (
    <div className="migration-dashboard">
      {/* Status Panel */}
      <div className="status-panel">
        <h2>Migration Status: {status?.status}</h2>
        <div className="progress-bar">
          <div style={{ width: `${status?.progress}%` }} />
        </div>
        <p>Progress: {status?.progress.toFixed(1)}%</p>
        <p>Elapsed: {status?.elapsed} / Estimated: {status?.estimated}</p>
        <p>Next Task: {status?.nextTask}</p>
      </div>

      {/* Stats Panel */}
      <div className="stats-panel">
        <h2>Statistics</h2>
        <p>Processed: {stats?.processedRecords} / {stats?.totalRecords}</p>
        <p>Success: {stats?.successCount}</p>
        <p>Warnings: {stats?.warningCount}</p>
        <p>Errors: {stats?.errorCount}</p>
        <p>Avg Time: {stats?.averageProcessingTime.toFixed(2)}ms</p>
      </div>

      {/* Logs Panel */}
      <div className="logs-panel">
        <h2>Logs ({logs.length})</h2>
        {logs.map((log) => (
          <div key={log.id} className={`log-entry log-${log.level}`}>
            <span className="timestamp">{log.timestamp}</span>
            <span className="level">{log.level}</span>
            <span className="message">{log.message}</span>
            {log.action && (
              <button onClick={() => handleLogAction(log)}>
                {log.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Blazor C# Integration

### Blazor Server Setup

Blazor Server requires JavaScript interop to use the browser's `EventSource` API.

#### 1. Create JavaScript Module (`wwwroot/js/sse-client.js`)

```javascript
// SSE client for Blazor interop
let connections = {};

export function connectToStatusStream(url, dotnetRef) {
  const source = new EventSource(url);

  source.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    dotnetRef.invokeMethodAsync('OnConnected', data);
  });

  source.addEventListener('status-update', (event) => {
    const status = JSON.parse(event.data);
    dotnetRef.invokeMethodAsync('OnStatusUpdate', status);
  });

  source.addEventListener('heartbeat', (event) => {
    const data = JSON.parse(event.data);
    dotnetRef.invokeMethodAsync('OnHeartbeat', data);
  });

  source.onerror = (error) => {
    dotnetRef.invokeMethodAsync('OnError', error.type || 'error');
  };

  connections['status'] = source;
}

export function connectToLogsStream(url, dotnetRef) {
  const source = new EventSource(url);

  source.addEventListener('log-entry', (event) => {
    const log = JSON.parse(event.data);
    dotnetRef.invokeMethodAsync('OnLogEntry', log);
  });

  connections['logs'] = source;
}

export function connectToStatsStream(url, dotnetRef) {
  const source = new EventSource(url);

  source.addEventListener('stats-update', (event) => {
    const stats = JSON.parse(event.data);
    dotnetRef.invokeMethodAsync('OnStatsUpdate', stats);
  });

  connections['stats'] = source;
}

export function disconnectAll() {
  Object.values(connections).forEach(source => source.close());
  connections = {};
}
```

#### 2. Create Blazor Component (`Pages/MigrationDashboard.razor`)

```razor
@page "/migration"
@using Microsoft.JSInterop
@inject IJSRuntime JS
@implements IAsyncDisposable

<div class="migration-dashboard">
    <div class="status-panel">
        <h2>Migration Status: @(_status?.Status ?? "Unknown")</h2>
        <div class="progress-bar">
            <div style="width: @(_status?.Progress ?? 0)%"></div>
        </div>
        <p>Progress: @(_status?.Progress.ToString("F1") ?? "0.0")%</p>
        <p>Elapsed: @(_status?.Elapsed ?? "00:00:00") / Estimated: @(_status?.Estimated ?? "00:00:00")</p>
        <p>Next Task: @(_status?.NextTask ?? "N/A")</p>
        <p>Connection: @(_connected ? "Connected" : "Disconnected")</p>
    </div>

    <div class="stats-panel">
        <h2>Statistics</h2>
        <p>Processed: @(_stats?.ProcessedRecords ?? 0) / @(_stats?.TotalRecords ?? 0)</p>
        <p>Success: @(_stats?.SuccessCount ?? 0)</p>
        <p>Warnings: @(_stats?.WarningCount ?? 0)</p>
        <p>Errors: @(_stats?.ErrorCount ?? 0)</p>
        <p>Avg Time: @((_stats?.AverageProcessingTime ?? 0).ToString("F2"))ms</p>
    </div>

    <div class="logs-panel">
        <h2>Logs (@_logs.Count)</h2>
        @foreach (var log in _logs)
        {
            <div class="log-entry log-@log.Level">
                <span class="timestamp">@log.Timestamp</span>
                <span class="level">@log.Level</span>
                <span class="message">@log.Message</span>
                @if (!string.IsNullOrEmpty(log.ActionLabel))
                {
                    <button @onclick="() => HandleLogAction(log)">@log.ActionLabel</button>
                }
            </div>
        }
    </div>

    <div class="controls">
        <button @onclick="PauseMigration" disabled="@(!_connected || _status?.Status != "running")">Pause</button>
        <button @onclick="ResumeMigration" disabled="@(!_connected || _status?.Status != "paused")">Resume</button>
        <button @onclick="StopMigration" disabled="@(!_connected)">Stop</button>
        <button @onclick="RestartMigration" disabled="@(!_connected)">Restart</button>
    </div>
</div>

@code {
    private MigrationStatus? _status;
    private MigrationStats? _stats;
    private List<LogEntry> _logs = new();
    private bool _connected;
    private IJSObjectReference? _module;
    private DotNetObjectReference<MigrationDashboard>? _dotnetRef;

    protected override async Task OnInitializedAsync()
    {
        _module = await JS.InvokeAsync<IJSObjectReference>("import", "./js/sse-client.js");
        _dotnetRef = DotNetObjectReference.Create(this);

        // Connect to all three streams
        await _module.InvokeVoidAsync("connectToStatusStream",
            "http://localhost:5209/api/migration/events/status", _dotnetRef);
        await _module.InvokeVoidAsync("connectToLogsStream",
            "http://localhost:5209/api/migration/events/logs", _dotnetRef);
        await _module.InvokeVoidAsync("connectToStatsStream",
            "http://localhost:5209/api/migration/events/stats", _dotnetRef);
    }

    [JSInvokable]
    public void OnConnected(ConnectedEvent evt)
    {
        Console.WriteLine($"Connected to {evt.StreamType} stream: {evt.ClientId}");
        _connected = true;
        StateHasChanged();
    }

    [JSInvokable]
    public void OnStatusUpdate(MigrationStatus status)
    {
        _status = status;
        StateHasChanged();
    }

    [JSInvokable]
    public void OnLogEntry(LogEntry log)
    {
        _logs.Insert(0, log);
        if (_logs.Count > 100) _logs.RemoveAt(_logs.Count - 1);
        StateHasChanged();
    }

    [JSInvokable]
    public void OnStatsUpdate(MigrationStats stats)
    {
        _stats = stats;
        StateHasChanged();
    }

    [JSInvokable]
    public void OnHeartbeat(HeartbeatEvent evt)
    {
        Console.WriteLine($"Heartbeat: {evt.Timestamp}");
    }

    [JSInvokable]
    public void OnError(string error)
    {
        Console.Error.WriteLine($"SSE Error: {error}");
        _connected = false;
        StateHasChanged();
    }

    private async Task PauseMigration()
    {
        await PostCommand("pause");
    }

    private async Task ResumeMigration()
    {
        await PostCommand("resume");
    }

    private async Task StopMigration()
    {
        await PostCommand("stop");
    }

    private async Task RestartMigration()
    {
        await PostCommand("restart");
    }

    private async Task PostCommand(string command)
    {
        var client = new HttpClient();
        var response = await client.PostAsync($"http://localhost:5209/api/migration/{command}", null);
        if (!response.IsSuccessStatusCode)
        {
            Console.Error.WriteLine($"Command {command} failed: {response.StatusCode}");
        }
    }

    private void HandleLogAction(LogEntry log)
    {
        Console.WriteLine($"Action clicked for log {log.Id}: {log.Action}");
        // Implement action handling
    }

    public async ValueTask DisposeAsync()
    {
        if (_module != null)
        {
            await _module.InvokeVoidAsync("disconnectAll");
            await _module.DisposeAsync();
        }
        _dotnetRef?.Dispose();
    }

    // Model classes
    public record MigrationStatus(string Id, string Status, double Progress, string Elapsed,
        string Estimated, string NextTask, string LatestStatus, string StartTime);

    public record LogEntry(string Id, string Timestamp, string Level, string Message,
        string? Details, string? Duration, string? Action, string? ActionLabel);

    public record MigrationStats(int TotalRecords, int ProcessedRecords, int SuccessCount,
        int WarningCount, int ErrorCount, double AverageProcessingTime);

    public record ConnectedEvent(string Type, string ClientId, string StreamType, string Timestamp, string Message);

    public record HeartbeatEvent(string Timestamp);
}
```

---

## Command API Usage

### Commands Overview

All commands use HTTP POST and return immediately. State changes broadcast via SSE.

| Endpoint | Method | Purpose | Idempotent |
|----------|--------|---------|------------|
| `/api/migration/pause` | POST | Pause migration | Yes |
| `/api/migration/resume` | POST | Resume migration | Yes |
| `/api/migration/stop` | POST | Stop migration | No |
| `/api/migration/restart` | POST | Restart from beginning | No |

### JavaScript/Fetch Examples

```javascript
const baseUrl = 'http://localhost:5209';

async function pauseMigration() {
  try {
    const response = await fetch(`${baseUrl}/api/migration/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const result = await response.json();
    console.log('Migration paused:', result.message);
  } catch (error) {
    console.error('Failed to pause migration:', error);
  }
}

async function resumeMigration() {
  const response = await fetch(`${baseUrl}/api/migration/resume`, { method: 'POST' });
  const result = await response.json();
  console.log('Migration resumed:', result.message);
}

async function stopMigration() {
  if (!confirm('Stop migration? Progress will be lost unless checkpointing is enabled.')) {
    return;
  }
  const response = await fetch(`${baseUrl}/api/migration/stop`, { method: 'POST' });
  const result = await response.json();
  console.log('Migration stopped:', result.message);
}

async function restartMigration() {
  if (!confirm('Restart migration from beginning? All progress will be reset.')) {
    return;
  }
  const response = await fetch(`${baseUrl}/api/migration/restart`, { method: 'POST' });
  const result = await response.json();
  console.log('Migration restarted:', result.message);
}
```

### Axios Examples

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5209',
  timeout: 5000
});

async function executeCommand(command) {
  try {
    const response = await api.post(`/api/migration/${command}`);
    console.log(`Command ${command} succeeded:`, response.data.message);
    return true;
  } catch (error) {
    if (error.response) {
      // Server responded with error
      console.error(`Command ${command} failed:`, error.response.data.error);
    } else if (error.request) {
      // No response received
      console.error('Server not responding');
    } else {
      console.error('Request failed:', error.message);
    }
    return false;
  }
}

// Usage
await executeCommand('pause');
await executeCommand('resume');
await executeCommand('stop');
await executeCommand('restart');
```

---

## Error Handling & Reconnection

### EventSource Automatic Reconnection

The browser's `EventSource` API automatically handles reconnection with exponential backoff:

- **Initial retry**: ~3 seconds
- **Subsequent retries**: Exponential backoff
- **Maximum retry interval**: ~30 seconds
- **No manual intervention required**

### Detecting Connection State

```javascript
const source = new EventSource('http://localhost:5209/api/migration/events/status');

source.onopen = () => {
  console.log('Connection opened');
  updateConnectionStatus('connected');
};

source.onerror = (error) => {
  console.error('SSE Error:', error);

  if (source.readyState === EventSource.CONNECTING) {
    console.log('Reconnecting...');
    updateConnectionStatus('reconnecting');
  } else if (source.readyState === EventSource.CLOSED) {
    console.error('Connection closed permanently');
    updateConnectionStatus('disconnected');
  }
};
```

### Manual Reconnection Strategy

For advanced control, you can implement manual reconnection:

```typescript
class SseConnection {
  private source: EventSource | null = null;
  private url: string;
  private reconnectDelay: number = 3000;
  private maxReconnectDelay: number = 30000;
  private reconnectAttempts: number = 0;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.source = new EventSource(this.url);

    this.source.addEventListener('connected', () => {
      console.log('Connected successfully');
      this.reconnectDelay = 3000;
      this.reconnectAttempts = 0;
    });

    this.source.addEventListener('status-update', (event) => {
      const status = JSON.parse(event.data);
      this.onStatusUpdate(status);
    });

    this.source.onerror = () => {
      console.error('Connection error');
      this.reconnect();
    };
  }

  private reconnect() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
  }

  onStatusUpdate(status: MigrationStatus) {
    // Override this method
  }
}

// Usage
const connection = new SseConnection('http://localhost:5209/api/migration/events/status');
connection.onStatusUpdate = (status) => {
  console.log('Status update:', status);
};
connection.connect();
```

### Handling Server Errors

```javascript
async function sendCommand(command) {
  try {
    const response = await fetch(`http://localhost:5209/api/migration/${command}`, {
      method: 'POST'
    });

    if (!response.ok) {
      const errorData = await response.json();

      switch (response.status) {
        case 400:
          console.error('Bad request:', errorData.error);
          alert(`Cannot ${command}: ${errorData.error}`);
          break;
        case 500:
          console.error('Server error:', errorData.error);
          alert('Server error. Please try again or check server logs.');
          break;
        case 503:
          console.error('Service unavailable');
          alert('Migration service is currently unavailable. Please try again later.');
          break;
        default:
          console.error('Unexpected error:', response.status);
      }
      return false;
    }

    const result = await response.json();
    console.log('Success:', result.message);
    return true;

  } catch (error) {
    console.error('Network error:', error);
    alert('Cannot reach migration server. Check your connection.');
    return false;
  }
}
```

---

## Complete Examples

### Complete React Component

Production-ready React component with all features.

```typescript
import React, { useEffect, useState } from 'react';
import './MigrationDashboard.css';

interface MigrationStatus {
  id: string;
  status: 'running' | 'paused' | 'completed' | 'error' | 'stopped';
  progress: number;
  elapsed: string;
  estimated: string;
  nextTask: string;
  latestStatus: string;
  startTime: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: string | null;
  duration?: string | null;
  action?: 'view' | 'retry' | 'view-details' | null;
  actionLabel?: string | null;
}

interface MigrationStats {
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  warningCount: number;
  errorCount: number;
  averageProcessingTime: number;
}

const BASE_URL = 'http://localhost:5209';

export function MigrationDashboard() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [connected, setConnected] = useState({
    status: false,
    logs: false,
    stats: false
  });
  const [commandInProgress, setCommandInProgress] = useState(false);

  useEffect(() => {
    // Connect to status stream
    const statusSource = new EventSource(`${BASE_URL}/api/migration/events/status`);

    statusSource.addEventListener('connected', () => {
      setConnected(prev => ({ ...prev, status: true }));
    });

    statusSource.addEventListener('status-update', (event) => {
      const data: MigrationStatus = JSON.parse(event.data);
      setStatus(data);
    });

    statusSource.onerror = () => {
      setConnected(prev => ({ ...prev, status: false }));
    };

    // Connect to logs stream
    const logsSource = new EventSource(`${BASE_URL}/api/migration/events/logs`);

    logsSource.addEventListener('connected', () => {
      setConnected(prev => ({ ...prev, logs: true }));
    });

    logsSource.addEventListener('log-entry', (event) => {
      const log: LogEntry = JSON.parse(event.data);
      setLogs(prev => [log, ...prev].slice(0, 100));
    });

    logsSource.onerror = () => {
      setConnected(prev => ({ ...prev, logs: false }));
    };

    // Connect to stats stream
    const statsSource = new EventSource(`${BASE_URL}/api/migration/events/stats`);

    statsSource.addEventListener('connected', () => {
      setConnected(prev => ({ ...prev, stats: true }));
    });

    statsSource.addEventListener('stats-update', (event) => {
      const data: MigrationStats = JSON.parse(event.data);
      setStats(data);
    });

    statsSource.onerror = () => {
      setConnected(prev => ({ ...prev, stats: false }));
    };

    // Cleanup
    return () => {
      statusSource.close();
      logsSource.close();
      statsSource.close();
    };
  }, []);

  const executeCommand = async (command: string) => {
    setCommandInProgress(true);
    try {
      const response = await fetch(`${BASE_URL}/api/migration/${command}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Command failed: ${error.error}`);
        return;
      }

      const result = await response.json();
      console.log(`Command ${command} succeeded:`, result.message);
    } catch (error) {
      console.error('Command error:', error);
      alert('Failed to send command. Check server connection.');
    } finally {
      setCommandInProgress(false);
    }
  };

  const handleLogAction = (log: LogEntry) => {
    console.log('Log action:', log.action, log.id);
    // Implement action handling based on log.action
  };

  const allConnected = connected.status && connected.logs && connected.stats;

  return (
    <div className="migration-dashboard">
      <header>
        <h1>S6 Catalyst Migration Dashboard</h1>
        <div className="connection-status">
          Connection: {allConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Status Panel */}
        <section className="status-panel panel">
          <h2>Migration Status</h2>
          {status ? (
            <>
              <div className={`status-badge status-${status.status}`}>
                {status.status.toUpperCase()}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${status.progress}%` }}
                />
                <span className="progress-text">{status.progress.toFixed(1)}%</span>
              </div>
              <div className="status-details">
                <div className="detail-row">
                  <span className="label">Elapsed:</span>
                  <span className="value">{status.elapsed}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Estimated:</span>
                  <span className="value">{status.estimated}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Next Task:</span>
                  <span className="value">{status.nextTask}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Latest:</span>
                  <span className="value">{status.latestStatus}</span>
                </div>
              </div>
            </>
          ) : (
            <p>Waiting for status data...</p>
          )}
        </section>

        {/* Controls Panel */}
        <section className="controls-panel panel">
          <h2>Controls</h2>
          <div className="button-group">
            <button
              onClick={() => executeCommand('pause')}
              disabled={commandInProgress || !connected.status || status?.status !== 'running'}
              className="btn btn-warning"
            >
              ⏸ Pause
            </button>
            <button
              onClick={() => executeCommand('resume')}
              disabled={commandInProgress || !connected.status || status?.status !== 'paused'}
              className="btn btn-success"
            >
              ▶ Resume
            </button>
            <button
              onClick={() => {
                if (confirm('Stop migration? Progress may be lost.')) {
                  executeCommand('stop');
                }
              }}
              disabled={commandInProgress || !connected.status}
              className="btn btn-danger"
            >
              ⏹ Stop
            </button>
            <button
              onClick={() => {
                if (confirm('Restart migration from beginning?')) {
                  executeCommand('restart');
                }
              }}
              disabled={commandInProgress || !connected.status}
              className="btn btn-primary"
            >
              🔄 Restart
            </button>
          </div>
        </section>

        {/* Stats Panel */}
        <section className="stats-panel panel">
          <h2>Statistics</h2>
          {stats ? (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.processedRecords}</div>
                <div className="stat-label">Processed</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.totalRecords}</div>
                <div className="stat-label">Total</div>
              </div>
              <div className="stat-card stat-success">
                <div className="stat-value">{stats.successCount}</div>
                <div className="stat-label">Success</div>
              </div>
              <div className="stat-card stat-warning">
                <div className="stat-value">{stats.warningCount}</div>
                <div className="stat-label">Warnings</div>
              </div>
              <div className="stat-card stat-error">
                <div className="stat-value">{stats.errorCount}</div>
                <div className="stat-label">Errors</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.averageProcessingTime.toFixed(2)}ms</div>
                <div className="stat-label">Avg Time</div>
              </div>
            </div>
          ) : (
            <p>Waiting for statistics...</p>
          )}
        </section>

        {/* Logs Panel */}
        <section className="logs-panel panel">
          <h2>Logs ({logs.length})</h2>
          <div className="logs-container">
            {logs.length === 0 ? (
              <p>No logs yet...</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.level}`}>
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`log-level level-${log.level}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="log-message">{log.message}</span>
                  {log.duration && (
                    <span className="log-duration">{log.duration}</span>
                  )}
                  {log.action && (
                    <button
                      className="log-action"
                      onClick={() => handleLogAction(log)}
                    >
                      {log.actionLabel}
                    </button>
                  )}
                  {log.details && (
                    <div className="log-details">{log.details}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
```

---

## Testing with curl

### Testing SSE Connections

```bash
# Test status stream (use -N to disable buffering)
curl -N http://localhost:5209/api/migration/events/status

# Test logs stream
curl -N http://localhost:5209/api/migration/events/logs

# Test stats stream
curl -N http://localhost:5209/api/migration/events/stats

# Output format:
# event: connected
# data: {"type":"connection","clientId":"...","streamType":"status",...}
#
# event: status-update
# data: {"id":"...","status":"running","progress":45.2,...}
#
# event: heartbeat
# data: {"timestamp":"2026-02-04T14:30:30Z"}
```

### Testing Commands

```bash
# Pause migration
curl -X POST http://localhost:5209/api/migration/pause

# Resume migration
curl -X POST http://localhost:5209/api/migration/resume

# Stop migration
curl -X POST http://localhost:5209/api/migration/stop

# Restart migration
curl -X POST http://localhost:5209/api/migration/restart

# Expected success response:
# {"message":"Migration paused successfully","timestamp":"2026-02-04T14:30:00Z"}

# Expected error response (400):
# {"error":"Migration is not currently running","timestamp":"2026-02-04T14:30:00Z"}
```

### Testing Query Endpoints

```bash
# Get current status
curl http://localhost:5209/api/migration/status

# Get recent logs (default 100)
curl http://localhost:5209/api/migration/logs

# Get specific number of logs
curl http://localhost:5209/api/migration/logs?limit=10

# Get statistics
curl http://localhost:5209/api/migration/stats

# Get health status
curl http://localhost:5209/api/health

# Get API version
curl http://localhost:5209/api/version
```

### Testing Error Scenarios

```bash
# Test pause when not running (should return 400)
curl -X POST http://localhost:5209/api/migration/pause

# Test invalid limit parameter (should return 400)
curl http://localhost:5209/api/migration/logs?limit=9999999

# Test server unavailable (should timeout)
curl --max-time 5 http://localhost:9999/api/health
```

---

## Next Steps

1. **Read Event Schemas**: See [EVENT-SCHEMAS.md](EVENT-SCHEMAS.md) for complete JSON Schema definitions
2. **Run Tests**: See [TESTING-GUIDE.md](TESTING-GUIDE.md) for comprehensive testing scenarios
3. **Plan Enhancements**: See [FUTURE-ENHANCEMENTS.md](FUTURE-ENHANCEMENTS.md) for roadmap

---

## Support

For issues or questions:
- Check server logs in the migration tool console
- Verify SSE server is running on correct port (default: 5209)
- Test with curl to isolate client vs server issues
- Review browser console for JavaScript errors
- Check network tab in browser DevTools for SSE connection status

**Common Issues:**

| Issue | Solution |
|-------|----------|
| "Connection failed" | Verify server is running: `curl http://localhost:5209/api/health` |
| "CORS error" | SSE server allows all origins by default. Check browser console for details. |
| "No events received" | Check that migration is actually running. Use curl to verify events are sent. |
| "Frequent reconnections" | Check server logs for errors. Verify heartbeat messages are being sent. |
