// public/js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'https://classconnect.com.tr';

  // — Öğrenci Girişi —
  const studentForm = document.getElementById('studentLoginForm');
  const studentEmailInput = document.getElementById('studentEmail');
  const studentPassInput = document.getElementById('studentPassword');

  studentForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = studentEmailInput.value.trim().toLowerCase();
    const password = studentPassInput.value;
    if (!email || !password) {
      alert('Lütfen email ve şifre girin');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Öğrenci girişi başarısız');
        return;
      }
      // Backend student için redirect: "/pages/student_dashboard.html"
      window.location.href = data.redirect;
    } catch (err) {
      console.error('Student login error:', err);
      alert('Sunucu hatası oluştu');
    }
  });

  // — Öğretmen Girişi —
  const teacherForm = document.getElementById('teacherLoginForm');
  const teacherEmailInput = document.getElementById('teacherEmail');
  const teacherPassInput = document.getElementById('teacherPassword');

  teacherForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = teacherEmailInput.value.trim().toLowerCase();
    const password = teacherPassInput.value;
    if (!email || !password) {
      alert('Lütfen email ve şifre girin');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Öğretmen girişi başarısız');
        return;
      }
      // Backend teacher için redirect: "/pages/teacher_dashboard.html"
      window.location.href = data.redirect;
    } catch (err) {
      console.error('Teacher login error:', err);
      alert('Sunucu hatası oluştu');
    }
  });
});
