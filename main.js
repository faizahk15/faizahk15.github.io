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

// Load newest lessons for student dashboard
async function loadNewestLessons() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "student") return;

  const container = document.getElementById("newest-lessons");
  if (!container) return;

  try {
    // Fetch all subjects for the student's class
    const res = await fetch(`${API}/materi/list/${user.class}`);
    const data = await res.json();

    if (!data.success || data.mapel.length === 0) {
      container.innerHTML = "<p>Belum ada materi yang tersedia.</p>";
      return;
    }

    // Get the first 3 newest materials across all subjects
    let allMaterials = [];

    // Fetch materials for each subject
    for (const subject of data.mapel) {
      const materiRes = await fetch(`${API}/materi/detail/${subject.id_mapel}`);
      const materiData = await materiRes.json();

      if (materiData.success && materiData.materi.length > 0) {
        materiData.materi.forEach(material => {
          allMaterials.push({
            ...material,
            subject_name: subject.name
          });
        });
      }
    }

    // Sort by creation date (newest first) and take first 3
    allMaterials.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    const newestMaterials = allMaterials.slice(0, 3);

    if (newestMaterials.length === 0) {
      container.innerHTML = "<p>Belum ada materi yang tersedia.</p>";
      return;
    }

    // Display the materials
    container.innerHTML = `
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${newestMaterials.map(material => `
          <li style="margin-bottom: 10px; padding: 10px; background: var(--colorWhite2); border-radius: 5px;">
            <strong>${material.subject_name}: ${material.title}</strong>
            <br>
            <small style="color: var(--colorAcc);">${material.teacher_name || 'Guru'}</small>
            ${material.description ? `<br><small>${material.description.substring(0, 50)}${material.description.length > 50 ? '...' : ''}</small>` : ''}
            ${material.file_url ? `<br><a href="${material.file_url}" target="_blank" class="btn small" style="margin-top: 5px;">Buka Materi</a>` : ''}
          </li>
        `).join('')}
      </ul>
      ${allMaterials.length > 3 ? `<a href="materi.html" class="btn" style="margin-top: 10px;">Lihat Semua Materi</a>` : ''}
    `;

  } catch (error) {
    console.error("Error loading newest lessons:", error);
    container.innerHTML = "<p>Error memuat materi terbaru.</p>";
  }
}

// Load active quizzes for student dashboard
async function loadActiveQuizzes() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "student") return;

  const container = document.getElementById("active-quizzes");
  if (!container) return;

  try {
    const res = await fetch(`${API}/quiz/student/${user.class}?user_id=${user.id_user}`);
    const data = await res.json();

    if (!data.success || data.quizzes.length === 0) {
      container.innerHTML = "<p>Tidak ada kuis aktif saat ini.</p>";
      return;
    }

    const now = new Date();
    const activeQuizzes = data.quizzes.filter(quiz => {
      const availableFrom = quiz.available_from ? new Date(quiz.available_from) : null;
      const availableUntil = quiz.available_until ? new Date(quiz.available_until) : null;

      const isAvailable = (!availableFrom || now >= availableFrom) &&
        (!availableUntil || now <= availableUntil);

      const attemptsMade = quiz.attempts_made || 0;
      const attemptsLeft = Math.max(0, quiz.max_attempts - attemptsMade);

      return isAvailable && attemptsLeft > 0;
    }).slice(0, 3); // Show only first 3 active quizzes

    if (activeQuizzes.length === 0) {
      container.innerHTML = "<p>Tidak ada kuis aktif saat ini.</p>";
      return;
    }

    container.innerHTML = `
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${activeQuizzes.map(quiz => {
      const availableFrom = quiz.available_from ? new Date(quiz.available_from).toLocaleDateString('id-ID') : 'Sekarang';
      const availableUntil = quiz.available_until ? new Date(quiz.available_until).toLocaleDateString('id-ID') : 'Tidak ada batas';
      const attemptsMade = quiz.attempts_made || 0;
      const attemptsLeft = Math.max(0, quiz.max_attempts - attemptsMade);

      return `
            <li style="margin-bottom: 10px; padding: 10px; background: var(--colorWhite2); border-radius: 5px;">
              <strong>${quiz.title}</strong>
              <br>
              <small style="color: var(--colorAcc);">${quiz.subject_name} • ${quiz.time_limit} menit</small>
              ${quiz.description ? `<br><small>${quiz.description.substring(0, 50)}${quiz.description.length > 50 ? '...' : ''}</small>` : ''}
              <br>
              <small><strong>Percobaan:</strong> ${attemptsMade} dikerjakan, ${attemptsLeft} tersisa</small>
              <br>
              <small><strong>Periode:</strong> ${availableFrom} - ${availableUntil}</small>
              <br>
              <button class="btn small start-quiz" data-id="${quiz.id_quiz}" style="margin-top: 5px;">
                Mulai Kuis
              </button>
            </li>
          `;
    }).join('')}
      </ul>
      ${data.quizzes.length > 3 ? `<a href="kuis.html" class="btn" style="margin-top: 10px;">Lihat Semua Kuis</a>` : ''}
    `;

    // Add event listeners for start quiz buttons
    container.addEventListener('click', function (e) {
      if (e.target.classList.contains('start-quiz')) {
        const quizId = e.target.getAttribute('data-id');
        startQuiz(quizId);
      }
    });

  } catch (error) {
    console.error("Error loading active quizzes:", error);
    container.innerHTML = "<p>Error memuat kuis aktif.</p>";
  }
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

/*
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
  */







// ===== STUDENT QUIZ =====

// Load available quizzes for student
async function loadStudentQuizzes() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "student") return;

  const container = document.getElementById("quiz-list");
  if (!container) return;

  try {
    container.innerHTML = "<p>Memuat kuis...</p>";
    console.log("User class:", user.class); // Debug log
    console.log("User ID:", user.id_user); // Debug log
    const res = await fetch(`${API}/quiz/student/${user.class}?user_id=${user.id_user}`);
    const data = await res.json();
    console.log("API Response:", data); // Debug log

    if (!data.success || data.quizzes.length === 0) {
      container.innerHTML = "<p>Tidak ada kuis yang tersedia saat ini.</p>";
      console.log("No quizzes found for class:", user.class); // Debug log
      return;
    }

    container.innerHTML = "";
    data.quizzes.forEach(quiz => {
      const quizCard = document.createElement("div");
      quizCard.className = "card";

      // Check if quiz is available
      const now = new Date();
      const availableFrom = quiz.available_from ? new Date(quiz.available_from) : null;
      const availableUntil = quiz.available_until ? new Date(quiz.available_until) : null;

      const isAvailable = (!availableFrom || now >= availableFrom) &&
        (!availableUntil || now <= availableUntil);

      const attemptsMade = quiz.attempts_made || 0;
      const attemptsLeft = Math.max(0, quiz.max_attempts - attemptsMade);

      quizCard.innerHTML = `
        <h3>${quiz.title}</h3>
        <p>${quiz.description || 'Tidak ada deskripsi'}</p>
        <p><strong>Mata Pelajaran:</strong> ${quiz.subject_name}</p>
        <p><strong>Waktu:</strong> ${quiz.time_limit} menit</p>
        <p><strong>Status:</strong> 
          <span class="attempt-status">
            ${attemptsMade} dikerjakan, ${attemptsLeft} percobaan tersisa
          </span>
        </p>
        ${availableFrom ? `<p><strong>Tersedia dari:</strong> ${new Date(quiz.available_from).toLocaleString('id-ID')}</p>` : ''}
        ${availableUntil ? `<p><strong>Sampai:</strong> ${new Date(quiz.available_until).toLocaleString('id-ID')}</p>` : ''}
        
        <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
          ${isAvailable && attemptsLeft > 0
          ? `<button class="btn start-quiz" data-id="${quiz.id_quiz}">Mulai Kuis</button>`
          : `<button class="btn" disabled>${!isAvailable ? 'Belum Tersedia' : 'Tidak Ada Percobaan Lagi'}</button>`}
          
          ${attemptsMade > 0
          ? `<button class="btn view-results" data-id="${quiz.id_quiz}" onclick="viewStudentQuizResults(${quiz.id_quiz})">Lihat Nilai</button>`
          : ''}
        </div>
      `;

      container.appendChild(quizCard);
    });

    // Use event delegation instead of individual event listeners
    container.addEventListener('click', function (e) {
      // Handle "Mulai Kuis" button clicks
      if (e.target.classList.contains('start-quiz')) {
        const quizId = e.target.getAttribute('data-id');
        startQuiz(quizId);
      }

      // Handle "Lihat Nilai" button clicks
      /*
      if (e.target.classList.contains('view-results')) {
        const quizId = e.target.getAttribute('data-id');
        viewStudentQuizResults(quizId);
      }
        */
    });

  } catch (error) {
    console.error("Error loading quizzes:", error);
    container.innerHTML = "<p>Error memuat kuis.</p>";
  }
}

// Start a quiz attempt
async function startQuiz(quizId) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  try {
    // Start attempt
    const startRes = await fetch(`${API}/quiz/attempt/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_quiz: quizId,
        id_user: user.id_user
      })
    });

    const startData = await startRes.json();

    if (startData.success) {
      // Redirect to quiz taking page
      window.location.href = `kuis-take.html?id=${quizId}&attempt=${startData.id_attempt}`;
    } else {
      alert(startData.message || "Gagal memulai kuis");
    }
  } catch (error) {
    console.error("Error starting quiz:", error);
    alert("Error memulai kuis");
  }
}

// View quiz results
function viewStudentQuizResults(quizId) {
  console.log("Redirecting to view results for quiz:", quizId); // Debug log
  window.location.href = `kuis-nilai.html?quiz=${quizId}`;
}

// Load and display quiz for taking
async function loadQuizForTaking() {
  const params = new URLSearchParams(window.location.search);
  const quizId = params.get("id");
  const attemptId = params.get("attempt");

  if (!quizId || !attemptId) {
    window.location.href = "kuis.html";
    return;
  }

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const container = document.getElementById("quiz-container");
  const timerEl = document.getElementById("quiz-timer");

  try {
    // Get quiz data
    const res = await fetch(`${API}/quiz/${quizId}`);
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = "<p>Kuis tidak ditemukan.</p>";
      return;
    }

    const quiz = data.quiz;
    const questions = data.questions;

    // Display quiz info
    document.getElementById("quiz-title").textContent = quiz.title;
    document.getElementById("quiz-description").textContent = quiz.description || '';
    document.getElementById("time-limit").textContent = quiz.time_limit;

    // Build quiz form
    const form = document.getElementById("quiz-form");
    form.innerHTML = '';

    questions.forEach((question, index) => {
      const questionDiv = document.createElement("div");
      questionDiv.className = "question-card";
      questionDiv.innerHTML = `
        <div class="question-header">
          <h3>Pertanyaan ${index + 1}</h3>
          <span class="points">(${question.points} poin)</span>
        </div>
        <p class="question-text">${question.question_text}</p>
        <div class="question-options">
          ${renderQuestionOptions(question, index)}
        </div>
      `;
      form.appendChild(questionDiv);
    });

    // Add submit button
    const submitDiv = document.createElement("div");
    submitDiv.style.marginTop = "20px";
    submitDiv.innerHTML = `
      <button type="submit" class="btn">Submit Jawaban</button>
      <button type="button" id="save-draft" class="btn" style="margin-left: 10px;">Simpan Draft</button>
    `;
    form.appendChild(submitDiv);

    // Start timer if time limit exists
    if (quiz.time_limit > 0) {
      startTimer(quiz.time_limit, timerEl, form);
    }

    // Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitQuiz(quizId, attemptId, questions);
    });

    // Save draft functionality
    document.getElementById("save-draft").addEventListener("click", () => {
      saveDraft(quizId, attemptId, questions);
    });

    // Load draft if exists
    loadDraft(form);

  } catch (error) {
    console.error("Error loading quiz:", error);
    container.innerHTML = "<p>Error memuat kuis.</p>";
  }
}

// Render question options based on type
function renderQuestionOptions(question, index) {
  if (question.question_type === 'essay') {
    return `
      <textarea name="q${index}" data-question-id="${question.id_question}" 
                placeholder="Tulis jawaban Anda di sini..." 
                rows="4" style="width: 100%; padding: 8px;"></textarea>
    `;
  } else {
    // Multiple choice or true/false
    return question.options.map((option, optIndex) => `
      <label style="display: block; margin: 8px 0; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
        <input type="radio" name="q${index}" value="${option.id_option}" 
               data-question-id="${question.id_question}">
        <span style="margin-left: 8px;">${option.option_text}</span>
      </label>
    `).join('');
  }
}

// Timer functionality
function startTimer(minutes, timerEl, form) {
  let timeLeft = minutes * 60;

  const timer = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (timeLeft <= 0) {
      clearInterval(timer);
      timerEl.innerHTML = '<span style="color: red;">Waktu Habis!</span>';
      alert("Waktu sudah habis! Mengirim jawaban secara otomatis...");
      form.dispatchEvent(new Event('submit'));
    }

    timeLeft--;

    // Warning when 5 minutes left
    if (timeLeft === 300) {
      timerEl.style.color = "orange";
      alert("Sisa waktu 5 menit!");
    }

    // Critical when 1 minute left
    if (timeLeft === 60) {
      timerEl.style.color = "red";
    }
  }, 1000);
}

// Submit quiz answers
async function submitQuiz(quizId, attemptId, questions) {
  const form = document.getElementById("quiz-form");
  const answers = [];

  // Collect answers
  questions.forEach((question, index) => {
    const input = form.querySelector(`[name="q${index}"]`);

    if (question.question_type === 'essay') {
      if (input && input.value.trim()) {
        answers.push({
          id_question: question.id_question,
          answer_text: input.value.trim()
        });
      }
    } else {
      const selectedOption = form.querySelector(`[name="q${index}"]:checked`);
      if (selectedOption) {
        answers.push({
          id_question: question.id_question,
          id_option: selectedOption.value
        });
      }
    }
  });

  try {
    const submitRes = await fetch(`${API}/quiz/attempt/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_attempt: attemptId,
        answers: answers
      })
    });

    const submitData = await submitRes.json();

    if (submitData.success) {
      // Clear draft
      localStorage.removeItem(`quiz_draft_${quizId}_${attemptId}`);

      // Redirect to results page
      window.location.href = `kuis-result.html?attempt=${attemptId}`;
    } else {
      alert("Gagal mengirim jawaban: " + (submitData.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Error submitting quiz:", error);
    alert("Error mengirim jawaban");
  }
}

// Save draft locally
function saveDraft(quizId, attemptId, questions) {
  const form = document.getElementById("quiz-form");
  const draft = {};

  questions.forEach((question, index) => {
    const input = form.querySelector(`[name="q${index}"]`);
    if (input) {
      if (question.question_type === 'essay') {
        draft[`q${index}`] = input.value;
      } else {
        const selectedOption = form.querySelector(`[name="q${index}"]:checked`);
        draft[`q${index}`] = selectedOption ? selectedOption.value : '';
      }
    }
  });

  localStorage.setItem(`quiz_draft_${quizId}_${attemptId}`, JSON.stringify(draft));
  alert("Draft berhasil disimpan!");
}

// Load draft
function loadDraft(form) {
  const params = new URLSearchParams(window.location.search);
  const quizId = params.get("id");
  const attemptId = params.get("attempt");

  const draft = localStorage.getItem(`quiz_draft_${quizId}_${attemptId}`);
  if (draft) {
    const draftData = JSON.parse(draft);

    Object.keys(draftData).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'textarea') {
          input.value = draftData[key];
        } else if (input.type === 'radio') {
          const radioToCheck = form.querySelector(`[name="${key}"][value="${draftData[key]}"]`);
          if (radioToCheck) {
            radioToCheck.checked = true;
          }
        }
      }
    });

    console.log("Draft loaded successfully");
  }
}

