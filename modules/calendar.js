// Calendario: todos os dias do ano, semana de segunda a domingo.
(function (MP) {
  const KEY = 'mp.calendar'; // { "2026-09-12": [{ id, time, text }] }

  const load = () => MP.read(KEY, {});
  const save = (data) => MP.write(KEY, data);

  let year = new Date().getFullYear();

  function dayEntries(date) {
    return load()[date] || [];
  }

  function addEntry(date, time, text) {
    const data = load();
    data[date] = (data[date] || []).concat({ id: MP.uid(), time, text });
    data[date].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    save(data);
  }

  function removeEntry(date, id) {
    const data = load();
    data[date] = (data[date] || []).filter((entry) => entry.id !== id);
    if (!data[date].length) delete data[date];
    save(data);
  }

  // ---------- folha do dia ----------

  function openDay(date, onChange) {
    const list = MP.h('div', { class: 'rows' });

    function render() {
      MP.clear(list);
      const entries = dayEntries(date);

      if (!entries.length) {
        list.append(MP.h('p', { class: 'empty-line', text: 'Nada marcado nesse dia.' }));
      }

      entries.forEach((entry) => {
        list.append(MP.h('div', { class: 'row' },
          entry.time ? MP.h('span', { class: 'row__time', text: entry.time }) : null,
          MP.h('span', { class: 'row__text', text: entry.text }),
          MP.h('button', {
            class: 'row__del',
            type: 'button',
            title: 'Excluir',
            svg: '<path d="M6 6l12 12M18 6 6 18"/>',
            onclick: () => { removeEntry(date, entry.id); render(); onChange(); }
          })
        ));
      });
    }

    const time = MP.h('input', { class: 'input input--time', type: 'time' });
    const text = MP.h('input', { class: 'input', type: 'text', placeholder: 'O que tem nesse dia?' });

    function submit() {
      const value = text.value.trim();
      if (!value) return;
      addEntry(date, time.value, value);
      text.value = '';
      time.value = '';
      render();
      onChange();
      text.focus();
    }

    text.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

    render();

    MP.sheet.open(MP.fmtDate(date, { weekday: true }), MP.h('div', {},
      list,
      MP.h('div', { class: 'form-row' },
        time,
        text,
        MP.h('button', { class: 'btn btn--blue', type: 'button', text: 'Adicionar', onclick: submit })
      )
    ));
  }

  // ---------- grade do ano ----------

  function monthGrid(monthIndex, marks, onPick) {
    const first = new Date(year, monthIndex, 1);
    const days = new Date(year, monthIndex + 1, 0).getDate();
    const offset = MP.weekIndex(first);
    const todayISO = MP.today();

    const grid = MP.h('div', { class: 'cal__grid' });

    MP.WEEKDAYS_MIN.forEach((label, i) => {
      grid.append(MP.h('span', { class: 'cal__wd', text: label, title: MP.WEEKDAYS[i] }));
    });

    for (let i = 0; i < offset; i += 1) grid.append(MP.h('span', { class: 'cal__pad' }));

    for (let day = 1; day <= days; day += 1) {
      const date = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = date === todayISO;
      const count = marks[date] ? marks[date].length : 0;

      grid.append(MP.h('button', {
        class: 'cal__day',
        type: 'button',
        dataset: { today: String(isToday), marked: String(count > 0) },
        onclick: () => onPick(date)
      },
        MP.h('span', { text: day }),
        count ? MP.h('i', { class: 'cal__dot' }) : null
      ));
    }

    return MP.h('section', { class: 'cal__month' },
      MP.h('h3', { class: 'cal__mname', text: MP.MONTHS[monthIndex] }),
      grid
    );
  }

  MP.views.calendario = {
    title: 'Calendario',

    mount(root) {
      function render() {
        MP.clear(root);
        const marks = load();

        const months = MP.h('div', { class: 'cal__year' });
        for (let m = 0; m < 12; m += 1) {
          months.append(monthGrid(m, marks, (date) => openDay(date, render)));
        }

        root.append(
          MP.h('div', { class: 'toolbar' },
            MP.h('div', { class: 'stepper' },
              MP.h('button', {
                class: 'stepper__btn', type: 'button', svg: '<path d="M14.5 5 8 12l6.5 7"/>',
                onclick: () => { year -= 1; render(); }
              }),
              MP.h('strong', { class: 'stepper__label', text: year }),
              MP.h('button', {
                class: 'stepper__btn', type: 'button', svg: '<path d="M9.5 5 16 12l-6.5 7"/>',
                onclick: () => { year += 1; render(); }
              })
            ),
            MP.h('button', {
              class: 'btn btn--plain', type: 'button', text: 'Hoje',
              onclick: () => {
                year = new Date().getFullYear();
                render();
                const el = root.querySelector('[data-today="true"]');
                if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }
            })
          ),
          months
        );
      }

      render();
    }
  };
})(window.MP);
