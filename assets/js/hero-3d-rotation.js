/* ==========================================================================
   HERO 3D SCROLL ROTATION — JavaScript
   Uses GSAP + ScrollTrigger to animate a scroll-driven head rotation:
     • Initial state  → img2.png   (side profile, rotated away)
     • Final state    → myimg.png  (front face, centered)
   Scrolling back up reverses all transforms smoothly via scrub.
   ========================================================================== */

(function () {
  'use strict';

  // Guard: GSAP must be loaded (CDN in <head>)
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.warn('[hero-3d-rotation] GSAP or ScrollTrigger not found. Falling back to static image.');
    // Fallback: just show the front image statically
    const side  = document.getElementById('imgSide');
    const front = document.getElementById('imgFront');
    if (side)  side.style.opacity  = '0';
    if (front) front.style.opacity = '1';
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ── DOM references ──────────────────────────────────────────────────────
  const headRig  = document.getElementById('headRig');
  const imgSide  = document.getElementById('imgSide');
  const imgFront = document.getElementById('imgFront');

  if (!headRig || !imgSide || !imgFront) {
    console.warn('[hero-3d-rotation] Required elements not found.');
    return;
  }

  // ── Light theme check — skip animation, show front face statically ──────
  function isLightTheme() {
    return (
      document.documentElement.dataset.theme === 'light' ||
      document.body.classList.contains('light-theme')
    );
  }

  if (isLightTheme()) {
    imgSide.style.opacity  = '0';
    imgFront.style.opacity = '1';
    return;
  }

  // ── Hero section reference ──────────────────────────────────────────────
  // The hero section is the ScrollTrigger anchor. We animate while it's
  // in view. We DO NOT pin/sticky — the hero scrolls normally; the effect
  // plays out as the hero scrolls through the viewport.
  const heroSection = document.getElementById('home') ||
                      document.querySelector('.hero-section');

  if (!heroSection) {
    console.warn('[hero-3d-rotation] Hero section #home not found.');
    return;
  }

  // ── Main animation timeline ─────────────────────────────────────────────
  //
  //  The rig starts tilted (rotationY: -28deg) — simulating "looking away".
  //  As the user scrolls down through the hero, the rig straightens to 0deg
  //  (front-facing). Simultaneously:
  //    • img2.png (side)  fades out + slight skew out
  //    • myimg.png (front) fades in
  //  scrub: 1.2 gives a silky 1.2s eased lag on the scrub, not frame-perfect
  //  but feels luxurious and premium.
  //
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: heroSection,
      start: 'top 15%',    // animation starts when hero top is 15% down the viewport
      end: 'bottom 60%',   // completes before the hero is scrolled fully away
      scrub: 1.2,
      onUpdate: (self) => {
        // Toggle the glow halo
        headRig.classList.toggle('is-rotating', self.progress > 0.05 && self.progress < 0.95);
      }
    }
  });

  // ── Phase 1: Rig de-rotates (side → front-on perspective) ───────────────
  tl.fromTo(headRig,
    {
      rotationY: -28,   // starting: head "turned away" to the left
      scale: 0.94,
      x: -10
    },
    {
      rotationY: 0,     // end: head fully front-on
      scale: 1.0,
      x: 0,
      ease: 'power2.inOut',
      duration: 1
    },
    0
  )

  // ── Phase 2a: Side image fades out (first half of timeline) ─────────────
  .fromTo(imgSide,
    {
      opacity: 1,
      skewY: 1.5,
      filter: 'brightness(1) contrast(1) saturate(1)'
    },
    {
      opacity: 0,
      skewY: -0.8,
      filter: 'brightness(0.6) contrast(1.15) saturate(0.7)',
      ease: 'power1.inOut',
      duration: 0.52
    },
    0              // starts at the same moment as the rig rotation
  )

  // ── Phase 2b: Front image crossfades IN (second half, overlapping) ──────
  .fromTo(imgFront,
    {
      opacity: 0,
      scale: 0.96,
      filter: 'brightness(1.25) saturate(0.4)'
    },
    {
      opacity: 1,
      scale: 1,
      filter: 'brightness(1) saturate(1)',
      ease: 'power2.out',
      duration: 0.54
    },
    0.44           // slight delay → crossfade overlap for a "morph" feel
  )

  // ── Phase 3: Gentle settle (overshoot + return) ──────────────────────────
  .to(headRig,
    { rotationY: 2.5, scale: 1.02, ease: 'power1.inOut', duration: 0.25 },
    0.87
  )
  .to(headRig,
    { rotationY: 0, scale: 1.0, ease: 'power3.out', duration: 0.13 },
    1.12
  );

  // ── Listen for theme changes ─────────────────────────────────────────────
  // If the user switches to light theme, kill the ScrollTrigger and show front.
  document.addEventListener('themechange', () => {
    if (isLightTheme()) {
      ScrollTrigger.getAll().forEach(st => st.kill());
      gsap.set(imgSide,  { opacity: 0 });
      gsap.set(imgFront, { opacity: 1 });
      gsap.set(headRig,  { rotationY: 0, scale: 1, x: 0 });
    }
  });

  // Also observe body class / data-theme attribute
  const themeObserver = new MutationObserver(() => {
    if (isLightTheme()) {
      ScrollTrigger.getAll().forEach(st => st.kill());
      gsap.set(imgSide,  { opacity: 0 });
      gsap.set(imgFront, { opacity: 1 });
      gsap.set(headRig,  { rotationY: 0, scale: 1, x: 0 });
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  themeObserver.observe(document.body,             { attributes: true, attributeFilter: ['class'] });

})();