// Display quiz results
async function displayQuizResults() {
  const params = new URLSearchParams(window.location.search);
  const attemptId = params.get("attempt");

  if (!attemptId) {
    window.location.href = "kuis.html";
    return;
  }

  const container = document.getElementById("quiz-result");

  try {
    // In a real implementation, you'd fetch attempt details from API
    // For now, we'll show a simple result page

    container.innerHTML = `
      <div class="card">
        <h2>Kuis Selesai!</h2>
        <p>Jawaban Anda telah berhasil dikirim.</p>
        <p>Guru akan memeriksa jawaban essay dan nilai akhir akan tersedia kemudian.</p>
        <div style="margin-top: 20px;">
          <a href="kuis.html" class="btn">Kembali ke Daftar Kuis</a>
          <a href="dashboard.html" class="btn" style="margin-left: 10px;">Kembali ke Dashboard</a>
        </div>
      </div>
    `;

  } catch (error) {
    console.error("Error displaying results:", error);
    container.innerHTML = "<p>Error memuat hasil kuis.</p>";
  }
}

// Load student grades grouped by subject and individual quizzes
async function loadStudentGrades() {
  console.log('loadStudentGrades function called!');
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const container = document.getElementById("grades-container");
  const noGrades = document.getElementById("no-grades");

  if (!container) return;

  try {
    container.innerHTML = "<p>Memuat nilai...</p>";

    const res = await fetch(`${API}/quiz/grades/${user.id_user}`);
    const data = await res.json();

    if (!data.success || !data.grades || data.grades.length === 0) {
      container.innerHTML = "";
      noGrades.style.display = "block";
      return;
    }

    container.innerHTML = "";
    noGrades.style.display = "none";

    // Check if quiz parameter exists in URL
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quiz");

    // Filter grades by specific quiz if parameter exists
    let filteredGrades = data.grades;
    if (quizId) {
      filteredGrades = data.grades.filter(grade => grade.id_quiz == quizId);
      
      if (filteredGrades.length === 0) {
        container.innerHTML = `
          <div class="card">
            <h3>Belum Ada Nilai untuk Kuis Ini</h3>
            <p>Anda belum mengerjakan kuis ini atau nilai belum tersedia.</p>
            <a href="kuis.html" class="btn">Kembali ke Daftar Kuis</a>
            <a href="kuis-nilai.html" class="btn" style="margin-left: 10px;">Lihat Semua Nilai</a>
          </div>
        `;
        return;
      }
    }

    // Group grades by subject, then by individual quiz
    const gradesBySubject = {};

    filteredGrades.forEach(grade => {
      const subjectKey = grade.subject_name;
      
      if (!gradesBySubject[subjectKey]) {
        gradesBySubject[subjectKey] = {
          subject_name: grade.subject_name,
          quizzes: []
        };
      }

      // Find if this quiz already exists in the subject
      const existingQuiz = gradesBySubject[subjectKey].quizzes.find(
        quiz => quiz.quiz_id === grade.id_quiz
      );

      if (existingQuiz) {
        // Add attempt to existing quiz
        existingQuiz.attempts.push(grade);
      } else {
        // Create new quiz entry
        gradesBySubject[subjectKey].quizzes.push({
          quiz_title: grade.quiz_title,
          quiz_id: grade.id_quiz,
          attempts: [grade]
        });
      }
    });

    // Sort attempts within each quiz by attempt number (descending)
    Object.values(gradesBySubject).forEach(subjectData => {
      subjectData.quizzes.forEach(quiz => {
        quiz.attempts.sort((a, b) => b.attempt_number - a.attempt_number);
      });
      
      // Sort quizzes by most recent attempt
      subjectData.quizzes.sort((a, b) => {
        const aLatest = new Date(a.attempts[0].submitted_at);
        const bLatest = new Date(b.attempts[0].submitted_at);
        return bLatest - aLatest;
      });
    });

    // Display header - different header for filtered view
    const headerCard = document.createElement("div");
    headerCard.className = "card";
    
    if (quizId) {
      const quizTitle = filteredGrades[0]?.quiz_title || "Kuis";
      headerCard.innerHTML = `
        <div>
          <h2>📊 Nilai: ${quizTitle}</h2>
          <a href="kuis-nilai.html" class="btn">Lihat Semua Nilai</a>
        </div>
        <p>Berikut adalah riwayat nilai untuk kuis <strong>${quizTitle}</strong>.</p>
        <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
          <div style="background: #e8f5e8; padding: 8px 12px; border-radius: 20px; font-size: 0.9em;">
            <strong>Total Percobaan:</strong> ${filteredGrades.length}
          </div>
          <div style="background: #e8f5e8; padding: 8px 12px; border-radius: 20px; font-size: 0.9em;">
            <strong>Mata Pelajaran:</strong> ${filteredGrades[0]?.subject_name || '-'}
          </div>
        </div>
      `;
    } else {
      headerCard.innerHTML = `
        <h2>📊 Nilai Semua Kuis</h2>
        <p>Berikut adalah riwayat nilai semua kuis yang telah Anda kerjakan, dikelompokkan berdasarkan mata pelajaran.</p>
        <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
          <div style="background: #e8f5e8; padding: 8px 12px; border-radius: 20px; font-size: 0.9em;">
            <strong>Total Kuis Dikerjakan:</strong> ${Object.values(gradesBySubject).reduce((total, subject) => total + subject.quizzes.length, 0)}
          </div>
          <div style="background: #e8f5e8; padding: 8px 12px; border-radius: 20px; font-size: 0.9em;">
            <strong>Mata Pelajaran:</strong> ${Object.keys(gradesBySubject).length}
          </div>
        </div>
      `;
    }
    
    container.appendChild(headerCard);

    // If we're viewing a specific quiz, show a simplified view without subject grouping
    if (quizId) {
      const quizData = Object.values(gradesBySubject)[0]?.quizzes[0]; // Get the first (and only) quiz
      if (quizData) {
        const quizCard = document.createElement("div");
        quizCard.className = "card";
        
        const latestAttempt = quizData.attempts?.[0] || {};
        const bestAttempt = quizData.attempts?.length > 0 
          ? [...quizData.attempts].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0] 
          : {};        

        quizCard.innerHTML = `
          <div class="quiz-header">
            <h3>${quizData.quiz_title}</h3>
            <span class="subject-badge">${Object.values(gradesBySubject)[0].subject_name}</span>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
            <div class="info-card">
              <strong>Percobaan Terbaik</strong><br>
              <span style="font-size: 1.5em; font-weight: bold; color: #4CAF50;">${bestAttempt?.percentage || 0}%</span><br>
              <small>Percobaan #${bestAttempt?.attempt_number || 'N/A'}</small>
            </div>
            <div class="info-card">
              <strong>Percobaan Terakhir</strong><br>
              <span style="font-size: 1.5em; font-weight: bold;">${latestAttempt?.percentage || 0}%</span><br>
              <small>Percobaan #${latestAttempt?.attempt_number || 'N/A'}</small>
            </div>
            <div class="info-card">
              <strong>Total Percobaan</strong><br>
              <span style="font-size: 1.5em; font-weight: bold;">${quizData.attempts?.length || 0}</span>
            </div>
          </div>
          
          <h4>Riwayat Percobaan:</h4>
          <div class="attempts-list">
            ${quizData.attempts.map((attempt, index) => `
              <div class="attempt-item">
                <div class="attempt-info">
                  <strong>Percobaan ${attempt.attempt_number || index + 1}</strong>
                  <span class="attempt-date">${attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString('id-ID') : 'Tanggal tidak tersedia'}</span>
                  ${attempt.teacher_comment ? `
                    <div style="margin-top: 8px; padding: 8px; background: #f0f8ff; border-radius: 5px; border-left: 3px solid #4CAF50;">
                      <strong>Komentar Guru:</strong> ${attempt.teacher_comment}
                    </div>
                  ` : ''}
                </div>
                <div class="attempt-score">
                  <span class="score">${attempt.score || 0}/${attempt.max_score || 0}</span>
                  <span class="percentage ${getScoreColorClass(attempt.percentage || 0)}">${attempt.percentage || 0}%</span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        
        container.appendChild(quizCard);
      }
    } else {
      // Display grades by subject (original behavior)
      Object.values(gradesBySubject).forEach(subjectData => {
        const subjectCard = document.createElement("div");
        subjectCard.className = "card subject-grade-card";
        
        const totalQuizzes = subjectData.quizzes.length;
        const totalAttempts = subjectData.quizzes.reduce((total, quiz) => total + quiz.attempts.length, 0);
        
        // Calculate average score for this subject
        const allScores = subjectData.quizzes.flatMap(quiz => 
          quiz.attempts.map(attempt => parseFloat(attempt.percentage))
        );
        const averageScore = allScores.length > 0 
          ? (allScores.reduce((sum, score) => sum + score, 0) / allScores.length).toFixed(1)
          : 0;

        subjectCard.innerHTML = `
          <div class="subject-header">
            <div class="subject-title">
              <h3>${getSubjectIcon(subjectData.subject_name)} ${subjectData.subject_name}</h3>
              <span class="subject-stats">
                ${totalQuizzes} kuis • ${totalAttempts} percobaan • Rata-rata: ${averageScore}%
              </span>
            </div>
            <div class="subject-average ${getScoreColorClass(averageScore)}">
              ${averageScore}%
            </div>
          </div>
          
          <div class="quizzes-list">
            ${subjectData.quizzes.map(quiz => {
              const latestAttempt = quiz.attempts[0]; // Most recent attempt (already sorted)
              const bestAttempt = [...quiz.attempts].sort((a, b) => b.percentage - a.percentage)[0];
              const attemptCount = quiz.attempts.length;
              
              return `
                <div class="quiz-grade-item">
                  <div class="quiz-header">
                    <h4>${quiz.quiz_title}</h4>
                    <div class="quiz-meta">
                      <span class="attempt-count">${attemptCount} percobaan</span>
                      <span class="best-score">Terbaik: ${bestAttempt.percentage}%</span>
                      <span class="latest-score">Terakhir: ${latestAttempt.percentage}%</span>
                    </div>
                    ${latestAttempt.teacher_comment ? `
                      <div class="teacher-comment">
                        <strong>Komentar Guru:</strong> ${latestAttempt.teacher_comment}
                      </div>
                    ` : ''}
                  </div>
                  <div class="quiz-scores">
                    ${quiz.attempts.map((attempt, index) => `
                      <div class="attempt-score ${index === 0 ? 'latest' : ''}">
                        <span class="attempt-number">#${attempt.attempt_number}</span>
                        <span class="score ${getScoreColorClass(attempt.percentage)}">
                          ${attempt.percentage}%
                        </span>
                        <small>${new Date(attempt.submitted_at).toLocaleDateString('id-ID')}</small>
                        ${attempt.teacher_comment && index > 0 ? `
                          <div class="attempt-comment">
                            <em>${attempt.teacher_comment}</em>
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        container.appendChild(subjectCard);
      });
    }

  } catch (error) {
    console.error("Error loading grades:", error);
    container.innerHTML = `
      <div class="card">
        <h3>Error Memuat Nilai</h3>
        <p>Terjadi kesalahan saat memuat nilai. Silakan refresh halaman atau coba lagi nanti.</p>
        <button class="btn" onclick="location.reload()" style="margin-top: 10px;">Refresh Halaman</button>
      </div>
    `;
  }
}

// Helper function to get subject icons
function getSubjectIcon(subjectName) {
  const icons = {
    'Matematika': '🔢',
    'Ilmu Pengetahuan Alam': '🔬',
    'Bahasa Indonesia': '📚',
    'IPA': '🔬'
  };
  return icons[subjectName] || '📝';
}

// Helper function to get score color class
function getScoreColorClass(percentage) {
  const perc = parseFloat(percentage);
  if (perc >= 85) return 'score-excellent';
  if (perc >= 75) return 'score-good';
  if (perc >= 65) return 'score-average';
  return 'score-poor';
}

// Get color based on score percentage
function getScoreColor(percentage) {
  if (percentage >= 80) return "score-excellent";
  if (percentage >= 70) return "score-good";
  if (percentage >= 60) return "score-average";
  return "score-poor";
}

// Load detailed quiz attempt
async function loadQuizAttemptDetail() {
  const params = new URLSearchParams(window.location.search);
  const attemptId = params.get("id");

  if (!attemptId) {
    window.location.href = "guru-quiz-results.html";
    return;
  }

  const container = document.getElementById("attempt-detail");
  const attemptTitle = document.getElementById("attempt-title");
  const attemptHeader = document.getElementById("attempt-header");

  if (!container) return;

  try {
    container.innerHTML = "<p>Memuat detail percobaan...</p>";

    const res = await fetch(`${API}/teacher/quiz/attempt/${attemptId}`);
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    const attempt = data.attempt;
    const answers = data.answers;

    // Display attempt header
    attemptTitle.textContent = `Detail Percobaan: ${attempt.quiz_title}`;
    attemptHeader.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div class="info-card">
          <strong>Siswa:</strong><br>
          ${attempt.real_name} (${attempt.class})
        </div>
        <div class="info-card">
          <strong>Percobaan Ke:</strong><br>
          ${attempt.attempt_number}
        </div>
        <div class="info-card">
          <strong>Skor:</strong><br>
          ${attempt.score}/${attempt.max_score} (${Math.round((attempt.score / attempt.max_score) * 100)}%)
        </div>
        <div class="info-card">
          <strong>Submit:</strong><br>
          ${new Date(attempt.submitted_at).toLocaleString('id-ID')}
        </div>
      </div>
    `;

    // Display detailed answers
    if (answers.length === 0) {
      container.innerHTML = "<p>Tidak ada jawaban yang tersimpan.</p>";
      return;
    }

    container.innerHTML = `
      <h3>Detail Jawaban (${answers.length} pertanyaan)</h3>
      <div id="answers-list"></div>
    `;

    const answersList = document.getElementById("answers-list");

    answers.forEach((answer, index) => {
      const answerCard = document.createElement("div");
      answerCard.className = "answer-card";
      answerCard.style.border = "1px solid #ddd";
      answerCard.style.borderRadius = "8px";
      answerCard.style.padding = "15px";
      answerCard.style.marginBottom = "15px";
      answerCard.style.backgroundColor = answer.points_earned > 0 ? "#f8fff8" : "#fff8f8";

      let answerHtml = `
        <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 10px;">
          <h4 style="margin: 0; flex: 1;">Pertanyaan ${index + 1} (${answer.points_earned}/${answer.max_points} poin)</h4>
          <span style="color: ${answer.points_earned > 0 ? 'green' : 'red'}; font-weight: bold;">
            ${answer.points_earned > 0 ? '✓ Benar' : '✗ Salah'}
          </span>
        </div>
        <p><strong>Pertanyaan:</strong> ${answer.question_text}</p>
        <p><strong>Tipe:</strong> ${answer.question_type}</p>
      `;

      if (answer.question_type === 'essay') {
        answerHtml += `
          <p><strong>Jawaban Essay:</strong></p>
          <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
            ${answer.answer_text || '<em>Tidak ada jawaban</em>'}
          </div>
          <p><em>Jawaban essay memerlukan penilaian manual oleh guru.</em></p>
        `;
      } else {
        answerHtml += `
          <p><strong>Jawaban Dipilih:</strong> ${answer.selected_option_text || '<em>Tidak ada pilihan</em>'}</p>
        `;

        if (answer.correct_option_text) {
          answerHtml += `
            <p><strong>Jawaban Benar:</strong> ${answer.correct_option_text}</p>
          `;
        }
      }

      answerCard.innerHTML = answerHtml;
      answersList.appendChild(answerCard);
    });

  } catch (error) {
    console.error("Error loading attempt detail:", error);
    container.innerHTML = "<p>Error memuat detail percobaan.</p>";
  }
}








// ===== TEACHER QUIZ MANAGEMENT =====

// Global variables
let currentEditingQuizId = null;



// Setup create quiz form in guru-quiz.html
function setupCreateQuizForm() {
  const createForm = document.getElementById("createQuizForm");
  if (!createForm) return;

  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user) return;

    // Get form data - including proper date handling
    const quizData = {
      title: document.getElementById("quizTitle").value.trim(),
      description: document.getElementById("quizDescription").value.trim(),
      time_limit: parseInt(document.getElementById("quizTimeLimit").value) || 30,
      max_attempts: parseInt(document.getElementById("quizMaxAttempts").value) || 1,
      available_from: document.getElementById("quizAvailableFrom").value || null,
      available_until: document.getElementById("quizAvailableUntil").value || null,
      questions: []
    };

    // Validate required fields
    if (!quizData.title) {
      alert("Judul kuis harus diisi");
      return;
    }

    // Validate dates if both are provided
    if (quizData.available_from && quizData.available_until) {
      const fromDate = new Date(quizData.available_from);
      const untilDate = new Date(quizData.available_until);

      if (untilDate <= fromDate) {
        alert("Tanggal 'Tersedia Sampai' harus setelah tanggal 'Tersedia Dari'");
        return;
      }
    }

    try {
      // Show loading state
      const submitBtn = createForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Membuat...";
      submitBtn.disabled = true;

      // Create the quiz
      const result = await quickCreateQuiz(quizData);

      if (result.success) {
        alert("Kuis berhasil dibuat! Sekarang tambahkan pertanyaan.");
        closeCreateQuizModal();
        // Redirect to quiz editor to add questions
        window.location.href = `guru-quiz-create.html?edit=${result.id_quiz}`;
      } else {
        alert("Gagal membuat kuis: " + (result.error || "Unknown error"));
      }

      // Restore button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;

    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Error membuat kuis");

      // Restore button state
      const submitBtn = createForm.querySelector('button[type="submit"]');
      submitBtn.textContent = "Buat Kuis";
      submitBtn.disabled = false;
    }
  });
}


// Enhanced quickCreateQuiz function that preserves ALL data including dates
async function quickCreateQuiz(quizData) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  try {
    // Get teacher's subject
    const resMapel = await fetch(`${API}/teacher/mapel/${user.id_user}`);
    const mapelData = await resMapel.json();

    if (!mapelData.success || !mapelData.mapel) {
      return { success: false, error: "Guru tidak memiliki mapel yang ditugaskan" };
    }

    const res = await fetch(`${API}/teacher/quiz/quick-create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...quizData,
        teacher_id: user.id_user,
        id_mapel: mapelData.mapel.id_mapel
      })
    });

    const data = await res.json();

    // Store COMPLETE quiz data in localStorage for the editor page
    if (data.success) {
      localStorage.setItem('pendingQuizData', JSON.stringify({
        ...quizData,
        id_quiz: data.id_quiz,
        // Ensure dates are preserved exactly as entered
        available_from: quizData.available_from,
        available_until: quizData.available_until
      }));
    }

    return data;
  } catch (error) {
    console.error("Error creating quiz:", error);
    return { success: false, error: "Gagal membuat kuis" };
  }
}


