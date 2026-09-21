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
        icon.hidden = icon.getAttribute('data-icon') !== (isDark ? 'sun' : 'moon');
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
          icon.hidden = icon.getAttribute('data-icon') !== (show ? 'eye-off' : 'eye');
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

    function render() {
      var shown = 0;
      grid.querySelectorAll('[data-comp]').forEach(function (card) {
        var match = Object.keys(state).every(function (name) {
          if (state[name] === 'all') return true;
          var values = (card.getAttribute('data-' + name) || '').split(/\s+/);
          return values.indexOf(state[name]) !== -1;
        });
        card.hidden = !match;
        if (match) shown += 1;
      });
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
          group.querySelectorAll('button').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === btn));
          });
          render();
        });
      });
    });

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
      email: 'Geçerli bir e-posta adresi yazın. Örnek: ad@okul.k12.tr',
      phone: 'Telefon numarasını 10 ya da 11 haneli yazın.',
      type: 'Yarışma türünü seçin.',
      levels: 'En az bir seviye seçin.',
      topic: 'Konu alanını seçin.',
      count: 'Tahmini öğrenci sayısını seçin.',
      end: 'Bitiş tarihi başlangıçtan önce olamaz.',
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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) errors.push('email');
      var digits = f.phone.value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) errors.push('phone');
      if (!form.querySelector('input[name="type"]:checked')) errors.push('type');
      if (!form.querySelector('input[name="levels"]:checked')) errors.push('levels');
      ['topic', 'count'].forEach(function (n) {
        if (!f[n].value.trim()) errors.push(n);
      });
      if (f.start.value && f.end.value && f.end.value < f.start.value) errors.push('end');
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

  /* --- Başlat ------------------------------------------------------------ */
  initTheme();
  document.addEventListener('DOMContentLoaded', function () {
    initPasswordToggles();
    initFilters();
    initModals();
    initRequestForm();
    initVideos();
    initCountdown();
    initStickyShadow();
  });
})();
