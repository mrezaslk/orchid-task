# Time Tracking Feature - Technical Deep Dive

## Overview

The standout feature of this task board is **per-user time tracking per column per day**. This document explains how it works in detail.

## User Story

> As a team member, I want to see how long tasks spend in each column (especially "In Progress") so we can identify bottlenecks and improve our workflow.

## Feature Breakdown

### 1. Real-Time Timer (Frontend)

When a task is in the "In Progress" column, a live timer displays elapsed time.

**Implementation:**

```tsx
// TaskCard.tsx
const [elapsed, setElapsed] = useState(0);

useEffect(() => {
  if (!showTimer) return;

  const updateElapsed = () => {
    const start = new Date(task.enteredAt).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - start) / 1000);
    setElapsed(seconds);
  };

  updateElapsed();
  const interval = setInterval(updateElapsed, 1000);

  return () => clearInterval(interval);
}, [task.enteredAt, showTimer]);
```

**Data Source:**
- `task.enteredAt`: Timestamp from the latest StatusEvent when task entered current column

**Display:**
```
🟢 2h 34m 12s
```

### 2. Event Logging (Backend)

Every task movement creates an immutable `StatusEvent` record.

**Schema:**

```prisma
model StatusEvent {
  id           String
  taskId       String
  userId       String
  fromColumnId String?   // null for initial placement
  toColumnId   String
  at           DateTime  // Timestamp
}
```

**When Created:**
1. Task creation → Initial event (fromColumnId = null)
2. Task moved → Movement event (both from/to populated)

**Example Events:**

```json
// Task created in "To Do"
{
  "id": "evt1",
  "taskId": "task1",
  "userId": "user1",
  "fromColumnId": null,
  "toColumnId": "col-todo",
  "at": "2024-01-15T09:00:00Z"
}

// Task moved to "In Progress"
{
  "id": "evt2",
  "taskId": "task1",
  "userId": "user1",
  "fromColumnId": "col-todo",
  "toColumnId": "col-in-progress",
  "at": "2024-01-15T10:30:00Z"
}

// Task moved to "Done"
{
  "id": "evt3",
  "taskId": "task1",
  "userId": "user1",
  "fromColumnId": "col-in-progress",
  "toColumnId": "col-done",
  "at": "2024-01-15T14:45:00Z"
}
```

### 3. Aggregation (Background Worker)

A BullMQ worker runs on a schedule to compute daily statistics.

**Schedule:**
- **Hourly**: `0 * * * *` (every hour)
- **End of Day**: `59 23 * * *` (11:59 PM)

**Algorithm:**

```typescript
async aggregateDate(date: string) {
  // 1. Define day boundaries
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 2. Fetch all events that touch this day
  const events = await getStatusEventsForDate(date);

  // 3. Group by task
  const eventsByTask = groupBy(events, 'taskId');

  // 4. Calculate intervals
  const intervals = [];
  
  for (const [taskId, taskEvents] of eventsByTask) {
    // Get complete event history for timeline
    const allEvents = await getAllEventsForTask(taskId, endOfDay);
    
    for (let i = 0; i < allEvents.length; i++) {
      const currentEvent = allEvents[i];
      const nextEvent = allEvents[i + 1];
      
      // Determine interval bounds
      const start = max(currentEvent.at, startOfDay);
      const end = nextEvent 
        ? min(nextEvent.at, endOfDay)
        : endOfDay;
      
      // Only count if overlaps target date
      if (start < endOfDay && end > startOfDay) {
        intervals.push({
          userId: currentEvent.userId,
          columnId: currentEvent.toColumnId,
          start: start,
          end: end,
          seconds: (end - start) / 1000
        });
      }
    }
  }

  // 5. Aggregate by (user, column)
  const stats = new Map();
  
  for (const interval of intervals) {
    const key = `${interval.userId}:${interval.columnId}`;
    stats.set(key, (stats.get(key) || 0) + interval.seconds);
  }

  // 6. Upsert into database (idempotent)
  for (const [key, seconds] of stats) {
    const [userId, columnId] = key.split(':');
    await upsertDailyStat({
      userId,
      columnId,
      date,
      secondsSpent: Math.floor(seconds)
    });
  }
}
```

**Example Timeline:**

