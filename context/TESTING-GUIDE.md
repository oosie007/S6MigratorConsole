# S6 Catalyst Migration Dashboard - Testing Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-04

## Table of Contents

1. [Overview](#overview)
2. [Testing Prerequisites](#testing-prerequisites)
3. [SSE Connection Tests](#sse-connection-tests)
4. [Command API Tests](#command-api-tests)
5. [Query API Tests](#query-api-tests)
6. [Error Scenario Tests](#error-scenario-tests)
7. [Performance Tests](#performance-tests)
8. [Integration Test Scenarios](#integration-test-scenarios)
9. [Automated Testing](#automated-testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides comprehensive testing scenarios for the S6 Catalyst Migration Dashboard API. All tests can be executed manually using curl or automated using test frameworks.

**Testing Goals:**
- Verify all SSE streams work correctly
- Ensure commands execute and broadcast state changes
- Validate error handling and reconnection
- Confirm concurrent connections work
- Test edge cases and failure scenarios

**Test Environment:**
- Server: `http://localhost:5209` (default)
- Tools: curl, browser DevTools, JavaScript test runners
- Expected state: Migration tool running

---

## Testing Prerequisites

### 1. Start the Migration Tool

```bash
cd S6CatalystMigration
dotnet run
```

Expected output:
```
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: http://localhost:5209
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

### 2. Verify Server Health

```bash
curl http://localhost:5209/api/health
```

Expected response (200 OK):
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

### 3. Check API Version

```bash
curl http://localhost:5209/api/version
```

Expected response (200 OK):
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

## SSE Connection Tests

### Test 1.1: Status Stream Connection

**Objective:** Verify status stream connects and receives events.

```bash
curl -N http://localhost:5209/api/migration/events/status
```

**Expected Output:**
```
event: connected
data: {"type":"connection","clientId":"abc-123-def-456","streamType":"status","timestamp":"2026-02-04T14:30:00Z","message":"Connected to status stream"}

event: status-update
data: {"id":"550e8400-e29b-41d4-a716-446655440000","status":"running","progress":45.2,"elapsed":"00:15:32","estimated":"00:34:28","nextTask":"Processing batch 12 of 25","latestStatus":"Migrating policy ABC-123456","startTime":"2026-02-04T14:00:00Z"}

event: heartbeat
data: {"timestamp":"2026-02-04T14:30:30Z"}

event: status-update
data: {"id":"550e8400-e29b-41d4-a716-446655440000","status":"running","progress":45.5,"elapsed":"00:15:35","estimated":"00:34:25",...}
```

**Validation:**
- ✅ First event is `connected` with unique `clientId`
- ✅ Second event is `status-update` with current migration state
- ✅ Heartbeat events arrive every ~30 seconds
- ✅ Status updates arrive as migration progresses
- ✅ Connection stays open (curl doesn't exit)

**Note:** Press Ctrl+C to stop curl.

---

### Test 1.2: Logs Stream Connection

**Objective:** Verify logs stream connects and receives log entries.

```bash
curl -N http://localhost:5209/api/migration/events/logs
```

**Expected Output:**
```
event: connected
data: {"type":"connection","clientId":"xyz-789-uvw-012","streamType":"logs","timestamp":"2026-02-04T14:31:00Z","message":"Connected to logs stream"}

event: log-entry
data: {"id":"log-001","timestamp":"2026-02-04T14:31:05Z","level":"success","message":"Policy ABC-123456 migrated successfully","details":null,"duration":"00:00:02.345","action":"view","actionLabel":"View Details"}

event: log-entry
data: {"id":"log-002","timestamp":"2026-02-04T14:31:07Z","level":"warning","message":"Policy DEF-789012 has missing coverage data","details":"Coverage code XYZ not found in reference data","duration":"00:00:01.123","action":"retry","actionLabel":"Retry Migration"}

event: heartbeat
data: {"timestamp":"2026-02-04T14:31:30Z"}
```

**Validation:**
- ✅ First event is `connected`
- ✅ Log entries arrive as they occur
- ✅ All log levels appear (success, warning, error, info)
- ✅ Heartbeat events arrive every ~30 seconds

---

### Test 1.3: Stats Stream Connection

**Objective:** Verify stats stream connects and receives statistics updates.

```bash
curl -N http://localhost:5209/api/migration/events/stats
```

**Expected Output:**
```
event: connected
data: {"type":"connection","clientId":"def-456-ghi-789","streamType":"stats","timestamp":"2026-02-04T14:32:00Z","message":"Connected to stats stream"}

event: stats-update
data: {"totalRecords":1000,"processedRecords":452,"successCount":420,"warningCount":25,"errorCount":7,"averageProcessingTime":2345.67}

event: stats-update
data: {"totalRecords":1000,"processedRecords":455,"successCount":423,"warningCount":25,"errorCount":7,"averageProcessingTime":2340.12}

event: heartbeat
data: {"timestamp":"2026-02-04T14:32:30Z"}
```

**Validation:**
- ✅ First event is `connected`
- ✅ Stats updates arrive periodically (typically every 1-5 seconds during migration)
- ✅ Counters increase monotonically
- ✅ `processedRecords = successCount + warningCount + errorCount`
- ✅ Heartbeat events arrive every ~30 seconds

---

### Test 1.4: Multiple Concurrent Connections

**Objective:** Verify multiple clients can connect simultaneously.

**Terminal 1:**
```bash
curl -N http://localhost:5209/api/migration/events/status
```

**Terminal 2:**
```bash
curl -N http://localhost:5209/api/migration/events/logs
```

**Terminal 3:**
```bash
curl -N http://localhost:5209/api/migration/events/stats
```

**Terminal 4 (verify health):**
```bash
curl http://localhost:5209/api/health
```

**Expected Health Response:**
```json
{
  "status": "healthy",
  "connections": {
    "status": 1,
    "logs": 1,
    "stats": 1,
    "total": 3
  },
  ...
}
```

**Validation:**
- ✅ All three connections receive events simultaneously
- ✅ Health endpoint reports correct connection counts
- ✅ Each client receives unique `clientId`
- ✅ No performance degradation with multiple connections

---

### Test 1.5: JavaScript EventSource Connection

**Objective:** Test browser-native EventSource API.

Create `test-sse.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>SSE Connection Test</title>
</head>
<body>
  <h1>SSE Connection Test</h1>
  <div id="status">Connecting...</div>
  <div id="events"></div>

  <script>
    const statusSource = new EventSource('http://localhost:5209/api/migration/events/status');
    const eventsDiv = document.getElementById('events');
    const statusDiv = document.getElementById('status');

    statusSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      statusDiv.textContent = `Connected: ${data.clientId}`;
      eventsDiv.innerHTML += `<p><strong>Connected:</strong> ${data.message}</p>`;
    });

    statusSource.addEventListener('status-update', (event) => {
      const status = JSON.parse(event.data);
      eventsDiv.innerHTML += `<p><strong>Status:</strong> ${status.status} - Progress: ${status.progress}%</p>`;
    });

    statusSource.addEventListener('heartbeat', (event) => {
      const data = JSON.parse(event.data);
      eventsDiv.innerHTML += `<p><em>Heartbeat: ${data.timestamp}</em></p>`;
    });

    statusSource.onerror = (error) => {
      console.error('SSE Error:', error);
      statusDiv.textContent = 'Connection Error (reconnecting...)';
    };
  </script>
</body>
</html>
```

**Test Steps:**
1. Open `test-sse.html` in browser
2. Open browser DevTools → Network tab
3. Filter by "EventStream" or "text/event-stream"

**Expected Results:**
- ✅ Status shows "Connected: {clientId}"
- ✅ Events appear in the page
- ✅ Network tab shows persistent connection to status stream
- ✅ No errors in console

---

## Command API Tests

### Test 2.1: Pause Migration

**Objective:** Test pause command and verify state change broadcast.

**Step 1: Subscribe to status stream (Terminal 1)**
```bash
curl -N http://localhost:5209/api/migration/events/status
```

**Step 2: Send pause command (Terminal 2)**
```bash
curl -X POST http://localhost:5209/api/migration/pause
```

**Expected Command Response (200 OK):**
```json
{
  "message": "Migration paused successfully",
  "timestamp": "2026-02-04T14:33:00Z"
}
```

**Expected SSE Event (Terminal 1):**
```
event: status-update
data: {"id":"550e8400-e29b-41d4-a716-446655440000","status":"paused","progress":45.2,"elapsed":"00:15:32","estimated":"00:34:28","nextTask":"Paused at batch 12 of 25","latestStatus":"Migration paused by user","startTime":"2026-02-04T14:00:00Z"}
```

**Validation:**
- ✅ Command returns 200 OK with success message
- ✅ Status update event broadcasts immediately with `status: "paused"`
- ✅ Progress percentage remains unchanged
- ✅ Elapsed time stops increasing

---

### Test 2.2: Resume Migration

**Objective:** Test resume command after pause.

**Prerequisite:** Migration is paused (run Test 2.1 first).

**Step 1: Subscribe to status stream (Terminal 1)**
```bash
curl -N http://localhost:5209/api/migration/events/status
```

**Step 2: Send resume command (Terminal 2)**
```bash
curl -X POST http://localhost:5209/api/migration/resume
```

**Expected Command Response (200 OK):**
```json
{
  "message": "Migration resumed successfully",
  "timestamp": "2026-02-04T14:34:00Z"
}
```

**Expected SSE Event (Terminal 1):**
```
event: status-update
data: {"id":"550e8400-e29b-41d4-a716-446655440000","status":"running","progress":45.2,"elapsed":"00:15:32","estimated":"00:34:28","nextTask":"Processing batch 12 of 25","latestStatus":"Migration resumed","startTime":"2026-02-04T14:00:00Z"}
```

**Validation:**
- ✅ Command returns 200 OK
- ✅ Status update event broadcasts with `status: "running"`
- ✅ Progress resumes from where it was paused
- ✅ Elapsed time starts increasing again

---

### Test 2.3: Stop Migration

**Objective:** Test stop command (destructive operation).

**Warning:** This stops the migration completely. Progress may be lost.

**Step 1: Subscribe to status stream (Terminal 1)**
```bash
curl -N http://localhost:5209/api/migration/events/status
```

**Step 2: Send stop command (Terminal 2)**
```bash
curl -X POST http://localhost:5209/api/migration/stop
```

**Expected Command Response (200 OK):**
```json
{
  "message": "Migration stopped successfully",
  "timestamp": "2026-02-04T14:35:00Z"
}
```

**Expected SSE Event (Terminal 1):**
```
event: status-update
data: {"id":"550e8400-e29b-41d4-a716-446655440000","status":"stopped","progress":45.2,"elapsed":"00:15:32","estimated":"00:34:28","nextTask":"Migration stopped","latestStatus":"Migration stopped by user","startTime":"2026-02-04T14:00:00Z"}
```

**Validation:**
- ✅ Command returns 200 OK
- ✅ Status update event broadcasts with `status: "stopped"`
- ✅ Migration process terminates
- ✅ Cannot resume stopped migration (must restart)

---

### Test 2.4: Restart Migration

**Objective:** Test restart command (resets progress).

**Warning:** This restarts migration from beginning. All progress is lost.

**Step 1: Subscribe to status stream (Terminal 1)**
```bash
curl -N http://localhost:5209/api/migration/events/status
```

**Step 2: Send restart command (Terminal 2)**
```bash
curl -X POST http://localhost:5209/api/migration/restart
```

**Expected Command Response (200 OK):**
```json
{
  "message": "Migration restarted successfully",
  "timestamp": "2026-02-04T14:36:00Z"
}
```

**Expected SSE Event (Terminal 1):**
```
event: status-update
data: {"id":"NEW-SESSION-ID-HERE","status":"running","progress":0,"elapsed":"00:00:00","estimated":"00:35:00","nextTask":"Starting migration","latestStatus":"Migration restarted","startTime":"2026-02-04T14:36:00Z"}
```

**Validation:**
- ✅ Command returns 200 OK
- ✅ Status update event broadcasts with new session ID
- ✅ Progress resets to 0
- ✅ Elapsed time resets to 00:00:00
- ✅ New `startTime` timestamp

---

### Test 2.5: Idempotent Commands

**Objective:** Verify commands are idempotent (safe to repeat).

**Test 2.5a: Pause Already Paused Migration**
```bash
# Pause first time
curl -X POST http://localhost:5209/api/migration/pause
# Pause second time (should succeed)
curl -X POST http://localhost:5209/api/migration/pause
```

**Expected:** Both requests return 200 OK.

**Test 2.5b: Resume Already Running Migration**
```bash
# Ensure migration is running
curl -X POST http://localhost:5209/api/migration/resume
# Resume again (should succeed)
curl -X POST http://localhost:5209/api/migration/resume
```

**Expected:** Both requests return 200 OK.

**Validation:**
- ✅ Pause command on already-paused migration returns 200 OK
- ✅ Resume command on already-running migration returns 200 OK
- ✅ No duplicate SSE events broadcast

---

## Query API Tests

### Test 3.1: Get Current Status

**Objective:** Query current migration status.

```bash
curl http://localhost:5209/api/migration/status
```

**Expected Response (200 OK):**
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

**Validation:**
- ✅ Returns 200 OK
- ✅ Response matches `MigrationStatus` schema
- ✅ Data matches current SSE stream state
- ✅ Progress is between 0-100

---

### Test 3.2: Get Recent Logs (Default Limit)

**Objective:** Query recent log entries with default limit (100).

```bash
curl http://localhost:5209/api/migration/logs
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "log-001",
    "timestamp": "2026-02-04T14:30:00Z",
    "level": "success",
    "message": "Policy ABC-123456 migrated successfully",
    "details": null,
    "duration": "00:00:02.345",
    "action": "view",
    "actionLabel": "View Details"
  },
  {
    "id": "log-002",
    "timestamp": "2026-02-04T14:29:58Z",
    "level": "warning",
    "message": "Policy DEF-789012 has missing coverage data",
    "details": "Coverage code XYZ not found in reference data",
    "duration": "00:00:01.123",
    "action": "retry",
    "actionLabel": "Retry Migration"
  }
]
```

**Validation:**
- ✅ Returns 200 OK
- ✅ Returns array of log entries
- ✅ Logs are in reverse chronological order (newest first)
- ✅ Each entry matches `LogEntry` schema
- ✅ Maximum 100 entries returned

---

### Test 3.3: Get Limited Logs

**Objective:** Query specific number of log entries.

```bash
# Get last 10 logs
curl http://localhost:5209/api/migration/logs?limit=10

# Get last 500 logs
curl http://localhost:5209/api/migration/logs?limit=500
```

**Expected Response (200 OK):**
```json
[
  { "id": "log-001", ... },
  { "id": "log-002", ... },
  ...
]
```

**Validation:**
- ✅ Returns 200 OK
- ✅ Number of entries ≤ requested limit
- ✅ Logs are in reverse chronological order

---

### Test 3.4: Get Migration Statistics

**Objective:** Query current migration statistics.

```bash
curl http://localhost:5209/api/migration/stats
```

**Expected Response (200 OK):**
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

**Validation:**
- ✅ Returns 200 OK
- ✅ Response matches `MigrationStats` schema
- ✅ `processedRecords ≤ totalRecords`
- ✅ `successCount + warningCount + errorCount = processedRecords`
- ✅ `averageProcessingTime ≥ 0`

---

## Error Scenario Tests

### Test 4.1: Invalid Command State

**Objective:** Test commands in invalid states.

**Test 4.1a: Pause Non-Running Migration**
```bash
# First, stop the migration
curl -X POST http://localhost:5209/api/migration/stop

# Try to pause (should fail)
curl -X POST http://localhost:5209/api/migration/pause
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Migration is not currently running",
  "timestamp": "2026-02-04T14:40:00Z"
}
```

**Test 4.1b: Resume Non-Paused Migration**
```bash
# Ensure migration is running
curl -X POST http://localhost:5209/api/migration/restart

# Try to resume (should succeed but do nothing - idempotent)
curl -X POST http://localhost:5209/api/migration/resume
```

**Expected Response (200 OK):**
```json
{
  "message": "Migration resumed successfully",
  "timestamp": "2026-02-04T14:41:00Z"
}
```

**Validation:**
- ✅ Pause on non-running migration returns 400 Bad Request
- ✅ Resume on running migration returns 200 OK (idempotent)

---

### Test 4.2: Invalid Query Parameters

**Objective:** Test query endpoints with invalid parameters.

**Test 4.2a: Invalid Limit (Too Large)**
```bash
curl http://localhost:5209/api/migration/logs?limit=999999999
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Limit must be between 1 and 1000",
  "timestamp": "2026-02-04T14:42:00Z"
}
```

**Test 4.2b: Invalid Limit (Negative)**
```bash
curl http://localhost:5209/api/migration/logs?limit=-10
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Limit must be between 1 and 1000",
  "timestamp": "2026-02-04T14:42:00Z"
}
```

**Test 4.2c: Invalid Limit (Non-Numeric)**
```bash
curl http://localhost:5209/api/migration/logs?limit=abc
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Invalid limit parameter",
  "timestamp": "2026-02-04T14:42:00Z"
}
```

**Validation:**
- ✅ Invalid limit values return 400 Bad Request
- ✅ Error message describes the problem
- ✅ Error response includes timestamp

---

### Test 4.3: Server Unavailable

**Objective:** Test client behavior when server is down.

**Step 1: Stop the migration tool server**
```bash
# Press Ctrl+C in the terminal running the migration tool
```

**Step 2: Try to connect**
```bash
curl http://localhost:5209/api/health
```

**Expected Result:**
```
curl: (7) Failed to connect to localhost port 5209 after 0 ms: Connection refused
```

**Test 4.3a: JavaScript EventSource Reconnection**

Create `test-reconnection.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Reconnection Test</title>
</head>
<body>
  <h1>SSE Reconnection Test</h1>
  <div id="status">Connecting...</div>
  <div id="events"></div>

  <script>
    const source = new EventSource('http://localhost:5209/api/migration/events/status');
    const statusDiv = document.getElementById('status');
    const eventsDiv = document.getElementById('events');

    source.onopen = () => {
      statusDiv.textContent = 'Connected';
      statusDiv.style.color = 'green';
    };

    source.onerror = (error) => {
      console.error('SSE Error:', error);
      if (source.readyState === EventSource.CONNECTING) {
        statusDiv.textContent = 'Reconnecting...';
        statusDiv.style.color = 'orange';
      } else if (source.readyState === EventSource.CLOSED) {
        statusDiv.textContent = 'Connection Closed';
        statusDiv.style.color = 'red';
      }
    };

    source.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      eventsDiv.innerHTML += `<p>Connected: ${data.clientId} at ${data.timestamp}</p>`;
    });
  </script>
