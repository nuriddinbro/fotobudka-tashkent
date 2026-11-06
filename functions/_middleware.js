/**
 * Перенаправляет старый адрес (fotobudka-tashkent.pages.dev) и www.fotobudki.uz
 * на главный адрес https://fotobudki.uz - чтобы в Google был один сайт, а не три.
 *
 * Заявки (/api/...) не перенаправляем: если у посетителя открыта старая страница,
 * его заявка все равно должна дойти.
 */
const MAIN_HOST = 'fotobudki.uz';
const OLD_HOSTS = ['fotobudka-tashkent.pages.dev', 'www.fotobudki.uz'];

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