```
Date: 2024-01-15

Task 1 Events:
├─ 09:00 → To Do
├─ 10:30 → In Progress
└─ 14:45 → Done

Intervals for 2024-01-15:
├─ To Do:        09:00 - 10:30 = 1.5 hours (5400s)
├─ In Progress:  10:30 - 14:45 = 4.25 hours (15300s)
└─ Done:         14:45 - 23:59 = 9.23 hours (33240s)

Aggregated Stats:
├─ user1 + col-todo: 5400s
├─ user1 + col-in-progress: 15300s
└─ user1 + col-done: 33240s
```

### 4. Querying Analytics

**Endpoint:** `GET /api/analytics/daily`

**Query Parameters:**
- `startDate` (optional): YYYY-MM-DD
- `endDate` (optional): YYYY-MM-DD
- `userId` (optional): Filter by user
- `columnId` (optional): Filter by column

**Example Request:**

```bash
curl http://localhost:8000/api/analytics/daily?startDate=2024-01-01&endDate=2024-01-31
```

**Example Response:**

```json
[
  {
    "id": "stat1",
    "userId": "user1",
    "columnId": "col-in-progress",
    "date": "2024-01-15",
    "secondsSpent": 15300,
    "computedAt": "2024-01-15T23:59:05Z",
    "user": {
      "id": "user1",
      "email": "user@example.com"
    },
    "column": {
      "id": "col-in-progress",
      "name": "In Progress"
    }
  }
]
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TaskCard Component                                   │   │
│  │ - Fetches task.enteredAt from API                   │   │
│  │ - Runs setInterval(updateTimer, 1000)               │   │
│  │ - Displays: "🟢 2h 34m 12s"                         │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      NESTJS API                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PATCH /tasks/:id/move                                │   │
│  │ ────────────────────────────────────────────────────│   │
│  │ 1. BEGIN TRANSACTION                                 │   │
│  │ 2. UPDATE tasks SET columnId = $1 WHERE id = $2     │   │
│  │ 3. INSERT INTO status_events (...)                  │   │
│  │ 4. COMMIT                                            │   │
│  │ 5. Invalidate Redis cache                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ GET /tasks?boardId=:id                               │   │
│  │ ────────────────────────────────────────────────────│   │
│  │ 1. Check Redis cache                                 │   │
│  │ 2. SELECT * FROM tasks WHERE boardId = $1           │   │
│  │ 3. For each task:                                    │   │
│  │    SELECT at FROM status_events                      │   │
│  │    WHERE taskId = $1 ORDER BY at DESC LIMIT 1       │   │
│  │ 4. Return tasks with enteredAt                      │   │
│  │ 5. Cache in Redis (30s TTL)                         │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   BULLMQ WORKER                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Scheduled Job: Hourly + 11:59 PM                    │   │
│  │ ────────────────────────────────────────────────────│   │
│  │ 1. SELECT * FROM status_events                       │   │
│  │    WHERE at BETWEEN $startOfDay AND $endOfDay       │   │
│  │                                                      │   │
│  │ 2. Build timeline per task                          │   │
│  │    - Order events chronologically                   │   │
│  │    - Calculate interval durations                   │   │
│  │                                                      │   │
│  │ 3. Aggregate by (userId, columnId, date)           │   │
│  │                                                      │   │
│  │ 4. UPSERT INTO daily_user_section_stats             │   │
│  │    ON CONFLICT (userId, columnId, date)             │   │
│  │    DO UPDATE SET secondsSpent = $1                  │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     POSTGRESQL                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ status_events   │  │ tasks           │  │ daily_...   │ │
│  │ (append-only)   │  │ (current state) │  │ (aggregates)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Edge Cases Handled

### 1. Task Moved Multiple Times in One Day

**Scenario:**
```
09:00 → To Do
10:00 → In Progress
11:00 → To Do (moved back)
14:00 → In Progress (moved again)
16:00 → Done
```

**Result:**
- To Do: 1h + 3h = 4h
- In Progress: 1h + 2h = 3h
- Done: 7h 59m

### 2. Task Still In Progress at End of Day

**Scenario:**
```
14:00 → In Progress
(no further moves)
```

**Result:**
- In Progress: 14:00 - 23:59 = 9h 59m

### 3. Task Moved Across Day Boundary

**Scenario:**
```
Day 1, 22:00 → In Progress
Day 2, 02:00 → Done
```

**Result:**
- Day 1, In Progress: 22:00 - 23:59 = 1h 59m
- Day 2, In Progress: 00:00 - 02:00 = 2h
- Day 2, Done: 02:00 - 23:59 = 21h 59m

### 4. Multiple Users Working on Same Task

**Scenario:**
```
User A moves task to "In Progress" at 09:00
User B moves task to "Done" at 14:00
```

**Result:**
- User A, In Progress: 0s (they didn't move it out)
- User B, Done: 0s (they moved it in, but not out yet)

**Note:** Currently, we track who moved the task, not who worked on it. For "assignee-based" tracking, we'd need to modify the logic to use `task.assigneeId` instead of `event.userId`.

## Performance Considerations

### Indexes

Critical indexes for performance:

```sql
-- Fast lookups of task history
CREATE INDEX idx_status_events_task_at 
ON status_events(task_id, at);

