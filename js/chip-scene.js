/*
  Subtle 3D chip accent for the hero section.
  Built entirely from Three.js primitives — no external model files.
  Designed to read as ambient texture, not a focal element:
  low opacity, slow rotation, masked into the background via CSS.

  v2 improvements:
  - Real lighting (MeshStandardMaterial + directional/point lights) for depth
  - Animated "data pulse" traveling along circuit traces
  - Tiny tech labels on the chip face (echoes the skills section content)
  - Click to give the chip a one-off spin (light interaction, doesn't fight the ambient role)
  - Proper geometry/material disposal on theme change and teardown (no leaks)
*/
(function () {
  const canvas = document.getElementById('chip-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Theme-aware colors ── */
  function getColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      body: styles.getPropertyValue('--ink-line').trim() || '#1B212C',
      edge: styles.getPropertyValue('--wire').trim() || '#5FA8D3',
      pin: styles.getPropertyValue('--signal').trim() || '#E8763C',
      trace: styles.getPropertyValue('--slate').trim() || '#8B92A3',
      pulse: styles.getPropertyValue('--green').trim() || '#6FCF97',
      label: styles.getPropertyValue('--paper').trim() || '#EDEFF2',
    };
  }

  const LABELS = ['REACT', 'NODE', 'PY', 'NEXT'];

  let scene, camera, renderer, chipGroup;
  let targetRotX = -0.35, targetRotY = 0.5;
  let mouseX = 0, mouseY = 0;
  let frameId = null;
  let lastWidth = 0, lastHeight = 0;
  let spinVelocity = 0;
  let pulseMeshes = []; // { mesh, curve, t, speed }
  let disposables = []; // geometries/materials/textures to clean up

  /* ── Helper: track a disposable resource ── */
  function track(resource) {
    disposables.push(resource);
    return resource;
  }

  /* ── Helper: make a small canvas-texture label (e.g. "REACT") ── */
  function makeLabelTexture(text, color) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = '600 36px "JetBrains Mono", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return track(tex);
  }

  function buildChip(colors) {
    const group = new THREE.Group();
    pulseMeshes = [];

    /* Chip body — standard material so it actually catches light */
    const bodyGeo = track(new THREE.BoxGeometry(2.2, 0.22, 2.2));
    const bodyMat = track(new THREE.MeshStandardMaterial({
      color: colors.body,
      transparent: true,
      opacity: 0.92,
      roughness: 0.45,
      metalness: 0.25,
    }));
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = false;
    group.add(body);

    /* Body edges */
    const edgesGeo = track(new THREE.EdgesGeometry(bodyGeo));
    const edgeMat = track(new THREE.LineBasicMaterial({ color: colors.edge, transparent: true, opacity: 0.85 }));
    group.add(new THREE.LineSegments(edgesGeo, edgeMat));

    /* Pins around the perimeter */
    const pinGeo = track(new THREE.BoxGeometry(0.12, 0.06, 0.32));
    const pinMat = track(new THREE.MeshStandardMaterial({
      color: colors.pin, transparent: true, opacity: 0.9, roughness: 0.35, metalness: 0.4,
    }));
    const pinsPerSide = 7;
    const span = 1.7;

    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < pinsPerSide; i++) {
        const t = (i / (pinsPerSide - 1) - 0.5) * span;
        const pin = new THREE.Mesh(pinGeo, pinMat);
        const offset = 1.25;
        if (side === 0) { pin.position.set(t, 0, offset); }
        else if (side === 1) { pin.position.set(t, 0, -offset); }
        else if (side === 2) { pin.rotation.y = Math.PI / 2; pin.position.set(offset, 0, t); }
        else { pin.rotation.y = Math.PI / 2; pin.position.set(-offset, 0, t); }
        group.add(pin);
      }
    }

    /* Circuit-trace lines on top face */
    const traceMat = track(new THREE.LineBasicMaterial({ color: colors.trace, transparent: true, opacity: 0.55 }));
    const tracePaths = [
      [[-0.9, 0.12, -0.9], [-0.9, 0.12, 0.3], [-0.2, 0.12, 0.3]],
      [[0.9, 0.12, -0.5], [0.3, 0.12, -0.5], [0.3, 0.12, 0.9]],
      [[-0.5, 0.12, 0.9], [-0.5, 0.12, 0.5], [0.6, 0.12, 0.5], [0.6, 0.12, -0.9]],
    ];

    tracePaths.forEach(path => {
      const pts = path.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const geo = track(new THREE.BufferGeometry().setFromPoints(pts));
      group.add(new THREE.Line(geo, traceMat));

      /* Animated pulse traveling along this trace */
      const curve = new THREE.CatmullRomCurve3(pts);
      const pulseGeo = track(new THREE.SphereGeometry(0.045, 8, 8));
      const pulseMat = track(new THREE.MeshBasicMaterial({ color: colors.pulse, transparent: true, opacity: 0.95 }));
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      pulseMesh.visible = !prefersReducedMotion;
      group.add(pulseMesh);
      pulseMeshes.push({ mesh: pulseMesh, curve, t: Math.random(), speed: 0.18 + Math.random() * 0.12 });
    });

    /* Corner solder pads */
    const padGeo = track(new THREE.PlaneGeometry(0.18, 0.18));
    const padMat = track(new THREE.MeshStandardMaterial({
      color: colors.edge, transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.3, metalness: 0.5,
    }));
    [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach(([x, z]) => {
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.12, z);
      group.add(pad);
    });

    /* Tiny tech labels on the chip face — echoes the skills section */
    const labelGeo = track(new THREE.PlaneGeometry(0.7, 0.18));
    const labelPositions = [
      [-0.55, 0.13, -0.55], [0.55, 0.13, -0.2], [-0.2, 0.13, 0.6], [0.5, 0.13, 0.55],
    ];
    LABELS.forEach((text, i) => {
      const tex = makeLabelTexture(text, colors.label);
      const mat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false }));
      const mesh = new THREE.Mesh(labelGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      const pos = labelPositions[i % labelPositions.length];
      mesh.position.set(pos[0], pos[1], pos[2]);
      group.add(mesh);
    });

    group.rotation.x = targetRotX;
    group.rotation.y = targetRotY;
    return group;
  }

  function disposeAll() {
    disposables.forEach(d => { if (d && typeof d.dispose === 'function') d.dispose(); });
    disposables = [];
  }

  function setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 3, 2);
    scene.add(key);

    const rim = new THREE.PointLight(0x5fa8d3, 0.6, 10);
    rim.position.set(-2, 1.5, -2);
    scene.add(rim);
  }

  function init() {
    const rect = canvas.getBoundingClientRect();
    lastWidth = rect.width || 400;
    lastHeight = rect.height || 400;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, lastWidth / lastHeight, 0.1, 100);
    camera.position.set(0, 2.2, 5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(lastWidth, lastHeight, false);
    renderer.setClearColor(0x000000, 0);

    setupLights();

    chipGroup = buildChip(getColors());
    scene.add(chipGroup);

    window.addEventListener('resize', onResize, { passive: true });
    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
    }
    canvas.style.pointerEvents = 'none'; // ambient accent: clicks pass through to page by default

    /* Re-color (and rebuild) on theme toggle — dispose old resources first */
    const themeObserver = new MutationObserver(() => {
      scene.remove(chipGroup);
      disposeAll();
      chipGroup = buildChip(getColors());
      scene.add(chipGroup);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    animate();
  }

  function onResize() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || lastWidth;
    const h = rect.height || lastHeight;
    if (Math.abs(w - lastWidth) < 2 && Math.abs(h - lastHeight) < 2) return;
    lastWidth = w;
    lastHeight = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
    targetRotY = 0.5 + mouseX * 0.4;
    targetRotX = -0.35 + mouseY * 0.2;
  }

  function animate() {
    frameId = requestAnimationFrame(animate);
    if (!chipGroup) return;

    if (!prefersReducedMotion) {
      chipGroup.rotation.y += (targetRotY - chipGroup.rotation.y) * 0.04 + 0.0025 + spinVelocity;
      chipGroup.rotation.x += (targetRotX - chipGroup.rotation.x) * 0.04;
      spinVelocity *= 0.92; // decay any click-spin back to ambient drift

      /* Advance pulses along their traces */
      pulseMeshes.forEach(p => {
        p.t += p.speed * 0.016;
        if (p.t > 1) p.t = 0;
        const point = p.curve.getPoint(p.t);
        p.mesh.position.copy(point);
      });
    }
    renderer.render(scene, camera);
  }

  /* Pause rendering when hero is off-screen to save battery/CPU */
  function setupVisibilityPause() {
    const target = document.querySelector('.hero-wrapper');
    if (!target || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!frameId) animate();
        } else if (frameId) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
      });
    }, { threshold: 0.01 }).observe(target);
  }

  /* Light click interaction: a brief spin nudge, then settles back to ambient drift */
  function setupClickSpin() {
    if (prefersReducedMotion) return;
    const target = document.querySelector('.hero-wrapper');
    if (!target) return;
    target.addEventListener('click', e => {
      // Only trigger if the click landed on empty hero space, not on buttons/links/text
      if (e.target.closest('a, button, .editor-window')) return;
      spinVelocity += 0.05;
    });
  }

  /* Clean up on page unload to be a good citizen */
  window.addEventListener('beforeunload', () => {
    if (frameId) cancelAnimationFrame(frameId);
    disposeAll();
    if (renderer) renderer.dispose();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      setupVisibilityPause();
      setupClickSpin();
    });
  } else {
    init();
    setupVisibilityPause();
    setupClickSpin();
  }
})();