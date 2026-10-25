/* La bàn Dược Lâm Sàng – điều khiển giao diện. Logic thuần nằm ở js/lib.js (window.CPA). */
(function () {
  'use strict';
  var C = window.CPA;
  var UNITS = { 'phuong-nam': 'BVĐK Phương Nam', 'phuong-chau': 'BV Phương Châu' };
  var DESKTOP = window.matchMedia('(min-width: 900px)');
  var KEY_RECENT = 'cpa.recent', KEY_UNIT = 'cpa.unit', KEY_COLLAPSED = 'cpa.sbCollapsed';

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    body: document.body, nav: $('nav'), navEmpty: $('nav-empty'), q: $('q'), scrim: $('scrim'),
    menu: $('menu-btn'), close: $('sb-close'), home: $('home'), viewer: $('viewer'), frame: $('frame'),
    loading: $('viewer-loading'), cat: $('crumb-cat'), title: $('crumb-title'), actions: $('page-actions'),
    prev: $('prev-btn'), next: $('next-btn'), reload: $('reload-btn'), open: $('open-btn'),
    meta: $('data-meta'), stats: $('stats'), recent: $('recent'), recentH: $('recent-h'), grid: $('cat-grid'),
    loadErr: $('load-error'), unverified: $('unverified-note'), netDot: $('net-dot'), netText: $('net-text'),
    unitName: $('unit-name')
  };
  var state = { catalog: null, byId: {}, catById: {}, ordered: [], current: null };

  /* ---------- lưu trữ trình duyệt (chỉ tiện ích, không có dữ liệu bệnh nhân) ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* bỏ qua */ } }

  function make(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  /* Ghi text vào phần tử, tô sáng đoạn khớp truy vấn (không dùng innerHTML). */
  function setHighlighted(node, text, query) {
    node.textContent = '';
    var ranges = C.matchRanges(text, query), pos = 0;
    ranges.forEach(function (r) {
      if (r[0] > pos) node.appendChild(document.createTextNode(text.slice(pos, r[0])));
      node.appendChild(make('mark', null, text.slice(r[0], r[1])));
      pos = r[1];
    });
    if (pos < text.length) node.appendChild(document.createTextNode(text.slice(pos)));
  }

  /* ---------- đơn vị (theme) ---------- */
  function applyUnit(unit) {
    if (!UNITS[unit]) unit = 'phuong-nam';
    document.documentElement.setAttribute('data-unit', unit);
    el.unitName.textContent = UNITS[unit];
    document.querySelectorAll('[data-unit-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-unit-btn') === unit));
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--sb-bg').trim() || '#1b2a4a');
    save(KEY_UNIT, unit);
  }

  /* ---------- sidebar: mở/đóng ---------- */
  function sidebarVisible() {
    return DESKTOP.matches ? !el.body.classList.contains('sb-collapsed') : el.body.classList.contains('sb-open');
  }
  function syncMenuState() {
    el.menu.setAttribute('aria-expanded', String(sidebarVisible()));
    el.scrim.hidden = DESKTOP.matches || !el.body.classList.contains('sb-open');
  }
  function toggleSidebar(force) {
    var show = typeof force === 'boolean' ? force : !sidebarVisible();
    if (DESKTOP.matches) {
      el.body.classList.toggle('sb-collapsed', !show);
      save(KEY_COLLAPSED, !show);
    } else {
      el.body.classList.toggle('sb-open', show);
      if (show) setTimeout(function () { el.q.focus(); }, 50);
    }
    syncMenuState();
  }
  function closeDrawerOnMobile() { if (!DESKTOP.matches) toggleSidebar(false); }

  /* ---------- sidebar: danh mục ---------- */
  function renderNav() {
    var cat = state.catalog, query = el.q.value;
    var matches = C.filterRecords(cat.records, query);
    var groups = C.groupByCategory(cat.categories, matches);
    var searching = !!C.norm(query);
    el.nav.textContent = '';

    if (!searching) {
      var home = make('a', { href: '#/', class: 'nav-home' });
      home.appendChild(make('span', { 'aria-hidden': 'true' }, '🏠'));
      home.appendChild(document.createTextNode('Trang chủ'));
      if (!state.current) home.setAttribute('aria-current', 'page');
      el.nav.appendChild(home);
    }

    groups.forEach(function (g) {
      if (!g.items.length) return;
      var det = make('details', { class: 'nav-group', 'data-cat': g.category.id });
      var openSet = load('cpa.closedGroups', []);
      det.open = searching || openSet.indexOf(g.category.id) === -1;
      var sum = make('summary');
      sum.appendChild(make('span', { 'aria-hidden': 'true' }, g.category.icon || '•'));
      sum.appendChild(make('span', null, g.category.name));
      sum.appendChild(make('span', { class: 'count' }, String(g.items.length)));
      det.appendChild(sum);
      det.addEventListener('toggle', function () {
        if (searching) return;
        var closed = load('cpa.closedGroups', []).filter(function (x) { return x !== g.category.id; });
        if (!det.open) closed.push(g.category.id);
        save('cpa.closedGroups', closed);
      });
      var ul = make('ul', { class: 'nav-list' });
      g.items.forEach(function (r) {
        var a = make('a', { href: C.routeFor(r.id), class: 'nav-link', 'data-id': r.id, title: r.title });
        setHighlighted(a, r.label, query);
        if (state.current && state.current.id === r.id) a.setAttribute('aria-current', 'page');
        ul.appendChild(make('li')).appendChild(a);
      });
      det.appendChild(ul);
      el.nav.appendChild(det);
    });
    el.navEmpty.hidden = matches.length > 0;
  }

  function markActive() {
    el.nav.querySelectorAll('[aria-current]').forEach(function (n) { n.removeAttribute('aria-current'); });
    var sel = state.current ? '.nav-link[data-id="' + CSS.escape(state.current.id) + '"]' : '.nav-home';
    var a = el.nav.querySelector(sel);
    if (a) {
      a.setAttribute('aria-current', 'page');
      var det = a.closest('details');
      if (det && !det.open) det.open = true;
      if (a.scrollIntoView) a.scrollIntoView({ block: 'nearest' });
    }
  }

  /* ---------- trang chủ ---------- */
  function cardFor(r) {
    var a = make('a', { href: C.routeFor(r.id), class: 'card', title: r.title });
    var c = state.catById[r.category];
    a.appendChild(make('small', null, (c ? c.icon + ' ' + c.name : '')));
    a.appendChild(make('strong', null, r.label));
    return a;
  }

  function renderHome() {
    var cat = state.catalog;
    el.stats.textContent = '';
    var total = make('div', { class: 'stat' });
    total.appendChild(make('b', null, String(cat.records.length)));
    total.appendChild(make('span', null, 'Tài liệu'));
    el.stats.appendChild(total);
    C.groupByCategory(cat.categories, cat.records).forEach(function (g) {
      var s = make('div', { class: 'stat' });
      s.appendChild(make('b', null, String(g.items.length)));
      s.appendChild(make('span', null, g.category.name));
      el.stats.appendChild(s);
    });

    el.grid.textContent = '';
    C.groupByCategory(cat.categories, cat.records).forEach(function (g) {
      var box = make('div', { class: 'cat' });
      var h = make('h3');
      h.appendChild(make('span', { 'aria-hidden': 'true' }, g.category.icon || ''));
      h.appendChild(document.createTextNode(g.category.name));
      box.appendChild(h);
      var ul = make('ul');
      g.items.forEach(function (r) {
        ul.appendChild(make('li')).appendChild(make('a', { href: C.routeFor(r.id), title: r.title }, r.label));
      });
      box.appendChild(ul);
      el.grid.appendChild(box);
    });
    renderRecent();
  }

  function renderRecent() {
    var ids = load(KEY_RECENT, []).filter(function (id) { return state.byId[id]; });
    el.recent.textContent = '';
    ids.forEach(function (id) { el.recent.appendChild(cardFor(state.byId[id])); });
    el.recentH.hidden = !ids.length;
  }

  /* ---------- định tuyến ---------- */
  function showHome() {
    state.current = null;
    el.viewer.hidden = true;
    el.home.hidden = false;
    el.actions.hidden = true;
    el.frame.removeAttribute('src');
    el.cat.textContent = 'Trang chủ';
    el.title.textContent = 'Định hướng điều trị theo bằng chứng';
    document.title = 'La bàn Dược Lâm Sàng';
    renderRecent();
  }

  function showPage(r) {
    state.current = r;
    var url = C.pageUrl(r.file);
    el.home.hidden = true;
    el.viewer.hidden = false;
    el.actions.hidden = false;
    var c = state.catById[r.category];
    el.cat.textContent = c ? c.name : '';
    el.title.textContent = r.label;
    el.title.title = r.title;
    el.frame.title = r.title;
    document.title = r.label + ' – La bàn Dược Lâm Sàng';
    el.open.href = url;
    var nb = C.neighbors(state.ordered, r.id);
    el.prev.disabled = !nb.prev; el.prev.title = nb.prev ? 'Trước: ' + nb.prev.label : 'Tài liệu trước';
    el.next.disabled = !nb.next; el.next.title = nb.next ? 'Sau: ' + nb.next.label : 'Tài liệu sau';
    if (el.frame.getAttribute('src') !== url) {
      el.loading.hidden = false;
      el.frame.setAttribute('src', url);
    }
    save(KEY_RECENT, C.pushRecent(load(KEY_RECENT, []), r.id, 6));
  }

  function route() {
    if (!state.catalog) return;
    var rt = C.parseRoute(location.hash);
    var r = rt.view === 'page' ? state.byId[rt.id] : null;
    if (rt.view === 'page' && !r) { history.replaceState(null, '', '#/'); }
    if (r) showPage(r); else showHome();
    markActive();
  }

  function go(r) { if (r) location.hash = C.routeFor(r.id); }

  /* ---------- kết nối mạng ---------- */
  function syncNet() {
    var on = navigator.onLine;
    el.netDot.className = 'dot ' + (on ? 'on' : 'off');
    el.netText.textContent = on ? 'Trực tuyến' : 'Ngoại tuyến – dùng bản đã lưu';
  }

  /* ---------- khởi động ---------- */
  function showLoadError(msg) {
    el.loadErr.hidden = false;
    el.loadErr.textContent = msg;
    el.nav.textContent = '';
    el.nav.appendChild(make('p', { class: 'sb-loading' }, 'Không tải được danh mục.'));
  }

  function init(catalog) {
    var errs = C.validateCatalog(catalog);
    if (errs.length) { showLoadError('Danh mục không hợp lệ: ' + errs.slice(0, 3).join('; ')); return; }
    state.catalog = catalog;
    catalog.records.forEach(function (r) { state.byId[r.id] = r; });
    catalog.categories.forEach(function (c) { state.catById[c.id] = c; });
    state.ordered = C.orderedRecords(catalog.categories, catalog.records);
    el.meta.textContent = 'Danh mục v' + catalog.version + ' · cập nhật ' + C.formatDate(catalog.updated);
    el.unverified.hidden = catalog.status === 'verified';
    renderNav();
    renderHome();
    route();
  }

  function bind() {
    el.menu.addEventListener('click', function () { toggleSidebar(); });
    el.close.addEventListener('click', function () { toggleSidebar(false); el.menu.focus(); });
    el.scrim.addEventListener('click', function () { toggleSidebar(false); });
    DESKTOP.addEventListener('change', function () { el.body.classList.remove('sb-open'); syncMenuState(); });

    el.q.addEventListener('input', function () { if (state.catalog) { renderNav(); markActive(); } });
    el.q.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = el.nav.querySelector('.nav-link');
        if (first) { e.preventDefault(); location.hash = first.getAttribute('href'); }
      } else if (e.key === 'ArrowDown') {
        var f = el.nav.querySelector('.nav-link');
        if (f) { e.preventDefault(); f.focus(); }
      } else if (e.key === 'Escape' && el.q.value) {
        e.stopPropagation(); el.q.value = ''; renderNav(); markActive();
      }
    });
    /* Mũi tên lên/xuống di chuyển giữa các mục trong sidebar */
    el.nav.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var links = Array.prototype.slice.call(el.nav.querySelectorAll('.nav-home, details[open] .nav-link'));
      var i = links.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      if (e.key === 'ArrowUp' && i === 0) { el.q.focus(); return; }
      var n = links[i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (n) n.focus();
    });
    el.nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeDrawerOnMobile(); });

    document.querySelectorAll('[data-unit-btn]').forEach(function (b) {
      b.addEventListener('click', function () { applyUnit(b.getAttribute('data-unit-btn')); });
    });

    el.prev.addEventListener('click', function () { if (state.current) go(C.neighbors(state.ordered, state.current.id).prev); });
    el.next.addEventListener('click', function () { if (state.current) go(C.neighbors(state.ordered, state.current.id).next); });
    el.reload.addEventListener('click', function () {
      el.loading.hidden = false;
      try { el.frame.contentWindow.location.reload(); } catch (e) { el.frame.src = el.frame.src; }
    });
    el.frame.addEventListener('load', function () { el.loading.hidden = true; });

    document.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        if (!sidebarVisible()) toggleSidebar(true);
        el.q.focus(); el.q.select();
      } else if (e.key === 'Escape' && !DESKTOP.matches && el.body.classList.contains('sb-open')) {
        toggleSidebar(false); el.menu.focus();
      }
    });

    window.addEventListener('hashchange', route);
    window.addEventListener('online', syncNet);
    window.addEventListener('offline', syncNet);
  }

  applyUnit(load(KEY_UNIT, 'phuong-nam'));
  if (DESKTOP.matches && load(KEY_COLLAPSED, false)) el.body.classList.add('sb-collapsed');
  syncMenuState();
  syncNet();
  bind();

  fetch('data/catalog.json', { cache: 'no-cache' })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(init)
    .catch(function (err) {
      var fileMode = location.protocol === 'file:';
      showLoadError(fileMode
        ? 'Trình duyệt chặn đọc data/catalog.json khi mở trực tiếp tệp (file://). Hãy chạy serve.ps1 rồi mở http://localhost:8080, hoặc dùng bản trên GitHub Pages.'
        : 'Không tải được data/catalog.json (' + err.message + ').');
    });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* ứng dụng vẫn chạy trực tuyến */ });
    });
    navigator.serviceWorker.ready.then(function () { $('sw-text').hidden = false; });
    /* Bản mới của service worker vừa nhận quyền: tải lại một lần để hiện ngay giao diện/danh mục mới. */
    var hadController = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
  }
})();
