// Intro: aparece na primeira visita do dia, segura ~1.4s e some. Nas outras visitas
// do mesmo dia a interface entra direto. Depois libera a interface (body.ready).
(function (MP) {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const HOLD_MS = 1400;
  const SEEN = 'mp.introDay';
  let done = false;

  function ready() { document.body.classList.add('ready'); }

  function finish() {
    if (done) return;
    done = true;

    hero.classList.add('hero--out');
    setTimeout(ready, 180);
    setTimeout(() => { hero.hidden = true; }, 550);
  }

  function start() {
    if (MP.read(SEEN, null) === MP.today()) {
      hero.hidden = true;
      ready();
      return;
    }
    MP.write(SEEN, MP.today());

    const timer = setTimeout(finish, HOLD_MS);

    // qualquer interacao pula a intro
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, () => { clearTimeout(timer); finish(); }, { once: true, passive: true });
    });
  }

  // so roda depois de passar pela tela de acesso
  if (document.body.dataset.unlocked === 'true') start();
  else document.addEventListener('mp:unlocked', start, { once: true });
})(window.MP);
