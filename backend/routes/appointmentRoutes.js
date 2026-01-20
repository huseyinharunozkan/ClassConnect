// routes/appointmentRoutes.js
/*import express from "express";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import path from "path";

const router = express.Router();
let db;
(async () => {
  db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log("✅ DB connected (appointmentRoutes)");
})();

// Randevu kaydet
router.post("/appointments/book", async (req, res) => {
  try {
    // Öğrenci ID’sini al
    const studentId = req.user?.s_id;
    const { teacherId, lesson, appointment_date, slots } = req.body;
    if (
      !lesson ||
      !appointment_date ||
      !Array.isArray(slots) ||
      !slots.length
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Eksik parametre" });
    }

    // Her slot için insert
    const promises = slots.map((s) =>
      db.query(
        `INSERT INTO appointments
           (teacher_id, student_id, lesson, day_of_week, appointment_date, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [teacherId, studentId, lesson, s.day, appointment_date, s.start, s.end]
      )
    );
    await Promise.all(promises);
    res.json({ success: true });
  } catch (err) {
    console.error("Appointment booking error:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Onay bekleyen randevuları getir (öğretmen için)
router.get("/appointments/pending-teacher", async (req, res) => {
  try {
    const teacherId = req.user?.t_id;
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              s.full_name AS student_name
       FROM appointments a
       JOIN students s ON s.s_id = a.student_id
       WHERE a.teacher_id = ? AND a.status = 'pending'
       ORDER BY a.appointment_date, a.start_time`,
      [teacherId]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Bugünün onaylı derslerini getir (öğretmen için)
router.get("/appointments/teacher/today", async (req, res) => {
  try {
    const teacherId = req.user?.t_id;
    const date = req.query.date; // YYYY-MM-DD
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              s.full_name AS student_name
       FROM appointments a
       JOIN students s ON s.s_id = a.student_id
       WHERE a.teacher_id = ? AND a.status = 'confirmed' AND a.appointment_date = ?
       ORDER BY a.start_time`,
      [teacherId, date]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Tüm onaylı randevuları getir (öğretmen için)
router.get("/appointments/teacher/confirmed", async (req, res) => {
  try {
    const teacherId = req.user?.t_id;
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              s.full_name AS student_name
       FROM appointments a
       JOIN students s ON s.s_id = a.student_id
       WHERE a.teacher_id = ? AND a.status = 'confirmed'
       ORDER BY a.appointment_date, a.start_time`,
      [teacherId]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Randevu onayla
router.post("/appointments/approve", async (req, res) => {
  try {
    const { id } = req.body;
    await db.query(
      `UPDATE appointments
         SET status = 'confirmed'
       WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Randevu reddet
router.post("/appointments/reject", async (req, res) => {
  try {
    const { id } = req.body;
    await db.query(
      `UPDATE appointments
         SET status = 'cancelled'
       WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});
router.get("/appointments/student/pending", async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              t.full_name AS teacher_name
       FROM appointments a
       JOIN teachers t ON t.t_id = a.teacher_id
       WHERE a.student_id = ? AND a.status = 'pending'
       ORDER BY a.appointment_date, a.start_time`,
      [studentId]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Onaylanmış (aktif) randevular (öğrenci)
router.get("/appointments/student/confirmed", async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              t.full_name AS teacher_name
       FROM appointments a
       JOIN teachers t ON t.t_id = a.teacher_id
       WHERE a.student_id = ? AND a.status = 'confirmed'
       ORDER BY a.appointment_date, a.start_time`,
      [studentId]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});
router.patch("/appointments/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
      [id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("Appointment cancel error:", err);
    return res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

export default router;*/

// routes/appointmentRoutes.js
import express from 'express';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import path from 'path';

const router = express.Router();
let db;
(async () => {
  db = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log('✅ DB connected (appointmentRoutes)');
})();

