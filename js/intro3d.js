/* =========================================================================
   Solário — INTRO 3D (Three.js) · versão "realista"
   --------------------------------------------------------------------------
   Fase 1 — um painel solar monta-se a partir de peças que voam para o lugar,
            sobre um céu de pôr-do-sol. Realismo dado por:
              · reflexos reais no vidro/moldura  → RoomEnvironment (env-map)
              · brilho do sol e dos realces        → UnrealBloomPass
              · cor cinematográfica                → ACESFilmicToneMapping
              · células com textura procedural de alta densidade
   Fase 2 — a cena 3D dissolve-se numa FOTOGRAFIA real (efeito Ken Burns).
   Fase 3 — tudo desaparece e revela o portão de autenticação (já no DOM).

   Modelo glTF (opcional): se existir o ficheiro  assets/solar-panel.glb,
   é carregado e usado como herói (entra a voar). Caso contrário, usa-se o
   painel procedural de alta fidelidade. Assim respeita-se a escolha "glTF"
   sem depender de um CDN externo que possa falhar no deploy.

   Robustez (nunca bloqueia o acesso ao site):
   - sem WebGL, ou addons/CDN em falta → degrada (sem bloom/env) ou termina.
   - prefers-reduced-motion → termina quase de imediato.
   - foto da fase 2 falha → salta direto para o fim.
   - qualquer erro → apanhado; o HTML tem ainda um timeout de segurança.
   ========================================================================= */
/* THREE é carregado DINAMICAMENTE dentro de runScene (não no topo do módulo):
   assim, numa visita repetida (guard de sessão) ou com reduce-motion, os ~670 KB
   do Three nem chegam a ser pedidos. Atribuído antes de qualquer uso. */
let THREE;

