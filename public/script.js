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
  };

  /* ---------- Помощники ---------- */
  const formatNumber = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const priceFor = (h) => PRICE_BASE + PRICE_PER_HOUR * h;
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
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !e.target.closest('#nav, #burger')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); burger.focus(); }
  });

  /* ---------- Будка: "Сделать снимок" ---------- */
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
    let n = 3;
    showCount(n);
    const timer = setInterval(() => {
      n -= 1;
      if (n > 0) { showCount(n); return; }
      clearInterval(timer);
      countEl.hidden = true;
      hintEl.hidden = false;
      flash.hidden = false;
      setTimeout(() => {
        flash.hidden = true;
        shot += 1;
        const set = STRIP_SETS[shot % STRIP_SETS.length];
        stripPictures.forEach((p, i) => setGalleryPicture(p, set[i]));
        printStrip();
        shootStatus.textContent = 'Снимок готов, фотополоска печатается';
        busy = false;
        shootBtn.removeAttribute('aria-disabled');
        shootLabel.textContent = 'Сделать снимок';
      }, reduceMotion.matches ? 600 : 450);
    }, 800);
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
  brandNameInput.addEventListener('input', (e) => {
    state.brandName = e.target.value.trim();
    mbName.textContent = state.brandName || 'ВАШ БРЕНД';
    updateSummary();
  });
  brandTagInput.addEventListener('input', (e) => {
    state.brandTag = e.target.value.trim();
    mbTag.textContent = state.brandTag || '#вашхэштег';
    updateSummary();
  });

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

  function setTheme(id) {
    const t = FRAME_THEMES.find((x) => x.id === id) || FRAME_THEMES[0];
    photoStrip.style.setProperty('--fbg', t.bg);
    photoStrip.style.setProperty('--ffg', t.fg);
    photoStrip.style.setProperty('--facc', t.accent);
    psTitle.textContent = t.title;
    framePictures.forEach((p, i) => setGalleryPicture(p, t.photos[i]));
    $$('.chip', chips).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.id === t.id)));
  }
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

  /* ---------- Калькулятор ---------- */
  const hoursInput = $('#hours');
  const hoursLabel = $('#hours-label');
  const priceText = $('#price-text');
  const hoursShort = $('#hours-short');
  const summary = $('#summary');
  const sumTime = $('#sum-time');
  const sumBrand = $('#sum-brand');
  const sumBrandText = $('#sum-brand-text');

  function setHours(h) {
    state.hours = h;
    const word = `${h} ${hoursWord(h)}`;
    hoursLabel.textContent = `${word} аренды`;
    priceText.textContent = formatNumber(priceFor(h));
    hoursShort.textContent = word;
    hoursInput.setAttribute('aria-valuetext', `${word}, ${formatNumber(priceFor(h))} сум`);
    updateSummary();
  }
  function brandSummary() {
    const parts = [];
    if (state.brandName) parts.push(state.brandName);
    if (state.brandTag) parts.push(state.brandTag);
    if (state.brandColorPicked) parts.push(`цвет ${state.brandColor.toUpperCase()}`);
    return parts.join(' / ');
  }
  function updateSummary() {
    sumTime.textContent = `${state.hours} ${hoursWord(state.hours)} - ${formatNumber(priceFor(state.hours))} сум`;
    const b = brandSummary();
    sumBrand.hidden = !b;
    sumBrandText.textContent = b;
  }
  hoursInput.addEventListener('input', () => setHours(Number(hoursInput.value)));
  $('#book-hours').addEventListener('click', () => {
    summary.classList.remove('is-updated');
    void summary.offsetWidth;
    summary.classList.add('is-updated');
    setTimeout(() => $('#f-name').focus({ preventScroll: true }), reduceMotion.matches ? 0 : 700);
  });
  setHours(Number(hoursInput.value) || 4);
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
      event: fEvent.value,
      hours: state.hours,
      price: priceFor(state.hours),
      brand: state.brandName,
      tag: state.brandTag,
      color: state.brandColorPicked ? state.brandColor : '',
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
    success.hidden = true;
    form.hidden = false;
    fName.focus();
  });

  /* ---------- Появление блоков при прокрутке ---------- */
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
