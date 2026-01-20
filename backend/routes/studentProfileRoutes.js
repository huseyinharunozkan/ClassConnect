// routes/studentProfileRoutes.js
/*import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import multer from "multer";

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
  console.log("✅ DB connected (studentProfileRoutes)");
})();

// Multer yapılandırması (profil fotoğrafı için)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `stu_${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// — GET /api/student/profile — Öğrenci profilini getir
router.get("/profile", async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    if (!studentId) {
      return res
        .status(401)
        .json({ success: false, message: "Giriş yapılmamış" });
    }

    const [rows] = await db.query(
      `SELECT full_name, email, phone_number, city, school, birth_date, profile_photo
       FROM students
       WHERE s_id = ?`,
      [studentId]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Öğrenci bulunamadı" });
    }

    const r = rows[0];
    res.json({
      success: true,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone_number,
      city: r.city,
      school: r.school,
      birth_date: r.birth_date,
      profile_photo: r.profile_photo,
    });
  } catch (err) {
    console.error("Student profile get error:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// — POST /api/student/update-profile — Öğrenci profilini güncelle
router.post(
  "/update-profile",
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      const studentId = req.user?.s_id;
      if (!studentId) {
        return res
          .status(401)
          .json({ success: false, message: "Giriş yapılmamış" });
      }

      const { fullName, phone, city, school, birthDate } = req.body;
      const profilePhotoPath = req.file
        ? `/uploads/${req.file.filename}`
        : null;

      // Dinamik UPDATE alanı oluştur
      let fields = `full_name = ?, phone_number = ?, city = ?, school = ?, birth_date = ?`;
      const params = [fullName, phone, city, school, birthDate];

      if (profilePhotoPath) {
        fields += `, profile_photo = ?`;
        params.push(profilePhotoPath);
      }
      params.push(studentId);

      const sql = `UPDATE students SET ${fields} WHERE s_id = ?`;
      await db.query(sql, params);

      res.json({ success: true, message: "Profil başarıyla güncellendi" });
    } catch (err) {
      console.error("Student profile update error:", err);
      res
        .status(500)
        .json({
          success: false,
          message: "Profil güncelleme sırasında hata oluştu",
        });
    }
  }
);

export default router;*/

// routes/studentProfileRoutes.js
/*import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import multer from 'multer';
import bcrypt from "bcryptjs";


const __filename = fileURLToPath(import.meta.url);
const _dirname  = path.dirname(_filename);
const router     = express.Router();

// DB bağlantısı
let db;
(async () => {
  db = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log("✅ DB connected (studentProfileRoutes)");
})();

// Multer yapılandırması (profil fotoğrafı için)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = stu_${Date.now()}${ext};
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// — GET /api/student/profile — Öğrenci profilini getir
router.get('/profile', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: "Giriş yapılmamış" });
    }

    const [rows] = await db.query(
      `SELECT full_name, email, phone_number, city, address, school, birth_date, profile_photo
       FROM students
       WHERE s_id = ?`,
      [studentId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Öğrenci bulunamadı" });
    }

    const r = rows[0];
    res.json({
      success:       true,
      full_name:     r.full_name,
      email:         r.email,
      phone:         r.phone_number,
      city:          r.city,
      school:        r.school,
      birth_date:    r.birth_date,
      profile_photo: r.profile_photo,
      address:       r.address
    });
  } catch (err) {
    console.error("Student profile get error:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});



// — GET /api/student/address — Adres çek
router.get('/address', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const [rows] = await db.query(
      SELECT address FROM students WHERE s_id = ?,
      [studentId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Address fetch error:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});
/*router.get('/api/student/address', async (req, res) => {
  try {
    const userId = req.user.id; // veya req.user.s_id / req.user.t_id
    const [rows] = await db.query(
      `SELECT address
       FROM students
       WHERE s_id = ?`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});


router.post("/profile/change-password", async (req, res) => {
  try {
    const studentId = req.user?.s_id || req.user?.id; // oturum sistemine göre
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Lütfen tüm alanları doldurun." });
    }

    const [rows] = await db.query("SELECT password FROM students WHERE s_id = ?", [studentId]);
    if (!rows.length) {
      return res.status(404).json({ message: "Öğrenci bulunamadı." });
    }

    const passwordMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Eski şifre yanlış." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE students SET password = ? WHERE s_id = ?", [hashedPassword, studentId]);

    res.json({ success: true, message: "Şifre güncellendi." });
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});


export default router; */


