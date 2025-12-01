/* -----------------------------------------------------
   FORUM POST PAGE HANDLER
----------------------------------------------------- */

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
