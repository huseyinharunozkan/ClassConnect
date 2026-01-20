// routes/auth.js (veya nereye koyuyorsanız)
import express from "express";
import passport from "passport";
const router = express.Router();

// 1) Google ile giriş sayfasına yönlendirme:
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// 2) Callback:
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login.html",
  }),
  (req, res) => {
    // login başarılı → dashboard’a yönlendir
    res.redirect("/pages/after_login_teacher.html");
  }
);

export default router;