/*import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import multer from 'multer';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);
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
  console.log("✅ DB connected (studentProfileRoutes)");
})();

// Multer yapılandırması (profil fotoğrafı için)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, stu_${Date.now()}${ext});
  }
});
const upload = multer({ storage });

// — GET /api/student/profile — Öğrenci profilini getir
router.get('/profile', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    if (!studentId) return res.status(401).json({ success: false, message: 'Giriş yapılmamış' });

    const [rows] = await db.query(
      `SELECT full_name, email, phone_number, city, address, school, birth_date, profile_photo
       FROM students
       WHERE s_id = ?`,
      [studentId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Öğrenci bulunamadı' });

    const r = rows[0];
    res.json({
      success: true,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone_number,
      city: r.city,
      address: r.address,
      school: r.school,
      birth_date: r.birth_date,
      profile_photo: r.profile_photo
    });
  } catch (err) {
    console.error('Student profile get error:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// — POST /api/student/update-profile — Profil güncelle
router.post('/update-profile', upload.single('profilePhoto'), async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    if (!studentId) return res.status(401).json({ success: false, message: 'Giriş yapılmamış' });

    const { fullName, phone, city, address, school, birthDate } = req.body;
    const fields = [fullName, phone, city, address, school, birthDate];
    let sql = `UPDATE students SET 
      full_name = ?,
      phone_number = ?,
      city = ?,
      address = ?,
      school = ?,
      birth_date = ?`;
    const params = [...fields];

    if (req.file) {
      sql += `,
      profile_photo = ?`;
      params.push(req.file.filename);
    }
    sql += ` WHERE s_id = ?`;
    params.push(studentId);

    await db.query(sql, params);
    res.json({ success: true, message: 'Profil başarıyla güncellendi' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// — GET /api/student/address — Adresi parçalayıp 4 alana ayır
router.get('/address', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const [rows] = await db.query(
      SELECT address FROM students WHERE s_id = ?,
      [studentId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    const full = rows[0].address || '';
    // Virgülle ayrıldığı varsayılarak parçala:
    const parts = full.split(',').map(p => p.trim());
    const [neighborhood, street, apartment, district] = parts;

    return res.json({ neighborhood, street, apartment, district });
  } catch (err) {
    console.error('Address fetch error:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});


// — POST /api/student/profile/change-password — Şifre değiştir
router.post('/profile/change-password', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Şifre alanları boş bırakılamaz.' });
    }

    const [rows] = await db.query("SELECT password FROM students WHERE s_id = ?", [studentId]);
    if (!rows.length) return res.status(404).json({ message: 'Öğrenci bulunamadı.' });

    const match = await bcrypt.compare(oldPassword, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Eski şifre yanlış.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE students SET password = ? WHERE s_id = ?", [hashed, studentId]);

    res.json({ success: true, message: 'Şifre başarıyla değiştirildi.' });
  } catch (err) {
    console.error('Şifre değiştirme hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});


export default router; */


// routes/studentProfileRoutes.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import multer from 'multer';
import bcrypt from 'bcryptjs';


const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const router     = express.Router();

// DB bağlantısı
let db;
(async () => {
  db = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log("✅ DB connected (studentProfileRoutes)");
})();

// Multer yapılandırması (profil fotoğrafı için)
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `stu_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });


// — GET /api/student/profile — Öğrenci profilini getir
router.get('/profile', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    if (!studentId) 
      return res.status(401).json({ success: false, message: 'Giriş yapılmamış' });

    const [rows] = await db.query(
      `SELECT full_name, email, phone_number, city, address, school, birth_date, profile_photo
       FROM students
       WHERE s_id = ?`,
      [studentId]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Öğrenci bulunamadı' });

    const r = rows[0];
    res.json({
      success:       true,
      full_name:     r.full_name,
      email:         r.email,
      phone:         r.phone_number,
      city:          r.city,
      address:       r.address,
      school:        r.school,
      birth_date:    r.birth_date,
      profile_photo: r.profile_photo
    });
  } catch (err) {
    console.error('Student profile get error:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// — POST /api/student/update-profile — Profil güncelle
router.post('/update-profile', upload.single('profilePhoto'), async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    if (!studentId) 
      return res.status(401).json({ success: false, message: 'Giriş yapılmamış' });

    const { fullName, phone, city, address, school, birthDate } = req.body;
    let sql = `UPDATE students SET 
      full_name   = ?,
      phone_number= ?,
      city        = ?,
      address     = ?,
      school      = ?,
      birth_date  = ?`;
    const params = [fullName, phone, city, address, school, birthDate];

    if (req.file) {
      sql += ", profile_photo = ?";
      params.push(req.file.filename);
    }
    sql += ` WHERE s_id = ?`;
    params.push(studentId);

    await db.query(sql, params);
    res.json({ success: true, message: 'Profil başarıyla güncellendi' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// — GET /api/student/address — Adresi parçalayıp 4 alana ayır
router.get('/address', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const [rows] = await db.query(
      "SELECT address FROM students WHERE s_id = ?",
      [studentId]
    );
    if (!rows.length) 
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

    const parts = (rows[0].address || '').split(',').map(p => p.trim());
    const [neighborhood, street, apartment, district] = parts;
    res.json({ neighborhood, street, apartment, district });
  } catch (err) {
    console.error('Address fetch error:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// — POST /api/student/profile/change-password — Şifre değiştir
router.post('/profile/change-password', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) 
      return res.status(400).json({ message: 'Şifre alanları boş bırakılamaz.' });

    const [rows] = await db.query(
      "SELECT password FROM students WHERE s_id = ?", 
      [studentId]
    );
    if (!rows.length) 
      return res.status(404).json({ message: 'Öğrenci bulunamadı.' });

    const match = await bcrypt.compare(oldPassword, rows[0].password);
    if (!match) 
      return res.status(401).json({ message: 'Eski şifre yanlış.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(
      "UPDATE students SET password = ? WHERE s_id = ?", 
      [hashed, studentId]
    );

    res.json({ success: true, message: 'Şifre başarıyla değiştirildi.' });
  } catch (err) {
    console.error('Şifre değiştirme hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});



router.get('/:id', async (req, res) => {
  try {
    // 1) URL parametresinden id’yi al
    const studentId = req.params.id;
    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: 'Geçersiz öğrenci ID’si.' });
    }

    // 2) SQL sorgusunu çalıştır: sadece students tablosundan çekiyoruz
    const [rows] = await db.query(
      `SELECT
         full_name AS full_name,
         email     AS email,
         address   AS address
       FROM students
       WHERE s_id = ?`,
      [studentId]
    );

    // 3) Eğer satır yoksa 404 döndür
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Öğrenci bulunamadı.' });
    }

    // 4) Bulunan kaydı JSON olarak gönder
    return res.json({ success: true, student: rows[0] });
  } catch (err) {
    console.error('Pop-up student error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası.' });
  }
});

export default router;