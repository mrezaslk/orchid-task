# Architecture Documentation

## System Overview

The Task Board system is designed as a production-grade monorepo implementing a time-tracking feature on top of a Trello-like board. The architecture emphasizes:

1. **Clean separation of concerns**
2. **Scalability through stateless services**
3. **Data integrity via append-only event logs**
4. **Performance through strategic caching**

## High-Level Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│   Next.js    │────────▶│   NestJS    │
│             │◀────────│   Frontend   │◀────────│     API     │
└─────────────┘         └──────────────┘         └──────┬──────┘
                                                         │
                        ┌──────────────┐                │
                        │   BullMQ     │◀───────────────┤
                        │   Worker     │                │
                        └──────┬───────┘                │
                               │                        │
                        ┌──────▼────────────────────────▼──┐
                        │      PostgreSQL Database         │
                        └──────────────────────────────────┘
                               │
                        ┌──────▼───────┐
                        │    Redis     │
                        └──────────────┘
```

## Backend Architecture (NestJS)

### Layered Design

```
┌─────────────────────────────────────────────┐
│              Controllers                     │  ← HTTP layer
├─────────────────────────────────────────────┤
│               Services                       │  ← Business logic
├─────────────────────────────────────────────┤
│             Repositories                     │  ← Data access
├─────────────────────────────────────────────┤
│          Persistence (Prisma)               │  ← ORM
└─────────────────────────────────────────────┘
```

### Module Structure

#### Auth Module
- **Purpose**: JWT-based authentication
- **Components**:
  - `AuthController`: Login endpoint
  - `AuthService`: User validation, token generation
  - `JwtStrategy`: Passport strategy for token validation
  - `JwtAuthGuard`: Route protection

#### Boards Module
- **Purpose**: Board and column management
- **Components**:
  - `BoardsController`: REST endpoints
  - `BoardsService`: Business logic + caching
  - `BoardsRepository`: Database queries
- **Caching**: 30s TTL on board reads

#### Tasks Module
- **Purpose**: Task CRUD and movement
- **Components**:
  - `TasksController`: REST endpoints
  - `TasksService`: Task operations + cache invalidation
  - `TasksRepository`: Transactional task updates
- **Key Feature**: Creates StatusEvent on every move

#### Analytics Module
- **Purpose**: Time tracking aggregation & queries
- **Components**:
  - `AnalyticsController`: Query endpoint
  - `AnalyticsService`: Read aggregated stats
  - `AnalyticsRepository`: Complex event queries
  - `AggregatorService`: Core aggregation logic
  - `AggregatorProcessor`: BullMQ job handler
  - `worker.ts`: Standalone worker process

### Time Tracking Implementation

#### Data Flow

```
1. User drags task
   ↓
2. Frontend calls PATCH /tasks/:id/move
   ↓
3. TasksRepository starts transaction:
   - Update task.columnId
   - Insert StatusEvent
   ↓
4. Transaction commits
   ↓
5. Cache invalidated
   ↓
6. Frontend refetches → sees enteredAt
   ↓
7. Live timer shows elapsed time
   ↓
8. Worker aggregates hourly
   ↓
9. DailyUserSectionStat updated
```

#### Aggregation Algorithm

```typescript
For each date:
  1. Fetch all StatusEvents for date
  2. Group by taskId
  3. For each task:
     a. Build ordered list of all events (including before/after date)
     b. Calculate intervals:
        - start = event.at (or startOfDay if before)
        - end = nextEvent.at (or endOfDay if none)
        - only include if overlaps target date
     c. Sum seconds per (userId, columnId)
  4. Upsert DailyUserSectionStat (idempotent)
```

**Why Idempotent?**
- Can safely re-run for any date
- Handles late-arriving events
- Supports backfilling historical data

#### StatusEvent Schema

```prisma
model StatusEvent {
  id           String
  taskId       String
  userId       String
  fromColumnId String?   // null if task creation
  toColumnId   String
  at           DateTime
}
```

This append-only log enables:
- Complete task history
- Accurate time calculations
- Audit trail
- Event sourcing patterns

## Frontend Architecture (Next.js)

### App Router Structure

```
app/
├── page.tsx              → Root redirect
├── login/page.tsx        → Authentication
├── board/[boardId]/
│   └── page.tsx          → Main board view
├── layout.tsx            → Root layout
└── globals.css           → Tailwind styles
```

### Component Hierarchy

```
Board (client)
├── DndContext (dnd-kit)
│   ├── Column (droppable)
│   │   └── SortableContext
│   │       └── TaskCard[] (draggable)
│   │           └── LiveTimer (if In Progress)
│   └── DragOverlay
```

### State Management

- **Authentication**: Local state + localStorage
- **Board Data**: SWR with 5s polling
- **Drag & Drop**: dnd-kit local state
- **Live Timers**: Component-level setInterval

### API Communication

```typescript
// Centralized API client
class ApiClient {
  - setToken()
  - getToken()
  - request<T>()
  - login()
  - getBoard()
  - getTasks()
  - moveTask()
  - getDailyStats()
}
```

### Live Timer Implementation

```typescript
useEffect(() => {
  const updateElapsed = () => {
    const start = new Date(task.enteredAt).getTime();
    const now = Date.now();
    setElapsed(Math.floor((now - start) / 1000));
  };
  
  updateElapsed();
  const interval = setInterval(updateElapsed, 1000);
  
  return () => clearInterval(interval);
}, [task.enteredAt]);
```

## Database Design

### Schema Relationships

```
User ──< Task (assignee)
     └──< StatusEvent (actor)
     └──< DailyUserSectionStat