</body>
</html>
```

**Test Steps:**
1. Start server and open `test-reconnection.html`
2. Verify status shows "Connected" (green)
3. Stop server (Ctrl+C in migration tool terminal)
4. Observe status changes to "Reconnecting..." (orange)
5. Restart server (`dotnet run`)
6. Observe status changes back to "Connected" (green)
7. Check events div for new connection with new timestamp

**Validation:**
- ✅ EventSource automatically reconnects
- ✅ Reconnection attempts continue until server is back
- ✅ New `connected` event received after reconnection
- ✅ No manual intervention required

---

### Test 4.4: Network Timeout

**Objective:** Test timeout handling.

```bash
# Set short timeout
curl --max-time 5 http://localhost:5209/api/migration/status
```

**Expected Result (if server is responsive):**
- Returns 200 OK within 5 seconds

**Expected Result (if server is unresponsive):**
```
curl: (28) Operation timed out after 5000 milliseconds
```

---

## Performance Tests

### Test 5.1: Concurrent SSE Connections

**Objective:** Test server with many concurrent SSE connections.

**Script: `test-concurrent-sse.sh`**

```bash
#!/bin/bash

# Start 50 concurrent SSE connections
for i in {1..50}; do
  curl -N http://localhost:5209/api/migration/events/status > /dev/null 2>&1 &
  curl -N http://localhost:5209/api/migration/events/logs > /dev/null 2>&1 &
  curl -N http://localhost:5209/api/migration/events/stats > /dev/null 2>&1 &
