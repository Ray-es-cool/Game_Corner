/* =========================
   CRITSTRIKE ANIMATIONS
   Shared animation utilities
========================= */

/* =========================
   RIPPLE EFFECT FOR BUTTONS
========================= */
function createRipple(event) {
  const button = event.currentTarget;
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add("ripple");

  // Remove existing ripples
  const existingRipple = button.querySelector(".ripple");
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(circle);

  // Remove ripple after animation
  setTimeout(() => {
    circle.remove();
  }, 600);
}

/* =========================
   PAGE TRANSITION
========================= */
function setupPageTransitions() {
  // Build overlay once
  let overlay = document.querySelector(".page-transition-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "page-transition-overlay";
    overlay.innerHTML = `
      <div class="page-transition-card">
        <span class="spinner"></span>
        <div class="page-transition-text">Loading…</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function shouldIntercept(link) {
    const href = link.getAttribute("href") || "";
    if (!href) return false;
    if (href.startsWith("#") || href === "#") return false;
    if (link.target === "_blank") return false;
    if (href.startsWith("http")) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    return true;
  }

  function navigateWithTransition(url) {
    overlay.classList.add("show");
    // Slight delay so animation is visible
    setTimeout(() => {
      window.location.href = url;
    }, 180);
  }

  // Intercept internal links for smooth transitions
  document.querySelectorAll("a[href]").forEach((link) => {
    if (!shouldIntercept(link)) return;
    link.addEventListener("click", (e) => {
      // Allow ctrl/cmd-click, middle click, etc.
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      navigateWithTransition(link.getAttribute("href"));
    });
  });

  // Also expose helper for programmatic navigation (buttons)
  window.CritAnimationsNavigate = navigateWithTransition;
}

/* =========================
   BUTTON RIPPLE SETUP
========================= */
function setupButtonRipples() {
  // Add ripple effect to all buttons
  document.querySelectorAll("button, .nav a, .theme-btn, .setting-btn").forEach(el => {
    el.addEventListener("click", createRipple);
  });
}

/* =========================
   TOAST NOTIFICATION
========================= */
function showToast(message, duration = 3000) {
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, duration);
}

/* =========================
   CONFETTI EFFECT (for rewards)
========================= */
function createConfetti() {
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];
  const confettiCount = 30;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement("div");
    confetti.style.position = "fixed";
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.top = "-10px";
    confetti.style.width = "8px";
    confetti.style.height = "8px";
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
    confetti.style.zIndex = "9999";
    confetti.style.pointerEvents = "none";

    document.body.appendChild(confetti);

    const animationDuration = Math.random() * 2000 + 2000;
    const rotation = Math.random() * 720 - 360;

    confetti.animate([
      {
        transform: `translateY(0) rotate(0deg)`,
        opacity: 1
      },
      {
        transform: `translateY(100vh) rotate(${rotation}deg)`,
        opacity: 0
      }
    ], {
      duration: animationDuration,
      easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
    });

    setTimeout(() => {
      confetti.remove();
    }, animationDuration);
  }
}

/* =========================
   NUMBER COUNTER ANIMATION
========================= */
function animateCounter(element, start, end, duration = 1000) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease out quart
    const ease = 1 - Math.pow(1 - progress, 4);
    const current = Math.floor(start + (end - start) * ease);

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/* =========================
   SMOOTH SCROLL TO ELEMENT
========================= */
function scrollToElement(element, offset = 0) {
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth"
  });
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  setupPageTransitions();
  setupButtonRipples();

  // Add theme class to body for themed ripples
  const theme = localStorage.getItem("theme") || "dark";
  document.body.classList.add("theme-" + theme);
});

// Update theme class on theme change
window.addEventListener("storage", (e) => {
  if (e.key === "theme") {
    const theme = e.newValue || "dark";
    document.body.classList.remove("theme-dark", "theme-light", "theme-pink");
    document.body.classList.add("theme-" + theme);
  }
});

// Export for use in other files
window.CritAnimations = {
  createRipple,
  showToast,
  createConfetti,
  animateCounter,
  scrollToElement
};
