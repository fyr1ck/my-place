// Celular: perfil e player viram dois icones no topo; tocar abre o card no meio da tela
// com zoom saindo do proprio icone.
(function (MP) {
  const el = {
    dock: document.getElementById('dock'),
    profile: document.getElementById('dockProfile'),
    np: document.getElementById('dockNp'),
    back: document.getElementById('overlayBack'),
    cards: {
      profile: document.getElementById('profile'),
      np: document.getElementById('np')
    }
  };

  if (!el.dock) return;

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  function open(kind) {
    if (!isMobile()) return;

    const card = el.cards[kind];
    const icon = kind === 'profile' ? el.profile : el.np;
    if (!card || !icon) return;

    // o zoom sai de onde o icone esta
    const box = card.getBoundingClientRect();
    const dot = icon.getBoundingClientRect();
    card.style.transformOrigin =
      `${(dot.left + dot.width / 2) - box.left}px ${(dot.top + dot.height / 2) - box.top}px`;

    document.body.dataset.overlay = kind;
  }

  function close() {
    delete document.body.dataset.overlay;
  }

  function toggle(kind) {
    if (document.body.dataset.overlay === kind) close();
    else open(kind);
  }

  el.profile.addEventListener('click', () => toggle('profile'));
  el.np.addEventListener('click', () => toggle('np'));
  el.back.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.dataset.overlay) close();
  });

  // fecha se a janela virar desktop com um card aberto
  window.addEventListener('resize', () => {
    if (!isMobile() && document.body.dataset.overlay) close();
  });

  // miniaturas dos icones, alimentadas pelo perfil e pelo player
  MP.dock = {
    setImage(kind, url, position) {
      const icon = kind === 'profile' ? el.profile : el.np;
      if (!icon) return;

      if (!url) {
        icon.style.backgroundImage = '';
        icon.dataset.has = 'false';
        return;
      }

      icon.style.backgroundImage = `url("${url}")`;
      icon.style.backgroundPosition = position || '50% 50%';
      icon.dataset.has = 'true';
    }
  };
})(window.MP);
