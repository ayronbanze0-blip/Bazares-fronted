/* ============================================================
   BAZARES — Configuração da ligação ao backend
   ============================================================
   BAZARES_API_BASE fica vazio em produção: os pedidos /api/* são feitos
   ao PRÓPRIO domínio (bazares.pages.dev) e passam por
   functions/api/[[path]].js, que os reencaminha para o Railway. Isto é
   necessário para o iOS Safari aceitar o cookie de sessão (ver comentário
   nesse ficheiro). O chat (Socket.IO) continua a ligar directamente ao
   Railway, já que usa o token de acesso e não depende do cookie.
============================================================ */
window.BAZARES_API_BASE = '';
window.BAZARES_SOCKET_BASE = 'https://bazare-s-production.up.railway.app';
