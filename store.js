// Base compartilhada: helpers de DOM, datas, localStorage e binarios (IndexedDB).
window.MP = (function () {
  // ---------- DOM ----------

  function h(tag, attrs, ...kids) {
    const node = document.createElement(tag);

    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'svg') node.innerHTML = svg(v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    }

    kids.flat(3).forEach((kid) => {
      if (kid === null || kid === undefined || kid === false) return;
      node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    });

    return node;
  }

  // envolve um path/markup de icone no <svg> padrao
  function svg(inner) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  // ---------- storage ----------

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('nao deu para salvar', key, err);
    }
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------- datas ----------

  const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  // semana comecando na segunda
  const WEEKDAYS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
  const WEEKDAYS_MIN = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  function iso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const today = () => iso(new Date());

  // indice do dia da semana com segunda = 0
  const weekIndex = (date) => (date.getDay() + 6) % 7;

  function parseISO(value) {
    const [y, m, d] = String(value).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function fmtDate(value, opts = {}) {
    const date = parseISO(value);
    const day = date.getDate();
    const month = opts.short ? MONTHS_SHORT[date.getMonth()] : MONTHS[date.getMonth()].toLowerCase();
    const base = `${day} de ${month}`;
    return opts.weekday ? `${WEEKDAYS[weekIndex(date)]}, ${base}` : base;
  }

  function fmtSize(bytes) {
    if (!bytes) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  }

  // ---------- folha modal ----------

  const sheet = {
    el: document.getElementById('sheet'),
    title: document.getElementById('sheetTitle'),
    body: document.getElementById('sheetBody'),

    // opts.center: abre centralizado na tela em vez de subir de baixo
    open(title, content, opts = {}) {
      this.title.textContent = title;
      clear(this.body).append(content);
      this.el.classList.toggle('sheet--center', Boolean(opts.center));
      this.el.hidden = false;
      requestAnimationFrame(() => this.el.classList.add('sheet--in'));
    },

    close() {
      this.el.classList.remove('sheet--in');
      setTimeout(() => { this.el.hidden = true; clear(this.body); }, 260);
    }
  };

  document.getElementById('sheetClose').addEventListener('click', () => sheet.close());
  document.getElementById('sheetBackdrop').addEventListener('click', () => sheet.close());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.el.hidden) sheet.close();
  });

  // ---------- pecas de formulario (usadas nas folhas centralizadas) ----------

  function field(label, ...controls) {
    return h('div', { class: 'field' },
      h('label', { class: 'field__label', text: label }),
      controls
    );
  }

  // linha com Cancelar + botao de confirmar
  function actions(submitLabel, onSubmit) {
    return h('div', { class: 'modal-actions' },
      h('button', { class: 'btn', type: 'button', text: 'Cancelar', onclick: () => sheet.close() }),
      h('button', { class: 'btn btn--blue', type: 'button', text: submitLabel, onclick: onSubmit })
    );
  }

  // marca o campo como invalido ate a pessoa digitar algo
  function invalid(input) {
    input.classList.add('input--invalid');
    input.focus();
    input.addEventListener('input', () => input.classList.remove('input--invalid'), { once: true });
  }

  // ---------- binarios (IndexedDB) ----------
  // 'files' guarda a secao Arquivos; 'profile' guarda foto e capa do perfil.

  const store = (function () {
    const NAME = 'myplace';
    const VERSION = 2;
    const STORES = ['files', 'profile'];
    let handle = null;

    function open() {
      if (handle) return Promise.resolve(handle);

      return new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);

        req.onupgradeneeded = () => {
          STORES.forEach((name) => {
            if (!req.result.objectStoreNames.contains(name)) {
              req.result.createObjectStore(name, { keyPath: 'id' });
            }
          });
        };

        req.onsuccess = () => { handle = req.result; resolve(handle); };
        req.onerror = () => reject(req.error);
      });
    }

    function tx(name, mode, run) {
      return open().then((database) => new Promise((resolve, reject) => {
        const req = run(database.transaction(name, mode).objectStore(name));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }));
    }

    return { tx };
  })();

  const files = {
    async put(file) {
      const record = {
        id: uid(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        added: new Date().toISOString(),
        blob: file
      };
      await store.tx('files', 'readwrite', (s) => s.put(record));
      return record;
    },

    list() {
      return store.tx('files', 'readonly', (s) => s.getAll())
        .then((all) => all.sort((a, b) => b.added.localeCompare(a.added)));
    },

    del(id) {
      return store.tx('files', 'readwrite', (s) => s.delete(id));
    }
  };

  // imagens do perfil, uma por id ('avatar' | 'banner')
  const images = {
    put(id, file) {
      return store.tx('profile', 'readwrite', (s) => s.put({ id, type: file.type, blob: file }));
    },

    get(id) {
      return store.tx('profile', 'readonly', (s) => s.get(id));
    },

    del(id) {
      return store.tx('profile', 'readwrite', (s) => s.delete(id));
    }
  };

  return {
    h, svg, clear, read, write, uid,
    MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_MIN,
    iso, today, parseISO, weekIndex, fmtDate, fmtSize,
    sheet, field, actions, invalid, files, images,
    views: {} // cada modulo se registra aqui
  };
})();
