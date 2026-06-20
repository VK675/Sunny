/* =========================================================================
   Sunny — LANDING em scroll (substitui o intro 3D)
   Três efeitos, ao estilo de sites-vitrine modernos:
     1) reveal-on-scroll  — secções aparecem (fade + slide-up) ao entrar em vista
     2) count-up          — números sobem de 0 ao valor quando a secção surge
     3) parallax/cross-fade do fundo — fotos reais cruzam-se ao deslizar
   Reveal usa medição por scroll (getBoundingClientRect), não IntersectionObserver:
   é fiável em qualquer ambiente e nunca deixa conteúdo preso invisível.
   Robustez: sem JS, <html> não recebe 'js' → o CSS deixa tudo visível.
   Respeita prefers-reduced-motion (sem parallax/contagem; conteúdo estático).
   ========================================================================= */
(function(){
  const landing = document.getElementById('landing');
  if (!landing) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = [...landing.querySelectorAll('.reveal')];
  const layers  = [...landing.querySelectorAll('.lbg-layer')];

  /* ---------- count-up de números ---------- */
  function runCount(scope){
    scope.querySelectorAll('[data-count]').forEach(el => {
      const target = +el.dataset.count || 0;
      const suffix = el.dataset.suffix || '';
      if (reduce){ el.textContent = target + suffix; return; }
      const dur = 1200, t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);              // easeOutCubic
        el.textContent = Math.round(target * e) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function reveal(el){
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el.querySelector('[data-count]')) runCount(el);
  }

  /* reduce-motion: mostra tudo já, sem animar */
  if (reduce){
    reveals.forEach(reveal);
    if (layers[0]) layers[0].style.opacity = '1';
    return;
  }

  /* ---------- 1+2) reveal por scroll · 3) parallax/cross-fade ---------- */
  function update(){
    const vh = window.innerHeight;

    // reveal: aparece quando o topo do bloco passa 85% do ecrã
    for (const el of reveals){
      if (!el.classList.contains('in') && el.getBoundingClientRect().top < vh * 0.85) reveal(el);
    }

    // fundo: cruza as fotos consoante o progresso e desliza em parallax
    if (layers.length){
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      const prog = Math.min(1, Math.max(0, window.scrollY / max));
      const seg = prog * (layers.length - 1);
      const drift = window.scrollY * 0.08;
      layers.forEach((L, i) => {
        L.style.opacity = String(Math.max(0, 1 - Math.abs(seg - i)));
        L.style.transform = `translate3d(0, ${drift}px, 0) scale(1.12)`;
      });
    }
  }

  let ticking = false;
  const onScroll = () => { if (!ticking){ ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('load', update);
  update();   // estado inicial (revela o herói, pinta o fundo)
})();
