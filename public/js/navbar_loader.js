// navbar_loader.js
document.addEventListener("DOMContentLoaded", async () => {
  const placeholder = document.getElementById("navbar-placeholder");
  if (!placeholder) return;

  try {
    const res = await fetch("/api/session", { credentials: "include" });
    const data = await res.json();

    let navbarFile = "../components/navbar.html"; // default guest

    if (data.loggedIn && data.email) {
      if (data.email.endsWith(".edu.tr")) {
        navbarFile = "../components/navbar_teacher.html";
      } else {
        navbarFile = "../components/navbar_student.html";
      }
    }

    const navbarRes = await fetch(navbarFile);
    const html = await navbarRes.text();
    placeholder.innerHTML = html;
  } catch (err) {
    console.error("Navbar yüklenemedi:", err);
  }
});
document.addEventListener("click", async (e) => {
  if (e.target && e.target.id === "logout-btn") {
    try {
      const res = await fetch("/api/logout", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = "/pages/index.html"; // Anasayfaya yönlendir
      } else {
        alert("Çıkış yapılamadı!");
      }
    } catch (err) {
      console.error("Çıkış hatası:", err);
    }
  }
});

fetch('/components/navbar_teacher.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById("navbar-placeholder").innerHTML = html;
    // CSS apply fix: trigger any reflow or class application if needed
  });


