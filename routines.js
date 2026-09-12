// Rotinas de treino que ja vem prontas. São importadas uma única vez por navegador
// (a marca fica em `mp.gymSeed`), então se você apagar um treino ele não volta.
// Para mudar algo, edite aqui e suba a versão em SEED_VERSION.
(function (MP) {
  const SEED_KEY = 'mp.gymSeed';
  const SEED_VERSION = 'v2';
  const GYM = 'mp.gym';

  // cada exercício: [nome, séries, repetições, descanso]
  const ROUTINES = [
    {
      name: '🟥 Segunda · Peito, Tríceps e Ombro',
      groups: [
        ['Peito', [
          ['Supino reto com barra', '4', '4–6', '2–3 min'],
          ['Supino inclinado com halteres', '3', '6–10', '2 min'],
          ['Crucifixo na máquina', '3', '10–12', '60–90s']
        ]],
        ['Ombro', [
          ['Desenvolvimento com halteres', '3', '6–10', '2 min'],
          ['Elevação lateral com halteres', '3', '10–15', '60–90s']
        ]],
        ['Tríceps', [
          ['Tríceps testa com barra W', '3', '8–12', '90s'],
          ['Tríceps na polia com corda', '3', '10–15', '60–90s']
        ]]
      ]
    },

    {
      name: '🟦 Terça · Costas e Bíceps',
      groups: [
        ['Costas', [
          ['Barra fixa / Puxada alta', '4', '6–10', '2–3 min'],
          ['Remada curvada com barra', '4', '5–8', '2–3 min'],
          ['Remada unilateral com halter', '3', '8–12', '90s'],
          ['Puxada neutra na máquina/polia', '3', '8–12', '90s'],
          ['Face pull', '3', '12–15', '60–90s']
        ]],
        ['Bíceps', [
          ['Rosca direta com barra', '3', '6–10', '90s'],
          ['Rosca martelo com halteres', '3', '8–12', '60–90s']
        ]]
      ]
    },

    {
      name: '🟩 Quarta · Pernas',
      groups: [
        ['Quadríceps', [
          ['Agachamento livre', '4', '4–6', '2–3 min'],
          ['Leg press 45°', '3', '8–12', '2 min'],
          ['Cadeira extensora', '3', '10–15', '60–90s']
        ]],
        ['Posteriores', [
          ['Mesa flexora', '3', '8–12', '90s'],
          ['Stiff com halteres ou barra', '3', '6–10', '2 min']
        ]],
        ['Panturrilha', [
          ['Panturrilha em pé', '4', '10–15', '60–90s'],
          ['Panturrilha sentado', '3', '12–15', '60s']
        ]]
      ]
    },

    {
      name: '🟨 Quinta · Peito, Costas e Braços',
      groups: [
        ['Peito', [
          ['Supino inclinado com barra', '3', '5–8', '2–3 min'],
          ['Supino máquina', '3', '8–12', '90s']
        ]],
        ['Costas', [
          ['Remada baixa na polia', '3', '6–10', '2 min'],
          ['Puxada alta aberta', '3', '8–12', '90s']
        ]],
        ['Bíceps', [
          ['Rosca Scott', '3', '8–12', '90s']
        ]],
        ['Tríceps', [
          ['Tríceps francês com halter', '3', '8–12', '90s'],
          ['Tríceps na polia', '2', '10–15', '60–90s']
        ]]
      ]
    },

    {
      name: '🟪 Sexta · Ombros e Pernas',
      groups: [
        ['Ombros', [
          ['Desenvolvimento com barra ou máquina', '4', '5–8', '2–3 min'],
          ['Elevação lateral na máquina ou polia', '3', '10–15', '60–90s'],
          ['Crucifixo inverso / Reverse Fly', '3', '10–15', '60–90s']
        ]],
        ['Pernas', [
          ['Hack squat', '3', '6–10', '2 min'],
          ['Cadeira extensora', '3', '10–15', '60–90s'],
          ['Flexora sentado', '3', '8–12', '90s']
        ]],
        ['Panturrilha', [
          ['Panturrilha no leg press', '4', '10–15', '60–90s']
        ]]
      ]
    }
  ];

  // achata os grupos na forma que a seção Academia usa
  function build(routine) {
    const exercises = [];

    routine.groups.forEach(([group, items]) => {
      items.forEach(([name, sets, reps, rest]) => {
        exercises.push({ id: MP.uid(), name, sets, reps, rest, group });
      });
    });

    return { id: MP.uid(), name: routine.name, reps: '', exercises };
  }

  if (MP.read(SEED_KEY, null) === SEED_VERSION) return;

  const current = MP.read(GYM, []);

  // v1 usava travessao no nome; renomeia o que ja esta salvo para nao duplicar
  let renamed = false;
  current.forEach((workout) => {
    if (typeof workout.name === 'string' && workout.name.includes(' — ')) {
      workout.name = workout.name.replace(' — ', ' · ');
      renamed = true;
    }
  });
  if (renamed) MP.write(GYM, current);

  const names = new Set(current.map((w) => w.name));
  const missing = ROUTINES.filter((r) => !names.has(r.name)).map(build);

  if (missing.length) MP.write(GYM, current.concat(missing));
  MP.write(SEED_KEY, SEED_VERSION);
})(window.MP);
