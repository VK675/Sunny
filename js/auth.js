/* =========================================================================
   Solário — Autenticação via SUPABASE (base de dados real, login cross-device)
   - Substitui a versão localStorage. Mantém a MESMA API pública e o mesmo
     fluxo de UI (formulários, medidor de password, toasts, entrada na app).
   - As palavras-passe são geridas pelo Supabase Auth — nunca passam por aqui.
   ========================================================================= */
const Auth = (() => {
  let _user = null;   // cache síncrono do utilizador atual (para currentUser())

  const toUser = u => u ? ({
    id: u.id,
    email: u.email,
    name: (u.user_metadata && u.user_metadata.name) || (u.email ? u.email.split('@')[0] : 'Utilizador')
  }) : null;

  /* ---------- tradução de erros (EN → PT) ---------- */
  function ptErr(error){
    const m = (error && error.message) || '';
    if (/invalid login credentials/i.test(m))      return 'Email ou palavra-passe incorretos.';
    if (/already registered|already exists|user already/i.test(m)) return 'Já existe uma conta com este email.';
    if (/password should be at least/i.test(m))    return 'A palavra-passe precisa de pelo menos 6 caracteres.';
    if (/unable to validate email|invalid.*email|email.*invalid/i.test(m)) return 'Indica um email válido.';
    if (/rate limit|too many requests/i.test(m))   return 'Demasiadas tentativas. Tenta daqui a pouco.';
    if (/email not confirmed/i.test(m))            return 'Confirma o teu email antes de entrar.';
    return m || 'Ocorreu um erro. Tenta novamente.';
  }

  const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  /* ---------- operações (Supabase Auth) ---------- */
  async function register(name, email, pwd){
    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pwd,
      options: { data: { name: name.trim() } }
    });
    if (error) throw new Error(ptErr(error));
    _user = toUser(data.user);
    return data;   // data.session === null se a confirmação de email estiver ativa
  }

  async function login(email, pwd){
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pwd
    });
    if (error) throw new Error(ptErr(error));
    _user = toUser(data.user);
    return _user;
  }

  function currentUser(){ return _user; }

  async function logout(){
    try { await sb.auth.signOut(); } finally { location.reload(); }
  }

  /* =====================================================================
     INTERFACE
     ===================================================================== */
  function initials(name){
    return name.trim().split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
  }

  function fillChip(user){
    document.getElementById('userName').textContent   = user.name.split(/\s+/)[0];
    document.getElementById('userAvatar').textContent = initials(user.name);
    const fu = document.getElementById('footUser');
    if (fu) fu.textContent = 'sessão de ' + user.name.split(/\s+/)[0];
  }

  function enterApp(user, animate = true){
    fillChip(user);
    const auth = document.getElementById('auth');
    const app  = document.getElementById('app');
    const landing = document.getElementById('landing');   // story em scroll que envolve o #auth
    const reveal = () => {
      if (landing) landing.style.display = 'none';         // esconde TODO o landing (fundo + secções)
      else auth.style.display = 'none';
      app.hidden = false;
      window.scrollTo(0, 0);                               // volta ao topo (estávamos no fim do scroll)
      if (typeof onAppReady === 'function') onAppReady();
    };
    if (animate){
      auth.style.transition = 'opacity .45s ease, transform .45s ease';
      auth.style.opacity = '0';
      auth.style.transform = 'scale(.98)';
      setTimeout(reveal, 420);
    } else {
      reveal();
    }
  }

  function switchTab(which){
    const tabs = document.querySelector('.auth-tabs');
    const isReg = which === 'reg';
    tabs.classList.toggle('reg', isReg);
    document.getElementById('atab-login').classList.toggle('active', !isReg);
    document.getElementById('atab-reg').classList.toggle('active', isReg);
    document.getElementById('form-login').classList.toggle('active', !isReg);
    document.getElementById('form-reg').classList.toggle('active', isReg);
    clearErr('li-err'); clearErr('rg-err');
  }

  function toggleEye(btn){
    const inp = btn.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.style.opacity = inp.type === 'text' ? '1' : '.55';
  }

  function showErr(id, msg){
    const el = document.getElementById(id);
    el.textContent = msg; el.classList.add('show');
  }
  function clearErr(id){
    const el = document.getElementById(id);
    if (el){ el.textContent = ''; el.classList.remove('show'); }
  }

  function pwStrength(pwd){
    let s = 0;
    if (pwd.length >= 6) s++;
    if (pwd.length >= 10) s++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) s++;
    return Math.min(s, 4);
  }

  function toast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- ligação dos formulários ---------- */
  function wire(){
    // medidor de força da palavra-passe
    const rgPwd = document.getElementById('rg-pwd');
    if (rgPwd){
      rgPwd.addEventListener('input', () => {
        const s = pwStrength(rgPwd.value);
        const bar = document.getElementById('rg-bar');
        const colors = ['#E0594B','#E0594B','#F7B23B','#9BD15A','#37C98B'];
        bar.style.width = (s/4*100) + '%';
        bar.style.background = colors[s];
      });
    }

    // LOGIN
    document.getElementById('form-login').addEventListener('submit', async e => {
      e.preventDefault();
      clearErr('li-err');
      const btn = e.target.querySelector('button[type=submit]');
      const email = document.getElementById('li-email').value;
      const pwd   = document.getElementById('li-pwd').value;
      if (!emailOk(email)) return showErr('li-err', 'Indica um email válido.');
      if (!pwd)            return showErr('li-err', 'Escreve a tua palavra-passe.');
      btn.classList.add('loading');
      try {
        const u = await login(email, pwd);
        toast('Bem-vindo de volta, ' + u.name.split(/\s+/)[0] + '! ☀');
        enterApp(u);
      } catch(err){
        btn.classList.remove('loading');
        showErr('li-err', err.message);
      }
    });

    // REGISTO
    document.getElementById('form-reg').addEventListener('submit', async e => {
      e.preventDefault();
      clearErr('rg-err');
      const btn = e.target.querySelector('button[type=submit]');
      const name  = document.getElementById('rg-name').value;
      const email = document.getElementById('rg-email').value;
      const pwd   = document.getElementById('rg-pwd').value;
      if (name.trim().length < 2) return showErr('rg-err', 'Escreve o teu nome.');
      if (!emailOk(email))        return showErr('rg-err', 'Indica um email válido.');
      if (pwd.length < 6)         return showErr('rg-err', 'A palavra-passe precisa de pelo menos 6 caracteres.');
      btn.classList.add('loading');
      try {
        const data = await register(name, email, pwd);
        if (!data.session){
          // confirmação de email ativa → ainda não há sessão
          btn.classList.remove('loading');
          return showErr('rg-err', 'Conta criada! Confirma o teu email para entrares.');
        }
        toast('Conta criada. Bem-vindo, ' + _user.name.split(/\s+/)[0] + '! ☀');
        enterApp(_user);
      } catch(err){
        btn.classList.remove('loading');
        showErr('rg-err', err.message);
      }
    });
  }

  /* ---------- arranque ---------- */
  async function init(){
    wire();
    // mantém o cache sincronizado com mudanças de sessão
    sb.auth.onAuthStateChange((_event, session) => {
      _user = session && session.user ? toUser(session.user) : null;
    });
    // sessão ativa? entra direto (sem animação do portão)
    const { data: { session } } = await sb.auth.getSession();
    if (session && session.user){
      _user = toUser(session.user);
      enterApp(_user, false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  // API pública (igual à versão anterior)
  return { switchTab, toggleEye, logout, currentUser, toast };
})();