// Load pending quiz data in editor
function loadPendingQuizData() {
  const pendingData = localStorage.getItem('pendingQuizData');
  if (!pendingData) return null;

  const quizData = JSON.parse(pendingData);

  // Fill the form fields
  document.getElementById('quizId').value = quizData.id_quiz;
  document.getElementById('quizTitle').value = quizData.title;
  document.getElementById('quizDescription').value = quizData.description || '';
  document.getElementById('quizTimeLimit').value = quizData.time_limit || 30;
  document.getElementById('quizMaxAttempts').value = quizData.max_attempts || 1;

  // Properly handle dates - convert to datetime-local format
  if (quizData.available_from) {
    // Convert the date string to the format needed by datetime-local input
    const fromDate = new Date(quizData.available_from);
    document.getElementById('quizAvailableFrom').value = fromDate.toISOString().slice(0, 16);
  }

  if (quizData.available_until) {
    const untilDate = new Date(quizData.available_until);
    document.getElementById('quizAvailableUntil').value = untilDate.toISOString().slice(0, 16);
  }

  return quizData;
}

// Clear pending quiz data after successful save
function clearPendingQuizData() {
  localStorage.removeItem('pendingQuizData');
}



// Add date validation helper
function validateQuizDates() {
  const fromInput = document.getElementById('quizAvailableFrom');
  const untilInput = document.getElementById('quizAvailableUntil');

  if (fromInput.value && untilInput.value) {
    const fromDate = new Date(fromInput.value);
    const untilDate = new Date(untilInput.value);

    if (untilDate <= fromDate) {
      alert("⚠️ Peringatan: Tanggal 'Tersedia Sampai' harus setelah tanggal 'Tersedia Dari'");
      untilInput.focus();
      return false;
    }
  }
  return true;
}

// Add event listeners for date validation
function setupDateValidation() {
  const fromInput = document.getElementById('quizAvailableFrom');
  const untilInput = document.getElementById('quizAvailableUntil');

  if (fromInput && untilInput) {
    fromInput.addEventListener('change', validateQuizDates);
    untilInput.addEventListener('change', validateQuizDates);
  }
}