-- Fast user activity queries
CREATE INDEX idx_status_events_user_at 
ON status_events(user_id, at);

-- Fast column queries
CREATE INDEX idx_status_events_to_column 
ON status_events(to_column_id);

-- Fast stat queries
CREATE UNIQUE INDEX idx_daily_stats_unique 
ON daily_user_section_stats(user_id, column_id, date);

CREATE INDEX idx_daily_stats_date 
ON daily_user_section_stats(date);
```

### Query Optimization

1. **Batch Processing**: Worker processes all tasks for a day in one query
2. **Connection Pooling**: Prisma manages connections efficiently
3. **Aggregation**: Pre-computed stats mean fast analytics queries
4. **Caching**: Redis caches task lists to reduce DB load

### Scalability

**Current Design:**
- StatusEvents table grows linearly with task movements
- Aggregation processes one day at a time

**For Large Scale:**
1. **Partition StatusEvents by date** (PostgreSQL partitioning)
2. **Archive old events** to cold storage after aggregation
3. **Shard by user** or **by board** for horizontal scaling
4. **Use read replicas** for analytics queries

## Future Enhancements

### 1. Assignee-Based Tracking

Track time by who's assigned, not who moved the card:

```typescript
// Instead of event.userId, use:
const assigneeId = await getTaskAssigneeAtTime(taskId, event.at);
```

### 2. Active Time Tracking

Only count time when user is active (mouse/keyboard events):

```typescript
// Frontend sends "heartbeat" every 30s
POST /tasks/:id/heartbeat

// Backend tracks last heartbeat per user per task
// Worker only counts intervals with recent heartbeats
```

### 3. Multi-User Collaboration

Track multiple users working on same task simultaneously:

```typescript
// New table: task_sessions
// Records when users "start" and "stop" working on a task
```

### 4. Real-Time Analytics

Push updates to dashboard via WebSocket:

```typescript
// On task move
socket.emit('task-moved', {
  taskId,
  userId,
  fromColumn,
  toColumn,
  timestamp
});

// Dashboard updates live chart
```

## Testing the Feature

### Manual Test

1. Start the system
2. Login and open board
3. Drag task to "In Progress"
4. Watch the live timer tick up
5. Wait 1-2 hours (or adjust system clock for testing)
6. Run worker manually: `cd apps/backend && pnpm worker:dev`
7. Query analytics: `GET /api/analytics/daily?date=2024-01-15`
8. Verify seconds match expected duration

### Automated Test

```typescript
describe('Time Tracking', () => {
  it('should track time spent in column', async () => {
    // Create task in "To Do"
    const task = await createTask({ columnId: 'col-todo' });
    
    // Move to "In Progress"
    const t1 = new Date();
    await moveTask(task.id, 'col-in-progress');
    
    // Wait 2 seconds
    await sleep(2000);
    
    // Move to "Done"
    const t2 = new Date();
    await moveTask(task.id, 'col-done');
    
    // Run aggregation
    await aggregatorService.aggregateToday();
    
    // Check stats
    const stats = await getDailyStats({ 
      userId: user.id,
      columnId: 'col-in-progress',
      date: today
    });
    
    expect(stats.secondsSpent).toBeGreaterThanOrEqual(2);
  });
});
```

## Summary

The time tracking feature demonstrates:

1. **Event Sourcing**: Append-only log as source of truth
2. **Separation of Concerns**: Real-time display vs. historical aggregation
3. **Idempotency**: Safe to re-run aggregations
4. **Scalability**: Background processing keeps API fast
5. **Data Integrity**: Transactions ensure consistency

This pattern can be extended to track many other metrics:
- Cycle time per task
- Lead time from creation to done
- User velocity
- Column bottlenecks
- Sprint burndown

The foundation is flexible and production-ready! 🚀