done

echo "Started 150 concurrent connections"

# Check health
sleep 2
curl http://localhost:5209/api/health | jq '.connections'

# Keep connections alive for 60 seconds
sleep 60

# Kill all background curl processes
killall curl
```

**Expected Health Response:**
```json
{
  "status": 50,
  "logs": 50,
  "stats": 50,
  "total": 150
}
```

**Validation:**
- ✅ Server accepts all 150 connections
- ✅ Health endpoint reports correct counts
- ✅ All connections receive events
- ✅ Server CPU/memory usage remains reasonable
- ✅ No connection drops or errors

---

### Test 5.2: Rapid Command Execution

**Objective:** Test server handles rapid command requests.

**Script: `test-rapid-commands.sh`**

```bash
#!/bin/bash

# Send 100 pause/resume commands in rapid succession
for i in {1..50}; do
  curl -X POST http://localhost:5209/api/migration/pause -s > /dev/null &
  curl -X POST http://localhost:5209/api/migration/resume -s > /dev/null &
done

wait

echo "Sent 100 commands"

# Check final state
curl http://localhost:5209/api/migration/status | jq '.status'
```

**Expected Result:**
- All commands return 200 OK
- Final state is either "running" or "paused" (consistent)
- No 500 errors or race conditions

**Validation:**
- ✅ Server handles concurrent command requests
- ✅ Final state is consistent
- ✅ No internal server errors
- ✅ SSE clients receive all state changes

---

### Test 5.3: High-Frequency SSE Events

**Objective:** Test client handles high-frequency events.

**JavaScript Test: `test-high-frequency.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <title>High Frequency Event Test</title>
</head>
<body>
  <h1>High Frequency Event Test</h1>
  <div id="stats">
    <p>Events received: <span id="count">0</span></p>
    <p>Events per second: <span id="rate">0</span></p>
    <p>Memory usage: <span id="memory">0</span> MB</p>
  </div>

  <script>
    let eventCount = 0;
    let startTime = Date.now();

    const logsSource = new EventSource('http://localhost:5209/api/migration/events/logs');

    logsSource.addEventListener('log-entry', (event) => {
      eventCount++;

      // Update counters every second
      if (eventCount % 10 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (eventCount / elapsed).toFixed(2);

        document.getElementById('count').textContent = eventCount;
        document.getElementById('rate').textContent = rate;

        if (performance.memory) {
          const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
          document.getElementById('memory').textContent = memoryMB;
        }
      }
    });

    logsSource.onerror = (error) => {
      console.error('SSE Error:', error);
    };
  </script>
