document.addEventListener('DOMContentLoaded', () => {

  /* ── Header scroll ── */
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  /* ── Theme toggle ── */
  const html   = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const isDark = () => html.getAttribute('data-theme') === 'dark';
  const setTheme = dark => {
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    toggle.textContent = dark ? '🌙' : '☀️';
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  };

  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  if (saved) setTheme(saved === 'dark');
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme(true);

  toggle.addEventListener('click', () => setTheme(!isDark()));

  /* ── Mobile menu ── */
  const menuBtn   = document.getElementById('menuToggle');
  const mobileNav = document.getElementById('mobileNav');
  menuBtn.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.textContent = open ? '✕' : '☰';
  });
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', false);
      menuBtn.textContent = '☰';
    });
  });

  /* ── Active nav on scroll ── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .nav-mobile a');
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(l => {
          l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach(s => navObserver.observe(s));

  /* ── Scroll reveal ── */
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach(el => revealObserver.observe(el));

  /* ── Subtle card lift on hover (lighter touch than full 3D tilt) ── */
  document.querySelectorAll('.project-card, .skill-category').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.willChange = 'transform'; });
    card.addEventListener('mouseleave', () => { card.style.willChange = 'auto'; });
  });

});