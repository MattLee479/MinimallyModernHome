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
      pinterestUrl,
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
  // Build affiliate list (simple rows with chevron)
  const affiliateRows = (post.products || [])
    .map((p) => {
      const safeName = p.name || "";
      const safeUrl = p.url || "#";
      const safeNote = p.note || "";

      return `
        <li class="affiliate-item">
          <a class="affiliate-link" href="${safeUrl}" target="_blank" rel="noopener sponsored">
            <span class="affiliate-left">
              <span class="affiliate-name">${safeName}</span>
              ${safeNote ? `<span class="affiliate-note">${safeNote}</span>` : ""}
            </span>
            <span class="affiliate-chevron" aria-hidden="true">›</span>
          </a>
        </li>
      `;
    })
    .join("");

  const productsBlock = affiliateRows
    ? `
      <section class="product-section">
        <h2 class="section-title">Recreate this look</h2>
        <p class="muted">Affiliate links below — we may earn a small commission at no extra cost to you.</p>
        <ul class="affiliate-list">
          ${affiliateRows}
        </ul>
      </section>
    `
    : "";

  const hasImage = !!post.imageUrl;
  const hasPinterest = !!post.pinterestUrl;

  // Pinterest overlay image (top-right) stored at assets/pinterest.webp
  const pinOverlay = `
    <span class="pin-badge" aria-hidden="true" title="View on Pinterest">
      <img src="assets/pinterest.webp" alt="" class="pin-badge-img" loading="lazy" decoding="async">
    </span>
  `;

  const imgInner = hasImage
    ? `
      <img src="${post.imageUrl}" alt="${post.title}">
      ${pinOverlay}
    `
    : "";

  const imageBlock = hasImage
    ? (hasPinterest
        ? `<a class="post-hero-image pin-link" href="${post.pinterestUrl}" target="_blank" rel="noopener noreferrer">${imgInner}</a>`
        : `<div class="post-hero-image">${imgInner}</div>`
      )
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

      ${imageBlock}

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

    // Optional: if you open via #slug, scroll to it nicely after render
    if (window.location.hash) {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p style="text-align:center;opacity:.7;">Couldn’t load posts.</p>`;
  }
}

// ✅ Run it (safe because it exits if #roomFeed isn’t on the page)
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
  const formStatus = document.getElementById("formStatus");

  if (contactForm && successMessage) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const endpoint = contactForm.getAttribute("action") || "";
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : "";

      if (formStatus) formStatus.textContent = "";

      if (!endpoint || endpoint.includes("REPLACE_WITH_FORM_ID")) {
        if (formStatus) {
          formStatus.textContent = "Form is not configured yet. Add your Formspree form ID in contact.html.";
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: new FormData(contactForm),
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Formspree submit failed: ${response.status}`);
        }

        contactForm.reset();
        contactForm.style.display = "none";
        successMessage.style.display = "block";
      } catch (err) {
        console.error(err);
        if (formStatus) {
          formStatus.textContent = "Sorry, message failed to send. Please try again.";
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText || "Send Message";
        }
      }
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
