// Arquivos: guardados no proprio navegador (IndexedDB), com download e exclusao.
(function (MP) {
  const ICONS = {
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 4.8-4.4 5 4.4m2-2.6 3.2 2.6"/>',
    pdf: '<path d="M6 3.5h8L18.5 8v12.5H6z"/><path d="M9 13h6M9 16.5h4"/>',
    audio: '<path d="M9 17V6.8l9-1.6v10"/><circle cx="6.6" cy="17.4" r="2.4"/><circle cx="15.6" cy="15.2" r="2.4"/>',
    video: '<rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="m10.5 9.5 5 2.5-5 2.5z"/>',
    zip: '<path d="M6 3.5h12v17H6z"/><path d="M12 4v4M12 10v2M12 14v2"/>',
    text: '<path d="M6 3.5h8L18.5 8v12.5H6z"/><path d="M9 12h6M9 15.5h6M9 8.5h3"/>',
    file: '<path d="M6 3.5h8L18.5 8v12.5H6z"/>'
  };

  function kind(type, name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('audio/')) return 'audio';
    if (type.startsWith('video/')) return 'video';
    if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
    if (type.startsWith('text/') || ['md', 'txt', 'csv', 'json'].includes(ext)) return 'text';
    return 'file';
  }

  MP.views.arquivos = {
    title: 'Arquivos',

    mount(root) {
      const urls = [];

      function revoke() {
        while (urls.length) URL.revokeObjectURL(urls.pop());
      }

      async function render() {
        revoke();
        MP.clear(root);

        const picker = MP.h('input', { class: 'hidden-input', type: 'file', multiple: true });
        picker.addEventListener('change', () => intake(picker.files));

        const drop = MP.h('div', { class: 'drop' },
          MP.h('div', { class: 'drop__icon', svg: '<path d="M12 16V4.5m0 0L7.5 9M12 4.5 16.5 9"/><path d="M4.5 15v3.5c0 .8.7 1.5 1.5 1.5h12c.8 0 1.5-.7 1.5-1.5V15"/>' }),
          MP.h('p', { class: 'drop__title', text: 'Arraste arquivos aqui' }),
          MP.h('button', {
            class: 'btn btn--blue', type: 'button', text: 'Escolher arquivos',
            onclick: () => picker.click()
          }),
          picker
        );

        ['dragenter', 'dragover'].forEach((evt) => drop.addEventListener(evt, (e) => {
          e.preventDefault();
          drop.dataset.over = 'true';
        }));

        ['dragleave', 'drop'].forEach((evt) => drop.addEventListener(evt, (e) => {
          e.preventDefault();
          drop.dataset.over = 'false';
        }));

        drop.addEventListener('drop', (e) => {
          if (e.dataTransfer && e.dataTransfer.files.length) intake(e.dataTransfer.files);
        });

        root.append(drop);

        let list = [];
        try {
          list = await MP.files.list();
        } catch (err) {
          root.append(MP.h('p', { class: 'empty-line', text: `Não deu para abrir o armazenamento: ${err.message}` }));
          return;
        }

        if (!list.length) {
          root.append(MP.h('div', { class: 'empty' },
            MP.h('div', { class: 'empty__icon', svg: ICONS.file }),
            MP.h('p', { class: 'empty__title', text: 'Nenhum arquivo' }),
            MP.h('p', { class: 'empty__hint', text: 'Ficam salvos no navegador, não saem daqui.' })
          ));
          return;
        }

        const total = list.reduce((sum, item) => sum + item.size, 0);
        root.append(MP.h('p', { class: 'section-label', text: `${list.length} arquivo(s) · ${MP.fmtSize(total)}` }));

        const grid = MP.h('div', { class: 'files' });

        list.forEach((item) => {
          const type = kind(item.type, item.name);
          const url = URL.createObjectURL(item.blob);
          urls.push(url);

          grid.append(MP.h('article', { class: 'file' },
            MP.h('div', { class: 'file__thumb' },
              type === 'image'
                ? MP.h('img', { src: url, alt: '' })
                : MP.h('div', { class: 'file__icon', svg: ICONS[type] })
            ),
            MP.h('p', { class: 'file__name', title: item.name, text: item.name }),
            MP.h('p', { class: 'file__meta', text: `${MP.fmtSize(item.size)} · ${MP.fmtDate(item.added.slice(0, 10), { short: true })}` }),
            MP.h('div', { class: 'file__actions' },
              MP.h('a', { class: 'btn btn--plain btn--sm', href: url, download: item.name, text: 'Baixar' }),
              MP.h('button', {
                class: 'btn btn--plain btn--sm btn--red', type: 'button', text: 'Excluir',
                onclick: async () => { await MP.files.del(item.id); render(); }
              })
            )
          ));
        });

        root.append(grid);
      }

      async function intake(fileList) {
        for (const file of Array.from(fileList)) {
          try {
            await MP.files.put(file);
          } catch (err) {
            console.warn('falhou ao guardar', file.name, err);
          }
        }
        render();
      }

      render();
    }
  };
})(window.MP);
