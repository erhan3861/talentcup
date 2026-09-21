/* Talent Cup — arayüz davranışları.
   Kapsam: yalnızca sunum katmanı. Mevcut akışlar (giriş, aktivasyon, filtre,
   yarışma bilgileri modali, geri sayım) birebir korundu. Eklenen tek akış
   ana sayfadaki yarışma talebi formu; önceden mailto bağlantısıydı. */

(function () {
  'use strict';

  /* --- Tema ------------------------------------------------------------- */
  // Yalnızca görüntüleme tercihi; öğrenci verisi değil, localStorage uygun.
  var THEME_KEY = 'tc_theme';
  var root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var isDark = theme === 'dark';
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('title', isDark ? 'Açık temaya geç' : 'Koyu temaya geç');
      var label = btn.querySelector('.visually-hidden');
      if (label) label.textContent = isDark ? 'Açık temaya geç' : 'Koyu temaya geç';
      btn.querySelectorAll('[data-icon]').forEach(function (icon) {
        // SVG'de .hidden özelliği yok; öznitelik doğrudan değiştirilir
        icon.toggleAttribute('hidden', icon.getAttribute('data-icon') !== (isDark ? 'sun' : 'moon'));
      });
    });
  }

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* engelli depolama */ }
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(stored || (prefersDark ? 'dark' : 'light'));

    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* yoksay */ }
      });
    });
  }

  /* --- Şifre göster/gizle ------------------------------------------------ */
  function initPasswordToggles() {
    document.querySelectorAll('[data-password-toggle]').forEach(function (btn) {
      var input = document.getElementById(btn.getAttribute('data-password-toggle'));
      if (!input) return;
      btn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        var label = btn.querySelector('.visually-hidden');
        if (label) label.textContent = show ? 'Şifreyi gizle' : 'Şifreyi göster';
        btn.querySelectorAll('[data-icon]').forEach(function (icon) {
          icon.toggleAttribute('hidden', icon.getAttribute('data-icon') !== (show ? 'eye-off' : 'eye'));
        });
      });
    });
  }

  /* --- Yarışma filtreleri ------------------------------------------------ */
  // Filtre grupları sayfadan okunur: zaman (all/active/future/past),
  // tür (all/project/task) ve seviye (all/ilkokul/ortaokul/lise).
  // Başlangıç değeri aria-pressed="true" olan butondur. Kart özniteliği
  // birden çok değer taşıyabilir: data-level="ortaokul lise".
  function initFilters() {
    var grid = document.querySelector('[data-comp-grid]');
    if (!grid) return;

    var state = {};
    var status = document.querySelector('[data-filter-status]');
    var empty = document.querySelector('[data-empty]');

    // data-page-size varsa eşleşen kartlar sayfalara bölünür (örn. 3x3 = 9)
    var pageSize = parseInt(grid.getAttribute('data-page-size'), 10) || 0;
    var pager = document.querySelector('[data-pager]');
    var page = 1;

    function renderPager(total) {
      if (!pager) return;
      var pages = pageSize ? Math.ceil(total / pageSize) : 1;
      pager.hidden = pages <= 1;
      var box = pager.querySelector('[data-pager-pages]');
      box.innerHTML = '';
      for (var i = 1; i <= pages; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = i;
        b.setAttribute('aria-label', 'Sayfa ' + i);
        if (i === page) b.setAttribute('aria-current', 'page');
        b.addEventListener('click', (function (n) { return function () { page = n; render(); }; })(i));
        box.appendChild(b);
      }
      pager.querySelector('[data-pager-prev]').disabled = page <= 1;
      pager.querySelector('[data-pager-next]').disabled = page >= pages;
    }

    function render() {
      var shown = 0, matched = 0;
      grid.querySelectorAll('[data-comp]').forEach(function (card) {
        var match = Object.keys(state).every(function (name) {
          if (state[name] === 'all') return true;
          var values = (card.getAttribute('data-' + name) || '').split(/\s+/);
          return values.indexOf(state[name]) !== -1;
        });
        if (match) matched += 1;
        var onPage = !pageSize || (matched > (page - 1) * pageSize && matched <= page * pageSize);
        card.hidden = !(match && onPage);
        if (match) shown += 1;
      });
      renderPager(matched);
      if (empty) empty.hidden = shown !== 0;
      if (status) {
        status.textContent = shown === 0
          ? 'Bu filtreye uyan yarışma yok.'
          : shown + ' yarışma listeleniyor.';
      }
    }

    document.querySelectorAll('[data-filter]').forEach(function (group) {
      var name = group.getAttribute('data-filter');
      var pressed = group.querySelector('button[aria-pressed="true"]');
      state[name] = pressed ? pressed.getAttribute('data-value') : 'all';
      group.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state[name] = btn.getAttribute('data-value');
          page = 1;
          group.querySelectorAll('button').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === btn));
          });
          render();
        });
      });
    });

    if (pager) {
      pager.querySelector('[data-pager-prev]').addEventListener('click', function () { page -= 1; render(); });
      pager.querySelector('[data-pager-next]').addEventListener('click', function () { page += 1; render(); });
    }

    render();
  }

  /* --- Modal (Yarışma Bilgileri, Yarışma Talebi) ------------------------- */
  function initModals() {
    document.querySelectorAll('[data-modal]').forEach(function (modal) {
      var openers = document.querySelectorAll('[data-modal-open="' + modal.id + '"]');
      var lastFocused = null;

      function focusable() {
        return Array.prototype.filter.call(
          modal.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
          function (el) { return el.offsetParent !== null; }
        );
      }

      function open() {
        lastFocused = document.activeElement;
        modal.hidden = false;
        modal.dispatchEvent(new CustomEvent('modal:open'));
        // Formlu modalda odak ilk alana gider, diğerlerinde ilk öğeye.
        var start = modal.querySelector('[data-autofocus]');
        var items = focusable();
        if (start && start.offsetParent !== null) start.focus();
        else if (items.length) items[0].focus();
        document.addEventListener('keydown', onKey);
      }

      function close() {
        modal.hidden = true;
        modal.dispatchEvent(new CustomEvent('modal:close'));
        document.removeEventListener('keydown', onKey);
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      }

      // Odak modalın içinde döner, Esc kapatır, odak açan butona geri gider.
      function onKey(e) {
        if (e.key === 'Escape') { close(); return; }
        if (e.key !== 'Tab') return;
        var items = focusable();
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }

      openers.forEach(function (btn) { btn.addEventListener('click', open); });
      modal.querySelectorAll('[data-modal-close]').forEach(function (btn) {
        btn.addEventListener('click', close);
      });
      modal.addEventListener('mousedown', function (e) {
        if (e.target === modal) close();
      });
    });
  }

  /* --- Yarışma talebi formu ---------------------------------------------- */
  // Doğrulama istemci tarafında; hata alanın altında metinle yazılır,
  // alana bağlanır ve odak ilk hatalı alana gider (WCAG 3.3.1, 3.3.3).
  // Gönderim: sunucu uç noktası bağlanana kadar başarı ekranı gösterilir.
  function initRequestForm() {
    var form = document.querySelector('[data-request-form]');
    if (!form) return;
    var modal = form.closest('[data-modal]');
    var done = modal.querySelector('[data-request-done]');

    var MESSAGES = {
      school: 'Okul veya kurum adını yazın.',
      city: 'İli yazın.',
      name: 'Ad soyad yazın.',
      role: 'Görevinizi seçin.',
      phone: 'Telefon numarasını 10 ya da 11 haneli yazın.',
      consent: 'Devam etmek için aydınlatma metnini onaylayın.'
    };

    function firstInput(name) {
      return form.querySelector('[name="' + name + '"]');
    }

    function holder(el) {
      return el.closest('[data-choice-field]') || el.closest('.field');
    }

    function setError(name, message) {
      var el = firstInput(name);
      if (!el) return null;
      var box = holder(el);
      var id = 'err-' + name;
      var msg = document.createElement('p');
      msg.className = 'field-error';
      msg.id = id;
      msg.textContent = message;
      box.appendChild(msg);
      box.classList.add('has-error');
      box.querySelectorAll('input, select, textarea').forEach(function (input) {
        input.setAttribute('aria-invalid', 'true');
        var ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        if (ids.indexOf(id) === -1) ids.push(id);
        input.setAttribute('aria-describedby', ids.join(' '));
      });
      return el;
    }

    function clearBox(box) {
      box.classList.remove('has-error');
      box.querySelectorAll('.field-error').forEach(function (m) { m.remove(); });
      box.querySelectorAll('[aria-invalid]').forEach(function (input) {
        input.removeAttribute('aria-invalid');
        var ids = (input.getAttribute('aria-describedby') || '').split(' ')
          .filter(function (x) { return x && x.indexOf('err-') !== 0; });
        if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
        else input.removeAttribute('aria-describedby');
      });
    }

    function clearErrors() {
      form.querySelectorAll('.has-error').forEach(clearBox);
    }

    function validate() {
      var errors = [];
      var f = form.elements;
      ['school', 'city', 'name', 'role'].forEach(function (n) {
        if (!f[n].value.trim()) errors.push(n);
      });
      var digits = f.phone.value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) errors.push('phone');
      if (!f.consent.checked) errors.push('consent');
      return errors;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      var errors = validate();
      if (errors.length) {
        var firstEl = null;
        errors.forEach(function (n) {
          var el = setError(n, MESSAGES[n]);
          if (!firstEl) firstEl = el;
        });
        if (firstEl) firstEl.focus();
        return;
      }
      // Sunucu bağlanınca: fetch('/api/competition-requests', { method: 'POST', body: new FormData(form) })
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });

    // Alan düzeltilince o alanın uyarısı kalkar
    function onFix(e) {
      var box = holder(e.target);
      if (box && box.classList.contains('has-error')) clearBox(box);
    }
    form.addEventListener('change', onFix);
    form.addEventListener('input', onFix);

    // Gönderildikten sonra tekrar açılırsa boş form gelsin
    modal.addEventListener('modal:open', function () {
      if (!done.hidden) {
        form.reset();
        clearErrors();
        form.hidden = false;
        done.hidden = true;
      }
    });
  }

  /* --- Videolar --------------------------------------------------------- */
  // YouTube oynatıcısı yalnızca tıklanınca yüklenir (youtube-nocookie):
  // sayfa açılışında öğrenciden izleme çerezi alınmaz, sayfa hafif kalır.
  function embed(id, title) {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    f.title = title || 'YouTube videosu';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    return f;
  }

  function initVideos() {
    document.querySelectorAll('[data-inline-video]').forEach(function (frame) {
      var btn = frame.querySelector('button');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var f = embed(frame.getAttribute('data-inline-video'), frame.getAttribute('data-video-title'));
        frame.replaceChildren(f);
        f.focus();
      });
    });

    var modal = document.getElementById('video-modal');
    if (!modal) return;
    var slot = modal.querySelector('[data-video-slot]');
    var heading = modal.querySelector('#video-modal-title');
    document.querySelectorAll('[data-video]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var title = btn.getAttribute('data-video-title');
        heading.textContent = title;
        slot.replaceChildren(embed(btn.getAttribute('data-video'), title));
      });
    });
    // Kapatınca oynatıcı kaldırılır; ses arkada çalmaya devam etmez
    modal.addEventListener('modal:close', function () { slot.replaceChildren(); });
  }

  /* --- Görsel carousel ---------------------------------------------------- */
  // Yatay kaydırma + scroll-snap: parmakla da kayar. Otomatik ilerler; imleç
  // ya da odak üstündeyken durur, durdur butonu var (WCAG 2.2.2).
  // Hareket azaltma tercihi açıksa otomatik ilerleme hiç başlamaz.
  function initCarousel() {
    var root = document.querySelector('[data-carousel]');
    if (!root) return;
    var track = root.querySelector('[data-carousel-track]');
    var section = root.closest('section');
    var prev = section.querySelector('[data-carousel-prev]');
    var next = section.querySelector('[data-carousel-next]');
    var toggle = section.querySelector('[data-carousel-toggle]');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paused = reduce, hover = false, timer = null;

    function step() {
      var s = track.querySelector('.slide');
      return s ? s.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : 300;
    }
    function go(dir) {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (dir > 0 && track.scrollLeft >= max) track.scrollTo({ left: 0, behavior: 'smooth' });
      else if (dir < 0 && track.scrollLeft <= 2) track.scrollTo({ left: max + 2, behavior: 'smooth' });
      else track.scrollBy({ left: dir * step(), behavior: 'smooth' });
    }
    function setToggle() {
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'Otomatik kaydırmayı başlat' : 'Otomatik kaydırmayı durdur');
      toggle.querySelector('[data-icon="pause"]').toggleAttribute('hidden', paused);
      toggle.querySelector('[data-icon="play"]').toggleAttribute('hidden', !paused);
    }
    function tick() { if (!paused && !hover && !document.hidden) go(1); }

    prev.addEventListener('click', function () { go(-1); });
    next.addEventListener('click', function () { go(1); });
    toggle.addEventListener('click', function () { paused = !paused; setToggle(); });
    root.addEventListener('mouseenter', function () { hover = true; });
    root.addEventListener('mouseleave', function () { hover = false; });
    root.addEventListener('focusin', function () { hover = true; });
    root.addEventListener('focusout', function () { hover = false; });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    setToggle();
    timer = setInterval(tick, 4500);
  }

  /* --- EU Code Week: Talent Cup haritası -------------------------------- */
  // Veri: data/codeweek-talentcup.js (codeweek.eu aramasından derlendi).
  // Leaflet bölüm ekrana yaklaşınca yüklenir; harita dışındaki sayılar ve
  // il listesi haritasız da çalışır. 
  var LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/';
  function loadLeaflet(cb) {
    if (window.L) { cb(); return; }
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.min.css';
    document.head.appendChild(css);
    var s = document.createElement('script');
    s.src = LEAFLET + 'leaflet.min.js'; s.onload = cb;
    document.head.appendChild(s);
  }

  function initCodeweek() {
    var section = document.getElementById('codeweek');
    var data = window.TC_CODEWEEK;
    if (!section || !data) return;
    var years = section.querySelector('[data-cw-years]');
    var mapEl = section.querySelector('[data-cw-map]');
    var citiesEl = section.querySelector('[data-cw-cities]');
    var openLink = section.querySelector('[data-cw-open]');
    var source = section.querySelector('[data-cw-source]');
    var onlineEl = section.querySelector('[data-cw-online]');
    var stat = function (k) { return section.querySelector('[data-cw-stat="' + k + '"]'); };
    var year = (years.querySelector('[aria-pressed="true"]') || {}).getAttribute ? years.querySelector('[aria-pressed="true"]').getAttribute('data-value') : '2025';
    var map = null, layer = null;
    var fmt = new Intl.NumberFormat('tr-TR');

    function rows() {
      return data.events.filter(function (e) { return year === 'all' || String(e.y) === year; });
    }
    function searchUrl() {
      return 'https://codeweek.eu/events?page=1&year=' + (year === 'all' ? '2025' : year) + '&query=talentcup';
    }
    function esc(s) {
      return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    function drawMap(list) {
      if (!map) return;
      if (layer) layer.remove();
      layer = L.layerGroup();
      list.forEach(function (e) {
        if (e.on) return;
        var m = L.circleMarker([e.lat, e.lng], {
          radius: 7, weight: 2, color: '#ffffff',
          fillColor: e.y === 2025 ? '#5b43e0' : '#f59d0b', fillOpacity: 0.9
        });
        m.bindPopup('<strong>' + esc(e.t) + '</strong><br>' + esc(e.o) + '<br><span>' + esc(e.c) + ' · ' + esc(e.d) +
          '</span><br><a href="https://codeweek.eu/view/' + e.id + '/' + esc(e.s) + '" target="_blank" rel="noopener">codeweek.eu’da gör</a>');
        layer.addLayer(m);
      });
      layer.addTo(map);
    }

    function render() {
      var list = rows();
      var cities = {};
      var orgs = {}, online = 0;
      list.forEach(function (e) {
        if (e.c) cities[e.c] = (cities[e.c] || 0) + 1;
        if (e.on) online += 1;
        orgs[(e.o || '').toLocaleLowerCase('tr')] = 1;
      });
      var ranked = Object.keys(cities).map(function (c) { return [c, cities[c]]; })
        .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], 'tr'); });
      stat('events').textContent = fmt.format(list.length);
      stat('cities').textContent = fmt.format(ranked.length);
      stat('orgs').textContent = fmt.format(Object.keys(orgs).length);
      onlineEl.textContent = online ? online + ' etkinlik çevrim içi ya da konumsuz kaydedildi; haritada gösterilmiyor.' : '';
      var max = ranked.length ? ranked[0][1] : 1;
      citiesEl.innerHTML = ranked.slice(0, 8).map(function (r) {
        return '<li><span class="cw-city">' + esc(r[0]) + '</span><span class="cw-bar" aria-hidden="true"><i style="width:' +
          Math.max(6, Math.round(r[1] / max * 100)) + '%"></i></span><b>' + r[1] + '</b></li>';
      }).join('');
      openLink.href = searchUrl();
      drawMap(list);
    }

    years.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        year = btn.getAttribute('data-value');
        years.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        render();
      });
    });

    if (source) source.textContent = 'Kaynak: codeweek.eu etkinlik araması (' + data.updated + ').';

    function startMap() {
      loadLeaflet(function () {
        // Türkiye sınırlarına oturur; anahtar gerektirmeyen etiketsiz gri altlık
        // (yabancı alfabeli yer adları yok), koyu temada koyu sürüm
        var TR = [[35.8, 25.9], [42.1, 44.8]];
        map = L.map(mapEl, { scrollWheelZoom: false, zoomSnap: 1, attributionControl: true, maxBounds: [[33, 20], [45, 50]] });
        map.fitBounds(TR, { padding: [8, 8] });
        var dark = root.getAttribute('data-theme') === 'dark';
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/' + (dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base') + '/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 12, minZoom: 3,
          attribution: 'Altlık &copy; Esri'
        }).addTo(map);
        window.addEventListener('resize', function () { map.fitBounds(TR, { padding: [8, 8] }); });
        drawMap(rows());
      });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); startMap(); }
      }, { rootMargin: '400px' });
      io.observe(mapEl);
    } else {
      startMap();
    }
    render();
  }

  /* --- Geri sayım -------------------------------------------------------- */
  // Hedef tarih sunucudan gelen yarışma başlangıcıdır; burada statik örnek.
  function initCountdown() {
    var el = document.querySelector('[data-countdown]');
    if (!el) return;
    var target = new Date(el.getAttribute('data-countdown')).getTime();
    if (isNaN(target)) return;

    var fields = {
      day: el.querySelector('[data-unit="day"]'),
      hour: el.querySelector('[data-unit="hour"]'),
      minute: el.querySelector('[data-unit="minute"]'),
      second: el.querySelector('[data-unit="second"]')
    };

    function pad(n) { return String(n).padStart(2, '0'); }

    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        el.setAttribute('data-finished', 'true');
        diff = 0;
      }
      var total = Math.floor(diff / 1000);
      if (fields.day) fields.day.textContent = Math.floor(total / 86400);
      if (fields.hour) fields.hour.textContent = pad(Math.floor(total / 3600) % 24);
      if (fields.minute) fields.minute.textContent = pad(Math.floor(total / 60) % 60);
      if (fields.second) fields.second.textContent = pad(total % 60);
    }

    tick();
    setInterval(tick, 1000);
  }

  /* --- Üst bar gölgesi --------------------------------------------------- */
  // Sayfa başındayken üst bar sayfayla aynı renkte ve çizgisiz durur;
  // kaydırıldığında ayrımı çizgi değil yumuşak bir gölge kurar.
  function initStickyShadow() {
    var bar = document.querySelector('.topbar');
    if (!bar) return;
    function update() {
      bar.setAttribute('data-stuck', String(window.scrollY > 4));
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* --- Yarışma bandı: tıklanan kartın görseli --------------------------- */
  // Kartlar yarisma.html?kart=<ad> ile gelir; bant o kartın fotoğrafını alır.
  // Parametre yoksa ya da tanınmıyorsa varsayılan sahne görseli kalır.
  function initKartArt() {
    var art = document.querySelector('[data-kart-art]');
    if (!art) return;
    var kart = new URLSearchParams(window.location.search).get('kart');
    if (['gorevler', 'proje', 'hikaye'].indexOf(kart) !== -1) art.classList.add('art-' + kart);
  }

  /* --- Başlat ------------------------------------------------------------ */
  initTheme();
  document.addEventListener('DOMContentLoaded', function () {
    initPasswordToggles();
    initFilters();
    initModals();
    initRequestForm();
    initVideos();
    initCarousel();
    initCodeweek();
    initCountdown();
    initStickyShadow();
    initKartArt();
  });
})();
