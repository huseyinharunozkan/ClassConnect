import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log("✅ DB connected (forgotPasswordRoutes)");
})();

// Email transporter (Gmail üzerinden)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * 1) POST /api/forgot-password/request
 *    Kullanıcının emailine 6 haneli kod gönderir.
 */
router.post("/request", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email zorunludur." });
  }

  try {
    // Önce teachers tablosunda bak
    let [rows] = await db.query("SELECT t_id FROM teachers WHERE email = ?", [
      email,
    ]);
    let table = "teachers";
    if (!rows.length) {
      // Öğrenciler tablosunda ara
      [rows] = await db.query("SELECT s_id FROM students WHERE email = ?", [
        email,
      ]);
      table = "students";
    }
    if (!rows.length) {
      return res
        .status(404)
        .json({ message: "Bu email ile kayıtlı kullanıcı bulunamadı." });
    }

    // 6 haneli kod oluştur
    const code = crypto.randomInt(100000, 999999).toString();

    // Kodu veritabanına kaydet
    await db.query(
      `UPDATE ${table} SET verification_code = ? WHERE email = ?`,
      [code, email]
    );

    // Kodlu email gönder
    await transporter.sendMail({
      from: `"ClassConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "ClassConnect Şifre Yenileme Kodu",
      html: `<p>Şifre yenileme kodunuz:</p><h3>${code}</h3><p>Bu kod 10 dakika içinde geçerlidir.</p>`,
    });

    res.json({ message: "Doğrulama kodu emailinize gönderildi." });
  } catch (err) {
    console.error("Forgot-password request error:", err);
    res
      .status(500)
      .json({ message: "Kod gönderilirken sunucu hatası oluştu." });
  }
});

/**
 * 2) POST /api/forgot-password/verify
 *    Kullanıcının girdiği kodu kontrol eder.
 */
router.post("/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: "Email ve kod zorunludur." });
  }

  try {
    // teachers tablosunda kodu kontrol et
    let [rows] = await db.query(
      "SELECT verification_code FROM teachers WHERE email = ?",
      [email]
    );
    let table = "teachers";
    if (!rows.length) {
      // öğrenciler tablosuna bak
      [rows] = await db.query(
        "SELECT verification_code FROM students WHERE email = ?",
        [email]
      );
      table = "students";
    }
    if (!rows.length) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    if (rows[0].verification_code !== code) {
      return res.status(400).json({ message: "Kod geçersiz." });
    }

    res.json({ message: "Kod doğrulandı." });
  } catch (err) {
    console.error("Forgot-password verify error:", err);
    res
      .status(500)
      .json({ message: "Kod doğrulanırken sunucu hatası oluştu." });
  }
});

/**
 * 3) POST /api/forgot-password/reset
 *    Doğrulama kodu doğruysa yeni şifreyi kaydeder.
 */
router.post("/reset", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, kod ve yeni şifre zorunludur." });
  }

  try {
    // teachers tablosunda kontrol
    let [rows] = await db.query(
      "SELECT verification_code FROM teachers WHERE email = ?",
      [email]
    );
    let table = "teachers";
    if (!rows.length) {
      // öğrenciler tablosuna bak
      [rows] = await db.query(
        "SELECT verification_code FROM students WHERE email = ?",
        [email]
      );
      table = "students";
    }
    if (!rows.length) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    if (rows[0].verification_code !== code) {
      return res.status(400).json({ message: "Kod geçersiz." });
    }

    // Yeni şifreyi hash'le
    const hashed = await bcrypt.hash(newPassword, 10);

    // Şifreyi güncelle, kodu temizle
    await db.query(
      `UPDATE ${table} 
         SET password = ?, verification_code = NULL 
       WHERE email = ?`,
      [hashed, email]
    );

    res.json({ message: "Şifreniz başarıyla sıfırlandı." });
  } catch (err) {
    console.error("Forgot-password reset error:", err);
    res
      .status(500)
      .json({ message: "Şifre sıfırlanırken sunucu hatası oluştu." });
  }
});

export default router;
