// server.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
dotenv.config();
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
app.use(helmet({
  contentSecurityPolicy: false,
  // Disabled for Vite dev HMR compatibility
  crossOriginEmbedderPolicy: false
}));
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (!req.url.startsWith("/api") && (req.url.startsWith("/projects") || req.url.startsWith("/tasks") || req.url.startsWith("/dashboard") || req.url.startsWith("/auth") || req.url.startsWith("/health") || req.url.startsWith("/audit-logs") || req.url.startsWith("/copilot") || req.url.startsWith("/seed"))) {
    req.url = "/api" + req.url;
  }
  next();
});
var supabaseUrl = process.env.SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
var supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log("[Supabase] Initialized server client successfully with URL:", supabaseUrl);
  } catch (err) {
    console.error("[Supabase] Failed to initialize server client:", err);
  }
}
var groqApiKey = process.env.GROQ_API_KEY || "";
var groq = null;
if (groqApiKey && groqApiKey.startsWith("gsk_")) {
  try {
    groq = new Groq({ apiKey: groqApiKey });
    console.log("[Groq] Initialized Groq LLM client successfully");
  } catch (err) {
    console.error("[Groq] Failed to initialize Groq client:", err);
  }
}
var rateLimits = /* @__PURE__ */ new Map();
function checkRateLimit(userId, limit = 20, windowMs = 6e4) {
  const now = Date.now();
  const timestamps = rateLimits.get(userId) || [];
  const valid = timestamps.filter((t) => now - t < windowMs);
  if (valid.length >= limit) return false;
  valid.push(now);
  rateLimits.set(userId, valid);
  return true;
}
async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  if (token.startsWith("open-token")) {
    return {
      id: "4770d58d-70c9-4e61-af88-87f0b65be229",
      email: "demo@momentum.app",
      fullName: "Demo Explorer"
    };
  }
  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        let fullName = user.user_metadata?.full_name || "";
        try {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
          if (profile?.full_name) {
            fullName = profile.full_name;
          }
        } catch {
        }
        return {
          id: user.id,
          email: user.email || "",
          fullName: fullName || user.email?.split("@")[0] || "Team Member"
        };
      }
      if (error) {
        console.warn("[Auth] Supabase JWT verification error:", error.message);
      }
    } catch (e) {
      console.warn("[Auth] Token verification exception:", e);
    }
    return null;
  }
  console.warn("[Auth] Supabase not configured \u2014 running in local-only mode. Token not verified.");
  return null;
}
var localProjects = [
  {
    id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    name: "Website Redesign",
    description: "Overhaul corporate landing page, typography, and responsive mobile navigation.",
    status: "IN_PROGRESS",
    start_date: (/* @__PURE__ */ new Date()).toISOString(),
    end_date: new Date(Date.now() + 30 * 864e5).toISOString(),
    user_id: "4770d58d-70c9-4e61-af88-87f0b65be229",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e",
    name: "Mobile App MVP",
    description: "Build cross-platform MVP with onboarding flows and offline task sync.",
    status: "IN_PROGRESS",
    start_date: new Date(Date.now() - 10 * 864e5).toISOString(),
    end_date: new Date(Date.now() + 45 * 864e5).toISOString(),
    user_id: "4770d58d-70c9-4e61-af88-87f0b65be229",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f",
    name: "Supabase PostgreSQL Migration",
    description: "Plan database schema migration, connection pooling, and client SDK integration.",
    status: "NOT_STARTED",
    start_date: (/* @__PURE__ */ new Date()).toISOString(),
    end_date: new Date(Date.now() + 15 * 864e5).toISOString(),
    user_id: "4770d58d-70c9-4e61-af88-87f0b65be229",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var localTasks = [
  {
    id: "task-101",
    project_id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    name: "Fix mobile navigation drawer animation",
    description: "Address responsive layout transition on mobile screens.",
    priority: "HIGH",
    status: "PENDING",
    due_date: new Date(Date.now() + 5 * 864e5).toISOString(),
    user_id: "4770d58d-70c9-4e61-af88-87f0b65be229",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "task-102",
    project_id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    name: "Standardize typography & design tokens",
    description: "Refined font scales and layout paddings across components.",
    priority: "MEDIUM",
    status: "COMPLETED",
    due_date: new Date(Date.now() - 1 * 864e5).toISOString(),
    user_id: "4770d58d-70c9-4e61-af88-87f0b65be229",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "task-103",
    project_id: "b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e",
    name: "Implement user profile avatar upload",
    description: "Allow users to customize initials and profile colors.",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    due_date: new Date(Date.now() + 9 * 864e5).toISOString(),
    user_id: "4770d58d-70c9-4e61-af88-87f0b65be229",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "task-104",
    project_id: "c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f",
    name: "Configure connection pooling URI",
    description: "Setup PostgreSQL connection string with transaction mode.",
    priority: "HIGH",
    status: "PENDING",
    due_date: new Date(Date.now() + 12 * 864e5).toISOString(),
    user_id: "4770d58d-70c9-4e61-af88-87f0b65be229",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }
];
function formatProject(p, tasks = []) {
  const pTasks = tasks.filter((t) => (t.project_id || t.projectId) === p.id);
  const completed = pTasks.filter((t) => t.status === "COMPLETED").length;
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    status: p.status || "NOT_STARTED",
    startDate: p.start_date || p.startDate || null,
    endDate: p.end_date || p.endDate || null,
    dueDate: p.end_date || p.dueDate || null,
    taskCount: pTasks.length,
    completedTaskCount: completed,
    createdAt: p.created_at || p.createdAt
  };
}
function formatTask(t, projects = []) {
  const pId = t.project_id || t.projectId;
  const proj = projects.find((p) => p.id === pId) || t.project;
  return {
    id: t.id,
    projectId: pId,
    projectName: proj ? typeof proj === "object" ? proj.name : proj : "General Project",
    name: t.name,
    description: t.description || "",
    priority: t.priority || "MEDIUM",
    status: t.status || "PENDING",
    dueDate: t.due_date || t.dueDate || null,
    createdAt: t.created_at || t.createdAt
  };
}
var ipRateLimits = /* @__PURE__ */ new Map();
function checkIpRateLimit(ip, limit = 15, windowMs = 6e4) {
  const now = Date.now();
  const timestamps = ipRateLimits.get(ip) || [];
  const valid = timestamps.filter((t) => now - t < windowMs);
  if (valid.length >= limit) return false;
  valid.push(now);
  ipRateLimits.set(ip, valid);
  return true;
}
var localAuditLogs = [];
async function logAuditEvent(userId, action, entityType, entityId, details) {
  const entry = {
    id: "audit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  localAuditLogs.unshift(entry);
  if (localAuditLogs.length > 200) localAuditLogs.pop();
  if (supabase) {
    try {
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details
      });
    } catch {
    }
  }
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    supabaseConnected: !!supabase,
    groqConfigured: !!groq,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/auth/register", async (req, res) => {
  try {
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "client";
    if (!checkIpRateLimit(String(clientIp), 15, 6e4)) {
      return res.status(429).json({
        success: false,
        error: "Too many registration attempts. Please wait a moment and try again."
      });
    }
    const { fullName, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: "Invalid email address format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
    }
    const name = (fullName || cleanEmail.split("@")[0]).trim();
    if (supabase) {
      const { data: adminUser, error: createError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name
        }
      });
      if (createError) {
        if (createError.message.toLowerCase().includes("already registered") || createError.message.toLowerCase().includes("unique constraint")) {
          return res.status(400).json({
            success: false,
            error: "An account with this email already exists. Please sign in."
          });
        }
        return res.status(400).json({ success: false, error: createError.message });
      }
      if (adminUser?.user) {
        try {
          await supabase.from("profiles").upsert({
            id: adminUser.user.id,
            full_name: name,
            email: cleanEmail
          });
        } catch (profileErr) {
          console.warn("Profile upsert warning:", profileErr);
        }
        logAuditEvent(adminUser.user.id, "REGISTER", "AUTH", adminUser.user.id, `User registered: ${cleanEmail}`);
      }
      return res.status(201).json({
        success: true,
        message: "Account created and verified!",
        user: {
          id: adminUser?.user?.id,
          email: cleanEmail,
          fullName: name
        }
      });
    }
    res.status(201).json({ success: true, message: "Account registered" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "client";
    if (!checkIpRateLimit(String(clientIp), 15, 6e4)) {
      return res.status(429).json({
        success: false,
        error: "Too many login attempts from this IP. Please wait a moment and try again."
      });
    }
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: "Invalid email address format" });
    }
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (error) {
        return res.status(401).json({ success: false, error: error.message });
      }
      if (data.session && data.user) {
        let fullName = data.user.user_metadata?.full_name || "";
        try {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
          if (profile?.full_name) fullName = profile.full_name;
        } catch {
        }
        logAuditEvent(data.user.id, "LOGIN", "AUTH", data.user.id, `User logged in from ${clientIp}`);
        return res.json({
          success: true,
          token: data.session.access_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            fullName: fullName || cleanEmail.split("@")[0]
          }
        });
      }
    }
    res.json({
      success: true,
      token: "open-token-" + Date.now(),
      user: {
        id: "4770d58d-70c9-4e61-af88-87f0b65be229",
        email: cleanEmail,
        fullName: cleanEmail.split("@")[0]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/logout", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (user) {
      logAuditEvent(user.id, "LOGOUT", "AUTH", user.id, "User logged out");
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "client";
    if (!checkIpRateLimit(String(clientIp), 5, 6e4)) {
      return res.status(429).json({
        success: false,
        error: "Too many password reset attempts. Please wait a minute and try again."
      });
    }
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ success: false, error: "Email address is required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: "Please provide a valid email address." });
    }
    if (!supabase) {
      return res.status(503).json({ success: false, error: "Auth service unavailable." });
    }
    const clientOrigin = (req.body.redirectTo || req.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
    const redirectTo = clientOrigin.endsWith("/reset-password") ? clientOrigin : `${clientOrigin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
    if (error) {
      console.error("Forgot password Supabase error:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
    res.json({
      success: true,
      message: "Password reset link has been dispatched to your email address."
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/auto-confirm", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }
    if (supabase) {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true
      });
      if (error) {
        console.warn("Auto confirm error:", error);
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.json({ success: true, message: "User confirmed successfully" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/auth/profile", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/dashboard", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (supabase) {
      try {
        const { data: viewData, error: viewError } = await supabase.from("dashboard_stats").select("*").eq("user_id", user.id).maybeSingle();
        if (!viewError && viewData) {
          return res.json({
            success: true,
            data: {
              totalProjects: Number(viewData.total_projects || 0),
              projectsInProgress: Number(viewData.projects_in_progress || 0),
              totalTasks: Number(viewData.total_tasks || 0),
              completedTasks: Number(viewData.completed_tasks || 0),
              pendingTasks: Number(viewData.pending_tasks || 0)
            }
          });
        }
      } catch (viewErr) {
        console.warn("View query error, falling back to aggregate:", viewErr);
      }
      try {
        const [projRes, taskRes] = await Promise.all([
          supabase.from("projects").select("id, status").eq("user_id", user.id),
          supabase.from("tasks").select("id, status").eq("user_id", user.id)
        ]);
        const projects = projRes.data || [];
        const tasks = taskRes.data || [];
        return res.json({
          success: true,
          data: {
            totalProjects: projects.length,
            projectsInProgress: projects.filter((p) => p.status === "IN_PROGRESS").length,
            totalTasks: tasks.length,
            completedTasks: tasks.filter((t) => t.status === "COMPLETED").length,
            pendingTasks: tasks.filter((t) => t.status !== "COMPLETED").length
          }
        });
      } catch (aggErr) {
        console.warn("Live aggregate error:", aggErr);
      }
    }
    const userProjects = localProjects.filter((p) => p.user_id === user.id);
    const userTasks = localTasks.filter((t) => t.user_id === user.id);
    res.json({
      success: true,
      data: {
        totalProjects: userProjects.length,
        projectsInProgress: userProjects.filter((p) => p.status === "IN_PROGRESS").length,
        totalTasks: userTasks.length,
        completedTasks: userTasks.filter((t) => t.status === "COMPLETED").length,
        pendingTasks: userTasks.filter((t) => t.status !== "COMPLETED").length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/projects", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const search = (req.query.search || "").trim();
    const status = req.query.status;
    const sortBy = req.query.sortBy || "created_at";
    const order = req.query.order?.toLowerCase() === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const offset = (page - 1) * limit;
    if (supabase) {
      try {
        let query = supabase.from("projects").select("*", { count: "exact" }).eq("user_id", user.id);
        if (status && status !== "ALL") {
          query = query.eq("status", status);
        }
        if (search) {
          query = query.ilike("name", `%${search}%`);
        }
        const validSortCols = {
          created_at: "created_at",
          createdAt: "created_at",
          name: "name",
          start_date: "start_date",
          startDate: "start_date",
          end_date: "end_date",
          endDate: "end_date",
          status: "status"
        };
        const sortCol = validSortCols[sortBy] || "created_at";
        query = query.order(sortCol, { ascending: order === "asc" });
        if (req.query.page || req.query.limit) {
          query = query.range(offset, offset + limit - 1);
        }
        const { data: projects, error: projErr, count } = await query;
        if (!projErr && projects) {
          const { data: tasks } = await supabase.from("tasks").select("id, project_id, status").eq("user_id", user.id);
          const formatted = projects.map((p) => formatProject(p, tasks || []));
          return res.json({
            success: true,
            data: formatted,
            pagination: {
              page,
              limit,
              total: count ?? formatted.length
            }
          });
        }
      } catch (e) {
        console.warn("Supabase projects fetch error:", e);
      }
    }
    let list = localProjects.filter((p) => p.user_id === user.id);
    if (status && status !== "ALL") {
      list = list.filter((p) => p.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let valA = a.created_at;
      let valB = b.created_at;
      if (sortBy === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === "status") {
        valA = a.status;
        valB = b.status;
      }
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    });
    const total = list.length;
    if (req.query.page || req.query.limit) {
      list = list.slice(offset, offset + limit);
    }
    res.json({
      success: true,
      data: list.map((p) => formatProject(p, localTasks)),
      pagination: { page, limit, total }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/projects/:id", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { id } = req.params;
    if (supabase) {
      try {
        const { data: project, error: pErr } = await supabase.from("projects").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
        if (project) {
          const { data: tasks } = await supabase.from("tasks").select("*").eq("project_id", id).eq("user_id", user.id).order("created_at", { ascending: false });
          return res.json({
            success: true,
            data: {
              ...formatProject(project, tasks || []),
              tasks: (tasks || []).map((t) => formatTask(t, [project]))
            }
          });
        }
        if (pErr) {
          return res.status(400).json({ success: false, error: pErr.message });
        }
      } catch (err) {
        console.warn("Supabase get single project error:", err);
      }
    }
    const localP = localProjects.find((p) => p.id === id && p.user_id === user.id);
    if (!localP) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }
    const pTasks = localTasks.filter((t) => t.project_id === id && t.user_id === user.id);
    res.json({
      success: true,
      data: {
        ...formatProject(localP, pTasks),
        tasks: pTasks.map((t) => formatTask(t, [localP]))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/projects", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { name, description, status, startDate, endDate } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, error: "Project name is required" });
    }
    if (status !== void 0) {
      const allowedStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`
        });
      }
    }
    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({ success: false, error: "End date must be on or after start date" });
      }
    }
    const cleanStartDate = startDate && startDate.trim() ? startDate : null;
    const cleanEndDate = endDate && endDate.trim() ? endDate : null;
    const projectStatus = status || "NOT_STARTED";
    if (supabase) {
      try {
        const { data, error } = await supabase.from("projects").insert({
          name: name.trim(),
          description: (description || "").trim(),
          status: projectStatus,
          start_date: cleanStartDate ? new Date(cleanStartDate) : null,
          end_date: cleanEndDate ? new Date(cleanEndDate) : null,
          user_id: user.id
        }).select().single();
        if (!error && data) {
          logAuditEvent(user.id, "PROJECT_CREATED", "PROJECT", data.id, `Created project: ${data.name}`);
          return res.status(201).json({ success: true, data: formatProject(data) });
        }
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
      } catch (err) {
        console.warn("Supabase project insert fallback:", err);
      }
    }
    const newProj = {
      id: "proj-" + Date.now(),
      name: name.trim(),
      description: (description || "").trim(),
      status: projectStatus,
      start_date: cleanStartDate,
      end_date: cleanEndDate,
      user_id: user.id,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    localProjects.unshift(newProj);
    logAuditEvent(user.id, "PROJECT_CREATED", "PROJECT", newProj.id, `Created project: ${newProj.name}`);
    res.status(201).json({ success: true, data: formatProject(newProj) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
var updateProjectHandler = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const id = String(req.params.id);
    const { name, description, status, startDate, endDate } = req.body;
    if (name !== void 0 && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ success: false, error: "Project name cannot be empty" });
    }
    if (status !== void 0) {
      const allowedStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`
        });
      }
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ success: false, error: "End date must be on or after start date" });
    }
    if (supabase) {
      try {
        const updatePayload = {};
        if (name !== void 0) updatePayload.name = name.trim();
        if (description !== void 0) updatePayload.description = (description || "").trim();
        if (status !== void 0) updatePayload.status = status;
        if (startDate !== void 0) updatePayload.start_date = startDate && startDate.trim() ? new Date(startDate) : null;
        if (endDate !== void 0) updatePayload.end_date = endDate && endDate.trim() ? new Date(endDate) : null;
        const { data, error } = await supabase.from("projects").update(updatePayload).eq("id", id).eq("user_id", user.id).select().single();
        if (!error && data) {
          logAuditEvent(user.id, "PROJECT_UPDATED", "PROJECT", id, `Updated project: ${data.name}`);
          return res.json({ success: true, data: formatProject(data) });
        }
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
      } catch (err) {
        console.warn("Supabase project update fallback:", err);
      }
    }
    const proj = localProjects.find((p) => p.id === id && p.user_id === user.id);
    if (!proj) {
      return res.status(404).json({ success: false, error: "Project not found" });
    }
    if (name !== void 0) proj.name = name.trim();
    if (description !== void 0) proj.description = (description || "").trim();
    if (status !== void 0) proj.status = status;
    if (startDate !== void 0) proj.start_date = startDate && startDate.trim() ? startDate : null;
    if (endDate !== void 0) proj.end_date = endDate && endDate.trim() ? endDate : null;
    proj.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    logAuditEvent(user.id, "PROJECT_UPDATED", "PROJECT", id, `Updated project: ${proj.name}`);
    res.json({ success: true, data: formatProject(proj, localTasks) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.put("/api/projects/:id", updateProjectHandler);
app.patch("/api/projects/:id", updateProjectHandler);
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { id } = req.params;
    if (supabase) {
      try {
        await supabase.from("tasks").delete().eq("project_id", id).eq("user_id", user.id);
        const { error } = await supabase.from("projects").delete().eq("id", id).eq("user_id", user.id);
        if (!error) {
          logAuditEvent(user.id, "PROJECT_DELETED", "PROJECT", id, `Deleted project and its tasks: ${id}`);
          return res.json({ success: true, data: { message: "Project deleted" } });
        }
      } catch (err) {
        console.warn("Supabase project delete fallback:", err);
      }
    }
    localProjects = localProjects.filter((p) => !(p.id === id && p.user_id === user.id));
    localTasks = localTasks.filter((t) => !(t.project_id === id && t.user_id === user.id));
    logAuditEvent(user.id, "PROJECT_DELETED", "PROJECT", id, `Deleted project and its tasks: ${id}`);
    res.json({ success: true, data: { message: "Project deleted" } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/tasks", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const search = (req.query.search || "").trim();
    const status = req.query.status;
    const priority = req.query.priority;
    const projectId = req.query.projectId;
    const sortBy = req.query.sortBy || "created_at";
    const order = req.query.order?.toLowerCase() === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
    const offset = (page - 1) * limit;
    if (supabase) {
      try {
        let query = supabase.from("tasks").select("*, project:projects(id, name)", { count: "exact" }).eq("user_id", user.id);
        if (status && status !== "ALL") {
          query = query.eq("status", status);
        }
        if (priority && priority !== "ALL") {
          query = query.eq("priority", priority);
        }
        if (projectId && projectId !== "ALL") {
          query = query.eq("project_id", projectId);
        }
        if (search) {
          query = query.ilike("name", `%${search}%`);
        }
        const validSortCols = {
          created_at: "created_at",
          createdAt: "created_at",
          name: "name",
          due_date: "due_date",
          dueDate: "due_date",
          priority: "priority",
          status: "status"
        };
        const sortCol = validSortCols[sortBy] || "created_at";
        query = query.order(sortCol, { ascending: order === "asc" });
        if (req.query.page || req.query.limit) {
          query = query.range(offset, offset + limit - 1);
        }
        const { data, error, count } = await query;
        if (!error && data) {
          return res.json({
            success: true,
            data: data.map((t) => formatTask(t)),
            pagination: { page, limit, total: count ?? data.length }
          });
        }
      } catch (e) {
        console.warn("Supabase tasks fetch error:", e);
      }
    }
    let list = localTasks.filter((t) => t.user_id === user.id);
    if (status && status !== "ALL") list = list.filter((t) => t.status === status);
    if (priority && priority !== "ALL") list = list.filter((t) => t.priority === priority);
    if (projectId && projectId !== "ALL") list = list.filter((t) => t.project_id === projectId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let valA = a.created_at;
      let valB = b.created_at;
      if (sortBy === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === "due_date" || sortBy === "dueDate") {
        valA = a.due_date || "";
        valB = b.due_date || "";
      }
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    });
    const total = list.length;
    if (req.query.page || req.query.limit) {
      list = list.slice(offset, offset + limit);
    }
    res.json({
      success: true,
      data: list.map((t) => formatTask(t, localProjects)),
      pagination: { page, limit, total }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { id } = req.params;
    if (supabase) {
      try {
        const { data, error } = await supabase.from("tasks").select("*, project:projects(id, name)").eq("id", id).eq("user_id", user.id).maybeSingle();
        if (!error && data) {
          return res.json({ success: true, data: formatTask(data) });
        }
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
      } catch (e) {
        console.warn("Supabase get task error:", e);
      }
    }
    const task = localTasks.find((t) => t.id === id && t.user_id === user.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    res.json({ success: true, data: formatTask(task, localProjects) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/tasks", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { name, description, priority, status, dueDate, projectId } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, error: "Task name is required" });
    }
    if (!projectId) {
      return res.status(400).json({ success: false, error: "Project is required" });
    }
    if (priority !== void 0) {
      const allowedPriorities = ["LOW", "MEDIUM", "HIGH"];
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          error: `Invalid priority. Must be one of: ${allowedPriorities.join(", ")}`
        });
      }
    }
    if (status !== void 0) {
      const allowedStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`
        });
      }
    }
    const cleanDueDate = dueDate && dueDate.trim() ? dueDate : null;
    const taskPriority = priority || "MEDIUM";
    const taskStatus = status || "PENDING";
    if (supabase) {
      try {
        const { data, error } = await supabase.from("tasks").insert({
          name: name.trim(),
          description: (description || "").trim(),
          priority: taskPriority,
          status: taskStatus,
          due_date: cleanDueDate ? new Date(cleanDueDate) : null,
          project_id: projectId,
          user_id: user.id
        }).select("*, project:projects(id, name)").single();
        if (!error && data) {
          logAuditEvent(user.id, "TASK_CREATED", "TASK", data.id, `Created task: ${data.name}`);
          return res.status(201).json({ success: true, data: formatTask(data) });
        }
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
      } catch (err) {
        console.warn("Supabase task insert fallback:", err);
      }
    }
    const newTask = {
      id: "task-" + Date.now(),
      project_id: projectId,
      name: name.trim(),
      description: (description || "").trim(),
      priority: taskPriority,
      status: taskStatus,
      due_date: cleanDueDate,
      user_id: user.id,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    localTasks.unshift(newTask);
    logAuditEvent(user.id, "TASK_CREATED", "TASK", newTask.id, `Created task: ${newTask.name}`);
    res.status(201).json({ success: true, data: formatTask(newTask, localProjects) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
var updateTaskHandler = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const id = String(req.params.id);
    const { name, description, priority, status, dueDate, projectId } = req.body;
    if (name !== void 0 && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ success: false, error: "Task name cannot be empty" });
    }
    if (priority !== void 0) {
      const allowedPriorities = ["LOW", "MEDIUM", "HIGH"];
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          error: `Invalid priority. Must be one of: ${allowedPriorities.join(", ")}`
        });
      }
    }
    if (status !== void 0) {
      const allowedStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`
        });
      }
    }
    if (supabase) {
      try {
        const updatePayload = {};
        if (name !== void 0) updatePayload.name = name.trim();
        if (description !== void 0) updatePayload.description = (description || "").trim();
        if (priority !== void 0) updatePayload.priority = priority;
        if (status !== void 0) updatePayload.status = status;
        if (dueDate !== void 0) updatePayload.due_date = dueDate && dueDate.trim() ? new Date(dueDate) : null;
        if (projectId !== void 0) updatePayload.project_id = projectId;
        const { data, error } = await supabase.from("tasks").update(updatePayload).eq("id", id).eq("user_id", user.id).select("*, project:projects(id, name)").single();
        if (!error && data) {
          logAuditEvent(user.id, "TASK_UPDATED", "TASK", id, `Updated task: ${data.name}`);
          return res.json({ success: true, data: formatTask(data) });
        }
        if (error) {
          return res.status(400).json({ success: false, error: error.message });
        }
      } catch (err) {
        console.warn("Supabase task update fallback:", err);
      }
    }
    const task = localTasks.find((t) => t.id === id && t.user_id === user.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    if (name !== void 0) task.name = name.trim();
    if (description !== void 0) task.description = (description || "").trim();
    if (priority !== void 0) task.priority = priority;
    if (status !== void 0) task.status = status;
    if (dueDate !== void 0) task.due_date = dueDate && dueDate.trim() ? dueDate : null;
    if (projectId !== void 0) task.project_id = projectId;
    task.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    logAuditEvent(user.id, "TASK_UPDATED", "TASK", id, `Updated task: ${task.name}`);
    res.json({ success: true, data: formatTask(task, localProjects) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.put("/api/tasks/:id", updateTaskHandler);
app.patch("/api/tasks/:id", updateTaskHandler);
app.patch("/api/tasks/:id/complete", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { id } = req.params;
    const targetStatus = req.body?.status || "COMPLETED";
    if (supabase) {
      try {
        const { data, error } = await supabase.from("tasks").update({ status: targetStatus }).eq("id", id).eq("user_id", user.id).select("*, project:projects(id, name)").single();
        if (!error && data) {
          logAuditEvent(
            user.id,
            targetStatus === "COMPLETED" ? "TASK_COMPLETED" : "TASK_REOPENED",
            "TASK",
            id,
            `Marked task ${targetStatus.toLowerCase()}: ${data.name}`
          );
          return res.json({ success: true, data: formatTask(data) });
        }
      } catch (err) {
        console.warn("Supabase task complete fallback:", err);
      }
    }
    const task = localTasks.find((t) => t.id === id && t.user_id === user.id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    task.status = targetStatus;
    task.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    logAuditEvent(
      user.id,
      targetStatus === "COMPLETED" ? "TASK_COMPLETED" : "TASK_REOPENED",
      "TASK",
      id,
      `Marked task ${targetStatus.toLowerCase()}: ${task.name}`
    );
    res.json({ success: true, data: formatTask(task, localProjects) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
        if (!error) {
          logAuditEvent(user.id, "TASK_DELETED", "TASK", id, `Deleted task: ${id}`);
          return res.json({ success: true, data: { message: "Task deleted" } });
        }
      } catch (err) {
        console.warn("Supabase task delete fallback:", err);
      }
    }
    localTasks = localTasks.filter((t) => !(t.id === id && t.user_id === user.id));
    logAuditEvent(user.id, "TASK_DELETED", "TASK", id, `Deleted task: ${id}`);
    res.json({ success: true, data: { message: "Task deleted" } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/audit-logs", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (supabase) {
      try {
        const { data, error } = await supabase.from("audit_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25);
        if (!error && data) {
          return res.json({ success: true, data });
        }
      } catch (e) {
      }
    }
    const logs = localAuditLogs.filter((l) => l.user_id === user.id).slice(0, 25);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/seed", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const starterProjects = [
      {
        name: "Website Redesign",
        description: "Overhaul corporate landing page, typography, and responsive navigation.",
        status: "IN_PROGRESS",
        start_date: /* @__PURE__ */ new Date(),
        end_date: new Date(Date.now() + 30 * 864e5),
        user_id: user.id
      },
      {
        name: "Mobile App MVP",
        description: "Cross-platform MVP with onboarding flows and offline task sync.",
        status: "IN_PROGRESS",
        start_date: new Date(Date.now() - 10 * 864e5),
        end_date: new Date(Date.now() + 45 * 864e5),
        user_id: user.id
      },
      {
        name: "Supabase Migration",
        description: "Plan database schema migration, connection pooling, and RLS policies.",
        status: "NOT_STARTED",
        start_date: /* @__PURE__ */ new Date(),
        end_date: new Date(Date.now() + 20 * 864e5),
        user_id: user.id
      }
    ];
    if (supabase) {
      const { data: createdProjects, error } = await supabase.from("projects").insert(starterProjects).select();
      if (!error && createdProjects && createdProjects.length > 0) {
        const starterTasks = [
          {
            project_id: createdProjects[0].id,
            name: "Fix mobile navigation drawer animation",
            description: "Address responsive layout transition on mobile screens.",
            priority: "HIGH",
            status: "PENDING",
            due_date: new Date(Date.now() + 5 * 864e5),
            user_id: user.id
          },
          {
            project_id: createdProjects[0].id,
            name: "Standardize typography & design tokens",
            description: "Refined font scales and layout paddings across components.",
            priority: "MEDIUM",
            status: "COMPLETED",
            due_date: new Date(Date.now() - 1 * 864e5),
            user_id: user.id
          },
          {
            project_id: createdProjects[1].id,
            name: "Implement user profile avatar upload",
            description: "Allow users to customize initials and profile colors.",
            priority: "MEDIUM",
            status: "IN_PROGRESS",
            due_date: new Date(Date.now() + 9 * 864e5),
            user_id: user.id
          },
          {
            project_id: createdProjects[2].id,
            name: "Configure connection pooling URI",
            description: "Setup PostgreSQL connection string with transaction mode.",
            priority: "HIGH",
            status: "PENDING",
            due_date: new Date(Date.now() + 12 * 864e5),
            user_id: user.id
          }
        ];
        await supabase.from("tasks").insert(starterTasks);
        return res.json({ success: true, message: "Sample data created successfully!" });
      }
    }
    res.json({ success: true, message: "Sample data ready" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
var copilotToolDefinitions = [
  {
    type: "function",
    function: {
      name: "createProject",
      description: "Create a new project for the authenticated user",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the project" },
          description: { type: "string", description: "Overview of the project" },
          status: {
            type: "string",
            enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
            description: "Project status"
          },
          startDate: { type: "string", description: "Start date" },
          endDate: { type: "string", description: "End date" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateProject",
      description: "Update an existing project owned by the user",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "UUID of project" },
          name: { type: "string", description: "Updated name" },
          description: { type: "string", description: "Updated description" },
          status: { type: "string", enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] }
        },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createTask",
      description: "Create a new task for the authenticated user",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Title of the task" },
          description: { type: "string", description: "Details about the task" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
          projectId: { type: "string", description: "UUID of project" },
          dueDate: { type: "string", description: "Due date" }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "completeTask",
      description: "Mark a task as completed",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "Task UUID" },
          taskName: { type: "string", description: "Name of task if UUID unknown" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listProjects",
      description: "List user projects",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listTasks",
      description: "List user tasks",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          status: { type: "string", enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getDashboardStats",
      description: "Get dashboard statistics",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];
async function executeAgentToolForUser(toolName, args, user) {
  if (toolName === "getDashboardStats") {
    if (supabase) {
      const { data: statsData, error } = await supabase.from("dashboard_stats").select("*").eq("user_id", user.id).maybeSingle();
      if (!error && statsData) {
        return statsData;
      }
      const [pRes, tRes] = await Promise.all([
        supabase.from("projects").select("id, status").eq("user_id", user.id),
        supabase.from("tasks").select("id, status").eq("user_id", user.id)
      ]);
      const p2 = pRes.data || [];
      const t2 = tRes.data || [];
      return {
        total_projects: p2.length,
        projects_in_progress: p2.filter((x) => x.status === "IN_PROGRESS").length,
        total_tasks: t2.length,
        completed_tasks: t2.filter((x) => x.status === "COMPLETED").length,
        pending_tasks: t2.filter((x) => x.status !== "COMPLETED").length
      };
    }
    const p = localProjects.filter((x) => x.user_id === user.id);
    const t = localTasks.filter((x) => x.user_id === user.id);
    return {
      total_projects: p.length,
      projects_in_progress: p.filter((x) => x.status === "IN_PROGRESS").length,
      total_tasks: t.length,
      completed_tasks: t.filter((x) => x.status === "COMPLETED").length,
      pending_tasks: t.filter((x) => x.status !== "COMPLETED").length
    };
  }
  if (toolName === "createProject") {
    const projName = args.name?.trim() || "New Project";
    if (supabase) {
      const { data, error } = await supabase.from("projects").insert({
        name: projName,
        description: args.description || null,
        status: args.status || "IN_PROGRESS",
        start_date: args.startDate ? new Date(args.startDate) : /* @__PURE__ */ new Date(),
        end_date: args.endDate ? new Date(args.endDate) : null,
        user_id: user.id
      }).select().single();
      if (!error && data) return { success: true, project: data };
    }
    const newP = {
      id: "proj-" + Date.now(),
      name: projName,
      description: args.description || "",
      status: args.status || "IN_PROGRESS",
      user_id: user.id,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    localProjects.unshift(newP);
    return { success: true, project: newP };
  }
  if (toolName === "updateProject") {
    if (supabase) {
      const updateData = {};
      if (args.name) updateData.name = args.name.trim();
      if (args.description !== void 0) updateData.description = args.description;
      if (args.status) updateData.status = args.status;
      const { data, error } = await supabase.from("projects").update(updateData).eq("id", args.projectId).eq("user_id", user.id).select().single();
      if (!error && data) return { success: true, project: data };
    }
    const p = localProjects.find((x) => x.id === args.projectId && x.user_id === user.id);
    if (p) {
      if (args.name) p.name = args.name.trim();
      if (args.description !== void 0) p.description = args.description;
      if (args.status) p.status = args.status;
      return { success: true, project: p };
    }
    return { error: "Project not found" };
  }
  if (toolName === "createTask") {
    let targetProjectId = args.projectId;
    if (!targetProjectId) {
      if (supabase) {
        const { data: firstP } = await supabase.from("projects").select("id").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
        targetProjectId = firstP?.id;
      }
      if (!targetProjectId) {
        const p = localProjects.find((x) => x.user_id === user.id);
        targetProjectId = p?.id;
      }
      if (!targetProjectId) {
        if (supabase) {
          const { data: newP } = await supabase.from("projects").insert({ name: "General", user_id: user.id }).select().single();
          targetProjectId = newP?.id;
        } else {
          const newP = {
            id: "proj-" + Date.now(),
            name: "General",
            description: "Default project",
            status: "IN_PROGRESS",
            user_id: user.id,
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          localProjects.unshift(newP);
          targetProjectId = newP.id;
        }
      }
    }
    const taskName = args.name?.trim() || "New Task";
    if (supabase) {
      const { data, error } = await supabase.from("tasks").insert({
        name: taskName,
        description: args.description || "Created via Momentum Copilot",
        priority: args.priority || "MEDIUM",
        status: args.status || "PENDING",
        project_id: targetProjectId,
        due_date: args.dueDate ? new Date(args.dueDate) : new Date(Date.now() + 7 * 864e5),
        user_id: user.id
      }).select("*, project:projects(id, name)").single();
      if (!error && data) return { success: true, task: data };
    }
    const newT = {
      id: "task-" + Date.now(),
      project_id: targetProjectId,
      name: taskName,
      description: args.description || "Created via Momentum Copilot",
      priority: args.priority || "MEDIUM",
      status: args.status || "PENDING",
      due_date: new Date(Date.now() + 7 * 864e5).toISOString(),
      user_id: user.id,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    localTasks.unshift(newT);
    return { success: true, task: newT };
  }
  if (toolName === "completeTask") {
    if (args.taskId) {
      if (supabase) {
        const { data, error } = await supabase.from("tasks").update({ status: "COMPLETED" }).eq("id", args.taskId).eq("user_id", user.id).select().single();
        if (!error && data) return { success: true, completedTask: data };
      }
      const t = localTasks.find((x) => x.id === args.taskId && x.user_id === user.id);
      if (t) {
        t.status = "COMPLETED";
        return { success: true, completedTask: t };
      }
    } else if (args.taskName) {
      const term = args.taskName.toLowerCase().trim();
      if (supabase) {
        const { data: matched } = await supabase.from("tasks").select("id, name").eq("user_id", user.id).ilike("name", `%${term}%`).neq("status", "COMPLETED").limit(1);
        if (matched && matched[0]) {
          const { data } = await supabase.from("tasks").update({ status: "COMPLETED" }).eq("id", matched[0].id).select().single();
          return { success: true, completedTask: data };
        }
      }
      const t = localTasks.find(
        (x) => x.user_id === user.id && x.name.toLowerCase().includes(term) && x.status !== "COMPLETED"
      );
      if (t) {
        t.status = "COMPLETED";
        return { success: true, completedTask: t };
      }
    }
    return { success: false, message: "No matching pending task found" };
  }
  if (toolName === "listProjects") {
    if (supabase) {
      let q = supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (args.status) q = q.eq("status", args.status);
      const { data } = await q.limit(10);
      return { projects: data || [] };
    }
    let p = localProjects.filter((x) => x.user_id === user.id);
    if (args.status) p = p.filter((x) => x.status === args.status);
    return { projects: p };
  }
  if (toolName === "listTasks") {
    if (supabase) {
      let q = supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (args.projectId) q = q.eq("project_id", args.projectId);
      if (args.status) q = q.eq("status", args.status);
      if (args.priority) q = q.eq("priority", args.priority);
      const { data } = await q.limit(15);
      return { tasks: data || [] };
    }
    let t = localTasks.filter((x) => x.user_id === user.id);
    if (args.projectId) t = t.filter((x) => x.project_id === args.projectId);
    if (args.status) t = t.filter((x) => x.status === args.status);
    if (args.priority) t = t.filter((x) => x.priority === args.priority);
    return { tasks: t };
  }
  return { error: "Unknown tool: " + toolName };
}
app.post("/api/agent/chat", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized. Please sign in." });
    }
    if (!checkRateLimit(user.id)) {
      return res.status(429).json({
        success: false,
        error: "Rate limit reached (max 20 queries/minute). Please wait a moment."
      });
    }
    const { message, conversationHistory = [] } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, error: "Message is required" });
    }
    if (supabase) {
      try {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          role: "user",
          content: message
        });
      } catch {
      }
    }
    if (groq) {
      try {
        const messages = [
          {
            role: "system",
            content: `You are Momentum Copilot, an AI assistant for project and task management.
You are helping ${user.fullName} (user ID: ${user.id}).
Always invoke tools when the user asks to create projects, create tasks, complete tasks, list items, or check metrics.
Be concise, proactive, and clear.`
          }
        ];
        if (Array.isArray(conversationHistory)) {
          for (const msg of conversationHistory.slice(-6)) {
            if (msg.role === "user" || msg.role === "assistant") {
              messages.push({ role: msg.role, content: msg.content });
            }
          }
        }
        messages.push({ role: "user", content: message });
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages,
          tools: copilotToolDefinitions,
          tool_choice: "auto"
        });
        const choice = completion.choices[0];
        const toolCalls = choice?.message?.tool_calls;
        let finalReply = choice?.message?.content || "";
        let executedToolData = null;
        if (toolCalls && toolCalls.length > 0) {
          executedToolData = toolCalls;
          const followUpMessages = [...messages, choice.message];
          for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch {
            }
            const toolResult = await executeAgentToolForUser(toolName, args, user);
            followUpMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          }
          const secondCompletion = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: followUpMessages
          });
          finalReply = secondCompletion.choices[0]?.message?.content || "Action executed successfully!";
        }
        if (supabase) {
          try {
            await supabase.from("chat_messages").insert({
              user_id: user.id,
              role: "assistant",
              content: finalReply,
              tool_call_data: executedToolData
            });
          } catch {
          }
        }
        return res.json({ success: true, data: { reply: finalReply } });
      } catch (groqErr) {
        console.warn("Groq LLM call error, falling back to rule engine:", groqErr.message);
      }
    }
    const lower = message.toLowerCase();
    let reply = "";
    if (lower.includes("task") && (lower.includes("create") || lower.includes("add"))) {
      const match = message.match(/(?:task|called|named)[:\s]+"([^"]+)"/i) || message.match(/task\s+([^,]+)/i);
      const name = match ? match[1].trim() : "New Task";
      const priority = lower.includes("high") ? "HIGH" : lower.includes("low") ? "LOW" : "MEDIUM";
      await executeAgentToolForUser("createTask", { name, priority }, user);
      reply = `I have created the task "${name}" with ${priority} priority for you.`;
    } else if (lower.includes("complete") || lower.includes("done") || lower.includes("finish")) {
      const match = message.match(/(?:task|called|named)[:\s]+"([^"]+)"/i) || message.match(/(?:complete|finish)\s+([^,]+)/i);
      const name = match ? match[1].trim() : "";
      const result = await executeAgentToolForUser("completeTask", { taskName: name }, user);
      reply = result.success ? `Marked task as completed!` : `Could not find a matching pending task.`;
    } else if (lower.includes("project") && (lower.includes("create") || lower.includes("add"))) {
      const match = message.match(/(?:project|called|named)[:\s]+"([^"]+)"/i) || message.match(/project\s+([^,]+)/i);
      const name = match ? match[1].trim() : "New Project";
      await executeAgentToolForUser("createProject", { name }, user);
      reply = `I have created the project "${name}" for you!`;
    } else if (lower.includes("stat") || lower.includes("summary") || lower.includes("progress")) {
      const stats = await executeAgentToolForUser("getDashboardStats", {}, user);
      reply = `You currently have ${stats.total_projects} total projects (${stats.projects_in_progress} in progress) and ${stats.total_tasks} tasks (${stats.completed_tasks} completed).`;
    } else {
      reply = `I'm Momentum Copilot. You can ask me to create tasks, complete tasks, create projects, or view your progress!`;
    }
    res.json({ success: true, data: { reply } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Momentum running on http://localhost:${PORT}`);
  });
}
var server_default = app;
if (process.env.VERCEL !== "1" && !process.env.NOW_REGION) {
  startServer();
}
export {
  server_default as default
};
