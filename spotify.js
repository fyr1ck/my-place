// Widget "Tocando agora" com Spotify Web API (fluxo OAuth PKCE, sem servidor/secret).
(function (MP) {
  const SCOPES = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-modify-playback-state'
  ].join(' ');

  const AUTH_URL = 'https://accounts.spotify.com/authorize';
  const TOKEN_URL = 'https://accounts.spotify.com/api/token';
  const API = 'https://api.spotify.com/v1';
  const POLL_MS = 5000;

  // O Client ID nao e segredo: no fluxo PKCE ele vai na propria URL de autorizacao, visivel
  // na barra do navegador. Sem os Redirect URIs cadastrados no app do Spotify ele nao serve
  // para nada, e nao existe client secret aqui.
  const CLIENT_ID = '06834985f77b46869f100da21bbf119e';

  const KEY_VERIFIER = 'sp.verifier';
  const KEY_TOKENS = 'sp.tokens';

  const el = {};
  [
    'np', 'npArt', 'npDevice', 'npTitle', 'npBadge', 'npArtist', 'npSeek', 'npElapsed',
    'npRemain', 'npPrev', 'npToggle', 'npNext', 'npCast', 'npDevices', 'npVol',
    'npConnect', 'npHint'
  ].forEach((id) => {
    el[id.replace(/^np/, '').replace(/^./, (c) => c.toLowerCase()) || 'np'] =
      document.getElementById(id);
  });

  if (!el.np) return;

  // ---------- util ----------

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    },
    del(key) {
      try { localStorage.removeItem(key); } catch (_) {}
    }
  };

  const redirectUri = location.origin + location.pathname;
  const isLocalFile = location.protocol === 'file:';

  function fmt(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  function hint(html) {
    el.hint.innerHTML = html || '';
  }

  function randomString(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const bytes = crypto.getRandomValues(new Uint8Array(len));
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
  }

  async function challenge(verifier) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // ---------- auth ----------

  const clientId = () => CLIENT_ID;

  async function beginAuth() {
    if (isLocalFile) {
      hint('O login do Spotify nao funciona abrindo o arquivo direto. ' +
           'Rode o servidor local e acesse por http://127.0.0.1:5173');
      return;
    }

    const verifier = randomString(64);
    store.set(KEY_VERIFIER, verifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: await challenge(verifier),
      scope: SCOPES
    });

    location.href = `${AUTH_URL}?${params}`;
  }

  async function exchange(body) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.error || 'falha no token');

    const tokens = {
      access: data.access_token,
      refresh: data.refresh_token || store.get(KEY_TOKENS, {}).refresh,
      expires: Date.now() + (data.expires_in || 3600) * 1000 - 30000
    };

    store.set(KEY_TOKENS, tokens);
    return tokens;
  }

  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    const code = q.get('code');
    const error = q.get('error');

    if (!code && !error) return false;

    history.replaceState({}, '', redirectUri);

    if (error) {
      hint(`Login cancelado (${error}).`);
      return false;
    }

    const verifier = store.get(KEY_VERIFIER, '');
    store.del(KEY_VERIFIER);

    try {
      await exchange({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId(),
        code_verifier: verifier
      });
      return true;
    } catch (err) {
      hint(`Não deu para autenticar: ${err.message}`);
      return false;
    }
  }

  async function token() {
    const tokens = store.get(KEY_TOKENS, null);
    if (!tokens || !tokens.access) return null;
    if (Date.now() < tokens.expires) return tokens.access;
    if (!tokens.refresh) return null;

    try {
      const fresh = await exchange({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh,
        client_id: clientId()
      });
      return fresh.access;
    } catch (_) {
      store.del(KEY_TOKENS);
      return null;
    }
  }

  async function api(path, options = {}) {
    const access = await token();
    if (!access) {
      disconnect();
      return null;
    }

    const res = await fetch(API + path, {
      ...options,
      headers: { Authorization: `Bearer ${access}`, ...(options.headers || {}) }
    });

    if (res.status === 401) {
      store.del(KEY_TOKENS);
      disconnect();
      return null;
    }

    // 403: sem Premium, 404: nenhum aparelho ativo, 429: limite de requisicoes
    if (res.status === 403) { note('requer Premium'); return null; }
    if (res.status === 404) { note('sem aparelho ativo'); return null; }
    if (res.status === 429) { note('muitas requisições'); return null; }

    if (res.status === 204) return { empty: true };
    if (!res.ok) return null;

    return res.status === 200 ? res.json().catch(() => ({})) : {};
  }

  // ---------- render ----------

  let timer = null;
  let live = false; // sessao ativa com o Spotify (falso no modo demo)
  let scrubbing = false;
  let sync = { progress: 0, duration: 0, playing: false, at: 0 };

  const artPlaceholder = el.art.innerHTML;

  // mensagem temporaria no lugar do nome do aparelho
  function note(text) {
    el.device.textContent = text;
    clearTimeout(note.t);
    note.t = setTimeout(() => poll(), 2500);
  }

  function disconnect() {
    live = false;
    clearInterval(timer);
    el.np.dataset.state = 'disconnected';
    el.np.removeAttribute('data-playing');
    el.devices.hidden = true;
  }

  function renderArt(url) {
    if (MP && MP.dock) MP.dock.setImage('np', url || null);

    if (!url) {
      if (el.art.dataset.src) {
        el.art.dataset.src = '';
        el.art.innerHTML = artPlaceholder;
      }
      return;
    }
    if (el.art.dataset.src === url) return;

    el.art.dataset.src = url;
    el.art.innerHTML = '';
    const img = new Image();
    img.src = url;
    img.alt = '';
    el.art.appendChild(img);
  }

  function renderTrack(item, data) {
    const playing = Boolean(data.is_playing);
    const artists = (item.artists || []).map((a) => a.name).join(', ');
    const art = ((item.album && item.album.images) || []).slice().sort((a, b) => b.width - a.width)[0];

    el.np.dataset.state = 'playing';
    el.np.dataset.playing = String(playing);
    el.device.textContent = (data.device && data.device.name) || 'Spotify';
    el.title.textContent = item.name || 'Sem título';
    el.badge.hidden = !item.explicit;
    el.artist.textContent = artists || 'Desconhecido';
    renderArt(art && art.url);

    const vol = data.device && data.device.volume_percent;
    if (typeof vol === 'number' && document.activeElement !== el.vol) setVolume(vol);
  }

  function renderIdle() {
    el.np.dataset.state = 'idle';
    el.np.dataset.playing = 'false';
    el.device.textContent = 'Spotify';
    el.title.textContent = 'Nada tocando';
    el.badge.hidden = true;
    el.artist.textContent = 'Abra algo no Spotify';
    el.elapsed.textContent = '0:00';
    el.remain.textContent = '-0:00';
    setSeek(0);
    renderArt(null);
    sync = { progress: 0, duration: 0, playing: false, at: 0 };
  }

  function setSeek(pct) {
    el.seek.value = String(Math.round(pct * 10));
    el.seek.style.setProperty('--p', `${pct}%`);
  }

  function setVolume(pct) {
    el.vol.value = String(pct);
    el.vol.style.setProperty('--p', `${pct}%`);
  }

  function position() {
    const drift = sync.playing ? Date.now() - sync.at : 0;
    return Math.min(sync.progress + drift, sync.duration);
  }

  function tick() {
    if (!sync.duration || scrubbing) return;

    const p = position();
    setSeek((p / sync.duration) * 100);
    el.elapsed.textContent = fmt(p);
    el.remain.textContent = `-${fmt(sync.duration - p)}`;
  }

  // ---------- polling ----------

  async function poll() {
    if (document.hidden) return;

    const data = await api('/me/player');
    if (!data) return;

    if (data.empty || !data.item) {
      renderIdle();
      return;
    }

    renderTrack(data.item, data);
    sync = {
      progress: data.progress_ms || 0,
      duration: data.item.duration_ms || 0,
      playing: Boolean(data.is_playing),
      at: Date.now()
    };
    tick();
  }

  function startPolling() {
    live = true;
    clearInterval(timer);
    timer = setInterval(poll, POLL_MS);
    poll();
  }

  // controle otimista: muda a UI na hora e confirma no proximo poll
  async function command(action) {
    if (!live) return;

    if (action === 'toggle') {
      const playing = sync.playing;
      sync.progress = position();
      sync.playing = !playing;
      sync.at = Date.now();
      el.np.dataset.playing = String(!playing);
      await api(playing ? '/me/player/pause' : '/me/player/play', { method: 'PUT' });
    } else {
      await api(`/me/player/${action}`, { method: 'POST' });
    }

    setTimeout(poll, 400);
  }

  async function seekTo(ms) {
    sync.progress = ms;
    sync.at = Date.now();
    await api(`/me/player/seek?position_ms=${Math.round(ms)}`, { method: 'PUT' });
    setTimeout(poll, 400);
  }

  async function showDevices() {
    if (!live) return;

    if (!el.devices.hidden) {
      el.devices.hidden = true;
      return;
    }

    el.devices.innerHTML = '<p>Carregando...</p>';
    el.devices.hidden = false;

    const data = await api('/me/player/devices');
    const list = (data && data.devices) || [];

    if (!list.length) {
      el.devices.innerHTML = '<p>Nenhum aparelho encontrado</p>';
      return;
    }

    el.devices.innerHTML = '';
    list.forEach((device) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = device.name;
      btn.dataset.active = String(Boolean(device.is_active));
      btn.addEventListener('click', async () => {
        el.devices.hidden = true;
        await api('/me/player', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_ids: [device.id], play: sync.playing })
        });
        setTimeout(poll, 600);
      });
      el.devices.appendChild(btn);
    });
  }

  // ---------- demo (?demo=1) para ver o layout sem conectar ----------

  function demo() {
    const art =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#7b5cff"/><stop offset="0.55" stop-color="#ff5c8a"/>' +
        '<stop offset="1" stop-color="#ffb15c"/></linearGradient></defs>' +
        '<rect width="600" height="600" fill="url(#g)"/></svg>'
      );

    renderTrack(
      {
        name: 'Heartless',
        artists: [{ name: 'The Weeknd' }],
        album: { images: [{ url: art, width: 600 }] },
        duration_ms: 199000,
        explicit: true
      },
      { is_playing: true, device: { name: 'iPhone', volume_percent: 62 } }
    );

    sync = { progress: 117000, duration: 199000, playing: true, at: Date.now() };
    tick();
  }

  // ---------- init ----------

  el.connect.addEventListener('click', beginAuth);
  el.prev.addEventListener('click', () => command('previous'));
  el.next.addEventListener('click', () => command('next'));
  el.toggle.addEventListener('click', () => command('toggle'));
  el.cast.addEventListener('click', showDevices);

  document.addEventListener('click', (e) => {
    if (!el.devices.hidden && !el.devices.contains(e.target) && !el.cast.contains(e.target)) {
      el.devices.hidden = true;
    }
  });

  el.seek.addEventListener('pointerdown', () => { scrubbing = true; });

  el.seek.addEventListener('input', () => {
    scrubbing = true;
    const pct = Number(el.seek.value) / 10;
    el.seek.style.setProperty('--p', `${pct}%`);
    if (sync.duration) {
      const p = (pct / 100) * sync.duration;
      el.elapsed.textContent = fmt(p);
      el.remain.textContent = `-${fmt(sync.duration - p)}`;
    }
  });

  el.seek.addEventListener('change', () => {
    scrubbing = false;
    if (live && sync.duration) seekTo((Number(el.seek.value) / 1000) * sync.duration);
  });

  el.vol.addEventListener('input', () => {
    el.vol.style.setProperty('--p', `${el.vol.value}%`);
  });

  el.vol.addEventListener('change', () => {
    if (live) api(`/me/player/volume?volume_percent=${el.vol.value}`, { method: 'PUT' });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && live) poll();
  });

  setInterval(tick, 500);
  setVolume(70);

  (async function start() {
    if (new URLSearchParams(location.search).get('demo') === '1') {
      demo();
      return;
    }

    const justLoggedIn = await handleRedirect();
    const access = await token();

    if (access || justLoggedIn) {
      renderIdle();
      startPolling();
      return;
    }

    disconnect();

    if (isLocalFile) {
      hint('Abra o site por http://127.0.0.1:5173 para o login funcionar.');
    }
  })();
})(window.MP);