</body>
</html>
```

**Test Steps:**
1. Open `test-high-frequency.html` during active migration
2. Let run for 5+ minutes
3. Monitor event rate and memory usage

**Expected Results:**
- Event rate: 1-10 events/second (depends on migration speed)
- Memory usage: Should remain stable (no memory leaks)
- No browser lag or UI freezing

**Validation:**
- ✅ Client handles events without lag
- ✅ Memory usage stays stable (no leaks)
- ✅ UI remains responsive

---

## Integration Test Scenarios

### Scenario 6.1: Complete Migration Lifecycle

**Objective:** Test entire migration from start to finish.

**Steps:**

1. **Start Migration**
   ```bash
   curl -X POST http://localhost:5209/api/migration/restart
   ```

2. **Monitor Progress**
   ```bash
   # Terminal 1: Watch status
   curl -N http://localhost:5209/api/migration/events/status | grep --line-buffered "progress"

   # Terminal 2: Watch logs
   curl -N http://localhost:5209/api/migration/events/logs

   # Terminal 3: Watch stats
   curl -N http://localhost:5209/api/migration/events/stats
   ```

3. **Pause at 50%**
   ```bash
   # Wait for progress to reach ~50%
   curl -X POST http://localhost:5209/api/migration/pause
   ```

4. **Verify Paused State**
   ```bash
   curl http://localhost:5209/api/migration/status | jq '.status'
   # Should return: "paused"
   ```

5. **Resume Migration**
   ```bash
   curl -X POST http://localhost:5209/api/migration/resume
   ```

6. **Wait for Completion**
   ```bash
   # Monitor until progress reaches 100%
   curl -N http://localhost:5209/api/migration/events/status | grep --line-buffered "completed"
   ```

7. **Verify Final State**
   ```bash
   curl http://localhost:5209/api/migration/status | jq '.status, .progress'
   # Should return: "completed" and 100

   curl http://localhost:5209/api/migration/stats | jq '.processedRecords, .totalRecords'
   # processedRecords should equal totalRecords
   ```

**Validation:**
- ✅ Migration progresses from 0% to 100%
- ✅ Pause/resume work correctly
- ✅ All SSE events broadcast properly
- ✅ Final statistics are accurate

---

### Scenario 6.2: Dashboard Reconnection After Network Failure

**Objective:** Test dashboard behavior after network interruption.

**Setup:**

Create `test-reconnection-dashboard.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard Reconnection Test</title>
  <style>
    .connected { color: green; }
    .disconnected { color: red; }
    .reconnecting { color: orange; }
  </style>
