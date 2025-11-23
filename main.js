// main.js

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
        <a href="materi.html">Kelola Materi</a>
        <a href="forum.html">Forum</a>
        <a href="profil.html">Profil</a>
      `;
    }

    if (role === "admin") {
      nav.innerHTML = `
        <a href="dashboard.html">Dashboard</a>
        <a href="users.html">Kelola Pengguna</a>
        <a href="materi.html">Kelola Materi</a>
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


// STUDENT PAGES

// Leaderboard
let remainingRows = [];  // stores rows after top 5
let displayedCount = 0;  // how many extra rows displayed so far

async function generateLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  if (!user) return;

  // Fetch leaderboard for user class group
  const res = await fetch(`https://elearning-api-production-70eb.up.railway.app/api/leaderboard/${user.class}`);
  const data = await res.json();

  const topFive = data.topFive;
  const fullRank = data.fullRank;

  // Reset display
  tbody.innerHTML = "";
  remainingRows = [];
  displayedCount = 0;

  // Render Top 5
  topFive.forEach((row, index) => {
    const tr = document.createElement("tr");
    if (index === 0) tr.classList.add('rank-1');
    else if (index === 1) tr.classList.add('rank-2');
    else if (index === 2) tr.classList.add('rank-3');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.real_name}</td>
      <td>${row.class}</td>
      <td>${row.total_score}</td>
    `;
    tbody.appendChild(tr);
  });

  // Store remaining rows (starting from index 5)
  remainingRows = fullRank.slice(5);

  // Find logged-in user's rank
  const userRankIndex = fullRank.findIndex(x => x.id_user === user.id_user);
  const userRank = userRankIndex + 1;

  // Show user rank somewhere on page
  const rankBox = document.getElementById("user-rank");
  if (rankBox) rankBox.textContent = `Peringkat Anda: ${userRank}`;
}


// Load more leaderboard
function loadMore() {
  const loadMoreBtn = document.getElementById("load-more");
  if (!loadMoreBtn) return;  // Do nothing if button doesn't exist (login page safe)

  loadMoreBtn.addEventListener("click", () => {
    const tbody = document.getElementById('leaderboard-body');

    // load next 10 rows
    const nextBatch = remainingRows.slice(displayedCount, displayedCount + 10);

    nextBatch.forEach((row, i) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${5 + displayedCount + i + 1}</td>
        <td>${row.real_name}</td>
        <td>${row.class}</td>
        <td>${row.total_score}</td>
      `;

      tbody.appendChild(tr);
    });

    displayedCount += nextBatch.length;

    // hide button if all rows loaded
    if (displayedCount >= remainingRows.length) {
      loadMoreBtn.style.display = "none";
    }
  });
}


/*
// Subject pages
function initMateriPage() {
  const buttons = document.querySelectorAll('.card.subject .btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const subject = btn.closest('.card').querySelector('h3').textContent.toLowerCase();

      // Match the key used in materiData
      let subjectKey;
      if (subject.includes('matematika')) subjectKey = 'matematika';
      else if (subject.includes('pengetahuan')) subjectKey = 'ipa';
      else if (subject.includes('indonesia')) subjectKey = 'bindo';

      // Navigate and pass the subject via query parameter
      if (subjectKey) {
        window.location.href = `materi-detail.html?subject=${subjectKey}`;
      }
    });
  });
}

// Open details on subject page
function initMateriDetail() {
  const params = new URLSearchParams(window.location.search);
  const subjectKey = params.get('subject');

  const data = materiData[subjectKey];
  if (!data) return;

  document.getElementById('subject-title').textContent = `Materi: ${data.name}`;
  document.getElementById('materi-name').textContent = data.name;
  document.getElementById('materi-desc').textContent = data.desc;

  const linksList = document.getElementById('materi-links');
  linksList.innerHTML = '';

  data.links.forEach(link => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${link.url}" target="_blank">${link.text}</a>`;
    linksList.appendChild(li);
  });
}
  */



const subjectLogos = {
  "Matematika": "assets/logo_mtk.jpg",
  "Ilmu Pengetahuan Alam": "assets/logo_ipa.jpg",
  "Bahasa Indonesia": "assets/logo_id.jpg",
};