// Enhanced quiz form submission for guru-quiz-create.html
function setupQuizEditorForm() {
  const quizForm = document.getElementById("quizForm");
  if (!quizForm) return;

  // Load any pending quiz data first
  const pendingData = loadPendingQuizData();

  quizForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user) return;

    // Collect all questions
    const questions = collectQuestions();

    if (questions.length === 0) {
      alert("Tambahkan setidaknya satu pertanyaan sebelum menyimpan!");
      return;
    }

    const quizData = {
      id_quiz: document.getElementById("quizId").value,
      title: document.getElementById("quizTitle").value.trim(),
      description: document.getElementById("quizDescription").value.trim(),
      time_limit: parseInt(document.getElementById("quizTimeLimit").value) || 30,
      max_attempts: parseInt(document.getElementById("quizMaxAttempts").value) || 1,
      available_from: document.getElementById("quizAvailableFrom").value || null,
      available_until: document.getElementById("quizAvailableUntil").value || null,
      questions: questions
    };

    try {
      // Show loading state
      const submitBtn = quizForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Menyimpan...";
      submitBtn.disabled = true;

      // Save the quiz with questions
      const result = await saveQuizWithQuestions(quizData);

      if (result.success) {
        alert("Kuis berhasil disimpan dengan " + questions.length + " pertanyaan!");
        clearPendingQuizData(); // Clear the stored data
        // Redirect back to main quiz page
        window.location.href = "guru-quiz.html";
      } else {
        alert("Gagal menyimpan kuis: " + (result.error || "Unknown error"));
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }

    } catch (error) {
      console.error("Error saving quiz:", error);
      alert("Error menyimpan kuis");

      const submitBtn = quizForm.querySelector('button[type="submit"]');
      submitBtn.textContent = "Simpan Kuis";
      submitBtn.disabled = false;
    }
  });
}

// Collect all questions from the form
function collectQuestions() {
  const questions = [];
  const questionCards = document.querySelectorAll('.question-card');

  questionCards.forEach((card, index) => {
    const questionText = card.querySelector('.question-text').value.trim();
    const questionType = card.querySelector('.question-type').value;
    const points = parseInt(card.querySelector('.question-points').value) || 1;

    if (!questionText) return; // Skip empty questions

    const question = {
      question_text: questionText,
      question_type: questionType,
      points: points,
      sort_order: index,
      options: []
    };

    // Collect options for multiple choice questions
    if (questionType !== 'essay') {
      const optionInputs = card.querySelectorAll('.option-text');
      const correctRadios = card.querySelectorAll('.correct-option');

      optionInputs.forEach((input, optIndex) => {
        const optionText = input.value.trim();
        if (!optionText) return; // Skip empty options

        const isCorrect = correctRadios[optIndex]?.checked || false;

        question.options.push({
          option_text: optionText,
          is_correct: isCorrect,
          sort_order: optIndex
        });
      });

      // Validate that at least one option is marked correct for multiple choice
      if (questionType === 'multiple_choice' && !question.options.some(opt => opt.is_correct)) {
        alert(`Pertanyaan "${questionText.substring(0, 50)}..." harus memiliki jawaban yang benar!`);
        throw new Error("No correct answer selected");
      }
    }

    questions.push(question);
  });

  return questions;
}

// Save quiz with questions
async function saveQuizWithQuestions(quizData) {
  try {
    const res = await fetch(`${API}/teacher/quiz/save-with-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quizData)
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error saving quiz with questions:", error);
    return { success: false, error: "Gagal menyimpan kuis" };
  }
}

// Function to load existing quiz for editing
async function loadQuizForEditing(quizId) {
  try {
    const res = await fetch(`${API}/teacher/quiz/${quizId}`);
    const data = await res.json();

    if (data.success) {
      // Fill basic quiz info
      document.getElementById('quizId').value = data.quiz.id_quiz;
      document.getElementById('quizTitle').value = data.quiz.title;
      document.getElementById('quizDescription').value = data.quiz.description || '';
      document.getElementById('quizTimeLimit').value = data.quiz.time_limit;
      document.getElementById('quizMaxAttempts').value = data.quiz.max_attempts;

      if (data.quiz.available_from) {
        document.getElementById('quizAvailableFrom').value = data.quiz.available_from.replace(' ', 'T');
      }
      if (data.quiz.available_until) {
        document.getElementById('quizAvailableUntil').value = data.quiz.available_until.replace(' ', 'T');
      }

      // Clear existing questions and load new ones
      const questionsContainer = document.getElementById("questions-container");
      questionsContainer.innerHTML = '';

      data.questions.forEach(question => {
        addQuestion(question);
      });
    }
  } catch (error) {
    console.error("Error loading quiz for editing:", error);
  }
}


// Helper function to escape HTML (add to main.js)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load teacher's quizzes
async function loadTeacherQuizzes() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  try {
    const res = await fetch(`${API}/teacher/quizzes/${user.id_user}`);
    const data = await res.json();

    const quizList = document.getElementById("quiz-list");
    if (!quizList) return;

    if (!data.success || data.quizzes.length === 0) {
      quizList.innerHTML = '<p>Belum ada kuis. Buat kuis pertama Anda!</p>';
      return;
    }

    quizList.innerHTML = '';
    data.quizzes.forEach(quiz => {
      const quizDiv = document.createElement("div");
      quizDiv.className = "card";
      quizDiv.style.marginBottom = "15px";

      const attemptsText = quiz.total_attempts > 0 ?
        `• ${quiz.total_attempts} attempt` :
        '• Belum ada percobaan';

      quizDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h3 style="margin: 0 0 8px 0;">${quiz.title}</h3>
            <p style="margin: 0 0 8px 0; opacity: 0.8;">${quiz.description || 'Tidak ada deskripsi'}</p>
            <p style="margin: 0; font-size: 0.9em; opacity: 0.7;">
              ${quiz.subject_name} • ${quiz.time_limit} menit • ${quiz.max_attempts} percobaan maksimal
              ${attemptsText}
            </p>
            <p style="margin: 8px 0 0 0; font-size: 0.9em;">
              ${quiz.available_from ? `Tersedia: ${new Date(quiz.available_from).toLocaleString('id-ID')}` : ''}
              ${quiz.available_until ? `Sampai: ${new Date(quiz.available_until).toLocaleString('id-ID')}` : ''}
            </p>
          </div>
          <div style="display: flex; gap: 8px; flex-direction: column;">
            <button class="btn small" onclick="editQuiz(${quiz.id_quiz})">Edit</button>
            <button class="btn small" onclick="viewQuizResults(${quiz.id_quiz})">Lihat Hasil</button>
            <button class="btn small danger" onclick="deleteQuiz(${quiz.id_quiz}, '${escapeHtml(quiz.title)}')">Hapus</button>
          </div>
        </div>
      `;

      quizList.appendChild(quizDiv);
    });

  } catch (error) {
    console.error("Error loading quizzes:", error);
    document.getElementById("quiz-list").innerHTML = '<p>Error memuat kuis.</p>';
  }
}

