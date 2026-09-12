// Anotacoes: lista + editor com salvamento automatico.
(function (MP) {
  const KEY = 'mp.notes'; // [{ id, title, body, updated }]

  const load = () => MP.read(KEY, []);
  const save = (list) => MP.write(KEY, list);

  let currentId = null;
  let timer = null;

  MP.views.anotacoes = {
    title: 'Anotacoes',

    mount(root) {
      function render() {
        MP.clear(root);

        const notes = load().sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
        if (currentId && !notes.some((n) => n.id === currentId)) currentId = null;

        const aside = MP.h('aside', { class: 'notes__list' },
          MP.h('button', {
            class: 'btn btn--blue btn--block', type: 'button', text: '+ Nova anotacao',
            onclick: () => {
              const note = { id: MP.uid(), title: '', body: '', updated: new Date().toISOString() };
              save(load().concat(note));
              currentId = note.id;
              render();
            }
          }),
          notes.length
            ? notes.map((note) => MP.h('button', {
                class: 'notes__item',
                type: 'button',
                dataset: { on: String(note.id === currentId) },
                onclick: () => { currentId = note.id; render(); }
              },
                MP.h('strong', { text: note.title || 'Sem titulo' }),
                MP.h('span', { text: (note.body || '').split('\n')[0].slice(0, 40) || 'Vazia' })
              ))
            : MP.h('p', { class: 'empty-line', text: 'Nenhuma anotacao.' })
        );

        root.append(MP.h('div', { class: 'notes' }, aside, editor(notes)));
      }

      function editor(notes) {
        const note = notes.find((n) => n.id === currentId);

        if (!note) {
          return MP.h('div', { class: 'notes__editor' },
            MP.h('div', { class: 'empty' },
              MP.h('div', { class: 'empty__icon', svg: '<path d="M5.5 4.5h9L19 9v10.5h-13z"/><path d="M8.5 12h7M8.5 15.5h5"/>' }),
              MP.h('p', { class: 'empty__title', text: 'Nenhuma anotacao aberta' }),
              MP.h('p', { class: 'empty__hint', text: 'Crie uma nova ao lado.' })
            )
          );
        }

        const title = MP.h('input', {
          class: 'notes__title', type: 'text', placeholder: 'Titulo',
          spellcheck: 'false', value: note.title || ''
        });

        const body = MP.h('textarea', {
          class: 'notes__body', placeholder: 'Escreva aqui...', spellcheck: 'false'
        });
        body.value = note.body || '';

        const stamp = MP.h('span', { class: 'notes__stamp', text: stampText(note.updated) });

        function persist() {
          const list = load();
          const found = list.find((n) => n.id === note.id);
          if (!found) return;
          found.title = title.value;
          found.body = body.value;
          found.updated = new Date().toISOString();
          save(list);
          stamp.textContent = stampText(found.updated);

          // atualiza a lista lateral sem perder o foco do editor
          const item = root.querySelector('.notes__item[data-on="true"]');
          if (item) {
            item.children[0].textContent = found.title || 'Sem titulo';
            item.children[1].textContent = (found.body || '').split('\n')[0].slice(0, 40) || 'Vazia';
          }
        }

        function schedule() {
          clearTimeout(timer);
          timer = setTimeout(persist, 400);
        }

        title.addEventListener('input', schedule);
        body.addEventListener('input', schedule);

        return MP.h('div', { class: 'notes__editor' },
          MP.h('div', { class: 'notes__bar' },
            stamp,
            MP.h('button', {
              class: 'btn btn--plain btn--sm btn--red', type: 'button', text: 'Excluir',
              onclick: () => {
                clearTimeout(timer);
                save(load().filter((n) => n.id !== note.id));
                currentId = null;
                render();
              }
            })
          ),
          title,
          body
        );
      }

      function stampText(updated) {
        if (!updated) return '';
        const d = new Date(updated);
        return `${MP.fmtDate(MP.iso(d), { short: true })} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }

      render();
    }
  };
})(window.MP);
