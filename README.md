# ProjectSync

A modern, full-stack project and task management system built with React 19, Node.js, Express 5, TypeScript, PostgreSQL via Supabase, and AI-powered assistance.

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-black?logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff?logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

**ProjectSync** is an enterprise-grade project and task management platform designed for speed, security, and developer clarity. It features complete tenancy isolation powered by PostgreSQL Row Level Security (RLS), instant metric aggregation, a unified full-stack architecture that combines Express 5 with Vite 6, and an optional AI copilot powered by Groq LLM.

---

## Key Features

1. **User Authentication:** Robust user onboarding and session management (register, login, logout) powered by Supabase Auth with JWT verification.
2. **Project Management:** Full CRUD operations for projects, including lifecycle state tracking (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`), date scheduling, and ownership scoping.
3. **Task Management:** Granular task lifecycle tracking (CRUD), priority categorization (`LOW`, `MEDIUM`, `HIGH`), status tracking (`PENDING`, `IN_PROGRESS`, `COMPLETED`), and project assignment.
4. **Interactive Dashboard:** Live project and task performance statistics (total projects, total tasks, completed tasks, pending tasks, in-progress projects) via a high-performance database view.
5. **Search & Filtering:** Real-time multi-field search and status/priority filters across projects and tasks.
6. **Sorting & Pagination:** Configurable sorting criteria (`name`, `createdAt`, `dueDate`, `priority`, etc.), sort ordering, and page limits.
7. **Audit Logging:** Detailed chronological activity logs capturing critical security, project, and task mutations.
8. **AI Copilot (Groq-Powered):** Integrated conversational assistant capable of answering questions, summarizing progress, and assisting with project workflows.
9. **Rate Limiting:** IP-based request throttling on sensitive authentication endpoints (15 requests/minute per IP) to mitigate brute-force attacks.
10. **Strict Validation & Error Handling:** Schema validation on all request payloads using Zod, consistent JSON response shapes, and centralized error handling.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | [React 19](https://react.dev/), [React Router v7](https://reactrouter.com/), [Tailwind CSS v4](https://tailwindcss.com/), [Axios](https://axios-http.com/), [Lucide React](https://lucide.dev/), [date-fns](https://date-fns.org/), [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Backend** | [Node.js](https://nodejs.org/), [Express 5](https://expressjs.com/), [TypeScript](https://www.typescriptlang.org/), [Helmet](https://helmetjs.github.io/), [Morgan](https://github.com/expressjs/morgan), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) |
| **Database** | [PostgreSQL via Supabase](https://supabase.com/) with Row Level Security (RLS), custom triggers, B-Tree indexes, and analytical views |
| **Authentication** | Supabase Auth (JWT-based token authentication & verification) |
| **AI Copilot** | [Groq SDK](https://groq.com/) LLM API integration (optional) |
| **Build & Tooling** | [Vite 6](https://vitejs.dev/), [esbuild](https://esbuild.github.io/), [tsx](https://github.com/privatenumber/tsx) |

---

## Prerequisites

Before setting up ProjectSync locally, ensure you have:

- **Node.js**: `v18.0.0` or higher (`v20+` LTS recommended)
- **npm**: `v9.0.0` or higher (bundled with Node.js)
- **Supabase Account**: A free or paid project on [Supabase](https://supabase.com/)
- **Groq API Key** *(Optional)*: A free API key from [Groq Cloud](https://console.groq.com/) for AI copilot capabilities

---

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/sync_connect.git
cd sync_connect
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-anon-publishable-key
SUPABASE_SECRET_KEY=your-service-role-secret-key

# AI Copilot Configuration (Optional)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Server Port (Optional, defaults to 3000)
PORT=3000
```

### 4. Database Setup
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to the **SQL Editor**.
3. Open the schema file [momentum-supabase-schema-v2.sql](file:///d:/sync_connect/momentum-supabase-schema-v2.sql).
4. Copy and paste the contents into the SQL Editor and click **Run**.
5. This script provisions:
   - Tables: `profiles`, `projects`, `tasks`, `chat_messages`, `audit_logs`
   - Trigger: `handle_new_user()` on `auth.users` for automatic profile provisioning
   - Trigger: `set_updated_at()` for automatic timestamp tracking
   - Analytical View: `dashboard_stats` configured with `security_invoker = true`
   - Row Level Security (RLS) policies enforcing per-user data isolation on every table

For full database architectural documentation, see [DATABASE.md](file:///d:/sync_connect/docs/DATABASE.md).

### 5. Start the Development Server
```bash
npm run dev
```

The Express backend and Vite frontend will compile and start concurrently. Open your browser and navigate to:
```
http://localhost:3000
```

---

## Environment Variables

| Variable | Type | Required | Description | Default |
| :--- | :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | String | **Yes** | Fully qualified URL of your Supabase project instance | — |
| `SUPABASE_PUBLISHABLE_KEY` | String | **Yes** | Supabase anonymous / publishable public API key (`anon` key) | — |
| `SUPABASE_SECRET_KEY` | String | **Yes** | Supabase privileged service role secret key (`service_role` key) | — |
| `GROQ_API_KEY` | String | *No* | API key from Groq Cloud for the AI Copilot assistant | — |
| `PORT` | Number | *No* | HTTP server port for Express application | `3000` |

---

## API Overview

All endpoints under `/api/projects`, `/api/tasks`, `/api/dashboard`, `/api/audit-logs`, and `/api/auth/profile` require an `Authorization` header containing a valid Supabase JWT Bearer token:

```http
Authorization: Bearer <SUPABASE_JWT_TOKEN>
```

| Method | Endpoint | Auth Required | Description / Parameters |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | No | Register new user account (`fullName`, `email`, `password`) |
| `POST` | `/api/auth/login` | No | Authenticate user and return session JWT token (`email`, `password`) |
| `POST` | `/api/auth/logout` | Yes | Invalidate user session |
| `GET` | `/api/auth/profile` | Yes | Fetch authenticated user's profile details |
| `GET` | `/api/projects` | Yes | List projects. Supports `search`, `status`, `sortBy`, `order`, `page`, `limit` |
| `GET` | `/api/projects/:id` | Yes | Get a single project by ID along with its associated tasks |
| `POST` | `/api/projects` | Yes | Create a new project (`name`, `description`, `status`, `startDate`, `endDate`) |
| `PUT` | `/api/projects/:id` | Yes | Update an existing project's metadata or status |
| `DELETE` | `/api/projects/:id` | Yes | Delete a project and cascadingly remove associated tasks |
| `GET` | `/api/tasks` | Yes | List tasks. Supports `search`, `status`, `priority`, `projectId`, `sortBy`, `order`, `page`, `limit` |
| `GET` | `/api/tasks/:id` | Yes | Retrieve task details by ID |
| `POST` | `/api/tasks` | Yes | Create a new task (`projectId`, `name`, `description`, `priority`, `status`, `dueDate`) |
| `PUT` | `/api/tasks/:id` | Yes | Update task status, priority, or details |
| `DELETE` | `/api/tasks/:id` | Yes | Delete a specific task |
| `GET` | `/api/dashboard` | Yes | Retrieve aggregate statistics (total projects, tasks, completed, pending, in progress) |
| `GET` | `/api/audit-logs` | Yes | Retrieve user's chronological activity audit trail |
| `GET` | `/api/health` | No | System health check and API availability status |

For detailed request payloads, query parameter formats, and sample responses, see [API.md](file:///d:/sync_connect/docs/API.md).

---

## Project Structure

```
sync_connect/
├── server.ts                       # Express backend (API routes + Vite middleware integration)
├── src/
│   ├── App.tsx                     # Root React component with application routing
│   ├── main.tsx                    # Client DOM hydration & application entry point
│   ├── types.ts                    # Global TypeScript interfaces & shared data types
│   ├── pages/
│   │   ├── Dashboard.tsx           # Dashboard view with metric widgets and progress graphs
│   │   ├── Projects.tsx            # Project list, creation, filter, and management page
│   │   ├── Tasks.tsx               # Task board with status/priority filtering and modals
│   │   ├── Login.tsx               # User authentication & login view
│   │   └── Register.tsx            # User registration & account onboarding view
│   ├── components/
│   │   ├── ProtectedRoute.tsx      # Route guard redirecting unauthenticated users
│   │   ├── ConfirmModal.tsx        # Accessible confirmation dialog for destructive actions
│   │   └── Copilot.tsx             # Groq-powered AI chat assistant panel
│   ├── context/
│   │   ├── AuthContext.tsx         # React authentication state context & Supabase session listener
│   │   └── ToastContext.tsx        # Global notification toast provider
│   ├── hooks/
│   │   └── useAuth.ts              # Custom hook for accessing authentication state
│   └── services/
│       ├── api.ts                  # Axios HTTP client with auth token interceptors
│       └── supabaseClient.ts       # Supabase JavaScript client initialization
├── momentum-supabase-schema-v2.sql # Supabase PostgreSQL migration script (tables, RLS, triggers, views)
├── docs/
│   ├── API.md                      # Comprehensive REST API specifications and payload documentation
│   └── DATABASE.md                 # Detailed PostgreSQL schema, ER diagram, and RLS documentation
├── package.json                    # Project dependencies, build scripts, and engine specifications
├── vite.config.ts                  # Vite 6 configuration with React and Tailwind CSS v4 plugins
├── tsconfig.json                   # TypeScript compiler configuration
└── index.html                      # Single Page Application HTML template
```

---

## Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Runs Express server with Vite middleware in development mode with HMR |
| `npm run build` | `vite build && esbuild ...` | Bundles React client into `dist/` and builds `dist/server.cjs` for production |
| `npm start` | `node dist/server.cjs` | Starts the production Express server serving compiled static assets and API |
| `npm run lint` | `tsc --noEmit` | Runs TypeScript compiler across the project to check for type errors |

---

## Security Features

ProjectSync enforces defense-in-depth security principles across the database, server, and client tiers:

- **Password Hashing:** Passwords are never stored in plaintext or exposed to application logic. Credentials are authenticated directly via Supabase Auth using industry-standard `bcrypt` hashing with unique per-user salts.
- **JWT Authentication:** Protected API endpoints verify cryptographically signed JSON Web Tokens (JWT) supplied in HTTP `Authorization` Bearer headers.
- **Row Level Security (RLS):** All database tables have PostgreSQL Row Level Security enabled. Database policies verify `auth.uid() = user_id`, guaranteeing physical tenant data isolation even in the event of client-side logic flaws.
- **Rate Limiting:** Auth routes (`/api/auth/*`) are protected by `express-rate-limit` capped at 15 requests per 15-minute window per IP to defend against credential stuffing and brute-force attacks.
- **Helmet Security Headers:** Express incorporates [Helmet](https://helmetjs.github.io/) to establish secure HTTP response headers (Content Security Policy, Cross-Origin Embedder Policy, X-Frame-Options, X-Content-Type-Options, etc.).
- **Input Validation & Sanitization:** All incoming request payloads and query parameters are strictly validated using [Zod](https://zod.dev/) schemas before reaching database service routines.
- **SQL Injection Prevention:** Zero raw string-concatenated SQL queries. All interactions utilize the official Supabase Client / PostgREST query builder with automated parameterization.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