Board ──< Column
      └──< Task

Column ──< Task
       └──< StatusEvent (from/to)
       └──< DailyUserSectionStat

Task ──< StatusEvent
```

### Indexes

Critical for performance:

```sql
-- StatusEvent
CREATE INDEX ON status_events(task_id, at);
CREATE INDEX ON status_events(user_id, at);
CREATE INDEX ON status_events(to_column_id);

-- DailyUserSectionStat
CREATE UNIQUE INDEX ON daily_user_section_stats(user_id, column_id, date);
CREATE INDEX ON daily_user_section_stats(date);
```

## Caching Strategy

### Cache Layers

1. **Redis (Application Level)**
   - Board data: 30s TTL
   - Task lists: 30s TTL
   - Invalidated on mutations

2. **SWR (Client Level)**
   - 5s refresh interval
   - Stale-while-revalidate
   - Optimistic updates

### Cache Keys

```
cache:GET:/boards/:id
cache:GET:/tasks?boardId=:id
```

## Background Jobs (BullMQ)

### Queue Configuration

```typescript
Queue: 'analytics'
Connection: Redis
Jobs:
  - aggregate-hourly (cron: '0 * * * *')
  - aggregate-eod (cron: '59 23 * * *')
```

### Worker Deployment

- Separate process from API
- Same codebase, different entry point
- Scales independently
- Graceful shutdown on SIGINT

## Security

### Authentication
- JWT with 7-day expiry
- Bearer token in Authorization header
- Tokens stored in localStorage (demo) or httpOnly cookies (production)

### Authorization
- `@UseGuards(JwtAuthGuard)` on all protected routes
- User ID extracted from JWT payload
- Row-level security via userId filters

### Input Validation
- `class-validator` DTOs on backend
- Zod schemas on frontend
- Prisma type safety

## Error Handling

### Backend
- Global exception filter
- Prisma exception mapping
- Structured error responses

### Frontend
- Try-catch in API calls
- Error states in UI
- Optimistic update rollback

## Monitoring & Observability

### Logging
- Structured logging in services
- Request/response logging
- Worker job logging

### Health Checks
- Database connection
- Redis connection
- Worker queue health

### Metrics (Suggested)
- API response times
- Task movement frequency
- Aggregation job duration
- Cache hit rates

## Scalability Patterns

### Horizontal Scaling

**API Servers**
- Stateless design
- Load balance with nginx/ALB
- Shared Redis/Postgres

**Workers**
- Multiple instances process same queue
- BullMQ handles distribution
- Idempotent jobs prevent duplicates

### Vertical Optimizations

**Database**
- Connection pooling
- Read replicas for analytics
- Partition StatusEvents by date

**Cache**
- Redis Cluster for high throughput
- Separate cache for sessions

### Performance

**N+1 Prevention**
- Prisma includes for relations
- Batch queries where possible

**Pagination**
- Implement cursor-based for large lists
- Limit default result sizes

## Deployment Architecture

### Containers

```yaml
services:
  - web (Next.js)
  - api (NestJS)
  - worker (BullMQ)
  - db (PostgreSQL)
  - redis (Redis)
```

### Environment Promotion

```
Development → Staging → Production

Each environment:
- Separate databases
- Separate Redis
- Same codebase
- Environment-specific configs
```

## Trade-offs & Decisions

### Append-Only Events
**Pro**: Complete history, audit trail, event sourcing
**Con**: Storage grows over time
**Mitigation**: Archive old events, partition by date

### Aggregation Timing
**Pro**: Pre-computed stats are fast to query
**Con**: Near-real-time delay (up to 1 hour)
**Mitigation**: Compute on-demand for "today"

### Client-Side Timer
**Pro**: Real-time updates, no polling needed
**Con**: Inaccurate if tab backgrounded
**Mitigation**: Revalidate on focus, server as source of truth

### Redis Caching
**Pro**: Reduced database load, faster responses
**Con**: Cache invalidation complexity
**Mitigation**: Short TTL, aggressive invalidation on writes

## Future Enhancements

1. **Real-time Updates**: WebSocket for live collaboration
2. **Advanced Analytics**: Dashboards, charts, trends
3. **Permissions**: Role-based access control
4. **Audit Logs**: Comprehensive activity tracking
5. **Multi-board**: User can create/manage multiple boards
6. **Search**: Full-text search across tasks
7. **Attachments**: File uploads on tasks
8. **Comments**: Discussion threads on tasks