</head>
<body>
  <h1>Dashboard Reconnection Test</h1>

  <div id="connection-status" class="connecting">Connecting...</div>

  <h2>Status</h2>
  <div id="status">Waiting for data...</div>

  <h2>Connection Events</h2>
  <ul id="connection-log"></ul>

  <h2>Recent Logs</h2>
  <ul id="logs"></ul>

  <script>
    const statusDiv = document.getElementById('status');
    const connectionStatus = document.getElementById('connection-status');
    const connectionLog = document.getElementById('connection-log');
    const logsDiv = document.getElementById('logs');

    let statusSource = null;
    let logsSource = null;
    let reconnectAttempts = 0;

    function logConnection(message) {
      const li = document.createElement('li');
      li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      connectionLog.insertBefore(li, connectionLog.firstChild);
    }

    function connectToStatus() {
      statusSource = new EventSource('http://localhost:5209/api/migration/events/status');

      statusSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        connectionStatus.textContent = 'Connected';
        connectionStatus.className = 'connected';
        logConnection(`Connected to status stream: ${data.clientId}`);
        reconnectAttempts = 0;
      });

      statusSource.addEventListener('status-update', (event) => {
        const status = JSON.parse(event.data);
        statusDiv.innerHTML = `
          <p><strong>Status:</strong> ${status.status}</p>
          <p><strong>Progress:</strong> ${status.progress.toFixed(1)}%</p>
          <p><strong>Elapsed:</strong> ${status.elapsed}</p>
          <p><strong>Next Task:</strong> ${status.nextTask}</p>
        `;
      });

      statusSource.onerror = (error) => {
        reconnectAttempts++;
        connectionStatus.textContent = `Reconnecting (attempt ${reconnectAttempts})...`;
        connectionStatus.className = 'reconnecting';
        logConnection(`Connection error (attempt ${reconnectAttempts})`);
      };
    }

    function connectToLogs() {
      logsSource = new EventSource('http://localhost:5209/api/migration/events/logs');

      logsSource.addEventListener('log-entry', (event) => {
        const log = JSON.parse(event.data);
        const li = document.createElement('li');
        li.innerHTML = `<strong>[${log.level}]</strong> ${log.message}`;
        logsDiv.insertBefore(li, logsDiv.firstChild);
        if (logsDiv.children.length > 10) {
          logsDiv.removeChild(logsDiv.lastChild);
        }
      });
    }

    // Connect on page load
    connectToStatus();
    connectToLogs();
  </script>
