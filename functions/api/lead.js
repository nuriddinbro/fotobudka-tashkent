/**
 * POST /api/lead - принимает заявку с сайта и пересылает ее в Telegram.
 *
 * Нужные переменные окружения (Cloudflare Pages -> Settings -> Variables and Secrets):
 *   TELEGRAM_BOT_TOKEN - токен бота от @BotFather (тип Secret)
 *   TELEGRAM_CHAT_ID   - id группы или чата, куда слать заявки (тип Secret)
 *
 * Тестовый режим: если переменных нет и сайт открыт локально (localhost),
 * заявка просто пишется в лог, а сайт получает "успех".
 * На настоящем сайте без переменных функция вернет ошибку - чтобы заявки
 * не терялись молча, а посетитель увидел кнопку "Написать в Telegram".
 */

const SITE_NAME = 'Fotobudka Tashkent';

const EVENTS = ['Свадьба', 'День рождения', 'Корпоратив', 'Выпускной', 'Промо-мероприятие', 'Другое'];
const MIN_FILL_MS = 3000;       // форма должна заполняться дольше 3 секунд
const MAX_BODY_BYTES = 8 * 1024;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/* Убирает управляющие символы, лишние пробелы и обрезает длину */
function clean(value, max) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/* Экранирование для parse_mode=HTML в Telegram */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatNumber = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function hoursWord(n) {
  const a = n % 100, b = n % 10;
  if (a >= 11 && a <= 14) return 'часов';
  if (b === 1) return 'час';
  if (b >= 2 && b <= 4) return 'часа';
  return 'часов';
}

function isLocal(url) {
  const h = new URL(url).hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
}

export async function onRequestPost({ request, env }) {
  // Принимаем заявки только со своего сайта
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return json({ ok: false, error: 'Запрос с чужого сайта' }, 403);
    } catch {
      return json({ ok: false, error: 'Неверный запрос' }, 400);
    }
  }

  // Читаем и проверяем тело запроса
  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ ok: false, error: 'Слишком большая заявка' }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'Неверный формат заявки' }, 400);
  }
  if (!body || typeof body !== 'object') return json({ ok: false, error: 'Неверный формат заявки' }, 400);

  // Защита от спама: скрытое поле-ловушка и слишком быстрое заполнение.
  // Ботам отвечаем "успех", чтобы они не пробовали снова, но ничего не отправляем.
  if (clean(body.website, 200)) return json({ ok: true });
  // elapsedMs - сколько миллисекунд прошло с открытия страницы (считает браузер,
  // поэтому неверные часы на телефоне посетителя не мешают)
  const elapsed = Number(body.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) return json({ ok: true });

  // Обязательные поля
  const name = clean(body.name, 60);
  const phoneDigits = clean(body.phone, 40).replace(/\D/g, '');
  if (!name) return json({ ok: false, error: 'Укажите имя' }, 400);
  if (!/^998\d{9}$/.test(phoneDigits)) return json({ ok: false, error: 'Укажите телефон в формате +998 XX XXX XX XX' }, 400);
  const d = phoneDigits;
  const phone = `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;

  // Необязательные поля
  let date = clean(body.date, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  date = m ? `${m[3]}.${m[2]}.${m[1]}` : '';
  const event = EVENTS.includes(body.event) ? body.event : 'Другое';
  const hours = Math.round(Number(body.hours));
  const price = Math.round(Number(body.price));
  const timeText = hours >= 1 && hours <= 24 && price > 0 && price < 1e10
    ? `${hours} ${hoursWord(hours)} - ${formatNumber(price)} сум`
    : 'не выбрано';
  const brand = clean(body.brand, 40);
  const tag = clean(body.tag, 40);
  const color = /^#[0-9a-f]{6}$/i.test(String(body.color || '')) ? String(body.color).toUpperCase() : '';
  let page = clean(body.page, 300);
  if (!/^https?:\/\//i.test(page)) page = '';

  const lines = [
    `📸 <b>Новая заявка с сайта ${esc(SITE_NAME)}</b>`,
    `Имя: ${esc(name)}`,
    `Телефон: ${esc(phone)}`,
    `Дата: ${date ? esc(date) : 'не указана'}`,
    `Событие: ${esc(event)}`,
    `Время: ${esc(timeText)}`,
  ];
  if (brand || color) lines.push(`Бренд: ${esc(brand || '-')}${color ? ` / цвет ${esc(color)}` : ''}`);
  if (tag) lines.push(`Хэштег: ${esc(tag)}`);
  if (page) lines.push(`Страница: ${esc(page)}`);
  const text = lines.join('\n');

  const token = String(env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(env.TELEGRAM_CHAT_ID || '').trim();

  if (!token || !chatId) {
    if (isLocal(request.url)) {
      console.log('[ТЕСТОВЫЙ РЕЖИМ] Заявка (в Telegram не отправлена):\n' + text);
      return json({ ok: true, test: true });
    }
    // Называем только ИМЕНА пустых переменных (значения никогда не показываем)
    const missing = [!token && 'TELEGRAM_BOT_TOKEN', !chatId && 'TELEGRAM_CHAT_ID'].filter(Boolean);
    console.error('Не заданы переменные:', missing.join(', '));
    return json({ ok: false, error: 'Отправка временно не настроена', missing }, 500);
  }

  try {
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const data = await tg.json().catch(() => ({}));
    if (!tg.ok || !data.ok) {
      // Описание ошибки от Telegram (например "chat not found") - без токена, его можно показывать
      const detail = clean(data.description || `HTTP ${tg.status}`, 200);
      console.error('Telegram ответил ошибкой:', tg.status, detail);
      return json({ ok: false, error: 'Не удалось отправить в Telegram', detail }, 502);
    }
  } catch (err) {
    console.error('Нет связи с Telegram:', String(err));
    return json({ ok: false, error: 'Не удалось отправить в Telegram' }, 502);
  }

  return json({ ok: true });
}

/* Любой другой метод (GET и т.д.) - отказ */
export function onRequest() {
  return json({ ok: false, error: 'Используйте POST' }, 405);
}