// Subject pages
async function initMateriPageDB() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) return;

  const container = document.getElementById("mapel-list");

  const res = await fetch(`${API}/materi/list/${user.class}`);
  const data = await res.json();

  container.innerHTML = "";

  data.mapel.forEach(mapel => {
    const card = document.createElement("div");
    card.classList.add("card", "subject");
    card.innerHTML = `
      <div class="content">
        <h3>${mapel.name}</h3>
        <div class="btn" data-id="${mapel.id_mapel}">Lihat Materi</div>
      </div>
      <img src="${subjectLogos[mapel.name] || 'assets/logo_default.jpg'}" class="thumb">
    `;

    container.appendChild(card);
  });

  // click handler
  container.querySelectorAll(".btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      window.location.href = `materi-detail.html?id=${id}`;
    });
  });
}

// Open details on subject page
async function initMateriDetailDB() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const nameEl = document.getElementById("materi-name");
  const descEl = document.getElementById("materi-desc");
  const listEl = document.getElementById("materi-items");

  const res = await fetch(`${API}/materi/detail/${id}`);
  const data = await res.json();

  // No subject name stored here, so we just show total count
  nameEl.textContent = `Daftar Materi (${data.materi.length})`;
  descEl.textContent = "";

  listEl.innerHTML = "";

  data.materi.forEach(m => {
    const item = document.createElement("div");
    item.classList.add("card");
    item.innerHTML = `
      <h3>${m.title}</h3>
      <p><strong>Guru Pengampu:</strong> ${m.teacher_name || "Tidak diketahui"}</p>
      <p>${m.description}</p>
      <a href="${m.file_url}" target="_blank" class="btn">Buka File</a>
    `;

    listEl.appendChild(item);
  });
}


// Quiz page
function initKuisPage() {
  const buttons = document.querySelectorAll('.card.subject .btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const subject = btn.closest('.card').querySelector('h3').textContent.toLowerCase();

      let subjectKey;
      if (subject.includes('matematika')) subjectKey = 'matematika';
      else if (subject.includes('pengetahuan')) subjectKey = 'ipa';
      else if (subject.includes('indonesia')) subjectKey = 'bindo';

      if (subjectKey) {
        window.location.href = `kuis-detail.html?quiz=${subjectKey}`;
      }
    });
  });
}

