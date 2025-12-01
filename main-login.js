/* ------------------------
    MAIN LOGIN
  ------------------------- */

const API = 'https://elearning-api-production-70eb.up.railway.app/api';

function applyRoleUI() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) return;

  const role = user.role;

  // Mark <body> with role
  document.body.dataset.role = role;

  // Change header text if needed
  const headerTitle = document.querySelector(".headerTitle p");
  if (headerTitle) {
    if (role === "teacher") headerTitle.textContent += " (Guru)";
    else if (role === "admin") headerTitle.textContent += " (Admin)";
  }

  // Change sidebar menu depending on role
  const nav = document.getElementById("nav-bar");
  if (nav) {
    if (role === "teacher") {
      // Teacher menu layout (hide leaderboard, hide forum, etc.)
      nav.innerHTML = `
        <a href="dashboard.html">Dashboard</a>
        <a href="guru-materi.html">Kelola Materi</a>
        <a href="guru-quiz.html">Kelola Kuis</a>
        <a href="forum.html">Forum</a>
        <a href="profil.html">Profil</a>
      `;
    }

    if (role === "admin") {
      nav.innerHTML = `
        <a href="dashboard.html">Dashboard</a>
        <a href="admin-users.html">Kelola Pengguna</a>
        <a href="forum-admin.html">Kelola Forum</a>
        <a href="profil.html">Profil</a>
      `;
    }
  }

  // Hide student-only elements for teachers/admin
  const studentOnlyEls = document.querySelectorAll("[data-role='student']");
  studentOnlyEls.forEach(el => {
    if (role !== "student") el.style.display = "none";
  });

  // Hide teacher-only elements for students
  const teacherOnlyEls = document.querySelectorAll("[data-role='teacher']");
  teacherOnlyEls.forEach(el => {
    if (role !== "teacher") el.style.display = "none";
  });

  // Hide admin-only elements
  const adminOnlyEls = document.querySelectorAll("[data-role='admin']");
  adminOnlyEls.forEach(el => {
    if (role !== "admin") el.style.display = "none";
  });
}


// Login
function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('error-msg');

    try {
      const res = await fetch("https://elearning-api-production-70eb.up.railway.app/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        // save user to localStorage
        localStorage.setItem("loggedInUser", JSON.stringify(data.user));

        // redirect to dashboard
        window.location.href = "dashboard.html";
      } else {
        errorMsg.style.display = "block";
      }

    } catch (error) {
      console.error(error);
      errorMsg.style.display = "block";
    }
  });
}

// Login message
window.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('loggedInUser'));
  if (user) {
    const msg = document.getElementById('welcome-msg');
    if (msg) msg.textContent = `Selamat datang, ${user.real_name}!`;
  }
});



// Hybrid nav: top bar on desktop, sidebar on mobile
document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.getElementById('menu-toggle');
  const navBar = document.getElementById('nav-bar');

  // Create overlay for mobile
  const overlay = document.createElement('div');
  overlay.classList.add('overlay');
  document.body.appendChild(overlay);

  if (menuButton && navBar) {
    menuButton.addEventListener('click', () => {
      navBar.classList.toggle('open');
      overlay.classList.toggle('show');
      document.body.style.overflow = navBar.classList.contains('open') ? 'hidden' : '';
    });

    overlay.addEventListener('click', () => {
      navBar.classList.remove('open');
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    });
  }
});
