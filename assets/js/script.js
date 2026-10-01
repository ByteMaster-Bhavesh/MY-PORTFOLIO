/* ==========================================================================
   BHAVESH SANJAY SOMWANSHI — INTERACTIVE CORE JAVASCRIPT
   Features:
   - Dynamic Neural Network & Constellation Canvas
   - 3D Interactive Card Tilt
   - Navigation ScrollSpy & Mobile Menu
   - Interactive Skills Category Filter
   - Simulated Terminal Stream for "Projects Coming Soon"
   - Form Validation & Clipboard Actions
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // 1. THEME SWITCHER (LIGHT & DARK MODE)
  initThemeToggle();

  // 2. 3D TILT EFFECT
  initTiltEffect();

  // 3. NAVIGATION & SCROLLSPY
  initNavigation();

  // 4. SKILLS FILTERING
  initSkillsFilter();

  // 5. TERMINAL STREAM ANIMATION
  initTerminalStream();

  // 6. CONTACT FORM & CLIPBOARD COPY
  initContactActions();

  // 7. SCROLL REVEAL OBSERVER
  initScrollReveal();

  // 8. BACK TO TOP
  initBackToTop();

  // 9. BHAVEX CHARACTER HOVER & VISITED INTERACTION
  initBhaveXCharHover();
});

/* --------------------------------------------------------------------------
   1. THEME SWITCHER (LIGHT & DARK MODE)
   -------------------------------------------------------------------------- */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  const statusText = document.getElementById('theme-status-text');

  // Check stored preference or default to system preference
  const savedTheme = localStorage.getItem('portfolio-theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Default to dark theme if not specified
  let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'dark');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `${theme}-theme`;
    if (statusText) {
      statusText.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }
    localStorage.setItem('portfolio-theme', theme);
  }

  // Initial apply
  applyTheme(currentTheme);

  // Toggle button click listener
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(currentTheme);
    });
  }

  // Optional: Listen for OS theme changes if user hasn't explicitly set a preference
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('portfolio-theme')) {
        currentTheme = e.matches ? 'dark' : 'light';
        applyTheme(currentTheme);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   2. 3D TILT EFFECT
   -------------------------------------------------------------------------- */
function initTiltEffect() {
  const tiltElements = document.querySelectorAll('[data-tilt]');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  tiltElements.forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

/* --------------------------------------------------------------------------
   3. NAVIGATION & SCROLLSPY
   -------------------------------------------------------------------------- */
function initNavigation() {
  const header = document.getElementById('navbar');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  // Header background on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // ScrollSpy active link updates
    const scrollPos = window.scrollY + 120;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navLinks.forEach((link) => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });

  // Mobile menu toggle
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      navMenu.classList.toggle('open');
    });

    // Close on navigation link click
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        navMenu.classList.remove('open');
      });
    });
  }
}

/* --------------------------------------------------------------------------
   4. SKILLS FILTERING — JellyRadio Spring Physics Engine
   Vanilla-JS port of https://reactbits.dev/micro/jelly-radio
   Spring: critically-damped second-order system driven on a rAF loop.
   -------------------------------------------------------------------------- */
