// Rotina diaria: itens com horario; os checks valem para o dia de hoje.
(function (MP) {
  const KEY = 'mp.routine'; // [{ id, time, title }]
  const LOG = 'mp.routineLog'; // { "2026-09-12": [ids] }

  const load = () => MP.read(KEY, []);
  const save = (list) => MP.write(KEY, list);
  const loadLog = () => MP.read(LOG, {});
  const saveLog = (log) => MP.write(LOG, log);

  const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99');

  MP.views.rotina = {
    title: 'Rotina',

    mount(root) {
      const day = MP.today();

      function doneToday() {
        return loadLog()[day] || [];
      }

      function toggle(id) {
        const log = loadLog();
        const list = log[day] || [];
        log[day] = list.includes(id) ? list.filter((x) => x !== id) : list.concat(id);
        if (!log[day].length) delete log[day];
        saveLog(log);
        render();
      }

      function update(fn) {
        const list = load();
        fn(list);
        save(list);
        render();
      }

      // ---------- modal de criacao ----------

      function openCreate() {
        const time = MP.h('input', { class: 'input input--time', type: 'time' });

        const title = MP.h('input', {
          class: 'input', type: 'text', maxlength: 80, spellcheck: 'false',
          placeholder: 'Ex: Treinar'
        });

        function create() {
          const value = title.value.trim();
          if (!value) {
            MP.invalid(title);
            return;
          }

          MP.sheet.close();
          update((list) => list.push({ id: MP.uid(), time: time.value, title: value }));
        }

        time.addEventListener('keydown', (e) => { if (e.key === 'Enter') title.focus(); });
        title.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });

        MP.sheet.open('Novo item da rotina', MP.h('div', {},
          MP.field('Horário (opcional)', time),
          MP.field('O que fazer', title),
          MP.actions('Adicionar', create)
        ), { center: true });

        setTimeout(() => time.focus(), 80);
      }

      // ---------- tela ----------

      function render() {
        MP.clear(root);

        const items = load().slice().sort(byTime);
        const done = doneToday();

        if (!items.length) {
          root.append(MP.h('div', { class: 'empty' },
            MP.h('div', { class: 'empty__icon', svg: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>' }),
            MP.h('p', { class: 'empty__title', text: 'Rotina vazia' }),
            MP.h('p', { class: 'empty__hint', text: 'Monte os horários e o que fazer em cada um.' }),
            MP.h('div', { class: 'empty__action' },
              MP.h('button', {
                class: 'btn btn--blue', type: 'button', text: '+ Novo item', onclick: openCreate
              })
            )
          ));
          return;
        }

        const checked = items.filter((item) => done.includes(item.id)).length;
        const pct = Math.round((checked / items.length) * 100);

        root.append(
          MP.h('div', { class: 'toolbar' },
            MP.h('button', {
              class: 'btn btn--blue', type: 'button', text: '+ Novo item', onclick: openCreate
            })
          ),

          MP.h('div', { class: 'card progress' },
            MP.h('div', { class: 'progress__top' },
              MP.h('span', { class: 'progress__label', text: MP.fmtDate(day, { weekday: true }) }),
              MP.h('strong', { class: 'progress__count', text: `${checked}/${items.length}` })
            ),
            MP.h('div', { class: 'progress__bar' },
              MP.h('i', { class: 'progress__fill', style: `width:${pct}%` })
            )
          ),

          MP.h('div', { class: 'card rows' }, items.map((item) => {
            const isDone = done.includes(item.id);
            return MP.h('div', { class: 'row', dataset: { done: String(isDone) } },
              MP.h('button', {
                class: 'check',
                type: 'button',
                dataset: { on: String(isDone) },
                'aria-label': isDone ? 'Desmarcar' : 'Marcar',
                svg: isDone ? '<path d="m7.5 12.4 3 3 6-6.4"/>' : '',
                onclick: () => toggle(item.id)
              }),
              item.time ? MP.h('span', { class: 'row__time', text: item.time }) : null,
              MP.h('span', { class: 'row__text', text: item.title }),
              MP.h('button', {
                class: 'row__del', type: 'button', title: 'Excluir',
                svg: '<path d="M6 6l12 12M18 6 6 18"/>',
                onclick: () => update((list) => {
                  const i = list.findIndex((x) => x.id === item.id);
                  if (i > -1) list.splice(i, 1);
                })
              })
            );
          }))
        );
      }

      render();
    }
  };
})(window.MP);