</body>
</html>
```

**Test Steps:**

1. Open `test-reconnection-dashboard.html`
2. Verify dashboard shows "Connected" and displays data
3. **Simulate network failure**: Stop migration tool server (Ctrl+C)
4. Observe:
   - Connection status changes to "Reconnecting..."
   - Reconnection attempts increase
5. **Restore network**: Restart migration tool server (`dotnet run`)
6. Observe:
   - Connection status changes to "Connected"
   - Dashboard resumes displaying current data
   - New `clientId` assigned (new connection)

**Validation:**
- ✅ Dashboard detects connection loss
- ✅ Automatic reconnection attempts
- ✅ Successfully reconnects when server returns
- ✅ Dashboard displays latest data after reconnection
- ✅ No manual refresh required

---

### Scenario 6.3: Error Recovery Flow

**Objective:** Test dashboard handling of error logs and retries.

**Steps:**

1. **Connect to logs stream**
   ```bash
   curl -N http://localhost:5209/api/migration/events/logs
   ```

2. **Wait for error log entry**
   ```
   event: log-entry
   data: {"id":"log-error-001","timestamp":"2026-02-04T15:00:00Z","level":"error","message":"Policy XYZ-999999 migration failed","details":"Database connection timeout","duration":"00:00:05.678","action":"retry","actionLabel":"Retry Migration"}
   ```

3. **Query logs to get error details**
   ```bash
   curl http://localhost:5209/api/migration/logs | jq '.[] | select(.level=="error")'
   ```

4. **Verify error count in stats**
   ```bash
   curl http://localhost:5209/api/migration/stats | jq '.errorCount'
   ```

5. **Check final statistics**
   ```bash
   # After migration completes
   curl http://localhost:5209/api/migration/stats | jq '.'
   ```

**Expected Results:**
- Error logs appear in real-time via SSE
- Error logs have `action: "retry"` or `action: "view-details"`
- Error count in stats increases
- Final stats show total errors: `errorCount > 0`

**Validation:**
- ✅ Error logs broadcast immediately
- ✅ Action buttons provided for errors
- ✅ Error count accurate in statistics
- ✅ Migration continues after errors (doesn't crash)

---

## Automated Testing

### Unit Tests (C# - Backend)

**File: `SseServerTests.cs`**

```csharp
using Xunit;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;