//Büşra ekledi (19-42)
// Randevu kaydet
router.post('/appointments/book', async (req, res) => {
  try {
    if (!req.user || !req.user.s_id) {
      return res.status(401).json({ success: false, message: "Student login required" });
    }
    const studentId = req.user.s_id;
    const { teacherId, lesson, appointment_date, slots } = req.body;
    // … eksik parametre kontrolü …

    // appointment_date DD-MM-YYYY formatındaysa YYYY-MM-DD'ye çevir
    const [yyyy, mm, dd] = appointment_date.split('-').map(Number);
  const isoDate = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const jsDate = new Date(isoDate);
    /* if (isNaN(jsDate.getTime())) {
    return alert("Invalid date selected.");
  }*/
  

    const ddd = new Date(isoDate).toLocaleDateString("tr-TR",{weekday:"long"});       
    
    function toMysqlDate(isoString) {
      // Safely handles Date objects and ISO strings
      const date = new Date(isoString);
      if (isNaN(date)) return null; // Invalid date
    
      return date.toISOString().split('T')[0]; // Extracts 'YYYY-MM-DD'
    }

    const true_date = toMysqlDate(appointment_date)

    


    // Her slot için insert
    await Promise.all(slots.map(s =>
      db.query(
        `INSERT INTO appointments
           (teacher_id, student_id, lesson, day_of_week, appointment_date, start_time, end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [teacherId, studentId, lesson, s.day, true_date, s.start, s.end]
        
      )
      
    ));
    console.log(true_date)

    res.json({ success: true });
  } catch (err) {
    console.error('Appointment booking error:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

//Onay bekleyen randevuları getir (öğretmen için)
router.get('/appointments/pending-teacher', async (req, res) => {
  try {
    const teacherId = req.user?.t_id;
    const [rows] = await db.query(
      `
      SELECT 
        a.id,
        a.lesson,
        a.day_of_week,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.student_id       AS student_id,     -- *bu satırı ekledik*
        s.full_name        AS student_name
      FROM appointments a
      JOIN students s 
        ON s.s_id = a.student_id
      WHERE a.teacher_id = ? 
        AND a.status = 'pending'
      ORDER BY a.appointment_date, a.start_time
      `,
      [teacherId]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});


// Bugünün onaylı derslerini getir (öğretmen için)
router.get('/appointments/teacher/today', async (req, res) => {
  try {
    const teacherId = req.user?.t_id;
    const date = req.query.date; // YYYY-MM-DD
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              s.full_name AS student_name
       FROM appointments a
       JOIN students s ON s.s_id = a.student_id
       WHERE a.teacher_id = ? AND a.status = 'confirmed' AND a.appointment_date = ?
       ORDER BY a.start_time`,
      [teacherId, date]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Tüm onaylı randevuları getir (öğretmen için)
router.get('/appointments/teacher/confirmed', async (req, res) => {
  try {
    const teacherId = req.user?.t_id;
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              s.full_name AS student_name
       FROM appointments a
       JOIN students s ON s.s_id = a.student_id
       WHERE a.teacher_id = ? AND a.status = 'confirmed'
       ORDER BY a.appointment_date, a.start_time`,
      [teacherId]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Randevu onayla
router.post('/appointments/approve', async (req, res) => {
  try {
    const { id } = req.body;
    await db.query(
      `UPDATE appointments
         SET status = 'confirmed'
       WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Randevu reddet
router.post('/appointments/reject', async (req, res) => {
  try {
    const { id } = req.body;
    await db.query(
      `UPDATE appointments
         SET status = 'cancelled'
       WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});
router.get('/appointments/student/pending', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              t.full_name AS teacher_name
       FROM appointments a
       JOIN teachers t ON t.t_id = a.teacher_id
       WHERE a.student_id = ? AND a.status = 'pending'
       ORDER BY a.appointment_date, a.start_time`,
      [studentId]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Onaylanmış (aktif) randevular (öğrenci)
router.get('/appointments/student/confirmed', async (req, res) => {
  try {
    const studentId = req.user?.s_id;
    const [rows] = await db.query(
      `SELECT a.id, a.lesson, a.day_of_week, a.appointment_date,
              a.start_time, a.end_time,
              t.full_name AS teacher_name
       FROM appointments a
       JOIN teachers t ON t.t_id = a.teacher_id
       WHERE a.student_id = ? AND a.status = 'confirmed'
       ORDER BY a.appointment_date, a.start_time`,
      [studentId]
    );
    res.json({ success: true, appointments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});
router.patch('/appointments/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
 
    await db.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = ?",
      [id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Appointment cancel error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

export default router;
