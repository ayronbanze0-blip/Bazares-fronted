/* ============================================================
   BAZARES — Auth, Session, Shared Utilities (vanilla JS)
============================================================ */
'use strict';

// ─── SESSION ────────────────────────────────────────────────────
const Session = {
  _user: null,

  get user() { return this._user; },

  async bootstrap() {
    try {
      const res = await api.post('/auth/refresh');
      if (res?.data?.accessToken) {
        setAccessToken(res.data.accessToken);
        const me = await api.get('/auth/me');
        this._user = me?.data?.user || null;
      }
    } catch { this._user = null; }
    return this._user;
  },

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res?.data?.accessToken) setAccessToken(res.data.accessToken);
    const me = await api.get('/auth/me');
    this._user = me?.data?.user || null;
    return this._user;
  },

  async logout() {
    try { await api.post('/auth/logout'); } catch {}
    setAccessToken(null);
    this._user = null;
  },

  isLoggedIn() { return !!this._user; },
  isRole(...roles) { return roles.includes(this._user?.role); }
};

// Force logout on 401
document.addEventListener('bazares:unauthorized', () => {
  Session._user = null;
  setAccessToken(null);
  const cur = location.href;
  if (!cur.includes('login.html') && !cur.includes('register.html')) {
    go('login.html');
  }
});

// ─── NAVIGATION ─────────────────────────────────────────────────
function go(page, params = {}) {
  const qs = Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';
  window.location.href = page + qs;
}

function goBack() { history.back(); }

function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}

// ─── FORMAT HELPERS ─────────────────────────────────────────────
const CATS = [
  { ico: '📱', l: 'Telemóveis e Acessórios' }, { ico: '💻', l: 'Electrónicos' },
  { ico: '👗', l: 'Moda' }, { ico: '👟', l: 'Calçados' },
  { ico: '🏠', l: 'Casa e Jardim' }, { ico: '🛋', l: 'Móveis' },
  { ico: '🏪', l: 'Electrodomésticos' }, { ico: '🚗', l: 'Automóveis' },
  { ico: '🏍', l: 'Motociclos' }, { ico: '🛠', l: 'Serviços' },
  { ico: '🏢', l: 'Imóveis' }, { ico: '🌾', l: 'Agricultura' },
  { ico: '💄', l: 'Saúde e Beleza' }, { ico: '⚽', l: 'Desporto' }, { ico: '📦', l: 'Outros' }
];

const ROLE_LABEL = { ADMIN: 'Administrador', SELLER: 'Vendedor', BUYER: 'Comprador', REVENDEDOR: 'Revendedor' };

const STATUS_LABEL = {
  PENDENTE: 'Pendente', ACEITE: 'Aceite', EM_PREPARACAO: 'Em Preparação',
  EM_ENTREGA: 'Em Entrega', ENTREGUE: 'Entregue', CANCELADA: 'Cancelada'
};
const STATUS_BADGE_CLASS = {
  PENDENTE: 'b-amb', ACEITE: 'b-blu', EM_PREPARACAO: 'b-blu',
  EM_ENTREGA: 'b-navy', ENTREGUE: 'b-grn', CANCELADA: 'b-red'
};

