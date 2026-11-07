/* =========================================================
   PIXO - логика сайта
   ---------------------------------------------------------
   НАСТРОЙКИ, КОТОРЫЕ МОЖНО МЕНЯТЬ БЕЗ ПРОГРАММИСТА - сразу ниже.
   ========================================================= */

/* Название компании: подставляется в логотип, фотополоску и подвал */
const BRAND_NAME = 'Fotobudka Tashkent';

/* Ссылка на Instagram */
const INSTAGRAM_URL = 'https://www.instagram.com/fotobudka_tashkent';

/* Ссылка на Telegram */
const TELEGRAM_URL = 'https://t.me/A7i77';

/* Цена: базовая сумма + цена за каждый час (в сумах) */
const PRICE_BASE = 400000;
const PRICE_PER_HOUR = 600000;
/* Брендирование корпуса будки - разово к заказу (логотип на фото - бесплатно, бонус) */
const BODY_BRANDING_PRICE = 1200000;

/* Бренды в блоке "Работаем с брендами".
   name    - название (показывается, пока нет логотипа)
   caption - подпись под названием
   logo    - путь к файлу логотипа, например 'img/brands/kfc.svg'.
             Положите файл в папку public/img/brands/ и впишите путь -
             вместо текста появится логотип. Пусто ('') - показывается название. */
const BRANDS = [
  { name: 'KFC',             caption: 'Мероприятие бренда', logo: '' },
  { name: 'Bellissimo',      caption: 'Мероприятие бренда', logo: '' },
  { name: 'Oqtepa Lavash',   caption: 'Мероприятие бренда', logo: '' },
  { name: 'L’Oreal Paris',   caption: 'Брендированная будка и фотополоски', logo: '' },
  { name: 'Bosch',           caption: 'Корпоративное мероприятие', logo: '' },
  { name: 'EVOS',            caption: 'Открытие в Бухаре, совместно с Pepsi', logo: '' },
  { name: 'Polpharma Santo', caption: 'Корпоративное мероприятие', logo: '' },
  { name: 'ASU',             caption: 'Almaty Marathon', logo: '' },
  { name: 'Lavina',          caption: 'Брендированная рамка', logo: '' },
  { name: 'Globbing',        caption: 'Брендированная рамка', logo: '' },
  { name: 'Leading',         caption: 'Деловое мероприятие', logo: '' },
  { name: 'Darkside',        caption: 'Event-мероприятие', logo: '' },
];

/* Готовые цвета в конструкторе брендирования */
const SWATCHES = ['#C8102E', '#0057B8', '#00A651', '#E8B44A', '#111111', '#F4F4F5'];
const DEFAULT_BRAND_COLOR = '#C8102E';

/* Наборы кадров для фотополоски на первом экране -
   профессиональные фото из галереи (файлы из img/gallery/) */
const STRIP_SETS = [
  ['loreal-strips', 'wedding-day', 'bosch'],
  ['lavina', 'evos-buxoro', 'leading'],
  ['asu-marathon', 'darkside', 'wedding-day'],
];

/* Темы рамок в блоке "Собери свою рамку" */
const FRAME_THEMES = [
  { id: 'wedding',    label: 'Свадьба',       title: 'Wedding day',       bg: '#F5F1EA', fg: '#2B2620', accent: '#B08A3E', photos: ['wedding-day', 'loreal-strips', 'lavina'] },
  { id: 'birthday',   label: 'День рождения', title: 'С днем рождения!',  bg: '#E8B44A', fg: '#0B0B0C', accent: '#0B0B0C', photos: ['lavina', 'evos-buxoro', 'darkside'] },
  { id: 'corporate',  label: 'Корпоратив',    title: '[ВАШ ЛОГОТИП]',     bg: '#0B0B0C', fg: '#F4F4F5', accent: '#E8B44A', photos: ['bosch', 'leading', 'asu-marathon'] },
  { id: 'graduation', label: 'Выпускной',     title: 'Graduation 2026',   bg: '#0E1A2B', fg: '#E4E4E7', accent: '#E8B44A', photos: ['asu-marathon', 'darkside', 'wedding-day'] },
];

