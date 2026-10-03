(function () {
  // viruzz background for spicetify.
  // ported straight from the bg-canvas and shape-field scripts on viruzz.xyz.
  //
  // what's different from the website:
  //   - the canvas and the shape layer get made here instead of living in the html
  //   - scroll parallax listens on the capture phase, because spotify scrolls
  //     inner containers and never the window itself
  //   - a "sweep" finds big opaque spotify panels sitting on top of the canvas and
  //     clears them, so the dots stay visible even if spotify renames its classes
  //     (the matching css rule is the data-vz-clear one in user.css)

  if (window.viruzzloaded) return;
  window.viruzzloaded = true;

  function boot() {
    if (!document.body) { setTimeout(boot, 50); return; }
    if (document.querySelector('#viruzz-bg-canvas')) return;

    const reducemotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ismobile = false; // desktop app, kept so the numbers match the site

    // ---------- 1. the dot lattice canvas ----------

    const canvas = document.createElement('canvas');
    canvas.id = 'viruzz-bg-canvas';
    const canvasstyle = [
      ['position', 'fixed'], ['inset', '0'], ['z-index', '-1'],
      ['pointer-events', 'none'], ['display', 'block'],
    ];
    for (const pair of canvasstyle) canvas.style.setProperty(pair[0], pair[1]);
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h;

    const spacing = ismobile ? 84 : 66;
    const linkdist = spacing * 1.5;
    const outerradius = ismobile ? 200 : 260;
    const rings = [
      { r: 0,    dotalpha: 0.95, dotsize: 2.4, linealpha: 0.5  },
      { r: 1.15, dotalpha: 0.4,  dotsize: 1.7, linealpha: 0.2  },
      { r: 3,    dotalpha: 0.2,  dotsize: 1,   linealpha: 0.05 },
    ];
    const flooralpha = 0.1;

    let dots = [];
    const mouse = { x: -9999, y: -9999, active: false };
    const smooth = { x: -9999, y: -9999 };
    const cursorease = 0.13;

    // a click sends a wave out through the lattice
    const ripples = [];
    const ripplems = 1150;
    const ripplereach = ismobile ? 320 : 460;
    const rippleband = 64;   // how wide the moving crest is
    const ripplepush = 13;   // how far a dot gets shoved outward at the crest
    const maxripples = 4;

    // the lattice drifts against the page while you scroll, which reads as depth
    const parallaxrate = 0.055;
    let parallax = 0;
    let parallaxgoal = 0;
    let wraph = 0;           // lattice height, so it can wrap around without a seam

    const rand = (min, max) => Math.random() * (max - min) + min;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(w / spacing) + 1;
      // two extra rows so the wrap seam always stays below the fold
      const rowcount = Math.ceil(h / spacing) + 2;
      wraph = rowcount * spacing;
      dots = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rowcount; j++) {
          const ox = i * spacing, oy = j * spacing;
          dots.push({
            ox, oy, x: ox, y: oy,
            basesize: rand(0.9, 1.4),
            phase: Math.random() * Math.PI * 2,
            driftspeed: rand(0.00014, 0.00037),
            driftradius: spacing * rand(0.04, 0.13),
          });
        }
      }
      if (reducemotion) { step(performance.now()); draw(); }
    }

    function ringvalue(t, key) {
      if (t <= rings[0].r) return rings[0][key];
      for (let k = 0; k < rings.length - 1; k++) {
        const a = rings[k], b = rings[k + 1];
        if (t >= a.r && t <= b.r) {
          const local = (t - a.r) / (b.r - a.r || 1);
          const eased = local * local * (3 - 2 * local); // smoothstep
          return a[key] + (b[key] - a[key]) * eased;
        }
      }
      return rings[rings.length - 1][key];
    }

    function fieldat(dist, key, fallback) {
      if (!mouse.active || dist >= outerradius) return fallback;
      return ringvalue(dist / outerradius, key);
    }

    function step(t) {
      if (mouse.active) {
        if (smooth.x === -9999) { smooth.x = mouse.x; smooth.y = mouse.y; }
        else {
          smooth.x += (mouse.x - smooth.x) * cursorease;
          smooth.y += (mouse.y - smooth.y) * cursorease;
        }
      }
      if (reducemotion) return;

      parallax += (parallaxgoal - parallax) * 0.08;
      while (ripples.length && t - ripples[0].t0 > ripplems) ripples.shift();

      for (const d of dots) {
        let x = d.ox + Math.sin(t * d.driftspeed + d.phase) * d.driftradius;
        let y = d.oy + Math.cos(t * d.driftspeed * 0.83 + d.phase * 1.1) * d.driftradius;
        y = ((y + parallax) % wraph + wraph) % wraph;

        let glow = 0;
        for (let k = 0; k < ripples.length; k++) {
          const rip = ripples[k];
          const age = (t - rip.t0) / ripplems;
          if (age < 0 || age >= 1) continue;
          const crest = ripplereach * (1 - Math.pow(1 - age, 3));
          const dx = x - rip.x, dy = y - rip.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const band = Math.abs(dist - crest);
          if (band > rippleband) continue;
          const falloff = (1 - band / rippleband) * (1 - age);
          glow += falloff;
          const push = falloff * ripplepush;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
        }
        d.x = x;
        d.y = y;
        d.glow = glow > 1 ? 1 : glow;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      const distances = new Array(dots.length);
      const near = [];
      if (mouse.active) {
        for (let i = 0; i < dots.length; i++) {
          const dx = dots[i].x - smooth.x;
          const dy = dots[i].y - smooth.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          distances[i] = dist;
          if (dist < outerradius) near.push(i);
        }
      }

      // the lines that follow the cursor around
      ctx.lineWidth = 1;
      if (mouse.active) {
        for (let ii = 0; ii < near.length; ii++) {
          const i = near[ii], a = dots[i];
          for (let jj = ii + 1; jj < near.length; jj++) {
            const j = near[jj], b = dots[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const sepsq = dx * dx + dy * dy;
            if (sepsq > linkdist * linkdist) continue;

            const nearer = Math.min(distances[i], distances[j]);
            const strength = fieldat(nearer, 'linealpha', flooralpha);
            if (strength <= 0.002) continue;

            const closeness = 1 - Math.sqrt(sepsq) / linkdist;
            const alpha = strength * closeness;
            if (alpha <= 0.002) continue;

            ctx.strokeStyle = `rgba(224,234,249,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // the dots themselves
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const dist = mouse.active ? distances[i] : Infinity;
        const glow = d.glow || 0;

        let alpha = fieldat(dist, 'dotalpha', flooralpha);
        if (glow > 0) alpha = Math.min(alpha + glow * 0.85, 1);
        if (alpha <= 0.002) continue;

        const ringsize = fieldat(dist, 'dotsize', 1.0);
        const radius = d.basesize * ringsize * (1 + glow * 1.1);

        ctx.beginPath();
        ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
        // the ripple crest picks up the blue, everything else stays neutral
        ctx.fillStyle = glow > 0.04
          ? `rgba(${Math.round(224 - glow * 85)},${Math.round(234 - glow * 80)},249,${alpha})`
          : `rgba(224,234,249,${alpha})`;
        ctx.fill();
      }
    }

    function loop() {
      step(performance.now());
      draw();
      if (!reducemotion) requestAnimationFrame(loop);
    }

    function addripple(x, y) {
      if (reducemotion) return;
      if (ripples.length >= maxripples) ripples.shift();
      ripples.push({ x, y, t0: performance.now() });
    }

    window.addEventListener('resize', resize);

    // spotify scrolls inner containers, so listen on the capture phase and
    // follow whichever big scroller (the main view) is moving
    document.addEventListener('scroll', (e) => {
      const t = e.target;
      if (!t || t === document) { parallaxgoal = window.scrollY * parallaxrate; return; }
      if (t.clientWidth > window.innerWidth * 0.4) parallaxgoal = (t.scrollTop || 0) * parallaxrate;
    }, { capture: true, passive: true });

    // clicks on real controls shouldn't fire a ripple behind them
    window.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest &&
          e.target.closest('a, button, input, select, textarea, code, [role="button"], [role="slider"]')) return;
      addripple(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    });
    window.addEventListener('mouseleave', () => { mouse.active = false; });
    document.documentElement.addEventListener('mouseleave', () => { mouse.active = false; });

    resize();
    if (reducemotion) draw(); else requestAnimationFrame(loop);

    // ---------- 2. the drifting shapes ----------

    if (!reducemotion) {
      const istablet = window.innerWidth <= 900;
      const field = document.createElement('div');
      field.className = 'vz-shape-field';
      field.setAttribute('aria-hidden', 'true');

      const drifts = ['a', 'b', 'c', 'd', 'e', 'f'].map((letter) => 'vz-shape-drift-' + letter);
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      const hexpoints = '50,3 93,26 93,74 50,97 7,74 7,26';

      function makeshape(spec) {
        const el = document.createElement('div');
        el.className = 'vz-shape' + (spec.circle ? ' vz-shape-circle' : '') +
          (spec.hex ? ' vz-shape-hex' : '') + (spec.spectral ? ' vz-shape-spectral' : '');
        el.style.width = spec.size + 'px';
        el.style.height = spec.size + 'px';
        el.style.left = spec.left + '%';
        el.style.top = spec.top + '%';

        const duration = rand(spec.durmin, spec.durmax);
        // negative delay starts each shape mid cycle so the field never moves in sync
        const delay = -rand(0, duration);
        let animation = pick(drifts) + ' ' + duration.toFixed(1) + 's ease-in-out ' + delay.toFixed(1) + 's infinite';

        if (spec.glow) {
          const glowlength = rand(4, 9);
          const glowdelay = -rand(0, glowlength);
          el.style.setProperty('--glow-color', 'var(--vz-spectral)');
          animation += ', vz-shape-glow-flicker ' + glowlength.toFixed(1) + 's ease-in-out ' + glowdelay.toFixed(1) + 's infinite';
        }
        el.style.animation = animation;

        if (spec.hex) {
          el.innerHTML =
            '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
            '<polygon points="' + hexpoints + '" fill="none" stroke="currentcolor" stroke-width="1.5"/></svg>';
        }
        return el;
      }

      const count = istablet ? 9 : 14;
      const sizerange = istablet ? [34, 96] : [38, 145];
      const kinds = ['circle', 'square', 'hex'];
      for (let i = 0; i < count; i++) {
        const kind = pick(kinds);
        const spectral = Math.random() < 0.42;
        field.appendChild(makeshape({
          circle: kind === 'circle',
          hex: kind === 'hex',
          spectral,
          glow: spectral && Math.random() < 0.55,
          size: rand(sizerange[0], sizerange[1]),
          left: rand(-4, 96),
          top: rand(-4, 96),
          durmin: 18,
          durmax: 41,
        }));
      }
      // right after the canvas: same z-index, so dom order decides who is on top
      canvas.parentNode.insertBefore(field, canvas.nextSibling);
    }

    // ---------- 3. the sweep: stop spotify's big panels from hiding the canvas ----------

    const clearattr = 'data-vz-clear';
    const skipselector = '#context-menu, [role="dialog"], [role="menu"], [role="listbox"], [aria-modal="true"],' +
                         '.GenericModal__overlay, .GenericModal__wrapper, .main-contextMenu-menu,' +
                         '.vz-shape-field, #viruzz-bg-canvas';

    function alphaof(color) {
      if (!color || color === 'transparent') return 0;
      const found = color.match(/rgba?\(([^)]+)\)/);
      if (!found) return 0;
      const parts = found[1].split(/[\s,\/]+/).filter(Boolean);
      return parts.length > 3 ? parseFloat(parts[3]) : 1;
    }

    function sweep() {
      if (document.hidden) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const probes = [[.55,.3],[.55,.55],[.55,.8],[.35,.5],[.9,.5],[.08,.3],[.08,.7],[.95,.2]];
      const seen = new Set();
      for (const probe of probes) {
        for (const el of document.elementsFromPoint(probe[0] * vw, probe[1] * vh)) {
          if (seen.has(el)) continue;
          seen.add(el);
          if (el === document.documentElement || el === document.body) continue;
          if (el.hasAttribute(clearattr) || el.closest(skipselector)) continue;
          const box = el.getBoundingClientRect();
          if (box.height < vh * 0.5 || box.width * box.height < vw * vh * 0.12) continue;
          const style = getComputedStyle(el);
          if (style.backgroundImage !== 'none') continue;     // leave gradients and artwork alone
          if (alphaof(style.backgroundColor) < 0.97) continue; // leave on-purpose tints alone
          el.setAttribute(clearattr, '');
        }
      }
    }

    let sweeptimer = null;
    const queuesweep = () => { clearTimeout(sweeptimer); sweeptimer = setTimeout(sweep, 250); };
    new MutationObserver(queuesweep).observe(document.body, { childList: true, subtree: true });
    setInterval(sweep, 2000);
    sweep();
  }

  boot();
})();
