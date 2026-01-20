// routes/teacherProfileRoutes.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import multer from "multer";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
  console.log("✅ DB connected (teacherProfileRoutes)");
})();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "../../uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `tch_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// 1) Profile GET
router.get("/", async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email)
      return res
        .status(401)
        .json({ success: false, message: "Giriş yapılmamış" });

    const [rows] = await db.query(
      `
        SELECT full_name, phone_number, about_me, lesson_prices, availability,
              profile_photo, university, faculty, department, location, email
        FROM teachers WHERE email = ?
      `,
      [email]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Öğretmen bulunamadı" });
    }

    const t = rows[0];
    let lp = t.lesson_prices;
    if (typeof lp === "string") {
      try {
        lp = JSON.parse(lp);
      } catch {}
    }
    let av = t.availability;
    if (typeof av === "string") {
      try {
        av = JSON.parse(av);
      } catch {}
    }

    res.json({
      success: true,
      teacher: {
        full_name: t.full_name,
        phone_number: t.phone_number,
        about_me: t.about_me,
        profile_photo: t.profile_photo,
        university: t.university,
        faculty: t.faculty,
        department: t.department,
        location: t.location,
        email: t.email,
        lesson_prices: lp || {},
        availability: av || [],
      },
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

router.post(
  "/update-profile",
  upload.single("profile_photo"),
  async (req, res) => {
    try {
      const email = req.user?.email;
      if (!email)
        return res
          .status(401)
          .json({ success: false, message: "Giriş yapılmamış" });

      const {
        name,
        phone,
        about,
        prices,
        availability,
        university,
        faculty,
        department,
        location,
      } = req.body;

      const fields = [];
      const values = [];

      if (name !== undefined) {
        fields.push("full_name = ?");
        values.push(name);
      }
      if (phone !== undefined) {
        fields.push("phone_number = ?");
        values.push(phone);
      }
      if (about !== undefined) {
        fields.push("about_me = ?");
        values.push(about);
      }

      if (prices !== undefined) {
        let lessonPrices;
        try {
          lessonPrices =
            typeof prices === "string" ? prices : JSON.stringify(prices);
          JSON.parse(lessonPrices); // geçerli JSON olduğundan emin ol
        } catch (e) {
          return res
            .status(400)
            .json({ success: false, message: "Geçersiz ders fiyatı verisi" });
        }
        fields.push("lesson_prices = ?");
        values.push(lessonPrices);
      }
      if (availability !== undefined) {
        const availabilityStr =
          typeof availability === "string"
            ? availability
            : JSON.stringify(availability);
        fields.push("availability = ?");
        values.push(availabilityStr);
      }

      if (university !== undefined) {
        fields.push("university = ?");
        values.push(university);
      }
      if (faculty !== undefined) {
        fields.push("faculty = ?");
        values.push(faculty);
      }
      if (department !== undefined) {
        fields.push("department = ?");
        values.push(department);
      }
      if (location !== undefined) {
        fields.push("location = ?");
        values.push(location);
      }

      if (req.file) {
        const photoPath = `/uploads/${req.file.filename}`;
        fields.push("profile_photo = ?");
        values.push(photoPath);
      }

      if (fields.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Güncellenecek alan gönderilmedi" });
      }

      values.push(email);
      const sql = `UPDATE teachers SET ${fields.join(", ")} WHERE email = ?`;
      await db.query(sql, values);

      res.json({ success: true, message: "Profil başarıyla güncellendi" });
    } catch (err) {
      console.error("Profile Update Error:", err);
      res
        .status(500)
        .json({
          success: false,
          message: "Profil güncelleme sırasında hata oluştu",
        });
    }
  }
);

// 3) Upload Photo
router.post(
  "/upload-photo",
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      const email = req.user?.email;
      if (!email)
        return res
          .status(401)
          .json({ success: false, message: "Giriş yapılmamış" });
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "Dosya yüklenmedi" });

      const filePath = `/uploads/${req.file.filename}`;
      await db.query(`UPDATE teachers SET profile_photo = ? WHERE email = ?`, [
        filePath,
        email,
      ]);

      res.json({ success: true, filePath });
    } catch (err) {
      console.error("Fotoğraf yükleme hatası:", err);
      res.status(500).json({ success: false, message: "Sunucu hatası" });
    }
  }
);

// 4) Add Availability
router.post("/add-availability", express.json(), async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email)
      return res
        .status(401)
        .json({ success: false, message: "Giriş yapılmamış" });

    let availability = req.body.availability ?? req.body.slots;
    if (typeof availability === "string") {
      try {
        availability = JSON.parse(availability);
      } catch {
        return res
          .status(400)
          .json({ success: false, message: "Müsaitlik JSON parse hatası" });
      }
    }
    if (!Array.isArray(availability)) {
      return res
        .status(400)
        .json({ success: false, message: "Array bekleniyor" });
    }

    await db.query(`UPDATE teachers SET availability = ? WHERE email = ?`, [
      JSON.stringify(availability),
      email,
    ]);
    res.json({ success: true, message: "Müsaitlik başarıyla güncellendi" });
  } catch (err) {
    console.error("Add availability error:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// 5) Get Availability
router.get("/get-available-slots", async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email)
      return res
        .status(401)
        .json({ success: false, message: "Giriş yapılmamış" });

    const [rows] = await db.query(
      `SELECT availability FROM teachers WHERE email = ?`,
      [email]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Öğretmen bulunamadı" });
    }
    let av = rows[0].availability;
    if (typeof av === "string") {
      try {
        av = JSON.parse(av);
      } catch {
        av = [];
      }
    }
    res.json({ success: true, slots: Array.isArray(av) ? av : [] });
  } catch (err) {
    console.error("Get available slots error:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});
router.post("/change-password", express.json(), async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ message: "Oturum açılmadı" });

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Eski ve yeni şifre gereklidir" });
    }

    // Kullanıcıyı bul
    const [[u]] = await db.query(
      "SELECT t_id, password FROM teachers WHERE email = ?",
      [email]
    );
    if (!u) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const match = await bcrypt.compare(oldPassword, u.password);
    if (!match) {
      return res.status(400).json({ message: "Eski şifre yanlış" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE teachers SET password = ? WHERE t_id = ?", [
      hashed,
      u.t_id,
    ]);

    res.json({ success: true, message: "Şifreniz başarıyla değiştirildi" });
  } catch (err) {
    console.error("Şifre değiştirme hatası:", err);
    res.status(500).json({ message: "Sunucu hatası" });
  }
});
export default router;