/* ========================================================= */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pageStartedAt = Date.now();

  /* Общее состояние, которое нужно форме заявки */
  const state = {
    hours: 4,
    brandName: '',
    brandTag: '',
    brandColor: DEFAULT_BRAND_COLOR,
    brandColorPicked: false,
    bodyBranding: false,   // брендирование корпуса будки (+BODY_BRANDING_PRICE)
  };

  /* ---------- Помощники ---------- */
  const formatNumber = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const priceFor = (h) => PRICE_BASE + PRICE_PER_HOUR * h;
  const totalFor = (h) => priceFor(h) + (state.bodyBranding ? BODY_BRANDING_PRICE : 0);
  /* Плавно "докручивает" число в элементе от старого значения к новому */
  function animateNumber(el, to, ms = 500) {
    const from = Number(el.dataset.value || to);
    el.dataset.value = String(to);
    if (reduceMotion.matches || from === to) { el.textContent = formatNumber(to); return; }
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = formatNumber(Math.round((from + (to - from) * e) / 1000) * 1000);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function hoursWord(n) {
    const a = n % 100, b = n % 10;
    if (a >= 11 && a <= 14) return 'часов';
    if (b === 1) return 'час';
    if (b >= 2 && b <= 4) return 'часа';
    return 'часов';
  }
  /* Темный текст на светлом фоне, белый - на темном */
  function inkFor(hex) {
    const h = String(hex).replace('#', '');
    const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#0B0B0C' : '#FFFFFF';
  }
  /* Меняет картинку внутри <picture> на профессиональное фото из img/gallery/ */
  function setGalleryPicture(picture, stem) {
    $('source', picture).srcset = `img/gallery/${stem}-600.webp 600w, img/gallery/${stem}-1200.webp 1200w`;
    const img = $('img', picture);
    img.srcset = `img/gallery/${stem}-600.jpg 600w, img/gallery/${stem}-1200.jpg 1200w`;
    img.src = `img/gallery/${stem}-600.jpg`;
  }

  /* ---------- Название и ссылки ---------- */
  $$('[data-brand]').forEach((el) => { el.textContent = BRAND_NAME; });
  $$('[data-instagram]').forEach((el) => { el.href = INSTAGRAM_URL; });
  $$('a[href^="https://t.me/"]').forEach((el) => { el.href = TELEGRAM_URL; });

  /* ---------- Меню-бургер ---------- */
  const burger = $('#burger');
  const nav = $('#nav');
  const pillLabel = $('.pill__label');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
    document.querySelector('.pill-wrap')?.classList.toggle('is-open', open);
    if (pillLabel) pillLabel.textContent = open ? 'Закрыть' : 'Меню';
    // после появления пунктов убираем задержки, чтобы наведение реагировало сразу
    clearTimeout(setMenu.t);
    nav.classList.remove('is-ready');
    if (open) setMenu.t = setTimeout(() => nav.classList.add('is-ready'), 700);
  }

  /* Пункты меню: при наведении буквы по очереди "прокатываются" вверх (как на fourmula.ai) */
  $$('#nav a').forEach((a) => {
    const text = a.textContent.trim();
    const row = (cls) => `<span class="roll__row${cls}" aria-hidden="true">${[...text].map((c, i) => `<span class="ch" style="--d:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span>`;
    a.setAttribute('aria-label', text);
    a.innerHTML = `<span class="roll">${row('')}${row(' roll__row--b')}</span>`;
  });

  /* ---------- Светлая / темная тема (кнопка в капсуле, выбор запоминается) ---------- */
  const themeBtn = $('#theme-toggle');
  const themeMeta = $('meta[name="theme-color"]');
  function applyTheme(dark) {
    if (dark) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
    themeBtn?.setAttribute('aria-pressed', String(dark));
    themeBtn?.setAttribute('aria-label', dark ? 'Светлая тема' : 'Темная тема');
    if (themeMeta) themeMeta.content = dark ? '#111113' : '#F1F0ED';
    window.dispatchEvent(new CustomEvent('fb:theme', { detail: { dark } })); // фон с кубиками перекрашивается
  }
  applyTheme(document.documentElement.dataset.theme === 'dark');
  themeBtn?.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    try { localStorage.setItem('fb-theme', dark ? 'dark' : 'light'); } catch (e) { /* без сохранения */ }
    document.documentElement.classList.add('theme-anim');
    applyTheme(dark);
    setTimeout(() => document.documentElement.classList.remove('theme-anim'), 500);
  });
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('#nav, #burger')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });

  /* ---------- Заставка при открытии: счетчик 0-100, затвор, вспышка ---------- */
  const intro = $('#intro');
  if (intro && document.documentElement.classList.contains('has-intro')) {
    const countEl2 = $('#intro-count');
    const bar = $('#intro-bar');
    const DUR = 1300;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / DUR);
      const e = 1 - Math.pow(1 - k, 3);
      countEl2.textContent = String(Math.round(e * 100));
      bar.style.transform = `scaleX(${e})`;
      if (k < 1) { requestAnimationFrame(step); return; }
      // 100: короткая вспышка, затвор раскрывается и показывает сайт
      setTimeout(() => {
        intro.classList.add('is-flash');
        setTimeout(() => {
          intro.classList.add('is-open');
          document.documentElement.classList.add('intro-done');
          setTimeout(() => {
            intro.remove();
            document.documentElement.classList.remove('has-intro', 'intro-done');
          }, 1000);
        }, 160);
      }, 180);
    };
    requestAnimationFrame(step);
    try { sessionStorage.setItem('fb-intro', '1'); } catch (e) { /* без сохранения */ }
  } else if (intro) {
    intro.remove();
  }

  /* ---------- Логотип-капсула парит: плавно и непрерывно дрейфует в случайные стороны ---------- */
  const logoEl = $('.logo');
  if (logoEl && !reduceMotion.matches) {
    const MAX_X = 6, MAX_Y = 4, MAX_R = 0;        // насколько далеко может уплыть (px); без наклона
    let cur = { x: 0, y: 0, r: 0 }, vel = { x: 0, y: 0, r: 0 }, target = { x: 0, y: 0, r: 0 };
    const pickTarget = () => {
      // каждый раз - в противоположную сторону от прошлой точки, чтобы капсула не 'уплывала' в одну сторону
      const sx = target.x > 0 ? -1 : 1, sy = target.y > 0 ? -1 : 1;
      target = { x: sx * (0.3 + Math.random() * 0.7) * MAX_X, y: sy * (0.3 + Math.random() * 0.7) * MAX_Y, r: 0 };
      setTimeout(pickTarget, 1400 + Math.random() * 1800); // новое случайное направление каждые 1.4-3.2 сек
    };
    pickTarget();
    const drift = () => {
      // мягкая "пружина": разгоняется и тормозит плавно, без рывков
      ['x', 'y', 'r'].forEach((k) => {
        vel[k] += (target[k] - cur[k]) * 0.004;
        vel[k] *= 0.94;
        cur[k] += vel[k];
      });
      logoEl.style.transform = `translate(${cur.x.toFixed(2)}px, ${cur.y.toFixed(2)}px) rotate(${cur.r.toFixed(2)}deg)`;
      requestAnimationFrame(drift);
    };
    requestAnimationFrame(drift);
  }

  /* ---------- Кошки - наша фишка (анимации LottieFiles, проигрыватель dotLottie) ----------
     1) из-под капсулы меню иногда выглядывает черная кошка и смотрит по сторонам (только компьютер);
     2) в подвале на кнопке Telegram спит кошка-силуэт, от мыши/касания просыпается. */
  const LOTTIE_URL = 'https://cdn.jsdelivr.net/npm/@lottiefiles/dotlottie-web@0.80.0/+esm';
  let lottieLib = null;
  const loadLottie = () => (lottieLib = lottieLib || import(LOTTIE_URL).then((m) => m.DotLottie));
  const darkNow = () => document.documentElement.dataset.theme === 'dark';

  // 1) Кошка из-под меню
  const peekBox = $('.cat-peek');
  const peekOk = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)');
  if (peekBox && !reduceMotion.matches && peekOk.matches) {
    let peek = null, peekUntil = 0;
    const peekOnce = async () => {
      const wrap = peekBox.closest('.pill-wrap');
      if (document.hidden || !peekOk.matches || (wrap && wrap.classList.contains('is-open'))) return;
      if (!peek) {
        const DotLottie = await loadLottie();
        peek = new DotLottie({
          canvas: peekBox.querySelector('canvas'), src: 'img/cats/cat-peek.lottie', autoplay: false, loop: false,
          layout: { fit: 'contain', align: [0.5, 1] }, renderConfig: { autoResize: true },
        });
        await new Promise((r) => peek.addEventListener('load', r));
        // смотрит 5-8 сек: анимация короче (3 сек), поэтому повторяем ее часть, где кошка уже выглянула и водит глазами
        peek.addEventListener('complete', () => {
          if (!peekBox.classList.contains('is-up')) return;
          if (performance.now() < peekUntil - 1500) { peek.setFrame(30); peek.play(); }
          else hidePeek(420); // в конце голова остается видна - сами убираем ее под капсулу
        });
        window.FB_PEEK_ANIM = peek; // для проверки
      }
      peekBox.style.left = (30 + Math.random() * 40) + '%'; // каждый раз из нового места
      peekBox.style.visibility = '';
      peekUntil = performance.now() + 5000 + Math.random() * 3000; // смотрит 5-8 сек
      peek.stop(); peek.play();
      peekBox.classList.add('is-up');
    };
    // кошка уезжает вверх под капсулу и пропадает до следующего раза
    const hidePeek = (ms) => {
      if (!peek || !peekBox.classList.contains('is-up')) return;
      peekBox.classList.remove('is-up');
      const cv = peekBox.querySelector('canvas');
      peek.pause();
      const a = cv.animate([{ translate: '0 0' }, { translate: '0 -70px' }], { duration: ms, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' });
      a.onfinish = () => { peekBox.style.visibility = 'hidden'; peek.stop(); a.cancel(); };
    };
    // клик по кошке - пугается и быстро прячется
    peekBox.addEventListener('click', () => hidePeek(200));
    const loop = () => { setTimeout(() => { peekOnce().catch(() => {}); loop(); }, 8000 + Math.random() * 7000); }; // каждые 8-15 сек
    setTimeout(() => peekOnce().catch(() => {}), 5000); // первый раз - через 5 сек
    loop();
    window.FB_PEEK = peekOnce; // для проверки
  }

  // 2) Спящая кошка в подвале
  const footCat = $('.foot-cat');
  if (footCat) {
    const fbox = footCat.closest('.foot__contacts') || footCat.parentElement; // место кошки задано в CSS (.foot__catspot)
    let started = false;
    const start = async () => {
      if (started) return;
      started = true;
      try {
        const DotLottie = await loadLottie();
        const cat = new DotLottie({
          canvas: footCat, src: 'img/cats/cat-sleep.lottie', autoplay: true, loop: true,
          layout: { fit: 'contain', align: [0.5, 1] }, renderConfig: { autoResize: true, freezeOnOffscreen: true },
          stateMachineId: 'StateMachine1',
        });
        cat.addEventListener('load', () => footCat.classList.add('is-ready'));
        window.FB_FOOTCAT = cat; // для проверки
      } catch (e) { console.warn('Кошка в подвале не загрузилась:', e); }
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '400px' });
      io.observe(fbox);
    } else start();
  }

  /* "Забронировать" в шапке тоже чуть-чуть дрейфует (свойство translate - не мешает магниту) */
  const bookBtn = $('.header__actions .btn--sm');
  if (bookBtn && !reduceMotion.matches && !window.matchMedia('(max-width: 767px)').matches) { // на телефоне кнопка скрыта
    const B = { x: 3, y: 2.2 };
    let c = { x: 0, y: 0 }, v = { x: 0, y: 0 }, tg = { x: 0, y: 0 };
    const pick = () => {
      tg = { x: (tg.x > 0 ? -1 : 1) * (0.4 + Math.random() * 0.6) * B.x, y: (tg.y > 0 ? -1 : 1) * (0.4 + Math.random() * 0.6) * B.y };
      setTimeout(pick, 1600 + Math.random() * 1600);
    };
    pick();
    const run = () => {
      ['x', 'y'].forEach((k) => { v[k] += (tg[k] - c[k]) * 0.004; v[k] *= 0.94; c[k] += v[k]; });
      bookBtn.style.translate = `${c.x.toFixed(2)}px ${c.y.toFixed(2)}px`;
      requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  // год в подвале - всегда текущий
  if ($('#foot-year')) $('#foot-year').textContent = String(new Date().getFullYear());

  /* ---------- Кнопка "Наверх": появляется ниже первого экрана, кольцо = сколько пролистано ---------- */
  const toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Наверх');
  toTop.innerHTML = `<svg class="to-top__ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" pathLength="100"/></svg>
    <svg class="to-top__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
  document.body.appendChild(toTop);
  const toTopRing = $('.to-top__ring circle', toTop);
  toTop.addEventListener('click', () => {
    if (window.FB_LENIS) window.FB_LENIS.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    toTop.blur();
  });

  /* ---------- Шапка при прокрутке и полоска прогресса ---------- */
  const headerBar = $('#header-bar');
  const progress = $('#progress');
  const pct = $('#pct');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    headerBar.classList.toggle('is-scrolled', y > 10);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (pct) pct.textContent = `${max > 0 ? Math.round(Math.min(1, y / max) * 100) : 0}%`;
    toTop.classList.toggle('is-visible', y > window.innerHeight * 0.9);
    toTopRing.style.strokeDashoffset = String(100 - (max > 0 ? Math.min(1, y / max) * 100 : 0));
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Будка: "Сделать снимок" ---------- */
  const booth = $('#booth');
  const boothScreen = $('.booth__screen', booth);
  const shootBtn = $('#shoot');
  const shootLabel = $('#shoot-label');
  const countEl = $('#count');
  const hintEl = $('#hint');
  const strip = $('#strip');
  const flash = $('#flash');
  const shootStatus = $('#shoot-status');
  const stripPictures = $$('[data-strip]', strip);
  let shot = 0;
  let busy = false;

  function printStrip() {
    strip.classList.remove('is-hidden', 'is-printing');
    void strip.offsetWidth; // перезапуск анимации
    strip.classList.add('is-printing');
  }
  function showCount(n) {
    countEl.textContent = n;
    countEl.style.animation = 'none';
    void countEl.offsetWidth;
    countEl.style.animation = '';
  }
  function shoot() {
    if (busy) return;
    busy = true;
    shootBtn.setAttribute('aria-disabled', 'true');
    shootLabel.textContent = 'Улыбаемся...';
    shootStatus.textContent = 'Отсчет: 3, 2, 1';
    strip.classList.add('is-hidden');
    strip.classList.remove('is-printing');
    hintEl.hidden = true;
    countEl.hidden = false;
    booth.classList.add('is-rec');   // мигает красная точка "запись"
    $$('.booth__shot', boothScreen).forEach((el) => el.remove());
    let n = 3;
    showCount(n);
    const timer = setInterval(() => {
      n -= 1;
      if (n > 0) { showCount(n); return; }
      clearInterval(timer);
      countEl.hidden = true;
      booth.classList.remove('is-rec');
      flash.hidden = false;
      shot += 1;
      const set = STRIP_SETS[shot % STRIP_SETS.length];
      // Сразу после вспышки на экране будки появляется снятый кадр
      const shotImg = document.createElement('img');
      shotImg.className = 'booth__shot';
      shotImg.alt = '';
      shotImg.src = `img/gallery/${set[0]}-600.jpg`;
      boothScreen.appendChild(shotImg);
      setTimeout(() => {
        flash.hidden = true;
        stripPictures.forEach((p, i) => setGalleryPicture(p, set[i]));
        printStrip();
        shootStatus.textContent = 'Снимок готов, фотополоска печатается';
        busy = false;
        shootBtn.removeAttribute('aria-disabled');
        shootLabel.textContent = 'Еще снимок';
        // кадр на экране держится чуть дольше, потом возвращается подсказка
        setTimeout(() => { shotImg.remove(); if (!busy) hintEl.hidden = false; }, 2200);
      }, reduceMotion.matches ? 600 : 450);
    }, 800);
  }
  // Будка слегка поворачивается вслед за мышкой (только на компьютере)
  const heroBooth = $('.hero__booth');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
    heroBooth.addEventListener('mousemove', (e) => {
      const r = heroBooth.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      booth.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 6}deg)`;
    });
    heroBooth.addEventListener('mouseleave', () => { booth.style.transform = ''; });
  }
  shootBtn.addEventListener('click', shoot);
  // При загрузке полоска один раз выезжает сама
  printStrip();
  // Заранее подгружаем кадры следующих наборов, чтобы они появлялись без задержки
  window.addEventListener('load', () => {
    setTimeout(() => {
      new Set(STRIP_SETS.flat()).forEach((stem) => { const i = new Image(); i.src = `img/gallery/${stem}-600.webp`; });
    }, 1500);
  });

  /* ---------- Конструктор брендирования ---------- */
  const miniBooth = $('#mini-booth');
  const mbName = $('#mb-name');
  const mbTag = $('#mb-tag');
  const brandNameInput = $('#brand-name');
  const brandTagInput = $('#brand-tag');
  const brandColorInput = $('#brand-color');
  const swatchesBox = $('#swatches');
  const customSwatch = $('#swatch-custom');

  SWATCHES.forEach((hex, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = hex;
    b.dataset.hex = hex;
    b.setAttribute('aria-label', `Цвет ${i + 1}`);
    b.addEventListener('click', () => setBrandColor(hex, true));
    swatchesBox.insertBefore(b, customSwatch);
  });

  function setBrandColor(hex, picked) {
    state.brandColor = hex;
    if (picked) state.brandColorPicked = true;
    miniBooth.style.setProperty('--brand', hex);
    miniBooth.style.setProperty('--ink', inkFor(hex));
    let preset = false;
    $$('.swatch', swatchesBox).forEach((b) => {
      const on = b.dataset.hex.toLowerCase() === hex.toLowerCase();
      if (on) preset = true;
      b.setAttribute('aria-pressed', String(on));
    });
    customSwatch.classList.toggle('is-active', !preset);
    if (!preset) customSwatch.style.background = hex; else customSwatch.style.background = '';
    if (brandColorInput.value.toLowerCase() !== hex.toLowerCase()) brandColorInput.value = hex.toLowerCase();
    updateSummary();
  }
  brandColorInput.addEventListener('input', (e) => setBrandColor(e.target.value, true));
  /* Название и хэштег можно вводить и здесь, и в форме заявки - поля связаны */
  const formBrandInput = $('#f-brand');
  const formTagInput = $('#f-tag');
  function setBrandName(v, from) {
    state.brandName = v.trim();
    mbName.textContent = state.brandName || 'ВАШ БРЕНД';
    [brandNameInput, formBrandInput].forEach((el) => { if (el !== from) el.value = v; });
    updateSummary();
  }
  function setBrandTag(v, from) {
    state.brandTag = v.trim();
    mbTag.textContent = state.brandTag || '#вашхэштег';
    [brandTagInput, formTagInput].forEach((el) => { if (el !== from) el.value = v; });
    updateSummary();
  }
  [brandNameInput, formBrandInput].forEach((el) => el.addEventListener('input', () => setBrandName(el.value, el)));
  [brandTagInput, formTagInput].forEach((el) => el.addEventListener('input', () => setBrandTag(el.value, el)));

  /* ---------- Хоровод фото: кнопка в центре = отсчет 3-2-1, вспышка и переход к заявке ---------- */
  const ringBtn = $('#ring-shot');
  if (ringBtn) {
    const ring = $('#ring');
    const ringCount = $('.ring__count', ringBtn);
    const ringCap = $('#ring-cap');
    let ringBusy = false;
    const goToForm = () => {
      const target = $('#book');
      if (window.FB_LENIS) window.FB_LENIS.scrollTo(target, { offset: -70, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      setTimeout(() => $('#f-name')?.focus({ preventScroll: true }), reduceMotion.matches ? 50 : 1500);
    };
    ringBtn.addEventListener('click', () => {
      if (ringBusy) return;
      if (reduceMotion.matches) { goToForm(); return; }
      ringBusy = true;
      ring.classList.add('is-shooting');
      // хоровод плавно ускоряется (без рывка - меняем скорость уже идущей анимации)
      const spins = [...ring.querySelectorAll('.ring__rot, .ring__upright')].flatMap((el) => el.getAnimations());
      spins.forEach((a) => { a.playbackRate = 7; });
      ringCap.textContent = 'Улыбаемся...';
      let n = 3;
      const show = () => {
        ringCount.textContent = n;
        ringCount.classList.remove('is-pop'); void ringCount.offsetWidth; ringCount.classList.add('is-pop');
      };
      show();
      const timer = setInterval(() => {
        n -= 1;
        if (n > 0) { show(); return; }
        clearInterval(timer);
        ringCount.textContent = '';
        flash.hidden = false;               // вспышка (тот же эффект, что у будки на первом экране)
        setTimeout(() => {
          flash.hidden = true;
          ring.classList.remove('is-shooting');
          spins.forEach((a) => { a.playbackRate = 1; });
          ringCap.textContent = 'Нажми - сделаем снимок';
          ringBusy = false;
          goToForm();
        }, 450);
      }, 750);
    });
  }

  /* ---------- Галерея: листается движением мышки (без нажатия) ----------
     Курсор в правой части галереи - лента плавно едет вправо, в левой - влево.
     Колесико/тачпад и палец на телефоне работают как раньше. */
  const gScroller = $('.gallery__scroller');
  if (gScroller && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
    let gTarget = 0, gRaf = null, gActive = false;
    const gTick = () => {
      const cur = gScroller.scrollLeft;
      const next = cur + (gTarget - cur) * 0.08; // плавное "догоняние"
      gScroller.scrollLeft = Math.abs(gTarget - next) < 0.5 ? gTarget : next;
      gRaf = gActive || Math.abs(gTarget - gScroller.scrollLeft) > 0.5 ? requestAnimationFrame(gTick) : null;
    };
    gScroller.addEventListener('mousemove', (e) => {
      const r = gScroller.getBoundingClientRect();
      const max = gScroller.scrollWidth - gScroller.clientWidth;
      if (max <= 0) return;
      // края по 12% - "мертвые зоны", чтобы дойти до самого начала/конца было легко
      let p = (e.clientX - r.left) / r.width;
      p = Math.min(1, Math.max(0, (p - 0.12) / 0.76));
      gTarget = p * max;
      gActive = true;
      if (!gRaf) gRaf = requestAnimationFrame(gTick);
    });
    gScroller.addEventListener('mouseleave', () => { gActive = false; });
    // если листают колесиком/тачпадом - не мешаем
    gScroller.addEventListener('wheel', () => { gTarget = gScroller.scrollLeft; }, { passive: true });
    gScroller.classList.add('is-pan');
  } else if ($('.gallery__hint')) {
    $('.gallery__hint').textContent = 'Листайте в сторону →'; // на телефоне листают пальцем
  }

  /* ---------- Галерея и лайтбокс ---------- */
  const lightbox = $('#lightbox');
  const lbImg = $('#lb-img');
  const lbSource = $('#lb-source');
  const lbCaption = $('#lb-caption');
  const cards = $$('.card__btn');
  let lbIndex = 0;

  function showPhoto(i) {
    lbIndex = (i + cards.length) % cards.length;
    const btn = cards[lbIndex];
    const stem = btn.dataset.stem;
    const thumb = $('img', btn);
    lbSource.srcset = `img/gallery/${stem}-600.webp 600w, img/gallery/${stem}-1200.webp 1200w`;
    lbImg.srcset = `img/gallery/${stem}-600.jpg 600w, img/gallery/${stem}-1200.jpg 1200w`;
    lbImg.src = `img/gallery/${stem}-1200.jpg`;
    lbImg.alt = thumb.alt;
    lbCaption.textContent = btn.closest('figure').querySelector('figcaption').textContent;
  }
  function openLightbox(i) {
    showPhoto(i);
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
    $('#lb-close').focus();
  }
  function closeLightbox() {
    if (lightbox.open) lightbox.close();
  }
  lightbox.addEventListener('close', () => {
    document.body.style.overflow = '';
    cards[lbIndex].focus({ preventScroll: true });
  });
  cards.forEach((btn, i) => btn.addEventListener('click', () => openLightbox(i)));
  $('#lb-close').addEventListener('click', closeLightbox);
  $('#lb-prev').addEventListener('click', () => showPhoto(lbIndex - 1));
  $('#lb-next').addEventListener('click', () => showPhoto(lbIndex + 1));
  lightbox.addEventListener('click', (e) => {
    // клик мимо фото (по темному фону) закрывает
    if (e.target === lightbox || e.target.classList.contains('lightbox__inner')) closeLightbox();
  });
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); showPhoto(lbIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showPhoto(lbIndex + 1); }
  });
  // Свайп по фото в лайтбоксе на телефоне
  let touchX = null;
  lightbox.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showPhoto(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Бренды ---------- */
  const brandsList = $('#brands-list');
  BRANDS.forEach((b) => {
    const li = document.createElement('li');
    li.className = 'brand';
    if (b.logo) {
      const img = document.createElement('img');
      img.className = 'brand__logo';
      img.src = b.logo;
      img.alt = b.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      li.appendChild(img);
    } else {
      const name = document.createElement('span');
      name.className = 'brand__name';
      name.textContent = b.name;
      li.appendChild(name);
    }
    const cap = document.createElement('span');
    cap.className = 'brand__caption';
    cap.textContent = b.caption;
    li.appendChild(cap);
    brandsList.appendChild(li);
  });

  /* ---------- Собери свою рамку ---------- */
  const chips = $('#event-chips');
  const photoStrip = $('#photo-strip');
  const framePictures = $$('[data-frame]', photoStrip);
  const psTitle = $('#ps-title');
  const psNames = $('#ps-names');
  const psDate = $('#ps-date');
  const frameNames = $('#frame-names');
  const frameDate = $('#frame-date');

  let frameThemeId = null;
  function applyFrameTheme(t) {
    photoStrip.style.setProperty('--fbg', t.bg);
    photoStrip.style.setProperty('--ffg', t.fg);
    photoStrip.style.setProperty('--facc', t.accent);
    psTitle.textContent = t.title;
    framePictures.forEach((p, i) => setGalleryPicture(p, t.photos[i]));
  }
  function setTheme(id) {
    const t = FRAME_THEMES.find((x) => x.id === id) || FRAME_THEMES[0];
    const first = frameThemeId === null;
    if (t.id === frameThemeId) return;
    frameThemeId = t.id;
    $$('.chip', chips).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.id === t.id)));
    moveChipPill();
    if (first || reduceMotion.matches) { applyFrameTheme(t); return; }
    // "перепечатка": старая полоска уезжает вниз, новая выезжает сверху, как из принтера
    photoStrip.classList.remove('is-print-in');
    photoStrip.classList.add('is-print-out');
    setTimeout(() => {
      applyFrameTheme(t);
      photoStrip.classList.remove('is-print-out');
      void photoStrip.offsetWidth;
      photoStrip.classList.add('is-print-in');
    }, 380);
  }
  // белая подложка, которая переезжает к выбранной кнопке события
  const chipPill = document.createElement('span');
  chipPill.className = 'chip-pill';
  chipPill.setAttribute('aria-hidden', 'true');
  chips.appendChild(chipPill);
  chips.classList.add('has-pill');
  function moveChipPill() {
    const active = $('.chip[aria-pressed="true"]', chips);
    if (!active) return;
    chipPill.style.width = active.offsetWidth + 'px';
    chipPill.style.height = active.offsetHeight + 'px';
    chipPill.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
  }
  window.addEventListener('resize', moveChipPill);
  if (document.fonts) document.fonts.ready.then(moveChipPill);
  FRAME_THEMES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.id = t.id;
    b.textContent = t.label;
    b.addEventListener('click', () => setTheme(t.id));
    chips.appendChild(b);
  });
  setTheme('wedding');
  frameNames.addEventListener('input', () => { psNames.textContent = frameNames.value; });
  frameDate.addEventListener('input', () => { psDate.textContent = frameDate.value; });
  // пока печатают - на полоске мигает курсор
  [[frameNames, psNames], [frameDate, psDate]].forEach(([inp, out]) => {
    inp.addEventListener('focus', () => out.classList.add('is-typing'));
    inp.addEventListener('blur', () => out.classList.remove('is-typing'));
  });

  /* Блок "Рамки": свет за курсором и объемная полоска (наклон за мышкой, блик, парение) */
  const frameSec = $('#frame');
  if (frameSec && !reduceMotion.matches) {
    // обертки: парение -> наклон -> сама полоска
    const floatWrap = document.createElement('div');
    floatWrap.className = 'ps-float';
    const tiltWrap = document.createElement('div');
    tiltWrap.className = 'ps-tilt';
    photoStrip.parentNode.insertBefore(floatWrap, photoStrip);
    floatWrap.appendChild(tiltWrap);
    tiltWrap.appendChild(photoStrip);
    const glare = document.createElement('span');
    glare.className = 'ps-glare';
    glare.setAttribute('aria-hidden', 'true');
    photoStrip.appendChild(glare);

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const tickTilt = () => {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      tiltWrap.style.transform = `perspective(900px) rotateY(${cx * 14}deg) rotateX(${-cy * 10}deg)`;
      photoStrip.style.setProperty('--gx', `${50 + cx * 60}%`);
      photoStrip.style.setProperty('--gy', `${50 + cy * 60}%`);
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(tickTilt) : null;
    };
    if (fine) {
      frameSec.addEventListener('mousemove', (e) => {
        const r = frameSec.getBoundingClientRect();
        frameSec.style.setProperty('--mx', `${e.clientX - r.left}px`);
        frameSec.style.setProperty('--my', `${e.clientY - r.top}px`);
        const pr = tiltWrap.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, (e.clientX - (pr.left + pr.width / 2)) / (r.width / 2)));
        ty = Math.max(-1, Math.min(1, (e.clientY - (pr.top + pr.height / 2)) / (r.height / 2)));
        if (!raf) raf = requestAnimationFrame(tickTilt);
      });
      frameSec.addEventListener('mouseleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tickTilt); });
    }
    frameSec.classList.add('is-live');
  }

  /* ---------- Калькулятор ---------- */
  const hoursInput = $('#hours');
  const hoursLabel = $('#hours-label');
  const priceText = $('#price-text');
  const hoursShort = $('#hours-short');
  const summary = $('#summary');
  const sumTime = $('#sum-time');
  const sumBrand = $('#sum-brand');
  const sumBrandText = $('#sum-brand-text');
  const fHours = $('#f-hours');
  const fBranding = $('#f-branding');
  const sumBranding = $('#sum-branding');

  // Варианты времени в форме заявки: 2-8 часов с ценой
  for (let h = Number(hoursInput.min); h <= Number(hoursInput.max); h++) {
    const o = document.createElement('option');
    o.value = String(h);
    o.textContent = `${h} ${hoursWord(h)} - ${formatNumber(priceFor(h))} сум`;
    fHours.appendChild(o);
  }

  function setHours(h) {
    state.hours = h;
    // калькулятор и форма всегда показывают одно и то же время
    hoursInput.value = String(h);
    fHours.value = String(h);
    const word = `${h} ${hoursWord(h)}`;
    hoursLabel.textContent = state.bodyBranding ? `${word} + брендирование` : `${word} аренды`;
    animateNumber(priceText, totalFor(h));
    hoursShort.textContent = word;
    hoursInput.setAttribute('aria-valuetext', `${word}, ${formatNumber(totalFor(h))} сум`);
    updateSummary();
  }

  /* Брендирование корпуса будки: переключатели в блоке "Брендирование" и в калькуляторе
     работают вместе, и вместе с полем "Брендирование" в форме заявки */
  const brandingSwitches = $$('[data-branding-switch]');
  const configurator = $('#configurator');
  const livePhoto = $('#live-photo');
  const liveBadge = $('#live-badge');
  function setBodyBranding(on) {
    const changed = state.bodyBranding !== on;
    state.bodyBranding = on;
    brandingSwitches.forEach((s) => { s.checked = on; });
    miniBooth.classList.toggle('is-plain', !on);
    configurator.classList.toggle('is-plain', !on);
    if (on) fBranding.value = 'Корпус и рамка';
    else if (fBranding.value === 'Корпус и рамка') fBranding.value = 'Только рамка';
    // Фото справа: будка в брендинге или обычная черная будка
    const pic = $('picture', livePhoto);
    const swap = () => {
      setGalleryPicture(pic, on ? 'loreal-booth' : 'plain-booth');
      $('img', pic).alt = on ? 'Будка в брендинге L’Oreal Paris' : 'Фотобудка без брендирования';
      liveBadge.textContent = on ? 'С брендированием: L’Oreal Paris' : 'Без брендирования';
      livePhoto.classList.remove('is-swapping');
    };
    if (changed && !reduceMotion.matches) { livePhoto.classList.add('is-swapping'); setTimeout(swap, 220); } else swap();
    setHours(state.hours);
  }
  brandingSwitches.forEach((s) => s.addEventListener('change', () => setBodyBranding(s.checked)));
  // Начали вводить название, хэштег или выбирать цвет - сразу показываем будку в брендинге
  [brandNameInput, brandTagInput, brandColorInput].forEach((el) => el.addEventListener('input', () => { if (!state.bodyBranding) setBodyBranding(true); }));
  swatchesBox.addEventListener('click', (e) => { if (e.target.closest('.swatch') && !state.bodyBranding) setBodyBranding(true); });
  function brandSummary() {
    const parts = [];
    if (state.brandName) parts.push(state.brandName);
    if (state.brandTag) parts.push(state.brandTag);
    if (state.brandColorPicked) parts.push(`цвет ${state.brandColor.toUpperCase()}`);
    return parts.join(' / ');
  }
  function updateSummary() {
    sumTime.textContent = `${state.hours} ${hoursWord(state.hours)}${state.bodyBranding ? ' + корпус' : ''} - ${formatNumber(totalFor(state.hours))} сум`;
    sumBranding.textContent = fBranding.options[fBranding.selectedIndex].text.toLowerCase();
    // "Без брендирования" - поля бренда в форме не нужны
    const noBrand = fBranding.value === 'Без брендирования';
    $('#f-brand-row').hidden = noBrand;
    const b = noBrand ? '' : brandSummary();
    sumBrand.hidden = !b;
    sumBrandText.textContent = b;
    // красивые списки (ниже) обновляют подпись, если значение поменял калькулятор или переключатель
    $$('select.select').forEach((s) => s.dispatchEvent(new Event('fb:sync')));
  }
  hoursInput.addEventListener('input', () => setHours(Number(hoursInput.value)));
  fHours.addEventListener('change', () => setHours(Number(fHours.value)));
  fBranding.addEventListener('change', () => {
    const on = fBranding.value === 'Корпус и рамка';
    if (on !== state.bodyBranding) setBodyBranding(on); else updateSummary();
  });
  $('#book-hours').addEventListener('click', () => {
    summary.classList.remove('is-updated');
    void summary.offsetWidth;
    summary.classList.add('is-updated');
    setTimeout(() => $('#f-name').focus({ preventScroll: true }), reduceMotion.matches ? 0 : 700);
  });
  state.hours = Number(hoursInput.value) || 4;
  setBodyBranding(false);   // по умолчанию - без брендирования корпуса
  setBrandColor(DEFAULT_BRAND_COLOR, false);

  /* ---------- Форма заявки ---------- */
  const form = $('#lead-form');
  const fName = $('#f-name');
  const fPhone = $('#f-phone');
  const fDate = $('#f-date');
  const fEvent = $('#f-event');
  const fWebsite = $('#f-website');
  const submitBtn = $('#submit');
  const formError = $('#form-error');
  const success = $('#success');

  // Нельзя выбрать прошедшую дату
  const today = new Date();
  fDate.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  // Маска телефона: +998 XX XXX XX XX
  function phoneDigits(value) {
    let d = value.replace(/\D/g, '');
    if (d.startsWith('998')) d = d.slice(3);
    else if (d.length > 9 && d.startsWith('8')) d = d.slice(1);
    return d.slice(0, 9);
  }
  function formatPhone(d) {
    let out = '+998';
    if (d.length) out += ' ' + d.slice(0, 2);
    if (d.length > 2) out += ' ' + d.slice(2, 5);
    if (d.length > 5) out += ' ' + d.slice(5, 7);
    if (d.length > 7) out += ' ' + d.slice(7, 9);
    return out;
  }
  fPhone.addEventListener('focus', () => { if (!fPhone.value) fPhone.value = '+998 '; });
  fPhone.addEventListener('blur', () => { if (phoneDigits(fPhone.value).length === 0) fPhone.value = ''; });
  fPhone.addEventListener('input', (e) => {
    const deleting = e.inputType && e.inputType.startsWith('delete');
    const d = phoneDigits(fPhone.value);
    fPhone.value = deleting && d.length === 0 ? '+998 ' : formatPhone(d);
    if (fPhone.getAttribute('aria-invalid') === 'true' && d.length === 9) setFieldError(fPhone, false);
  });
  fName.addEventListener('input', () => { if (fName.value.trim()) setFieldError(fName, false); });

  function setFieldError(input, on) {
    const err = $('#' + input.id + '-error');
    input.setAttribute('aria-invalid', String(on));
    if (on) input.setAttribute('aria-describedby', err.id);
    err.hidden = !on;
  }
  function validate() {
    const nameOk = fName.value.trim().length > 0;
    const phoneOk = phoneDigits(fPhone.value).length === 9;
    setFieldError(fName, !nameOk);
    setFieldError(fPhone, !phoneOk);
    if (!nameOk) fName.focus();
    else if (!phoneOk) fPhone.focus();
    return nameOk && phoneOk;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.hidden = true;
    if (!validate()) return;

    const payload = {
      name: fName.value.trim(),
      phone: formatPhone(phoneDigits(fPhone.value)),
      date: fDate.value,
      time: $('#f-time').value,
      event: fEvent.value,
      hours: state.hours,
      price: totalFor(state.hours),   // уже вместе с брендированием корпуса, если оно выбрано
      branding: fBranding.value,
      wishes: $('#f-wishes').value.trim(),
      brand: fBranding.value === 'Без брендирования' ? '' : state.brandName,
      tag: fBranding.value === 'Без брендирования' ? '' : state.brandTag,
      color: state.brandColorPicked && fBranding.value !== 'Без брендирования' ? state.brandColor : '',
      page: location.href,
      website: fWebsite.value,   // ловушка для ботов
      elapsedMs: Date.now() - pageStartedAt,  // защита от слишком быстрой отправки
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'HTTP ' + res.status);
      $('#success-name').textContent = payload.name || 'друг';
      form.hidden = true;
      success.hidden = false;
      $('#success-title').focus();
      celebrate();
    } catch (err) {
      formError.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
    }
  });

  $('#again').addEventListener('click', () => {
    fName.value = '';
    fPhone.value = '';
    fDate.value = '';
    $('#f-wishes').value = '';
    $('#f-time').value = '';
    success.hidden = true;
    form.hidden = false;
    fName.focus();
  });

  /* ---------- Вспышка и конфетти после отправленной заявки ---------- */
  function celebrate() {
    if (reduceMotion.matches) return;
    flash.hidden = false;
    setTimeout(() => { flash.hidden = true; }, 500);
    const box = document.createElement('div');
    box.className = 'confetti';
    box.setAttribute('aria-hidden', 'true');
    const colors = ['#1B1B1F', '#55555B', '#B4B4BB', '#FFFFFF', '#D6D3CC', '#E5484D'];
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = 0; i < 110; i++) {
      const p = document.createElement('i');
      const w = 6 + Math.random() * 8;
      p.style.left = `${Math.random() * W}px`;
      p.style.width = `${w}px`;
      p.style.height = `${w * (Math.random() < 0.5 ? 0.45 : 1.3)}px`;
      p.style.background = colors[i % colors.length];
      if (colors[i % colors.length] === '#FFFFFF') p.style.boxShadow = '0 0 0 1px rgba(0,0,0,.08)';
      if (Math.random() < 0.25) p.style.borderRadius = '50%';
      box.appendChild(p);
      const drift = (Math.random() - 0.5) * 240;
      p.animate([
        { transform: `translate(0, -20px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${drift}px, ${H + 40}px) rotate(${(Math.random() * 2 - 1) * 900}deg)`, opacity: 1 },
      ], { duration: 2200 + Math.random() * 1800, delay: Math.random() * 400, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4800);
  }

  /* ---------- "Живые" цифры: считаются от нуля, когда появляются на экране ---------- */
  const counters = $$('[data-count]');
  function countUp(el) {
    const to = Number(el.dataset.count);
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 1400);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  /* ---------- Время начала: список с шагом 30 минут вместо стандартного поля ----------
     Значение по-прежнему уходит в заявку из поля #f-time (оно просто спрятано). */
  const timeInput = $('#f-time');
  if (timeInput) {
    const tsel = document.createElement('select');
    tsel.id = 'f-time-sel';
    tsel.className = 'input select';
    let opts = '<option value="">Не важно / уточню</option>';
    for (let m = 8 * 60; m <= 23 * 60 + 30; m += 30) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(m % 60).padStart(2, '0');
      opts += `<option value="${hh}:${mm}">${hh}:${mm}</option>`;
    }
    tsel.innerHTML = opts;
    timeInput.type = 'hidden';
    timeInput.parentNode.insertBefore(tsel, timeInput);
    const tLabel = $('label[for="f-time"]');
    if (tLabel) tLabel.htmlFor = 'f-time-sel';
    tsel.addEventListener('change', () => { timeInput.value = tsel.value; });
    $('#again')?.addEventListener('click', () => { tsel.value = ''; tsel.dispatchEvent(new Event('fb:sync')); });
  }

  /* ---------- Календарь в стиле сайта (компьютер). На телефоне - родной календарь телефона ---------- */
  const dateInput = $('#f-date');
  if (dateInput && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const WD_FULL = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const wrap = document.createElement('div');
    wrap.className = 'cdate';
    dateInput.parentNode.insertBefore(wrap, dateInput);
    wrap.appendChild(dateInput);
    dateInput.type = 'hidden';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'input cdate__btn';
    btn.id = 'f-date-btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="cdate__val">Выберите дату</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
    wrap.appendChild(btn);
    const dLabel = $('label[for="f-date"]');
    if (dLabel) dLabel.htmlFor = btn.id;

    const pop = document.createElement('div');
    pop.className = 'cdate__pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Выбор даты события');
    pop.innerHTML = `
      <div class="cdate__head">
        <button type="button" class="cdate__nav" data-step="-1" aria-label="Предыдущий месяц"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
        <span class="cdate__title" aria-live="polite"></span>
        <button type="button" class="cdate__nav" data-step="1" aria-label="Следующий месяц"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
      </div>
      <div class="cdate__wd">${WD.map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="cdate__grid" role="grid"></div>
      <div class="cdate__foot"><button type="button" class="cdate__link" data-act="clear">Очистить</button><button type="button" class="cdate__link" data-act="today">Сегодня</button></div>`;
    wrap.appendChild(pop);
    const grid = $('.cdate__grid', pop);
    const title = $('.cdate__title', pop);
    let view = new Date(today.getFullYear(), today.getMonth(), 1);
    let focusDay = new Date(today);

    const showValue = () => {
      const d = parse(dateInput.value);
      $('.cdate__val', btn).textContent = d ? `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}, ${WD_FULL[d.getDay()]}` : 'Выберите дату';
      btn.classList.toggle('is-empty', !d);
    };
    const render = () => {
      title.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
      const first = new Date(view.getFullYear(), view.getMonth(), 1);
      const shift = (first.getDay() + 6) % 7; // неделя с понедельника
      const start = new Date(first); start.setDate(1 - shift);
      const sel = parse(dateInput.value);
      let html = '';
      for (let i = 0; i < 42; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const other = d.getMonth() !== view.getMonth();
        const past = d < today;
        const cls = ['cdate__day'];
        if (other) cls.push('is-other');
        if (+d === +today) cls.push('is-today');
        if (sel && +d === +sel) cls.push('is-sel');
        if (+d === +focusDay) cls.push('is-focus');
        html += `<button type="button" class="${cls.join(' ')}" data-d="${iso(d)}" ${past ? 'disabled' : ''} tabindex="${+d === +focusDay ? 0 : -1}" aria-label="${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}"${sel && +d === +sel ? ' aria-pressed="true"' : ''}>${d.getDate()}</button>`;
      }
      grid.innerHTML = html;
      // нельзя уйти в прошлые месяцы
      $('[data-step="-1"]', pop).disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    };
    const open = () => {
      const sel = parse(dateInput.value);
      focusDay = sel || new Date(today);
      view = new Date(focusDay.getFullYear(), focusDay.getMonth(), 1);
      render();
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      setTimeout(() => $('.cdate__day.is-focus', grid)?.focus({ preventScroll: true }), 30);
    };
    const close = (back) => {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (back) btn.focus({ preventScroll: true });
    };
    const choose = (s) => {
      dateInput.value = s;
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      showValue();
      close(true);
    };
    btn.addEventListener('click', () => (wrap.classList.contains('is-open') ? close(true) : open()));
    pop.addEventListener('click', (e) => {
      const day = e.target.closest('.cdate__day');
      if (day && !day.disabled) { choose(day.dataset.d); return; }
      const nav = e.target.closest('.cdate__nav');
      if (nav && !nav.disabled) { view.setMonth(view.getMonth() + Number(nav.dataset.step)); render(); return; }
      const act = e.target.closest('[data-act]');
      if (act && act.dataset.act === 'today') choose(iso(today));
      if (act && act.dataset.act === 'clear') { dateInput.value = ''; showValue(); close(true); }
    });
    grid.addEventListener('keydown', (e) => {
      const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (moves[e.key] !== undefined) {
        e.preventDefault();
        const n = new Date(focusDay); n.setDate(n.getDate() + moves[e.key]);
        if (n < today) return;
        focusDay = n;
        if (n.getMonth() !== view.getMonth() || n.getFullYear() !== view.getFullYear()) view = new Date(n.getFullYear(), n.getMonth(), 1);
        render();
        $('.cdate__day.is-focus', grid)?.focus({ preventScroll: true });
      }
    });
    pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.cdate')) close(false); });
    $('#again')?.addEventListener('click', () => setTimeout(showValue, 0));
    showValue();
  }

  /* ---------- Красивые выпадающие списки в форме ----------
     На компьютере стандартный список Windows заменяется своим (шрифт и стиль сайта).
     Настоящий <select> остается в форме (он отправляет значение) - просто спрятан.
     На телефоне остается родной список телефона: он удобнее пальцем. */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let openList = null;
    const closeOpen = () => { if (openList) openList.close(); };
    $$('select.select').forEach((sel) => {
      const wrap = document.createElement('div');
      wrap.className = 'cselect';
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel);
      sel.classList.add('cselect__native');
      sel.tabIndex = -1;
      sel.setAttribute('aria-hidden', 'true');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'input select cselect__btn';
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-expanded', 'false');
      const label = $(`label[for="${sel.id}"]`);
      if (label) { label.id = label.id || sel.id + '-label'; btn.setAttribute('aria-labelledby', label.id + ' ' + sel.id + '-btn'); }
      btn.id = sel.id + '-btn';
      if (label) label.htmlFor = btn.id;
      wrap.appendChild(btn);

      const list = document.createElement('ul');
      list.className = 'cselect__list';
      list.setAttribute('role', 'listbox');
      list.tabIndex = -1;
      wrap.appendChild(list);

      let active = 0;
      const items = () => $$('.cselect__opt', list);
      const build = () => {
        list.innerHTML = '';
        Array.from(sel.options).forEach((o, i) => {
          const li = document.createElement('li');
          li.className = 'cselect__opt';
          li.setAttribute('role', 'option');
          li.id = `${sel.id}-opt-${i}`;
          li.dataset.value = o.value;
          li.innerHTML = '<span></span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
          li.firstChild.textContent = o.text;
          li.addEventListener('click', () => choose(i));
          li.addEventListener('mousemove', () => setActive(i));
          list.appendChild(li);
        });
      };
      const sync = () => {
        btn.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
        items().forEach((li, i) => li.setAttribute('aria-selected', String(i === sel.selectedIndex)));
      };
      const setActive = (i) => {
        const its = items();
        active = Math.max(0, Math.min(its.length - 1, i));
        its.forEach((li, k) => li.classList.toggle('is-active', k === active));
        list.setAttribute('aria-activedescendant', its[active].id);
        its[active].scrollIntoView({ block: 'nearest' });
      };
      const open = () => {
        closeOpen();
        if (items().length !== sel.options.length) build();
        sync();
        wrap.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        setActive(sel.selectedIndex);
        list.focus({ preventScroll: true });
        openList = api;
      };
      const close = (focusBtn) => {
        wrap.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        if (openList === api) openList = null;
        if (focusBtn) btn.focus({ preventScroll: true });
      };
      const choose = (i) => {
        if (sel.selectedIndex !== i) {
          sel.selectedIndex = i;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        sync();
        close(true);
      };
      const api = { close: () => close(false) };

      btn.addEventListener('click', () => (wrap.classList.contains('is-open') ? close(true) : open()));
      btn.addEventListener('keydown', (e) => {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
      });
      list.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
        else if (e.key === 'End') { e.preventDefault(); setActive(items().length - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
        else if (e.key === 'Escape' || e.key === 'Tab') { close(e.key === 'Escape'); }
      });
      sel.addEventListener('change', sync);
      sel.addEventListener('fb:sync', sync);
      build();
      sync();
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.cselect')) closeOpen(); });
  }

  /* ---------- Появление блоков при прокрутке ---------- */
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }
})();