// Enhanced createNewQuiz function
async function createNewQuiz(quizData) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  try {
    const res = await fetch(`${API}/teacher/quiz/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...quizData,
        teacher_id: user.id_user
      })
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error creating quiz:", error);
    return { success: false, error: "Gagal membuat kuis" };
  }
}

// Add question to quiz form
function addQuestion(questionData = null) {
  const container = document.getElementById("questions-container");
  const questionId = Date.now(); // Temporary ID

  const questionDiv = document.createElement("div");
  questionDiv.className = "question-card";
  questionDiv.style.border = "1px solid #ddd";
  questionDiv.style.padding = "15px";
  questionDiv.style.marginBottom = "15px";
  questionDiv.style.borderRadius = "8px";

  questionDiv.innerHTML = `
    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
      <h4 style="margin: 0;">Pertanyaan</h4>
      <button type="button" class="btn small danger" onclick="this.parentElement.parentElement.remove()">
        Hapus
      </button>
    </div>
    
    <label>Teks Pertanyaan:</label>
    <textarea class="question-text" rows="3" required 
      placeholder="Masukkan pertanyaan...">${questionData?.question_text || ''}</textarea>
    
    <label>Tipe Pertanyaan:</label>
    <select class="question-type" onchange="toggleQuestionOptions(this)">
      <option value="multiple_choice" ${(questionData?.question_type || 'multiple_choice') === 'multiple_choice' ? 'selected' : ''}>
        Pilihan Ganda
      </option>
      <option value="true_false" ${questionData?.question_type === 'true_false' ? 'selected' : ''}>
        Benar/Salah
      </option>
      <option value="essay" ${questionData?.question_type === 'essay' ? 'selected' : ''}>
        Essay
      </option>
    </select>
    
    <label>Poin:</label>
    <input type="number" class="question-points" value="${questionData?.points || 10}" min="1">
    
    <div class="options-container" style="margin-top: 15px; ${questionData?.question_type === 'essay' ? 'display: none;' : ''}">
      <label>Pilihan Jawaban:</label>
      <div class="options-list">
        ${renderOptions(questionData?.options || [])}
      </div>
      <button type="button" class="btn small" onclick="addOption(this)" style="margin-top: 8px;">
        + Tambah Pilihan
      </button>
    </div>
  `;

  container.appendChild(questionDiv);

  // Initialize the question type properly
  const questionTypeSelect = questionDiv.querySelector('.question-type');
  toggleQuestionOptions(questionTypeSelect);

  // If it's a new multiple choice question (not loaded from data), create 4 default options
  if (!questionData && questionTypeSelect.value === 'multiple_choice') {
    createDefaultOptions(questionDiv);
  }
}

// Create 4 default options for new multiple choice questions
function createDefaultOptions(questionDiv) {
  const optionsList = questionDiv.querySelector('.options-list');
  const optionLabels = ['A', 'B', 'C', 'D'];

  optionsList.innerHTML = ''; // Clear any existing options

  optionLabels.forEach((label, index) => {
    const optionRow = document.createElement("div");
    optionRow.className = "option-row";
    optionRow.style.marginBottom = "8px";

    optionRow.innerHTML = `
      <input type="text" class="option-text" placeholder="Pilihan ${label}" value="" required>
      <label style="display: inline-flex; align-items: center; margin-left: 10px;">
        <input type="radio" class="correct-option" name="correct_${Date.now()}" value="${index}" ${index === 0 ? 'checked' : ''}>
        <span style="margin-left: 5px;">Benar</span>
      </label>
      ${index > 0 ? `<button type="button" class="btn small danger" onclick="removeOption(this)" style="margin-left: 10px;">Hapus</button>` : ''}
    `;

    optionsList.appendChild(optionRow);
  });
}

// Update the renderOptions function to handle required attribute
function renderOptions(options) {
  // If we have existing options from loaded data, render them
  if (options.length > 0) {
    return options.map((option, index) => `
      <div class="option-row">
        <input type="text" class="option-text" value="${option.option_text}" ${index < 2 ? 'required' : ''}>
        <label style="display: inline-flex; align-items: center; margin-left: 10px;">
          <input type="radio" class="correct-option" name="correct_${Date.now()}" value="${index}" 
            ${option.is_correct ? 'checked' : ''}>
          <span style="margin-left: 5px;">Benar</span>
        </label>
        ${index > 0 ? `<button type="button" class="btn small danger" onclick="removeOption(this)" style="margin-left: 10px;">Hapus</button>` : ''}
      </div>
    `).join('');
  }

  // If no options provided (new question), return empty - the createDefaultOptions will handle it
  return '';
}

// Add this function to prevent form validation on hidden fields
function setupQuizFormValidation() {
  const quizForm = document.getElementById("quizForm");
  if (quizForm) {
    quizForm.addEventListener('submit', function(e) {
      // Remove required attribute from hidden option inputs before validation
      const hiddenOptionInputs = document.querySelectorAll('.options-container[style*="display: none"] .option-text[required]');
      hiddenOptionInputs.forEach(input => {
        input.removeAttribute('required');
      });
      
      // The form will now validate normally
    });
  }
}

// Add option to question
function addOption(button) {
  const optionsList = button.previousElementSibling;
  const optionRow = document.createElement("div");
  optionRow.className = "option-row";
  optionRow.style.marginBottom = "8px";

  optionRow.innerHTML = `
    <input type="text" class="option-text" placeholder="Pilihan baru" required>
    <label style="display: inline-flex; align-items: center; margin-left: 10px;">
      <input type="radio" class="correct-option" name="${button.closest('.question-card').querySelector('.correct-option').name}" value="${optionsList.children.length}">
      <span style="margin-left: 5px;">Benar</span>
    </label>
    <button type="button" class="btn small danger" onclick="removeOption(this)" style="margin-left: 10px;">Hapus</button>
  `;

  optionsList.appendChild(optionRow);
}

// Remove option
function removeOption(button) {
  button.closest('.option-row').remove();
}

// Toggle options based on question type
function toggleQuestionOptions(select) {
  const questionCard = select.closest('.question-card');
  const optionsContainer = questionCard.querySelector('.options-container');

  if (select.value === 'essay') {
    optionsContainer.style.display = 'none';
    // Remove required attribute from option inputs for essay questions
    const optionInputs = questionCard.querySelectorAll('.option-text');
    optionInputs.forEach(input => {
      input.removeAttribute('required');
    });
  } else {
    optionsContainer.style.display = 'block';
    // Add required attribute back for multiple choice/true false questions
    const optionInputs = questionCard.querySelectorAll('.option-text');
    optionInputs.forEach(input => {
      input.setAttribute('required', 'required');
    });

    // If it's a new multiple choice question and no options exist yet, create default options
    const optionsList = questionCard.querySelector('.options-list');
    if (select.value === 'multiple_choice' && optionsList.children.length === 0) {
      createDefaultOptions(questionCard);
    }

    // For true/false questions, ensure we have exactly 2 options
    if (select.value === 'true_false' && optionsList.children.length === 0) {
      createTrueFalseOptions(questionCard);
    }
  }
}

// Create default true/false options
function createTrueFalseOptions(questionDiv) {
  const optionsList = questionDiv.querySelector('.options-list');
  const trueFalseOptions = [
    { text: 'Benar', correct: true },
    { text: 'Salah', correct: false }
  ];

  optionsList.innerHTML = '';

  trueFalseOptions.forEach((option, index) => {
    const optionRow = document.createElement("div");
    optionRow.className = "option-row";
    optionRow.style.marginBottom = "8px";

    optionRow.innerHTML = `
      <input type="text" class="option-text" value="${option.text}" required>
      <label style="display: inline-flex; align-items: center; margin-left: 10px;">
        <input type="radio" class="correct-option" name="correct_${Date.now()}" value="${index}" ${option.correct ? 'checked' : ''}>
        <span style="margin-left: 5px;">Benar</span>
      </label>
      ${index > 0 ? `<button type="button" class="btn small danger" onclick="removeOption(this)" style="margin-left: 10px;">Hapus</button>` : ''}
    `;

    optionsList.appendChild(optionRow);
  });
}

// Open create quiz modal
function openCreateQuizModal() {
  document.getElementById("createQuizModal").classList.remove("hidden");
}

// Close create quiz modal
function closeCreateQuizModal() {
  document.getElementById("createQuizModal").classList.add("hidden");
  document.getElementById("createQuizForm").reset();
}

// Edit quiz
function editQuiz(quizId) {
  window.location.href = `guru-quiz-create.html?edit=${quizId}`;
}

// View quiz results
function viewQuizResults(quizId) {
  window.location.href = `guru-quiz-results.html?id=${quizId}`;
}

// Enhanced delete quiz function
async function deleteQuiz(quizId, quizTitle = '') {
  try {
    // Show basic confirmation first
    const basicConfirm = confirm(`Hapus kuis "${quizTitle}"?`);
    if (!basicConfirm) return;

    // Show loading state immediately
    const deleteBtn = event.target;
    const originalText = deleteBtn.textContent;
    deleteBtn.textContent = "Mengecek...";
    deleteBtn.disabled = true;

    // Get statistics for detailed confirmation
    let statsData;
    try {
      const statsRes = await fetch(`${API}/teacher/quiz/statistics/${quizId}`);
      statsData = await statsRes.json();
    } catch (statsError) {
      console.warn("Could not fetch statistics:", statsError);
      // Continue with deletion even if stats fail
    }

    // If we have statistics and there are attempts, show detailed confirmation
    if (statsData && statsData.success && statsData.statistics.total_attempts > 0) {
      const stats = statsData.statistics;

      const detailedMessage =
        `HAPUS KUIS: "${stats.title}"\n\n` +
        `📊 STATISTIK:\n` +
        `• ${stats.total_attempts} total percobaan\n` +
        `• ${stats.total_students} siswa telah mengerjakan\n` +
        `• Nilai rata-rata: ${stats.average_score}%\n` +
        `• Nilai tertinggi: ${stats.highest_score}%\n\n` +
        `⚠️  PERINGATAN:\n` +
        `• Semua data percobaan akan dihapus permanen\n` +
        `• Nilai siswa untuk kuis ini akan hilang\n` +
        `• Tindakan ini TIDAK DAPAT DIBATALKAN\n\n` +
        `Yakin ingin menghapus?`;

      deleteBtn.textContent = "Menunggu...";

      if (!confirm(detailedMessage)) {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
        return;
      }
    }

    // Proceed with deletion
    deleteBtn.textContent = "Menghapus...";

    const res = await fetch(`${API}/teacher/quiz/delete/${quizId}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (data.success) {
      let successMessage = `✅ Kuis "${quizTitle}" berhasil dihapus.`;

      if (data.deleted) {
        const d = data.deleted;
        if (d.attempts > 0) {
          successMessage += `\n\nData yang dihapus:\n` +
            `• ${d.attempts} percobaan siswa\n` +
            `• ${d.questions} pertanyaan\n` +
            `• ${d.answers} jawaban siswa`;
        }
      }

      alert(successMessage);
      loadTeacherQuizzes();
    } else {
      alert("❌ Gagal menghapus kuis: " + data.error);
      deleteBtn.textContent = originalText;
      deleteBtn.disabled = false;
    }

  } catch (error) {
    console.error("Error deleting quiz:", error);
    alert("❌ Error menghapus kuis. Silakan coba lagi.");

    const deleteBtn = event.target;
    deleteBtn.textContent = "Hapus";
    deleteBtn.disabled = false;
  }
}

// Load quiz results
async function loadQuizResults() {
  const params = new URLSearchParams(window.location.search);
  const quizId = params.get("id");

  if (!quizId) {
    window.location.href = "guru-quiz.html";
    return;
  }

  try {
    const res = await fetch(`${API}/teacher/quiz/results/${quizId}`);
    const data = await res.json();

    if (!data.success) {
      alert("Gagal memuat hasil kuis: " + data.error);
      return;
    }

    // Display quiz info
    document.getElementById("quiz-title").textContent = data.quiz.title;
    document.getElementById("quiz-info").textContent =
      `${data.quiz.subject_name} • ${data.statistics.total_attempts} percobaan • Rata-rata: ${data.statistics.average_score || 0}%`;

    // Display analytics
    const analyticsDiv = document.getElementById("quiz-analytics");
    analyticsDiv.innerHTML = `
      <p><strong>Total Percobaan:</strong> ${data.statistics.total_attempts}</p>
      <p><strong>Skor Tertinggi:</strong> ${data.statistics.highest_score || 0}%</p>
      <p><strong>Skor Terendah:</strong> ${data.statistics.lowest_score || 0}%</p>
      <p><strong>Rata-rata Skor:</strong> ${data.statistics.average_score || 0}%</p>
    `;

    // Display results table
    const resultsTable = document.getElementById("results-table");
    resultsTable.innerHTML = '';

    if (data.attempts.length === 0) {
      resultsTable.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px;">
            Belum ada siswa yang mengerjakan kuis ini.
          </td>
        </tr>
      `;
      return;
    }

    data.attempts.forEach(attempt => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${attempt.real_name}</td>
        <td>${attempt.class}</td>
        <td>${attempt.attempt_number}</td>
        <td>${attempt.score}/${attempt.max_score}</td>
        <td>${attempt.percentage}%</td>
        <td>${new Date(attempt.submitted_at).toLocaleString('id-ID')}</td>
        <td>
          <button class="btn small" onclick="viewAttemptDetails(${attempt.id_attempt})">
            Detail
          </button>
        </td>
      `;
      resultsTable.appendChild(row);
    });

  } catch (error) {
    console.error("Error loading quiz results:", error);
    alert("Error memuat hasil kuis");
  }
}

// View attempt details
function viewAttemptDetails(attemptId) {
  window.location.href = `guru-quiz-attempt.html?id=${attemptId}`;
}



// load forum posts
async function loadForumPosts() {
  const container = document.getElementById("post-container");
  if (!container) return;

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) return;

  try {
    // Only load posts from the same class as the user
    const res = await fetch(`${API}/forum/posts?class=${user.class}`);
    const data = await res.json();

    container.innerHTML = "";

    if (data.posts.length === 0) {
      container.innerHTML = `<p>Belum ada diskusi di kelas ${user.class}. <a href="#" onclick="document.getElementById('newPostTitle').focus()">Mulai diskusi pertama!</a></p>`;
      return;
    }

    data.posts.forEach(p => {
      const div = document.createElement("div");
      div.classList.add("post");
      div.innerHTML = `
        <h3>${p.title}</h3>
        <p class="meta">Dikirim oleh <b>${p.author}</b> • ${p.created_at} • <span class="class-badge">${p.class}</span></p>
        <p>${p.content}</p>
        <a href="forum-post.html?id=${p.id_post}" class="btn">Buka Diskusi</a>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    console.error("Error loading forum posts:", err);
    container.innerHTML = "<p>Error memuat diskusi.</p>";
  }
}

// Update class badge in forum header
function updateForumClassBadge() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) return;

  const classBadge = document.getElementById("user-class-badge");
  const forumDescription = document.getElementById("forum-description");

  if (classBadge) {
    classBadge.textContent = user.class;
    classBadge.classList.add("class-badge");
  }

  if (forumDescription) {
    forumDescription.textContent = `Diskusi untuk siswa kelas ${user.class}. Hanya postingan dari kelas ${user.class} yang ditampilkan.`;
  }
}



// create new posts
function initForumNewPost() {
  const form = document.getElementById("newPostForm");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("loggedInUser"));

    const payload = {
      id_user: user.id_user,
      title: document.getElementById("newPostTitle").value,
      content: document.getElementById("newPostContent").value,
      class: user.class
    };

    const res = await fetch(`${API}/forum/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      alert("Diskusi berhasil diposting!");
      window.location.reload();
    } else {
      alert("Gagal memposting diskusi: " + (data.error || "Unknown error"));
    }
  });
}


