/* =========================================================
   Fotobudka Tashkent - "дорогие" эффекты
   Плавная прокрутка (Lenis) и анимации при прокрутке (GSAP + ScrollTrigger). Приемы - как в открытых
   примерах GSAP и Codrops: фото-сетка с наездом, раскрытие фото шторкой, галерея с наклоном от скорости.
   Если библиотеки не загрузились - сайт работает как обычно (script.js), просто без этих эффектов.
   ========================================================= */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------
   2. Плавная прокрутка и анимации при прокрутке
   --------------------------------------------------------- */
function splitWords(el) {
  // Оборачивает каждое слово в <span class="sw"><span>слово</span></span>, не трогая <br> и выделения
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const outer = document.createElement('span');
          outer.className = 'sw';
          const inner = document.createElement('span');
          inner.textContent = p;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('sw')) {
        walk(n);
      }
    });
  };
  walk(el);
  return el.querySelectorAll('.sw > span');
}

function initScrollFx() {
  const { gsap, ScrollTrigger, Lenis } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (reduceMotion) return; // кто отключил анимации в системе - видит обычный сайт
  document.documentElement.classList.add('has-gsap');

  /* ---------- 1. Плавная прокрутка: вниз и вверх с мягким "докатом" ---------- */
  let lenis = null;
  if (Lenis) {
    lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 1, smoothWheel: true }) // мягко, но без "вязкости";
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    // ссылки-якоря (#book и т.д.) - тоже плавно, с учетом шапки
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id.length > 1 && document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -70, duration: 1.4 });
      history.replaceState(null, '', id);
    });
    window.FB_LENIS = lenis;
  }

  /* ---------- 3. Заголовки секций выезжают по словам ---------- */
  document.querySelectorAll('.h2, .book__title').forEach((h) => {
    const words = splitWords(h);
    gsap.from(words, {
      yPercent: 115, rotate: 4, duration: 1.1, ease: 'power4.out', stagger: 0.06,
      scrollTrigger: { trigger: h, start: 'top 88%' },
    });
  });

  /* ---------- 4. Раскрытие фото шторкой ---------- */
  const reveal = (el, st) => {
    const img = el.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: st });
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut' });
    if (img) tl.fromTo(img, { scale: 1.4 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0);
  };
  document.querySelectorAll('[data-reveal]').forEach((el) => reveal(el, { trigger: el, start: 'top 85%' }));

  // Карточки "входит в стоимость", шаги, бренды - по очереди
  [['.included__grid', '.inc'], ['.steps', '.step'], ['#brands-list', '.brand']].forEach(([wrap, item]) => {
    const w = document.querySelector(wrap);
    if (!w) return;
    gsap.from(w.querySelectorAll(item), {
      y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: w, start: 'top 85%' },
    });
  });



  /* ---------- Текст "Что мы делаем" закрашивается по словам при прокрутке ---------- */
  const stText = document.getElementById('statement-text');
  if (stText) {
    const words = stText.textContent.trim().split(/\s+/);
    stText.innerHTML = words.map((w) => `<span class="fw">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
    gsap.fromTo(stText.querySelectorAll('.fw'), { opacity: 0.13 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: stText, start: 'top 82%', end: 'bottom 48%', scrub: true },
    });
  }

  /* ---------- Фото "проявляются" из пикселей ----------
     Прием из открытого демо Codrops "Image Pixel Loading" (github.com/codrops/ImagePixelLoading, лицензия MIT):
     картинка рисуется на холсте сначала крупными пикселями, затем все мельче, потом показывается само фото.
     Работает и в вертикальной прокрутке, и в галерее, которая листается вбок. */
  const PX_STEPS = [1, 2, 4, 9]; // размер "пикселя": 1% -> 2% -> 4% -> 9% от исходного, потом четкое фото
  const pixelLoad = (img) => {
    const box = img.closest('.card__btn, .egrid__item'); // рамка фото (у галереи img лежит внутри <picture>)
    if (!box || box.dataset.px) return;
    box.dataset.px = '1';
    box.classList.add('px-wrap');
    const canvas = document.createElement('canvas');
    canvas.className = 'px-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    box.appendChild(canvas);
    img.classList.add('px-hidden');
    const ctx = canvas.getContext('2d');
    const draw = (src, pct) => {
      const w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      canvas.width = w; canvas.height = h;
      // обрезка "по центру", как object-fit: cover
      const ir = src.naturalWidth / src.naturalHeight, br = w / h;
      let sw = src.naturalWidth, sh = src.naturalHeight, sx = 0, sy = 0;
      if (ir > br) { sw = sh * br; sx = (src.naturalWidth - sw) / 2; } else { sh = sw / br; sy = (src.naturalHeight - sh) / 2; }
      const s = pct * 0.01;
      const tw = Math.max(1, Math.round(w * s)), th = Math.max(1, Math.round(h * s));
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, tw, th);   // уменьшенная копия
      ctx.drawImage(canvas, 0, 0, tw, th, 0, 0, w, h);    // растягиваем - получаются крупные пиксели
    };
    const run = () => {
      const src = new Image();
      src.src = img.currentSrc || img.src;
      const go = () => {
        let i = 0;
        const step = () => {
          if (i < PX_STEPS.length) {
            draw(src, PX_STEPS[i]);
            i += 1;
            setTimeout(step, i === 1 ? 300 : 90); // первый шаг держим дольше
          } else {
            img.classList.remove('px-hidden');
            canvas.remove();
          }
        };
        step();
      };
      if (src.complete && src.naturalWidth) go(); else { src.onload = go; src.onerror = () => { img.classList.remove('px-hidden'); canvas.remove(); }; }
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { io.disconnect(); run(); } });
    }, { threshold: 0.25 });
    io.observe(box);
  };
  document.querySelectorAll('.egrid__item img, #gallery-track .card__btn img').forEach(pixelLoad);

  // Притягивающиеся кнопки (магнит)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.btn--gold, .btn--light, .btn--ghost').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
      });
      btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' }));
    });
  }

  // Закрепленные блоки считаются сверху вниз; все пересчитывается после загрузки шрифтов и картинок
  const refreshAll = () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); };
  refreshAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshAll);
  if (document.readyState === 'complete') refreshAll(); else window.addEventListener('load', refreshAll);
  // и еще раз чуть позже - когда все точно встало на места (картинки, шрифты, анимации первого экрана)
  setTimeout(refreshAll, 1500);
  setTimeout(refreshAll, 4000);
  // если высота страницы поменялась (догрузились фото, шрифты, сработал скрипт) - пересчитать точки анимаций
  if ('ResizeObserver' in window) {
    let rt = null, lastH = document.body.scrollHeight;
    new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h; clearTimeout(rt); rt = setTimeout(refreshAll, 200);
    }).observe(document.body);
  }
}

/* Запуск: GSAP и Lenis (обычные скрипты с defer) к этому моменту уже загружены */
try { initScrollFx(); } catch (e) { console.warn('Анимации прокрутки отключены:', e); document.documentElement.classList.remove('has-gsap'); }