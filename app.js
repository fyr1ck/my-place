// Shell: barra de abas, titulo e troca de secao.
(function (MP) {
  const TABS = [
    { id: 'inicio', label: 'Início', icon: '<path d="M4 10.8 12 4.5l8 6.3V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.2Z"/><path d="M9.6 20.5v-6h4.8v6"/>' },
    { id: 'calendario', label: 'Calendário', icon: '<rect x="3" y="4.5" width="18" height="16" rx="4"/><path d="M3 9.5h18M8 3v3M16 3v3"/>' },
    { id: 'tarefas', label: 'Tarefas', icon: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.6 2.6 4.8-5.2"/>' },
    { id: 'anotacoes', label: 'Anotações', icon: '<path d="M5.5 4.5h9L19 9v10.5h-13z"/><path d="M8.5 12h7M8.5 15.5h5"/>' },
    { id: 'arquivos', label: 'Arquivos', icon: '<path d="M3.5 8.2c0-1.4 1-2.4 2.4-2.4h2.9l2 2.2h6.3c1.4 0 2.4 1 2.4 2.4v6.4c0 1.4-1 2.4-2.4 2.4H5.9c-1.4 0-2.4-1-2.4-2.4Z"/>' },
    { id: 'rotina', label: 'Rotina', icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>' },
    { id: 'academia', label: 'Academia', icon: '<path d="M6.5 9v6M4 10.5v3M17.5 9v6M20 10.5v3M6.5 12h11"/>' }
  ];

  const app = document.getElementById('app');
  const tabbar = document.getElementById('tabbar');
  const view = document.getElementById('view');
  const titleEl = document.getElementById('appTitle');
  const dateEl = document.getElementById('appDate');

  let active = null;
  let mounted = null;

  function show(id) {
    const tab = TABS.find((t) => t.id === id) || TABS[0];
    const module = MP.views[tab.id];

    // direcao da animacao: para a direita se a aba nova esta mais adiante
    const from = TABS.findIndex((t) => t.id === active);
    const to = TABS.findIndex((t) => t.id === tab.id);
    app.dataset.dir = from > -1 && to < from ? 'prev' : 'next';

    active = tab.id;

    const label = module && module.title;
    titleEl.textContent = (typeof label === 'function' ? label() : label) || tab.label;

    tabbar.querySelectorAll('.tabbar__item').forEach((btn) => {
      btn.dataset.on = String(btn.dataset.id === active);
    });

    if (mounted && mounted.unmount) mounted.unmount();
    mounted = module || null;

    MP.clear(view);
    if (module) module.mount(view);
    else view.append(MP.h('p', { class: 'empty-line', text: 'Seção não carregada.' }));

    // reinicia a animacao de entrada
    app.classList.remove('app--switch');
    void app.offsetWidth;
    app.classList.add('app--switch');
  }

  // usado pelos widgets do Inicio
  MP.go = show;

  TABS.forEach((tab) => {
    tabbar.append(MP.h('button', {
      class: 'tabbar__item',
      type: 'button',
      dataset: { id: tab.id, on: 'false' },
      onclick: () => show(tab.id)
    },
      MP.h('span', { class: 'tabbar__icon', svg: tab.icon }),
      MP.h('span', { class: 'tabbar__label', text: tab.label })
    ));
  });

  dateEl.textContent = MP.fmtDate(MP.today(), { weekday: true });

  // sempre abre no Inicio
  show('inicio');
})(window.MP);