// delete posts
async function deletePost(id) {
  if (!confirm("Hapus post ini? Semua balasan juga akan terhapus.")) return;

  const res = await fetch(`${API}/forum/post/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_user: user.id_user,
      role: user.role
    })
  });

  const data = await res.json();

  if (data.success) {
    alert("Post dihapus.");
    window.location.href = "forum.html";
  } else {
    alert(data.error);
  }
}



// ===== TEACHER QUIZ GRADING =====

// Load quiz attempt for grading
async function loadQuizAttemptForGrading() {
  const params = new URLSearchParams(window.location.search);
  const attemptId = params.get("id");

  if (!attemptId) {
    window.location.href = "guru-quiz-results.html";
    return;
  }

  const container = document.getElementById("attempt-detail");
  const attemptTitle = document.getElementById("attempt-title");
  const attemptHeader = document.getElementById("attempt-header");

  if (!container) return;

  try {
    container.innerHTML = "<p>Memuat detail percobaan...</p>";

    const res = await fetch(`${API}/teacher/quiz/attempt/${attemptId}`);
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    const attempt = data.attempt;
    const answers = data.answers;

    // Display attempt header
    attemptTitle.textContent = `Detail Percobaan: ${attempt.quiz_title}`;
    attemptHeader.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div class="info-card">
          <strong>Siswa:</strong><br>
          ${attempt.real_name} (${attempt.class})
        </div>
        <div class="info-card">
          <strong>Percobaan Ke:</strong><br>
          ${attempt.attempt_number}
        </div>
        <div class="info-card">
          <strong>Skor Otomatis:</strong><br>
          ${attempt.score}/${attempt.max_score} (${Math.round((attempt.score / attempt.max_score) * 100)}%)
        </div>
        <div class="info-card">
          <strong>Submit:</strong><br>
          ${new Date(attempt.submitted_at).toLocaleString('id-ID')}
        </div>
      </div>
    `;

    // Display grading form
    container.innerHTML = `
      <form id="grading-form">
        <h3>Penilaian Jawaban (${answers.length} pertanyaan)</h3>
        <div id="answers-list"></div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <h4>Ringkasan Nilai</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0;">
            <div>
              <label><strong>Skor Otomatis:</strong></label>
              <input type="number" id="auto-score" value="${attempt.score}" readonly style="width: 100%; padding: 5px;">
            </div>
            <div>
              <label><strong>Skor Manual (Essay):</strong></label>
              <input type="number" id="manual-score" value="0" min="0" max="${attempt.max_score - attempt.score}" 
                     style="width: 100%; padding: 5px;" onchange="updateTotalScore()">
            </div>
            <div>
              <label><strong>Total Skor:</strong></label>
              <input type="number" id="total-score" value="${attempt.score}" readonly 
                     style="width: 100%; padding: 5px; font-weight: bold; background: #e8f5e8;">
            </div>
            <div>
              <label><strong>Nilai Akhir:</strong></label>
              <input type="text" id="final-grade" value="${Math.round((attempt.score / attempt.max_score) * 100)}%" 
                     readonly style="width: 100%; padding: 5px; font-weight: bold;">
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <label><strong>Komentar untuk Siswa (Opsional):</strong></label>
            <textarea id="teacher-comment" rows="3" placeholder="Berikan komentar atau masukan untuk siswa..." 
                      style="width: 100%; padding: 8px; margin-top: 5px;"></textarea>
          </div>
          
          <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="btn" onclick="submitGrading(${attemptId})">
              💾 Simpan Nilai
            </button>
            <button type="button" class="btn" onclick="useAutoScore()">
              ✅ Gunakan Skor Otomatis
            </button>
            <button type="button" class="btn cancel" onclick="window.history.back()">
              ↩️ Kembali
            </button>
          </div>
        </div>
      </form>
      <div id="grading-status" style="margin-top: 15px;"></div>
    `;

    const answersList = document.getElementById("answers-list");

    if (answers.length === 0) {
      answersList.innerHTML = "<p>Tidak ada jawaban yang tersimpan.</p>";
      return;
    }

    // Display each answer for grading
    answers.forEach((answer, index) => {
      const answerCard = document.createElement("div");
      answerCard.className = "answer-card";
      answerCard.style.border = "1px solid #ddd";
      answerCard.style.borderRadius = "8px";
      answerCard.style.padding = "15px";
      answerCard.style.marginBottom = "15px";
      answerCard.style.backgroundColor = answer.points_earned > 0 ? "#f8fff8" : "#fff8f8";

      let answerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <h4 style="margin: 0; flex: 1;">Pertanyaan ${index + 1}</h4>
          <div style="text-align: right;">
            <span style="color: ${answer.points_earned > 0 ? 'green' : 'red'}; font-weight: bold;">
              ${answer.points_earned > 0 ? '✓ Benar' : '✗ Salah'}
            </span>
            <br>
            <small>${answer.points_earned}/${answer.max_points} poin</small>
          </div>
        </div>
        <p><strong>Pertanyaan:</strong> ${answer.question_text}</p>
        <p><strong>Tipe:</strong> ${answer.question_type}</p>
      `;

      if (answer.question_type === 'essay') {
        answerHtml += `
          <div style="margin: 10px 0;">
            <label><strong>Jawaban Essay Siswa:</strong></label>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 5px 0; min-height: 80px;">
              ${answer.answer_text || '<em style="color: #888;">Tidak ada jawaban</em>'}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
            <label><strong>Penilaian Manual:</strong></label>
            <input type="number" class="essay-points" data-question-id="${answer.id_question}" 
                   value="0" min="0" max="${answer.max_points}" 
                   style="width: 80px; padding: 5px;" onchange="updateManualScore()">
            <span>/ ${answer.max_points} poin</span>
          </div>
          <div style="margin-top: 8px;">
            <label><strong>Komentar (Opsional):</strong></label>
            <input type="text" class="essay-comment" data-question-id="${answer.id_question}" 
                   placeholder="Komentar untuk jawaban ini..." 
                   style="width: 100%; padding: 5px; margin-top: 5px;">
          </div>
        `;
      } else {
        answerHtml += `
          <p><strong>Jawaban Dipilih:</strong> 
            <span style="color: ${answer.points_earned > 0 ? 'green' : 'red'};">
              ${answer.selected_option_text || '<em>Tidak ada pilihan</em>'}
            </span>
          </p>
        `;

        if (answer.correct_option_text) {
          answerHtml += `
            <p><strong>Jawaban Benar:</strong> 
              <span style="color: green;">${answer.correct_option_text}</span>
            </p>
          `;
        }

        answerHtml += `<p><em>Nilai untuk pertanyaan ini sudah otomatis.</em></p>`;
      }

      answerCard.innerHTML = answerHtml;
      answersList.appendChild(answerCard);
    });

  } catch (error) {
    console.error("Error loading attempt for grading:", error);
    container.innerHTML = "<p>Error memuat detail percobaan.</p>";
  }
}

// Update manual score calculation
function updateManualScore() {
  const essayInputs = document.querySelectorAll('.essay-points');
  let manualScore = 0;

  essayInputs.forEach(input => {
    manualScore += parseInt(input.value) || 0;
  });

  document.getElementById('manual-score').value = manualScore;
  updateTotalScore();
}

// Update total score display
function updateTotalScore() {
  const autoScore = parseInt(document.getElementById('auto-score').value) || 0;
  const manualScore = parseInt(document.getElementById('manual-score').value) || 0;
  const totalScore = autoScore + manualScore;

  document.getElementById('total-score').value = totalScore;

  // Calculate percentage
  const maxScoreElement = document.querySelector('.info-card:nth-child(3)');
  const maxScoreText = maxScoreElement ? maxScoreElement.textContent.split('/')[1] : '100';
  const maxScore = parseInt(maxScoreText) || 100;
  const percentage = Math.round((totalScore / maxScore) * 100);

  document.getElementById('final-grade').value = `${percentage}%`;
}

// Use auto score only
function useAutoScore() {
  const essayInputs = document.querySelectorAll('.essay-points');
  essayInputs.forEach(input => {
    input.value = 0;
  });

  document.getElementById('manual-score').value = 0;
  document.getElementById('teacher-comment').value = '';

  const commentInputs = document.querySelectorAll('.essay-comment');
  commentInputs.forEach(input => {
    input.value = '';
  });

  updateTotalScore();
}

// Submit grading to server
async function submitGrading(attemptId) {
  const totalScore = parseInt(document.getElementById('total-score').value) || 0;
  const teacherComment = document.getElementById('teacher-comment').value;
  const statusDiv = document.getElementById('grading-status');

  // Collect essay grades and comments
  const essayGrades = [];
  const essayPointsInputs = document.querySelectorAll('.essay-points');
  const essayCommentInputs = document.querySelectorAll('.essay-comment');

  essayPointsInputs.forEach(input => {
    const points = parseInt(input.value) || 0;
    if (points > 0) {
      const questionId = input.dataset.questionId;
      const commentInput = Array.from(essayCommentInputs).find(
        c => c.dataset.questionId === questionId
      );
      const comment = commentInput ? commentInput.value : '';

      essayGrades.push({
        id_question: questionId,
        points_earned: points,
        teacher_comment: comment
      });
    }
  });

  try {
    statusDiv.innerHTML = '<p style="color: blue;">Menyimpan nilai...</p>';

    const res = await fetch(`${API}/teacher/quiz/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_attempt: attemptId,
        final_score: totalScore,
        teacher_comment: teacherComment,
        essay_grades: essayGrades
      })
    });

    const data = await res.json();

    if (data.success) {
      statusDiv.innerHTML = '<p style="color: green;">✅ Nilai berhasil disimpan!</p>';
      setTimeout(() => {
        window.history.back();
      }, 1500);
    } else {
      statusDiv.innerHTML = `<p style="color: red;">❌ Gagal menyimpan: ${data.error}</p>`;
    }
  } catch (error) {
    console.error("Error submitting grade:", error);
    statusDiv.innerHTML = '<p style="color: red;">❌ Error menyimpan nilai</p>';
  }
}

// ===== STUDENT QUIZ RESULTS VIEW =====

// Enhanced function to load student's quiz grades with detailed view
/*
async function loadStudentGrades() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const container = document.getElementById("grades-container");
  const noGrades = document.getElementById("no-grades");

  if (!container) return;

  try {
    container.innerHTML = "<p>Memuat nilai...</p>";

    const res = await fetch(`${API}/quiz/grades/${user.id_user}`);
    const data = await res.json();

    if (!data.success || data.grades.length === 0) {
      container.innerHTML = "";
      noGrades.style.display = "block";
      return;
    }

    container.innerHTML = "";
    noGrades.style.display = "none";

    // Filter by specific quiz if provided
    const params = new URLSearchParams(window.location.search);
    const filterQuizId = params.get("quiz");

    let filteredGrades = data.grades;
    if (filterQuizId) {
      filteredGrades = data.grades.filter(grade => grade.id_quiz == filterQuizId);

      if (filteredGrades.length === 0) {
        container.innerHTML = `
          <div class="card">
            <h3>Belum Ada Nilai untuk Kuis Ini</h3>
            <p>Anda belum mengerjakan kuis ini atau nilai belum tersedia.</p>
            <a href="kuis.html" class="btn">Kembali ke Daftar Kuis</a>
          </div>
        `;
        return;
      }
    }

    // Group by quiz
    const gradesByQuiz = {};
    filteredGrades.forEach(grade => {
      if (!gradesByQuiz[grade.id_quiz]) {
        gradesByQuiz[grade.id_quiz] = {
          quiz_title: grade.quiz_title,
          subject_name: grade.subject_name,
          attempts: []
        };
      }
      gradesByQuiz[grade.id_quiz].attempts.push(grade);
    });

    // Display grades
    Object.values(gradesByQuiz).forEach(quizData => {
      const quizCard = document.createElement("div");
      quizCard.className = "card grade-card";

      quizCard.innerHTML = `
        <div class="quiz-header">
          <h3>${quizData.quiz_title}</h3>
          <span class="subject-badge">${quizData.subject_name}</span>
        </div>
        <div class="attempts-list">
          ${quizData.attempts.map(attempt => `
            <div class="attempt-item">
              <div class="attempt-info">
                <strong>Percobaan ${attempt.attempt_number}</strong>
                <span class="attempt-date">${new Date(attempt.submitted_at).toLocaleString('id-ID')}</span>
                ${attempt.teacher_comment ? `
                  <div style="margin-top: 8px; padding: 8px; background: #f0f8ff; border-radius: 5px; border-left: 3px solid #4CAF50;">
                    <strong>Komentar Guru:</strong> ${attempt.teacher_comment}
                  </div>
                ` : ''}
              </div>
              <div class="attempt-score">
                <span class="score">${attempt.score}/${attempt.max_score}</span>
                <span class="percentage ${getScoreColor(attempt.percentage)}">${attempt.percentage}%</span>
              </div>
            </div>
          `).join('')}
        </div>
        ${quizData.attempts.some(attempt => attempt.essay_grades && attempt.essay_grades.length > 0) ? `
          <div style="margin-top: 15px;">
            <button class="btn small" onclick="viewDetailedResults(${quizData.attempts[0].id_quiz})">
              📊 Lihat Detail Penilaian
            </button>
          </div>
        ` : ''}
      `;

      container.appendChild(quizCard);
    });

  } catch (error) {
    console.error("Error loading grades:", error);
    container.innerHTML = "<p>Error memuat nilai. Silakan refresh halaman.</p>";
  }
}
  */

// View detailed essay results for a specific quiz
async function viewDetailedResults(quizId) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  try {
    // Fetch detailed results for this quiz
    const res = await fetch(`${API}/quiz/detailed-results/${quizId}?user_id=${user.id_user}`);
    const data = await res.json();

    if (data.success) {
      // Create a modal or new page to show detailed results
      showDetailedResultsModal(data.detailedResults);
    } else {
      alert("Tidak dapat memuat detail penilaian: " + data.error);
    }
  } catch (error) {
    console.error("Error loading detailed results:", error);
    alert("Error memuat detail penilaian");
  }
}

