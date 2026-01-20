// routes/studentRoutes.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const router = express.Router();

// DB bağlantısı
let db;
(async () => {
  db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log("✅ DB connected (studentRoutes)");
})();

// Mail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// 1) Öğrenci Kayıt
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Tüm alanları doldurun" });
    }

    // Email zaten var mı?
    const [exist] = await db.query("SELECT 1 FROM students WHERE email = ?", [
      email,
    ]);
    if (exist.length) {
      return res.status(400).json({ message: "Bu email zaten kayıtlı" });
    }

    // Kod ve hash
    const code = crypto.randomInt(100000, 999999).toString();
    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO students
         (full_name, email, password, verification_code)
       VALUES (?, ?, ?, ?)`,
      [fullName, email, hashed, code]
    );

    await transporter.sendMail({
      from: `"ClassConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "ClassConnect Email Verification",
      html: `<h2>Doğrulama Kodu</h2>
             <p>Merhaba ${fullName},</p>
             <h3>${code}</h3>
             <p>10 dakika içinde geçerlidir.</p>`,
    });

    return res.json({
      success: true,
      message: "Doğrulama kodu email adresinize gönderildi",
      email,
    });
  } catch (err) {
    console.error("Student register error:", err);
    return res.status(500).json({ message: "Kayıt sırasında hata oluştu" });
  }
});

// 2) Öğrenci Doğrulama
router.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email ve kod gerekli" });
    }

    const [rows] = await db.query(
      `SELECT * FROM students
       WHERE email = ? AND verification_code = ?`,
      [email, code]
    );
    if (!rows.length) {
      return res.status(400).json({ message: "Geçersiz email veya kod" });
    }

    await db.query("UPDATE students SET is_verified = TRUE WHERE email = ?", [
      email,
    ]);

    req.login(rows[0], (err) => {
      if (err) {
        console.error("Student login error:", err);
        return res.status(500).json({ message: "Oturum hatası" });
      }
      // doğrulama sonrası yönlendirme
      return res.json({
        success: true,
        redirect: "/pages/student_profile.html",
      });
    });
  } catch (err) {
    console.error("Student verify error:", err);
    return res.status(500).json({ message: "Doğrulama sırasında hata oluştu" });
  }
});

// ─── 3) Öğrenci/Öğretmen Login ───────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email ve şifre gerekli" });
    }

    const lowerEmail = email.trim().toLowerCase();
    const isTeacher = lowerEmail.endsWith(".edu.tr");
    const table = isTeacher ? "teachers" : "students";

    const [rows] = await db.query(`SELECT * FROM ${table} WHERE email = ?`, [
      lowerEmail,
    ]);
    if (!rows.length) {
      return res.status(400).json({ message: "Email veya şifre hatalı" });
    }
    const user = rows[0];

    if (!user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Email veya şifre hatalı" });
    }
    if (!user.is_verified) {
      return res.status(400).json({ message: "Hesabınız doğrulanmadı" });
    }

    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Oturum hatası" });
      }
      // ◀ BURASI DEĞİŞTİRİLDİ:
      const redirect = isTeacher
        ? "/pages/teacher_dashboard.html"
        : "/pages/student_dashboard.html";

      res.json({ success: true, message: "Giriş başarılı", redirect });
    });
  } catch (err) {
    console.error("Login exception:", err);
    res.status(500).json({ message: "Giriş sırasında hata oluştu" });
  }
});

export default router;
