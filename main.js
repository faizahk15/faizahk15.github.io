// main.js

// Login
function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return; // safety check in case the form doesn't exist

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorMsg = document.getElementById('error-msg');

        // Find user in dataSiswa
        const user = dataSiswa.find(s =>
            s.id === username || s.name.toLowerCase() === username.toLowerCase()
        );

        if (user && user.p === password) {
            // Successful login
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            window.location.href = 'dashboard.html';
        } else {
            // Invalid login
            errorMsg.style.display = 'block';
        }
    });
}
// Login message
window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('loggedInUser'));
    if (user) {
        const msg = document.getElementById('welcome-msg');
        if (msg) msg.textContent = `Selamat datang, ${user.name}!`;
    }
});


// Leaderboard
function generateLeaderboard() {
    // Sort dataSiswa by score (descending)
    const sortedData = [...dataSiswa].sort((a, b) => b.score - a.score);

    // Find the tbody element
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = ''; // Clear existing rows

    // Generate rows
    sortedData.forEach((siswa, index) => {
        const tr = document.createElement('tr');

        // Optional: add a class for top ranks
        if (index === 0) tr.classList.add('rank-1');
        else if (index === 1) tr.classList.add('rank-2');
        else if (index === 2) tr.classList.add('rank-3');

        tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${siswa.name}</td>
      <td>${siswa.class}</td>
      <td>${siswa.score}</td>
    `;

        tbody.appendChild(tr);
    });
}


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
    const path = window.location.pathname;

    if (path.endsWith('dashboard.html')) generateLeaderboard();
    else if (path.endsWith('materi.html')) initMateriPage();
    else if (path.endsWith('materi-detail.html')) initMateriDetail();
    else if (path.endsWith('kuis.html')) initKuisPage();
    else if (path.endsWith('kuis-detail.html')) initKuisDetail();
    else initLogin();
});
