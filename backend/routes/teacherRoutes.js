// routes/teacherRoutes.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env"),
});
const router = express.Router();

// DB
let db;
(async () => {
  db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log("✅ DB connected (teacherRoutes)");
})();

// Mailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// 1) Kayıt
router.post("/register", async (req, res) => {
  try {
    const { fullName, email: rawEmail, password } = req.body;
    const email = rawEmail.trim().toLowerCase();
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Tüm alanları doldurun" });
    }
    if (!email.endsWith(".edu.tr")) {
      return res.status(400).json({ message: ".edu.tr uzantılı email girin" });
    }
    const [exist] = await db.query("SELECT 1 FROM teachers WHERE email=?", [
      email,
    ]);
    if (exist.length) {
      return res.status(400).json({ message: "Bu email zaten kayıtlı" });
    }
    const code = crypto.randomInt(100000, 999999).toString();
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO teachers
         (full_name,email,password,verification_code,code_generated_at)
       VALUES(?,?,?,?,NOW())`,
      [fullName, email, hashed, code]
    );
    await transporter.sendMail({
      from: `"ClassConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Öğretmen Doğrulama Kodu",
      html: `<p>Merhaba ${fullName},</p><h3>${code}</h3><p>10 dk geçerli.</p>`,
    });
    res.json({ success: true, message: "Kod emailinize gönderildi", email });
  } catch (err) {
    console.error("Teacher register error:", err);
    res.status(500).json({ message: "Kayıt sırasında hata oluştu" });
  }
});

// 2) Doğrulama & Oturum açma
router.post("/verify", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const code = req.body.code;
    const [rows] = await db.query(
      `SELECT * FROM teachers
       WHERE email=? AND verification_code=? 
         AND code_generated_at>DATE_SUB(NOW(),INTERVAL 10 MINUTE)`,
      [email, code]
    );
    if (!rows.length) {
      return res.status(400).json({ message: "Geçersiz kod veya email" });
    }
    await db.query("UPDATE teachers SET is_verified=1 WHERE email=?", [email]);
    const teacher = {
      t_id: rows[0].t_id,
      full_name: rows[0].full_name,
      email: rows[0].email,
    };
    req.login(teacher, (err) => {
      if (err) {
        console.error("Teacher login error:", err);
        return res
          .status(500)
          .json({ message: "Oturum açılırken hata oluştu" });
      }
      res.json({ success: true, redirect: "/pages/teacher_profile_edit.html" });
    });
  } catch (err) {
    console.error("Teacher verify error:", err);
    res.status(500).json({ message: "Doğrulama sırasında hata oluştu" });
  }
});

// 3) Listeleme (onaylı öğretmenler)
router.get("/list", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t_id,full_name,email,phone_number,profile_photo,about_me,
             lesson_prices,availability,university,faculty,department,location
      FROM teachers
      WHERE is_verified=1
    `);
    res.json({ success: true, teachers: rows });
  } catch (err) {
    console.error("Teacher list error:", err);
    res
      .status(500)
      .json({ success: false, message: "Öğretmen listesi alınamadı." });
  }
});

export default router;
