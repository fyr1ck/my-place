// Intro: aparece, segura ~3s e some sozinha. Depois libera a interface (body.ready).
(function () {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const HOLD_MS = 3000;
  let done = false;

  function finish() {
    if (done) return;
    done = true;

    hero.classList.add('hero--out');
    setTimeout(() => document.body.classList.add('ready'), 450);
    setTimeout(() => { hero.hidden = true; }, 1000);
  }

  function start() {
    const timer = setTimeout(finish, HOLD_MS);

    // qualquer interacao pula a intro
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((evt) => {
      window.addEventListener(evt, () => { clearTimeout(timer); finish(); }, { once: true, passive: true });
    });
  }

  // so roda depois de passar pela tela de acesso
  if (document.body.dataset.unlocked === 'true') start();
  else document.addEventListener('mp:unlocked', start, { once: true });
})();
