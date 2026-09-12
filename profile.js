// Perfil: foto e capa (imagem ou gif do aparelho), com enquadramento ajustavel, nome e bio.
(function (MP) {
  const KEY = 'mp.profile'; // { name, bio }
  const VIEW = 'mp.profileView'; // { avatar: { x, y, zoom }, banner: { x, y, zoom } }
  const COLORS = 'mp.profileColors'; // { top, bottom }
  const DEFAULT_COLORS = { top: '#3a3c40', bottom: '#26282d' };

  const el = {
    root: document.getElementById('profile'),
    banner: document.getElementById('pfBanner'),
    bannerPick: document.getElementById('pfBannerPick'),
    bannerClear: document.getElementById('pfBannerClear'),
    avatar: document.getElementById('pfAvatar'),
    avatarClear: document.getElementById('pfAvatarClear'),
    name: document.getElementById('pfName'),
    bio: document.getElementById('pfBio'),
    picker: document.getElementById('pfPicker'),
    paint: document.getElementById('pfPaint'),
    palette: document.getElementById('pfPalette'),
    top: document.getElementById('pfTop'),
    bottom: document.getElementById('pfBottom'),
    topHex: document.getElementById('pfTopHex'),
    bottomHex: document.getElementById('pfBottomHex'),
    resetColor: document.getElementById('pfResetColor'),
    logout: document.getElementById('pfLogout')
  };

  if (!el.root) return;

  const urls = {};
  const natural = {}; // tamanho real de cada imagem, para calcular o enquadramento
  const views = MP.read(VIEW, {});

  let pending = null;
  let timer = null;
  let justDragged = false;

  const node = (kind) => (kind === 'banner' ? el.banner : el.avatar);
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // ---------- texto ----------

  const load = () => MP.read(KEY, { name: '', bio: '' });

  function save() {
    MP.write(KEY, { name: el.name.value, bio: el.bio.value });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(save, 400);
  }

  function grow() {
    el.bio.style.height = 'auto';
    el.bio.style.height = `${el.bio.scrollHeight}px`;
  }

  // ---------- enquadramento ----------

  function view(kind) {
    const v = views[kind] || {};
    return {
      x: typeof v.x === 'number' ? v.x : 50,
      y: typeof v.y === 'number' ? v.y : 50,
      zoom: typeof v.zoom === 'number' ? v.zoom : 1
    };
  }

  function setView(kind, next) {
    views[kind] = next;
    apply(kind);
  }

  const saveViews = () => MP.write(VIEW, views);

  // quanto a imagem "sobra" para cada lado, em pixels
  function metrics(kind) {
    const target = node(kind);
    const nat = natural[kind];
    const cw = target.clientWidth;
    const ch = target.clientHeight;

    if (!nat || !nat.w || !nat.h || !cw || !ch) return null;

    const scale = Math.max(cw / nat.w, ch / nat.h) * view(kind).zoom;
    const w = nat.w * scale;
    const h = nat.h * scale;

    return { w, h, overflowX: Math.max(0, w - cw), overflowY: Math.max(0, h - ch) };
  }

  function apply(kind) {
    const target = node(kind);
    if (target.dataset.has !== 'true') return;

    const m = metrics(kind);
    if (!m) return;

    const v = view(kind);
    target.style.backgroundSize = `${m.w}px ${m.h}px`;
    target.style.backgroundPosition = `${v.x}% ${v.y}%`;
  }

  // arrastar para posicionar, roda do mouse para zoom, duplo clique para centralizar
  function enableFraming(kind) {
    const target = node(kind);
    let drag = null;

    target.addEventListener('pointerdown', (e) => {
      if (target.dataset.has !== 'true') return;
      if (e.target.closest('.profile__act, .profile__clear, .profile__badge')) return;

      const m = metrics(kind);
      if (!m || (!m.overflowX && !m.overflowY)) return;

      const v = view(kind);
      drag = { px: e.clientX, py: e.clientY, x: v.x, y: v.y, m, moved: false };
      target.dataset.dragging = 'true';
      try { target.setPointerCapture(e.pointerId); } catch (_) {}
    });

    target.addEventListener('pointermove', (e) => {
      if (!drag) return;

      const dx = e.clientX - drag.px;
      const dy = e.clientY - drag.py;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;

      const v = view(kind);
      setView(kind, {
        zoom: v.zoom,
        x: drag.m.overflowX ? clamp(drag.x - (dx / drag.m.overflowX) * 100, 0, 100) : v.x,
        y: drag.m.overflowY ? clamp(drag.y - (dy / drag.m.overflowY) * 100, 0, 100) : v.y
      });
    });

    function end() {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      delete target.dataset.dragging;

      if (moved) {
        saveViews();
        // evita que o clique de soltar o mouse abra o seletor de arquivo
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 0);
      }
    }

    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);

    target.addEventListener('wheel', (e) => {
      if (target.dataset.has !== 'true') return;
      e.preventDefault();

      const v = view(kind);
      setView(kind, { ...v, zoom: clamp(v.zoom * (1 - e.deltaY * 0.0015), 1, 4) });

      clearTimeout(target._zoomTimer);
      target._zoomTimer = setTimeout(saveViews, 300);
    }, { passive: false });

    target.addEventListener('dblclick', () => {
      if (target.dataset.has !== 'true') return;
      setView(kind, { x: 50, y: 50, zoom: 1 });
      saveViews();
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 0);
    });
  }

  // ---------- imagens ----------

  async function renderImage(kind) {
    let record = null;
    try {
      record = await MP.images.get(kind);
    } catch (err) {
      console.warn('nao deu para ler a imagem do perfil', kind, err);
    }

    if (urls[kind]) {
      URL.revokeObjectURL(urls[kind]);
      delete urls[kind];
    }

    const target = node(kind);
    const clearBtn = kind === 'banner' ? el.bannerClear : el.avatarClear;

    if (!record || !record.blob) {
      target.style.backgroundImage = '';
      target.style.backgroundSize = '';
      target.style.backgroundPosition = '';
      target.dataset.has = 'false';
      clearBtn.hidden = true;
      delete natural[kind];
      if (kind === 'avatar' && MP.dock) MP.dock.setImage('profile', null);
      return;
    }

    const url = URL.createObjectURL(record.blob);
    urls[kind] = url;
    target.style.backgroundImage = `url("${url}")`;
    target.dataset.has = 'true';
    clearBtn.hidden = false;

    if (kind === 'avatar' && MP.dock) {
      const v = view('avatar');
      MP.dock.setImage('profile', url, `${v.x}% ${v.y}%`);
    }

    // precisa do tamanho real para saber o quanto da para arrastar
    const img = new Image();
    img.onload = () => {
      natural[kind] = { w: img.naturalWidth, h: img.naturalHeight };
      apply(kind);
    };
    img.src = url;
  }

  function pick(kind) {
    pending = kind;
    el.picker.value = '';
    el.picker.click();
  }

  el.picker.addEventListener('change', async () => {
    const file = el.picker.files && el.picker.files[0];
    if (!file || !pending) return;

    const kind = pending;
    pending = null;

    try {
      await MP.images.put(kind, file);
      views[kind] = { x: 50, y: 50, zoom: 1 }; // imagem nova comeca centralizada
      saveViews();
      await renderImage(kind);
    } catch (err) {
      console.warn('nao deu para guardar a imagem', err);
    }
  });

  async function remove(kind) {
    try {
      await MP.images.del(kind);
    } catch (err) {
      console.warn('nao deu para apagar a imagem', err);
    }
    delete views[kind];
    saveViews();
    renderImage(kind);
  }

  // ---------- cor do widget ----------

  let colors = MP.read(COLORS, null);

  function applyColors() {
    if (colors && colors.top && colors.bottom) {
      el.root.style.backgroundColor = colors.bottom;
      el.root.style.backgroundImage =
        `linear-gradient(180deg, ${colors.top} 0%, ${colors.bottom} 100%)`;
      el.root.dataset.tinted = 'true';
    } else {
      el.root.style.backgroundColor = '';
      el.root.style.backgroundImage = '';
      delete el.root.dataset.tinted;
    }

    const shown = colors || DEFAULT_COLORS;
    el.top.value = shown.top;
    el.bottom.value = shown.bottom;
    el.topHex.textContent = shown.top;
    el.bottomHex.textContent = shown.bottom;
  }

  let colorTimer = null;

  function pickColor() {
    colors = { top: el.top.value, bottom: el.bottom.value };
    applyColors();
    clearTimeout(colorTimer);
    colorTimer = setTimeout(() => MP.write(COLORS, colors), 250);
  }

  el.paint.addEventListener('click', (e) => {
    e.stopPropagation();
    el.palette.hidden = !el.palette.hidden;
  });

  el.top.addEventListener('input', pickColor);
  el.bottom.addEventListener('input', pickColor);

  el.resetColor.addEventListener('click', () => {
    colors = null;
    clearTimeout(colorTimer);
    try { localStorage.removeItem(COLORS); } catch (_) {}
    applyColors();
  });

  // clique fora fecha a paleta
  document.addEventListener('click', (e) => {
    if (el.palette.hidden) return;
    if (!el.palette.contains(e.target) && e.target !== el.paint) el.palette.hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.palette.hidden) el.palette.hidden = true;
  });

  // ---------- eventos ----------

  el.avatar.addEventListener('click', () => {
    if (justDragged) return;
    pick('avatar');
  });

  el.bannerPick.addEventListener('click', (e) => {
    e.stopPropagation();
    pick('banner');
  });

  el.avatarClear.addEventListener('click', (e) => {
    e.stopPropagation();
    remove('avatar');
  });

  el.bannerClear.addEventListener('click', (e) => {
    e.stopPropagation();
    remove('banner');
  });

  if (el.logout) {
    el.logout.addEventListener('click', () => {
      if (MP.logout) MP.logout();
    });
  }

  el.name.addEventListener('input', schedule);
  el.bio.addEventListener('input', () => { grow(); schedule(); });
  el.name.addEventListener('blur', save);
  el.bio.addEventListener('blur', save);

  el.name.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el.bio.focus(); }
  });

  window.addEventListener('resize', () => {
    grow();
    apply('avatar');
    apply('banner');
  });

  // ---------- inicio ----------

  const saved = load();
  el.name.value = saved.name || '';
  el.bio.value = saved.bio || '';
  grow();
  applyColors();

  enableFraming('avatar');
  enableFraming('banner');

  renderImage('avatar');
  renderImage('banner');
})(window.MP);