function initSkillsFilter() {
  const group = document.getElementById('skillsJellyRadio');
  const chips = group ? Array.from(group.querySelectorAll('.filter-btn.jelly-chip')) : [];
  const skillCards = document.querySelectorAll('.skill-category-card');

  if (!chips.length) return;

  /* ── Spring config (mirrors JellyRadio defaults) ── */
  const CFG = {
    swell: 0.20,   // active chip scale-up
    barge: 6,      // px push to neighbours
    shrink: 0.05,   // inactive chip scale-down
    jelly: 1.0,    // jelly asymmetry factor
    bounce: 0.25,
    stagger: 22,     // ms per neighbour step
    stiffness: 580,
    mass: 0.9,
  };

  /* ── Spring math helpers ── */
  function springParams(k, m, bounce) {
    return { k, c: 2 * Math.sqrt(k * m) * (1 - bounce), m };
  }

  /* Second-order spring state: { pos, vel, target } */
  function makeSpring(init = 0) {
    return { pos: init, vel: 0, target: init };
  }

  /* Integrate one spring by `dt` seconds. Returns true while still moving. */
  function tickSpring(s, dt, params) {
    const { k, c, m } = params;
    const force = -k * (s.pos - s.target) - c * s.vel;
    s.vel += (force / m) * dt;
    s.pos += s.vel * dt;
    const settled = Math.abs(s.pos - s.target) < 0.0005 && Math.abs(s.vel) < 0.0005;
    if (settled) { s.pos = s.target; s.vel = 0; }
    return !settled;
  }

  /* ── Per-chip spring state ── */
  const states = chips.map(() => ({
    x: makeSpring(0),   // lateral push
    sx: makeSpring(1),   // scaleX
    sy: makeSpring(1),   // scaleY
  }));

  /* ── Base spring params ── */
  const baseP = springParams(CFG.stiffness, CFG.mass, CFG.bounce);
  /* Jelly variants: scaleX is springier, scaleY is slower */
  const jellyX = springParams(CFG.stiffness * (1 + 0.24 * CFG.jelly), CFG.mass - 0.1 * CFG.jelly, Math.min(0.85, CFG.bounce + 0.3 * CFG.jelly));
  const jellyY = springParams(CFG.stiffness * (1 - 0.14 * CFG.jelly), CFG.mass + 0.05 * CFG.jelly, CFG.bounce);

  let rafId = null;
  let lastTime = null;
  let activeIdx = 0;

  /* ── Apply transform ── */
  function applyTransforms() {
    chips.forEach((chip, i) => {
      const s = states[i];
      chip.style.transform = `translateX(${s.x.pos.toFixed(3)}px) scaleX(${s.sx.pos.toFixed(4)}) scaleY(${s.sy.pos.toFixed(4)})`;
    });
  }

  /* ── Animation loop ── */
  function loop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap at 50 ms
    lastTime = ts;

    let anyMoving = false;
    states.forEach(s => {
      const mx = tickSpring(s.x, dt, baseP);
      const msx = tickSpring(s.sx, dt, jellyX);
      const msy = tickSpring(s.sy, dt, jellyY);
      if (mx || msx || msy) anyMoving = true;
    });

    applyTransforms();
    if (anyMoving) rafId = requestAnimationFrame(loop);
    else { rafId = null; lastTime = null; }
  }

  function startLoop() {
    if (!rafId) {
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
  }

  /* ── Set spring targets for a given selection ── */
  function setTargets(sel, instant) {
    const widths = chips.map(c => c.offsetWidth);
    const push = (widths[sel] ?? 0) * CFG.swell / 2 + CFG.barge;

    chips.forEach((_, i) => {
      const s = states[i];
      const on = i === sel;
      const far = Math.abs(i - sel);
      const dir = Math.sign(i - sel);
      const xT = dir * push;
      const sT = on ? 1 + CFG.swell : 1 - CFG.shrink;

      if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        s.x.pos = xT; s.x.vel = 0; s.x.target = xT;
        s.sx.pos = sT; s.sx.vel = 0; s.sx.target = sT;
        s.sy.pos = sT; s.sy.vel = 0; s.sy.target = sT;
        return;
      }

      /* Stagger delay: neighbours slightly later */
      const delay = far * CFG.stagger; // ms
      function setTarget(spring, target) {
        if (delay > 0) setTimeout(() => { spring.target = target; startLoop(); }, delay);
        else { spring.target = target; }
      }

      setTarget(s.x, xT);
      setTarget(s.sx, sT);
      setTarget(s.sy, sT);
    });

    if (!instant) startLoop();
    else { applyTransforms(); }
  }

  /* ── Commit a selection ── */
  function commit(idx, instant = false) {
    if (idx === activeIdx && !instant) return;
    activeIdx = idx;

    chips.forEach((chip, i) => {
      const on = i === idx;
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-checked', on ? 'true' : 'false');
      chip.setAttribute('tabindex', on ? '0' : '-1');
    });

    setTargets(idx, instant);

    /* Filter skill cards */
    const filter = chips[idx].getAttribute('data-filter');
    skillCards.forEach(card => {
      const cat = card.getAttribute('data-category');
      if (filter === 'all' || cat === filter) {
        card.style.display = 'flex';
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0) scale(1)';
        });
      } else {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px) scale(0.97)';
        setTimeout(() => { card.style.display = 'none'; }, 250);
      }
    });
  }

  /* ── Event listeners ── */
  chips.forEach((chip, i) => {
    chip.addEventListener('click', () => commit(i));

    chip.addEventListener('keydown', e => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % chips.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + chips.length) % chips.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = chips.length - 1;
      else if (e.key === ' ' || e.key === 'Enter') next = i;
      if (next === null) return;
      e.preventDefault();
      commit(next, e.key === ' ' || e.key === 'Enter');
      chips[next].focus();
    });

    /* Hover micro-swell — not a selection commit */
    chip.addEventListener('mouseenter', () => {
      if (i === activeIdx) return;
      const s = states[i];
      s.sy.target = 1.06;
      startLoop();
    });
    chip.addEventListener('mouseleave', () => {
      if (i === activeIdx) return;
      const s = states[i];
      s.sy.target = 1 - CFG.shrink;
      startLoop();
    });
  });

  /* ── Init: set first chip active with instant placement ── */
  commit(0, true);
}

