// functions/api/[[path]].js
//
// Cloudflare Pages Function — proxy transparente de /api/* para o backend
// no Railway.
//
// PORQUÊ ISTO EXISTE:
// O frontend (bazares.pages.dev) e o backend (railway.app) são domínios
// diferentes. O cookie httpOnly do refresh token tem de ser SameSite=None
// para funcionar entre domínios diferentes — mas o Safari (e por extensão
// TODOS os browsers em iOS, já que usam WebKit por baixo, incluindo Chrome
// iOS) bloqueia por defeito cookies "third-party"/cross-site (Intelligent
// Tracking Prevention). Resultado: o login parecia funcionar (o token de
// acesso vinha na resposta), mas o cookie de sessão nunca ficava guardado
// no iPhone/iPad, e a sessão morria a cada refresh de página.
//
// Ao fazer o browser falar sempre com o MESMO domínio (bazares.pages.dev),
// e este função servidor-a-servidor é que fala com o Railway, o cookie
// passa a ser tratado como first-party — resolve o problema no iOS sem
// mexer em nada no backend.
const BACKEND_ORIGIN = 'https://bazare-s-production.up.railway.app';

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  const segments = params.path;
  const path = Array.isArray(segments) ? segments.join('/') : (segments || '');
  const targetUrl = `${BACKEND_ORIGIN}/api/${path}${url.search}`;

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete('host');

  const init = {
    method: request.method,
    headers: forwardHeaders
  };
  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = request.body;
  }

  const backendResponse = await fetch(targetUrl, init);

  // Reconstrói os headers da resposta, tratando Set-Cookie à parte: um
  // Headers normal junta vários Set-Cookie numa só string separada por
  // vírgulas, o que corrompe o cookie (a data de expiração já tem vírgulas).
  // getSetCookie() devolve cada cookie em separado, tal como veio do Railway.
  const responseHeaders = new Headers();
  for (const [key, value] of backendResponse.headers) {
    const k = key.toLowerCase();
    if (k === 'set-cookie' || k === 'content-encoding' || k === 'content-length') continue;
    responseHeaders.set(key, value);
  }
  const cookies = typeof backendResponse.headers.getSetCookie === 'function'
    ? backendResponse.headers.getSetCookie()
    : (backendResponse.headers.get('set-cookie') ? [backendResponse.headers.get('set-cookie')] : []);
  cookies.forEach((c) => responseHeaders.append('Set-Cookie', c));

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders
  });
}
