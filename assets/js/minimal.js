/**
 * Minimalist Portfolio JavaScript
 * Features: Command Palette (Cmd+K), Copy-to-Clipboard, Scrollspy, Minimal Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initCopyEmail();
  initCommandPalette();
  initScrollSpy();
});

// 1. Header scroll border
function initNavbarScroll() {
  const header = document.querySelector('.min-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

// 2. Toast system
function showToast(message) {
  let toast = document.getElementById('toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<i class="fa-solid fa-check" style="color: #34d399;"></i> <span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

// 3. Email copy triggers
function initCopyEmail() {
  const copyElements = document.querySelectorAll('[data-copy]');
  copyElements.forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const textToCopy = el.getAttribute('data-copy') || 'somwanshibhavesh71@gmail.com';
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Email address copied to clipboard');
      }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Email copied to clipboard');
      });
    });
  });
}

// 4. Command Palette (Cmd+K / Ctrl+K)
function initCommandPalette() {
  const modalBackdrop = document.getElementById('cmd-modal-backdrop');
  const triggerBtn = document.getElementById('cmd-trigger-btn');
  const searchInput = document.getElementById('cmd-search-input');
  const cmdList = document.getElementById('cmd-list');

  if (!modalBackdrop || !searchInput || !cmdList) return;

  function openModal() {
    modalBackdrop.classList.add('open');
    searchInput.value = '';
    filterItems('');
    setTimeout(() => searchInput.focus(), 50);
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
  }

  if (triggerBtn) {
    triggerBtn.addEventListener('click', openModal);
  }

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeModal();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Open on Cmd+K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (modalBackdrop.classList.contains('open')) {
        closeModal();
      } else {
        openModal();
      }
    }
    // Close on Escape
    if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
      closeModal();
    }
  });

  // Filter commands
  function filterItems(query) {
    const q = query.toLowerCase().trim();
    const items = cmdList.querySelectorAll('.cmd-item');
    let visibleCount = 0;

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes(q)) {
        item.style.display = 'flex';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });

    const groups = cmdList.querySelectorAll('.cmd-group-label');
    groups.forEach(g => {
      g.style.display = q ? 'none' : 'block';
    });
  }

  searchInput.addEventListener('input', (e) => {
    filterItems(e.target.value);
  });

  // Handle command item click
  cmdList.addEventListener('click', (e) => {
    const item = e.target.closest('.cmd-item');
    if (!item) return;

    const action = item.getAttribute('data-action');
    const target = item.getAttribute('data-target');

    closeModal();

    if (action === 'navigate' && target) {
      const el = document.querySelector(target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (action === 'copy-email') {
      navigator.clipboard.writeText('somwanshibhavesh71@gmail.com').then(() => {
        showToast('Email address copied to clipboard');
      });
    } else if (action === 'external' && target) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else if (action === 'switch-full') {
      window.location.href = 'index.html';
    }
  });
}

// 5. ScrollSpy
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  window.addEventListener('scroll', () => {
    let currentId = '';
    const scrollPos = window.scrollY + 100;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        currentId = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}
