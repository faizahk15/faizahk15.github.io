/* ------------------------
    ADMIN PAGES
  ------------------------- */


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