public class SseServerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SseServerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/health");

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"status\":\"healthy\"", content);
    }

    [Fact]
    public async Task StatusEndpoint_ReturnsValidJson()
    {
        // Act
        var response = await _client.GetAsync("/api/migration/status");

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("\"status\":", content);
        Assert.Contains("\"progress\":", content);
    }

    [Fact]
    public async Task PauseCommand_ReturnsOk()
    {
        // Act
        var response = await _client.PostAsync("/api/migration/pause", null);

        // Assert
        Assert.True(response.IsSuccessStatusCode || response.StatusCode == System.Net.HttpStatusCode.BadRequest);
    }
}
```

**Run tests:**
```bash
dotnet test
```

---

### Integration Tests (JavaScript - Frontend)

**File: `sse-integration.test.js`**

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const BASE_URL = 'http://localhost:5209';

describe('SSE Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Ensure server is running
    const response = await fetch(`${BASE_URL}/api/health`);
    expect(response.ok).toBe(true);
  });

  it('should connect to status stream', (done) => {
    const source = new EventSource(`${BASE_URL}/api/migration/events/status`);

    source.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      expect(data.type).toBe('connection');
      expect(data.streamType).toBe('status');
      source.close();
      done();
    });

    source.onerror = (error) => {
      source.close();
      done(error);
    };
  }, 10000);

  it('should receive status updates', (done) => {
    const source = new EventSource(`${BASE_URL}/api/migration/events/status`);

    source.addEventListener('status-update', (event) => {
      const status = JSON.parse(event.data);
      expect(status).toHaveProperty('id');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('progress');
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
      source.close();
      done();
    });

    source.onerror = (error) => {
      source.close();
      done(error);
    };
  }, 15000);

  it('should pause and resume migration', async () => {
    // Pause
    const pauseResponse = await fetch(`${BASE_URL}/api/migration/pause`, { method: 'POST' });
    expect(pauseResponse.ok).toBe(true);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Resume
    const resumeResponse = await fetch(`${BASE_URL}/api/migration/resume`, { method: 'POST' });
    expect(resumeResponse.ok).toBe(true);
  }, 10000);

  it('should query current status', async () => {
    const response = await fetch(`${BASE_URL}/api/migration/status`);
    expect(response.ok).toBe(true);

    const status = await response.json();
    expect(status).toHaveProperty('id');
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('progress');
  });

  it('should query logs with limit', async () => {
    const response = await fetch(`${BASE_URL}/api/migration/logs?limit=10`);
    expect(response.ok).toBe(true);

    const logs = await response.json();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeLessThanOrEqual(10);
  });

  it('should query statistics', async () => {
    const response = await fetch(`${BASE_URL}/api/migration/stats`);
    expect(response.ok).toBe(true);

    const stats = await response.json();
    expect(stats).toHaveProperty('totalRecords');
    expect(stats).toHaveProperty('processedRecords');
    expect(stats).toHaveProperty('successCount');
    expect(stats.processedRecords).toBeLessThanOrEqual(stats.totalRecords);
  });
});
```

