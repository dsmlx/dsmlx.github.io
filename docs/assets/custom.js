/* custom.js — small progressive enhancements. Smooth anchor scrolling is CSS
   (scroll-behavior) so URL hashes and history keep working. */
document.addEventListener('DOMContentLoaded', function () {
  // === Reading progress bar (doc pages only) ===
  // A 2px accent line under the header tracks scroll position. The homepage
  // renders its own chrome (.kd-home) and is skipped.
  if (!document.querySelector('.kd-home')) {
    const header = document.querySelector('.md-header');
    if (header) {
      const bar = document.createElement('div');
      bar.className = 'kd-progress';
      bar.setAttribute('aria-hidden', 'true');
      header.appendChild(bar);

      let ticking = false;
      const update = () => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(doc.scrollTop / max, 1) : 0) + ')';
        ticking = false;
      };
      window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }
  }

  // === TOC collapsible groups ===
  // On pages with many h2 sections (e.g. release notes), let top-level TOC
  // entries collapse their h3 children. The toggle is a separate control so
  // clicking the heading text still jumps to the section.
  const tocNav = document.querySelector('.md-sidebar--secondary .md-nav--secondary');
  if (tocNav) {
    const topItems = tocNav.querySelectorAll(':scope > .md-nav__list > .md-nav__item');
    topItems.forEach(item => {
      const nestedNav = item.querySelector('.md-nav');
      if (!nestedNav) return;

      const link = item.querySelector(':scope > .md-nav__link');
      if (!link) return;

      const isFirst = item === topItems[0];
      let collapsed = !isFirst;

      const toggle = document.createElement('span');
      toggle.className = 'toc-toggle';
      toggle.setAttribute('role', 'button');
      toggle.setAttribute('tabindex', '0');
      toggle.style.cssText = 'cursor:pointer;margin-right:0.3em;font-size:0.7em;user-select:none;';

      const apply = () => {
        nestedNav.style.display = collapsed ? 'none' : '';
        toggle.textContent = collapsed ? '▸' : '▾';
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', collapsed ? 'Expand section' : 'Collapse section');
        item.classList.toggle('toc-collapsed', collapsed);
        item.classList.toggle('toc-expanded', !collapsed);
      };

      const flip = () => { collapsed = !collapsed; apply(); };

      toggle.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        flip();
      });
      toggle.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          flip();
        }
      });

      // Navigating to the section expands it so the active child is visible.
      link.addEventListener('click', () => {
        if (collapsed) { collapsed = false; apply(); }
      });

      link.prepend(toggle);
      apply();
    });
  }
});