function fmtMT(n) { return Number(n || 0).toLocaleString('pt-MZ') + ' MT'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
function fmtTime(d) { return d ? new Date(d).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }) : ''; }
function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function stBadge(status) {
  const cls = STATUS_BADGE_CLASS[status] || 'b-gray';
  const lbl = STATUS_LABEL[status] || status;
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function stars(rating, max = 5) {
  let s = '';
  for (let i = 1; i <= max; i++)
    s += `<span style="color:${i <= Math.round(rating || 0) ? '#D97706' : 'var(--brd2)'}">★</span>`;
  return `<span class="stars">${s}</span>`;
}

function avatar(name = '?', size = 38, photoUrl = null) {
  if (photoUrl) {
    return `<img src="${esc(photoUrl)}" alt="" class="avatar" style="width:${size}px;height:${size}px;object-fit:cover">`;
  }
  const AV_COLORS = ['#0B1F3A','#1A6B45','#B91C1C','#7C3AED','#B45309','#0369A1','#6B1A6B'];
  const ini = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const bg = AV_COLORS[(name || '').charCodeAt(0) % AV_COLORS.length];
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${bg};font-size:${Math.round(size * .38)}px">${ini}</div>`;
}

// Devolve a URL da foto de perfil do utilizador, ou null se não tiver
// (nesse caso quem chama cai no fallback avatar() com iniciais).
// NOTA: esta função estava a ser chamada em dashboard.html e profile.html
// mas nunca tinha sido definida em lado nenhum — isso causava um
// ReferenceError não apanhado ao montar o dashboard do vendedor, que
// interrompia o render depois dos dados já terem chegado da API,
// deixando o spinner preso no ecrã para sempre.
function userPhoto(user) {
  return user?.avatarUrl || null;
}

// ─── ICON SYSTEM (outline, stroke-based — substitui emojis na UI de navegação) ──
// Uso: icon('bell', 18) devolve um <svg> inline herdando currentColor.
const ICONS = {
  menu:        '<path d="M4 6h16M4 12h16M4 18h16"/>',
  bell:        '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  cart:        '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  user:        '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  moon:        '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  home:        '<path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/>',
  store:       '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/>',
  box:         '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  grid:        '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  chat:        '<path d="M21 11.5a8.4 8.4 0 0 1-1.1 4.2L21 20l-4.4-1.1a8.5 8.5 0 1 1 4.4-7.4Z"/>',
  wallet:      '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M16 14.5h2"/>',
  link:        '<path d="M9 13a4.5 4.5 0 0 0 6 0l3-3a4.5 4.5 0 1 0-6-6l-1 1"/><path d="M15 11a4.5 4.5 0 0 0-6 0l-3 3a4.5 4.5 0 1 0 6 6l1-1"/>',
  heart:       '<path d="M12 20.5s-7.5-4.6-10-9.3C0.3 7.8 1.8 4 5.6 3.4 8 3 10 4 12 6.5 14 4 16 3 18.4 3.4 22.2 4 23.7 7.8 22 11.2 19.5 15.9 12 20.5 12 20.5Z"/>',
  settings:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  support:     '<circle cx="12" cy="12" r="9"/><path d="M12 16v-1.5c0-1 .6-1.5 1.3-2 .8-.6 1.4-1.1 1.4-2.1A2.7 2.7 0 0 0 12 7.7a2.7 2.7 0 0 0-2.7 2.7"/><circle cx="12" cy="18.3" r="0.6" fill="currentColor" stroke="none"/>',
  logout:      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  pulse:       '<path d="M3 12h4l2 8 4-16 2 8h6"/>',
  flag:        '<path d="M5 21V4"/><path d="M5 4h14l-3 4 3 4H5"/>',
  megaphone:   '<path d="M3 11v2a2 2 0 0 0 2 2h1l3 5 1-5h2l8 4V6l-8 4H6a2 2 0 0 0-2 2v-1"/>',
  bars:        '<path d="M5 21V10"/><path d="M12 21V4"/><path d="M19 21v-7"/>',
  clipboard:   '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6"/><path d="M9 15h6"/>',
  envelope:    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  sparkle:     '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
};
function icon(name, size = 18, strokeWidth = 1.8) {
  const body = ICONS[name] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${body}</svg>`;
}

// ─── BOTTOM TAB NAVIGATION (mobile) ──────────────────────────────────
// Barra fixa inferior, no estilo de apps nativos. `active` é a chave da
// aba corrente (home|categorias|vender|chat|perfil); `role` decide para
// onde o botão central "Vender" leva, já que cada tipo de conta tem uma
// ação central diferente.
function _bnCenterTarget(role) {
  if (role === 'SELLER') return () => go('my-products.html', { action: 'new' });
  if (role === 'REVENDEDOR') return () => go('referrals.html');
  return () => go('my-bazar.html'); // BUYER/ADMIN: convida a começar a vender
}
function renderBottomNav(active = 'home', role = 'BUYER', unread = 0) {
  const item = (key, label, iconName, href) => `
    <button class="bn-item${active === key ? ' active' : ''}" onclick="go('${href}')" aria-label="${label}">
      ${key === 'chat' && unread ? `<span class="badge-dot">${unread}</span>` : ''}
      ${icon(iconName, 21)}<span>${label}</span>
    </button>`;
  return `
    <nav class="bottom-nav">
      ${item('home', 'Início', 'home', 'dashboard.html')}
      ${item('categorias', 'Categorias', 'grid', 'products.html')}
      <button class="bn-item bn-item-main" onclick="_bnGoCenter()" aria-label="Vender">
        <div class="bn-item-main-ico">+</div><span>Vender</span>
      </button>
      ${item('chat', 'Mensagens', 'chat', 'chat.html')}
      ${item('perfil', 'Perfil', 'user', 'profile.html')}
    </nav>`;
}
let _bnRole = 'BUYER';
function _bnGoCenter() { _bnCenterTarget(_bnRole)(); }
function mountBottomNav(active, role, unread = 0) {
  _bnRole = role;
  document.body.classList.add('has-bottom-nav');
  let root = document.getElementById('bottom-nav-root');
  if (!root) { root = document.createElement('div'); root.id = 'bottom-nav-root'; document.body.appendChild(root); }
  root.innerHTML = renderBottomNav(active, role, unread);
}

// ─── BRAND MARK (ponte + tenda de mercado — assinatura visual Bazares) ──────
function brandMark(size = 38) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 76 76" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0">
    <defs><linearGradient id="bzMarkGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2DA463"/><stop offset="1" stop-color="#0B4D24"/>
    </linearGradient></defs>
    <rect width="76" height="76" rx="18" fill="url(#bzMarkGrad)"/>
    <path d="M15 55 Q38 16 61 55" stroke="#FBBF24" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M27 55 L38 35 L49 55 Z" fill="#fff"/>
    <rect x="12" y="55" width="52" height="5.5" rx="2.75" fill="#FBBF24"/>
  </svg>`;
}

// ─── TOAST ──────────────────────────────────────────────────────
function toast(msg, type = 'ok', dur = 3800) {
  let root = document.getElementById('toast-root');
  if (!root) { root = document.createElement('div'); root.id = 'toast-root'; document.body.appendChild(root); }
  const icons = { ok: '✓', err: '✕', warn: '⚠', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast t-${type} toast-el`;
  el.innerHTML = `<span style="font-size:15px">${icons[type] || '✓'}</span><span>${msg}</span>`;
  const dismiss = () => {
    if (el._dismissed) return;
    el._dismissed = true;
    el.classList.add('leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  el.addEventListener('click', dismiss);
  root.appendChild(el);
  setTimeout(dismiss, dur);
}

// ─── MODAL ──────────────────────────────────────────────────────
function openModal(html, large = false) {
  let root = document.getElementById('modal-root');
  if (!root) { root = document.createElement('div'); root.id = 'modal-root'; document.body.appendChild(root); }
  root.innerHTML = `<div class="modal-bd" id="mbd"><div class="modal${large ? ' modal-lg' : ''}">${html}</div></div>`;
  document.getElementById('mbd').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
}
function closeModal() {
  const r = document.getElementById('modal-root');
  if (r) r.innerHTML = '';
}

// ─── LOADING ────────────────────────────────────────────────────
function setLoading(selector, loading) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return;
  if (loading) {
    el._orig = el.innerHTML;
    el.disabled = true;
    el.innerHTML = `<span class="spinner"></span>`;
  } else {
    el.disabled = false;
    if (el._orig !== undefined) { el.innerHTML = el._orig; delete el._orig; }
  }
}

// ─── TOPBAR builder ─────────────────────────────────────────────
function buildTopbar(activePage = '') {
  const user = Session.user;
  const cartCount = parseInt(sessionStorage.getItem('bz_cart_count') || '0');

  const topbar = document.getElementById('topbar');
  if (!topbar) return;

  topbar.innerHTML = `
    <button class="tb-btn tb-menu-btn" onclick="toggleSidebar()" aria-label="Menu">${icon('menu', 20)}</button>
    <button class="tb-logo" onclick="go('index.html')" aria-label="Bazares">
      ${brandMark(38)}
      <div class="tb-logo-text">
        <span class="tb-logo-name">BAZ<span>ARES</span></span>
        <span class="tb-logo-tagline">Marketplace Moçambicano</span>
      </div>
    </button>
    <div class="tb-search" id="tb-search-wrap">
      <span class="si"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></span>
      <input id="gsearch" placeholder="Pesquisar produtos, bazares..." autocomplete="off">
      <div id="search-dd"></div>
    </div>
    <div class="tb-actions">
      ${user ? `<button class="tb-btn" id="notif-btn" onclick="toggleNotifPanel()" title="Notificações">
        ${icon('bell', 19)}<span class="dot" id="notif-dot" style="display:none"></span>
      </button>` : ''}
      ${user && user.role === 'BUYER' ? `<button class="tb-btn" onclick="go('cart.html')" title="Carrinho" style="position:relative">
        ${icon('cart', 19)}${cartCount > 0 ? `<span style="position:absolute;top:2px;right:2px;background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:10px">${cartCount}</span>` : ''}
      </button>` : ''}
      ${user ? `<button class="tb-btn" onclick="go('profile.html')" title="Perfil">${avatar(user.name, 28)}</button>` : `
        <button class="btn btn-ghost btn-sm" style="color:#fff;border-color:rgba(255,255,255,.3)" onclick="go('login.html')">Entrar</button>
        <button class="btn btn-gold btn-sm" onclick="go('register.html')">Criar conta</button>
      `}
      <button class="tb-btn" onclick="toggleDark()" title="Modo escuro">${icon('moon', 18)}</button>
    </div>
  `;

  // Live search
  const si = document.getElementById('gsearch');
  const dd = document.getElementById('search-dd');
  if (si) {
    let st;
    si.addEventListener('input', () => {
      clearTimeout(st);
      const q = si.value.trim();
      if (q.length < 2) { dd.style.display = 'none'; return; }
      st = setTimeout(() => doGlobalSearch(q, dd), 350);
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#tb-search-wrap')) dd.style.display = 'none';
    });
  }

  // Notifications dot
  if (user) refreshNotifDot();
}

async function doGlobalSearch(q, dd) {
  try {
    // Usa o endpoint dedicado de pesquisa com sugestões rápidas
    const res = await api.get('/search/suggestions', { q });
    const suggestions = res?.data?.suggestions || [];
    if (!suggestions.length) {
      dd.innerHTML = `<div style="padding:12px;color:var(--t4);font-size:13px">Sem resultados para "${esc(q)}" — <a href="products.html?q=${encodeURIComponent(q)}" style="color:var(--b-500);font-weight:600">ver todos</a></div>`;
    } else {
      const bazars = suggestions.filter(s => s.type === 'bazar');
      const products = suggestions.filter(s => s.type === 'product');
      dd.innerHTML =
        (bazars.length ? `<div style="padding:7px 12px 3px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--t4)">Bazares</div>
          ${bazars.map(b => `<div class="sdd-item" onclick="go('bazar.html',{id:'${b.slug || b.id}'})">
            ${avatar(b.label, 28)}<span style="font-size:13px;font-weight:600">${esc(b.label)}</span></div>`).join('')}` : '') +
        (products.length ? `<div style="padding:7px 12px 3px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--t4)">Produtos</div>
          ${products.map(p => `<div class="sdd-item" onclick="go('product.html',{id:'${p.id}'})">
            <div style="width:30px;height:30px;border-radius:6px;background:var(--surf3);display:flex;align-items:center;justify-content:center;font-size:14px">📦</div>
            <div><div style="font-size:13px;font-weight:600">${esc(p.label)}</div><div style="font-size:11px;color:var(--t4)">${esc(p.sub||'')}</div></div>
          </div>`).join('')}` : '') +
        `<div style="padding:8px 12px;border-top:1px solid var(--brd);text-align:center">
          <a href="products.html?q=${encodeURIComponent(q)}" style="font-size:12px;color:var(--b-500);font-weight:600">Ver todos os resultados para "${esc(q)}" →</a>
        </div>`;
    }
    dd.style.display = 'block';
  } catch {}
}

// ─── SIDEBAR builder ────────────────────────────────────────────
let _sbOpen = false;
function toggleSidebar() {
  _sbOpen = !_sbOpen;
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  if (sb) sb.classList.toggle('open', _sbOpen);
  if (ov) ov.classList.toggle('show', _sbOpen);
}
function closeSidebar() {
  _sbOpen = false;
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('show');
}

function buildSidebar(active = '') {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  const user = Session.user;

  const sellerLinks = [
    ['dashboard.html', 'pulse', 'Dashboard'],
    ['my-bazar.html', 'store', 'Meu Bazar'],
    ['my-products.html', 'box', 'Produtos'],
    ['my-orders.html', 'cart', 'Encomendas'],
    ['chat.html', 'chat', 'Mensagens'],
    ['wallet.html', 'wallet', 'Wallet'],
    ['finance.html', 'bars', 'Financeiro'],
    ['referrals.html', 'link', 'Referências']
  ];
  const buyerLinks = [
    ['dashboard.html', 'pulse', 'Dashboard'],
    ['my-orders.html', 'cart', 'Encomendas'],
    ['cart.html', 'cart', 'Carrinho'],
    ['chat.html', 'chat', 'Mensagens'],
    ['favorites.html', 'heart', 'Favoritos'],
    ['wallet.html', 'wallet', 'Wallet'],
    ['referrals.html', 'link', 'Referências']
  ];
  const revLinks = [
    ['dashboard.html', 'pulse', 'Dashboard'],
    ['my-sellers.html', 'store', 'Meus Vendedores'],
    ['rev-finance.html', 'bars', 'Financeiro'],
    ['wallet.html', 'wallet', 'Wallet'],
    ['referrals.html', 'link', 'Referências']
  ];
  const adminLinks = [
    ['admin.html', 'pulse', 'Visão Geral'],
    ['admin-users.html', 'user', 'Utilizadores'],
    ['admin-products.html', 'box', 'Produtos'],
    ['admin-orders.html', 'cart', 'Encomendas'],
    ['admin-finance.html', 'bars', 'Financeiro'],
    ['wallet.html', 'wallet', 'A minha Wallet'],
    ['admin-wallet.html', 'wallet', 'Contribuições'],
    ['admin-invites.html', 'envelope', 'Convites'],
    ['admin-broadcast.html', 'megaphone', 'Avisos'],
    ['admin-reports.html', 'bars', 'Relatórios'],
    ['admin-logs.html', 'clipboard', 'Auditoria'],
    ['admin-denuncias.html', 'flag', 'Denúncias']
  ];

  const roleLinks = user
    ? ({ SELLER: sellerLinks, BUYER: buyerLinks, REVENDEDOR: revLinks, ADMIN: adminLinks }[user.role] || [])
    : [];

  const link = (href, ico, lbl) =>
    `<button class="sb-lnk${active === href ? ' active' : ''}" onclick="go('${href}')">
      <span class="ico">${icon(ico, 17, 1.7)}</span>${lbl}
    </button>`;

  sb.innerHTML = `
    ${user ? `<div class="sb-user">${avatar(user.name)}<div><div class="sb-name">${esc(user.name)}</div><div class="sb-role">${ROLE_LABEL[user.role] || user.role}</div></div></div>` : ''}
    <nav class="sb-nav">
      ${user ? `
        <div class="sb-sec">${ROLE_LABEL[user.role] || ''}</div>
        ${roleLinks.map(([h, i, l]) => link(h, i, l)).join('')}
        <div class="sb-sec">Conta</div>
        ${link('profile.html', 'user', 'Perfil')}
        ${link('settings.html', 'settings', 'Definições')}
        ${link('support.html', 'support', 'Suporte')}
        <button class="sb-lnk" style="color:var(--red)" onclick="doLogout()"><span class="ico">${icon('logout', 17, 1.7)}</span>Terminar sessão</button>
      ` : `
        <div class="sb-sec">Navegação</div>
        ${link('index.html', 'home', 'Início')}
        ${link('bazars.html', 'store', 'Bazares')}
        ${link('products.html', 'box', 'Produtos')}
        <hr style="margin:8px;border-color:var(--brd)">
        ${link('login.html', 'user', 'Entrar')}
        ${link('register.html', 'sparkle', 'Criar conta')}`}
    </nav>`;
}

async function doLogout() {
  await Session.logout();
  toast('Sessão terminada.', 'info');
  sessionStorage.removeItem('bz_cart_count');
  setTimeout(() => go('index.html'), 800);
}

// ─── NOTIFICATIONS ──────────────────────────────────────────────
let _notifPanelOpen = false;

async function refreshNotifDot() {
  try {
    const res = await api.get('/notifications', { unreadOnly: 'true', limit: 1 });
    const unread = res?.data?.unreadCount || 0;
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  } catch {}
}

function toggleNotifPanel() {
  _notifPanelOpen = !_notifPanelOpen;
  let panel = document.getElementById('notif-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.className = 'notif-panel';
    panel.innerHTML = `
      <div style="padding:14px 16px;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:var(--surf)">
        <strong style="font-size:14px">Notificações</strong>
        <button class="btn-xs btn-soft" onclick="markAllNotifsRead()">Marcar lidas</button>
      </div>
      <div id="notif-list"><div style="text-align:center;padding:30px"><span class="spinner spinner-dark"></span></div></div>`;
    document.body.appendChild(panel);
    loadNotifications();
  }
  panel.classList.toggle('open', _notifPanelOpen);
}

// Detecta o link de destino com base no tipo/título da notificação
function notifDestination(n) {
  const title = (n.title || '').toLowerCase();
  const msg   = (n.message || '').toLowerCase();
  const link  = n.link || '';

  // Link explícito do backend tem prioridade
  if (link && link !== '#') return link;

  // Mensagens → chat
  if (title.includes('mensagem') || msg.includes('mensagem'))
    return 'chat.html';

  // Encomendas
  if (title.includes('encomenda') || title.includes('pedido') ||
      msg.includes('encomenda')   || msg.includes('pedido'))
    return 'my-orders.html';

  // Pagamento / financeiro
  if (title.includes('pagamento') || title.includes('taxa') ||
      title.includes('contribui')  || title.includes('financ'))
    return 'finance.html';

  // Verificação / conta
  if (title.includes('verific') || title.includes('conta'))
    return 'profile.html';

  // Avaliação / review
  if (title.includes('avaliaç') || title.includes('review'))
    return 'my-orders.html';

  // Produto em destaque
  if (title.includes('destaque') || title.includes('produto'))
    return 'my-products.html';

  // Bazar
  if (title.includes('bazar'))
    return 'my-bazar.html';

  return null; // sem destino → só fecha o painel
}

const NOTIF_ICONS = {
  mensagem: '💬', encomenda: '📦', pedido: '📦',
  pagamento: '💰', taxa: '💰', contribui: '💰',
  verific: '✅', conta: '👤', avaliaç: '⭐',
  destaque: '⭐', produto: '📦', bazar: '🏪',
};
function notifIcon(n) {
  const t = (n.title || '').toLowerCase();
  for (const [k, v] of Object.entries(NOTIF_ICONS)) {
    if (t.includes(k)) return v;
  }
  return '🔔';
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  try {
    const res = await api.get('/notifications', { limit: 30 });
    const notifs = res?.data?.notifications || [];
    if (!notifs.length) {
      list.innerHTML = `<div class="empty" style="padding:40px"><div class="empty-ico">🔔</div><p>Sem notificações</p></div>`;
    } else {
      list.innerHTML = notifs.map(n => {
        const dest = notifDestination(n);
        const ico  = notifIcon(n);
        return `
        <div class="ni${n.read ? '' : ' unread'}" onclick="handleNotifClick('${n.id}','${dest||''}',this)" style="${dest?'cursor:pointer':''}">
          <div style="font-size:20px;flex-shrink:0;line-height:1">${ico}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:8px">
              <span>${esc(n.title)}</span>
              ${dest ? `<span style="font-size:16px;color:var(--t4)">›</span>` : ''}
            </div>
            <div style="font-size:12.5px;color:var(--t2);margin-top:2px">${esc(n.message)}</div>
            <div style="font-size:10px;color:var(--t4);margin-top:4px">${fmtDate(n.createdAt)}</div>
          </div>
          ${!n.read ? `<div style="width:8px;height:8px;border-radius:50%;background:#2563EB;flex-shrink:0;margin-top:6px"></div>` : ''}
        </div>`;
      }).join('');
    }
  } catch { list.innerHTML = '<div class="empty" style="padding:40px"><p>Falha ao carregar notificações.</p></div>'; }
}

async function handleNotifClick(id, dest, el) {
  // Marca como lida
  try { await api.patch(`/notifications/${id}/read`); } catch {}
  if (el) el.classList.remove('unread');
  refreshNotifDot();
  // Navega se tiver destino
  if (dest) {
    _notifPanelOpen = false;
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.remove('open');
    go(dest);
  }
}

async function markNotifRead(id, el) {
  try { await api.patch(`/notifications/${id}/read`); } catch {}
  if (el) el.classList.remove('unread');
  refreshNotifDot();
}

async function markAllNotifsRead() {
  try { await api.patch('/notifications/read-all'); } catch {}
  document.querySelectorAll('.ni.unread').forEach(e => e.classList.remove('unread'));
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = 'none';
  toast('Todas as notificações marcadas como lidas.', 'info');
}

// ─── DARK MODE ──────────────────────────────────────────────────
function toggleDark() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('bz_theme', isDark ? 'light' : 'dark');
}
(function initTheme() {
  const saved = localStorage.getItem('bz_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// ─── BFCACHE GUARD ────────────────────────────────────────────────
// When the user navigates back/forward, some browsers restore the page
// from the back-forward cache (bfcache) instead of re-running our scripts.
// That would let a page captured WHILE LOGGED IN still display logged-in
// UI even after the user logged out in the meantime (the in-memory access
// token and rendered DOM are frozen as they were). Forcing a reload on a
// bfcache restore guarantees initPage()/Session.bootstrap() always re-runs
// and reflects the real, current session state.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});

// ─── PAGE INIT HELPER ────────────────────────────────────────────
/**
 * Call at the top of every page script.
 * 1. Bootstraps session (silent token refresh)
 * 2. Enforces role guard if provided
 * 3. Builds shared topbar + sidebar
 * 4. Calls onReady callback
 */
async function initPage({ active = '', requireAuth = false, roles = null, onReady } = {}) {
  // Bootstrap runs every page load to restore session from cookie
  await Session.bootstrap();
  const user = Session.user;

  if (requireAuth && !user) { go('login.html', { next: location.href }); return; }
  if (roles && user && !roles.includes(user.role)) { go('dashboard.html'); return; }

  // Sidebar needs responsive margin
  const main = document.getElementById('main');
  if (main) {
    const setMargin = () => { main.style.marginLeft = window.innerWidth > 900 ? '260px' : '0'; };
    setMargin();
    window.addEventListener('resize', setMargin);
  }

  buildTopbar(active);
  buildSidebar(active);

  const overlay = document.getElementById('overlay');
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // ── Ripple effect on all .btn clicks ───────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    const r = btn.getBoundingClientRect();
    wave.style.left = (e.clientX - r.left) + 'px';
    wave.style.top  = (e.clientY - r.top)  + 'px';
    btn.appendChild(wave);
    wave.addEventListener('animationend', () => wave.remove(), { once: true });
  });

  // ── Lazy image load — fade in once loaded ──────────────────────
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.classList.add('img-loading');
      const tmp = new Image();
      tmp.onload  = () => { img.src = tmp.src; img.classList.replace('img-loading','img-loaded'); };
      tmp.onerror = () => img.classList.remove('img-loading');
      tmp.src = img.dataset.src || img.src;
      lazyObserver.unobserve(img);
    });
  }, { rootMargin: '120px' });
  document.querySelectorAll('img[data-src]').forEach(img => lazyObserver.observe(img));

  // ── Scroll reveal for .reveal elements ────────────────────────
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  if (onReady) await onReady(user);

  // ── Stagger .anim-item cards that already exist in DOM ─────────
  animateItems(document.getElementById('view') || document.body);
}

// ─── PRODUCT CARD ────────────────────────────────────────────────

/**
 * Stagger-animate .anim-item children inside a container.
 * Call this after injecting new DOM content (product grids, search
 * results, etc.) so each card slides in with a cascade delay.
 */
function animateItems(container) {
  if (!container) return;
  const items = container.querySelectorAll('.anim-item:not(.visible)');
  items.forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), i * 55);
  });
}

/**
 * Render N skeleton card placeholders into a container while
 * data is loading — replaces the old spinner-only pattern.
 * Usage: skeletonCards(container, 6)
 */
function skeletonCards(container, n = 6) {
  if (!container) return;
  container.innerHTML = Array.from({ length: n }, () => `
    <div class="skel-card">
      <div class="skel skel-img"></div>
      <div style="padding:10px 0 4px">
        <div class="skel skel-text" style="width:55%"></div>
        <div class="skel skel-title" style="width:80%"></div>
        <div class="skel skel-text" style="width:40%"></div>
      </div>
    </div>`).join('');
}

/**
 * Render N skeleton row placeholders inside a table body.
 */
function skeletonTable(tbody, cols = 5, n = 5) {
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: n }, () =>
    `<tr>${Array.from({ length: cols }, (_, i) =>
      `<td><div class="skel skel-text" style="width:${[70,90,55,45,60][i] || 70}%"></div></td>`
    ).join('')}</tr>`
  ).join('');
}


function productCard(p) {
  const imgUrl = p.images?.[0]?.url || '';
  return `
    <div class="p-card anim-item" onclick="go('product.html',{id:'${p.id}'})">
      <div class="p-img">
        ${imgUrl ? `<img src="${esc(imgUrl)}" alt="${esc(p.name)}" loading="lazy">` : `<span style="color:var(--t4);font-size:12px">Sem foto</span>`}
        ${Session.user?.role === 'BUYER' ? `<button class="p-fav" onclick="event.stopPropagation();toggleFavorite('${p.id}',this)">${p.isFavorite ? '❤️' : '🤍'}</button>` : ''}
      </div>
      <div class="p-body">
        <div class="p-store">${esc(p.bazar?.name || '')}</div>
        <div class="p-name">${esc(p.name)}</div>
        ${p.ratingCount ? `<div style="font-size:11px;margin-bottom:2px">${stars(p.rating)} ${p.rating?.toFixed(1)} (${p.ratingCount})</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
          <div class="p-price">${fmtMT(p.price)}</div>
          <span style="font-size:10px;font-weight:600;color:${p.stock > 0 ? 'var(--grn)' : 'var(--red)'}">${p.stock > 0 ? p.stock + ' un.' : 'Esgotado'}</span>
        </div>
      </div>
    </div>`;
}

async function toggleFavorite(productId, btn) {
  if (!Session.isLoggedIn()) { go('login.html'); return; }
  try {
    const res = await api.post(`/products/${productId}/favorite`);
    const isFav = res?.data?.isFavorite;
    if (btn) btn.textContent = isFav ? '❤️' : '🤍';
    toast(isFav ? 'Adicionado aos favoritos! ❤️' : 'Removido dos favoritos.', isFav ? 'ok' : 'info');
  } catch (e) { toast(apiErrorMessage(e), 'err'); }
}

// ─── CAT STRIP ───────────────────────────────────────────────────
function renderCatStrip(container, activeCat, onSelect) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  el.innerHTML = `
    <div class="cat-chip${!activeCat ? ' on' : ''}" onclick="catChipClick(this,'',${JSON.stringify(onSelect.toString())})">
      <div class="ci">🛍</div><div class="cl">Tudo</div>
    </div>
    ${CATS.map(c => `<div class="cat-chip${activeCat === c.l ? ' on' : ''}" onclick="_catPick(this,'${esc(c.l)}')">
      <div class="ci">${c.ico}</div><div class="cl">${c.l.slice(0, 10)}</div>
    </div>`).join('')}`;
  el._onSelect = onSelect;
}
window._catPick = function(el, cat) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  const strip = el.closest('.cat-strip');
  if (strip?._onSelect) strip._onSelect(cat);
};

// ─── STAR PICKER ─────────────────────────────────────────────────
function starPicker(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return 0;
  let val = 0;
  el.innerHTML = [1,2,3,4,5].map(i => `<span data-v="${i}" onclick="_starSet('${containerId}',${i})" style="font-size:26px;cursor:pointer;color:var(--brd2)">★</span>`).join('');
  el._getValue = () => val;
  window._starSet = function(id, v) {
    val = v;
    document.querySelectorAll(`#${id} span`).forEach(s => {
      s.style.color = parseInt(s.dataset.v) <= v ? '#D97706' : 'var(--brd2)';
    });
  };
  return { getValue: () => val };
}

// ─── PAGINATION ──────────────────────────────────────────────────
function renderPagination(container, meta, onPage) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el || !meta || meta.pages <= 1) { if (el) el.innerHTML = ''; return; }
  const btns = [];
  for (let p = 1; p <= meta.pages; p++) {
    btns.push(`<button class="btn btn-xs${p === meta.page ? ' btn-primary' : ' btn-ghost'}" onclick="(${onPage.toString()})(${p})">${p}</button>`);
  }
  el.innerHTML = `<div style="display:flex;gap:6px;justify-content:center;margin-top:18px">${btns.join('')}</div>`;
}

// ─── CART COUNT CACHE ────────────────────────────────────────────
async function refreshCartCount() {
  if (!Session.isRole('BUYER')) return;
  try {
    const res = await api.get('/cart');
    const count = (res?.data?.items || []).reduce((s, i) => s + i.qty, 0);
    sessionStorage.setItem('bz_cart_count', count);
  } catch {}
}
