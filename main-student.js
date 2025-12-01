/* ------------------------
    STUDENT PAGES
  ------------------------- */

// ===== LEADERBOARD =====
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


// ===== STUDENT SUBJECTS =====

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