**Run tests:**
```bash
npm test
```

---

## Troubleshooting

### Issue 1: "Connection refused"

**Symptoms:** curl returns "Connection refused" or "Failed to connect"

**Causes:**
- Migration tool server not running
- Wrong port number
- Firewall blocking connection

**Solutions:**
1. Verify server is running: `netstat -an | grep 5209` (Linux/Mac) or `netstat -an | findstr 5209` (Windows)
2. Check server logs for errors
3. Verify port in `appsettings.json`
4. Try different port: Update `appsettings.json` and restart server

---

### Issue 2: No SSE events received

**Symptoms:** curl connects but no events appear

**Causes:**
- Migration not running
- Server not broadcasting events
- Client not using `-N` flag with curl

**Solutions:**
1. Check migration status: `curl http://localhost:5209/api/migration/status`
2. Verify migration is running (not paused/stopped)
3. Use `-N` flag with curl: `curl -N http://localhost:5209/api/migration/events/status`
4. Check server logs for errors

---

### Issue 3: Frequent reconnections

**Symptoms:** EventSource constantly disconnects and reconnects

**Causes:**
- Server heartbeat not being sent
- Network instability
- Server crashing/restarting

**Solutions:**
1. Check server logs for errors or crashes
2. Verify heartbeat interval in server configuration (should be 30s)
3. Test network stability: `ping localhost`
4. Monitor server resource usage (CPU/memory)

---

### Issue 4: Commands return 400 errors

**Symptoms:** Pause/resume commands fail with 400 Bad Request

**Causes:**
- Migration not in correct state for command
- Migration not initialized

**Solutions:**
1. Check current state: `curl http://localhost:5209/api/migration/status`
2. Restart migration if needed: `curl -X POST http://localhost:5209/api/migration/restart`
3. Read error message in response for specific issue

---

### Issue 5: CORS errors in browser

**Symptoms:** Browser console shows CORS policy errors

**Causes:**
- Server CORS not configured (should be enabled by default in MVP)
- Browser security restrictions

**Solutions:**
1. Verify server CORS configuration allows all origins (MVP default)
2. Check browser console for specific CORS error
3. Try different browser
4. For testing, disable browser security (NOT for production):
   ```bash
   # Chrome (Windows)
   chrome.exe --disable-web-security --user-data-dir="C:\temp\chrome-dev"
   ```

---

## Next Steps

1. **Review Event Schemas**: See [EVENT-SCHEMAS.md](EVENT-SCHEMAS.md) for detailed validation rules
2. **Integration Guide**: See [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md) for code examples
3. **Future Enhancements**: See [FUTURE-ENHANCEMENTS.md](FUTURE-ENHANCEMENTS.md) for roadmap

---

## Test Checklist

Use this checklist to verify complete API functionality:

- [ ] Health endpoint responds
- [ ] Version endpoint responds
- [ ] Status stream connects and receives events
- [ ] Logs stream connects and receives events
- [ ] Stats stream connects and receives events
- [ ] Multiple concurrent connections work
- [ ] Pause command works and broadcasts state change
- [ ] Resume command works and broadcasts state change
- [ ] Stop command works and broadcasts state change
- [ ] Restart command works and broadcasts state change
- [ ] Status query returns valid data
- [ ] Logs query returns valid data
- [ ] Stats query returns valid data
- [ ] Invalid parameters return 400 errors
- [ ] EventSource auto-reconnects after disconnection
- [ ] Heartbeats arrive every ~30 seconds
- [ ] Error logs appear in logs stream
- [ ] Statistics counters are accurate
- [ ] Complete migration lifecycle works end-to-end

**All tests passing?** You're ready to integrate the dashboard!