(function init(){
  const root = document.getElementById('intro3d');
  if (!root) return;

  /* já vista nesta sessão? → mostrar o site de imediato, sem repetir a faixa.
     (?intro força a repetição; útil para demonstrar / depurar) */
  const SEEN_KEY = 'sunny_intro_seen';
  const forceIntro = /[?&]intro\b/.test(location.search) || /debugintro|introframe/.test(location.search);
  let seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch(e){}
  if (seen && !forceIntro){ root.remove(); return; }
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch(e){}

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skipBtn = document.getElementById('introSkip');

  function finish(){
    if (root.dataset.done) return;
    root.dataset.done = '1';
    root.classList.add('fade-out');
    setTimeout(() => root.remove(), 950);
  }

  if (skipBtn) skipBtn.addEventListener('click', finish);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') finish(); }, { once:true });

  if (reduceMotion){ setTimeout(finish, 250); return; }

  runScene().catch(e => { console.warn('intro3d: a saltar a animação —', e); finish(); });

  /* =======================================================================
     TEXTURAS PROCEDURAIS (canvas — sem pedir ficheiros externos)
     ======================================================================= */
  function makeCellTexture(cols, rows){
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 640;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0a1424'; ctx.fillRect(0, 0, cv.width, cv.height);
    const cw = cv.width / cols, ch = cv.height / rows;
    for (let r = 0; r < rows; r++){
      for (let c = 0; c < cols; c++){
        const x = c*cw, y = r*ch;
        // gradiente diagonal subtil dentro de cada célula → aspeto monocristalino
        const g = ctx.createLinearGradient(x, y, x+cw, y+ch);
        g.addColorStop(0, '#0e1a32'); g.addColorStop(1, '#0a1426');
        ctx.fillStyle = g; ctx.fillRect(x+1, y+1, cw-2, ch-2);
        // cantos chanfrados (típico das células de silício)
        ctx.fillStyle = '#091120';
        const k = 5;
        ctx.fillRect(x+1, y+1, k, k); ctx.fillRect(x+cw-1-k, y+1, k, k);
        ctx.fillRect(x+1, y+ch-1-k, k, k); ctx.fillRect(x+cw-1-k, y+ch-1-k, k, k);
        ctx.strokeStyle = 'rgba(125,150,195,.30)'; ctx.lineWidth = 1;
        ctx.strokeRect(x+1, y+1, cw-2, ch-2);
        // busbars finos verticais
        ctx.strokeStyle = 'rgba(170,190,225,.22)';
        for (let b = 1; b <= 2; b++){
          const bx = x + cw*(b/3);
          ctx.beginPath(); ctx.moveTo(bx, y+2); ctx.lineTo(bx, y+ch-2); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = 'rgba(205,218,240,.5)';
    for (let r = 1; r < rows; r++) for (let c = 1; c < cols; c++){
      ctx.beginPath(); ctx.arc(c*cw, r*ch, 2.2, 0, Math.PI*2); ctx.fill();
    }
    const grad = ctx.createRadialGradient(cv.width*0.82, cv.height*0.14, 10, cv.width*0.82, cv.height*0.14, cv.width*0.55);
    grad.addColorStop(0, 'rgba(120,200,255,.22)'); grad.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function makeSkyTexture(){
    const cv = document.createElement('canvas');
    cv.width = 8; cv.height = 256;
    const ctx = cv.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, cv.height);
    grad.addColorStop(0,    '#050A28');
    grad.addColorStop(0.40, '#0E1E63');
    grad.addColorStop(0.70, '#1E63D8');
    grad.addColorStop(0.88, '#46A8FF');
    grad.addColorStop(1,    '#9BE0FF');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, cv.width, cv.height);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function mapTileUV(geometry, u0, v0, u1, v1){
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(
      [u0,v0,  u1,v0,  u0,v1,  u1,v1], 2));
  }

  function mulberry32(seed){
    let a = seed >>> 0;
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* =======================================================================
     CENA
     ======================================================================= */
  async function runScene(){
    THREE = await import('three');   // só agora se descarrega o Three (~670 KB)
    const canvas = document.getElementById('introCanvas');
    const isMobile = window.matchMedia('(max-width:768px)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias:!isMobile, alpha:false });
    } catch(e){ throw new Error('WebGL indisponível'); }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    scene.background = makeSkyTexture();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 7.2);
    camera.lookAt(0, 0, 0);

    /* ---- iluminação/reflexos REAIS a partir da própria fotografia de pôr-do-sol ----
       O painel 3D passa a refletir o céu real e fica sobre ele — depois a cena
       transita para essa mesma foto (Ken Burns), tornando tudo coerente.
       Se a foto não carregar (rede/CORS), recorre-se ao RoomEnvironment. */
    let photoEnvUsed = false;
    try {
      const photoEl = document.getElementById('introPhotoImg');
      const url = photoEl && photoEl.src;
      if (url){
        const tex = await new Promise((res, rej) => {
          const loader = new THREE.TextureLoader();
          loader.setCrossOrigin('anonymous');
          const to = setTimeout(() => rej(new Error('timeout')), 2500);
          loader.load(url, t => { clearTimeout(to); res(t); }, undefined, e => { clearTimeout(to); rej(e); });
        });
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;
        scene.environment = tex;        // reflexos do céu real no vidro/moldura
        photoEnvUsed = true;
      }
    } catch(e){ console.warn('intro3d: env de foto indisponível —', e); }

    if (!photoEnvUsed){
      try {
        const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      } catch(e){ console.warn('intro3d: env-map indisponível —', e); }
    }

    /* ---- pós-processamento: bloom (graceful) ---- */
    let composer = null, bloomPass = null;
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
      ]);
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        isMobile ? 0.42 : 0.85,   // strength (mais baixo no telemóvel — passo fullscreen é caro)
        0.6,                      // radius
        0.82                      // threshold
      );
      composer.addPass(bloomPass);
    } catch(e){ console.warn('intro3d: bloom indisponível —', e); composer = null; }

    function resize(){
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      if (composer) composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    /* ---- luz: sol quente + reforço frio (duotone) ---- */
    scene.add(new THREE.AmbientLight(0x3a4d7a, 0.6));
    const sunLight = new THREE.PointLight(0x8FC8FF, 42, 30, 2);
    sunLight.position.set(4.5, 3.5, 4);
    scene.add(sunLight);
    const sunMat = new THREE.MeshBasicMaterial({ color:0xEAF6FF });   // brilhante → ativa o bloom
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), sunMat);
    sunMesh.position.copy(sunLight.position);
    scene.add(sunMesh);
    const fill = new THREE.DirectionalLight(0x6E8FE0, 0.8);
    fill.position.set(-5, 2, 3);
    scene.add(fill);

    /* ---- grupo do painel ---- */
    const rig = new THREE.Group();
    rig.rotation.set(-0.18, 0.5, 0.05);
    scene.add(rig);

    const PW = 4.0, PH = 2.5;
    const pieces = [];
    const rng = mulberry32(20260615);

    function addPiece(mesh, toPos, toQuat, delay, dur){
      const dir = new THREE.Vector3(rng()*2-1, rng()*2-1, rng()*2-1).normalize();
      const fromPos = toPos.clone().add(dir.multiplyScalar(4.5 + rng()*3.2));
      const fromQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rng()*Math.PI*2, rng()*Math.PI*2, rng()*Math.PI*2));
      mesh.position.copy(fromPos);
      mesh.quaternion.copy(fromQuat);
      rig.add(mesh);
      pieces.push({ mesh, from:{ pos:fromPos, quat:fromQuat }, to:{ pos:toPos, quat:toQuat }, delay, dur });
    }

    const identityQ = new THREE.Quaternion();
    const goldMat  = new THREE.MeshStandardMaterial({ color:0xB9D6FF, metalness:1.0, roughness:0.2 });
    const navyMat  = new THREE.MeshStandardMaterial({ color:0x0c1428, metalness:0.3, roughness:0.7 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color:0xaecbff, metalness:0, roughness:0.06,
      transmission:0.5, transparent:true, opacity:0.16,
      clearcoat:1.0, clearcoatRoughness:0.05,
      envMapIntensity:1.4, side:THREE.DoubleSide
    });

    /* moldura — 4 barras */
    const barT = 0.12;
    [
      { size:[PW+barT*2, barT, barT], pos:[0,  PH/2+barT/2, 0] },
      { size:[PW+barT*2, barT, barT], pos:[0, -PH/2-barT/2, 0] },
      { size:[barT, PH+barT*2, barT], pos:[ PW/2+barT/2, 0, 0] },
      { size:[barT, PH+barT*2, barT], pos:[-PW/2-barT/2, 0, 0] },
    ].forEach((f, i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...f.size), goldMat);
      addPiece(mesh, new THREE.Vector3(...f.pos), identityQ.clone(), i*0.06, 1.5);
    });

    /* placa de fundo */
    {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(PW-0.05, PH-0.05, 0.06), navyMat);
      addPiece(mesh, new THREE.Vector3(0,0,-0.05), identityQ.clone(), 0.24, 1.5);
    }

    /* face de células — textura de alta densidade repartida em poucos "bocados" */
    const TEX_COLS = 6, TEX_ROWS = 10;
    const TILE_COLS = isMobile ? 3 : 4, TILE_ROWS = isMobile ? 3 : 4;
    const cellTexture = makeCellTexture(TEX_COLS, TEX_ROWS);
    const cellMat = new THREE.MeshStandardMaterial({ map: cellTexture, metalness:0.5, roughness:0.38, envMapIntensity:0.8 });
    const innerW = PW*0.94, innerH = PH*0.9;
    const tileW = innerW/TILE_COLS, tileH = innerH/TILE_ROWS;
    for (let r=0; r<TILE_ROWS; r++) for (let c=0; c<TILE_COLS; c++){
      const geo = new THREE.PlaneGeometry(tileW*0.985, tileH*0.985);
      mapTileUV(geo, c/TILE_COLS, 1-(r+1)/TILE_ROWS, (c+1)/TILE_COLS, 1-r/TILE_ROWS);
      const mesh = new THREE.Mesh(geo, cellMat);
      const x = -innerW/2 + tileW*(c+0.5);
      const y =  innerH/2 - tileH*(r+0.5);
      addPiece(mesh, new THREE.Vector3(x, y, 0.03), identityQ.clone(), 0.35 + (r+c)*0.06 + rng()*0.06, 1.15);
    }

    /* vidro de cobertura */
    {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), glassMat);
      addPiece(mesh, new THREE.Vector3(0,0,0.08), identityQ.clone(), 0.9, 0.9);
    }

    /* ---- glTF opcional (assets/solar-panel.glb) substitui o painel procedural ----
       Só descarregamos o GLTFLoader (~108 KB) SE o ficheiro existir mesmo:
       um HEAD barato evita puxar o loader em todos os carregamentos. */
    try {
      const head = await fetch('assets/solar-panel.glb', { method:'HEAD' }).catch(() => null);
      if (!head || !head.ok) throw new Error('sem modelo glTF');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new Promise((res, rej) => {
        const loader = new GLTFLoader();
        const to = setTimeout(() => rej(new Error('timeout')), 4000);
        loader.load('assets/solar-panel.glb',
          g => { clearTimeout(to); res(g); },
          undefined,
          err => { clearTimeout(to); rej(err); });
      });
      // sucesso: esconder o painel procedural e usar o modelo real como herói
      pieces.forEach(p => rig.remove(p.mesh));
      pieces.length = 0;
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 4.2 / Math.max(size.x, size.y, size.z || 1);
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      rig.add(model);
      addPiece(model, model.position.clone(), model.quaternion.clone(), 0.1, 1.6);
      console.info('intro3d: modelo glTF carregado (assets/solar-panel.glb).');
    } catch(e){ /* sem modelo — segue o painel procedural */ }

    /* ---- tempos ---- */
    const debugMatch = location.search.match(/debugintro(?:=(\d+))?/);
    const DEBUG_SLOW = debugMatch ? (+debugMatch[1] || 8) : 1.25;
    if (DEBUG_SLOW !== 1) pieces.forEach(p => { p.delay *= DEBUG_SLOW; p.dur *= DEBUG_SLOW; });
    const maxEnd   = Math.max(...pieces.map(p => p.delay + p.dur));
    const flashDur = 0.5 * DEBUG_SLOW;
    const flashAt  = maxEnd + 0.05 * DEBUG_SLOW;
    const sceneEnd = flashAt + flashDur + 0.25 * DEBUG_SLOW;

    const baseBloom = bloomPass ? bloomPass.strength : 0;
    const clock = new THREE.Clock();
    let raf = null, movedToPhoto = false;

    const easeOutBack = t => { const c1=0.55, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); };
    const easeOutCubic = t => 1 - Math.pow(1-t, 5);

    function render(){ if (composer) composer.render(); else renderer.render(scene, camera); }

    /* aplica o estado da animação a um instante t (sem render) */
    function stepTo(t){
      pieces.forEach(p => {
        const lt = THREE.MathUtils.clamp((t - p.delay) / p.dur, 0, 1);
        const e = lt < 1 ? easeOutBack(lt) : 1;
        p.mesh.position.lerpVectors(p.from.pos, p.to.pos, Math.min(e, 1));
        p.mesh.quaternion.slerp(p.to.quat, easeOutCubic(lt));
        if (lt >= 1) p.mesh.position.copy(p.to.pos);
      });
      rig.rotation.y = 0.5 + Math.sin(t*0.32) * 0.06;
      if (t >= flashAt){
        const lt = THREE.MathUtils.clamp((t - flashAt) / flashDur, 0, 1);
        const glow = Math.sin(lt * Math.PI);
        sunLight.intensity = 42 + glow * 55;
        sunMesh.scale.setScalar(1 + glow * 0.45);
        if (bloomPass) bloomPass.strength = baseBloom + glow * 0.7;
      }
    }

    /* modo stop-frame (?introframe=SEG): desenha 1 frame e congela — para
       inspeção visual / screenshots (a página estabiliza, não bloqueia). */
    const frameMatch = location.search.match(/introframe=([\d.]+)/);
    if (frameMatch){
      stepTo(parseFloat(frameMatch[1]));
      render();
      return;
    }

    function animate(){
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      stepTo(t);

      if (!movedToPhoto && t >= sceneEnd){
        movedToPhoto = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        goToPhotoPhase();
        return;
      }
      render();
    }
    animate();

    /* =====================================================================
       FASE 2 — fotografia real com efeito Ken Burns
       ===================================================================== */
    function goToPhotoPhase(){
      const photoWrap = document.getElementById('introPhoto');
      const photoImg  = document.getElementById('introPhotoImg');
      const holdMs = 2400 * DEBUG_SLOW;
      if (!photoWrap || !photoImg){ finish(); return; }

      const onReady = () => {
        canvas.style.transition = 'opacity 1s ease';
        canvas.style.opacity = '0';
        photoWrap.style.opacity = '1';
        photoImg.classList.add('kenburns');
        setTimeout(finish, holdMs);
      };
      if (photoImg.complete && photoImg.naturalWidth > 0) onReady();
      else if (photoImg.dataset.failed === '1') finish();
      else {
        photoImg.addEventListener('load', onReady, { once:true });
        photoImg.addEventListener('error', finish, { once:true });
      }
    }
  }
})();
