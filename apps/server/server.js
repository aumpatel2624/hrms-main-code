// Must stay the first import: it registers the soft-delete plugin, which only
// reaches models compiled after it. See models/softDelete.js.
import "./models/softDelete.js";
// Second, for the same reason: the audit plugin only reaches models compiled
// after it, and both files throw on boot rather than silently skipping a model.
import "./models/auditPlugin.js";

import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import hpp from "hpp";
import session from "express-session";
import { setupSwagger } from "./config/swagger.js";

// ============ SECURITY IMPORTS ============
// OWASP-compliant security middleware
import {
  securityHeaders,
  additionalSecurityHeaders,
  getCorsConfig,
  sanitizeErrors
} from "./middlewares/securityHeaders.js";
import {
  mongoSanitizer,
  loginValidation,
  searchValidation,
  allowOnlyFields,
  allowedLoginFields,
  allowedSearchFields
} from "./middlewares/inputValidator.js";

// ES6 module equivalent of __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

global.__basedir = __dirname;

// Create log directory if it doesn't exist
if (!fs.existsSync("log")) {
  fs.mkdirSync("log");
}

// Global error handling to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  logError(error);
  // Don't exit the process, let it continue running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  logError({ message: "Unhandled Promise Rejection", error: reason });
  // Don't exit the process, let it continue running
});

// Function to log errors
function logError(error) {
  let filedata = {
    datetime: new Date(),
    message: error?.message,
    stack: error?.stack,
  };
  try {
    let writecontent = [];
    if (fs.existsSync("log/error.html")) {
      let filedata = fs.readFileSync("log/error.html");
      if (filedata) {
        try {
          writecontent = JSON.parse(filedata);
        } catch {
          // If parsing fails, start with empty array
          writecontent = [];
        }
      }
    }
    writecontent.push(filedata);
    fs.writeFileSync("log/error.html", JSON.stringify(writecontent));
  } catch (err) {
    console.error("Error logging to file:", err);
  }
}

const app = express();
let databasestatus = "In-Progress";

// Behind a reverse proxy (nginx in production), the connection Express sees is
// plain HTTP even when the browser is on HTTPS. Without this, `req.secure` is
// false, and express-session silently refuses to send a `secure: true` cookie —
// login returns 200, no Set-Cookie is issued, and the user bounces straight
// back to the login page.
//
// 1 = trust exactly one proxy hop (nginx on this host). Never `true`: that
// trusts any X-Forwarded-For a client sends, which lets the rate limiter and
// the audit trail be fed a spoofed IP.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ============ SECURITY MIDDLEWARE (Apply FIRST) ============
// 1. Security Headers (Helmet + custom headers)
app.use(securityHeaders);
app.use(additionalSecurityHeaders);

// 2. CORS configuration (more restrictive than before)
// Extra production origins come from ALLOWED_ORIGINS (comma separated)
const extraOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const corsConfig = getCorsConfig(extraOrigins);
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));

// 3. Body Parsing with size limits (OWASP: limit request body size)
app.use(bodyParser.json({ limit: "10mb" })); // Reduced from 50mb for security
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// 4. MongoDB NoSQL Injection Protection
app.use(mongoSanitizer);

// 5. HTTP Parameter Pollution Prevention
app.use(hpp());

// 6. Express Session - MongoDB Session Storage (persistent)
import MongoStore from "connect-mongo";

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours in seconds
    autoRemove: 'native', // Use MongoDB TTL index for cleanup
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevents XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // CSRF protection
  }
}));

console.log("✅ Express session middleware configured (MongoDB storage)");

// 7. Audit context — must come after the session (it reads req.session.user)
// and before the routers. Every write made inside a logged-in request is
// recorded; anything without a session user writes nothing. See
// utils/auditContext.js.
import { auditContextMiddleware } from "./utils/auditContext.js";
app.use(auditContextMiddleware);

// ============ STATIC FILE SERVING ============
app.use("/uploads", express.static("uploads"));
// NOTE: Removed /log static serving for security - logs should not be publicly accessible

mongoose.set("strictQuery", false);
mongoose.set("debug", true);

const dbURI = process.env.DATABASE;

mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("✅ DB connected");
    databasestatus = "Connected";

    // ADR-024 (Q-5): dependency-free background scheduler — no node-cron
    // (AGENTS.md forbids new dependencies without asking). Single process
    // only, see jobs/leaveScheduler.js. Fire once shortly after boot so a
    // long-stopped dev server catches up same-day without waiting for the
    // first 5-minute tick, then on the regular interval. Both fire-and-forget
    // with their own error handling — never block/crash server startup.
    setTimeout(() => {
      runDueJobs().catch((error) => console.error("leaveScheduler: initial run failed:", error));
    }, 10_000);
    setInterval(() => {
      runDueJobs().catch((error) => console.error("leaveScheduler: scheduled run failed:", error));
    }, 5 * 60 * 1000);

    // ADR-025: processAutoAttendance — the third of ADR-016's three named
    // background jobs (Leaves already built the other two categories, above).
    // A separate, independent runner (its own SchedulerRunLog jobName, its
    // own setTimeout/setInterval) rather than folded into leaveScheduler's
    // own JOBS array — the two runners are not sequentially coupled.
    setTimeout(() => {
      runDueAttendanceJobs().catch((error) => console.error("attendanceScheduler: initial run failed:", error));
    }, 10_000);
    setInterval(() => {
      runDueAttendanceJobs().catch((error) => console.error("attendanceScheduler: scheduled run failed:", error));
    }, 5 * 60 * 1000);
  })
  .catch((err) => {
    console.error("❌ DB Connection Error =>", err);
    if (err instanceof mongoose.Error.MongooseServerSelectionError) {
      console.error(
        "Server selection failed. Check network, URI, and Atlas IP whitelist.",
      );
    }
  });

// Optional: handle runtime disconnects
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ DB disconnected!");
});

mongoose.connection.on("reconnected", () => {
  console.log("♻️ DB reconnected!");
});

// ============ ADDITIONAL MIDDLEWARE ============
// Development request logging (disable in production for performance)
app.use(morgan("dev"));
app.use(express.static("files"));

// Setup Swagger documentation (consider disabling in production)
setupSwagger(app);

// ============ V1 ROUTES ============
// Import v1 routes
import authRoutes from "./routes/v1/auth.routes.js";
import adminUsersRoutes from "./routes/v1/adminUsers.routes.js";
import usersRoutes from "./routes/v1/users.routes.js";
import userRolesRoutes from "./routes/v1/userRoles.routes.js";
import currenciesRoutes from "./routes/v1/currencies.routes.js";
import departmentsRoutes from "./routes/v1/departments.routes.js";
import organizationSetupRoutes from "./routes/v1/organizationSetup.routes.js";
import employeeRoutes from "./routes/v1/employee.routes.js";
import emailsRoutes from "./routes/v1/emails.routes.js";
import locationsRoutes from "./routes/v1/locations.routes.js";
import menusRoutes from "./routes/v1/menus.routes.js";
import rolesRoutes from "./routes/v1/roles.routes.js";
import dashboardsRoutes from "./routes/v1/dashboards.routes.js";
import otpRoutes from "./routes/v1/otp.routes.js";
import seoRoutes from "./routes/v1/seo.routes.js";
import auditLogsRoutes from "./routes/v1/auditLogs.routes.js";
import recruitmentPipelineRoutes from "./routes/v1/recruitmentPipeline.routes.js";
import interviewsRoutes from "./routes/v1/interviews.routes.js";
import jobOffersRoutes from "./routes/v1/jobOffers.routes.js";
import onboardingRoutes from "./routes/v1/onboarding.routes.js";
import separationRoutes from "./routes/v1/separation.routes.js";
import employeeCareerEventsRoutes from "./routes/v1/employeeCareerEvents.routes.js";
import trainingSkillsRoutes from "./routes/v1/trainingSkills.routes.js";
import travelRoutes from "./routes/v1/travel.routes.js";
import leavesRoutes from "./routes/v1/leaves.routes.js";
import leavesTransactionsRoutes from "./routes/v1/leavesTransactions.routes.js";
import shiftAttendanceRoutes from "./routes/v1/shiftAttendance.routes.js";
import shiftAttendanceTransactionsRoutes from "./routes/v1/shiftAttendanceTransactions.routes.js";
import payrollRoutes from "./routes/v1/payroll.routes.js";
import attendanceRoutes from "./routes/v1/attendance.routes.js";
import seoPublicRoutes from "./routes/v1/seoPublic.routes.js";
import jobsPublicRoutes from "./routes/v1/jobsPublic.routes.js";
import { runDueJobs } from "./jobs/leaveScheduler.js";
import { runDueJobs as runDueAttendanceJobs } from "./jobs/attendanceScheduler.js";

