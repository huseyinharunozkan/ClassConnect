document.addEventListener('DOMContentLoaded', () => {
    const API_BASE     = 'https://classconnect.com.tr';
    const emailIn      = document.getElementById('email');
    const sendCodeBtn  = document.getElementById('sendCodeBtn');
    const resetSection = document.getElementById('resetSection');
    const codeIn       = document.getElementById('code');
    const newPassIn    = document.getElementById('newPassword');
    const resetBtn     = document.getElementById('resetBtn');
    const alertDiv     = document.getElementById('alert');
  
    function showAlert(msg, type = 'danger') {
      alertDiv.textContent = msg;
      alertDiv.className   = `alert alert-${type}`;
      alertDiv.classList.remove('d-none');
      setTimeout(() => alertDiv.classList.add('d-none'), 5000);
    }
  
    // 1) Kod gönder
    sendCodeBtn.addEventListener('click', async e => {
      e.preventDefault();
      const email = emailIn.value.trim().toLowerCase();
      if (!email) {
        showAlert('Lütfen email girin');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showAlert('Doğrulama kodu e-posta adresinize gönderildi', 'success');
        resetSection.classList.remove('d-none');
        sendCodeBtn.disabled = true;
        emailIn.disabled     = true;
      } catch (err) {
        showAlert(err.message);
      }
    });
  
    // 2) Şifre sıfırla
    resetBtn.addEventListener('click', async e => {
      e.preventDefault();
      const email       = emailIn.value.trim().toLowerCase();
      const code        = codeIn.value.trim();
      const newPassword = newPassIn.value;
      if (!/^\d{6}$/.test(code)) {
        showAlert('Lütfen geçerli 6 haneli kod girin');
        return;
      }
      if (!newPassword) {
        showAlert('Lütfen yeni şifrenizi girin');
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, code, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showAlert('Şifreniz güncellendi, giriş sayfasına yönlendiriliyorsunuz…', 'success');
        setTimeout(() => window.location.href = 'login.html', 1500);
      } catch (err) {
        showAlert(err.message);
      }
    });
  });
  