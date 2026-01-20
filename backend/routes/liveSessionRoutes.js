import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import express from "express";
import mysql from "mysql2/promise";

const router = express.Router();

// DB bağlantısı (veya dışardan import)
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

// Canlı ders durumunu al
router.get("/live-session/:id/status", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM live_sessions WHERE session_id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    const session = rows[0];

    // 🔐 Oturum açmış mı?
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Oturum açmanız gerekiyor" });
    }

    // 🔒 Giriş yapan kullanıcı bu canlı derse ait mi?
    const user = req.user;
    if (
      (user?.s_id && user.s_id !== session.student_id) ||
      (user?.t_id && user.t_id !== session.teacher_id)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Bu derse erişim izniniz yok" });
    }

    res.json({ success: true, session });
  } catch (err) {
    console.error("Canlı ders status hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Öğretmen eve girdi
router.post("/live-session/:id/teacher-entered", async (req, res) => {
  const { id } = req.params;
  await db.query(
    "UPDATE live_sessions SET teacher_entered_home = TRUE WHERE session_id = ?",
    [id]
  );
  res.json({ success: true });
});

// Öğrenci eve girdi
router.post("/live-session/:id/student-entered", async (req, res) => {
  const { id } = req.params;
  await db.query(
    "UPDATE live_sessions SET student_entered_home = TRUE WHERE session_id = ?",
    [id]
  );
  res.json({ success: true });
});

// Öğretmen derse hazır
router.post("/live-session/:id/teacher-ready", async (req, res) => {
  const { id } = req.params;
  await db.query(
    "UPDATE live_sessions SET teacher_ready = TRUE WHERE session_id = ?",
    [id]
  );
  res.json({ success: true });
});

// Öğrenci derse hazır
router.post("/live-session/:id/student-ready", async (req, res) => {
  const { id } = req.params;
  await db.query(
    "UPDATE live_sessions SET student_ready = TRUE WHERE session_id = ?",
    [id]
  );
  res.json({ success: true });
});

// Öğretmen dersi başlattı
router.post("/live-session/:id/teacher-start", async (req, res) => {
  const { id } = req.params;
  await db.query(
    "UPDATE live_sessions SET teacher_confirm_started = TRUE WHERE session_id = ?",
    [id]
  );
  res.json({ success: true });
});

// Öğrenci dersi onayladı
router.post("/live-session/:id/student-start-confirm", async (req, res) => {
  const { id } = req.params;
  await db.query(
    `
    UPDATE live_sessions 
    SET student_confirm_started = TRUE, status = IF(teacher_confirm_started, 'started', status) 
    WHERE session_id = ?
  `,
    [id]
  );
  res.json({ success: true });
});

// Öğretmen dersi bitirdi
router.post("/live-session/:id/teacher-end", async (req, res) => {
  const { id } = req.params;
  await db.query(
    "UPDATE live_sessions SET teacher_confirm_ended = TRUE WHERE session_id = ?",
    [id]
  );
  res.json({ success: true });
});

// Öğrenci dersi bitirdi
router.post("/live-session/:id/student-end-confirm", async (req, res) => {
  const { id } = req.params;
  await db.query(
    `
      UPDATE live_sessions 
      SET student_confirm_ended = TRUE 
      WHERE session_id = ?`,
    [id]
  );
  res.json({ success: true });
});
router.post("/live-session/:id/student-exit-confirm", async (req, res) => {
  const { id } = req.params;
  await db.query(
    `
      UPDATE live_sessions 
      SET student_confirm_exit = TRUE 
      WHERE session_id = ?`,
    [id]
  );
  res.json({ success: true });
});

// Öğretmen evden çıktı
router.post("/live-session/:id/teacher-exit-confirm", async (req, res) => {
  const { id } = req.params;
  await db.query(
    `
      UPDATE live_sessions 
      SET teacher_confirm_exit = TRUE 
      WHERE session_id = ?`,
    [id]
  );
  res.json({ success: true });
});
router.get("/live-session/:id/info", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `
        SELECT
          s.full_name AS student_name,
          t.full_name AS teacher_name,
          a.lesson AS lesson_name,
          ls.student_id,
          ls.teacher_id
        FROM live_sessions ls
        JOIN students s ON ls.student_id = s.s_id
        JOIN teachers t ON ls.teacher_id = t.t_id
        JOIN appointments a ON
          a.teacher_id = ls.teacher_id AND
          a.student_id = ls.student_id AND
          a.appointment_date = CURDATE()
        WHERE ls.session_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Oturum bilgisi bulunamadı" });
    }

    const info = rows[0];

    // 🔒 Kimlik kontrolü — sadece oturuma ait kullanıcı erişebilsin
    const user = req.user;
    if (
      (user?.s_id && user.s_id !== info.student_id) ||
      (user?.t_id && user.t_id !== info.teacher_id)
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Bu derse erişim izniniz yok" });
    }

    // Kimlik doğrulandı, sadece gerekli bilgileri döndür
    res.json({
      success: true,
      student_name: info.student_name,
      teacher_name: info.teacher_name,
      lesson_name: info.lesson_name,
    });
  } catch (err) {
    console.error("Canlı ders info hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});
router.get("/live-session/today", async (req, res) => {
  const { t_id, s_id } = req.user; // giriş yapan kişi

  const [rows] = await db.query(
    `
      SELECT session_id FROM live_sessions
      WHERE
        teacher_id = ? OR student_id = ?
        AND DATE(created_at) = CURDATE()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [t_id || 0, s_id || 0]
  );

  if (rows.length === 0) return res.json({ success: false });
  res.json({ success: true, session_id: rows[0].session_id });
});

router.post("/live-session/init-auto", async (req, res) => {
  try {
    const [appointments] = await db.query(`
        SELECT a.*
        FROM appointments a
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

    const insertedSessions = [];

    for (const a of appointments) {
      const [result] = await db.query(
        `
          INSERT INTO live_sessions (teacher_id, student_id, lesson_slot_id)
          VALUES (?, ?, 0)
        `,
        [a.teacher_id, a.student_id]
      );

      insertedSessions.push({
        appointment_id: a.id,
        teacher_id: a.teacher_id,
        student_id: a.student_id,
        session_id: result.insertId,
      });
    }

    res.json({ success: true, created: insertedSessions });
  } catch (err) {
    console.error("Canlı oturum oluşturma hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

export default router;
