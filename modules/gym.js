// Academia: treinos com exercicios e registro de treinos feitos.
(function (MP) {
  const KEY = 'mp.gym'; // [{ id, name, reps, exercises: [{ id, name }] }]
  const LOG = 'mp.gymLog'; // [{ date, workoutId }]

  const load = () => MP.read(KEY, []);
  const save = (list) => MP.write(KEY, list);
  const loadLog = () => MP.read(LOG, []);
  const saveLog = (list) => MP.write(LOG, list);

  let currentId = null;

  MP.views.academia = {
    title: 'Academia',

    mount(root) {
      function update(fn) {
        const list = load();
        fn(list);
        save(list);
        render();
      }

      // ---------- modal de criacao ----------

      function openCreate() {
        let exercises = [];

        const name = MP.h('input', {
          class: 'input', type: 'text', maxlength: 60, spellcheck: 'false',
          placeholder: 'Ex: Treino A - Peito e Triceps'
        });

        const reps = MP.h('input', {
          class: 'input input--num', type: 'number', min: '1', step: '1',
          placeholder: 'Ex: 12'
        });

        const exName = MP.h('input', {
          class: 'input', type: 'text', maxlength: 60, spellcheck: 'false',
          placeholder: 'Ex: Supino reto'
        });

        const list = MP.h('div', { class: 'rows rows--box' });

        function renderList() {
          MP.clear(list);

          if (!exercises.length) {
            list.append(MP.h('p', { class: 'empty-line', text: 'Nenhum exercicio adicionado ainda.' }));
            return;
          }

          exercises.forEach((ex) => {
            list.append(MP.h('div', { class: 'row row--tight' },
              MP.h('i', { class: 'row__bullet' }),
              MP.h('span', { class: 'row__text', text: ex.name }),
              MP.h('button', {
                class: 'row__del', type: 'button', title: 'Remover',
                svg: '<path d="M6 6l12 12M18 6 6 18"/>',
                onclick: () => {
                  exercises = exercises.filter((x) => x.id !== ex.id);
                  renderList();
                }
              })
            ));
          });
        }

        function addExercise() {
          const value = exName.value.trim();
          if (!value) {
            exName.focus();
            return;
          }
          exercises.push({ id: MP.uid(), name: value });
          exName.value = '';
          renderList();
          exName.focus();
        }

        function create() {
          const value = name.value.trim();

          if (!value) {
            MP.invalid(name);
            return;
          }

          const workout = {
            id: MP.uid(),
            name: value,
            reps: reps.value ? Number(reps.value) : '',
            exercises
          };

          currentId = workout.id;
          const all = load();
          all.push(workout);
          save(all);

          MP.sheet.close();
          render();
        }

        name.addEventListener('keydown', (e) => { if (e.key === 'Enter') reps.focus(); });
        reps.addEventListener('keydown', (e) => { if (e.key === 'Enter') exName.focus(); });
        exName.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); addExercise(); }
        });

        renderList();

        const form = MP.h('div', {},
          MP.field('Nome do treino', name),
          MP.field('Quantidade de repeticoes', reps),
          MP.field('Nome dos exercicios',
            MP.h('div', { class: 'form-row' },
              exName,
              MP.h('button', { class: 'btn', type: 'button', text: 'Adicionar', onclick: addExercise })
            ),
            list
          ),
          MP.actions('Criar treino', create)
        );

        MP.sheet.open('Novo treino', form, { center: true });
        setTimeout(() => name.focus(), 80);
      }

      // ---------- tela ----------

      function workoutChips(workouts) {
        const strip = MP.h('div', { class: 'chips' });

        workouts.forEach((workout) => {
          strip.append(MP.h('button', {
            class: 'chip',
            type: 'button',
            dataset: { on: String(workout.id === currentId) },
            text: workout.name,
            onclick: () => { currentId = workout.id; render(); }
          }));
        });

        return MP.h('div', { class: 'card' },
          strip,
          MP.h('button', {
            class: 'btn btn--blue', type: 'button', text: '+ Criar treino', onclick: openCreate
          })
        );
      }

      // adiciona exercicio num treino que ja existe
      function exerciseForm(workout) {
        const name = MP.h('input', {
          class: 'input', type: 'text', spellcheck: 'false', placeholder: 'Novo exercicio'
        });

        function add() {
          const value = name.value.trim();
          if (!value) return;
          update((list) => {
            const found = list.find((w) => w.id === workout.id);
            if (!found) return;
            found.exercises = (found.exercises || []).concat({ id: MP.uid(), name: value });
          });
        }

        name.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });

        return MP.h('div', { class: 'form-row' },
          name,
          MP.h('button', { class: 'btn btn--blue', type: 'button', text: 'Adicionar', onclick: add })
        );
      }

      function render() {
        MP.clear(root);

        const workouts = load();
        if (currentId && !workouts.some((w) => w.id === currentId)) currentId = null;
        if (!currentId && workouts.length) currentId = workouts[0].id;

        if (!workouts.length) {
          root.append(MP.h('div', { class: 'empty' },
            MP.h('div', { class: 'empty__icon', svg: '<path d="M6.5 9v6M4 10.5v3M17.5 9v6M20 10.5v3M6.5 12h11"/>' }),
            MP.h('p', { class: 'empty__title', text: 'Nenhum treino' }),
            MP.h('p', { class: 'empty__hint', text: 'Monte um treino com os exercicios e as repeticoes.' }),
            MP.h('div', { class: 'empty__action' },
              MP.h('button', {
                class: 'btn btn--blue', type: 'button', text: '+ Criar treino', onclick: openCreate
              })
            )
          ));
          return;
        }

        root.append(workoutChips(workouts));

        const workout = workouts.find((w) => w.id === currentId);
        const exercises = workout.exercises || [];
        const log = loadLog().filter((entry) => entry.workoutId === workout.id)
          .sort((a, b) => b.date.localeCompare(a.date));
        const doneToday = log.some((entry) => entry.date === MP.today());

        const resumo = [
          `${exercises.length} exercicio(s)`,
          workout.reps ? `${workout.reps} repeticoes` : null,
          log.length ? `ultimo em ${MP.fmtDate(log[0].date, { short: true })}` : 'nunca registrado'
        ].filter(Boolean).join(' · ');

        root.append(
          MP.h('div', { class: 'card' },
            MP.h('div', { class: 'section-head' },
              MP.h('div', {},
                MP.h('h3', { class: 'metric__name', text: workout.name }),
                MP.h('p', { class: 'metric__sub', text: resumo })
              ),
              MP.h('div', { class: 'section-head__actions' },
                MP.h('button', {
                  class: `btn btn--sm ${doneToday ? 'btn--green' : 'btn--blue'}`,
                  type: 'button',
                  text: doneToday ? 'Feito hoje ✓' : 'Marcar feito hoje',
                  onclick: () => {
                    const entries = loadLog();
                    const i = entries.findIndex((e) => e.date === MP.today() && e.workoutId === workout.id);
                    if (i > -1) entries.splice(i, 1);
                    else entries.push({ date: MP.today(), workoutId: workout.id });
                    saveLog(entries);
                    render();
                  }
                }),
                MP.h('button', {
                  class: 'btn btn--plain btn--sm btn--red',
                  type: 'button',
                  text: 'Excluir treino',
                  onclick: () => {
                    saveLog(loadLog().filter((e) => e.workoutId !== workout.id));
                    currentId = null;
                    update((list) => {
                      const i = list.findIndex((w) => w.id === workout.id);
                      if (i > -1) list.splice(i, 1);
                    });
                  }
                })
              )
            ),
            exerciseForm(workout)
          )
        );

        if (!exercises.length) {
          root.append(MP.h('div', { class: 'empty empty--sm' },
            MP.h('p', { class: 'empty__title', text: 'Sem exercicios nesse treino' })
          ));
        } else {
          const rows = [];
          let group = null;

          exercises.forEach((ex) => {
            // cabecalho quando muda o grupo muscular
            if (ex.group && ex.group !== group) {
              group = ex.group;
              rows.push(MP.h('div', { class: 'row row--group' },
                MP.h('span', { class: 'row__group', text: ex.group })
              ));
            }

            const rep = ex.reps || workout.reps;
            const volume = ex.sets && rep ? `${ex.sets} × ${rep}`
              : ex.sets ? `${ex.sets} series`
                : rep ? `${rep} reps` : null;

            rows.push(MP.h('div', { class: 'row' },
              MP.h('i', { class: 'row__bullet' }),
              MP.h('span', { class: 'row__text', text: ex.name }),
              volume ? MP.h('span', { class: 'pill', text: volume }) : null,
              ex.rest ? MP.h('span', { class: 'pill pill--soft', text: ex.rest }) : null,
              ex.load ? MP.h('span', { class: 'pill', text: ex.load }) : null,
              MP.h('button', {
                class: 'row__del', type: 'button', title: 'Excluir',
                svg: '<path d="M6 6l12 12M18 6 6 18"/>',
                onclick: () => update((list) => {
                  const found = list.find((w) => w.id === workout.id);
                  if (!found) return;
                  found.exercises = found.exercises.filter((x) => x.id !== ex.id);
                })
              })
            ));
          });

          root.append(MP.h('div', { class: 'card rows' }, rows));
        }

        if (log.length) {
          root.append(
            MP.h('p', { class: 'section-label', text: `Historico de ${workout.name} (${log.length})` }),
            MP.h('div', { class: 'card rows' }, log.slice(0, 20).map((entry) =>
              MP.h('div', { class: 'row row--tight' },
                MP.h('span', { class: 'row__time', text: MP.fmtDate(entry.date, { short: true }) }),
                MP.h('span', { class: 'row__text', text: MP.WEEKDAYS[MP.weekIndex(MP.parseISO(entry.date))] }),
                MP.h('button', {
                  class: 'row__del', type: 'button', title: 'Excluir',
                  svg: '<path d="M6 6l12 12M18 6 6 18"/>',
                  onclick: () => {
                    saveLog(loadLog().filter((e) => !(e.date === entry.date && e.workoutId === entry.workoutId)));
                    render();
                  }
                })
              )
            ))
          );
        }
      }

      render();
    }
  };
})(window.MP);