// Open details on quiz page
function initKuisDetail() {
  const params = new URLSearchParams(window.location.search);
  const quizKey = params.get('quiz');
  const data = kuisData[quizKey];
  const container = document.getElementById('quiz-content');
  const titleEl = document.getElementById('quiz-title');

  if (!data || !container || !titleEl) return;

  // Require login (optional but recommended)
  const user = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  if (!user) {
    container.innerHTML = `
      <p>Silakan login terlebih dahulu untuk mengikuti kuis.</p>
      <a href="login.html" class="btn">Login</a>
    `;
    titleEl.textContent = "Kuis (Login diperlukan)";
    return;
  }

  // Render header
  titleEl.textContent = data.name;
  document.getElementById('quiz-name').textContent = data.name;
  document.getElementById('quiz-desc').textContent = data.desc;

  // Build the question form
  container.innerHTML = `
    <form id="quizForm" class="quiz-form">
      <ol id="questions-list" style="padding-left: 1.1rem;"></ol>
      <div style="margin-top: 1rem;">
        <button type="submit" class="btn">Submit Jawaban</button>
        <button type="button" id="clearAnswers" class="btn" style="margin-left:8px">Reset</button>
      </div>
      <div id="quiz-result" style="margin-top:1rem;"></div>
    </form>
  `;

  const qList = document.getElementById('questions-list');
  data.questions.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'quiz-question';
    li.innerHTML = `
      <div class="q-text">${item.q}</div>
      <div class="q-options">
        ${item.options.map((opt, i) =>
      `<label style="display:block; margin:6px 0;">
              <input type="radio" name="q${idx}" value="${i}">
              <span style="margin-left:8px">${opt}</span>
            </label>`
    ).join('')}
      </div>
      <div class="feedback" style="margin-top:6px; display:none;"></div>
    `;
    qList.appendChild(li);
  });

  const form = document.getElementById('quizForm');
  const resultDiv = document.getElementById('quiz-result');
  const clearBtn = document.getElementById('clearAnswers');

  // Reset handler
  clearBtn.addEventListener('click', () => {
    form.reset();
    resultDiv.innerHTML = '';
    document.querySelectorAll('.feedback').forEach(f => { f.style.display = 'none'; f.innerHTML = ''; });
    document.querySelectorAll('input').forEach(i => i.disabled = false);
  });

  // Submit handler
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    let correctCount = 0;
    const total = data.questions.length;

    data.questions.forEach((item, idx) => {
      const selected = form[`q${idx}`].value;
      const li = qList.children[idx];
      const feedbackEl = li.querySelector('.feedback');
      // Clear previous feedback
      feedbackEl.style.display = 'block';

      if (String(item.correct) === String(selected)) {
        correctCount++;
        feedbackEl.innerHTML = `<span style="color:var(--colorGood,green)">Benar ✅</span>`;
      } else {
        const correctText = item.options[item.correct];
        feedbackEl.innerHTML = `<span style="color:var(--colorBad,red)">Salah ❌</span> — Jawaban benar: <strong>${correctText}</strong>`;
      }
    });

    // Disable inputs after submit
    document.querySelectorAll('input[type=radio]').forEach(r => r.disabled = true);

    // Show overall result
    const scorePercent = Math.round((correctCount / total) * 100);
    resultDiv.innerHTML = `
      <div><strong>Skor:</strong> ${correctCount} / ${total} (${scorePercent}%)</div>
      <div style="margin-top:8px;">
        <a href="kuis.html" class="btn">Kembali ke Daftar Kuis</a>
      </div>
    `;

    // Save result to localStorage under quizResults per user
    try {
      const raw = localStorage.getItem('quizResults') || '{}';
      const quizResults = JSON.parse(raw);
      quizResults[user.id] = quizResults[user.id] || {};
      quizResults[user.id][quizKey] = {
        score: correctCount,
        total: total,
        percent: scorePercent,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('quizResults', JSON.stringify(quizResults));
    } catch (err) {
      console.warn('Gagal menyimpan hasil kuis: ', err);
    }
  });
}



// TEACHER PAGES

// teacher dashboard
async function initTeacherDashboard() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  // Load teacher classes
  const resClass = await fetch(`${API}/teacher/classes/${user.id_user}`);
  const dataClass = await resClass.json();

  const classList = document.getElementById("teacher-classes");
  classList.innerHTML = "";
  dataClass.classes.forEach(c => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${c.class}</strong> - ${c.name}`;
    classList.appendChild(li);
  });

  // Load teacher materi
  const resMat = await fetch(`${API}/teacher/materi/${user.id_user}`);
  const dataMat = await resMat.json();

  const materiContainer = document.getElementById("teacher-materi");
  materiContainer.innerHTML = "";
  dataMat.materi.forEach(m => {
    const div = document.createElement("div");
    div.innerHTML = `
      <p><strong>${m.title}</strong> — ${m.class}</p>
      <a href="${m.file_url}" target="_blank">Lihat</a><br>
      <button class="btn" onclick="editMateri(${m.id_materi})">Edit</button>
      <button class="btn" onclick="deleteMateri(${m.id_materi})" style="background:#d66">Hapus</button>
    `;
    materiContainer.appendChild(div);
  });


  // Load activity
  const activity = document.getElementById("teacher-activity");
  activity.innerHTML = dataMat.materi.length
    ? `Anda mengunggah ${dataMat.materi.length} materi.`
    : "Belum ada aktivitas.";
}

// get teacher mapel
function getTeacherMapel(row) {
  if (row.grade_math === 1) return { id_mapel: 1, name: "Matematika" };
  if (row.grade_science === 1) return { id_mapel: 2, name: "Ilmu Pengetahuan Alam" };
  if (row.grade_indonesia === 1) return { id_mapel: 3, name: "Bahasa Indonesia" };
  return null;
}

// show teacher class and mapel
async function showTeacherClassAndMapel() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  const classInfoEl = document.getElementById("teacher-class-info") ||
    document.getElementById("materi-info");
  if (!classInfoEl) return;

  const res = await fetch(`${API}/teacher/mapel/${user.id_user}`);
  const data = await res.json();

  if (!data.success) return;

  const mapel = data.mapel.name;
  const className = user.class;

  classInfoEl.textContent = `Kelas: ${className} · Mapel: ${mapel}`;
}


// laod teacher students
async function loadTeacherStudents() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  const tbody = document.getElementById("teacher-students");
  if (!tbody) return;

  const res = await fetch(`${API}/teacher/students/${user.id_user}`);
  const data = await res.json();

  tbody.innerHTML = "";

  if (!data.students.length) {
    tbody.innerHTML = `
      <tr><td colspan="2" style="text-align:center;">Tidak ada siswa.</td></tr>
    `;
    return;
  }

  data.students.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.real_name}</td>
      <td>${s.username}</td>
    `;
    tbody.appendChild(tr);
  });
}