app.use("/api/v1", authRoutes);
app.use("/api/v1", adminUsersRoutes);
app.use("/api/v1", usersRoutes);
app.use("/api/v1", userRolesRoutes);
app.use("/api/v1", currenciesRoutes);
app.use("/api/v1", departmentsRoutes);
app.use("/api/v1", organizationSetupRoutes);
app.use("/api/v1", employeeRoutes);
app.use("/api/v1", emailsRoutes);
app.use("/api/v1", locationsRoutes);
app.use("/api/v1", menusRoutes);
app.use("/api/v1", rolesRoutes);
app.use("/api/v1", dashboardsRoutes);
app.use("/api/v1", seoRoutes);
app.use("/api/v1", auditLogsRoutes);
app.use("/api/v1", recruitmentPipelineRoutes);
app.use("/api/v1", interviewsRoutes);
app.use("/api/v1", jobOffersRoutes);
app.use("/api/v1", onboardingRoutes);
app.use("/api/v1", separationRoutes);
app.use("/api/v1", employeeCareerEventsRoutes);
app.use("/api/v1", trainingSkillsRoutes);
app.use("/api/v1", travelRoutes);
app.use("/api/v1", leavesRoutes);
app.use("/api/v1", leavesTransactionsRoutes);
app.use("/api/v1", attendanceRoutes);
app.use("/api/v1", shiftAttendanceRoutes);
app.use("/api/v1", shiftAttendanceTransactionsRoutes);
app.use("/api/v1", payrollRoutes);
app.use("/api/v1/otp", otpRoutes);

// Unauthenticated on purpose — the public website has no session. See
// routes/v1/seoPublic.routes.js for why, and what is guarded instead.
app.use("/api/v1", seoPublicRoutes);
// Second public router (ADR-019) — same reasoning, different shape (a
// listing, not resolve-by-key). See routes/v1/jobsPublic.routes.js.
app.use("/api/v1", jobsPublicRoutes);

console.log("✅ V1 API routes loaded");

app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "API server is running",
    database: databasestatus,
    timestamp: new Date().toISOString(),
  });
});

app.use("/", express.static(path.join(__dirname, "/out/admin")));

app.get("/*", async (req, res) => {
  res.sendFile(path.join(__dirname, "/out/admin", "index.html"));
});

// ============ ERROR HANDLING ============
// Use the secure error sanitizer (prevents information leakage)
app.use(sanitizeErrors);

// Fallback error handler that logs errors but doesn't expose details
// eslint-disable-next-line no-unused-vars
app.use(async (err, req, res, _next) => {
  // Log error to file for debugging
  const errorData = {
    datetime: new Date().toISOString(),
    message: err?.message,
    path: req?.path,
    method: req?.method,
    ip: req?.ip,
    // Don't log full stack trace to file in production
    stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
  };

  try {
    let writecontent = [];
    if (fs.existsSync("log/error.html")) {
      const filedata = fs.readFileSync("log/error.html", 'utf8');
      if (filedata) {
        try {
          writecontent = JSON.parse(filedata);
        } catch {
          writecontent = [];
        }
      }
    }

    // Keep only last 100 errors to prevent log file from growing too large
    if (writecontent.length > 100) {
      writecontent = writecontent.slice(-100);
    }

    writecontent.push(errorData);
    fs.writeFileSync("log/error.html", JSON.stringify(writecontent, null, 2));
  } catch (logErr) {
    console.error("Error logging to file:", logErr);
  }

  // SECURITY: Don't expose internal error details to users
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    isOk: false,
    status: 500,
    error: 'Internal Server Error',
    message: isProduction ? 'An unexpected error occurred' : err?.message,
  });
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
  console.log(`🔒 Security middleware enabled: Helmet, Input Validation, CSRF Protection`);
});
