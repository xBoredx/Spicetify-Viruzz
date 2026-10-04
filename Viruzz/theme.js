// viruzz theme: background dots, floating shapes and the box outlines
(function () {

  if (window.viruzzloaded) return;
  window.viruzzloaded = true;

  function boot() {
    if (!document.body) { setTimeout(boot, 50); return; }
    if (document.querySelector('#viruzz-bg-canvas')) return;

    const reducemotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ismobile = false;
    let accentrgb = [139, 154, 237];

    // our layers get their key layout inline, so they can never push spotify down if the css isn't loaded
    const pin = (el, rules) => { for (const k in rules) el.style.setProperty(k, rules[k]); };
    const overlay = { position: 'fixed', inset: '0', 'pointer-events': 'none' };

    // the dot grid that reacts to your mouse
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
      { r: 0, dotalpha: 0.95, dotsize: 2.4, linealpha: 0.5 },
      { r: 1.15, dotalpha: 0.4, dotsize: 1.7, linealpha: 0.2 },
      { r: 3, dotalpha: 0.2, dotsize: 1, linealpha: 0.05 },
    ];
    const flooralpha = 0.1;

    let dots = [];
    const mouse = { x: -9999, y: -9999, active: false };
    const smooth = { x: -9999, y: -9999 };
    const cursorease = 0.13;

    const ripples = [];
    const ripplems = 1150;
    const ripplereach = ismobile ? 320 : 460;
    const rippleband = 64;
    const ripplepush = 13;
    const maxripples = 4;

    const parallaxrate = 0.055;
    let parallax = 0;
    let parallaxgoal = 0;
    let wraph = 0;

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
          const eased = local * local * (3 - 2 * local);
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
        ctx.fillStyle = glow > 0.04
          ? `rgba(${Math.round(224 + (accentrgb[0] - 224) * glow)},${Math.round(234 + (accentrgb[1] - 234) * glow)},${Math.round(249 + (accentrgb[2] - 249) * glow)},${alpha})`
          : `rgba(224,234,249,${alpha})`;
        ctx.fill();
      }
    }

    function loop() {
      step(performance.now());
      draw();
      try { placeframes(); } catch (err) {}
      if (!reducemotion) requestAnimationFrame(loop);
    }

    function addripple(x, y) {
      if (reducemotion) return;
      if (ripples.length >= maxripples) ripples.shift();
      ripples.push({ x, y, t0: performance.now() });
    }

    window.addEventListener('resize', resize);

    document.addEventListener('scroll', (e) => {
      const t = e.target;
      if (!t || t === document) { parallaxgoal = window.scrollY * parallaxrate; return; }
      if (t.clientWidth > window.innerWidth * 0.4) parallaxgoal = (t.scrollTop || 0) * parallaxrate;
    }, { capture: true, passive: true });

    window.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest &&
          e.target.closest('a, button, input, select, textarea, code, [role="button"], [role="slider"], .vz-settings-overlay')) return;
      addripple(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    });
    window.addEventListener('mouseleave', () => { mouse.active = false; });
    document.documentElement.addEventListener('mouseleave', () => { mouse.active = false; });

    resize();
    if (reducemotion) draw(); else requestAnimationFrame(loop);

    // the floating shapes in the background
    if (!reducemotion) {
      const istablet = window.innerWidth <= 900;
      const field = document.createElement('div');
      field.className = 'vz-shape-field';
      pin(field, Object.assign({ 'z-index': '-1', overflow: 'hidden' }, overlay));
      field.setAttribute('aria-hidden', 'true');

      const drifts = ['a', 'b', 'c', 'd', 'e', 'f'].map((letter) => 'vz-shape-drift-' + letter);
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      const hexpoints = '50,3 93,26 93,74 50,97 7,74 7,26';

      function makeshape(spec) {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.className = 'vz-shape' + (spec.circle ? ' vz-shape-circle' : '') +
          (spec.hex ? ' vz-shape-hex' : '') + (spec.spectral ? ' vz-shape-spectral' : '');
        el.style.width = spec.size + 'px';
        el.style.height = spec.size + 'px';
        el.style.left = spec.left + '%';
        el.style.top = spec.top + '%';

        const duration = rand(spec.durmin, spec.durmax);
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
      canvas.parentNode.insertBefore(field, canvas.nextSibling);
    }

    const clearattr = 'data-vz-clear';
    const skipselector = '#context-menu, [role="dialog"], [role="menu"], [role="listbox"], [aria-modal="true"],' +
                         '.GenericModal__overlay, .GenericModal__wrapper, .main-contextMenu-menu,' +
                         '.Root__now-playing-bar, .main-card-card, .vz-shape-field, #viruzz-bg-canvas';

    function alphaof(color) {
      if (!color || color === 'transparent') return 0;
      const found = color.match(/\(([^)]+)\)/);
      if (!found) return 0;
      const inner = found[1];
      if (inner.indexOf('/') !== -1) {
        const raw = inner.split('/')[1].trim();
        const a = parseFloat(raw);
        if (isNaN(a)) return 1;
        return raw.indexOf('%') !== -1 ? a / 100 : a;
      }
      const parts = inner.split(/[\s,]+/).filter(Boolean);
      return /^rgba?/.test(color) && parts.length > 3 ? parseFloat(parts[3]) : 1;
    }

    // makes big solid spotify panels see-through so the dots show
    function sweepbig() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const probes = [[.55,.3],[.55,.55],[.55,.8],[.35,.5],[.9,.5],[.08,.3],[.08,.7],[.95,.2],
                      [.55,.1],[.55,.18],[.7,.12],[.35,.15]];
      const seen = new Set();
      for (const probe of probes) {
        for (const el of document.elementsFromPoint(probe[0] * vw, probe[1] * vh)) {
          if (seen.has(el)) continue;
          seen.add(el);
          if (el === document.documentElement || el === document.body) continue;
          if (el.hasAttribute(clearattr) || el.hasAttribute('data-vz-sticky') || el.closest(skipselector)) continue;
          const box = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const bgimage = style.backgroundImage;
          if (bgimage.indexOf('gradient') !== -1 && bgimage.indexOf('url(') === -1) {
            if (box.width >= vw * 0.25 && box.height >= vh * 0.1 && box.width * box.height >= vw * vh * 0.06) {
              el.setAttribute(clearattr, '');
            }
            continue;
          }
          if (box.height < vh * 0.5 || box.width * box.height < vw * vh * 0.12) continue;
          if (bgimage !== 'none') continue;
          if (alphaof(style.backgroundColor) < 0.97) continue;
          el.setAttribute(clearattr, '');
        }
      }
    }

    const panelattr = 'data-vz-panel';

    const panelwatch = new ResizeObserver(() => { placeframes(); queuesweep(); });
    let watched = new Set();

    // draws the outlines on top of everything so nothing covers them
    const framelayer = document.createElement('div');
    framelayer.className = 'vz-frame-layer';
    pin(framelayer, Object.assign({ 'z-index': '50' }, overlay));
    document.body.appendChild(framelayer);
    const frames = new Map();

    function placeframes() {
      frames.forEach((f, el) => {
        const b = el.getBoundingClientRect();
        const key = b.left + ',' + b.top + ',' + b.width + ',' + b.height;
        if (f._vzkey === key) return;
        f._vzkey = key;
        f.style.transform = 'translate(' + b.left + 'px,' + b.top + 'px)';
        f.style.width = b.width + 'px';
        f.style.height = b.height + 'px';
      });
      placetabs();
    }

    // round arrows sitting 24px in from the window edge
    function placetabs() {
      placestrip();
      placewinbuttons();
      ['left', 'right'].forEach((side) => {
        const tab = tabs[side];
        if (!tab || !hidden[side]) return;
        const x = side === 'left' ? 24 : window.innerWidth - 24 - 36;
        const y = window.innerHeight / 2 - 18;
        const key = x + ',' + y;
        if (tab._vzkey === key) return;
        tab._vzkey = key;
        tab.style.left = x + 'px';
        tab.style.top = y + 'px';
      });
    }

    function syncframes(wanted) {
      frames.forEach((f, el) => { if (!wanted.has(el)) { f.remove(); frames.delete(el); } });
      wanted.forEach((el) => {
        if (frames.has(el)) return;
        const f = document.createElement('div');
        f.className = 'vz-frame';
        pin(f, { position: 'absolute', top: '0', left: '0' });
        framelayer.appendChild(f);
        frames.set(el, f);
      });
      placeframes();
    }

    function panelfrom(x, y, others) {
      const vw = window.innerWidth, vh = window.innerHeight;
      // skip our own arrows and layers, the right arrow was blocking the right sidebar check
      let el = document.elementsFromPoint(x, y).find((n) => !(n.closest && n.closest('.vz-frame-layer, .vz-shape-field, #viruzz-bg-canvas, .vz-winbtns, .vz-settings-overlay')));
      let best = null;
      while (el && el !== document.body && el !== document.documentElement) {
        const b = el.getBoundingClientRect();
        if (b.width >= vw * 0.97 || b.height >= vh * 0.97) break;
        if (others.some((o) => o[0] >= b.left && o[0] <= b.right && o[1] >= b.top && o[1] <= b.bottom)) break;
        if (b.height >= vh * 0.5) best = el;
        el = el.parentElement;
      }
      return best;
    }

    const playerattr = 'data-vz-player';
    const setinline = new Set();

    const topattr = 'data-vz-topbar';

    function barfrom(y, fromtop) {
      const vw = window.innerWidth, vh = window.innerHeight;
      let el = document.elementFromPoint(vw * 0.5, y);
      let best = null;
      while (el && el !== document.body && el !== document.documentElement) {
        const b = el.getBoundingClientRect();
        if (b.height > vh * 0.2) break;
        const nearedge = fromtop ? b.top <= 24 : b.bottom >= vh - 24;
        if (b.width >= vw * 0.5 && nearedge) best = el;
        el = el.parentElement;
      }
      return best;
    }

    function settag(attr, wanted) {
      document.querySelectorAll('[' + attr + ']').forEach((old) => {
        if (wanted.has(old)) return;
        old.removeAttribute(attr);
        if (setinline.has(old)) { old.style.position = ''; setinline.delete(old); }
      });
      wanted.forEach((el) => {
        if (el.hasAttribute(attr)) return;
        el.setAttribute(attr, '');
        if (getComputedStyle(el).position === 'static') { el.style.position = 'relative'; setinline.add(el); }
      });
    }

    const lastpanels = [null, null, null];

    // real visible width of a panel, used to spot hidden sidebars
    function realwidth(el) {
      const b = el.getBoundingClientRect();
      if (!el.hasAttribute(panelattr)) return b.width;
      const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
      return b.width - pad * 2;
    }

    // finds the sidebars and main view so they get an outline
    function tagpanels() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const spots = [[40, vh * 0.5], [vw * 0.6, vh * 0.5], [vw - 30, vh * 0.5]];
      const wanted = new Set();
      let main = null;
      // spotify's layout grid names its slots, so grab the sidebars and main view by name first
      const mv = document.getElementById('main-view');
      const grid = mv && mv.parentElement && getComputedStyle(mv.parentElement).display === 'grid' ? mv.parentElement : null;
      const byarea = (name) => grid && [...grid.children].find((c) => {
        const area = getComputedStyle(c).gridArea;
        return area === name || area.startsWith(name + ' ');
      });
      const named = [(grid && byarea('left-sidebar')) || document.getElementById('Desktop_LeftSidebar_Id'), grid && mv, null];
      spots.forEach((spot, index) => {
        let panel = named[index] || panelfrom(spot[0], spot[1], spots.filter((s) => s !== spot));
        if (!panel && index === 2 && grid) {
          const slot = byarea('right-sidebar');
          if (slot && slot.getBoundingClientRect().width >= 140) panel = slot;
        }
        if (!panel && lastpanels[index] && lastpanels[index].isConnected) panel = lastpanels[index];
        if (panel && realwidth(panel) < 40) panel = null;
        lastpanels[index] = panel;
        if (!panel) return;
        wanted.add(panel);
        if (index === 1) main = panel;
      });
      wanted.forEach((a) => { wanted.forEach((b) => { if (a !== b && a.contains(b)) wanted.delete(a); }); });
      settag(panelattr, wanted);
      wanted.forEach((el) => {
        const compact = realwidth(el) < 140;
        if (compact !== el.hasAttribute('data-vz-compact')) el.toggleAttribute('data-vz-compact', compact);
      });
      document.querySelectorAll('[data-vz-compact]').forEach((el) => {
        if (!wanted.has(el)) el.removeAttribute('data-vz-compact');
      });
      if (wanted.size !== watched.size || [...wanted].some((el) => !watched.has(el))) {
        panelwatch.disconnect();
        wanted.forEach((el) => panelwatch.observe(el));
        watched = wanted;
      }
      syncframes(wanted);

      document.querySelectorAll('[data-vz-corner]').forEach((el) => el.removeAttribute('data-vz-corner'));

      const player = barfrom(window.innerHeight - 20, false);
      const top = barfrom(28, true);
      settag(playerattr, new Set(player && !wanted.has(player) ? [player] : []));
      settag(topattr, new Set(top && !wanted.has(top) && top !== player ? [top] : []));
      if (top) {
        const extra = Math.max(0, Math.round(window.innerWidth - top.getBoundingClientRect().right)) + 'px';
        if (top.style.getPropertyValue('--vz-topbar-extra') !== extra) top.style.setProperty('--vz-topbar-extra', extra);

        let strip = document.elementFromPoint(window.innerWidth - 20, 20);
        while (strip && strip !== document.body && strip !== top && !top.contains(strip)) {
          const b = strip.getBoundingClientRect();
          if (b.width >= window.innerWidth * 0.2 || b.height > window.innerHeight * 0.1) break;
          if (b.width >= 100 && b.right >= window.innerWidth - 2 && !strip.hasAttribute(clearattr)) {
            strip.setAttribute(clearattr, '');
          }
          strip = strip.parentElement;
        }
      }
      return main;
    }

    const pseudoattr = 'data-vz-clearpseudo';
    const stickyattr = 'data-vz-sticky';
    let mainpanel = null;

    function tintedcolor(style) {
      const image = style.backgroundImage;
      if (image.indexOf('url(') !== -1) return false;
      return alphaof(style.backgroundColor) > 0.02 || image.indexOf('gradient') !== -1;
    }

    // removes the colored tint spotify adds from cover art
    function checktint(el) {
      if (!mainpanel || !el || el.nodeType !== 1 || el === mainpanel) return;
      const scope = document.getElementById('main-view') || mainpanel;
      if (!scope.contains(el) || el.contains(mainpanel)) return;
      if (el.hasAttribute(clearattr) || el.closest(skipselector)) return;
      const vh = window.innerHeight;
      const mb = mainpanel.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      if (b.width >= mb.width * 0.9 && b.height <= vh * 0.2 && b.top <= mb.top + 140) {
        if (el.hasAttribute(stickyattr)) return;
        if (tintedcolor(getComputedStyle(el))) { el.setAttribute(stickyattr, ''); return; }
      }
      if (b.width < mb.width * 0.5 || b.height < vh * 0.08) return;
      const style = getComputedStyle(el);
      if (tintedcolor(style)) { el.setAttribute(clearattr, ''); return; }
      if (!el.hasAttribute(pseudoattr)) {
        for (const which of ['::before', '::after']) {
          const pseudo = getComputedStyle(el, which);
          if (pseudo.content !== 'none' && pseudo.content !== 'normal' && tintedcolor(pseudo)) {
            el.setAttribute(pseudoattr, '');
            break;
          }
        }
      }
    }

    function sweeptint(main) {
      mainpanel = main || mainpanel;
      if (!mainpanel) return;
      const mb = mainpanel.getBoundingClientRect();
      const seen = new Set();
      for (const fx of [0.2, 0.4, 0.6, 0.8]) {
        for (const fy of [0.06, 0.14, 0.24, 0.36, 0.5, 0.65, 0.8]) {
          const x = mb.left + mb.width * fx, y = mb.top + mb.height * fy;
          for (const el of document.elementsFromPoint(x, y)) {
            if (seen.has(el)) continue;
            seen.add(el);
            checktint(el);
          }
        }
      }
    }

    // collapsing your library fully hides the left sidebar, closing now playing hides the right one.
    // an arrow only shows while a sidebar is hidden and brings it back
    const hidden = { left: false, right: false };
    const tabs = {};
    let leftwait = 0;
    // only the your library button fully hides it, dragging it small just gives spotify's icon strip
    let wantshut = false, shuttime = 0;
    try { wantshut = localStorage.getItem('vz-left-shut') === '1'; } catch (err) {}
    const saveshut = (v) => { wantshut = v; try { localStorage.setItem('vz-left-shut', v ? '1' : '0'); } catch (err) {} };
    document.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest && e.target.closest('button');
      const label = btn ? btn.getAttribute('aria-label') || '' : '';
      if (/library/i.test(label) && /collapse|close|hide/i.test(label)) { saveshut(true); shuttime = Date.now(); queuesweep(); }
    }, true);

    function layoutgrid() {
      const mv = document.getElementById('main-view');
      const g = mv && mv.parentElement;
      return g && getComputedStyle(g).display === 'grid' ? g : null;
    }

    function cellfor(side) {
      const grid = layoutgrid();
      if (!grid) return side === 'left' ? document.getElementById('Desktop_LeftSidebar_Id') : null;
      const name = side + '-sidebar';
      return [...grid.children].find((c) => {
        const area = getComputedStyle(c).gridArea;
        return area === name || area.startsWith(name + ' ');
      }) || null;
    }

    // hiding the left sidebar leaves its column behind, so squash it to 0 and let the main view stretch
    let fitted = null;
    function fitgrid() {
      const grid = layoutgrid();
      if (!grid) return;
      fitted = grid;
      grid.style.removeProperty('grid-template-columns');
      const mv = document.getElementById('main-view');
      if (mv) {
        mv.style.marginLeft = '';
        mv.style.marginRight = '';
        ['max-width', 'width', 'justify-self'].forEach((p) => mv.style.removeProperty(p));
      }
      if (!hidden.left && !hidden.right && !stripon) return;
      // use spotify's own column rule when we can find it, so the right sidebar keeps resizing and closing
      const raw = gridrule(grid);
      const parts = raw ? splittracks(raw) : (getComputedStyle(grid).gridTemplateColumns.match(/\[[^\]]*\]|[^\s\[\]]+/g) || []);
      const sizes = [];
      parts.forEach((p, i) => { if (p[0] !== '[') sizes.push(i); });
      if (sizes.length < 2) return;
      let main = sizes.find((i) => /fr\b/.test(parts[i]));
      if (main === undefined && raw) main = sizes[Math.floor(sizes.length / 2)];
      if (main === undefined) {
        main = sizes[0];
        sizes.forEach((i) => { if (parseFloat(parts[i]) > parseFloat(parts[main])) main = i; });
      }
      const last = sizes[sizes.length - 1];
      if (hidden.left && sizes[0] !== main) parts[sizes[0]] = '0px';
      if ((hidden.right || stripon) && last !== main) parts[last] = '0px';
      if (!raw) parts[main] = 'minmax(0, 1fr)';
      grid.style.setProperty('grid-template-columns', parts.join(' '), 'important');
      // line the main view's edges up with the player bar's outline on a hidden side
      if (mv) {
        const gs = getComputedStyle(grid), gb = grid.getBoundingClientRect(), mb = mv.getBoundingClientRect();
        let edge = {
          left: gb.left + (parseFloat(gs.paddingLeft) || 0),
          right: gb.right - (parseFloat(gs.paddingRight) || 0),
        };
        // the player bar's outline is drawn inset from its box, so match that line, not the box
        const player = document.querySelector('[data-vz-player]');
        if (player) {
          const pb = player.getBoundingClientRect(), ps = getComputedStyle(player, '::after');
          edge = { left: pb.left + (parseFloat(ps.left) || 0), right: pb.right - (parseFloat(ps.right) || 0) };
        }
        // spotify gives the main view a fixed width, so let it stretch or the margins do nothing
        mv.style.setProperty('max-width', 'none', 'important');
        mv.style.setProperty('width', 'auto', 'important');
        mv.style.setProperty('justify-self', 'stretch', 'important');
        if (hidden.left) mv.style.marginLeft = (edge.left - mb.left) + 'px';
        // strip mode: same stretch, then pull the main view back in to make room for the strip
        stripgap = parseFloat(gs.columnGap) || 8;
        stripedge = edge.right;
        if (hidden.right || stripon) mv.style.marginRight = (mb.right - edge.right + (stripon ? stripwidth + stripgap : 0)) + 'px';
      }
    }

    function gridrule(grid) {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch (err) { continue; }
        for (const r of rules) {
          if (!r.style || !r.selectorText || !r.style.gridTemplateColumns) continue;
          try { if (grid.matches(r.selectorText)) return r.style.gridTemplateColumns; } catch (err) {}
        }
      }
      return null;
    }

    // split a grid template into tracks without breaking up var(...) or [names]
    function splittracks(text) {
      const out = [];
      let cur = '', depth = 0;
      for (const ch of text.trim()) {
        if (ch === '(' || ch === '[') depth++;
        if (ch === ')' || ch === ']') depth--;
        if (/\s/.test(ch) && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
      }
      if (cur) out.push(cur);
      return out;
    }

    // while the left one is hidden, keep re-reading spotify's sizes so dragging / closing the right one still works
    let refitqueued = false;
    function refitsoon() {
      if ((!hidden.left && !hidden.right && !stripon) || refitqueued) return;
      refitqueued = true;
      requestAnimationFrame(() => { refitqueued = false; fitgrid(); });
    }
    document.addEventListener('pointermove', (e) => { if (e.buttons) refitsoon(); }, true);
    document.addEventListener('pointerup', refitsoon, true);
    window.addEventListener('resize', refitsoon);

    // the grid slot the right sidebar lives in, found from whatever is showing on the right
    let rightcell = null, rightwait = 0;
    function findrightcell() {
      const grid = layoutgrid();
      let el = lastpanels[2];
      while (el && grid && el.parentElement && el.parentElement !== grid) el = el.parentElement;
      return el && grid && el.parentElement === grid && !el.contains(document.getElementById('main-view')) ? el : null;
    }

    // spotify's own buttons that open the right sidebar (now playing, queue, devices) should still work while we have it hidden
    document.addEventListener('click', (e) => {
      if (!hidden.right && !stripon) return;
      const btn = e.target && e.target.closest && e.target.closest('button');
      if (!btn || btn.closest('.vz-frame-layer')) return;
      const label = (btn.getAttribute('aria-label') || '') + ' ' + (btn.getAttribute('data-testid') || '');
      if (/now playing|npv|queue|connect|device|lyrics/i.test(label)) {
        rightwait = Date.now() + 1500;
        if (stripon) setstrip(false); else sethidden('right', false);
      }
    }, true);

    // widest thing we can find on the right, the position check alone sometimes misses it
    function rightwidth() {
      return Math.max(0, ...[lastpanels[2], rightcell, cellfor('right')].map((el) => el ? el.getBoundingClientRect().width : 0));
    }

    // icon strip for the right side, like the left one's icon view. drag the right sidebar small to get it
    const stripwidth = 72;
    let strip = null, stripon = false, stripgap = 8, stripedge = 0;
    try { stripon = localStorage.getItem('vz-right-strip') === '1'; } catch (err) {}
    const stripbtns = [
      { label: 'Now playing view', find: '[data-testid="control-button-npv"]', match: /now playing view/i,
        icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 9.5v5l4-2.5z"/>' },
      { label: 'Queue', find: '[data-testid="control-button-queue"]', match: /queue/i,
        icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
      { label: 'Lyrics', find: '[data-testid="lyrics-button"]', match: /lyrics/i,
        icon: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>' },
      { label: 'Connect to a device', find: '[data-testid="control-button-connect-to-a-device"], [data-testid="devices-button"]', match: /connect to a device|devices/i,
        icon: '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="14" r="3"/><path d="M12 7h.01"/>' },
    ];

    function spotifybutton(b) {
      return document.querySelector(b.find) ||
        [...document.querySelectorAll('button')].find((x) => !x.closest('.vz-frame-layer') && b.match.test(x.getAttribute('aria-label') || ''));
    }

    function makestrip() {
      strip = document.createElement('div');
      strip.className = 'vz-rightstrip';
      strip.style.position = 'absolute';
      strip.style.display = 'none';
      const cover = document.createElement('img');
      cover.className = 'vz-strip-cover';
      cover.alt = '';
      cover.title = 'Now playing view';
      cover.addEventListener('click', () => openfromstrip(stripbtns[0]));
      strip.appendChild(cover);
      strip._cover = cover;
      stripbtns.forEach((b) => {
        const btn = document.createElement('button');
        btn.className = 'vz-strip-btn';
        btn.title = b.label;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentcolor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + b.icon + '</svg>';
        btn.addEventListener('click', () => openfromstrip(b));
        strip.appendChild(btn);
      });
      // drag handle on the strip's left edge, pull it out to get the full sidebar back
      const grip = document.createElement('div');
      grip.className = 'vz-strip-grip';
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const startx = e.clientX;
        grip.setPointerCapture(e.pointerId);
        const move = (ev) => {
          if (startx - ev.clientX < 60) return;
          grip.removeEventListener('pointermove', move);
          openfromstrip(stripbtns[0]);
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', () => grip.removeEventListener('pointermove', move), { once: true });
      });
      strip.appendChild(grip);
      framelayer.appendChild(strip);
    }

    function setstrip(value) {
      stripon = value;
      try { localStorage.setItem('vz-right-strip', value ? '1' : '0'); } catch (err) {}
      if (value) hidden.right = false;
      [rightcell, cellfor('right')].forEach((cell) => { if (cell) cell.classList.toggle('vz-hidden', value); });
      if (strip) { strip.style.display = value ? '' : 'none'; strip._vzkey = ''; }
      if (!value) document.querySelectorAll('[class*="LayoutResizer__resize-bar"].vz-hidden').forEach((bar) => bar.classList.remove('vz-hidden'));
      fitgrid();
      updatetabs();
    }

    // opens the full right sidebar on whatever panel was picked in the strip
    function openfromstrip(b) {
      rightwait = Date.now() + 1500;
      setstrip(false);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const btn = spotifybutton(b);
        if (!btn) return;
        const active = btn.getAttribute('aria-pressed') === 'true' || btn.getAttribute('data-active') === 'true';
        if (rightwidth() >= 140 && active) return;
        btn.click();
      }));
    }

    function placestrip() {
      if (!strip || !stripon) return;
      const mv = document.getElementById('main-view');
      if (!mv) return;
      const mb = mv.getBoundingClientRect();
      const w = stripwidth, x = (stripedge || window.innerWidth - 8) - w;
      const key = x + ',' + mb.top + ',' + w + ',' + mb.height;
      if (strip._vzkey === key) return;
      strip._vzkey = key;
      strip.style.left = x + 'px';
      strip.style.top = mb.top + 'px';
      strip.style.width = w + 'px';
      strip.style.height = mb.height + 'px';
    }

    // dragging the right sidebar's handle most of the way in turns it into the strip instead of closing it
    let rightdrag = false, dragx = 0;
    document.addEventListener('pointerdown', (e) => {
      const handle = e.target && e.target.closest && e.target.closest('[class*="LayoutResizer"]');
      const cell = rightcell || cellfor('right');
      if (handle && cell && cell.contains(handle)) { rightdrag = true; dragx = e.clientX; }
    }, true);
    document.addEventListener('pointermove', (e) => { if (rightdrag) dragx = e.clientX; }, true);
    document.addEventListener('pointerup', () => {
      if (!rightdrag) return;
      rightdrag = false;
      const grid = layoutgrid();
      if (grid && grid.getBoundingClientRect().right - dragx < 160) setstrip(true);
      queuesweep();
    }, true);

    function sethidden(side, value) {
      hidden[side] = value;
      // right side: hide both the slot we found by position and spotify's named right-sidebar slot
      const targets = side === 'left' ? [cellfor('left')] : [rightcell, cellfor('right')];
      targets.forEach((cell) => { if (cell) cell.classList.toggle('vz-hidden', value); });
      fitgrid();
      updatetabs();
    }

    function checksidebars() {
      const left = cellfor('left');
      if (left) {
        if (hidden.left) {
          // spotify re-renders can wipe our class or the grid fix, so put them back
          if (!left.classList.contains('vz-hidden')) left.classList.add('vz-hidden');
          fitgrid();
        } else {
          const w = left.getBoundingClientRect().width;
          if (w >= 140) { leftwait = 0; if (wantshut && Date.now() - shuttime > 1000) saveshut(false); }
          if (wantshut && w > 0 && w < 140 && Date.now() > leftwait) sethidden('left', true);
        }
      }
      // spotify's own right-side drag handle doubles up with the strip's, so hide it while the strip is out
      const lefthandle = cellfor('left');
      document.querySelectorAll('[class*="LayoutResizer__resize-bar"]').forEach((bar) => {
        bar.classList.toggle('vz-hidden', stripon && !(lefthandle && lefthandle.contains(bar)));
      });
      if (stripon) {
        [rightcell, cellfor('right')].forEach((cell) => { if (cell && !cell.classList.contains('vz-hidden')) cell.classList.add('vz-hidden'); });
        fitgrid();
        const cover = document.querySelector('[data-testid="now-playing-widget"] img, .main-nowPlayingWidget-coverArt img, [data-testid="cover-art-image"]');
        if (strip && cover && strip._cover.src !== cover.src) strip._cover.src = cover.src;
      } else if (rightdrag) {
        return;
      } else if (hidden.right) {
        [rightcell, cellfor('right')].forEach((cell) => { if (cell && !cell.classList.contains('vz-hidden')) cell.classList.add('vz-hidden'); });
        fitgrid();
      } else if (Date.now() > rightwait) {
        // closed, or squeezed into a thin strip: hide it all the way like the left one
        const cell = findrightcell() || cellfor('right');
        if (cell) rightcell = cell;
        if (rightwidth() < 140) sethidden('right', true);
      }
    }

    function openleft() {
      const cell = cellfor('left');
      const btn = cell && [...cell.querySelectorAll('button')].find((b) => {
        const label = b.getAttribute('aria-label') || '';
        return /library/i.test(label) && /expand|open|show/i.test(label);
      });
      // no expand button means spotify can't open it from here, so don't snap it shut again
      leftwait = btn ? Date.now() + 1500 : Infinity;
      saveshut(false);
      sethidden('left', false);
      if (btn) btn.click();
    }

    function openright() {
      rightwait = Date.now() + 1500;
      sethidden('right', false);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (rightwidth() >= 140) return;
        // spotify had it closed too, so press the now playing button to open it
        const btn = document.querySelector('[data-testid="control-button-npv"]') ||
          [...document.querySelectorAll('button')].find((b) => /now playing view/i.test(b.getAttribute('aria-label') || ''));
        if (btn) btn.click();
      }));
    }

    function updatetabs() {
      ['left', 'right'].forEach((side) => {
        const tab = tabs[side];
        if (!tab) return;
        tab.style.display = hidden[side] ? '' : 'none';
        tab._vzkey = '';
      });
      placetabs();
    }

    function maketabs() {
      ['left', 'right'].forEach((side) => {
        const tab = document.createElement('button');
        tab.className = 'vz-edge-tab vz-tab-closed vz-edge-' + side;
        tab.title = 'Show ' + side + ' sidebar';
        tab.style.position = 'absolute';
        tab.style.display = 'none';
        tab.innerHTML = '<svg viewBox="0 0 10 16"><path d="M7 2 2 8l5 6" fill="none" stroke="currentcolor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        tab.addEventListener('click', () => {
          if (side === 'left') openleft(); else openright();
          queuesweep();
        });
        framelayer.appendChild(tab);
        tabs[side] = tab;
      });
    }

    // our own minimize / maximize / close, spotify's native ones get hidden while ours are up
    let winbtns = null;
    const winclient = () => (window.Spicetify && Spicetify.Platform && Spicetify.Platform.FocusMainWindowAPI &&
      Spicetify.Platform.FocusMainWindowAPI._windowStateClient) || null;
    const quiet = (p) => { if (p && p.catch) p.catch(() => {}); };
    const winicons = {
      min: '<path d="M2 6h8"/>',
      max: '<rect x="2" y="2" width="8" height="8" rx="1.5"/>',
      restore: '<rect x="2" y="4" width="6" height="6" rx="1.2"/><path d="M4.5 4V2.8a.8.8 0 0 1 .8-.8h3.9a.8.8 0 0 1 .8.8v3.9a.8.8 0 0 1-.8.8H8"/>',
      close: '<path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/>',
    };
    const winsvg = (name) => '<svg viewBox="0 0 12 12" fill="none" stroke="currentcolor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">' + winicons[name] + '</svg>';

    function nativebuttons(show, attempt) {
      const P = window.Spicetify && Spicetify.Platform;
      if (!P) return;
      [P.ControlMessageAPI, P.UpdateAPI].forEach((api) => {
        const c = api && api._updateUiClient;
        if (!c) return;
        try { quiet(c.updateTitlebarHeight({ height: show ? 64 : 1 })); } catch (err) {}
        try { quiet(c.setButtonsVisibility({ showButtons: show })); } catch (err) {}
      });
      try { if (P.NativeAPI && P.NativeAPI.setWindowButtonsVisibility) quiet(P.NativeAPI.setWindowButtonsVisibility(show)); } catch (err) {}
      // spotify puts them back during startup, so say it a few more times
      attempt = attempt || 0;
      if (!show && attempt < 4) setTimeout(() => nativebuttons(false, attempt + 1), [1000, 2000, 4000, 8000][attempt]);
    }

    async function syncmaxicon() {
      const c = winclient();
      if (!c || !winbtns) return;
      try {
        const maxed = (await c.getWindowState({})).state === 2;
        winbtns._max.innerHTML = winsvg(maxed ? 'restore' : 'max');
        winbtns._max.title = maxed ? 'Restore' : 'Maximize';
      } catch (err) {}
    }

    async function winaction(kind) {
      const c = winclient();
      if (!c) return;
      try {
        if (kind === 'min') return await c.setWindowState({ state: 3 });
        if (kind === 'close') return await c.closeWindow({});
        const cur = (await c.getWindowState({})).state;
        await c.setWindowState({ state: cur === 2 ? 1 : 2 });
        setTimeout(syncmaxicon, 200);
      } catch (err) { console.warn('[viruzz] window', err); }
    }

    // the button group always has the settings gear, window buttons join once spotify's window api is there
    function makewinbuttons() {
      if (!winbtns) {
        winbtns = document.createElement('div');
        winbtns.className = 'vz-winbtns';
        // own layer above the top bar, which sits over the outlines so the search dropdown isn't covered
        winbtns.style.position = 'fixed';
        winbtns.style.zIndex = '70';
        const gear = document.createElement('button');
        gear.className = 'vz-winbtn vz-winbtn-settings';
        gear.title = 'Viruzz settings';
        gear.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentcolor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
        gear.addEventListener('click', (e) => { e.stopPropagation(); opensettings(); });
        winbtns.appendChild(gear);
        document.body.appendChild(winbtns);
      }
      if (winbtns._max) return true;
      if (!winclient()) return false;
      [['min', 'Minimize'], ['max', 'Maximize'], ['close', 'Close']].forEach(([kind, label]) => {
        const b = document.createElement('button');
        b.className = 'vz-winbtn vz-winbtn-' + kind;
        b.title = label;
        b.innerHTML = winsvg(kind);
        b.addEventListener('click', (e) => { e.stopPropagation(); winaction(kind); });
        winbtns.appendChild(b);
        if (kind === 'max') winbtns._max = b;
      });
      winbtns._vzkey = '';
      nativebuttons(false);
      syncmaxicon();
      window.addEventListener('resize', () => { clearTimeout(winbtns._t); winbtns._t = setTimeout(syncmaxicon, 150); });
      return true;
    }

    function placewinbuttons() {
      if (!winbtns) return;
      const top = document.querySelector('[data-vz-topbar]');
      const b = top ? top.getBoundingClientRect() : { top: 0, height: 64 };
      const y = b.top + b.height / 2 - (winbtns.offsetHeight || 38) / 2;
      // without our window buttons the native ones are still there, so keep the gear clear of them
      const right = winbtns._max ? 18 : 160;
      const key = y + ',' + right;
      if (winbtns._vzkey === key) return;
      winbtns._vzkey = key;
      winbtns.style.top = y + 'px';
      winbtns.style.right = right + 'px';
    }

    // settings panel: accent, glow, outlines, glass and hover style, saved on this pc
    const defaults = { accent: '#8b9aed', glow: 100, line: 100, tint: 62, blur: 14, hover: 'glass', shapes: true, dots: true };
    const settings = Object.assign({}, defaults);
    try { Object.assign(settings, JSON.parse(localStorage.getItem('vz-settings') || '{}')); } catch (err) {}
    const swatches = ['#8b9aed', '#b48cf2', '#f27ab8', '#4fd1a5', '#f2b84f', '#5fb4f2'];

    const rgbhex = (rgb) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

    function rgbhsv([r, g, b]) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      let h = 0;
      if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return [(h * 60 + 360) % 360, max ? d / max : 0, max];
    }

    function hsvrgb([h, s, v]) {
      const f = (n) => { const k = (n + h / 60) % 6; return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; };
      return [f(5), f(3), f(1)];
    }

    function hexrgb(hex) {
      const n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function applysettings() {
      const root = document.documentElement;
      const set = (k, v) => root.style.setProperty(k, v);
      const [r, g, b] = hexrgb(settings.accent);
      accentrgb = [r, g, b];
      const light = [r, g, b].map((c) => Math.round(c + (255 - c) * 0.35));
      set('--vz-accent-rgb', r + ', ' + g + ', ' + b);
      set('--vz-glow', String(settings.glow / 100));
      set('--vz-line', String(settings.line / 100));
      set('--vz-glass-tint', String(settings.tint / 100));
      set('--vz-glass-blur', settings.blur + 'px');
      // spotify's own accent bits (progress bar, toggles) read these
      set('--spice-button', settings.accent);
      set('--spice-rgb-button', r + ',' + g + ',' + b);
      set('--spice-tab-active', settings.accent);
      set('--spice-rgb-tab-active', r + ',' + g + ',' + b);
      set('--spice-notification', settings.accent);
      set('--spice-rgb-notification', r + ',' + g + ',' + b);
      set('--spice-button-active', 'rgb(' + light.join(',') + ')');
      set('--spice-rgb-button-active', light.join(','));
      root.setAttribute('data-vz-hover', settings.hover);
      root.toggleAttribute('data-vz-noshapes', !settings.shapes);
      root.toggleAttribute('data-vz-nodots', !settings.dots);
    }

    function savesettings() {
      try { localStorage.setItem('vz-settings', JSON.stringify(settings)); } catch (err) {}
      applysettings();
    }
    applysettings();

    function opensettings() {
      if (document.querySelector('.vz-settings-overlay')) return;
      const overlay = document.createElement('div');
      overlay.className = 'vz-settings-overlay';
      const panel = document.createElement('div');
      panel.className = 'vz-settings';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Viruzz settings');
      overlay.appendChild(panel);

      const close = () => { overlay.remove(); document.removeEventListener('keydown', onkey, true); };
      const onkey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onkey, true);
      overlay.addEventListener('pointerdown', (e) => { if (e.target === overlay) close(); });

      const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
      const head = el('div', 'vz-settings-head');
      head.appendChild(el('h2', '', 'Viruzz settings'));
      const x = el('button', 'vz-winbtn');
      x.title = 'Close';
      x.innerHTML = winsvg('close');
      x.addEventListener('click', close);
      head.appendChild(x);
      panel.appendChild(head);

      const row = (label, ctl) => {
        const r = el('div', 'vz-set-row');
        r.appendChild(el('span', '', label));
        r.appendChild(ctl);
        panel.appendChild(r);
      };

      // accent: default + presets, then a drag picker for any color
      const acc = el('div', 'vz-set-ctl');
      const def = el('button', 'vz-set-default', 'Default');
      def.title = defaults.accent;
      acc.appendChild(def);
      swatches.slice(1).forEach((c) => {
        const s = el('button', 'vz-swatch');
        s.dataset.c = c;
        s.style.background = c;
        s.title = c;
        acc.appendChild(s);
      });
      row('Accent color', acc);

      const picker = el('div', 'vz-picker');
      const sv = el('div', 'vz-picker-sv');
      const svdot = el('div', 'vz-picker-dot');
      sv.appendChild(svdot);
      const hue = el('div', 'vz-picker-hue');
      const huedot = el('div', 'vz-picker-dot');
      hue.appendChild(huedot);
      const hexrow = el('div', 'vz-picker-hex');
      const preview = el('div', 'vz-picker-preview');
      const hexin = el('input');
      hexin.type = 'text';
      hexin.spellcheck = false;
      hexin.maxLength = 7;
      hexrow.appendChild(el('span', '', 'Hex'));
      const hexright = el('div', 'vz-set-ctl');
      hexright.appendChild(preview);
      hexright.appendChild(hexin);
      hexrow.appendChild(hexright);
      picker.appendChild(sv);
      picker.appendChild(hue);
      picker.appendChild(hexrow);
      panel.appendChild(picker);

      let hsv = rgbhsv(hexrgb(settings.accent));
      const paint = () => {
        sv.style.background = 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(' + hsv[0] + ', 100%, 50%))';
        svdot.style.left = hsv[1] * 100 + '%';
        svdot.style.top = (1 - hsv[2]) * 100 + '%';
        huedot.style.left = hsv[0] / 360 * 100 + '%';
        preview.style.background = settings.accent;
        if (document.activeElement !== hexin) hexin.value = settings.accent;
        def.setAttribute('aria-pressed', String(settings.accent === defaults.accent));
        acc.querySelectorAll('.vz-swatch').forEach((n) => n.setAttribute('aria-pressed', String(n.dataset.c === settings.accent)));
      };
      const setaccent = (hex, fromhsv) => {
        settings.accent = hex;
        if (!fromhsv) hsv = rgbhsv(hexrgb(hex));
        savesettings();
        paint();
      };
      const fromhsv = () => setaccent(rgbhex(hsvrgb(hsv)), true);
      // drag inside an area, x and y come back as 0..1
      const draggable = (area, onmove) => {
        area.addEventListener('pointerdown', (e) => {
          area.setPointerCapture(e.pointerId);
          const move = (ev) => {
            const b = area.getBoundingClientRect();
            onmove(Math.min(1, Math.max(0, (ev.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (ev.clientY - b.top) / b.height)));
          };
          move(e);
          area.addEventListener('pointermove', move);
          area.addEventListener('pointerup', () => area.removeEventListener('pointermove', move), { once: true });
        });
      };
      draggable(sv, (x, y) => { hsv[1] = x; hsv[2] = 1 - y; fromhsv(); });
      draggable(hue, (x) => { hsv[0] = x * 360; fromhsv(); });
      hexin.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hexin.value)) setaccent(hexin.value.toLowerCase()); });
      def.addEventListener('click', () => setaccent(defaults.accent));
      acc.querySelectorAll('.vz-swatch').forEach((n) => n.addEventListener('click', () => setaccent(n.dataset.c)));
      paint();

      const slider = (label, key, min, max, unit) => {
        const c = el('div', 'vz-set-ctl');
        const input = el('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = settings[key];
        const val = el('span', 'vz-set-val', settings[key] + unit);
        input.addEventListener('input', () => { settings[key] = Number(input.value); val.textContent = input.value + unit; savesettings(); });
        c.appendChild(input);
        c.appendChild(val);
        row(label, c);
      };
      slider('Glow strength', 'glow', 0, 200, '%');
      slider('Outline strength', 'line', 0, 200, '%');
      slider('Glass tint', 'tint', 20, 95, '%');
      slider('Glass blur', 'blur', 0, 30, 'px');

      const seg = el('div', 'vz-seg');
      [['glass', 'Glass'], ['solid', 'Solid'], ['off', 'Off']].forEach(([v, label]) => {
        const b = el('button', '', label);
        b.setAttribute('aria-pressed', String(settings.hover === v));
        b.addEventListener('click', () => {
          settings.hover = v;
          seg.querySelectorAll('button').forEach((n) => n.setAttribute('aria-pressed', String(n === b)));
          savesettings();
        });
        seg.appendChild(b);
      });
      row('Hover background', seg);

      const toggle = (label, key) => {
        const t = el('input', 'vz-toggle');
        t.type = 'checkbox';
        t.checked = settings[key];
        t.addEventListener('change', () => { settings[key] = t.checked; savesettings(); });
        row(label, t);
      };
      toggle('Floating shapes', 'shapes');
      toggle('Dot background', 'dots');

      const actions = el('div', 'vz-set-actions');
      const reset = el('button', 'vz-set-btn', 'Reset to default');
      reset.addEventListener('click', () => {
        Object.assign(settings, defaults);
        savesettings();
        close();
        opensettings();
      });
      const done = el('button', 'vz-set-btn', 'Done');
      done.addEventListener('click', close);
      actions.appendChild(reset);
      actions.appendChild(done);
      panel.appendChild(actions);

      document.body.appendChild(overlay);
    }

    // also reachable from the profile menu, in case the top bar button is ever hidden
    let menuadded = false;
    function addmenuitem() {
      if (menuadded || !(window.Spicetify && Spicetify.Menu && Spicetify.Menu.Item)) return;
      try { new Spicetify.Menu.Item('Viruzz settings', false, opensettings).register(); menuadded = true; } catch (err) {}
    }

    // recents tiles: short wide boxes with cover art sitting in a grid, tagged so the css can glass them
    function tagtiles() {
      const mv = document.getElementById('main-view');
      if (!mv) return;
      const imgs = mv.querySelectorAll('img');
      for (let i = 0; i < imgs.length && i < 60; i++) {
        let el = imgs[i];
        for (let up = 0; up < 6 && el && el !== mv; up++) {
          const parent = el.parentElement;
          if (parent && getComputedStyle(parent).display === 'grid') {
            const b = el.getBoundingClientRect();
            if (b.height >= 40 && b.height <= 100 && b.width >= 150 && b.width > b.height * 2) el.setAttribute('data-vz-tile', '');
            break;
          }
          el = parent;
        }
      }
    }

    // spotify only leaves room for its own window buttons, so push the top bar's stuff left until nothing sits under ours
    function fitroom() {
      if (!winbtns) return;
      const top = document.querySelector('[data-vz-topbar]');
      if (!top) return;
      const edge = winbtns.getBoundingClientRect().left - 10;
      let over = 0;
      top.querySelectorAll('button, a, img, [role="button"]').forEach((el) => {
        if (winbtns.contains(el)) return;
        const b = el.getBoundingClientRect();
        if (b.width && b.height && b.right > edge && b.left < edge + 200) over = Math.max(over, b.right - edge);
      });
      if (over > 0.5) {
        const cur = parseFloat(top.style.getPropertyValue('--vz-push')) || 0;
        top.style.setProperty('--vz-push', Math.ceil(cur + over) + 'px');
      }
    }

    function sweep() {
      if (document.hidden) return;
      try { sweepbig(); sweeptint(tagpanels()); checksidebars(); tagtiles(); fitroom(); } catch (err) { console.warn('[viruzz] sweep', err); }
    }

    let sweeptimer = null;
    const queuesweep = () => { clearTimeout(sweeptimer); sweeptimer = setTimeout(sweep, 250); };
    const ours = '.vz-frame-layer, .vz-shape-field, #viruzz-bg-canvas, .vz-winbtns, .vz-settings-overlay';
    const isours = (n) => n === framelayer || (n.closest && n.closest(ours));

    function startwatching() {
      maketabs();
      makestrip();
      if (stripon) setstrip(true);
      (function trywin(n) {
        addmenuitem();
        if ((!makewinbuttons() || !menuadded) && n < 30) setTimeout(() => trywin(n + 1), 1000);
      })(0);
      new MutationObserver((records) => {
        try {
          let budget = 600, relevant = false;
          for (const record of records) {
            if (isours(record.target)) continue;
            if (record.attributeName === 'style' && (record.target === fitted || record.target.id === 'main-view')) continue;
            relevant = true;
            if (record.type === 'attributes') { checktint(record.target); continue; }
            for (const node of record.addedNodes) {
              if (node.nodeType !== 1 || isours(node)) continue;
              checktint(node);
              const kids = node.querySelectorAll('*');
              for (let i = 0; i < kids.length && budget > 0; i++, budget--) checktint(kids[i]);
            }
          }
          if (relevant) queuesweep();
        } catch (err) { console.warn('[viruzz] observer', err); }
      }).observe(document.body, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'],
      });
      window.addEventListener('resize', () => { placeframes(); queuesweep(); });
      setInterval(sweep, 2000);
      sweep();
      fitgrid();
    }

    // waits for spotify to load before changing anything
    (function waitforapp() {
      if (document.querySelector('.Root, .Root__top-container, #main > div')) startwatching();
      else setTimeout(waitforapp, 300);
    })();
  }

  boot();
})();