/* --------------------------------------------------------------------------
   5. TERMINAL STREAM ANIMATION
   -------------------------------------------------------------------------- */
function initTerminalStream() {
  const streamBox = document.getElementById('terminal-stream');
  if (!streamBox) return;

  const messages = [
    { type: 'log', text: '[AI Engine] Neural synthesis check: active on port 5000' },
    { type: 'accent', text: '[Full-Stack] MERN architecture responding with low latency' },
    { type: 'log', text: '[Cloud-Sync] AWS infrastructure hooks: healthy' },
    { type: 'log', text: '[Data Pipelines] Aggregating multi-source analytics...' },
    { type: 'accent', text: '[Status] Ready for cutting-edge digital production.' }
  ];

  let msgIndex = 0;

  setInterval(() => {
    const msg = messages[msgIndex];
    msgIndex = (msgIndex + 1) % messages.length;

    const line = document.createElement('div');
    line.className = `term-line ${msg.type === 'accent' ? 't-accent' : 't-log'}`;
    line.textContent = msg.text;

    // Insert before cursor line
    const lastLine = streamBox.lastElementChild;
    streamBox.insertBefore(line, lastLine);

    // Limit maximum lines in terminal to avoid overflow
    const allLines = streamBox.querySelectorAll('.term-line');
    if (allLines.length > 8) {
      allLines[1].remove();
    }
  }, 4200);
}

/* --------------------------------------------------------------------------
   6. CONTACT ACTIONS & FORM VALIDATION
   -------------------------------------------------------------------------- */
