(function () {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(key, area = localStorage) { try { return area.getItem(key); } catch (e) { return null; } },
    set(key, val, area = localStorage) { try { area.setItem(key, val); } catch (e) { /* storage blocked */ } },
  };

  /* ------------------------------------------------------------------
     Theme: light / dark, remembered, with a circular reveal
     ------------------------------------------------------------------ */
  const themeBtn = $('#themeToggle');

  function labelThemeButton() {
    const dark = root.dataset.theme === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeBtn.setAttribute('aria-pressed', String(dark));
  }

  function setTheme(next, x, y) {
    const apply = () => {
      root.dataset.theme = next;
      store.set('theme', next);
      labelThemeButton();
    };
    if (!document.startViewTransition || reducedMotion) return apply();

    const transition = document.startViewTransition(apply);
    transition.ready.then(() => {
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  }

  themeBtn.addEventListener('click', () => {
    const r = themeBtn.getBoundingClientRect();
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', r.left + r.width / 2, r.top + r.height / 2);
  });

  // Follow the OS setting until the visitor picks one themselves
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!store.get('theme')) { root.dataset.theme = e.matches ? 'dark' : 'light'; labelThemeButton(); }
  });
  labelThemeButton();

  /* ------------------------------------------------------------------
     Tabs: hash routing with a sliding indicator and directional slides
     ------------------------------------------------------------------ */
  const TABS = ['home', 'experience', 'projects', 'art', 'resume'];
  const pages = TABS.map((t) => $('#page-' + t));
  const tabLinks = $$('.tabs a');
  const indicator = $('.tab-indicator');
  let current = null;
  let navToken = 0;

  function routeFromHash() {
    const h = location.hash.slice(1);
    return TABS.includes(h) ? h : 'home';
  }

  function moveIndicator() {
    const active = tabLinks.find((a) => a.dataset.tab === current);
    if (!active) return;
    indicator.style.width = active.offsetWidth + 'px';
    indicator.style.transform = `translateX(${active.offsetLeft - 4}px)`;
  }

  function show(name) {
    const next = $('#page-' + name);
    const visible = pages.find((p) => !p.hidden);
    const dir = current ? Math.sign(TABS.indexOf(name) - TABS.indexOf(current)) : 0;
    const token = ++navToken;

    current = name;
    tabLinks.forEach((a) => {
      if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    moveIndicator();
    document.title = next.dataset.title;

    pages.forEach((p) => p.getAnimations().forEach((a) => a.cancel()));

    const enter = () => {
      pages.forEach((p) => { p.hidden = p !== next; });
      window.scrollTo(0, 0);
      if (dir && !reducedMotion) {
        next.animate(
          [{ opacity: 0, transform: `translateX(${dir * 56}px)` }, { opacity: 1, transform: 'none' }],
          { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }
        );
      }
      afterShow(name);
    };

    if (!visible || visible === next || !dir || reducedMotion) return enter();

    // Enter when the exit animation ends, or after a short timeout if the browser
    // isn't painting frames (a background tab), so the switch never gets stuck
    let entered = false;
    const enterOnce = () => { if (!entered && token === navToken) { entered = true; enter(); } };
    visible
      .animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 56}px)` }],
        { duration: 200, easing: 'linear', fill: 'forwards' }
      )
      .finished.then(enterOnce)
      .catch(() => { /* cancelled by a newer navigation */ });
    setTimeout(enterOnce, 320);
  }

  function afterShow(name) {
    if (name === 'projects') loadGitHub();
    if (name === 'experience') fitGantt();
    onScroll();
    // art.js listens for this to start and stop its sketches
    document.dispatchEvent(new CustomEvent('tabshow', { detail: name }));
  }

  // Only tab hashes route; others (like the skip link's #main) behave normally
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (TABS.includes(h)) show(h);
  });
  window.addEventListener('resize', moveIndicator);
  document.fonts && document.fonts.ready.then(moveIndicator);

  /* ------------------------------------------------------------------
     Scroll reveal, staggered groups, counters
     ------------------------------------------------------------------ */
  $$('[data-stagger]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.classList.add('reveal');
      child.style.setProperty('--d', i);
    });
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('in');
      revealObserver.unobserve(el);
      // Drop the stagger delay afterwards so hover effects respond instantly
      setTimeout(() => el.style.setProperty('--d', 0), 1200);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      animateCount(entry.target);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countObserver.observe(el));

  function animateCount(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reducedMotion) { el.textContent = target + suffix; return; }
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + (t === 1 ? suffix : '');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------
     Typing line in the hero
     ------------------------------------------------------------------ */
  const typedEl = $('#typed');
  const roles = ['cloud developer', 'full-stack engineer', 'CI/CD enthusiast', 'game dev explorer', 'daily LeetCode grinder'];

  if (reducedMotion) {
    typedEl.textContent = roles[0];
  } else {
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    const tick = () => {
      const word = roles[wordIndex];
      charIndex += deleting ? -1 : 1;
      typedEl.textContent = word.slice(0, charIndex);
      let delay = deleting ? 38 : 80;
      if (!deleting && charIndex === word.length) { delay = 1700; deleting = true; }
      else if (deleting && charIndex === 0) { deleting = false; wordIndex = (wordIndex + 1) % roles.length; delay = 350; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 700);
  }

  /* ------------------------------------------------------------------
     Marquee: duplicate each group once so translateX(-50%) loops seamlessly
     ------------------------------------------------------------------ */
  $$('.marquee-track').forEach((track) => {
    const group = track.firstElementChild;
    const copy = group.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.appendChild(copy);
  });

  /* ------------------------------------------------------------------
     Scroll progress bar
     ------------------------------------------------------------------ */
  const progressBar = $('#progressBar');
  let ticking = false;

  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ------------------------------------------------------------------
     Experience timeline: every role on one time axis so overlaps show.
     A playhead sweeps linearly from the first start date to today and
     each bar grows in step with it.
     ------------------------------------------------------------------ */
  const gantt = $('#gantt');
  const gYears = $('#gYears');
  const gToday = $('#gToday');
  const gTodayLabel = $('.g-today-label', gToday);
  const gSpan = $('#gSpan');
  const gHint = $('#gHint');
  const HINT = gHint.textContent;
  const MONTH_MS = 1000 * 60 * 60 * 24 * 30.44;

  const today = new Date();
  const rangeStart = new Date(2022, 0, 1);
  const rangeEnd = new Date(Math.max(2027, today.getFullYear() + 1), 0, 1);
  const frac = (d) => (d - rangeStart) / (rangeEnd - rangeStart);
  const fmtMonth = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  // "2026-05" as an end date means "through May", so it ends on Jun 1
  const parseMonth = (s, isEnd) => {
    if (s === 'present') return today;
    const [y, m] = s.split('-').map(Number);
    return new Date(y, isEnd ? m : m - 1, 1);
  };

  const jobs = $$('.g-row', gantt).map((row) => {
    const start = parseMonth(row.dataset.start, false);
    const end = parseMonth(row.dataset.end, true);
    const bar = $('.g-bar', row);
    const s = frac(start);
    const w = frac(end) - s;
    bar.style.setProperty('--s', s);
    bar.style.setProperty('--w', w);

    const months = Math.round((end - start) / MONTH_MS);
    const yrs = Math.floor(months / 12);
    const mos = months % 12;
    $('.g-dur', row).textContent = [yrs && `${yrs} yr`, mos && `${mos} mo`].filter(Boolean).join(' ');

    return { row, bar, start, end, s, w, short: row.dataset.short, color: row.style.getPropertyValue('--bar') };
  });

  for (let y = rangeStart.getFullYear(); y < rangeEnd.getFullYear(); y++) {
    const col = document.createElement('div');
    col.className = 'g-year';
    const label = document.createElement('span');
    label.dataset.full = y;
    label.dataset.short = `'${String(y).slice(2)}`;
    col.appendChild(label);
    gYears.appendChild(col);
  }

  // Short year labels on narrow screens; hide durations that don't fit their bar
  function fitGantt() {
    if (!gYears.clientWidth) return;
    const narrow = gYears.clientWidth / gYears.children.length < 56;
    $$('span', gYears).forEach((l) => { l.textContent = narrow ? l.dataset.short : l.dataset.full; });
    jobs.forEach((j) => {
      const dur = $('.g-dur', j.row);
      dur.classList.toggle('hide', dur.offsetWidth + 16 > j.bar.clientWidth);
    });
  }

  let playId = 0;
  function playGantt() {
    const id = ++playId;
    const from = Math.min(...jobs.map((j) => j.s));
    const to = frac(today);
    const duration = 3200;
    const t0 = performance.now();

    const frame = (now) => {
      if (id !== playId) return;
      const t = reducedMotion ? 1 : Math.min(1, (now - t0) / duration);
      const p = from + (to - from) * t;
      gToday.style.setProperty('--p', p);
      gTodayLabel.textContent = t === 1 ? 'Today' : fmtMonth(new Date(rangeStart.getTime() + p * (rangeEnd - rangeStart)));
      jobs.forEach((j) => {
        const f = Math.min(1, Math.max(0, (p - j.s) / j.w));
        j.bar.style.clipPath = f >= 1 ? 'none' : `inset(0 ${(1 - f) * 100}% 0 0 round 999px)`;
      });
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  const ganttObserver = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    ganttObserver.disconnect();
    playGantt();
  }, { threshold: 0.4 });
  ganttObserver.observe(gantt);
  $('#gReplay').addEventListener('click', playGantt);

  function focusJob(job) {
    gantt.classList.toggle('focus', !!job);
    jobs.forEach((j) => {
      j.row.classList.toggle('active', j === job);
      j.row.classList.toggle('overlap', !!job && j !== job && j.start < job.end && job.start < j.end);
    });
    if (!job) { gHint.textContent = HINT; return; }

    gSpan.style.setProperty('--s', job.s);
    gSpan.style.setProperty('--w', job.w);
    gSpan.style.setProperty('--span-c', job.color);
    const others = jobs.filter((j) => j.row.classList.contains('overlap')).map((j) => j.short);
    gHint.textContent = others.length
      ? `${job.short} overlapped with ${others.join(' + ')}`
      : `${job.short}: no overlap with the others`;
  }

  jobs.forEach((job) => {
    job.row.addEventListener('mouseenter', () => focusJob(job));
    job.row.addEventListener('mouseleave', () => focusJob(null));
    job.bar.addEventListener('focus', () => focusJob(job));
    job.bar.addEventListener('blur', () => focusJob(null));
    job.row.addEventListener('click', () => {
      const card = document.getElementById(job.row.dataset.target);
      card.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
      card.classList.remove('flash');
      void card.offsetWidth; // restart the animation
      card.classList.add('flash');
    });
  });

  window.addEventListener('resize', fitGantt);

  /* ------------------------------------------------------------------
     Cursor spotlight on cards
     ------------------------------------------------------------------ */
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.spot');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  /* ------------------------------------------------------------------
     Project filters
     ------------------------------------------------------------------ */
  const filterBtns = $$('.filter');
  const projects = $$('.project');

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let i = 0;
      projects.forEach((card) => {
        const match = f === 'all' || card.dataset.cat.split(' ').includes(f);
        card.hidden = !match;
        if (match) {
          card.classList.add('in');
          if (!reducedMotion) {
            card.animate(
              [{ opacity: 0, transform: 'translateY(16px) scale(.98)' }, { opacity: 1, transform: 'none' }],
              { duration: 420, delay: i * 60, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
            );
          }
          i++;
        }
      });
    });
  });

  /* ------------------------------------------------------------------
     Live GitHub data (falls back to a snapshot if the API is unreachable)
     ------------------------------------------------------------------ */
  const GH_USER = 'bpdang07';
  const LANG_COLORS = {
    Go: '#00ADD8', Java: '#b07219', HTML: '#e34c26', CSS: '#563d7c', JavaScript: '#f1e05a',
    TypeScript: '#3178c6', Python: '#3572A5', GDScript: '#355570', Swift: '#F05138',
    C: '#555555', 'C#': '#178600', Kotlin: '#A97BFF', Shell: '#89e051',
  };
  // Shown when a repo has no description on GitHub
  const REPO_NOTES = {
    CoupV2: 'Multiplayer Android take on the card game Coup, built by a student team with a Spring Boot backend.',
    SE319: 'Coursework for Iowa State SE 319: web projects in HTML, CSS and JavaScript.',
  };
  const SNAPSHOT = {
    profile: { name: 'Billy Dang', public_repos: 6, followers: 4, created_at: '2024-01-31T17:04:40Z',
      bio: 'B.S. in Software Engineering @ Iowa State | Interested in Full Stack, Cloud Engineering, and Game Dev' },
    repos: [
      { name: 'CoupV2', language: 'HTML', description: null, stargazers_count: 1, fork: false, pushed_at: '2025-06-20T16:34:54Z', html_url: 'https://github.com/bpdang07/CoupV2' },
      { name: 'DesktopPetBanana', language: 'GDScript', description: 'Recreating the desktop pet with banana cat', stargazers_count: 0, fork: false, pushed_at: '2025-06-13T14:24:05Z', html_url: 'https://github.com/bpdang07/DesktopPetBanana' },
      { name: 'Hole', language: 'Go', description: 'Converting SVG into a STL', stargazers_count: 1, fork: false, pushed_at: '2024-09-19T03:14:13Z', html_url: 'https://github.com/bpdang07/Hole' },
      { name: 'SE319', language: 'HTML', description: null, stargazers_count: 0, fork: false, pushed_at: '2024-01-31T17:08:08Z', html_url: 'https://github.com/bpdang07/SE319' },
    ],
  };

  let ghLoaded = false;

  async function loadGitHub() {
    if (ghLoaded) return;
    ghLoaded = true;

    const cached = store.get('gh-cache', sessionStorage);
    if (cached) {
      try { renderGitHub(JSON.parse(cached), false); return; } catch (e) { /* refetch */ }
    }

    try {
      const [profileRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${GH_USER}`),
        fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=pushed`),
      ]);
      if (!profileRes.ok || !reposRes.ok) throw new Error('GitHub API ' + profileRes.status);
      const data = { profile: await profileRes.json(), repos: await reposRes.json() };
      store.set('gh-cache', JSON.stringify(data), sessionStorage);
      renderGitHub(data, false);
    } catch (e) {
      renderGitHub(SNAPSHOT, true);
    }
  }

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const monthYear = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  function renderGitHub({ profile, repos }, offline) {
    $('#ghName').textContent = profile.name || GH_USER;
    if (profile.bio) $('#ghBio').textContent = profile.bio.replace(/\s*\|\s*/g, ' · ').trim();
    $('#ghRepos').textContent = profile.public_repos;
    $('#ghFollowers').textContent = profile.followers;
    $('#ghSince').textContent = new Date(profile.created_at).getFullYear();
    if (offline) $('#ghNote').textContent = "Couldn't reach GitHub just now, so this is a recent snapshot.";

    const list = repos
      .filter((r) => !r.fork && r.name.toLowerCase() !== GH_USER)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

    const grid = $('#repoGrid');
    grid.innerHTML = list.map((r) => {
      const desc = r.description || REPO_NOTES[r.name] || 'No description yet.';
      const color = LANG_COLORS[r.language] || 'var(--muted)';
      return `
        <a class="card repo spot" href="${escapeHtml(r.html_url)}" target="_blank" rel="noopener">
          <span class="repo-name">${escapeHtml(r.name)}<svg><use href="#i-external"/></svg></span>
          <p>${escapeHtml(desc)}</p>
          <span class="repo-meta">
            ${r.language ? `<span><i class="lang-dot" style="--c:${color}"></i>${escapeHtml(r.language)}</span>` : ''}
            <span><svg><use href="#i-star"/></svg>${Number(r.stargazers_count) || 0}</span>
            <span>Updated ${monthYear(r.pushed_at)}</span>
          </span>
        </a>`;
    }).join('');

    if (!reducedMotion) {
      $$('.repo', grid).forEach((el, i) => el.animate(
        [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 450, delay: i * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }
      ));
    }
  }

  /* ------------------------------------------------------------------
     Copy email + toast
     ------------------------------------------------------------------ */
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  $('#copyEmail').addEventListener('click', async () => {
    const email = 'bpdang07@gmail.com';
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email copied to clipboard');
    } catch (e) {
      showToast(email);
    }
  });

  $('#year').textContent = new Date().getFullYear();

  // The résumé PDF stays out of the public repo (it has a phone number). Embed it when
  // it's there; otherwise swap in the "available on request" card.
  const RESUME_PDF = 'assets/Billy-Dang-Resume.pdf';
  fetch(RESUME_PDF, { method: 'HEAD', cache: 'no-store' })
    .then((res) => { if (!res.ok) throw new Error('missing'); })
    .then(() => {
      const frame = $('.pdf-frame iframe');
      frame.src = frame.dataset.src;
    })
    .catch(() => {
      $$('[data-pdf]').forEach((el) => { el.hidden = true; });
      $$('[data-pdf-fallback]').forEach((el) => { el.hidden = false; });
      const heroResume = $('#heroResume');
      heroResume.href = '#resume';
      heroResume.removeAttribute('download');
      $('use', heroResume).setAttribute('href', '#i-arrow');
    });

  // Link to the interview prep site, only when running locally (never on the published site)
  const prepLink = $('#prepLink');
  if (location.protocol === 'file:') {
    prepLink.href = new URL('../ibm-interview-prep/index.html', location.href).href;
    prepLink.hidden = false;
  } else if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    prepLink.href = `${location.protocol}//${location.hostname}:8081/`;
    prepLink.hidden = false;
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  show(routeFromHash());
})();
