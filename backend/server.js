// server.js
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import cron from "node-cron";

import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";

import studentRouter from "./routes/studentRoutes.js";
import teacherRouter from "./routes/teacherRoutes.js";
import studentProfileRoutes from "./routes/studentProfileRoutes.js";
import teacherProfileRoutes from "./routes/teacherProfileRoutes.js";
import forgotPasswordRoutes from "./routes/forgotPasswordRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import liveSessionRoutes from "./routes/liveSessionRoutes.js";


import { createServer } from "http";
import { Server as SocketIO } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const server = createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: ["https://classconnect.com.tr"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["https://classconnect.com.tr", "https://127.0.0.1", "https://classconnect.com.tr"],
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

let db;
(async () => {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    process.exit(1);
  }
})();

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://classconnect.com.tr/auth/google/callback",
      prompt: "select_account",
    },
    async (_, __, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase();
        const fullName = profile.displayName;
        const [rows] = await db.query(
          "SELECT * FROM students WHERE email = ?",
          [email]
        );
        if (rows.length) return done(null, rows[0]);
        const tempPwd = crypto.randomBytes(16).toString("hex");
        const hashed = await bcrypt.hash(tempPwd, 10);
        const [ins] = await db.query(
          "INSERT INTO students (full_name,email,password,is_verified,google_id) VALUES(?,?,?,?,?)",
          [fullName, email, hashed, true, profile.id]
        );
        const [newU] = await db.query("SELECT * FROM students WHERE s_id = ?", [
          ins.insertId,
        ]);
        done(null, newU[0]);
      } catch (err) {
        done(err);
      }
    }
  )
);

passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: "https://classconnect.com.tr/auth/microsoft/callback",
      tenant: "common",
      scope: ["user.read"],
    },
    async (_, __, profile, done) => {
      try {
        const email = profile._json.userPrincipalName.toLowerCase();
        if (!email.endsWith(".edu.tr")) {
          return done(null, false, {
            message: "Sadece .edu.tr uzantılı hesaplar kabul edilir.",
          });
        }
        const [rows] = await db.query(
          "SELECT * FROM teachers WHERE email = ?",
          [email]
        );
        if (rows.length) return done(null, rows[0]);
        const tempPwd = crypto.randomBytes(16).toString("hex");
        const hashed = await bcrypt.hash(tempPwd, 10);
        const [ins] = await db.query(
          "INSERT INTO teachers (full_name,email,password,is_verified,google_id) VALUES(?,?,?,?,?)",
          [profile.displayName, email, hashed, true, profile.id]
        );
        const [newT] = await db.query("SELECT * FROM teachers WHERE t_id = ?", [
          ins.insertId,
        ]);
        done(null, newT[0]);
      } catch (err) {
        done(err);
      }
    }
  )
);

app.use("/api", studentRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/student", studentProfileRoutes);
app.use("/api/teacher/profile", teacherProfileRoutes);
app.use("/api/forgot-password", forgotPasswordRoutes);
app.use("/api", appointmentRoutes);
app.use("/api", liveSessionRoutes);

app.get('/', (req, res) => {
  res.redirect('/pages');
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/pages/login.html" }),
  (req, res) => res.redirect("/pages/student_dashboard.html")
);

app.get(
  "/auth/microsoft",
  passport.authenticate("microsoft", { prompt: "select_account" })
);
app.get(
  "/auth/microsoft/callback",
  passport.authenticate("microsoft", { failureRedirect: "/pages/login.html" }),
  (req, res) => res.redirect("/pages/teacher_dashboard.html")
);
app.get("/api/session", (req, res) => {
  if (!req.user) {
    return res.json({ loggedIn: false });
  }

  const email = req.user.email || null;
  res.json({
    loggedIn: true,
    email: email
  });
});
app.get("/api/logout", (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ success: false });
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email ve şifre zorunlu" });
  }
  try {
    const e = email.trim().toLowerCase();
    const isTch = e.endsWith(".edu.tr");
    const table = isTch ? "teachers" : "students";
    const [rows] = await db.query(`SELECT * FROM ${table} WHERE email = ?`, [
      e,
    ]);
    if (!rows.length)
      return res
        .status(400)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password || "");
    if (!match)
      return res.status(400).json({ success: false, message: "Şifre hatalı" });
    req.login(user, (err) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Oturum hatası" });
      const redirect = isTch
        ? "/pages/teacher_dashboard.html"
        : "/pages/student_dashboard.html";
      res.json({ success: true, redirect });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

app.get("/api/check-session", (req, res) => {
  if (!req.user) {
    return res.json({ success: false });
  }
  const { s_id, t_id } = req.user;
  res.json({ success: true, user: { s_id, t_id } });
});

app.all("/api/*", (_, res) => {
  res.status(404).json({ success: false, message: "API endpoint bulunamadı" });
});

app.use((err, _, res, __) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: "Sunucu hatası", error: err.message });
});

const PORT = process.env.PORT || 80;
server.listen(PORT, '0.0.0.0', () =>
  console.log(`✅ Server running on https://localhost:${PORT}`)
);

cron.schedule("*/2 * * * *", async () => {
  console.log("⏰ Cron: live_sessions kontrol ediliyor...");
  try {
    const [appointments] = await db.query(`
      SELECT a.* FROM appointments a
      LEFT JOIN live_sessions ls
        ON a.teacher_id = ls.teacher_id
       AND a.student_id = ls.student_id
       AND DATE(ls.created_at) = CURDATE()
      WHERE
        a.status = 'confirmed'
        AND a.appointment_date = CURDATE()
        AND TIMESTAMPDIFF(MINUTE, NOW(), CONCAT(a.appointment_date, ' ', a.start_time)) BETWEEN 0 AND 20
        AND ls.session_id IS NULL
    `);
    for (const a of appointments) {
      const [result] = await db.query(
        "INSERT INTO live_sessions (teacher_id, student_id, lesson_slot_id) VALUES (?, ?, 0)",
        [a.teacher_id, a.student_id]
      );
      console.log(
        `✅ Canlı oturum oluşturuldu: #${result.insertId} (appointment_id: ${a.id})`
      );
    }
  } catch (err) {
    console.error("❌ Cron job hatası:", err);
  }
});
const activeSessions = new Map();

io.on("connection", (socket) => {
  console.log("📡 Yeni bağlantı:", socket.id);

  socket.on("joinSession", ({ sessionId, role }) => {
    socket.join(sessionId);
    console.log(`${role} katıldı → #${sessionId}`);
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {});
    }
    activeSessions.get(sessionId)[role] = socket.id;
  });

  socket.on("studentExited", ({ sessionId }) => {
    console.log(`🚶‍♂️ Öğrenci çıktı: #${sessionId}`);

    setTimeout(() => {
      io.to(sessionId).emit("redirectBoth");
    }, 10000);
  });

  socket.on("disconnect", () => {
    console.log("❌ Bağlantı koptu:", socket.id);
  });
});
