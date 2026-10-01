// DevStash marketing homepage prototype — no dependencies.
(() => {
  document.documentElement.classList.add("js");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Navbar opacity on scroll ---------- */

  const nav = document.getElementById("nav");
  const updateNav = () =>
    nav.classList.toggle("is-scrolled", window.scrollY > 16);
  updateNav();
  window.addEventListener("scroll", updateNav, { passive: true });

  /* ---------- Scroll reveal ---------- */

  const revealed = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    revealed.forEach((el) => observer.observe(el));
  } else {
    revealed.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Pricing toggle ---------- */

  const PRICES = {
    monthly: {
      amount: "$8",
      period: "/ month",
      note: "Billed monthly. Cancel anytime.",
    },
    yearly: {
      amount: "$72",
      period: "/ year",
      note: "Just $6 a month, billed yearly.",
    },
  };

  const billingButtons = document.querySelectorAll("[data-billing]");
  const proAmount = document.getElementById("pro-amount");
  const proPeriod = document.getElementById("pro-period");
  const proNote = document.getElementById("pro-note");

  billingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const price = PRICES[button.dataset.billing];
      billingButtons.forEach((b) => {
        const active = b === button;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      proAmount.textContent = price.amount;
      proPeriod.textContent = price.period;
      proNote.textContent = price.note;
    });
  });

  /* ---------- Footer year ---------- */

  document.getElementById("year").textContent = String(
    new Date().getFullYear(),
  );

  /* ---------- Chaos icons ---------- */

  const field = document.getElementById("chaos-field");
  const icons = Array.from(field.querySelectorAll(".chaos__icon"));

  const MAX_SPEED = 1.6;
  const REPEL_RADIUS = 110;
  const REPEL_FORCE = 0.9;
  const FRICTION = 0.985;
  const MIN_SPEED = 0.35;

  let bounds = { width: 0, height: 0 };
  let mouse = null;
  let frame = 0;
  let particles = [];

  const random = (min, max) => min + Math.random() * (max - min);

  function measure() {
    bounds = { width: field.clientWidth, height: field.clientHeight };
  }

  function seed() {
    measure();
    particles = icons.map((el) => {
      // Start from the CSS scatter so the switch to JS positioning doesn't jump.
      const size = el.offsetWidth;
      const angle = random(0, Math.PI * 2);
      const speed = random(0.5, 1.1);
      return {
        el,
        size,
        x: Math.min(el.offsetLeft, bounds.width - size),
        y: Math.min(el.offsetTop, bounds.height - size),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: random(-12, 12),
        spin: random(-0.25, 0.25),
        phase: random(0, Math.PI * 2),
      };
    });
    field.classList.add("is-animated");
  }

  function step(time) {
    for (const p of particles) {
      if (mouse) {
        const dx = p.x + p.size / 2 - mouse.x;
        const dy = p.y + p.size / 2 - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < REPEL_RADIUS) {
          const push = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
          p.vx += (dx / dist) * push;
          p.vy += (dy / dist) * push;
        }
      }

      // Bleed off the burst from a repel, but never stall completely.
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > MAX_SPEED * 3) {
        p.vx *= (MAX_SPEED * 3) / speed;
        p.vy *= (MAX_SPEED * 3) / speed;
      } else if (speed > MAX_SPEED) {
        p.vx *= FRICTION;
        p.vy *= FRICTION;
      } else if (speed < MIN_SPEED) {
        p.vx *= 1.02;
        p.vy *= 1.02;
      }

      p.x += p.vx;
      p.y += p.vy;

      const maxX = bounds.width - p.size;
      const maxY = bounds.height - p.size;
      if (p.x <= 0 || p.x >= maxX) {
        p.x = Math.max(0, Math.min(p.x, maxX));
        p.vx *= -1;
        p.spin *= -1;
      }
      if (p.y <= 0 || p.y >= maxY) {
        p.y = Math.max(0, Math.min(p.y, maxY));
        p.vy *= -1;
      }

      p.rotation += p.spin;
      const scale = 1 + Math.sin(time / 900 + p.phase) * 0.06;
      p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg) scale(${scale})`;
    }
    frame = requestAnimationFrame(step);
  }

  function start() {
    if (frame || reducedMotion.matches) return;
    if (!particles.length) seed();
    frame = requestAnimationFrame(step);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  field.addEventListener("pointermove", (event) => {
    const rect = field.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  field.addEventListener("pointerleave", () => {
    mouse = null;
  });

  window.addEventListener("resize", () => {
    measure();
    for (const p of particles) {
      p.x = Math.min(p.x, Math.max(0, bounds.width - p.size));
      p.y = Math.min(p.y, Math.max(0, bounds.height - p.size));
    }
  });

  // Don't burn frames while the hero is off-screen or the tab is hidden.
  let fieldVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      fieldVisible = entry.isIntersecting;
      if (fieldVisible && !document.hidden) start();
      else stop();
    }).observe(field);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (fieldVisible) start();
  });

  // Honour a reduced-motion change made while the page is open: freeze the
  // icons back into the static CSS scatter.
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      stop();
      particles = [];
      field.classList.remove("is-animated");
      icons.forEach((el) => el.style.removeProperty("transform"));
    } else if (fieldVisible) {
      start();
    }
  });

  start();
})();
