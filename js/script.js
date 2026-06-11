"use strict";

/**
 * INTERACTIVE RESUME CONSTITUTION v1.1.0
 * V. SIMPLICITY & MAINTAINABILITY: Core JavaScript maximum 200 lines.
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupActiveNav();
    setupScrollReveal();
});

/**
 * Theme Switching Logic
 * Dark mode priority: Saved preference > System preference > Light mode fallback
 */
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    const currentTheme = savedTheme || systemTheme;
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateThemeIcon(theme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

/**
 * Active Navigation Highlight
 * Uses IntersectionObserver for better performance and precision.
 */
function setupActiveNav() {
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section');

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
}

/**
 * Scroll Reveal Animations
 * Uses IntersectionObserver to trigger entry animations.
 */
function setupScrollReveal() {
    const revealElements = document.querySelectorAll('.section, .project-card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target); // Only reveal once
            }
        });
    }, observerOptions);

    revealElements.forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });
}

/**
 * Performance Optimization: Lazy Loading Images (Native support check)
 */
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src;
    });
} else {
    // Fallback for browsers that don't support native lazy loading
    // Could implement an IntersectionObserver here if needed, 
    // but staying within line budget for now.
}