// Show modal with detailed essay results
function showDetailedResultsModal(detailedResults) {
  // Create modal element
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.display = "flex";

  modal.innerHTML = `
    <div class="modal-box" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
        <h2>📝 Detail Penilaian Essay</h2>
        <button class="btn small danger" onclick="this.closest('.modal').remove()">✕ Tutup</button>
      </div>
      
      ${detailedResults.map(attempt => `
        <div class="card" style="margin-bottom: 15px;">
          <h3>Percobaan ${attempt.attempt_number} - ${new Date(attempt.submitted_at).toLocaleString('id-ID')}</h3>
          
          ${attempt.essay_answers && attempt.essay_answers.length > 0 ? `
            <div style="margin-top: 15px;">
              <h4>Jawaban Essay:</h4>
              ${attempt.essay_answers.map((essay, index) => `
                <div class="essay-answer" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                  <h5>Pertanyaan ${index + 1}:</h5>
                  <p><strong>Pertanyaan:</strong> ${essay.question_text}</p>
                  <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <strong>Jawaban Anda:</strong><br>
                    ${essay.answer_text || '<em>Tidak ada jawaban</em>'}
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong>Nilai:</strong> ${essay.points_earned}/${essay.max_points} poin
                    </div>
                    ${essay.teacher_comment ? `
                      <div style="color: #666; font-style: italic;">
                        "${essay.teacher_comment}"
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="color: #666; text-align: center;">Tidak ada pertanyaan essay dalam kuis ini.</p>
          `}
        </div>
      `).join('')}
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Enhanced function to get color based on score percentage
function getScoreColor(percentage) {
  if (percentage >= 90) return "score-excellent";
  if (percentage >= 80) return "score-excellent";
  if (percentage >= 70) return "score-good";
  if (percentage >= 60) return "score-average";
  return "score-poor";
}




/* -----------------------------------------------------
   FORUM POST PAGE HANDLER
----------------------------------------------------- */
function initForumPostPage() {
  console.log("initForumPostPage called"); // Debug log

  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");
  console.log("Post ID:", postId); // Debug log

  if (!postId) {
    window.location.href = "forum.html";
    return;
  }

  // Variables for modal
  let postToDeleteId = null;
  let replyToDeleteId = null;

  // Setup modal immediately
  setupModal();

  // Load content immediately
  loadPost();
  loadReplies();
  initReplyForm();

  /* ------------------------------------
      LOAD SINGLE POST
  ------------------------------------ */
  function loadPost() {
    console.log("Loading post..."); // Debug log
    const box = document.getElementById("post-box");
    if (!box) {
      console.error("post-box element not found");
      return;
    }

    fetch(`${API}/forum/post/${postId}`)
      .then(res => res.json())
      .then(data => {
        console.log("Post data:", data); // Debug log
        if (!data.success) {
          box.innerHTML = "<p>Post tidak ditemukan.</p>";
          return;
        }

        const p = data.post;
        const canDelete = (user.role === "admin" || user.id_user === p.id_user);

        box.innerHTML = `
                    <h2>${p.title}</h2>
                    <p class="meta">
                      Dikirim oleh <b>${p.author}</b> • ${p.created_at}
                    </p>
                    <p style="margin-top:10px; white-space:pre-line;">${p.content}</p>
                    ${canDelete
            ? `<button class="btn danger" onclick="openDeletePostModal(${p.id_post}, '${p.title.replace(/'/g, "\\'")}')">Hapus Post</button>`
            : ""}
                `;
      })
      .catch(error => {
        console.error("Error loading post:", error);
        box.innerHTML = "<p>Error memuat post.</p>";
      });
  }

  /* ------------------------------------
      LOAD REPLIES
  ------------------------------------ */
  function loadReplies() {
    console.log("Loading replies..."); // Debug log
    const box = document.getElementById("replies-box");
    if (!box) {
      console.error("replies-box element not found");
      return;
    }

    fetch(`${API}/forum/post/${postId}`)
      .then(res => res.json())
      .then(data => {
        console.log("Replies data:", data); // Debug log
        if (data.replies.length === 0) {
          box.innerHTML = "<p>Belum ada balasan.</p>";
          return;
        }

        box.innerHTML = "";
        data.replies.forEach(r => {
          const div = document.createElement("div");
          div.classList.add("reply");
          const canDeleteReply = (user.role === "admin" || user.id_user === r.id_user);

          div.innerHTML = `
                        <p>
                          <b>${r.author}</b> • ${r.created_at}
                          ${canDeleteReply
              ? `<button class="btn small danger" style="float:right" onclick="openDeleteReplyModal(${r.id_reply}, '${r.content.substring(0, 50).replace(/'/g, "\\'")}...')">Hapus</button>`
              : ""}
                        </p>
                        <p style="white-space:pre-line;">${r.content}</p>
                    `;
          box.appendChild(div);
        });
      })
      .catch(error => {
        console.error("Error loading replies:", error);
        box.innerHTML = "<p>Error memuat balasan.</p>";
      });
  }

  /* ------------------------------------
      SEND REPLY
  ------------------------------------ */
  function initReplyForm() {
    const form = document.getElementById("replyForm");
    if (!form) {
      console.error("replyForm not found");
      return;
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const content = document.getElementById("replyContent").value;

      if (!content.trim()) {
        alert("Silakan tulis balasan terlebih dahulu.");
        return;
      }

      try {
        const res = await fetch(`${API}/forum/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_post: postId,
            id_user: user.id_user,
            content: content
          })
        });

        const data = await res.json();
        if (data.success) {
          document.getElementById("replyContent").value = "";
          loadReplies(); // Refresh replies
        } else {
          alert("Gagal mengirim balasan: " + data.error);
        }
      } catch (error) {
        console.error("Error sending reply:", error);
        alert("Error mengirim balasan");
      }
    });
  }

  /* ------------------------------------
      MODAL FUNCTIONS
  ------------------------------------ */
  function setupModal() {
    const deleteModal = document.getElementById("deleteModal");
    const confirmDelete = document.getElementById("confirmDelete");
    const cancelDelete = document.getElementById("cancelDelete");

    if (confirmDelete) {
      confirmDelete.addEventListener("click", async () => {
        if (postToDeleteId) {
          await deletePost(postToDeleteId);
        } else if (replyToDeleteId) {
          await deleteReply(replyToDeleteId);
        }
      });
    }

    if (cancelDelete) {
      cancelDelete.addEventListener("click", () => {
        deleteModal.classList.add("hidden");
        postToDeleteId = null;
        replyToDeleteId = null;
        document.getElementById("deleteStatus").innerHTML = '';
      });
    }
  }

  /* ------------------------------------
      OPEN DELETE MODALS
  ------------------------------------ */
  window.openDeletePostModal = function (postId, postTitle) {
    postToDeleteId = postId;
    replyToDeleteId = null;
    document.getElementById("deleteModalText").textContent =
      `Apakah Anda yakin ingin menghapus postingan "${postTitle}"? Semua balasan juga akan terhapus.`;
    document.getElementById("deleteStatus").innerHTML = '';
    document.getElementById("deleteModal").classList.remove("hidden");
  };

  window.openDeleteReplyModal = function (replyId, replyPreview) {
    replyToDeleteId = replyId;
    postToDeleteId = null;
    document.getElementById("deleteModalText").textContent =
      `Apakah Anda yakin ingin menghapus balasan "${replyPreview}"?`;
    document.getElementById("deleteStatus").innerHTML = '';
    document.getElementById("deleteModal").classList.remove("hidden");
  };

  /* ------------------------------------
      DELETE FUNCTIONS
  ------------------------------------ */
  async function deletePost(id) {
    const deleteStatus = document.getElementById("deleteStatus");

    try {
      const res = await fetch(`${API}/forum/post/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_user: user.id_user,
          role: user.role
        })
      });

      const data = await res.json();
      if (data.success) {
        deleteStatus.innerHTML = '<span style="color: green;">Postingan berhasil dihapus.</span>';
        setTimeout(() => {
          window.location.href = "forum.html";
        }, 1000);
      } else {
        deleteStatus.innerHTML = `<span style="color: red;">Gagal menghapus: ${data.error}</span>`;
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      deleteStatus.innerHTML = '<span style="color: red;">Error menghapus postingan.</span>';
    }
  }

  async function deleteReply(id) {
    const deleteStatus = document.getElementById("deleteStatus");

    try {
      const res = await fetch(`${API}/forum/reply/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_user: user.id_user,
          role: user.role
        })
      });

      const data = await res.json();
      if (data.success) {
        deleteStatus.innerHTML = '<span style="color: green;">Balasan berhasil dihapus.</span>';
        setTimeout(() => {
          document.getElementById("deleteModal").classList.add("hidden");
          loadReplies(); // Refresh replies
          postToDeleteId = null;
          replyToDeleteId = null;
        }, 1000);
      } else {
        deleteStatus.innerHTML = `<span style="color: red;">Gagal menghapus: ${data.error}</span>`;
      }
    } catch (error) {
      console.error("Error deleting reply:", error);
      deleteStatus.innerHTML = '<span style="color: red;">Error menghapus balasan.</span>';
    }
  }
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
  if (classList) {
    classList.innerHTML = "";
    dataClass.classes.forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${c.class}</strong> - ${c.name}`;
      classList.appendChild(li);
    });
  }

  // Use the reusable function
  await loadTeacherMateri();

  // Load teacher students
  await loadTeacherStudents();
  await showTeacherClassAndMapel();

  // Load activity
  const activity = document.getElementById("teacher-activity");
  if (activity) {
    // You might want to fetch actual activity data here
    activity.innerHTML = "Aktivitas terbaru akan ditampilkan di sini.";
  }
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

// load teacher materi
async function loadTeacherMateri() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "teacher") return;

  const resMat = await fetch(`${API}/teacher/materi/${user.id_user}`);
  const dataMat = await resMat.json();

  const materiContainer = document.getElementById("teacher-materi");
  if (!materiContainer) return;

  materiContainer.innerHTML = "";

  if (dataMat.materi && dataMat.materi.length > 0) {
    dataMat.materi.forEach(m => {
      const div = document.createElement("div");
      div.style.marginBottom = "15px";
      div.style.padding = "10px";
      div.style.border = "1px solid #ddd";
      div.style.borderRadius = "5px";

      div.innerHTML = `
        <p><strong>${m.title}</strong> — ${m.class}</p>
        <p>${m.description || 'Tidak ada deskripsi'}</p>
        <div style="margin-top: 10px;">
          <a href="${m.file_url}" target="_blank" class="btn small">Lihat File</a>
          <button class="btn small" onclick="editMateri(${m.id_materi})">Edit</button>
          <button class="btn small danger" onclick="deleteMateri(${m.id_materi})">Hapus</button>
        </div>
      `;
      materiContainer.appendChild(div);
    });
  } else {
    materiContainer.innerHTML = "<p>Belum ada materi. Tambahkan materi pertama Anda!</p>";
  }
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
      window.location.href = "guru-materi.html";
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


// delete materi
async function deleteMateri(id) {
  if (!confirm("Hapus materi ini?")) return;

  const res = await fetch(`${API}/materi/delete/${id}`, { method: "DELETE" });
  const data = await res.json();

  alert(data.message);
  location.reload();
}




// ADMIN PAGES


// make loadUsers available globally so create form can call it
let adminAllUsers = [];

// fetch and render users
async function loadUsers(search = "") {
  const res = await fetch(`${API}/admin/users?search=${encodeURIComponent(search)}`);
  const data = await res.json();

  adminAllUsers = data.users;

  const table = document.getElementById("adminUserTable");
  if (!table) return;

  table.innerHTML = "";
  adminAllUsers.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.real_name}</td>
      <td>${u.username}</td>
      <td>${u.class || "-"}</td>
      <td>${u.role}</td>
      <td class="actions">
        <button class="btn small" onclick="adminOpenEdit(${u.id_user})">Edit</button>
        <button class="btn small danger" style="background:#d55" onclick="adminOpenDelete(${u.id_user})">Hapus</button>
      </td>
    `;
    table.appendChild(tr);
  });
}


// ===== ADMIN — PAGE INIT =====
async function initAdminPage() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "admin") return;

  const searchBox = document.getElementById("adminSearch");

  // live search
  if (searchBox) {
    searchBox.addEventListener("input", () => {
      loadUsers(searchBox.value);
    });
  }

  loadUsers();
}


