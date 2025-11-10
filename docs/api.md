# API Documentation

Base URL: `http://localhost:8000/api`

Interactive documentation: `http://localhost:8000/docs` (Swagger UI)

## Authentication

All endpoints except `/auth/login` require Bearer token authentication.

```
Authorization: Bearer <jwt_token>
```

---

## Auth

### POST /auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx...",
    "email": "user@example.com"
  }
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials

---

### GET /auth/me

Get current authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "clx...",
  "email": "user@example.com",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Errors:**
- `401 Unauthorized`: Invalid or missing token

---

## Boards

### GET /boards

Get all boards.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "default-board",
    "name": "My Task Board",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "columns": [
      {
        "id": "col-todo",
        "name": "To Do",
        "position": 0
      },
      {
        "id": "col-in-progress",
        "name": "In Progress",
        "position": 1
      },
      {
        "id": "col-done",
        "name": "Done",
        "position": 2
      }
    ]
  }
]
```

---

### GET /boards/:boardId

Get a specific board with its columns.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "default-board",
  "name": "My Task Board",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "columns": [
    {
      "id": "col-todo",
      "boardId": "default-board",
      "name": "To Do",
      "position": 0
    },
    {
      "id": "col-in-progress",
      "boardId": "default-board",
      "name": "In Progress",
      "position": 1
    },
    {
      "id": "col-done",
      "boardId": "default-board",
      "name": "Done",
      "position": 2
    }
  ]
}
```

**Errors:**
- `404 Not Found`: Board doesn't exist

---

## Tasks

### GET /tasks?boardId=:boardId

Get all tasks for a board.

**Query Parameters:**
- `boardId` (required): Board ID

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "task-1",
    "boardId": "default-board",
    "columnId": "col-in-progress",
    "title": "Implement authentication",
    "description": "Add JWT authentication with login endpoint",
    "assigneeId": "clx...",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "enteredAt": "2024-01-15T10:30:00.000Z",
    "column": {
      "id": "col-in-progress",
      "name": "In Progress"
    },
    "assignee": {
      "id": "clx...",
      "email": "user@example.com"
    }
  }
]
```

**Notes:**
- `enteredAt`: Timestamp when task entered current column (for live timer)

---

### POST /tasks

Create a new task.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "boardId": "default-board",
  "columnId": "col-todo",
  "title": "New Task",
  "description": "Task description (optional)",
  "assigneeId": "clx..." // optional, defaults to current user
}
```

**Response:** `201 Created`
```json
{
  "id": "task-4",
  "boardId": "default-board",
  "columnId": "col-todo",
  "title": "New Task",
  "description": "Task description",
  "assigneeId": "clx...",
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z",
  "enteredAt": "2024-01-15T11:00:00.000Z",
  "column": {
    "id": "col-todo",
    "name": "To Do"
  },
  "assignee": {
    "id": "clx...",
    "email": "user@example.com"
  }
}
```

**Errors:**
- `400 Bad Request`: Invalid input
- `404 Not Found`: Board or column doesn't exist

---

### PATCH /tasks/:taskId/move

Move a task to a different column.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "toColumnId": "col-in-progress"
}
```

**Response:** `200 OK`
```json
{
  "id": "task-4",
  "boardId": "default-board",
  "columnId": "col-in-progress",
  "title": "New Task",
  "description": "Task description",
  "assigneeId": "clx...",
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": "2024-01-15T11:05:00.000Z",
  "enteredAt": "2024-01-15T11:05:00.000Z",
  "column": {
    "id": "col-in-progress",
    "name": "In Progress"
  },
  "assignee": {
    "id": "clx...",
    "email": "user@example.com"
  }
}
```

**Side Effects:**
- Creates a `StatusEvent` record
- Invalidates board and task caches
- Updates `enteredAt` timestamp

**Errors:**
- `404 Not Found`: Task or column doesn't exist

---

## Analytics

### GET /analytics/daily

Get daily time tracking statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` (optional): YYYY-MM-DD format
- `endDate` (optional): YYYY-MM-DD format
- `userId` (optional): Filter by user
- `columnId` (optional): Filter by column

**Example:**
```
GET /analytics/daily?startDate=2024-01-01&endDate=2024-01-31
```

**Response:** `200 OK`
```json
[
  {
    "id": "stat-1",
    "userId": "clx...",
    "columnId": "col-in-progress",
    "date": "2024-01-15",
    "secondsSpent": 7200,
    "computedAt": "2024-01-15T23:59:05.000Z",
    "user": {
      "id": "clx...",
      "email": "user@example.com"
    },
    "column": {
      "id": "col-in-progress",
      "name": "In Progress"
    }
  },
  {
    "id": "stat-2",
    "userId": "clx...",
    "columnId": "col-done",
    "date": "2024-01-15",
    "secondsSpent": 3600,
    "computedAt": "2024-01-15T23:59:05.000Z",
    "user": {
      "id": "clx...",
      "email": "user@example.com"
    },
    "column": {
      "id": "col-done",
      "name": "Done"
    }
  }
]
```

**Notes:**
- `secondsSpent`: Total seconds user spent in that column on that date
- Stats are computed by background worker (hourly + end of day)
- Results ordered by date DESC, then seconds DESC

**Errors:**
- `400 Bad Request`: Invalid date format

---

## Error Responses

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message or array of validation errors",
  "error": "Bad Request"
}
```

### Common Status Codes

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input or request
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `409 Conflict`: Unique constraint violation
- `500 Internal Server Error`: Server error

---

## Rate Limiting

**Not implemented in demo**, but production should include:

```
Rate Limit: 100 requests per minute per IP
Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1705320000
```

---

## Pagination

**Not implemented in demo**, but production should include:

```
GET /tasks?boardId=:id&cursor=:cursor&limit=50

Response:
{
  "data": [...],
  "pagination": {
    "nextCursor": "clx...",
    "hasMore": true
  }
}
```

---

## WebSockets (Future Enhancement)

For real-time updates:

```
ws://localhost:8000/ws

Events:
  - task.created
  - task.updated
  - task.moved
  - column.updated
```

---

## Swagger UI

For interactive testing, visit: `http://localhost:8000/docs`

Features:
- Try out API calls directly
- View request/response schemas
- Bearer token authentication
- Auto-generated from decorators

