/**
 * Перенаправляет все запасные адреса на главный https://fotobudkatashkent.uz
 * (та же страница, код 301 - Google и Яндекс переносят поиск на главный адрес).
 *
 * Заявки (/api/...) не перенаправляем: если у посетителя открыта старая страница,
 * его заявка все равно должна дойти.
 */
const MAIN_HOST = 'fotobudkatashkent.uz';
const OLD_HOSTS = [
  'www.fotobudkatashkent.uz',
  'fotobudki.uz',
  'www.fotobudki.uz',
  'fotobudka-tashkent.pages.dev',
];

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (OLD_HOSTS.includes(url.hostname) && !url.pathname.startsWith('/api/')) {
    url.protocol = 'https:';
    url.hostname = MAIN_HOST;
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