// ===== ADMIN — CREATE USER =====
async function initAdminCreateForm() {
  const form = document.getElementById("adminCreateUser");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      real_name: newRealName.value,
      username: newUsername.value,
      password: newPassword.value,
      role: newRole.value,
      class: newClass.value || 0
    };

    const res = await fetch(`${API}/admin/user/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const msg = document.getElementById("adminCreateStatus");

    if (data.success) {
      msg.textContent = "Pengguna berhasil dibuat!";
      msg.style.color = "green";
      form.reset();

      // refresh user table instantly
      await loadUsers();
    } else {
      msg.textContent = data.error;
      msg.style.color = "red";
    }
  });
}


const roleSelect = document.getElementById("newRole");
const classField = document.getElementById("classField");
const classSelect = document.getElementById("newClass");

function adminRoleSelect() {
  // initial state
  classField.style.display = (roleSelect.value === "admin") ? "none" : "block";

  roleSelect.addEventListener("change", () => {
    if (roleSelect.value === "admin") {
      classField.style.display = "none";
      classSelect.value = "";
    } else {
      classField.style.display = "block";
    }
  });
}


let EDIT_USER_ID = null;
let DELETE_USER_ID = null;

/* ------------------ OPEN EDIT MODAL ------------------ */
async function adminOpenEdit(id) {
  EDIT_USER_ID = id;

  const res = await fetch(`${API}/admin/users`);
  const data = await res.json();
  const user = data.users.find(u => u.id_user === id);

  editRealName.value = user.real_name;
  editUsername.value = user.username;
  editPassword.value = ""; // optional — if empty, keep old password
  editRole.value = user.role;
  editClass.value = user.class || "";

  document.getElementById("adminEditModal").classList.remove("hidden");
}

function closeAdminEdit() {
  document.getElementById("adminEditModal").classList.add("hidden");
}


/* ------------------ SAVE EDIT ------------------ */
async function adminSaveEdit() {
  const payload = {
    real_name: editRealName.value,
    username: editUsername.value,
    password: editPassword.value || "",
    role: editRole.value,
    class: editClass.value
  };

  const res = await fetch(`${API}/admin/user/edit/${EDIT_USER_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  const msg = document.getElementById("adminEditStatus");

  if (data.success) {
    msg.textContent = "Berhasil diperbarui!";
    msg.style.color = "green";
    await initAdminPage();
    setTimeout(closeAdminEdit, 800);
  } else {
    msg.textContent = data.error;
    msg.style.color = "red";
  }
}


/* ------------------ DELETE ------------------ */
function adminOpenDelete(id) {
  DELETE_USER_ID = id;
  document.getElementById("adminDeleteModal").classList.remove("hidden");
}

function closeAdminDelete() {
  document.getElementById("adminDeleteModal").classList.add("hidden");
}

async function adminConfirmDelete() {
  const res = await fetch(`${API}/admin/user/delete/${DELETE_USER_ID}`, {
    method: "DELETE"
  });

  const data = await res.json();
  const msg = document.getElementById("adminDeleteStatus");

  if (data.success) {
    msg.textContent = "Pengguna telah dihapus.";
    msg.style.color = "green";
    await initAdminPage();
    setTimeout(closeAdminDelete, 800);
  } else {
    msg.textContent = data.error;
    msg.style.color = "red";
  }
}


// ===== ADMIN FORUM MANAGEMENT =====

let currentFilterClass = '';
let postsToDeleteId = null;

// Initialize admin forum page
async function initAdminForum() {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== "admin") return;

  // Load initial posts
  loadAdminForumPosts();

  // Setup filter event listeners
  setupAdminForumFilters();

  // Setup modal event listeners
  setupAdminForumModal();
}

// Setup filter controls
function setupAdminForumFilters() {
  const classFilter = document.getElementById("classFilter");
  const applyFilter = document.getElementById("applyFilter");
  const refreshBtn = document.getElementById("refreshBtn");

  if (applyFilter) {
    applyFilter.addEventListener("click", () => {
      currentFilterClass = classFilter.value;
      loadAdminForumPosts();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadAdminForumPosts();
    });
  }
}

// Setup modal handlers
function setupAdminForumModal() {
  const deleteModal = document.getElementById("deleteModal");
  const confirmDelete = document.getElementById("confirmDelete");
  const cancelDelete = document.getElementById("cancelDelete");

  if (confirmDelete) {
    confirmDelete.addEventListener("click", async () => {
      if (postsToDeleteId) {
        await deleteForumPostAsAdmin(postsToDeleteId);
      }
    });
  }

  if (cancelDelete) {
    cancelDelete.addEventListener("click", () => {
      deleteModal.classList.add("hidden");
      postsToDeleteId = null;
    });
  }
}

// Load forum posts for admin
async function loadAdminForumPosts() {
  const container = document.getElementById("admin-posts-container");
  if (!container) return;

  try {
    container.innerHTML = "<p>Memuat postingan...</p>";

    const res = await fetch(`${API}/forum/posts`);
    const data = await res.json();

    console.log("Forum posts data:", data); // Debug log

    if (!data.success) {
      container.innerHTML = "<p>Gagal memuat postingan.</p>";
      return;
    }

    let posts = data.posts;

    // Debug: Log posts and their classes
    console.log("All posts:", posts);
    console.log("Posts with classes:", posts.filter(post => post.class));
    console.log("Posts without classes:", posts.filter(post => !post.class));

    // Apply class filter
    if (currentFilterClass) {
      posts = posts.filter(post => post.class === currentFilterClass);
      console.log(`Filtered posts for ${currentFilterClass}:`, posts); // Debug log
    }

    // Update stats
    updateForumStats(posts);

    if (posts.length === 0) {
      container.innerHTML = `<p>Tidak ada postingan${currentFilterClass ? ` untuk kelas ${currentFilterClass}` : ''}.</p>`;
      return;
    }

    container.innerHTML = "";

    posts.forEach(post => {
      const postDiv = document.createElement("div");
      postDiv.classList.add("post", "admin-post");
      postDiv.innerHTML = `
        <div class="post-header">
          <h3>${post.title}</h3>
          <div class="post-meta">
            <span class="class-badge">${post.class || 'Tidak ada kelas'}</span>
            <span class="post-date">${new Date(post.created_at).toLocaleDateString('id-ID')}</span>
          </div>
        </div>
        <p class="meta">Oleh: <b>${post.author}</b> • ${new Date(post.created_at).toLocaleString('id-ID')}</p>
        <p class="post-content">${post.content}</p>
        <div class="post-actions">
          <a href="forum-post.html?id=${post.id_post}" class="btn small" target="_blank">Lihat Diskusi</a>
          <button class="btn small danger" onclick="openDeleteModal(${post.id_post}, '${post.title.replace(/'/g, "\\'")}')">Hapus Post</button>
        </div>
      `;
      container.appendChild(postDiv);
    });

  } catch (error) {
    console.error("Error loading admin forum posts:", error);
    container.innerHTML = "<p>Error memuat postingan.</p>";
  }
}

// Update forum statistics
function updateForumStats(posts) {
  const statsContainer = document.getElementById("stats-content");
  if (!statsContainer) return;

  const totalPosts = posts.length;
  const postsByClass = {};

  posts.forEach(post => {
    const className = post.class || 'Tidak ada kelas';
    postsByClass[className] = (postsByClass[className] || 0) + 1;
  });

  let statsHTML = `
    <p><strong>Total Postingan:</strong> ${totalPosts}</p>
    <p><strong>Distribusi per Kelas:</strong></p>
    <ul>
  `;

  // Sort classes for consistent display
  const sortedClasses = Object.keys(postsByClass).sort();

  sortedClasses.forEach(className => {
    const count = postsByClass[className];
    statsHTML += `<li>${className}: ${count} postingan</li>`;
  });

  statsHTML += `</ul>`;

  if (currentFilterClass) {
    statsHTML += `<p><em>Filter aktif: Kelas ${currentFilterClass}</em></p>`;
  }

  statsContainer.innerHTML = statsHTML;
}

// Open delete confirmation modal
function openDeleteModal(postId, postTitle) {
  const deleteModal = document.getElementById("deleteModal");
  const deleteModalText = document.getElementById("deleteModalText");
  const deleteStatus = document.getElementById("deleteStatus");

  if (deleteModal && deleteModalText) {
    postsToDeleteId = postId;
    deleteModalText.textContent = `Apakah Anda yakin ingin menghapus postingan "${postTitle}"? Semua balasan juga akan terhapus.`;
    deleteStatus.innerHTML = '';
    deleteModal.classList.remove("hidden");
  }
}

// Delete forum post as admin
async function deleteForumPostAsAdmin(postId) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  const deleteStatus = document.getElementById("deleteStatus");

  if (!user || user.role !== "admin") {
    deleteStatus.innerHTML = '<span style="color: red;">Anda tidak memiliki izin untuk menghapus postingan.</span>';
    return;
  }

  try {
    const res = await fetch(`${API}/forum/post/${postId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_user: user.id_user,
        role: user.role
      })
    });

    const data = await res.json();

    if (data.success) {
      deleteStatus.innerHTML = '<span style="color: green;">Postingan berhasil dihapus.</span>';
      setTimeout(() => {
        document.getElementById("deleteModal").classList.add("hidden");
        loadAdminForumPosts(); // Refresh the list
      }, 1000);
    } else {
      deleteStatus.innerHTML = `<span style="color: red;">Gagal menghapus: ${data.error}</span>`;
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    deleteStatus.innerHTML = '<span style="color: red;">Error menghapus postingan.</span>';
  }
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
  console.log(path);

  if (path.endsWith('dashboard.html')) {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (user.role === "teacher") {
      initTeacherDashboard();
      loadTeacherStudents();
      showTeacherClassAndMapel();
    } else {
      generateLeaderboard();
      loadNewestLessons();
      loadActiveQuizzes();
    }
  }

  else if (path.endsWith('guru-materi.html')) {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (user.role === "teacher") {
      loadTeacherMateri();
      showTeacherClassAndMapel();
    }
  }

  else if (path.endsWith('forum.html')) {
    updateForumClassBadge();
    loadForumPosts();
    initForumNewPost();
  }

  else if (path.endsWith('forum-post.html')) {
    initForumPostPage(); // This line was missing!
  }

  else if (path.endsWith('materi-add.html')) {
    showTeacherClassAndMapel();
    initAddMateriPage();
  }

  else if (path.endsWith('materi-edit.html')) {
    showTeacherClassAndMapel();
    initEditMateriPage();
  }

  else if (path.endsWith("admin-users.html")) {
    initAdminPage();
    initAdminCreateForm();
    adminRoleSelect();
  }

  else if (path.endsWith('forum-admin.html')) {
    initAdminForum();
  }

  else if (path.endsWith('materi.html')) initMateriPageDB();
  else if (path.endsWith('materi-detail.html')) initMateriDetailDB();

  // else if (path.endsWith('kuis.html')) initKuisPage();
  // else if (path.endsWith('kuis-detail.html')) initKuisDetail();

  // In your existing DOMContentLoaded event listener in main.js, add:
  else if (path.endsWith('kuis.html')) {
    loadStudentQuizzes();
  }
  else if (path.endsWith('kuis-nilai.html')) {
    loadStudentGrades();
  }
  else if (path.endsWith('kuis-take.html')) {
    // Quiz taking page - handled by inline script
  }
  else if (path.endsWith('kuis-result.html')) {
    // Quiz result page - handled by inline script
  }
  else if (path.endsWith('nilai.html')) { // If you create a grades page
    loadStudentGrades();
  }

  else if (path.endsWith('guru-quiz.html')) {
    showTeacherClassAndMapel();
    loadTeacherQuizzes();
    setupCreateQuizForm();

    // Setup create quiz form
    const createForm = document.getElementById("createQuizForm");
    if (createForm) {
      createForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Implementation for quick create modal
      });
    }
  }

  else if (path.endsWith('guru-quiz-create.html')) {
    showTeacherClassAndMapel();
    setupQuizEditorForm(); // Replace the old function
    setupQuizFormValidation();

    // Check if we're editing an existing quiz or creating new
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");

    if (editId) {
      // Load existing quiz data
      loadQuizForEditing(editId);
    } else {
      // Load pending data from quick create
      const pendingData = loadPendingQuizData();
      if (!pendingData) {
        // If no pending data, redirect back to quiz list
        window.location.href = "guru-quiz.html";
      }
    }

    // Add initial question if none exists
    const questionsContainer = document.getElementById("questions-container");
    if (questionsContainer && questionsContainer.children.length === 0) {
      addQuestion();
    }
  }

  else if (path.endsWith('guru-quiz-results.html')) {
    loadQuizResults();
  }
  else if (path.endsWith('guru-quiz-attempt.html')) {
    loadQuizAttemptDetail();
    loadQuizAttemptForGrading();
  }
  else initLogin();
});
