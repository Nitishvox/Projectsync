# Momentum SyncConnect API Documentation

Complete REST API specification for the SyncConnect / Momentum backend services running at [`server.ts`](file:///d:/sync_connect/server.ts).

---

## Table of Contents

1. [Overview & Base URL](#overview--base-url)
2. [Authentication & Authorization](#authentication--authorization)
3. [Common Data Models](#common-data-models)
   - [Project Schema](#project-schema)
   - [Task Schema](#task-schema)
   - [AuditLog Schema](#auditlog-schema)
   - [DashboardStats Schema](#dashboardstats-schema)
   - [Pagination Schema](#pagination-schema)
   - [Standard Error Format](#standard-error-format)
4. [Authentication Endpoints](#authentication-endpoints)
   - [POST /api/auth/register](#post-apiauthregister)
   - [POST /api/auth/login](#post-apiauthlogin)
   - [POST /api/auth/logout](#post-apiauthlogout)
   - [GET /api/auth/profile](#get-apiauthprofile)
5. [Project Endpoints](#project-endpoints)
   - [GET /api/projects](#get-apiprojects)
   - [GET /api/projects/:id](#get-apiprojectsid)
   - [POST /api/projects](#post-apiprojects)
   - [PUT /api/projects/:id](#put-apiprojectsid)
   - [DELETE /api/projects/:id](#delete-apiprojectsid)
6. [Task Endpoints](#task-endpoints)
   - [GET /api/tasks](#get-apitasks)
   - [GET /api/tasks/:id](#get-apitasksid)
   - [POST /api/tasks](#post-apitasks)
   - [PUT /api/tasks/:id](#put-apitasksid)
   - [DELETE /api/tasks/:id](#delete-apitasksid)
7. [Dashboard Endpoints](#dashboard-endpoints)
   - [GET /api/dashboard](#get-apidashboard)
8. [Audit Log Endpoints](#audit-log-endpoints)
   - [GET /api/audit-logs](#get-apiaudit-logs)
9. [Health & System Endpoints](#health--system-endpoints)
   - [GET /api/health](#get-apihealth)

---

## Overview & Base URL

All endpoints are relative to the server host:

```http
http://localhost:3000/api
```

- **Content-Type**: `application/json` (for all mutation requests with a body)
- **Accept**: `application/json`
- **Rate Limiting**: Auth endpoints (`/api/auth/register`, `/api/auth/login`) enforce an IP-based window limit of 15 requests per minute.

---

## Authentication & Authorization

All protected endpoints require a JSON Web Token (JWT) supplied via the HTTP `Authorization` header using the `Bearer` scheme:

```http
Authorization: Bearer <jwt_token>
```

Tokens are obtained by authenticating against [`POST /api/auth/login`](#post-apiauthlogin) or after registration. Requests lacking a valid token to protected endpoints return `401 Unauthorized`.

---

## Common Data Models

The models below reflect TypeScript interfaces declared in [`src/types.ts`](file:///d:/sync_connect/src/types.ts) and the database schema.

### Project Schema

Reflects [`Project`](file:///d:/sync_connect/src/types.ts#L5-L16).

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique project identifier |
| `name` | `string` | Name/title of the project |
| `description` | `string` | Project overview or notes |
| `status` | `string` (Enum) | Current state: `'NOT_STARTED'` \| `'IN_PROGRESS'` \| `'COMPLETED'` |
| `startDate` | `string \| null` (ISO 8601) | Planned or actual start date |
| `endDate` | `string \| null` (ISO 8601) | Target completion or deadline date |
| `dueDate` | `string \| null` (ISO 8601) | Derived or explicit project due date |
| `taskCount` | `number` | Total number of tasks associated with this project |
| `completedTaskCount` | `number` | Number of tasks with status `'COMPLETED'` |
| `createdAt` | `string` (ISO 8601) | Record creation timestamp |

```json
{
  "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "name": "Website Redesign",
  "description": "Overhaul corporate landing page, typography, and responsive navigation.",
  "status": "IN_PROGRESS",
  "startDate": "2026-09-01T00:00:00.000Z",
  "endDate": "2026-10-15T00:00:00.000Z",
  "dueDate": "2026-10-15T00:00:00.000Z",
  "taskCount": 4,
  "completedTaskCount": 1,
  "createdAt": "2026-09-01T10:00:00.000Z"
}
```

### Task Schema

Reflects [`Task`](file:///d:/sync_connect/src/types.ts#L18-L28).

| Field | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique task identifier |
| `projectId` | `string` (UUID) | ID of parent project |
| `projectName` | `string` | Name of parent project |
| `name` | `string` | Task title/summary |
| `description` | `string` | Detailed task instructions or notes |
| `priority` | `string` (Enum) | Priority level: `'LOW'` \| `'MEDIUM'` \| `'HIGH'` |
| `status` | `string` (Enum) | Execution status: `'PENDING'` \| `'IN_PROGRESS'` \| `'COMPLETED'` |
| `dueDate` | `string \| null` (ISO 8601) | Task due date deadline |
| `createdAt` | `string` (ISO 8601) | Record creation timestamp |

```json
{
  "id": "f8a1e2d3-c4b5-4a6b-9c8d-7e6f5a4b3c2d",
  "projectId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "projectName": "Website Redesign",
  "name": "Implement responsive navigation drawer",
  "description": "Ensure drawer behaves smoothly across mobile viewports.",
  "priority": "HIGH",
  "status": "PENDING",
  "dueDate": "2026-09-20T18:00:00.000Z",
  "createdAt": "2026-09-02T11:30:00.000Z"
}
```

### AuditLog Schema

Reflects [`AuditLog`](file:///d:/sync_connect/src/types.ts#L38-L46).

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique log entry identifier |
| `user_id` | `string` (UUID) | User who executed the action |
| `action` | `string` | Action identifier (e.g. `REGISTER`, `LOGIN`, `PROJECT_CREATED`, `TASK_COMPLETED`) |
| `entity_type` | `string` (Enum) | Entity category: `'PROJECT'` \| `'TASK'` \| `'AUTH'` |
| `entity_id` | `string \| null` | Targeted entity identifier |
| `details` | `string \| null` | Human-readable explanation of event |
| `created_at` | `string` (ISO 8601) | Timestamp of event |

```json
{
  "id": "audit-1757754800-x8k2",
  "user_id": "4770d58d-70c9-4e61-af88-87f0b65be229",
  "action": "PROJECT_CREATED",
  "entity_type": "PROJECT",
  "entity_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "details": "Created project: Website Redesign",
  "created_at": "2026-09-13T12:00:00.000Z"
}
```

### DashboardStats Schema

Reflects [`DashboardStats`](file:///d:/sync_connect/src/types.ts#L30-L36).

| Field | Type | Description |
|---|---|---|
| `totalProjects` | `number` | Total number of projects owned by user |
| `projectsInProgress` | `number` | Number of projects in `'IN_PROGRESS'` status |
| `totalTasks` | `number` | Total number of tasks owned by user |
| `completedTasks` | `number` | Number of tasks in `'COMPLETED'` status |
| `pendingTasks` | `number` | Number of tasks in `'PENDING'` or `'IN_PROGRESS'` status |

### Pagination Schema

Returned in paginated list responses (`/api/projects`, `/api/tasks`).

| Field | Type | Description |
|---|---|---|
| `page` | `number` | Current page number (1-indexed) |
| `limit` | `number` | Page item limit (max 100) |
| `total` | `number` | Total count matching the filter criteria |

### Standard Error Format

All error responses return standard HTTP error codes and a consistent JSON payload:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

---

## Authentication Endpoints

### POST /api/auth/register

Registers a new user account. Upon registration, user profile records are initialized and an audit event is logged.

- **HTTP Method:** `POST`
- **Path:** `/api/auth/register`
- **Auth Required:** No
- **Rate Limit:** 15 requests/minute per client IP

#### Request Body

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `fullName` | `string` | Optional | Trimmed string | User display name (defaults to email username if omitted) |
| `email` | `string` | **Yes** | Valid RFC email format, unique | User email address |
| `password` | `string` | **Yes** | Minimum 6 characters | User password |

```json
{
  "fullName": "Alex Mercer",
  "email": "alex.mercer@example.com",
  "password": "securePassword123"
}
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Account created and verified!",
  "user": {
    "id": "4770d58d-70c9-4e61-af88-87f0b65be229",
    "email": "alex.mercer@example.com",
    "fullName": "Alex Mercer"
  }
}
```

#### Error Responses

- **400 Bad Request (Validation Error)**:
  ```json
  {
    "success": false,
    "error": "Password must be at least 6 characters"
  }
  ```
- **400 Bad Request (Email Exists)**:
  ```json
  {
    "success": false,
    "error": "An account with this email already exists. Please sign in."
  }
  ```
- **429 Too Many Requests (Rate Limited)**:
  ```json
  {
    "success": false,
    "error": "Too many registration attempts. Please wait a moment and try again."
  }
  ```

---

### POST /api/auth/login

Authenticates user credentials and issues a JWT access token.

- **HTTP Method:** `POST`
- **Path:** `/api/auth/login`
- **Auth Required:** No
- **Rate Limit:** 15 requests/minute per client IP

#### Request Body

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `email` | `string` | **Yes** | Valid email format | Account email |
| `password` | `string` | **Yes** | Non-empty | Account password |

```json
{
  "email": "alex.mercer@example.com",
  "password": "securePassword123"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NzcwZDU4ZC03MGM5LTRlNjEtYWY4OC04N2YwYjY1YmUyMjkiLCJlbWFpbCI6ImFsZXgubWVyY2VyQGV4YW1wbGUuY29tIn0.signature",
  "user": {
    "id": "4770d58d-70c9-4e61-af88-87f0b65be229",
    "email": "alex.mercer@example.com",
    "fullName": "Alex Mercer"
  }
}
```

#### Error Responses

- **401 Unauthorized (Invalid Credentials)**:
  ```json
  {
    "success": false,
    "error": "Invalid login credentials"
  }
  ```
- **400 Bad Request**:
  ```json
  {
    "success": false,
    "error": "Email and password are required"
  }
  ```
- **429 Too Many Requests (Rate Limited)**:
  ```json
  {
    "success": false,
    "error": "Too many login attempts from this IP. Please wait a moment and try again."
  }
  ```

---

### POST /api/auth/logout

Invalidates the session context for the authenticated user and logs an audit trail entry.

- **HTTP Method:** `POST`
- **Path:** `/api/auth/logout`
- **Auth Required:** Yes (`Bearer <token>`)

#### Request Body
None.

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/profile

Retrieves the currently authenticated user's account details.

- **HTTP Method:** `GET`
- **Path:** `/api/auth/profile`
- **Auth Required:** Yes (`Bearer <token>`)

#### Request Body
None.

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "4770d58d-70c9-4e61-af88-87f0b65be229",
    "email": "alex.mercer@example.com",
    "fullName": "Alex Mercer"
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Project Endpoints

### GET /api/projects

Fetches a paginated, filterable list of projects owned by the authenticated user. Includes calculated `taskCount` and `completedTaskCount` for each project.

- **HTTP Method:** `GET`
- **Path:** `/api/projects`
- **Auth Required:** Yes (`Bearer <token>`)

#### Query Parameters

| Parameter | Type | Default | Options / Constraints | Description |
|---|---|---|---|---|
| `search` | `string` | `""` | Any string | Case-insensitive match on project `name` or `description` |
| `status` | `string` | `'ALL'` | `'NOT_STARTED'` \| `'IN_PROGRESS'` \| `'COMPLETED'` \| `'ALL'` | Filter by project status |
| `sortBy` | `string` | `'created_at'` | `'created_at'` \| `'name'` \| `'status'` \| `'start_date'` \| `'end_date'` | Field to sort by |
| `order` | `string` | `'desc'` | `'asc'` \| `'desc'` | Sort order direction |
| `page` | `integer` | `1` | Minimum `1` | Page number |
| `limit` | `integer` | `50` | `1` to `100` | Number of records per page |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "name": "Website Redesign",
      "description": "Overhaul corporate landing page, typography, and responsive mobile navigation.",
      "status": "IN_PROGRESS",
      "startDate": "2026-09-01T00:00:00.000Z",
      "endDate": "2026-10-15T00:00:00.000Z",
      "dueDate": "2026-10-15T00:00:00.000Z",
      "taskCount": 5,
      "completedTaskCount": 2,
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

### GET /api/projects/:id

Fetches detailed information for a single project including its full array of associated tasks.

- **HTTP Method:** `GET`
- **Path:** `/api/projects/:id`
- **Auth Required:** Yes (`Bearer <token>`)

#### URL Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique project identifier |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "name": "Website Redesign",
    "description": "Overhaul corporate landing page, typography, and responsive mobile navigation.",
    "status": "IN_PROGRESS",
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2026-10-15T00:00:00.000Z",
    "dueDate": "2026-10-15T00:00:00.000Z",
    "taskCount": 2,
    "completedTaskCount": 1,
    "createdAt": "2026-09-01T10:00:00.000Z",
    "tasks": [
      {
        "id": "task-101",
        "projectId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "projectName": "Website Redesign",
        "name": "Fix mobile navigation drawer animation",
        "description": "Address responsive layout transition on mobile screens.",
        "priority": "HIGH",
        "status": "PENDING",
        "dueDate": "2026-09-18T12:00:00.000Z",
        "createdAt": "2026-09-02T10:00:00.000Z"
      },
      {
        "id": "task-102",
        "projectId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "projectName": "Website Redesign",
        "name": "Standardize typography & design tokens",
        "description": "Refined font scales and layout paddings across components.",
        "priority": "MEDIUM",
        "status": "COMPLETED",
        "dueDate": "2026-09-10T12:00:00.000Z",
        "createdAt": "2026-09-02T11:00:00.000Z"
      }
    ]
  }
}
```

#### Error Responses

- **404 Not Found**:
  ```json
  {
    "success": false,
    "error": "Project not found"
  }
  ```
- **401 Unauthorized**:
  ```json
  {
    "success": false,
    "error": "Unauthorized"
  }
  ```

---

### POST /api/projects

Creates a new project record scoped to the authenticated user.

- **HTTP Method:** `POST`
- **Path:** `/api/projects`
- **Auth Required:** Yes (`Bearer <token>`)

#### Request Body

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | `string` | **Yes** | Non-empty string | Project title |
| `description` | `string` | Optional | String | Detailed project description |
| `status` | `string` | Optional | `'NOT_STARTED'` \| `'IN_PROGRESS'` \| `'COMPLETED'` (default: `'NOT_STARTED'`) | Initial project status |
| `startDate` | `string` | Optional | Valid ISO 8601 string | Project start date |
| `endDate` | `string` | Optional | Valid ISO 8601 string, must be `>= startDate` | Target completion date |

```json
{
  "name": "Supabase PostgreSQL Migration",
  "description": "Plan database schema migration, connection pooling, and client SDK integration.",
  "status": "NOT_STARTED",
  "startDate": "2026-09-15T00:00:00.000Z",
  "endDate": "2026-09-30T00:00:00.000Z"
}
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f",
    "name": "Supabase PostgreSQL Migration",
    "description": "Plan database schema migration, connection pooling, and client SDK integration.",
    "status": "NOT_STARTED",
    "startDate": "2026-09-15T00:00:00.000Z",
    "endDate": "2026-09-30T00:00:00.000Z",
    "dueDate": "2026-09-30T00:00:00.000Z",
    "taskCount": 0,
    "completedTaskCount": 0,
    "createdAt": "2026-09-13T12:00:00.000Z"
  }
}
```

#### Error Responses

- **400 Bad Request (Missing Name)**:
  ```json
  {
    "success": false,
    "error": "Project name is required"
  }
  ```
- **400 Bad Request (Invalid Dates)**:
  ```json
  {
    "success": false,
    "error": "End date must be on or after start date"
  }
  ```
- **400 Bad Request (Invalid Status)**:
  ```json
  {
    "success": false,
    "error": "Invalid status. Must be one of: NOT_STARTED, IN_PROGRESS, COMPLETED"
  }
  ```

---

### PUT /api/projects/:id

Updates an existing project. Note that `PATCH /api/projects/:id` is also accepted and routes to the same handler.

- **HTTP Method:** `PUT` (or `PATCH`)
- **Path:** `/api/projects/:id`
- **Auth Required:** Yes (`Bearer <token>`)

#### URL Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique project identifier |

#### Request Body

All fields are optional. Any supplied fields will overwrite existing values.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | `string` | Optional | Non-empty string if provided | Updated project title |
| `description` | `string` | Optional | String | Updated description |
| `status` | `string` | Optional | `'NOT_STARTED'` \| `'IN_PROGRESS'` \| `'COMPLETED'` | Updated status |
| `startDate` | `string` | Optional | Valid ISO 8601 string | Updated start date |
| `endDate` | `string` | Optional | Valid ISO 8601 string, `>= startDate` | Updated end date |

```json
{
  "status": "IN_PROGRESS",
  "description": "Updated scope to include read replicas."
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f",
    "name": "Supabase PostgreSQL Migration",
    "description": "Updated scope to include read replicas.",
    "status": "IN_PROGRESS",
    "startDate": "2026-09-15T00:00:00.000Z",
    "endDate": "2026-09-30T00:00:00.000Z",
    "dueDate": "2026-09-30T00:00:00.000Z",
    "taskCount": 1,
    "completedTaskCount": 0,
    "createdAt": "2026-09-13T12:00:00.000Z"
  }
}
```

#### Error Responses

- **400 Bad Request (Validation Error)**:
  ```json
  {
    "success": false,
    "error": "End date must be on or after start date"
  }
  ```
- **404 Not Found**:
  ```json
  {
    "success": false,
    "error": "Project not found"
  }
  ```

---

### DELETE /api/projects/:id

Permanently deletes the specified project.

> [!NOTE]
> **Cascading Deletion**: Deleting a project automatically deletes all tasks linked to this project ID.

- **HTTP Method:** `DELETE`
- **Path:** `/api/projects/:id`
- **Auth Required:** Yes (`Bearer <token>`)

#### URL Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | Unique project identifier |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Project deleted"
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Task Endpoints

### GET /api/tasks

Fetches tasks matching query criteria. Supports multi-filter intersection (AND logic), keyword search, sorting, and pagination.

- **HTTP Method:** `GET`
- **Path:** `/api/tasks`
- **Auth Required:** Yes (`Bearer <token>`)

#### Query Parameters

| Parameter | Type | Default | Options / Constraints | Description |
|---|---|---|---|---|
| `search` | `string` | `""` | Any string | Case-insensitive substring match on task `name` or `description` |
| `status` | `string` | `'ALL'` | `'PENDING'` \| `'IN_PROGRESS'` \| `'COMPLETED'` \| `'ALL'` | Filter by task status |
| `priority` | `string` | `'ALL'` | `'LOW'` \| `'MEDIUM'` \| `'HIGH'` \| `'ALL'` | Filter by task priority |
| `projectId` | `string` | `'ALL'` | UUID or `'ALL'` | Filter tasks by parent project |
| `sortBy` | `string` | `'created_at'` | `'created_at'` \| `'name'` \| `'due_date'` \| `'priority'` \| `'status'` | Sorting field |
| `order` | `string` | `'desc'` | `'asc'` \| `'desc'` | Sort order direction |
| `page` | `integer` | `1` | Minimum `1` | Page number |
| `limit` | `integer` | `50` | `1` to `100` | Results per page |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "task-101",
      "projectId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "projectName": "Website Redesign",
      "name": "Fix mobile navigation drawer animation",
      "description": "Address responsive layout transition on mobile screens.",
      "priority": "HIGH",
      "status": "PENDING",
      "dueDate": "2026-09-18T12:00:00.000Z",
      "createdAt": "2026-09-02T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

### GET /api/tasks/:id

Retrieves a single task by its unique identifier.

- **HTTP Method:** `GET`
- **Path:** `/api/tasks/:id`
- **Auth Required:** Yes (`Bearer <token>`)

#### URL Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Unique task identifier |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "task-101",
    "projectId": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "projectName": "Website Redesign",
    "name": "Fix mobile navigation drawer animation",
    "description": "Address responsive layout transition on mobile screens.",
    "priority": "HIGH",
    "status": "PENDING",
    "dueDate": "2026-09-18T12:00:00.000Z",
    "createdAt": "2026-09-02T10:00:00.000Z"
  }
}
```

#### Error Responses

- **404 Not Found**:
  ```json
  {
    "success": false,
    "error": "Task not found"
  }
  ```
- **401 Unauthorized**:
  ```json
  {
    "success": false,
    "error": "Unauthorized"
  }
  ```

---

### POST /api/tasks

Creates a new task within a specified project.

- **HTTP Method:** `POST`
- **Path:** `/api/tasks`
- **Auth Required:** Yes (`Bearer <token>`)

#### Request Body

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | `string` | **Yes** | Non-empty string | Task title |
| `projectId` | `string` | **Yes** | Valid UUID string | Target parent project identifier |
| `description` | `string` | Optional | String | Task instructions or notes |
| `priority` | `string` | Optional | `'LOW'` \| `'MEDIUM'` \| `'HIGH'` (default: `'MEDIUM'`) | Priority ranking |
| `status` | `string` | Optional | `'PENDING'` \| `'IN_PROGRESS'` \| `'COMPLETED'` (default: `'PENDING'`) | Initial status |
| `dueDate` | `string` | Optional | Valid ISO 8601 string | Completion deadline |

```json
{
  "name": "Configure PostgreSQL pooling",
  "description": "Set up pgBouncer transaction connection string in config.",
  "projectId": "c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f",
  "priority": "HIGH",
  "status": "PENDING",
  "dueDate": "2026-09-25T18:00:00.000Z"
}
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "task-201",
    "projectId": "c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f",
    "projectName": "Supabase PostgreSQL Migration",
    "name": "Configure PostgreSQL pooling",
    "description": "Set up pgBouncer transaction connection string in config.",
    "priority": "HIGH",
    "status": "PENDING",
    "dueDate": "2026-09-25T18:00:00.000Z",
    "createdAt": "2026-09-13T12:15:00.000Z"
  }
}
```

#### Error Responses

- **400 Bad Request (Missing Required Fields)**:
  ```json
  {
    "success": false,
    "error": "Project is required"
  }
  ```
- **400 Bad Request (Invalid Priority / Status)**:
  ```json
  {
    "success": false,
    "error": "Invalid priority. Must be one of: LOW, MEDIUM, HIGH"
  }
  ```

---

### PUT /api/tasks/:id

Modifies fields of an existing task. `PATCH /api/tasks/:id` is also accepted and maps to the identical update handler.

- **HTTP Method:** `PUT` (or `PATCH`)
- **Path:** `/api/tasks/:id`
- **Auth Required:** Yes (`Bearer <token>`)

#### URL Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Unique task identifier |

#### Request Body

All fields are optional. Fields omitted from the payload remain unmodified.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | `string` | Optional | Non-empty string if provided | Updated task title |
| `description` | `string` | Optional | String | Updated task details |
| `priority` | `string` | Optional | `'LOW'` \| `'MEDIUM'` \| `'HIGH'` | Updated priority |
| `status` | `string` | Optional | `'PENDING'` \| `'IN_PROGRESS'` \| `'COMPLETED'` | Updated progress status |
| `dueDate` | `string` | Optional | ISO 8601 string | Updated deadline |
| `projectId` | `string` | Optional | Valid UUID string | Move task to a different project |

```json
{
  "status": "COMPLETED",
  "priority": "MEDIUM"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "task-201",
    "projectId": "c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f",
    "projectName": "Supabase PostgreSQL Migration",
    "name": "Configure PostgreSQL pooling",
    "description": "Set up pgBouncer transaction connection string in config.",
    "priority": "MEDIUM",
    "status": "COMPLETED",
    "dueDate": "2026-09-25T18:00:00.000Z",
    "createdAt": "2026-09-13T12:15:00.000Z"
  }
}
```

#### Error Responses

- **404 Not Found**:
  ```json
  {
    "success": false,
    "error": "Task not found"
  }
  ```
- **400 Bad Request**:
  ```json
  {
    "success": false,
    "error": "Task name cannot be empty"
  }
  ```

---

### DELETE /api/tasks/:id

Deletes an individual task record.

- **HTTP Method:** `DELETE`
- **Path:** `/api/tasks/:id`
- **Auth Required:** Yes (`Bearer <token>`)

#### URL Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Unique task identifier |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Task deleted"
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Dashboard Endpoints

### GET /api/dashboard

Calculates and returns aggregated metric summaries for the authenticated user, reporting counts of projects and tasks categorized by status.

- **HTTP Method:** `GET`
- **Path:** `/api/dashboard`
- **Auth Required:** Yes (`Bearer <token>`)

#### Request Body
None.

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totalProjects": 5,
    "projectsInProgress": 2,
    "totalTasks": 12,
    "completedTasks": 3,
    "pendingTasks": 9
  }
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Audit Log Endpoints

### GET /api/audit-logs

Retrieves the latest 25 audit log events for actions performed by the authenticated user (e.g. project mutations, task lifecycle events, authentication activities).

- **HTTP Method:** `GET`
- **Path:** `/api/audit-logs`
- **Auth Required:** Yes (`Bearer <token>`)

#### Request Body
None.

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "audit-1757755900-a1b2",
      "user_id": "4770d58d-70c9-4e61-af88-87f0b65be229",
      "action": "TASK_COMPLETED",
      "entity_type": "TASK",
      "entity_id": "task-201",
      "details": "Marked task completed: Configure PostgreSQL pooling",
      "created_at": "2026-09-13T12:20:00.000Z"
    },
    {
      "id": "audit-1757755800-c3d4",
      "user_id": "4770d58d-70c9-4e61-af88-87f0b65be229",
      "action": "TASK_CREATED",
      "entity_type": "TASK",
      "entity_id": "task-201",
      "details": "Created task: Configure PostgreSQL pooling",
      "created_at": "2026-09-13T12:15:00.000Z"
    },
    {
      "id": "audit-1757755700-e5f6",
      "user_id": "4770d58d-70c9-4e61-af88-87f0b65be229",
      "action": "PROJECT_CREATED",
      "entity_type": "PROJECT",
      "entity_id": "c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f",
      "details": "Created project: Supabase PostgreSQL Migration",
      "created_at": "2026-09-13T12:00:00.000Z"
    }
  ]
}
```

#### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Health & System Endpoints

### GET /api/health

Returns runtime diagnostics and connectivity status of backing integrations (Supabase PostgreSQL database and Groq AI inference client). Does not require authentication.

- **HTTP Method:** `GET`
- **Path:** `/api/health`
- **Auth Required:** No

#### Request Body
None.

#### Success Response (200 OK)

```json
{
  "status": "ok",
  "supabaseConnected": true,
  "groqConfigured": true,
  "timestamp": "2026-09-13T15:15:29.000Z"
}
```
