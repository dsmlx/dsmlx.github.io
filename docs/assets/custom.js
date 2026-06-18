document.addEventListener('DOMContentLoaded', function() {
  const root = document.documentElement;
  const scrollRange = 560;
  const colorStops = {
    page: [[255, 255, 255], [244, 247, 241]],
    panel: [[245, 247, 250], [237, 243, 233]]
  };

  const mix = (from, to, progress) => from.map((value, index) => {
    return Math.round(value + (to[index] - value) * progress);
  });

  const applyScrollTone = () => {
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollRange));
    const page = mix(colorStops.page[0], colorStops.page[1], progress);
    const panel = mix(colorStops.panel[0], colorStops.panel[1], progress);
    const targets = [root, document.body].filter(Boolean);

    targets.forEach(target => {
      target.style.setProperty('--mesh-bg', `rgb(${page.join(', ')})`);
      target.style.setProperty('--mesh-bg-rgb', page.join(', '));
      target.style.setProperty('--mesh-bg-deep', `rgb(${panel.join(', ')})`);
      target.style.setProperty('--mesh-bg-section', `rgb(${panel.join(', ')})`);
    });
  };

  let toneFrame = 0;
  const requestScrollTone = () => {
    if (toneFrame) {
      return;
    }

    toneFrame = window.requestAnimationFrame(() => {
      toneFrame = 0;
      applyScrollTone();
    });
  };

  applyScrollTone();
  window.addEventListener('scroll', requestScrollTone, { passive: true });

  const alignTabsWithHeaderTitle = () => {
    const title = document.querySelector('.md-header__title .md-header__topic:first-child .md-ellipsis')
      || document.querySelector('.md-header__title .md-ellipsis');
    const firstTab = document.querySelector('.md-tabs__item:first-child');

    if (!title || !firstTab) {
      return;
    }

    const titleLeft = title.getBoundingClientRect().left;
    const firstTabPadding = Number.parseFloat(window.getComputedStyle(firstTab).paddingLeft) || 0;
    const offset = Math.max(0, titleLeft - firstTabPadding);
    document.documentElement.style.setProperty('--mesh-tabs-offset', `${offset.toFixed(2)}px`);
  };

  alignTabsWithHeaderTitle();
  window.addEventListener('resize', alignTabsWithHeaderTitle, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(alignTabsWithHeaderTitle);
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      const target = href && href.length > 1 ? document.querySelector(href) : null;
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  document.querySelectorAll('.md-search__input').forEach(input => {
    input.removeAttribute('required');
    input.setAttribute('placeholder', '');
  });

  document.querySelectorAll('.md-search').forEach(search => {
    const input = search.querySelector('.md-search__input');
    const trigger = search.querySelector('.md-search__icon[for="__search"]');
    const reset = search.querySelector('.md-search__options button[type="reset"]');

    if (!input || !trigger) {
      return;
    }

    const openSearch = event => {
      if (event) {
        event.preventDefault();
      }

      search.classList.add('mesh-search-open');
      input.removeAttribute('required');
      input.setAttribute('placeholder', '');
      window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
    };

    const closeSearch = () => {
      input.value = '';
      input.blur();
      search.classList.remove('mesh-search-open');
    };

    trigger.addEventListener('click', openSearch);
    input.addEventListener('focus', () => search.classList.add('mesh-search-open'));

    if (reset) {
      reset.addEventListener('click', event => {
        event.preventDefault();
        closeSearch();
      });
    }

    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeSearch();
      }
    });

    document.addEventListener('click', event => {
      if (!search.contains(event.target) && !input.value) {
        search.classList.remove('mesh-search-open');
      }
    });
  });

  // === TOC collapsible groups ===
  // Make h2-level TOC items (0.3.x, 0.2.x, 0.1.x) collapsible, hiding their h3 children.
  const tocNav = document.querySelector('.md-sidebar--secondary .md-nav--secondary');
  if (tocNav) {
    const topItems = tocNav.querySelectorAll(':scope > .md-nav__list > .md-nav__item');
    topItems.forEach(item => {
      const nestedNav = item.querySelector('.md-nav');
      if (!nestedNav) return;

      const link = item.querySelector(':scope > .md-nav__link');
      if (!link) return;

      // Start collapsed except the first group
      const isFirst = item === topItems[0];
      if (!isFirst) {
        nestedNav.style.display = 'none';
        item.classList.add('toc-collapsed');
      } else {
        item.classList.add('toc-expanded');
      }

      // Add toggle indicator
      const toggle = document.createElement('span');
      toggle.className = 'toc-toggle';
      toggle.textContent = isFirst ? '▾' : '▸';
      toggle.style.cssText = 'cursor:pointer;margin-right:0.3em;font-size:0.7em;user-select:none;';
      link.prepend(toggle);

      // Click to toggle
      link.style.cursor = 'pointer';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const collapsed = nestedNav.style.display === 'none';
        nestedNav.style.display = collapsed ? '' : 'none';
        toggle.textContent = collapsed ? '▾' : '▸';
        item.classList.toggle('toc-collapsed', !collapsed);
        item.classList.toggle('toc-expanded', collapsed);
      });
    });
  }

  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }
});
