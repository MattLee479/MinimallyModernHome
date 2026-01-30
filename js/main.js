/* ========================================
   MINIMALLY MODERN HOME - MAIN SCRIPTS
   ======================================== */

document.addEventListener("DOMContentLoaded", function () {
  // ===== Sanity Config =====
  const SANITY_PROJECT_ID = "opqrg5t7";
  const SANITY_DATASET = "production";
  const SANITY_API_VERSION = "2025-01-01";

  function sanityQueryUrl(groq) {
    const encoded = encodeURIComponent(groq);
    return `https://${SANITY_PROJECT_ID}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encoded}`;
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function roomLabel(room) {
    const map = {
      "living-room": "Living Room",
      bedroom: "Bedroom",
      kitchen: "Kitchen",
      bathroom: "Bathroom",
      "home-office": "Home Office",
    };
    return map[room] || "Room";
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  async function fetchPostsByRoom(room, limit = 50) {
    const safeRoom = (room || "").replace(/[^a-z-]/g, "");
    const groq = `*[_type=="post" && room=="${safeRoom}"] | order(publishedAt desc)[0...${limit}]{
      title,
      room,
      publishedAt,
      excerpt,
      "slug": slug.current,
      "imageUrl": mainImage.asset->url,
      products[] { name, url, note }
    }`;

    const res = await fetch(sanityQueryUrl(groq));
    if (!res.ok) throw new Error(`Sanity fetch failed: ${res.status}`);
    const data = await res.json();
    return data.result || [];
  }

async function fetchLatestPosts(limit = 3) {
  const groq = `*[_type=="post"] | order(publishedAt desc)[0...${limit}]{
    title,
    room,
    publishedAt,
    excerpt,
    "slug": slug.current,
    "imageUrl": mainImage.asset->url
  }`;

  const res = await fetch(sanityQueryUrl(groq));
  if (!res.ok) throw new Error(`Sanity fetch failed: ${res.status}`);
  const data = await res.json();
  return data.result || [];
}

function renderLatestPostCard(post, index) {
  const delay = (index * 0.08).toFixed(2);

  // Link to the correct room page. Also include #slug so we can jump to it.
  const href = `room.html?room=${encodeURIComponent(post.room)}#${encodeURIComponent(post.slug || "")}`;

  return `
    <article class="post-card animate-fade-in" style="animation-delay:${delay}s;">
      <a class="post-card-link" href="${href}" aria-label="Open ${post.title}">
        <div class="post-card-image">
          <img src="${post.imageUrl}" alt="${post.title}">
        </div>
        <div class="post-card-content">
          <div class="post-meta">
            <span class="room-tag">${roomLabel(post.room)}</span>
            <span class="post-date">${formatDate(post.publishedAt)}</span>
          </div>
          <h3>${post.title}</h3>
          <p>${post.excerpt || ""}</p>
        </div>
      </a>
    </article>
  `;
}

async function mountLatestPosts() {
  const grid = document.getElementById("latestPostsGrid");
  if (!grid) return; // not on homepage

  grid.innerHTML = `<p style="opacity:.7;">Loading…</p>`;

  try {
    const posts = await fetchLatestPosts(3);
    if (!posts.length) {
      grid.innerHTML = `<p style="opacity:.7;">No posts yet.</p>`;
      return;
    }
    grid.innerHTML = posts.map(renderLatestPostCard).join("");
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="opacity:.7;">Couldn’t load posts.</p>`;
  }
}

mountLatestPosts();

  // ========================================
  // Mobile Navigation Toggle
  // ========================================
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const mobileNav = document.querySelector(".mobile-nav");

  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener("click", function () {
      mobileMenuBtn.classList.toggle("active");
      mobileNav.classList.toggle("active");
    });
  }

  // ========================================
  // Room Feed (Full-page stacked posts)
  // ========================================
  function renderRoomFullPost(post) {
    const products = (post.products || [])
      .map(
        (p) => `
      <div class="product-card">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          ${p.note ? `<div class="product-note">${p.note}</div>` : ""}
        </div>
        <a class="btn btn-primary" href="${p.url}" target="_blank" rel="noopener sponsored">Shop</a>
      </div>
    `
      )
      .join("");

    const productsBlock = products
      ? `
        <section class="product-section">
          <h2 class="section-title">Recreate this look</h2>
          <p class="muted">Affiliate links below — we may earn a small commission at no extra cost to you.</p>
          <div class="product-grid">${products}</div>
        </section>
      `
      : "";

    return `
      <article class="room-post" id="${post.slug ? String(post.slug) : ""}">
        <header class="post-hero">
          <div class="post-hero-meta">
            <span class="room-tag">${roomLabel(post.room)}</span>
            <span class="post-date">${formatDate(post.publishedAt)}</span>
          </div>
          <h2 class="post-title">${post.title}</h2>
          ${post.excerpt ? `<p class="post-intro">${post.excerpt}</p>` : ""}
        </header>

        <div class="post-hero-image">
          <img src="${post.imageUrl}" alt="${post.title}">
        </div>

        <div class="post-divider"></div>

        ${productsBlock}
      </article>
    `;
  }

  async function mountRoomFeedPage() {
    const root = document.getElementById("roomFeed");
    if (!root) return;

    const room = getParam("room") || "";
    const titleEl = document.getElementById("roomTitle");
    if (titleEl) titleEl.textContent = roomLabel(room);

    root.innerHTML = `<p style="text-align:center;opacity:.7;">Loading posts…</p>`;

    try {
      const posts = await fetchPostsByRoom(room, 50);
      if (!posts.length) {
        root.innerHTML = `<p style="text-align:center;opacity:.7;">No posts yet for this room.</p>`;
        return;
      }
      root.innerHTML = posts.map(renderRoomFullPost).join("");
    } catch (err) {
      console.error(err);
      root.innerHTML = `<p style="text-align:center;opacity:.7;">Couldn’t load posts.</p>`;
    }
  }

  // Mount room feed after functions exist
  mountRoomFeedPage();

  // ========================================
  // Room Cards - Coming Soon Toast
  // ========================================
  const roomCards = document.querySelectorAll(".room-card");

  roomCards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      const isAvailable = card.getAttribute("data-available") === "true";

      if (!isAvailable) {
        e.preventDefault();
        const roomName = card.querySelector("h3")?.textContent || "This room";
        showToast("Coming Soon", `The ${roomName} collection is coming soon!`);
      }
    });
  });

  // ========================================
  // Toast Notification System
  // ========================================
  function showToast(title, message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const toastTitle = toast.querySelector(".toast-title");
    const toastMessage = toast.querySelector(".toast-message");

    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;

    toast.classList.add("active");

    setTimeout(function () {
      toast.classList.remove("active");
    }, 3000);
  }

  // ========================================
  // Contact Form Submission
  // ========================================
  const contactForm = document.getElementById("contactForm");
  const successMessage = document.getElementById("successMessage");

  if (contactForm && successMessage) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // In a real implementation, this would send to a backend
      contactForm.style.display = "none";
      successMessage.style.display = "block";
    });
  }

  // ========================================
  // Scroll Animations (Intersection Observer)
  // ========================================
  const animateElements = document.querySelectorAll(".animate-on-scroll");

  if (animateElements.length > 0 && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    animateElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ========================================
  // Smooth Scroll for Anchor Links
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href === "#") return;

      e.preventDefault();
      const target = document.querySelector(href);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
});
