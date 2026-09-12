// Tarefas: lista simples com data opcional.
(function (MP) {
  const KEY = 'mp.tasks'; // [{ id, text, due, done }]

  const load = () => MP.read(KEY, []);
  const save = (list) => MP.write(KEY, list);

  MP.views.tarefas = {
    title: 'Tarefas',

    mount(root) {
      function update(fn) {
        const list = load();
        fn(list);
        save(list);
        render();
      }

      // ---------- modal de criacao ----------

      function openCreate() {
        const text = MP.h('input', {
          class: 'input', type: 'text', maxlength: 120, spellcheck: 'false',
          placeholder: 'Ex: Pagar a conta de luz'
        });

        const due = MP.h('input', { class: 'input input--date', type: 'date' });

        function create() {
          const value = text.value.trim();
          if (!value) {
            MP.invalid(text);
            return;
          }

          MP.sheet.close();
          update((list) => list.unshift({
            id: MP.uid(), text: value, due: due.value, done: false
          }));
        }

        text.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
        due.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });

        MP.sheet.open('Nova tarefa', MP.h('div', {},
          MP.field('Tarefa', text),
          MP.field('Data (opcional)', due),
          MP.actions('Criar tarefa', create)
        ), { center: true });

        setTimeout(() => text.focus(), 80);
      }

      // ---------- tela ----------

      function taskRow(task) {
        return MP.h('div', { class: 'row', dataset: { done: String(task.done) } },
          MP.h('button', {
            class: 'check',
            type: 'button',
            'aria-label': task.done ? 'Reabrir' : 'Concluir',
            dataset: { on: String(task.done) },
            svg: task.done ? '<path d="m7.5 12.4 3 3 6-6.4"/>' : '',
            onclick: () => update((list) => {
              const found = list.find((t) => t.id === task.id);
              if (found) found.done = !found.done;
            })
          }),
          MP.h('span', { class: 'row__text', text: task.text }),
          task.due ? MP.h('span', {
            class: 'pill',
            dataset: { late: String(!task.done && task.due < MP.today()) },
            text: MP.fmtDate(task.due, { short: true })
          }) : null,
          MP.h('button', {
            class: 'row__del',
            type: 'button',
            title: 'Excluir',
            svg: '<path d="M6 6l12 12M18 6 6 18"/>',
            onclick: () => update((list) => {
              const i = list.findIndex((t) => t.id === task.id);
              if (i > -1) list.splice(i, 1);
            })
          })
        );
      }

      function render() {
        MP.clear(root);

        const tasks = load();
        const open = tasks.filter((t) => !t.done);
        const done = tasks.filter((t) => t.done);

        if (!tasks.length) {
          root.append(MP.h('div', { class: 'empty' },
            MP.h('div', { class: 'empty__icon', svg: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.6 2.6 4.8-5.2"/>' }),
            MP.h('p', { class: 'empty__title', text: 'Nenhuma tarefa' }),
            MP.h('p', { class: 'empty__hint', text: 'Anote o que precisa fazer, com data se quiser.' }),
            MP.h('div', { class: 'empty__action' },
              MP.h('button', {
                class: 'btn btn--blue', type: 'button', text: '+ Nova tarefa', onclick: openCreate
              })
            )
          ));
          return;
        }

        root.append(MP.h('div', { class: 'toolbar' },
          MP.h('button', {
            class: 'btn btn--blue', type: 'button', text: '+ Nova tarefa', onclick: openCreate
          })
        ));

        if (open.length) {
          root.append(
            MP.h('p', { class: 'section-label', text: `Abertas (${open.length})` }),
            MP.h('div', { class: 'card rows' }, open.map(taskRow))
          );
        }

        if (done.length) {
          root.append(
            MP.h('div', { class: 'section-head' },
              MP.h('p', { class: 'section-label', text: `Concluídas (${done.length})` }),
              MP.h('button', {
                class: 'btn btn--plain btn--sm', type: 'button', text: 'Limpar',
                onclick: () => {
                  save(load().filter((t) => !t.done));
                  render();
                }
              })
            ),
            MP.h('div', { class: 'card rows' }, done.map(taskRow))
          );
        }
      }

      render();
    }
  };
})(window.MP);
