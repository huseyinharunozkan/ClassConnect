// footer-loader.js
document.addEventListener("DOMContentLoaded", () => {
  fetch("../components/footer.html")
    .then((res) => res.text())
    .then((data) => {
      document.getElementById("footer-placeholder").innerHTML = data;
    });
});
