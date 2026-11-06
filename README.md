# Fotobudka Tashkent - сайт аренды фотобудки в Ташкенте

(Рабочее название; как поменять - раздел «Название» ниже.)

Обычный статический сайт (HTML + CSS + JavaScript) на Cloudflare Pages.
Заявки с сайта приходят в Telegram через функцию `functions/api/lead.js`.

## Что где лежит

| Папка / файл | Что это |
|---|---|
| `public/index.html` | Все тексты страницы |
| `public/styles.css` | Внешний вид (цвета - в самом начале файла) |
| `public/script.js` | Интерактив. **В начале файла - все настройки**: название, Instagram, цены, бренды, цвета, темы рамок |
| `public/img/` | Сжатые фото (делаются автоматически, руками не править) |
| `originals/` | Исходные фото в хорошем качестве |
| `functions/api/lead.js` | Отправка заявок в Telegram |
| `tools/build_images.py` | Сжимает фото из `originals/` в `public/img/` |
| `tools/dev_server.py` | Простой просмотр сайта на своем компьютере |

После любой правки: сохраните файл, отправьте изменения в GitHub (через GitHub Desktop: **Commit** → **Push**) - Cloudflare сам обновит сайт за 1-2 минуты.

## Как поменять...

### Тексты
Откройте `public/index.html` (удобно в VS Code), найдите нужную фразу через **Ctrl+F** и замените. Теги вокруг текста (`<p>`, `<span>` и т.п.) не трогайте.

### Цены
`public/script.js`, в начале файла:
```js
const PRICE_BASE = 400000;      // базовая сумма
const PRICE_PER_HOUR = 600000;  // за каждый час
```
Также поправьте в `public/index.html` фразу «Каждый следующий час +600 000 сум» и стартовые числа «2 800 000» (то, что видно до загрузки скрипта).

### Ссылку на Instagram
`public/script.js`, строка `const INSTAGRAM_URL = 'https://www.instagram.com/fotobudka_tashkent';`.

### Название PIXO
1. `public/script.js` → `const BRAND_NAME = 'Fotobudka Tashkent';` (логотип, фотополоска, подвал).
2. `public/index.html` → блок в самом верху (`<title>`, описания для соцсетей, schema.org) - замените PIXO через **Ctrl+H**.
3. `functions/api/lead.js` → `const SITE_NAME = 'Fotobudka Tashkent';` (заголовок сообщения в Telegram).
4. Картинка для соцсетей: в `tools/build_images.py` строка `BRAND = "Fotobudka Tashkent"`, затем запустите скрипт (см. «Фото»).

### Бренды и логотипы
`public/script.js`, список `BRANDS`. Чтобы вместо названия показать логотип:
1. Положите файл (лучше SVG или PNG с прозрачным фоном) в `public/img/brands/`, например `kfc.svg`.
2. В нужной строке впишите `logo: 'img/brands/kfc.svg'`.

Бегущая строка с брендами - в `public/index.html` (ищите `marquee__list`, там два одинаковых списка - меняйте оба).

### Фото
1. Положите новое фото в `originals/gallery/` (для галереи) или `originals/strip/` (маленькие кадры).
2. Запустите (нужен Python и `pip install pillow`):
   ```bash
   python tools/build_images.py
   ```
3. Для галереи: в `public/index.html` скопируйте один блок `<li class="card">…</li>` и поменяйте в нем имя файла (везде), подпись и описание `alt`.

## Проверка на своем компьютере

Быстрый просмотр (без Node.js), заявки печатаются в окне:
```bash
python tools/dev_server.py
```
Откройте http://localhost:8788

Полная проверка вместе с настоящей функцией (нужен Node.js):
```bash
npx wrangler pages dev public
```
Если переменных Telegram нет - функция работает в тестовом режиме (пишет заявку в лог). Чтобы проверить с настоящим ботом, скопируйте `.dev.vars.example` в `.dev.vars` и впишите токен и chat_id (файл не попадает в GitHub).

## Настройки Cloudflare Pages
- Framework preset: **None**
- Build command: *(пусто)*
- Build output directory: **public**
- Переменные (Settings → Variables and Secrets, тип **Secret**): `TELEGRAM_BOT_TOKEN` (токен вида `123456789:AAH...`), `TELEGRAM_CHAT_ID` (один или несколько ID через запятую, например `123456789, 987654321` - заявка придет каждому; каждый получатель должен один раз нажать Start у бота). После добавления - **Deployments → Retry deployment**.

Важно: на настоящем сайте без этих переменных форма покажет «Не удалось отправить. Напишите нам в Telegram» - заявки молча не теряются.

## Свой домен (например pixo.uz)
1. Купите домен у любого регистратора (для .uz - например, через uz-регистраторов).
2. Cloudflare → ваш проект Pages → **Custom domains** → **Set up a custom domain** → введите `pixo.uz`.
3. Cloudflare покажет, какие DNS-записи добавить (или предложит перенести домен в Cloudflare - так проще). Добавьте их у регистратора и подождите от 10 минут до суток.
4. После подключения замените адрес `https://fotobudka-tashkent.pages.dev` на `https://pixo.uz` в `public/index.html` (верхний блок), `public/robots.txt` и `public/sitemap.xml`.
