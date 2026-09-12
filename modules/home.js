// Inicio: painel com widgets no estilo iOS, cada um levando para a sua secao.
(function (MP) {
  const ICONS = {
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>',
    tasks: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.6 2.6 4.8-5.2"/>',
    notes: '<path d="M5.5 4.5h9L19 9v10.5h-13z"/><path d="M8.5 12h7M8.5 15.5h5"/>',
    files: '<path d="M3.5 8.2c0-1.4 1-2.4 2.4-2.4h2.9l2 2.2h6.3c1.4 0 2.4 1 2.4 2.4v6.4c0 1.4-1 2.4-2.4 2.4H5.9c-1.4 0-2.4-1-2.4-2.4Z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="4"/><path d="M3 9.5h18M8 3v3M16 3v3"/>',
    gym: '<path d="M6.5 9v6M4 10.5v3M17.5 9v6M20 10.5v3M6.5 12h11"/>'
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const hhmm = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // um widget: cabecalho, valor grande e uma linha de apoio
  function tile(opts) {
    const tag = opts.to ? 'button' : 'div';

    return MP.h(tag, {
      class: `tile${opts.wide ? ' tile--wide' : ''}`,
      type: opts.to ? 'button' : null,
      dataset: opts.tone ? { tone: opts.tone } : null,
      onclick: opts.to ? () => MP.go(opts.to) : null
    },
      MP.h('span', { class: 'tile__head' },
        MP.h('i', { class: 'tile__icon', svg: ICONS[opts.icon] }),
        opts.label
      ),
      MP.h('strong', { class: `tile__value${opts.big ? ' tile__value--big' : ''}`, text: opts.value }),
      MP.h('span', { class: 'tile__note', text: opts.note }),
      opts.bar !== undefined
        ? MP.h('div', { class: 'tile__bar' },
            MP.h('i', { class: 'tile__fill', style: `width:${opts.bar}%` })
          )
        : null
    );
  }

  let clockTimer = null;

  MP.views.inicio = {
    title: () => {
      const name = (MP.read('mp.profile', {}) || {}).name;
      const first = (name || '').trim().split(' ')[0];
      return first ? `${greeting()}, ${first}.` : `${greeting()}.`;
    },

    unmount() {
      clearInterval(clockTimer);
      clockTimer = null;
      if (MP.weather) MP.weather.stop();
    },

    mount(root) {
      const today = MP.today();
      const grid = MP.h('div', { class: 'home' });

      // ---------- relogio ----------
      const clock = tile({
        icon: 'clock',
        label: 'Hoje',
        value: hhmm(),
        note: MP.fmtDate(today, { weekday: true }),
        big: true,
        wide: true
      });

      grid.append(clock);

      clearInterval(clockTimer);
      clockTimer = setInterval(() => {
        const value = clock.querySelector('.tile__value');
        if (value) value.textContent = hhmm();
      }, 10000);

      // ---------- tempo ----------
      if (MP.weather) grid.append(MP.weather.tile());

      // ---------- tarefas ----------
      const tasks = MP.read('mp.tasks', []);
      const open = tasks.filter((t) => !t.done);
      const late = open.filter((t) => t.due && t.due < today).length;

      grid.append(tile({
        icon: 'tasks',
        label: 'Tarefas',
        value: open.length ? String(open.length) : '0',
        note: !tasks.length ? 'nada por aqui'
          : !open.length ? 'tudo concluído'
            : late ? `${open.length === 1 ? 'aberta' : 'abertas'} · ${late} atrasada(s)`
              : (open.length === 1 ? 'aberta' : 'abertas'),
        tone: late ? 'red' : null,
        to: 'tarefas'
      }));

      // ---------- rotina ----------
      const routine = MP.read('mp.routine', []);
      const doneToday = (MP.read('mp.routineLog', {})[today] || []).length;
      const pct = routine.length ? Math.round((doneToday / routine.length) * 100) : 0;

      grid.append(tile({
        icon: 'clock',
        label: 'Rotina',
        value: routine.length ? `${doneToday}/${routine.length}` : '0',
        note: !routine.length ? 'sem itens'
          : doneToday === routine.length ? 'dia completo' : 'de hoje',
        tone: routine.length && doneToday === routine.length ? 'green' : null,
        bar: routine.length ? pct : undefined,
        to: 'rotina'
      }));

      // ---------- calendario ----------
      const cal = MP.read('mp.calendar', {});
      const entries = cal[today] || [];
      const next = entries[0];

      grid.append(tile({
        icon: 'calendar',
        label: 'Calendário',
        value: entries.length ? String(entries.length) : '0',
        note: !entries.length ? 'nada marcado hoje'
          : next.time ? `${next.time} · ${next.text}` : next.text,
        to: 'calendario'
      }));

      // ---------- academia ----------
      const gymLog = MP.read('mp.gymLog', []).slice().sort((a, b) => b.date.localeCompare(a.date));
      const workouts = MP.read('mp.gym', []);
      const todayDone = gymLog.some((e) => e.date === today);
      const lastName = gymLog.length
        ? (workouts.find((w) => w.id === gymLog[0].workoutId) || {}).name
        : null;

      grid.append(tile({
        icon: 'gym',
        label: 'Academia',
        value: todayDone ? '✓' : (workouts.length ? String(workouts.length) : '0'),
        note: todayDone ? 'treino feito hoje'
          : !workouts.length ? 'nenhum treino'
            : lastName ? `ultimo: ${MP.fmtDate(gymLog[0].date, { short: true })}` : 'nunca registrado',
        tone: todayDone ? 'green' : null,
        to: 'academia'
      }));

      // ---------- anotacoes ----------
      const notes = MP.read('mp.notes', [])
        .slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));

      grid.append(tile({
        icon: 'notes',
        label: 'Anotações',
        value: notes.length ? String(notes.length) : '0',
        note: notes.length ? (notes[0].title || 'sem título') : 'nenhuma anotação',
        to: 'anotacoes'
      }));

      // ---------- arquivos (assincrono) ----------
      const filesTile = tile({
        icon: 'files',
        label: 'Arquivos',
        value: '0',
        note: 'carregando...',
        to: 'arquivos'
      });

      grid.append(filesTile);

      MP.files.list().then((list) => {
        const total = list.reduce((sum, f) => sum + f.size, 0);
        filesTile.querySelector('.tile__value').textContent = list.length ? String(list.length) : '0';
        filesTile.querySelector('.tile__note').textContent =
          list.length ? MP.fmtSize(total) : 'nenhum arquivo';
      }).catch(() => {
        filesTile.querySelector('.tile__note').textContent = 'indisponível';
      });

      root.append(grid);
    }
  };
})(window.MP);