function initContactActions() {
  // Copy to clipboard
  const copyBtns = document.querySelectorAll('.copy-btn');
  copyBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-check" style="color: #10b981;"></i>';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 2000);
        });
      }
    });
  });

  // Contact Form Submission
  const form = document.getElementById('contact-form');
  const statusBox = document.getElementById('form-status');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;
      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const subjectInput = document.getElementById('subject');
      const messageInput = document.getElementById('message');

      // Clear previous error messages
      document.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));

      // Validate Name
      if (!nameInput.value.trim()) {
        document.getElementById('name-error').textContent = 'Please provide your name.';
        isValid = false;
      }

      // Validate Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim()) {
        document.getElementById('email-error').textContent = 'Please provide your email address.';
        isValid = false;
      } else if (!emailRegex.test(emailInput.value.trim())) {
        document.getElementById('email-error').textContent = 'Please provide a valid email address.';
        isValid = false;
      }

      // Validate Subject
      if (!subjectInput.value.trim()) {
        document.getElementById('subject-error').textContent = 'Please enter a subject.';
        isValid = false;
      }

      // Validate Message
      if (!messageInput.value.trim() || messageInput.value.trim().length < 10) {
        document.getElementById('message-error').textContent = 'Please write a message with at least 10 characters.';
        isValid = false;
      }

      if (!isValid) return;

      // Simulated Transmission with feedback
      const submitBtn = document.getElementById('submit-btn');
      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Transmitting...</span> <i class="fa-solid fa-spinner fa-spin"></i>';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;

        statusBox.className = 'form-status success';
        statusBox.innerHTML = `
          <strong>Message Prepared!</strong> Opening default mail client to dispatch your message directly to <em>somwanshibhavesh71@gmail.com</em>.
        `;

        // Direct mailto trigger
        const mailtoUri = `mailto:somwanshibhavesh71@gmail.com?subject=${encodeURIComponent(
          subjectInput.value.trim()
        )}&body=${encodeURIComponent(
          `Sender Name: ${nameInput.value.trim()}\nSender Email: ${emailInput.value.trim()}\n\nMessage:\n${messageInput.value.trim()}`
        )}`;

        window.location.href = mailtoUri;
        form.reset();

        setTimeout(() => {
          statusBox.style.display = 'none';
        }, 8000);
      }, 1000);
    });
  }
}

/* --------------------------------------------------------------------------
   7. SCROLL REVEAL OBSERVER
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealElements.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------------------------------
   8. BACK TO TOP
   -------------------------------------------------------------------------- */
function initBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (!backToTopBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* --------------------------------------------------------------------------
   9. BHAVEX SLIDE CHARACTER HOVER / VISITED INTERACTION WITH TIMEOUT
   -------------------------------------------------------------------------- */
function initBhaveXCharHover() {
  const slide = document.getElementById('bhavexSlide');
  const chars = document.querySelectorAll('.bhavex-char');
  if (!slide || !chars.length) return;

  const CHAR_TIMEOUT_MS = 2500; // Character dissolves after 2.5s of no hover
  const charTimers = new Map();

  function activateChar(char) {
    char.classList.add('is-hovered', 'is-visited');

    // Cancel existing timeout if re-hovered
    if (charTimers.has(char)) {
      clearTimeout(charTimers.get(char));
      charTimers.delete(char);
    }
  }

  function scheduleCharFade(char) {
    if (charTimers.has(char)) {
      clearTimeout(charTimers.get(char));
    }

    const timer = setTimeout(() => {
      // If pointer is not actively over this character, dissolve it
      if (!char.matches(':hover')) {
        char.classList.remove('is-visited', 'is-hovered');
      }
      charTimers.delete(char);
    }, CHAR_TIMEOUT_MS);

    charTimers.set(char, timer);
  }

  chars.forEach((char) => {
    char.addEventListener('mouseenter', () => {
      activateChar(char);
    });

    char.addEventListener('mouseleave', () => {
      char.classList.remove('is-hovered');
      scheduleCharFade(char);
    });

    // Touch support for mobile devices
    char.addEventListener('touchstart', () => {
      activateChar(char);
      scheduleCharFade(char);
    }, { passive: true });
  });

  // When mouse leaves the slide, start fade timeout on any remaining visited characters
  slide.addEventListener('mouseleave', () => {
    chars.forEach((char) => {
      scheduleCharFade(char);
    });
  });

  // Idle timeout: if cursor stops moving inside the slide for 3.5s, dissolve visited characters
  let idleTimer = null;
  slide.addEventListener('mousemove', () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      chars.forEach((char) => {
        if (!char.matches(':hover')) {
          char.classList.remove('is-visited', 'is-hovered');
        }
      });
    }, 150);
  }, { passive: true });
}


