/* Kekeme yönetim paneli — küçük yardımcılar. Sayfa JavaScript olmadan da çalışır. */
(function () {
  'use strict';

  function store(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }

  // --- Yazı boyu: Normal → Büyük → Çok büyük (tercih bu tarayıcıda hatırlanır) ---
  var root = document.documentElement;
  var SIZES = [['', 'Normal'], ['big', 'Büyük'], ['bigger', 'Çok büyük']];
  var sizeIx = Number(store(function (s) { return s.getItem('kk-yazi'); })) || 0;
  if (sizeIx < 0 || sizeIx > 2) sizeIx = 0;
  var applySize = function () {
    root.classList.remove('big', 'bigger');
    if (SIZES[sizeIx][0]) root.classList.add(SIZES[sizeIx][0]);
  };
  applySize();
  document.addEventListener('DOMContentLoaded', function () {
    var tb = document.querySelector('[data-textsize]');
    if (tb) {
      var sync = function () { tb.textContent = 'Yazı boyu: ' + SIZES[sizeIx][1]; };
      sync();
      tb.addEventListener('click', function () {
        sizeIx = (sizeIx + 1) % SIZES.length;
        store(function (s) { s.setItem('kk-yazi', String(sizeIx)); });
        applySize(); sync();
      });
    }

    // --- Yazdır ---
    document.querySelectorAll('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

    // --- Bildirimi kapat ---
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('.adm-flash').remove(); });
    });

    // --- Hata kutusuna odaklan ---
    var ef = document.querySelector('[data-focus]');
    if (ef) { ef.focus(); }

    // --- Şifreyi göster / gizle ---
    document.querySelectorAll('[data-pw-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var input = document.getElementById(b.getAttribute('data-pw-toggle'));
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        b.setAttribute('aria-pressed', show ? 'true' : 'false');
        b.textContent = show ? (b.textContent.indexOf('Şifre') === 0 ? 'Şifreyi gizle' : 'Gizle') : (b.textContent.indexOf('Şifre') === 0 ? 'Şifreyi göster' : 'Göster');
      });
    });

    // --- Onay isteyen formlar ---
    document.querySelectorAll('form[data-confirm]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        if (!window.confirm(f.getAttribute('data-confirm'))) e.preventDefault();
      });
    });

    // --- Fotoğraf önizleme ---
    document.querySelectorAll('[data-image-input]').forEach(function (input) {
      input.addEventListener('change', function () {
        var wrap = input.closest('.img-pick');
        var prev = wrap.querySelector('[data-preview]');
        var name = wrap.querySelector('[data-filename]');
        var file = input.files && input.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          name.textContent = 'Bu fotoğraf çok büyük (10 MB üstü). Lütfen daha küçük bir fotoğraf seçin.';
          input.value = '';
          return;
        }
        name.textContent = 'Seçilen: ' + file.name + ' — kaydettiğinizde yüklenecek.';
        var img = document.createElement('img');
        img.alt = 'Seçilen fotoğrafın önizlemesi';
        img.src = URL.createObjectURL(file);
        prev.textContent = '';
        prev.appendChild(img);
      });
    });

    // --- Etkinlik alanlarını yalnızca etkinlikte göster ---
    var kinds = document.querySelectorAll('[data-kind]');
    var ev = document.querySelector('[data-event-fields]');
    if (kinds.length && ev) {
      var upd = function () {
        var k = document.querySelector('[data-kind]:checked');
        ev.hidden = !(k && k.value === 'etkinlik');
      };
      kinds.forEach(function (k) { k.addEventListener('change', upd); });
      upd();
    }

    if (document.querySelector('.adm-flash')) {
      store(function (s) { var k = s.getItem('kk-temizle'); if (k) { s.removeItem(k); s.removeItem('kk-temizle'); } });
    }

    // --- Taslak koruma: yazılanlar bu tarayıcıda saklanır, kaybolmaz ---
    document.querySelectorAll('form[data-draft]').forEach(function (form) {
      var key = 'kk-taslak-' + form.getAttribute('data-draft');
      var status = form.querySelector('[data-draft-status]');
      var dirty = false;
      var fields = function () {
        return Array.prototype.filter.call(form.elements, function (el) {
          return el.name && el.name !== '_csrf' && el.type !== 'file' && el.type !== 'hidden' && el.type !== 'password';
        });
      };
      var snapshot = function () {
        var o = {};
        fields().forEach(function (el) {
          if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
          else if (el.type === 'checkbox') { o[el.name] = el.checked ? el.value : ''; }
          else o[el.name] = el.value;
        });
        return o;
      };
      var initial = JSON.stringify(snapshot());
      var restore = function (o) {
        fields().forEach(function (el) {
          if (!(el.name in o)) return;
          if (el.type === 'radio') el.checked = o[el.name] === el.value;
          else if (el.type === 'checkbox') el.checked = !!o[el.name];
          else el.value = o[el.name];
        });
      };

      var saved = store(function (s) { return s.getItem(key); });
      if (saved && saved !== initial && !document.querySelector('.adm-flash')) {
        var box = document.createElement('div');
        box.className = 'draft-offer';
        box.setAttribute('role', 'alert');
        box.innerHTML = '<p>Bu sayfada daha önce yazıp kaydetmediğiniz bir taslak var.</p>';
        var yes = document.createElement('button'); yes.type = 'button'; yes.className = 'abtn abtn--primary'; yes.textContent = 'Taslağı geri getir';
        var no = document.createElement('button'); no.type = 'button'; no.className = 'abtn abtn--line'; no.textContent = 'Hayır, sil';
        yes.onclick = function () { try { restore(JSON.parse(saved)); } catch (e) { /* bozuk taslak */ } box.remove(); dirty = true; };
        no.onclick = function () { store(function (s) { s.removeItem(key); }); box.remove(); };
        box.appendChild(yes); box.appendChild(no);
        form.parentNode.insertBefore(box, form);
      } else if (document.querySelector('.adm-flash')) {
        store(function (s) { s.removeItem(key); });
      }

      var timer;
      form.addEventListener('input', function () {
        dirty = true;
        clearTimeout(timer);
        timer = setTimeout(function () {
          var now = JSON.stringify(snapshot());
          if (now === initial) return;
          store(function (s) { s.setItem(key, now); });
          if (status) {
            var d = new Date();
            status.textContent = 'Yazdıklarınız bu bilgisayarda geçici olarak saklandı (' +
              ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2) + '). Sitede görünmesi için “Kaydet” düğmesine basın.';
          }
        }, 800);
      });
      form.addEventListener('submit', function (ev) {
        dirty = false;
        // Taslak, kayıt başarıyla onaylanınca (bir sonraki sayfada) silinir.
        store(function (s) { s.setItem('kk-temizle', key); });
        var btn = form.querySelector('button[type=submit]');
        // Başka bir denetim gönderimi durdurduysa düğmeyi kilitleme.
        setTimeout(function () {
          if (ev.defaultPrevented || !btn) return;
          btn.disabled = true; btn.textContent = 'Kaydediliyor…'; setTimeout(function () { btn.disabled = false; }, 8000);
        }, 0);
      });
      window.addEventListener('beforeunload', function (e) {
        if (dirty && JSON.stringify(snapshot()) !== initial) { e.preventDefault(); e.returnValue = ''; }
      });
    });

    // --- Oturumu canlı tut: kullanıcı yazıyorsa 4 dakikada bir sunucuya haber ver ---
    if (document.body.hasAttribute('data-keepalive')) {
      var active = false;
      ['input', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { active = true; }, true); });
      setInterval(function () {
        if (!active) return;
        active = false;
        fetch('/yonetim/canli', { credentials: 'same-origin', redirect: 'manual', cache: 'no-store' }).then(function (r) {
          if (r.status !== 204) { var b = document.querySelector('[data-session-lost]'); if (b) { b.hidden = false; b.scrollIntoView({ block: 'center' }); } }
        }).catch(function () {});
      }, 4 * 60 * 1000);
    }

    // --- Canlı önizleme: kitap sitede ve Google'da nasıl görünecek ---
    // Kitap türü: "Listede yok" seçilince yeni tür kutusu görünür ve zorunlu olur.
    document.querySelectorAll('[data-category]').forEach(function (box) {
      var sel = box.querySelector('select');
      var sub = box.querySelector('[data-category-new]');
      var inp = sub.querySelector('input');
      var sync = function () {
        var on = sel.value === '__yeni';
        sub.hidden = !on;
        inp.required = on;
        if (!on) inp.removeAttribute('aria-invalid');
      };
      sel.addEventListener('change', function () { sync(); if (sel.value === '__yeni') inp.focus(); });
      sync();
    });

    var pform = document.querySelector('[data-preview-form]');
    var pv = document.querySelector('[data-live-preview]');
    if (pform && pv) {
      pv.hidden = false;
      var siteTitle = document.title.split('·').pop().trim();
      var val = function (name) {
        var el = pform.elements[name];
        if (!el) return '';
        if (el.tagName === 'SELECT') return el.value ? el.options[el.selectedIndex].text : '';
        if (el.length && el[0] && el[0].type === 'radio') { for (var i = 0; i < el.length; i++) if (el[i].checked) return el[i].value; return ''; }
        return el.value.trim();
      };
      var setAll = function (key, text) {
        pv.querySelectorAll('[data-pv="' + key + '"]').forEach(function (n) { n.textContent = text; n.hidden = !text; });
      };
      var render = function () {
        var title = val('title') || 'Kitabın adı';
        var author = val('author_id') || val('new_author');
        setAll('title', title);
        setAll('author', author + (val('translator') ? ' · Çeviren: ' + val('translator') : ''));
        pv.querySelectorAll('.pv-blank [data-pv="author"]').forEach(function (n) { n.textContent = author; });
        setAll('price', val('price'));
        var st = { published: 'Yayında', soon: 'Yakında — “Sıradakiler”de görünür', draft: 'Gizli — sitede görünmez' }[val('status')] || '';
        setAll('status', st);
        pv.classList.toggle('preview--hidden', val('status') === 'draft');
        var shops = [];
        pform.querySelectorAll('[data-preview-shop]').forEach(function (el) { if (el.value.trim()) shops.push(el.getAttribute('data-preview-shop')); });
        setAll('shops', shops.length ? 'Satın al: ' + shops.join(' · ') : '');
        var t = title + ' · ' + siteTitle;
        setAll('serp-title', t.length > 62 ? t.slice(0, 60) + '…' : t);
        var d = (pform.elements.description ? pform.elements.description.value : '').replace(/\s+/g, ' ').trim();
        if (!d) d = title + (author ? ', ' + author : '') + '. ' + siteTitle + ' kitabı.';
        setAll('serp-desc', d.length > 158 ? d.slice(0, d.lastIndexOf(' ', 155)) + '…' : d);
      };
      pform.addEventListener('input', render);
      pform.addEventListener('change', render);
      // Yeni seçilen kapak fotoğrafı önizlemeye de gelsin
      var file = pform.querySelector('[data-image-input]');
      if (file) file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f || f.size > 10 * 1024 * 1024) return;
        var box = pv.querySelector('[data-pv-cover]');
        var img = box.querySelector('img');
        if (!img) { img = document.createElement('img'); img.alt = ''; box.insertBefore(img, box.firstChild); }
        img.src = URL.createObjectURL(f);
        box.querySelector('.pv-blank').hidden = true;
      });
      var rm = pform.querySelector('input[name=remove_image]');
      if (rm) rm.addEventListener('change', function () {
        var box = pv.querySelector('[data-pv-cover]'); var img = box.querySelector('img');
        if (img) img.hidden = rm.checked; box.querySelector('.pv-blank').hidden = !rm.checked && !!img;
      });
      render();
    }

    // --- Adım adım sihirbaz (yalnızca yeni kayıtta). JavaScript yoksa form tek sayfa çalışır. ---
    var wf = document.querySelector('form[data-wizard]');
    if (wf) {
      var steps = Array.prototype.slice.call(wf.querySelectorAll('fieldset.step'));
      var list = wf.querySelector('[data-wizard-steps]');
      var bar = wf.querySelector('.savebar');
      var submit = bar.querySelector('button[type=submit]');
      var cur = 0;
      wf.classList.add('is-wizard');
      list.hidden = false;
      steps.forEach(function (st, i) {
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = '<span class="ws__n">' + (i + 1) + '</span><span class="ws__t"></span>';
        b.querySelector('.ws__t').textContent = st.getAttribute('data-step-title');
        b.addEventListener('click', function () { go(i); });
        li.appendChild(b);
        list.appendChild(li);
      });
      var back = document.createElement('button'); back.type = 'button'; back.className = 'abtn abtn--line abtn--big'; back.textContent = '← Geri';
      var next = document.createElement('button'); next.type = 'button'; next.className = 'abtn abtn--primary abtn--big'; next.textContent = 'İleri →';
      var counter = document.createElement('p'); counter.className = 'wizard-count'; counter.setAttribute('aria-live', 'polite');
      bar.insertBefore(next, bar.firstChild);
      bar.insertBefore(back, bar.firstChild);
      bar.insertBefore(counter, bar.firstChild);
      submit.textContent = 'Kitabı ekle ✓';

      // 1. adımın zorunlu alanları: kitabın adı ve türü.
      var showErr = function (el, id, msg) {
        el.setAttribute('aria-invalid', 'true');
        if (!document.getElementById(id)) {
          var p = document.createElement('p'); p.id = id; p.className = 'f__err'; p.textContent = msg;
          el.parentNode.insertBefore(p, el);
        }
      };
      var clearErr = function (el, id) { el.removeAttribute('aria-invalid'); var e = document.getElementById(id); if (e) e.remove(); };
      var titleOk = function () {
        var t = wf.elements.title, c = wf.elements.category, n = wf.elements.new_category;
        var ok = true, firstBad = null;
        if (t.value.trim()) clearErr(t, 'err-title'); else { showErr(t, 'err-title', 'Devam etmek için kitabın adını yazın.'); ok = false; firstBad = firstBad || t; }
        if (c) {
          if (c.value) clearErr(c, 'err-category'); else { showErr(c, 'err-category', 'Devam etmek için listeden kitabın türünü seçin.'); ok = false; firstBad = firstBad || c; }
          if (c.value === '__yeni' && n) {
            if (n.value.trim()) clearErr(n, 'err-newcat'); else { showErr(n, 'err-newcat', 'Türün adını yazın.'); ok = false; firstBad = firstBad || n; }
          }
        }
        if (firstBad) firstBad.focus();
        return ok;
      };
      ['input', 'change'].forEach(function (ev) {
        wf.addEventListener(ev, function (e) {
          if (e.target.name === 'title' && e.target.value.trim()) clearErr(e.target, 'err-title');
          if (e.target.name === 'category' && e.target.value) clearErr(e.target, 'err-category');
          if (e.target.name === 'new_category' && e.target.value.trim()) clearErr(e.target, 'err-newcat');
        });
      });
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var go = function (i, initial) {
        var invalid = i > 0 && !titleOk();
        if (invalid) { i = 0; }
        cur = Math.max(0, Math.min(steps.length - 1, i));
        steps.forEach(function (st, k) { st.hidden = k !== cur; });
        list.querySelectorAll('li').forEach(function (li, k) {
          li.className = k === cur ? 'is-current' : (k < cur ? 'is-done' : '');
          var b = li.querySelector('button');
          if (k === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        });
        back.hidden = cur === 0;
        next.hidden = cur === steps.length - 1;
        submit.hidden = cur !== steps.length - 1;
        counter.textContent = 'Adım ' + (cur + 1) + ' / ' + steps.length;
        // Adımın ilk alanına odaklan: dosya düğmesi, seçili seçenek ya da ilk kutu.
        var first = steps[cur].querySelector('input[type=radio]:checked, input:not([type=hidden]):not([type=radio]), textarea, select');
        // Sayfanın en üstüne değil, adım çubuğuna kaydır; çubuk zaten görünüyorsa hiç kaydırma.
        // Böylece her adımda panelin başlığı ve menüsü yeniden araya girmez.
        if (!initial) {
          var r = list.getBoundingClientRect();
          if (r.top < 0 || r.top > window.innerHeight * 0.5) list.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
        }
        if (first && !invalid) setTimeout(function () { first.focus({ preventScroll: true }); }, initial || reduceMotion ? 0 : 250);
      };
      back.addEventListener('click', function () { go(cur - 1); });
      next.addEventListener('click', function () { go(cur + 1); });
      // Enter tuşu formu erkenden göndermesin, bir sonraki adıma geçsin.
      wf.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && cur < steps.length - 1) { e.preventDefault(); go(cur + 1); }
      });
      wf.addEventListener('submit', function (e) { if (!titleOk()) { e.preventDefault(); go(0); } });
      // Sunucu hata döndürdüyse ilk adımda başla (sayfa açılırken kaydırma yapılmaz).
      go(0, true);
    }
  });
})();
