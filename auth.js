// Acesso restrito a um unico e-mail. A senha e definida no primeiro acesso e fica
// guardada como hash SHA-256 (com sal) no proprio navegador.
(function (MP) {
  const EMAIL = 'joao.jhcc19@gmail.com';
  const AUTH = 'mp.auth'; // { email, salt, hash }
  const SESSION = 'mp.session';

  const el = {
    gate: document.getElementById('gate'),
    form: document.getElementById('gateForm'),
    sub: document.getElementById('gateSub'),
    email: document.getElementById('gateEmail'),
    emailFixed: document.getElementById('gateEmailFixed'),
    pass: document.getElementById('gatePass'),
    pass2: document.getElementById('gatePass2'),
    btn: document.getElementById('gateBtn'),
    error: document.getElementById('gateError')
  };

  function unlock() {
    el.gate.hidden = true;
    document.body.dataset.unlocked = 'true';
    document.dispatchEvent(new CustomEvent('mp:unlocked'));
  }

  function fail(message) {
    el.error.textContent = message;
    el.gate.dataset.shake = 'true';
    setTimeout(() => { delete el.gate.dataset.shake; }, 420);
  }

  async function digest(salt, password) {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const account = MP.read(AUTH, null);

  // ja entrou uma vez neste navegador: segue direto
  if (account && MP.read(SESSION, false)) {
    unlock();
    return;
  }

  // ---------- tela de acesso ----------

  const registering = !account;

  el.gate.hidden = false;
  el.sub.textContent = registering ? 'Primeiro acesso: crie sua senha' : 'Bem vindo de volta';
  el.btn.textContent = registering ? 'Criar acesso' : 'Entrar';
  el.pass2.hidden = !registering;
  el.email.hidden = !registering;
  el.emailFixed.hidden = registering;

  if (!registering) {
    el.emailFixed.textContent = account.email;
    el.pass.autocomplete = 'current-password';
  }

  setTimeout(() => (registering ? el.email : el.pass).focus(), 120);

  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.error.textContent = '';

    const password = el.pass.value;

    if (registering) {
      const typed = el.email.value.trim().toLowerCase();

      if (typed !== EMAIL) {
        fail('Esse e-mail não tem acesso a este site.');
        return;
      }

      if (password.length < 4) {
        fail('Escolha uma senha de pelo menos 4 caracteres.');
        return;
      }

      if (password !== el.pass2.value) {
        fail('As senhas não batem.');
        return;
      }

      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0')).join('');

      MP.write(AUTH, { email: EMAIL, salt, hash: await digest(salt, password), created: new Date().toISOString() });
      MP.write(SESSION, true);
      unlock();
      return;
    }

    if (await digest(account.salt, password) !== account.hash) {
      fail('Senha incorreta.');
      el.pass.select();
      return;
    }

    MP.write(SESSION, true);
    unlock();
  });

  // sair: usado pelo botao no card de perfil
  MP.logout = function () {
    try { localStorage.removeItem(SESSION); } catch (_) {}
    location.reload();
  };
})(window.MP);