// materi-add.html
async function initAddMateriPage() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  // Get this teacher's mapel automatically
  const resMapel = await fetch(`${API}/teacher/mapel/${user.id_user}`);
  const { mapel } = await resMapel.json();

  const form = document.getElementById("addMateriForm");
  const status = document.getElementById("add-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("loggedInUser"));

    // 1. Get teacher's mapel
    const resMapel = await fetch(`${API}/teacher/mapel/${user.id_user}`);
    const mapelData = await resMapel.json();

    if (!mapelData.success || !mapelData.mapel) {
      alert("Gagal menemukan mapel yang diajar guru ini.");
      return;
    }

    const mapel = mapelData.mapel;   // <-- contains id_mapel

    // 2. Build payload
    const payload = {
      id_mapel: mapel.id_mapel,
      teacher_id: user.id_user,
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
      file_url: document.getElementById("file_url").value || "",
      visible_to_class: user.class,
      sort_order: document.getElementById("sort_order").value,
    };

    // 3. Submit to backend
    const res = await fetch(`${API}/materi/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      alert("Materi berhasil ditambahkan");
      window.location.href = "dashboard.html";
    } else {
      alert("Error: " + data.error);
    }
  });

}

// edit materi
function editMateri(id) {
  window.location.href = `materi-edit.html?id=${id}`;
}

async function initEditMateriPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const status = document.getElementById("edit-status");
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  // Load materi
  const res = await fetch(`${API}/materi/get/${id}`);
  const data = await res.json();
  const m = data.materi;

  document.getElementById("title").value = m.title;
  document.getElementById("description").value = m.description;
  document.getElementById("file_url").value = m.file_url;
  document.getElementById("sort_order").value = m.sort_order;

  document.getElementById("editMateriForm").addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
      file_url: document.getElementById("file_url").value || "",
      visible_to_class: user.class,
      sort_order: document.getElementById("sort_order").value,
    };

    const res = await fetch(`${API}/materi/edit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });


    const r = await res.json();
    status.textContent = r.message;

    if (r.success) {
      setTimeout(() => window.location.href = "dashboard.html", 1000);
    }
  });
}



async function deleteMateri(id) {
  if (!confirm("Hapus materi ini?")) return;

  const res = await fetch(`${API}/materi/delete/${id}`, { method: "DELETE" });
  const data = await res.json();

  alert(data.message);
  location.reload();
}










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





// Page detection and initialization
document.addEventListener('DOMContentLoaded', () => {
  applyRoleUI();
  loadMore();
  const path = window.location.pathname;


  if (path.endsWith('dashboard.html')) {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (user.role === "teacher") {
      initTeacherDashboard();
      loadTeacherStudents();
      showTeacherClassAndMapel();   // <-- add this
    } else {
      generateLeaderboard();
    }
  }

  else if (path.endsWith('materi-add.html')) {
    showTeacherClassAndMapel();     // <-- add
    initAddMateriPage();
  }

  else if (path.endsWith('materi-edit.html')) {
    showTeacherClassAndMapel();     // <-- add
    initEditMateriPage();
  }

  else if (path.endsWith('materi.html')) initMateriPageDB();
  else if (path.endsWith('materi-detail.html')) initMateriDetailDB();

  else if (path.endsWith('kuis.html')) initKuisPage();
  else if (path.endsWith('kuis-detail.html')) initKuisDetail();
  else initLogin();
});
