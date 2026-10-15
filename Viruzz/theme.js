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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
    const maxripples = 6;

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
      for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > (ripples[i].ms || ripplems)) ripples.splice(i, 1);

      for (const d of dots) {
        let x = d.ox + Math.sin(t * d.driftspeed + d.phase) * d.driftradius;
        let y = d.oy + Math.cos(t * d.driftspeed * 0.83 + d.phase * 1.1) * d.driftradius;
        y = ((y + parallax) % wraph + wraph) % wraph;

        let glow = 0;
        for (let k = 0; k < ripples.length; k++) {
          const rip = ripples[k];
          const age = (t - rip.t0) / (rip.ms || ripplems);
          if (age < 0 || age >= 1) continue;
          const crest = (rip.reach || ripplereach) * (1 - Math.pow(1 - age, 3));
          const dx = x - rip.x, dy = y - rip.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const band = Math.abs(dist - crest);
          const rb = rip.band || rippleband;
          if (band > rb) continue;
          const falloff = (1 - band / rb) * (1 - age) * (rip.power || 1);
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

    const TAU = Math.PI * 2;
    const near = [];
    let dist = new Float32Array(0);
    const basecolor = 'rgba(224,234,249,' + flooralpha + ')';
    const linkdistsq = linkdist * linkdist;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const n = dots.length;
      const hot = mouse.active;
      near.length = 0;
      if (hot) {
        if (dist.length < n) dist = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const dx = dots[i].x - smooth.x, dy = dots[i].y - smooth.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          dist[i] = d;
          if (d < outerradius) near.push(i);
        }

        ctx.lineWidth = 1;
        for (let ii = 0; ii < near.length; ii++) {
          const i = near[ii], a = dots[i];
          for (let jj = ii + 1; jj < near.length; jj++) {
            const j = near[jj], b = dots[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const sepsq = dx * dx + dy * dy;
            if (sepsq > linkdistsq) continue;

            const nearer = dist[i] < dist[j] ? dist[i] : dist[j];
            const strength = fieldat(nearer, 'linealpha', flooralpha);
            if (strength <= 0.002) continue;

            const alpha = strength * (1 - Math.sqrt(sepsq) / linkdist);
            if (alpha <= 0.002) continue;

            ctx.strokeStyle = 'rgba(224,234,249,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // every dot that is far from the cursor and not rippled looks the same, so they go in one path and one fill
      ctx.fillStyle = basecolor;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const d = dots[i];
        if (d.glow > 0 || (hot && dist[i] < outerradius)) continue;
        const r = d.basesize;
        ctx.moveTo(d.x + r, d.y);
        ctx.arc(d.x, d.y, r, 0, TAU);
      }
      ctx.fill();

      // dots near the cursor or in a ripple need their own size and color
      for (let i = 0; i < n; i++) {
        const d = dots[i];
        const glow = d.glow || 0;
        if (!(glow > 0 || (hot && dist[i] < outerradius))) continue;
        const dd = hot ? dist[i] : Infinity;

        let alpha = fieldat(dd, 'dotalpha', flooralpha);
        if (glow > 0) alpha = Math.min(alpha + glow * 0.85, 1);
        if (alpha <= 0.002) continue;

        const radius = d.basesize * fieldat(dd, 'dotsize', 1.0) * (1 + glow * 1.1);

        ctx.beginPath();
        ctx.arc(d.x, d.y, radius, 0, TAU);
        ctx.fillStyle = glow > 0.04
          ? 'rgba(' + Math.round(224 + (accentrgb[0] - 224) * glow) + ',' + Math.round(234 + (accentrgb[1] - 234) * glow) + ',' + Math.round(249 + (accentrgb[2] - 249) * glow) + ',' + alpha.toFixed(3) + ')'
          : 'rgba(224,234,249,' + alpha.toFixed(3) + ')';
        ctx.fill();
      }
    }

    // layout work (outline boxes, grips, player bar) only runs when something asked for it, plus a slow safety tick
    let layoutdirty = true, lastlayout = 0, flushqueued = false;
    function flushlayout(now) {
      now = now || performance.now();
      if (!layoutdirty && now - lastlayout < 150) return;
      layoutdirty = false;
      lastlayout = now;
      try { placeframes(); } catch (err) {}
    }
    function markdirty() {
      layoutdirty = true;
      // with reduced motion there is no frame loop, so flush on the next frame ourselves
      if (reducemotion && !flushqueued) {
        flushqueued = true;
        requestAnimationFrame(() => { flushqueued = false; flushlayout(performance.now()); });
      }
    }

    // dots drift slowly, so they only need full frame rate while the cursor, a ripple or the parallax is moving
    let lastdraw = 0;
    function loop(now) {
      now = now || performance.now();
      const lite = settings.lite;
      const busy = ripples.length > 0 || Math.abs(parallaxgoal - parallax) > 0.15 ||
        (mouse.active && Math.abs(mouse.x - smooth.x) + Math.abs(mouse.y - smooth.y) > 0.6);
      const gap = busy ? (lite ? 32 : 0) : (lite ? 100 : 42);
      if (now - lastdraw >= gap - 3) { lastdraw = now; step(now); draw(); }
      flushlayout(now);
      try { bartick(now); } catch (err) {}
      if (!reducemotion) requestAnimationFrame(loop);
    }

    function addripple(x, y, opts) {
      if (reducemotion) return;
      if (ripples.length >= maxripples) ripples.shift();
      ripples.push(Object.assign({ x, y, t0: performance.now() }, opts));
    }

    window.addEventListener('resize', resize);

    document.addEventListener('scroll', (e) => {
      const t = e.target;
      if (!t || t === document) { parallaxgoal = window.scrollY * parallaxrate; return; }
      if (t.clientWidth > window.innerWidth * 0.4) parallaxgoal = (t.scrollTop || 0) * parallaxrate;
    }, { capture: true, passive: true });

    window.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest &&
          e.target.closest('a, button, input, select, textarea, code, [role="button"], [role="slider"], .vz-settings-overlay, .vz-grip')) return;
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
          el.classList.add('vz-shape-glowy');
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
      // the layers wrapped around the player bar (spotify's bottom row) are short, so the probes above miss them
      for (let el = playerel && playerel.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        if (el.hasAttribute(clearattr) || el.closest('#context-menu, [role="dialog"], [role="menu"]')) continue;
        const st = getComputedStyle(el);
        if (st.backgroundImage.indexOf('url(') === -1 && (alphaof(st.backgroundColor) > 0.02 || st.backgroundImage.indexOf('gradient') !== -1)) el.setAttribute(clearattr, '');
      }
    }

    const panelattr = 'data-vz-panel';

    const panelwatch = new ResizeObserver(() => { flushlayout(); queuesweep(); });
    let watched = new Set();

    // draws the outlines on top of everything so nothing covers them
    const framelayer = document.createElement('div');
    framelayer.className = 'vz-frame-layer';
    pin(framelayer, Object.assign({ 'z-index': '50' }, overlay));
    document.body.appendChild(framelayer);
    const frames = new Map();

    // the player bar (tagged by tagpanels), its natural height, and the refresh that keeps it and the grips in place
    let playerel = null, playerbase = 0, baseel = null;
    function placeplayer() {
      if (!playerel || !playerel.isConnected) playerel = document.querySelector('[data-vz-player]');
      try { ensureplayer(playerel); fitdock(); } catch (err) {}
    }

    // ---- resizable player bar + sidebars that dock down to the bottom edge ----
    // the grips get their own layer above the free-floating player bar so they stay grabbable
    const griplayer = document.createElement('div');
    griplayer.className = 'vz-grip-layer';
    pin(griplayer, Object.assign({ 'z-index': '56' }, overlay));
    document.body.appendChild(griplayer);
    // a floating bar gets its outline drawn here, above the bar, so the panels it passes over can't hide it
    const playerframe = document.createElement('div');
    playerframe.className = 'vz-frame vz-frame-player';
    pin(playerframe, { position: 'absolute', top: '0', left: '0', display: 'none', 'pointer-events': 'none' });
    griplayer.appendChild(playerframe);
    function setplayerframe(x, y, w, h) {
      const key = w > 0 ? Math.round(x) + ',' + Math.round(y) + ',' + Math.round(w) + ',' + Math.round(h) : 'off';
      if (playerframe._vzkey === key) return;
      playerframe._vzkey = key;
      if (key === 'off') { playerframe.style.display = 'none'; return; }
      playerframe.style.display = '';
      playerframe.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      playerframe.style.width = w + 'px';
      playerframe.style.height = h + 'px';
    }
    const grips = {};
    ['left', 'right', 'player', 'lift'].forEach((name) => {
      const g = document.createElement('div');
      g.className = 'vz-grip vz-grip-' + name;
      pin(g, { position: 'absolute', top: '0', left: '0', display: 'none' });
      griplayer.appendChild(g);
      grips[name] = g;
    });

    // scales the player bar (contents zoomed, height follows), lifts it off the bottom edge (a bottom margin, so the
    // other panels make room above it) or, in free mode, floats it anywhere in the window
    const sizedprops = ['--vz-player-zoom', 'height', 'min-height', 'margin-bottom'];
    const freeprops = ['position', 'left', 'top', 'width', 'max-width', 'transform', 'z-index'];

    function leavefree(el) {
      if (!el._vzfree) return;
      el._vzfree = false;
      freeprops.forEach((p) => el.style.removeProperty(p));
      if (setinline.has(el)) el.style.position = 'relative';
    }

    // the bar was untagged or swapped out, hand it back to spotify untouched
    function releaseplayer(el) {
      if (!el) return;
      el.removeAttribute('data-vz-barsized');
      sizedprops.forEach((p) => el.style.removeProperty(p));
      leavefree(el);
      el._vzk = null;
      if (baseel === el) { baseel = null; playerbase = 0; }
    }

    // free mode keeps the position as a share of the free space, so the bar stays put relative to the window on resize
    function freepos(h) {
      const W = window.innerWidth, H = window.innerHeight;
      const w = Math.min(W, Math.max(240, Math.round(W * (settings.pwidth || 70) / 100)));
      const c01 = (v) => Math.min(1, Math.max(0, isFinite(v) ? v : 0.5));
      return { w, x: Math.round(c01(settings.pfx) * Math.max(0, W - w)), y: Math.round(c01(settings.pfy) * Math.max(0, H - h)) };
    }

    function placefree(el, h) {
      const p = freepos(h), s = el.style;
      if (!el._vzfree) {
        el._vzfree = true;
        s.setProperty('position', 'fixed', 'important');
        s.setProperty('left', '0', 'important');
        s.setProperty('top', '0', 'important');
        s.setProperty('max-width', 'none', 'important');
        s.setProperty('z-index', '55', 'important');
      }
      s.setProperty('width', p.w + 'px', 'important');
      if (!el._vzdrag) s.setProperty('transform', 'translate(' + p.x + 'px,' + p.y + 'px)', 'important');
    }

    function ensureplayer(el, force) {
      if (!el) return;
      const k = (settings.pscale || 100) / 100;
      const free = !!settings.pfree;
      const lift = free ? 0 : Math.max(0, Math.round(settings.plift || 0));
      const want = k + '|' + lift + '|' + (free ? [settings.pfx, settings.pfy, settings.pwidth, window.innerWidth, window.innerHeight].join(',') : 0);
      if (!force && el._vzk === want) return;
      el._vzk = want;
      const clear = () => sizedprops.forEach((p) => el.style.removeProperty(p));
      if (k === 1 && !lift && !free) { clear(); leavefree(el); el.removeAttribute('data-vz-barsized'); return; }
      if (baseel !== el || !playerbase) {
        clear();
        leavefree(el);
        playerbase = el.getBoundingClientRect().height;
        baseel = el;
      }
      if (playerbase < 20) { playerbase = 0; el._vzk = null; return; }
      // the bar's height scales on its own now, the parts inside have their own sliders (--vz-z-*)
      el.style.removeProperty('--vz-player-zoom');
      el.style.setProperty('height', (playerbase * k) + 'px', 'important');
      el.style.setProperty('min-height', '0', 'important');
      el.toggleAttribute('data-vz-barsized', k !== 1);
      if (lift) el.style.setProperty('margin-bottom', lift + 'px', 'important'); else el.style.removeProperty('margin-bottom');
      if (free) placefree(el, playerbase * k); else leavefree(el);
    }

    // turning free mode on: start from where the bar is right now
    function initfree() {
      const W = window.innerWidth, H = window.innerHeight;
      const r = playerel ? playerel.getBoundingClientRect() : null;
      if (!r || !r.height) { settings.pfx = 0.5; settings.pfy = 1; return; }
      settings.pwidth = Math.min(100, Math.max(25, Math.round(r.width / W * 100)));
      const w = Math.round(W * settings.pwidth / 100);
      settings.pfx = W > w ? Math.min(1, Math.max(0, r.left / (W - w))) : 0.5;
      settings.pfy = H > r.height ? Math.min(1, Math.max(0, r.top / (H - r.height))) : 1;
    }

    // drag the bar anywhere in free mode, from its bottom edge handle or any empty part of the bar.
    // while held it lifts, tilts with your drag speed and snaps to the edges and the middle, then springs back flat
    function startmove(e) {
      if (!playerel || !settings.pfree) return;
      const el = playerel;
      const W = window.innerWidth, H = window.innerHeight;
      const h = (playerbase || el.getBoundingClientRect().height) * ((settings.pscale || 100) / 100);
      const p0 = freepos(h), x0 = e.clientX, y0 = e.clientY;
      const fancy = settings.pfancy !== false && !reducemotion;
      const gap = dockcache.gap;
      const maxx = Math.max(0, W - p0.w), maxy = Math.max(0, H - h);
      // magnet: within 14px of an edge or the middle, lock onto it
      const snap = (v, max) => { if (!fancy) return v; for (const t of [0, max / 2, max]) if (Math.abs(v - t) < 14) return t; return v; };
      let started = false, finished = false, raf = 0;
      let tx = p0.x, ty = p0.y, cx = p0.x, cy = p0.y;
      let tilt = 0, tilttarget = 0, lift = 1, lastx = x0, lastt = performance.now();

      const apply = () => {
        const t = 'translate(' + Math.round(cx) + 'px,' + Math.round(cy) + 'px)' + (fancy ? ' rotate(' + tilt.toFixed(2) + 'deg) scale(' + lift.toFixed(3) + ')' : '');
        el.style.setProperty('transform', t, 'important');
        // the outline is its own element, so it gets the same motion
        playerframe.style.transform = 'translate(' + Math.round(cx + gap) + 'px,' + Math.round(cy + gap) + 'px)' + (fancy ? ' rotate(' + tilt.toFixed(2) + 'deg) scale(' + lift.toFixed(3) + ')' : '');
        markdirty();
      };
      const tick = () => {
        if (fancy) {
          cx += (tx - cx) * 0.4; cy += (ty - cy) * 0.4;
          tilt += (tilttarget - tilt) * 0.2;
          tilttarget *= 0.86;
          lift += ((finished ? 1 : 1.018) - lift) * 0.2;
        } else { cx = tx; cy = ty; }
        apply();
        const settled = Math.abs(tx - cx) < 0.4 && Math.abs(ty - cy) < 0.4 && Math.abs(tilt) < 0.05 && Math.abs(lift - 1) < 0.002;
        if (finished && (settled || !fancy)) {
          el.style.setProperty('transform', 'translate(' + Math.round(tx) + 'px,' + Math.round(ty) + 'px)', 'important');
          el._vzdrag = false;
          el._vzk = null;
          playerframe._vzkey = '';
          markdirty();
          return;
        }
        raf = requestAnimationFrame(tick);
      };

      const move = (ev) => {
        const dx = ev.clientX - x0, dy = ev.clientY - y0;
        if (!started) {
          if (Math.hypot(dx, dy) < 4) return;
          started = true;
          el._vzdrag = true;
          document.documentElement.classList.add('vz-moving');
          grips.lift.classList.add('vz-dragging');
          raf = requestAnimationFrame(tick);
        }
        tx = snap(Math.min(Math.max(0, p0.x + dx), maxx), maxx);
        ty = snap(Math.min(Math.max(0, p0.y + dy), maxy), maxy);
        settings.pfx = maxx > 0 ? tx / maxx : 0.5;
        settings.pfy = maxy > 0 ? ty / maxy : 0.5;
        // sideways speed becomes tilt, capped so it never looks broken
        const now = performance.now();
        const vx = (ev.clientX - lastx) / Math.max(8, now - lastt) * 16;
        lastx = ev.clientX; lastt = now;
        tilttarget = Math.max(-7, Math.min(7, vx * 0.7));
      };
      const up = () => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', up, true);
        document.documentElement.classList.remove('vz-moving');
        grips.lift.classList.remove('vz-dragging');
        if (!started) return;
        finished = true;
        persist();
        // the release would otherwise count as a click on whatever is under the cursor
        const eat = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
        window.addEventListener('click', eat, true);
        setTimeout(() => window.removeEventListener('click', eat, true), 60);
      };
      window.addEventListener('pointermove', move, true);
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', up, true);
    }

    document.addEventListener('pointerdown', (e) => {
      if (!settings.pfree || e.button !== 0 || !playerel || !playerel.contains(e.target)) return;
      if (e.target.closest('button, a, input, select, textarea, img, [role="button"], [role="slider"], [draggable="true"], [data-testid="playback-progressbar"], [data-testid="volume-bar"], [class*="progress"]')) return;
      startmove(e);
    }, true);

    // drag the top edge of the player bar to rescale it, double click to reset
    grips.player.addEventListener('pointerdown', (e) => {
      if (!playerel) return;
      e.preventDefault();
      const g = grips.player;
      g.setPointerCapture(e.pointerId);
      g.classList.add('vz-dragging');
      const y0 = e.clientY, k0 = (settings.pscale || 100) / 100, h0 = playerel.getBoundingClientRect().height || 1;
      const move = (ev) => {
        const k = Math.min(1.6, Math.max(0.7, k0 * (h0 + y0 - ev.clientY) / h0));
        settings.pscale = Math.round(k * 100);
        ensureplayer(playerel, true);
      };
      const up = () => { g.classList.remove('vz-dragging'); g.removeEventListener('pointermove', move); savesettings(); };
      g.addEventListener('pointermove', move);
      g.addEventListener('pointerup', up, { once: true });
      g.addEventListener('pointercancel', up, { once: true });
    });
    grips.player.addEventListener('dblclick', () => { settings.pscale = 100; savesettings(); });

    grips.player.title = 'Drag to resize the player bar, double click to reset';
    grips.lift.title = 'Drag up to lift the player bar, double click to reset';
    grips.left.title = grips.right.title = 'Drag down to dock to the bottom, up to undock';

    // drag the bottom edge of the player bar up to lift it, the space under it stays empty
    grips.lift.addEventListener('pointerdown', (e) => {
      if (!playerel) return;
      e.preventDefault();
      if (settings.pfree) { startmove(e); return; }
      const g = grips.lift;
      g.setPointerCapture(e.pointerId);
      g.classList.add('vz-dragging');
      const y0 = e.clientY, l0 = settings.plift || 0;
      const move = (ev) => {
        settings.plift = Math.round(Math.min(240, Math.max(0, l0 + y0 - ev.clientY)));
        ensureplayer(playerel, true);
      };
      const up = () => { g.classList.remove('vz-dragging'); g.removeEventListener('pointermove', move); savesettings(); };
      g.addEventListener('pointermove', move);
      g.addEventListener('pointerup', up, { once: true });
      g.addEventListener('pointercancel', up, { once: true });
    });
    grips.lift.addEventListener('dblclick', () => {
      if (settings.pfree) { settings.pfx = 0.5; settings.pfy = 1; } else settings.plift = 0;
      savesettings();
    });

    // drag a sidebar's bottom edge down to dock it to the window bottom, up to undock. double click toggles
    ['left', 'right'].forEach((side) => {
      const g = grips[side];
      g.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        g.setPointerCapture(e.pointerId);
        g.classList.add('vz-dragging');
        const y0 = e.clientY, was = !!settings['dock' + side];
        const move = (ev) => {
          const dy = ev.clientY - y0;
          const want = was ? dy > -30 : dy > 30;
          if (want !== !!settings['dock' + side]) { settings['dock' + side] = want; savesettings(); }
        };
        const up = () => { g.classList.remove('vz-dragging'); g.removeEventListener('pointermove', move); };
        g.addEventListener('pointermove', move);
        g.addEventListener('pointerup', up, { once: true });
        g.addEventListener('pointercancel', up, { once: true });
      });
      g.addEventListener('dblclick', () => { settings['dock' + side] = !settings['dock' + side]; savesettings(); });
    });

    const dockcache = { t: 0, gap: 6, colgap: 8 };
    const dockedcell = { left: null, right: null };

    // the grid slot a sidebar lives in
    function docktarget(side, grid) {
      let el = side === 'left' ? (lastpanels[0] || cellfor('left')) : (cellfor('right') || lastpanels[2] || rightcell);
      if (el && !el.isConnected) el = null;
      while (el && el.parentElement && el.parentElement !== grid) el = el.parentElement;
      if (!el || el.parentElement !== grid || el.contains(document.getElementById('main-view'))) return null;
      return el;
    }

    function undockcell(el) {
      if (!el) return;
      ['margin-bottom', 'height', 'min-height', 'max-height', 'align-self'].forEach((p) => el.style.removeProperty(p));
      el.removeAttribute('data-vz-dock');
      el._vzext = 0;
    }

    function setgrip(g, x, y, w) {
      if (w < 24) { if (g._vzkey !== 'off') { g._vzkey = 'off'; g.style.display = 'none'; } return; }
      x = Math.round(x); y = Math.round(y); w = Math.round(w);
      const key = x + ',' + y + ',' + w;
      if (g._vzkey === key) return;
      g._vzkey = key;
      g.style.display = '';
      g.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      g.style.width = w + 'px';
    }

    // runs every frame. a docked sidebar is stretched down to the bottom outline of the player bar,
    // and the player bar is pushed in from that side by the sidebar's current width
    function fitdock() {
      const player = playerel;
      const grid = layoutgrid();
      const now = performance.now();
      if (now - dockcache.t > 500) {
        dockcache.t = now;
        dockcache.gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vz-gap')) || 6;
        if (grid) dockcache.colgap = parseFloat(getComputedStyle(grid).columnGap) || 8;
      }
      const gap = dockcache.gap, colgap = dockcache.colgap;
      const free = !!settings.pfree;
      const pr = player ? player.getBoundingClientRect() : null;
      const mv = document.getElementById('main-view');
      const edge = { left: 0, right: 0 };

      ['left', 'right'].forEach((side) => {
        const cell = grid && pr ? docktarget(side, grid) : null;
        const cb = cell ? cell.getBoundingClientRect() : null;
        const usable = !!cb && cb.width >= 40 && !hidden[side] && !(side === 'right' && stripon);
        const on = usable && !free && !!settings['dock' + side];
        if (dockedcell[side] && (dockedcell[side] !== cell || !on)) { undockcell(dockedcell[side]); dockedcell[side] = null; }
        const showgrip = usable && !free;
        setgrip(grips[side], showgrip ? cb.left + 14 : 0, showgrip ? cb.bottom - 5 : 0, showgrip ? cb.width - 28 : 0);
        if (!on) return;
        dockedcell[side] = cell;
        const have = cell._vzext || 0;
        // measured from the main view's bottom (same grid row, never stretched), so the result can't feed back into itself
        const mvb = mv ? mv.getBoundingClientRect().bottom : cb.bottom - have;
        const ext = Math.max(0, Math.round(pr.bottom - gap - mvb));
        const fresh = !cell.hasAttribute('data-vz-dock');
        if (fresh || (Math.abs(ext - have) >= 2 && now - (cell._vzt || 0) > 120 && now > (cell._vzhold || 0))) {
          // flipping A -> B -> A means something is fighting the stretch, so hold still for a moment instead of shaking
          if (!fresh && ext === cell._vzprev) {
            cell._vzosc = (now - (cell._vzosct || 0) < 2000 ? (cell._vzosc || 0) : 0) + 1;
            cell._vzosct = now;
            if (cell._vzosc >= 3) { cell._vzhold = now + 2500; cell._vzosc = 0; }
          }
          if (now > (cell._vzhold || 0)) {
            cell.setAttribute('data-vz-dock', '');
            cell.style.setProperty('margin-bottom', -ext + 'px', 'important');
            cell.style.setProperty('height', 'auto', 'important');
            cell.style.setProperty('min-height', '0', 'important');
            cell.style.setProperty('max-height', 'none', 'important');
            cell.style.setProperty('align-self', 'stretch', 'important');
            cell._vzprev = have;
            cell._vzext = ext;
            cell._vzt = now;
          }
        }
        edge[side] = side === 'left' ? cb.right + colgap : cb.left - colgap;
      });

      // right side icon strip: same bottom handle and dock-to-player behaviour as the left sidebar
      if (strip) {
        if (stripon && mv && pr && !free) {
          const mb = mv.getBoundingClientRect();
          const sx = (stripedge || window.innerWidth - 8) - stripwidth;
          const dockedstrip = !!settings.dockright;
          const sbottom = dockedstrip ? pr.bottom - gap : mb.bottom;
          const sh = dockedstrip ? Math.max(0, Math.round(sbottom - mb.top)) : 0;
          if (strip._vzh !== sh) { strip._vzh = sh; strip._vzkey = ''; }
          setgrip(grips.right, sx + 14, sbottom - 5, stripwidth - 28);
          if (dockedstrip) edge.right = sx - colgap;
        } else {
          if (strip._vzh) { strip._vzh = 0; strip._vzkey = ''; }
        }
      }

      if (!player || !pr) { setgrip(grips.player, 0, 0, 0); setgrip(grips.lift, 0, 0, 0); setplayerframe(0, 0, 0, 0); return; }
      const pl = player._vzpl || 0, prr = player._vzpr || 0;
      const natL = pr.left - pl, natR = pr.right + prr;
      const wl = !free && edge.left ? Math.max(0, Math.round(edge.left - natL)) : 0;
      const wr = !free && edge.right ? Math.max(0, Math.round(natR - edge.right)) : 0;
      if (wl !== pl || wr !== prr) {
        const set = (p, v) => (v ? player.style.setProperty(p, v, 'important') : player.style.removeProperty(p));
        set('margin-left', wl ? wl + 'px' : '');
        set('margin-right', wr ? wr + 'px' : '');
        // a floating bar owns its own width
        if (!free) {
          set('width', wl || wr ? 'auto' : '');
          set('max-width', wl || wr ? 'none' : '');
        }
        set('justify-self', wl || wr ? 'stretch' : '');
        player._vzpl = wl;
        player._vzpr = wr;
      }
      if (!free) setplayerframe(0, 0, 0, 0);
      else if (!player._vzdrag) setplayerframe(pr.left + gap, pr.top + gap, pr.width - gap * 2, pr.height - gap * 2);
      setgrip(grips.player, pr.left + gap + 16, pr.top + gap - 5, pr.width - gap * 2 - 32);
      setgrip(grips.lift, pr.left + gap + 16, pr.bottom - gap - 5, pr.width - gap * 2 - 32);
    }

    // where a panel sits without its tilt, so its outline can copy the same tilt on top
    function layoutrect(el) {
      const op = el.offsetParent;
      if (!el._vztiltused || !op) return el.getBoundingClientRect();
      const ob = op.getBoundingClientRect();
      return {
        left: ob.left + op.clientLeft + el.offsetLeft - op.scrollLeft,
        top: ob.top + op.clientTop + el.offsetTop - op.scrollTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
      };
    }

    function placeframes() {
      placeplayer();
      frames.forEach((f, el) => {
        const idx = lastpanels.indexOf(el);
        const off = idx >= 0 && settings['ol' + ['left', 'main', 'right'][idx]] === false;
        if (f._vzoff !== off) {
          f._vzoff = off;
          f.style.display = off ? 'none' : '';
          el.toggleAttribute('data-vz-nooutline', off);
        }
        const b = layoutrect(el);
        const tilt = el._vztilt || '';
        const key = b.left + ',' + b.top + ',' + b.width + ',' + b.height + tilt;
        if (f._vzkey === key) return;
        f._vzkey = key;
        f.style.transition = el._vztiltused && f._vztilt !== tilt ? 'transform .35s cubic-bezier(.2,.8,.2,1)' : 'none';
        f._vztilt = tilt;
        f.style.transform = 'translate(' + b.left + 'px,' + b.top + 'px)' + tilt;
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
      let el = document.elementsFromPoint(x, y).find((n) => !(n.closest && n.closest('.vz-frame-layer, .vz-grip-layer, .vz-shape-field, #viruzz-bg-canvas, .vz-winbtns, .vz-settings-overlay')));
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
        if (b.width >= vw * (fromtop ? 0.5 : 0.2) && nearedge) best = el;
        el = el.parentElement;
      }
      return best;
    }

    function settag(attr, wanted) {
      document.querySelectorAll('[' + attr + ']').forEach((old) => {
        if (wanted.has(old)) return;
        old.removeAttribute(attr);
        if (attr === playerattr) releaseplayer(old);
        if (attr === panelattr) ['transform', 'transition', '--vz-lx', '--vz-ly'].forEach((p) => old.style.removeProperty(p));
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
      // remember the grid's own padding before ours applies, the padding settings add on top of it
      if (grid && !grid.hasAttribute('data-vz-grid')) {
        const gs = getComputedStyle(grid), rs = document.documentElement.style;
        rs.setProperty('--vz-gbase-t', gs.paddingTop);
        rs.setProperty('--vz-gbase-r', gs.paddingRight);
        rs.setProperty('--vz-gbase-b', gs.paddingBottom);
        rs.setProperty('--vz-gbase-l', gs.paddingLeft);
        grid.setAttribute('data-vz-grid', '');
      }
      const named = [(grid && byarea('left-sidebar')) || document.getElementById('Desktop_LeftSidebar_Id'), grid && mv, null];
      spots.forEach((spot, index) => {
        let panel = named[index];
        // the right sidebar's own grid slot, so it can be docked and stretched like the left one
        if (!panel && index === 2 && grid) {
          const slot = byarea('right-sidebar');
          if (slot && slot.getBoundingClientRect().width >= 140) panel = slot;
        }
        if (!panel) panel = panelfrom(spot[0], spot[1], spots.filter((s) => s !== spot));
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

      // a floating or lifted bar can't be found by looking at the bottom edge, so keep the one we already have (or find it by name)
      // (bottom padding does the same, the bar is no longer 20px from the window edge)
      const sane = (n) => n && n.isConnected && n.getBoundingClientRect().height < window.innerHeight * 0.3;
      const known = document.querySelector('[data-vz-player]') || (playerel && playerel.isConnected ? playerel : null);
      const barbyname = document.querySelector('.Root__now-playing-bar, [data-testid="now-playing-bar"]');
      const tagged = sane(known) ? known : (sane(barbyname) ? barbyname : null);
      const player = tagged || barfrom(window.innerHeight - 20 - Math.max(0, settings.padb || 0), false);
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
      if (/library/i.test(label) && /collapse|close|hide/i.test(label)) {
        saveshut(true); shuttime = Date.now();
        // go straight to hidden, otherwise spotify snaps to its icon strip first and we snap again a moment later
        requestAnimationFrame(() => { if (wantshut && !hidden.left) sethidden('left', true); });
        queuesweep();
      }
    }, true);

    // slide the columns instead of snapping. only on for a moment around a hide / show, so dragging a sidebar edge stays instant
    let animtimer = 0;
    function animgrid() {
      const g = layoutgrid();
      if (!g || reducemotion) return;
      g.classList.add('vz-anim-grid');
      clearTimeout(animtimer);
      animtimer = setTimeout(() => g.classList.remove('vz-anim-grid'), 420);
    }

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
        const player = settings.pfree ? null : document.querySelector('[data-vz-player]');
        if (player) {
          const pb = player.getBoundingClientRect(), ps = getComputedStyle(player, '::after');
          edge = { left: pb.left - (player._vzpl || 0) + (parseFloat(ps.left) || 0), right: pb.right + (player._vzpr || 0) - (parseFloat(ps.right) || 0) };
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
    document.addEventListener('pointermove', (e) => { if (e.buttons) { markdirty(); refitsoon(); } }, true);
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
      animgrid();
      stripon = value;
      try { localStorage.setItem('vz-right-strip', value ? '1' : '0'); } catch (err) {}
      if (value) hidden.right = false;
      [rightcell, cellfor('right')].forEach((cell) => { if (cell) cell.classList.toggle('vz-hidden', value); });
      if (strip) { strip.style.display = value ? '' : 'none'; strip._vzkey = ''; strip._vzh = 0; }
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
      const h = strip._vzh || mb.height;
      const key = x + ',' + mb.top + ',' + w + ',' + h;
      if (strip._vzkey === key) return;
      strip._vzkey = key;
      strip.style.left = x + 'px';
      strip.style.top = mb.top + 'px';
      strip.style.width = w + 'px';
      strip.style.height = h + 'px';
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
      animgrid();
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

    // ---- spotlight hover, card tilt and panel depth, all driven by one pointer handler ----
    const lightables = '.main-card-card, [data-encore-id="card"], .view-homeShortcutsGrid-shortcut, [data-testid*="shortcut" i], [data-vz-tile], [data-encore-id="listRow"], .main-trackList-trackListRow, .vz-winbtn, .vz-prev-row, .main-contextMenu-menuItemButton, [role="menuitem"], header button, [data-vz-player] button';
    const tiltables = '.main-card-card, [data-encore-id="card"], [data-vz-tile], .view-homeShortcutsGrid-shortcut, .vz-prev-row';
    let px = -1, py = -1, ptarget = null, pqueued = false, tilted = null;

    function untilt(el) {
      el.style.setProperty('transition', 'transform .45s cubic-bezier(.2,.8,.2,1), background-color .3s ease, box-shadow .3s ease', 'important');
      el.style.removeProperty('transform');
      clearTimeout(el._vzut);
      el._vzut = setTimeout(() => { if (tilted !== el) el.style.removeProperty('transition'); }, 480);
    }

    // panels tilt with a css transition so the outline (its own element) can follow with the same one
    function settilt(el, tilt) {
      el._vzfx = true;
      el._vztilt = tilt;
      if (tilt) {
        el._vztiltused = true;
        el.style.setProperty('transition', 'transform .35s cubic-bezier(.2,.8,.2,1)', 'important');
        el.style.setProperty('transform', tilt.trim(), 'important');
      } else {
        el.style.removeProperty('transform');
      }
      markdirty();
    }

    function resetdepth(light, tilt, cards) {
      frames.forEach((f, el) => {
        if (light && el._vzlx != null) { el.style.removeProperty('--vz-lx'); el.style.removeProperty('--vz-ly'); el._vzlx = el._vzly = null; }
        if (tilt && el._vztilt) settilt(el, '');
      });
      if (cards && tilted) { untilt(tilted); tilted = null; }
    }

    function depthframe() {
      pqueued = false;
      if (settings.lite || reducemotion) return;
      const t = ptarget && ptarget.closest ? ptarget : null;

      // spotlight: tell the hovered element where the cursor is, the css draws the light there
      if (settings.outline === 'spotlight') {
        const el = t && t.closest(lightables);
        if (el) {
          const b = el.getBoundingClientRect();
          el._vzfx = true;
          el.style.setProperty('--vz-mx', Math.round(px - b.left) + 'px');
          el.style.setProperty('--vz-my', Math.round(py - b.top) + 'px');
        }
      }

      // card tilt: the side under the cursor presses in
      const card = settings.cardtilt > 0 && t ? t.closest(tiltables) : null;
      if (card !== tilted) { if (tilted) untilt(tilted); tilted = card || null; }
      if (card) {
        const b = card.getBoundingClientRect(), k = settings.cardtilt;
        const nx = Math.max(-1, Math.min(1, ((px - b.left) / b.width - 0.5) * 2));
        const ny = Math.max(-1, Math.min(1, ((py - b.top) / b.height - 0.5) * 2));
        clearTimeout(card._vzut);
        card._vzfx = true;
        card.style.setProperty('transition', 'transform .18s ease-out, background-color .3s ease, box-shadow .3s ease', 'important');
        card.style.setProperty('transform', 'perspective(700px) rotateX(' + (-ny * k).toFixed(2) + 'deg) rotateY(' + (nx * k).toFixed(2) + 'deg)', 'important');
      }

      // panels: the glass light moves toward the cursor on every panel, only the one you're over tilts
      const light = settings.depthlight, deg = settings.paneltilt;
      if (!light && !deg) return;
      const over = t ? t.closest('[data-vz-panel]') : null;
      frames.forEach((f, el) => {
        if (!el.isConnected) return;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) return;
        if (light) {
          const lx = Math.round(Math.min(130, Math.max(-30, (px - b.left) / b.width * 100)));
          const ly = Math.round(Math.min(130, Math.max(-30, (py - b.top) / b.height * 100)));
          if (el._vzlx !== lx || el._vzly !== ly) {
            el._vzfx = true;
            el._vzlx = lx; el._vzly = ly;
            el.style.setProperty('--vz-lx', lx + '%');
            el.style.setProperty('--vz-ly', ly + '%');
          }
        }
        let tilt = '';
        if (deg && el === over && !el.hasAttribute('data-vz-popup')) {
          const nx = Math.max(-1, Math.min(1, (px - b.left - b.width / 2) / (b.width / 2)));
          const ny = Math.max(-1, Math.min(1, (py - b.top - b.height / 2) / (b.height / 2)));
          tilt = ' perspective(2400px) rotateX(' + (-ny * deg).toFixed(2) + 'deg) rotateY(' + (nx * deg).toFixed(2) + 'deg)';
        }
        if (tilt !== (el._vztilt || '')) settilt(el, tilt);
      });
    }

    document.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY; ptarget = e.target;
      if (!pqueued) { pqueued = true; requestAnimationFrame(depthframe); }
    }, { capture: true, passive: true });
    document.documentElement.addEventListener('mouseleave', () => resetdepth(false, true, true));

    // settings panel: accent, glow, outlines, glass and hover style, saved on this pc
    const defaults = { accent: '#8b9aed', glow: 100, line: 100, tint: 62, blur: 14, radius: 10, v: 2, bgalpha: 100, innershadow: 100, pcover: 100, pctrl: 100, pprog: 100, pextra: 100, olleft: true, olmain: true, olright: true, oltop: true, olplayer: true, olmenus: true, hover: 'glass', outline: 'ring', spotsize: 180, cardtilt: 4, depthlight: true, paneltilt: 0, pulse: true, pagefx: true, shapes: true, dots: true, ringcolor: '', pscale: 100, plift: 0, dragsort: true, dockleft: false, dockright: false, artsync: true, beat: true,
      pfree: false, pfancy: true, pfx: 0.5, pfy: 1, pwidth: 70, padt: 0, padr: 0, padb: 0, padl: 0, lite: false };
    const settings = Object.assign({}, defaults);
    const STORE_KEY = 'vz-settings';
    let savewarned = false;
    // settings live in localStorage (two keys) plus a long-lived cookie, so one store being wiped or not flushed doesn't lose them
    function loadstored() {
      const tries = [
        () => localStorage.getItem(STORE_KEY),
        () => localStorage.getItem(STORE_KEY + '-backup'),
        () => { const m = document.cookie.match(new RegExp('(?:^|; )' + STORE_KEY + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; },
      ];
      for (const t of tries) {
        try {
          const raw = t();
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (err) {}
      }
      return null;
    }
    const stored = loadstored();
    if (stored) for (const k in defaults) if (k in stored && typeof stored[k] === typeof defaults[k]) settings[k] = stored[k];
    // the bar size used to zoom everything inside it, so older saves start from spotify's default size again
    if (!stored || stored.v !== 2) settings.pscale = 100;
    // the old rotating outline toggle became the hover outline style
    if (stored && !('outline' in stored) && stored.ring === false) settings.outline = 'off';
    settings.v = 2;
    // which settings dropdowns are open
    let settingsopen = {};
    try { settingsopen = JSON.parse(localStorage.getItem('vz-settings-open') || '{}') || {}; } catch (err) {}
    const swatches = ['#8b9aed', '#b48cf2', '#f27ab8', '#4fd1a5', '#f2b84f', '#5fb4f2'];

    // presets only touch the look, not the accent, player bar or layout
    const presets = {
      Default: { desc: 'The standard Viruzz look', swatch: 'linear-gradient(135deg, #8b9aed, #3a4377)',
        set: { glow: 100, line: 100, tint: 62, blur: 14, bgalpha: 100, hover: 'glass', outline: 'ring', cardtilt: 4, depthlight: true, paneltilt: 0, shapes: true, dots: true, beat: true, pulse: true, pagefx: true } },
      Calm: { desc: 'Soft glow, no floating shapes, no beat effects', swatch: 'linear-gradient(135deg, #a3aec2, #2b303b)',
        set: { glow: 45, line: 70, tint: 72, blur: 12, bgalpha: 100, hover: 'glass', outline: 'spotlight', cardtilt: 0, depthlight: true, paneltilt: 0, shapes: false, dots: true, beat: false, pulse: false, pagefx: true } },
      Neon: { desc: 'Strong glow and outlines, everything reacts to the music', swatch: 'linear-gradient(135deg, #f27ab8, #8b9aed)',
        set: { glow: 180, line: 150, tint: 55, blur: 14, bgalpha: 100, hover: 'glass', outline: 'ring', cardtilt: 6, depthlight: true, paneltilt: 1, shapes: true, dots: true, beat: true, pulse: true, pagefx: true } },
      Frosted: { desc: 'Heavy blur, see-through panels, spotlight hover', swatch: 'linear-gradient(135deg, #ffffff, #5fb4f2)',
        set: { glow: 90, line: 90, tint: 42, blur: 26, bgalpha: 75, hover: 'glass', outline: 'spotlight', cardtilt: 4, depthlight: true, paneltilt: 1, shapes: true, dots: true, beat: true, pulse: true, pagefx: true } },
      Minimal: { desc: 'No glow, no motion, just clean boxes', swatch: 'linear-gradient(135deg, #3a3a3a, #111111)',
        set: { glow: 0, line: 60, tint: 80, blur: 0, bgalpha: 100, hover: 'solid', outline: 'off', cardtilt: 0, depthlight: false, paneltilt: 0, shapes: false, dots: false, beat: false, pulse: false, pagefx: false } },
    };
    const ispreset = (name) => Object.entries(presets[name].set).every(([k, v]) => settings[k] === v);
    function applypreset(name) {
      Object.assign(settings, presets[name].set);
      savesettings(600);
      beatsettingchanged();
    }

    // share codes: every setting except where a free-floating bar was left
    const sharekeys = () => Object.keys(defaults).filter((k) => !['v', 'pfx', 'pfy'].includes(k));
    function exportcode() {
      const out = {};
      sharekeys().forEach((k) => { out[k] = settings[k]; });
      return 'vz1:' + btoa(unescape(encodeURIComponent(JSON.stringify(out))));
    }
    function importcode(code) {
      try {
        const raw = String(code || '').trim().replace(/^vz1:/, '');
        const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
        let n = 0;
        sharekeys().forEach((k) => { if (data && k in data && typeof data[k] === typeof defaults[k]) { settings[k] = data[k]; n++; } });
        if (!n) return false;
        savesettings(600);
        beatsettingchanged();
        note('Viruzz settings imported');
        return true;
      } catch (err) { return false; }
    }

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

    let artrgb = null, livergb = null, tweenid = 0;
    const targetrgb = () => (settings.artsync && artrgb) ? artrgb : hexrgb(settings.accent);

    // pushes one accent color into every css var that uses it
    function applyaccent(rgb) {
      const set = (k, v) => document.documentElement.style.setProperty(k, v);
      const [r, g, b] = rgb.map((c) => Math.round(c));
      accentrgb = [r, g, b];
      const hex = rgbhex(accentrgb);
      const light = accentrgb.map((c) => Math.round(c + (255 - c) * 0.35));
      set('--vz-accent-rgb', r + ', ' + g + ', ' + b);
      // spotify's own accent bits (progress bar, toggles) read these
      set('--spice-button', hex);
      set('--spice-rgb-button', r + ',' + g + ',' + b);
      set('--spice-tab-active', hex);
      set('--spice-rgb-tab-active', r + ',' + g + ',' + b);
      set('--spice-notification', hex);
      set('--spice-rgb-notification', r + ',' + g + ',' + b);
      set('--spice-button-active', 'rgb(' + light.join(',') + ')');
      set('--spice-rgb-button-active', light.join(','));
    }

    // eases the accent toward a new color, ms = 0 jumps straight there
    function goaccent(target, ms) {
      cancelAnimationFrame(tweenid);
      if (!ms || reducemotion || !livergb) { livergb = target.slice(); applyaccent(livergb); return; }
      const from = livergb.slice(), to = target.slice(), t0 = performance.now();
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        livergb = from.map((c, i) => c + (to[i] - c) * e);
        applyaccent(livergb);
        if (k < 1) tweenid = requestAnimationFrame(tick);
      };
      tweenid = requestAnimationFrame(tick);
    }

    function applysettings(ms) {
      const root = document.documentElement;
      const set = (k, v) => root.style.setProperty(k, v);
      set('--vz-glow', String(settings.glow / 100));
      set('--vz-line', String(settings.line / 100));
      set('--vz-glass-tint', String(settings.tint / 100));
      set('--vz-glass-blur', settings.blur + 'px');
      set('--vz-radius', settings.radius + 'px');
      // container background opacity, and a black inner shadow that grows as the backgrounds get more transparent
      set('--vz-bg-alpha', String(settings.bgalpha / 100));
      set('--vz-bg-inv', String((1 - settings.bgalpha / 100) * settings.innershadow / 100));
      set('--vz-z-cover', String(settings.pcover / 100));
      set('--vz-z-ctrl', String(settings.pctrl / 100));
      set('--vz-z-prog', String(settings.pprog / 100));
      set('--vz-z-extra', String(settings.pextra / 100));
      if (settings.ringcolor) set('--vz-hover-rgb', hexrgb(settings.ringcolor).join(', ')); else root.style.removeProperty('--vz-hover-rgb');
      set('--vz-ring-on', settings.outline !== 'off' && settings.hover !== 'off' ? '1' : '0');
      set('--vz-spot-size', settings.spotsize + 'px');
      root.setAttribute('data-vz-outline', settings.outline);
      root.toggleAttribute('data-vz-pulse', !!settings.pulse && !settings.lite);
      resetdepth(settings.lite || !settings.depthlight, settings.lite || !settings.paneltilt, settings.lite || !settings.cardtilt);
      root.setAttribute('data-vz-hover', settings.hover);
      root.toggleAttribute('data-vz-noshapes', !settings.shapes);
      root.toggleAttribute('data-vz-nodots', !settings.dots);
      set('--vz-padt', settings.padt + 'px');
      set('--vz-padr', settings.padr + 'px');
      set('--vz-padb', settings.padb + 'px');
      set('--vz-padl', settings.padl + 'px');
      root.toggleAttribute('data-vz-padding', settings.padt + settings.padr + settings.padb + settings.padl > 0);
      root.toggleAttribute('data-vz-pfree', !!settings.pfree);
      root.toggleAttribute('data-vz-lite', !!settings.lite);
      ['left', 'main', 'right', 'player', 'top', 'menus'].forEach((n) => root.toggleAttribute('data-vz-nool-' + n, settings['ol' + n] === false));
      grips.lift.title = settings.pfree ? 'Drag to move the player bar, double click to put it back at the bottom' : 'Drag up to lift the player bar, double click to reset';
      goaccent(targetrgb(), ms || 0);
      if (playerel) ensureplayer(playerel, true);
      markdirty();
    }

    function persist() {
      let json;
      try { json = JSON.stringify(settings); } catch (err) { return; }
      let ok = false;
      try {
        localStorage.setItem(STORE_KEY, json);
        localStorage.setItem(STORE_KEY + '-backup', json);
        ok = localStorage.getItem(STORE_KEY) === json;
      } catch (err) {}
      try { document.cookie = STORE_KEY + '=' + encodeURIComponent(json) + '; max-age=31536000; path=/; SameSite=Lax'; } catch (err) {}
      if (!ok && !savewarned) { savewarned = true; note('Viruzz: could not save settings to local storage'); }
    }
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

    // ms = how long the accent takes to ease to its new color
    function savesettings(ms) {
      persist();
      applysettings(ms);
    }
    applysettings();

    // ---- music hooks: album art accent, beat pulses, song change sweep ----
    const trackuri = () => { try { return Spicetify.Player.data.item.uri || ''; } catch (err) { return ''; } };

    // where the cover art sits in the player bar, ripples start from there
    function coverpoint() {
      const pl = document.querySelector('[data-vz-player]');
      const img = pl && pl.querySelector('img');
      const ref = img ? img.getBoundingClientRect() : pl ? pl.getBoundingClientRect() : null;
      if (!ref) return [70, window.innerHeight - 50];
      return img ? [ref.left + ref.width / 2, ref.top + ref.height / 2] : [ref.left + 70, ref.top + ref.height / 2];
    }

    // picks the most vivid hue in the cover art (area x saturation), then lifts it so it reads on dark
    function dominant(img) {
      const n = 40, cv = document.createElement('canvas');
      cv.width = cv.height = n;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, n, n);
      const px = cx.getImageData(0, 0, n, n).data;
      const buckets = Array.from({ length: 18 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 200) continue;
        const [h, s, v] = rgbhsv([px[i], px[i + 1], px[i + 2]]);
        if (s < 0.28 || v < 0.22) continue;
        const w = s * s * (0.3 + v);
        const k = buckets[Math.floor(h / 20) % 18];
        k.w += w; k.r += px[i] * w; k.g += px[i + 1] * w; k.b += px[i + 2] * w;
      }
      let best = null;
      for (const k of buckets) if (!best || k.w > best.w) best = k;
      // greyscale or near-empty art: no good color, caller falls back to the manual accent
      if (!best || best.w < 8) return null;
      const [h, s, v] = rgbhsv([best.r / best.w, best.g / best.w, best.b / best.w]);
      return hsvrgb([h, Math.min(0.85, Math.max(0.42, s)), Math.max(0.8, v)]);
    }

    function setart(rgb) {
      artrgb = rgb;
      if (settings.artsync) goaccent(targetrgb(), 1100);
    }

    let artjob = 0;
    function sampleart() {
      const job = ++artjob;
      let raw = null;
      try { const m = Spicetify.Player.data.item.metadata; raw = m.image_xlarge_url || m.image_large_url || m.image_url; } catch (err) {}
      if (!raw) { setart(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (job !== artjob) return;
        let rgb = null;
        try { rgb = dominant(img); } catch (err) {}
        setart(rgb);
      };
      img.onerror = () => { if (job === artjob) setart(null); };
      img.src = raw.replace('spotify:image:', 'https://i.scdn.co/image/');
    }

    // bar clock: spotify's bar start times plus an interpolated playback position
    let bars = [], bari = 0, beats = [], beati = 0;
    let pos0 = 0, pos0t = 0, playing = false;
    const firstafter = (list, t) => { let i = 0; while (i < list.length && list[i] < t) i++; return i; };

    function syncpos() {
      try { pos0 = Spicetify.Player.getProgress(); playing = Spicetify.Player.isPlaying(); } catch (err) { return; }
      pos0t = performance.now();
      bari = firstafter(bars, pos0 - 40);
      beati = firstafter(beats, pos0 - 40);
    }

    async function loadbars(uri) {
      bars = []; bari = 0; beats = []; beati = 0;
      if (!uri || (!settings.beat && !settings.pulse) || reducemotion) return;
      try {
        if (!Spicetify.getAudioData) return;
        const data = await Spicetify.getAudioData(uri);
        if (uri !== trackuri()) return;
        bars = (data.bars || []).map((b) => b.start * 1000);
        beats = (data.beats || []).map((b) => b.start * 1000);
        syncpos();
      } catch (err) { /* no analysis for this track, just no ripples */ }
    }

    function beatsettingchanged() {
      if (settings.beat || settings.pulse) { loadbars(trackuri()); syncpos(); } else { bars = []; beats = []; }
    }

    // lights up the floating shapes as the beat wave passes them, same timing as the dot ripple's crest
    function pulseshapes(cx, cy, reach, ms) {
      if (reducemotion || settings.lite || document.documentElement.hasAttribute('data-vz-noshapes')) return;
      const bright = 'rgba(' + accentrgb.map(Math.round).join(',') + ',0.95)';
      document.querySelectorAll('.vz-shape').forEach((el) => {
        const b = el.getBoundingClientRect();
        const d = Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy);
        if (d > reach) return;
        // the ripple crest eases out, so invert that curve to know when it reaches this shape
        const age = 1 - Math.pow(1 - d / reach, 1 / 3);
        el.animate([{ color: bright, borderColor: bright }], { duration: 260, delay: age * ms, direction: 'alternate', iterations: 2, easing: 'ease-out' });
      });
    }

    // runs every frame: on each bar a wave goes out from the middle of the window through every dot and shape
    // the player bar outline and progress bar flash on each beat, a bit brighter on the first beat of a bar
    function beatpulse(k) {
      const kf = [{ '--vz-beat': String(k) }, { '--vz-beat': '0' }];
      const opts = { duration: 520, easing: 'cubic-bezier(.2, .7, .3, 1)' };
      [playerel, playerframe].forEach((n) => { if (n) try { n.animate(kf, opts); } catch (err) {} });
    }

    // runs every frame: on each bar a wave goes out from the middle of the window, each beat pulses the player bar
    function bartick(now) {
      if (!playing || document.hidden || settings.lite || reducemotion || (!bars.length && !beats.length)) return;
      const pos = pos0 + (now - pos0t);
      while (bari < bars.length && bars[bari] <= pos) {
        if (settings.beat && pos - bars[bari] < 120) {
          const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
          const reach = Math.hypot(cx, cy) + 60, ms = 1500;
          addripple(cx, cy, { reach, ms, band: 130, power: 0.9 });
          pulseshapes(cx, cy, reach, ms);
        }
        bari++;
      }
      while (beati < beats.length && beats[beati] <= pos) {
        if (settings.pulse && pos - beats[beati] < 120) {
          const onbar = bari > 0 && Math.abs(bars[bari - 1] - beats[beati]) < 80;
          beatpulse(onbar ? 1 : 0.55);
        }
        beati++;
      }
    }

    function onsong(quiet) {
      sampleart();
      if (!reducemotion && !settings.lite && quiet !== true && settings.beat) {
        const p = coverpoint();
        addripple(p[0], p[1], { reach: Math.hypot(window.innerWidth, window.innerHeight), ms: 1900, band: 150, power: 0.55 });
      }
      loadbars(trackuri());
      syncpos();
    }

    // smooth page changes: the new page fades and slides up a little
    let lastpath = '';
    function pagein() {
      if (!settings.pagefx || settings.lite || reducemotion) return;
      const mv = document.getElementById('main-view');
      const target = mv && (mv.querySelector('.main-view-container__scroll-node') || mv.querySelector('main'));
      if (!target) return;
      try {
        target.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
          { duration: 340, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      } catch (err) {}
    }
    (function hookhistory(n) {
      const H = window.Spicetify && Spicetify.Platform && Spicetify.Platform.History;
      if (H && H.listen) {
        try { lastpath = (H.location && H.location.pathname) || ''; } catch (err) {}
        H.listen((loc) => {
          const p = (loc && loc.pathname) || '';
          if (p === lastpath) return;
          lastpath = p;
          requestAnimationFrame(() => requestAnimationFrame(pagein));
        });
      } else if (n < 60) setTimeout(() => hookhistory(n + 1), 1000);
    })(0);

    (function hookplayer(n) {
      const P = window.Spicetify && Spicetify.Player;
      if (P && P.addEventListener) {
        P.addEventListener('songchange', () => onsong());
        P.addEventListener('onplaypause', syncpos);
        P.addEventListener('onprogress', () => {
          try {
            const drift = Math.abs(pos0 + (performance.now() - pos0t) - P.getProgress());
            if (!playing || drift > 150) syncpos();
          } catch (err) {}
        });
        onsong(true);
      } else if (n < 90) setTimeout(() => hookplayer(n + 1), 1000);
    })(0);

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
      // keep spotify's keyboard shortcuts from catching anything typed in here
      ['keydown', 'keyup', 'keypress'].forEach((type) => panel.addEventListener(type, (e) => e.stopPropagation()));
      // rebuilds the panel after a preset or import so every control shows the new values
      const reopen = () => {
        const st = panel.scrollTop;
        close();
        opensettings();
        const p = document.querySelector('.vz-settings');
        if (p) p.scrollTop = st;
      };

      const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
      const svg = (path) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentcolor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';

      // sticky top: title, live preview and search
      const top = el('div', 'vz-set-top');
      const head = el('div', 'vz-settings-head');
      const titles = el('div', 'vz-set-titles');
      titles.appendChild(el('h2', '', 'Viruzz settings'));
      titles.appendChild(el('span', '', 'Changes apply live'));
      head.appendChild(titles);
      const x = el('button', 'vz-winbtn');
      x.title = 'Close';
      x.innerHTML = winsvg('close');
      x.addEventListener('click', close);
      head.appendChild(x);
      top.appendChild(head);

      const prev = el('div', 'vz-prev');
      prev.innerHTML = '<div class="vz-prev-row"><div class="vz-prev-cover"></div><div class="vz-prev-text"><b>Live preview</b><span>Hover me to try the outline and tilt</span></div>' +
        '<span class="vz-winbtn vz-prev-btn"><svg viewBox="0 0 16 16"><path d="M5 3.5v9l7-4.5z"/></svg></span></div><div class="vz-prev-bar"><i></i></div>';
      top.appendChild(prev);

      const sbox = el('label', 'vz-set-searchbox');
      sbox.innerHTML = svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
      const search = el('input', 'vz-set-search');
      search.type = 'text';
      search.placeholder = 'Search settings';
      search.spellcheck = false;
      sbox.appendChild(search);
      top.appendChild(sbox);
      panel.appendChild(top);

      // rows go into whichever section was opened last
      let host = panel;
      const sections = [];
      const row = (label, ctl, hint) => {
        const r = el('div', 'vz-set-row');
        r.dataset.label = (label + ' ' + (hint || '')).toLowerCase();
        const text = el('div', 'vz-set-label');
        text.appendChild(el('span', '', label));
        if (hint) text.appendChild(el('small', '', hint));
        r.appendChild(text);
        r.appendChild(ctl);
        host.appendChild(r);
        return r;
      };

      // a dropdown category with an icon, its open state is remembered
      const section = (key, title, icon) => {
        const wrap = el('div', 'vz-set-section');
        const btn = el('button', 'vz-set-sechead');
        btn.type = 'button';
        btn.innerHTML = '<span class="vz-set-icon">' + svg(icon) + '</span><span class="vz-set-title"></span>' +
          '<svg class="vz-set-chev" viewBox="0 0 24 24" fill="none" stroke="currentcolor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
        btn.querySelector('.vz-set-title').textContent = title;
        const inner = el('div', 'vz-set-secwrap');
        const body = el('div', 'vz-set-secbody');
        inner.appendChild(body);
        // height is set inline so spotify's css can't stop the dropdown opening
        const setheight = (v, animate) => {
          const s = inner.style;
          s.setProperty('display', 'block', 'important');
          s.setProperty('overflow', 'hidden', 'important');
          body.style.setProperty('visibility', 'visible', 'important');
          clearTimeout(inner._vzt);
          if (!animate || reducemotion) {
            s.setProperty('transition', 'none', 'important');
            s.setProperty('height', v ? 'auto' : '0px', 'important');
            if (!v) body.style.setProperty('visibility', 'hidden', 'important');
            return;
          }
          const full = body.scrollHeight + 'px';
          s.setProperty('transition', 'none', 'important');
          s.setProperty('height', v ? '0px' : full, 'important');
          void inner.offsetHeight;
          s.setProperty('transition', 'height .28s cubic-bezier(.4, 0, .2, 1)', 'important');
          s.setProperty('height', v ? full : '0px', 'important');
          inner._vzt = setTimeout(() => {
            s.setProperty('transition', 'none', 'important');
            if (v) s.setProperty('height', 'auto', 'important');
            else body.style.setProperty('visibility', 'hidden', 'important');
          }, 300);
        };
        const setopen = (v) => {
          wrap.toggleAttribute('data-open', v);
          btn.setAttribute('aria-expanded', String(v));
          setheight(v, true);
          settingsopen[key] = v;
          try { localStorage.setItem('vz-settings-open', JSON.stringify(settingsopen)); } catch (err) {}
        };
        btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); setopen(!wrap.hasAttribute('data-open')); });
        const was = settingsopen[key];
        const start = was === undefined ? key === 'presets' : !!was;
        wrap.toggleAttribute('data-open', start);
        btn.setAttribute('aria-expanded', String(start));
        setheight(start, false);
        wrap.appendChild(btn);
        wrap.appendChild(inner);
        panel.appendChild(wrap);
        sections.push({ wrap, body, title: title.toLowerCase(), setheight });
        host = body;
      };

      // hooks: read / write for sliders that aren't a single setting, after() runs once a change is in
      const slider = (label, key, min, max, unit, hooks) => {
        const read = hooks && hooks.read ? hooks.read : () => settings[key];
        const write = hooks && hooks.write ? hooks.write : (v) => { settings[key] = v; };
        const c = el('div', 'vz-set-ctl');
        const input = el('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        const val = el('span', 'vz-set-val');
        const sync = () => { const v = read(); input.value = v; val.textContent = v + unit; };
        input.addEventListener('input', () => { write(Number(input.value)); sync(); if (hooks && hooks.after) hooks.after(); savesettings(); });
        // click the number to type a value, enter or clicking away applies it, escape cancels
        val.title = 'Click to type a value';
        val.addEventListener('click', () => {
          if (val._editing) return;
          val._editing = true;
          const box = el('input', 'vz-set-num');
          box.type = 'text';
          box.inputMode = 'decimal';
          box.value = read();
          val.textContent = '';
          val.appendChild(box);
          box.focus();
          box.select();
          let done = false;
          const finish = (commit) => {
            if (done) return;
            done = true;
            val._editing = false;
            if (commit) {
              const n = parseFloat(String(box.value).replace(',', '.'));
              if (isFinite(n)) {
                write(Math.min(max, Math.max(min, Math.round(n))));
                if (hooks && hooks.after) hooks.after();
                savesettings();
              }
            }
            sync();
          };
          box.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') { e.stopPropagation(); finish(false); } });
          box.addEventListener('blur', () => finish(true));
          box.addEventListener('click', (e) => e.stopPropagation());
        });
        sync();
        c.appendChild(input);
        c.appendChild(val);
        row(label, c);
        return sync;
      };

      let syncbox = null;
      const toggle = (label, key, hint) => {
        const t = el('input', 'vz-toggle');
        t.type = 'checkbox';
        t.checked = settings[key];
        t.addEventListener('change', () => {
          // free mode starts from wherever the bar is right now
          if (key === 'pfree' && t.checked) initfree();
          settings[key] = t.checked;
          savesettings(key === 'artsync' ? 800 : 0);
          if (key === 'beat' || key === 'pulse') beatsettingchanged();
        });
        row(label, t, hint);
        return t;
      };

      const segrow = (label, key, options, hint) => {
        const seg = el('div', 'vz-seg');
        options.forEach(([v, text]) => {
          const b = el('button', '', text);
          b.type = 'button';
          b.setAttribute('aria-pressed', String(settings[key] === v));
          b.addEventListener('click', () => {
            settings[key] = v;
            seg.querySelectorAll('button').forEach((n) => n.setAttribute('aria-pressed', String(n === b)));
            savesettings();
          });
          seg.appendChild(b);
        });
        row(label, seg, hint);
      };

      // ---- presets and performance ----
      section('presets', 'Presets & performance', '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>');
      const grid = el('div', 'vz-presets');
      grid.dataset.label = ('presets ' + Object.keys(presets).join(' ')).toLowerCase();
      Object.keys(presets).forEach((name) => {
        const p = presets[name];
        const b = el('button', 'vz-preset');
        b.type = 'button';
        b.title = p.desc;
        const dot = el('i');
        dot.style.background = p.swatch;
        b.appendChild(dot);
        b.appendChild(el('span', '', name));
        b.setAttribute('aria-pressed', String(ispreset(name)));
        b.addEventListener('click', () => { applypreset(name); reopen(); });
        grid.appendChild(b);
      });
      host.appendChild(grid);
      toggle('Performance mode', 'lite', 'Turns off blur, shapes, tilt, spotlight, beat effects and page animations');

      const copybtn = el('button', 'vz-set-default', 'Copy code');
      copybtn.type = 'button';
      copybtn.addEventListener('click', async () => {
        const code = exportcode();
        let ok = false;
        try { await navigator.clipboard.writeText(code); ok = true; } catch (err) {}
        if (!ok) { codein.value = code; codein.select(); try { ok = document.execCommand('copy'); } catch (err) {} }
        copybtn.textContent = ok ? 'Copied' : 'Copy the code below';
        setTimeout(() => { copybtn.textContent = 'Copy code'; }, 1600);
      });
      row('Share your setup', copybtn, 'Copies a code anyone can import');
      const imp = el('div', 'vz-set-ctl');
      const codein = el('input', 'vz-set-code');
      codein.type = 'text';
      codein.placeholder = 'Paste a code';
      codein.spellcheck = false;
      const impbtn = el('button', 'vz-set-default', 'Import');
      impbtn.type = 'button';
      impbtn.addEventListener('click', () => {
        if (importcode(codein.value)) { reopen(); return; }
        codein.value = '';
        codein.placeholder = "That code didn't work";
      });
      imp.appendChild(codein);
      imp.appendChild(impbtn);
      row('Import a setup', imp);

      // ---- colors ----
      section('colors', 'Colors', '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.6 0-1-.8-1.4-.8-2.3 0-.8.7-1.4 1.5-1.4H17a4 4 0 0 0 4-4c0-4.8-4-8.7-9-8.7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>');

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
      picker.dataset.label = 'accent color picker hex';
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
      host.appendChild(picker);

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
        // picking a color by hand switches album art sync off
        if (settings.artsync) { settings.artsync = false; if (syncbox) syncbox.checked = false; }
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

      syncbox = toggle('Accent from album art', 'artsync', 'Picks the main color of whatever is playing');

      // ---- shape and glass ----
      section('shape', 'Shape & glass', '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/>');
      slider('Corner radius', 'radius', 0, 32, 'px');
      slider('Glow strength', 'glow', 0, 200, '%');
      slider('Outline strength', 'line', 0, 200, '%');
      slider('Glass tint', 'tint', 20, 95, '%');
      slider('Glass blur', 'blur', 0, 30, 'px');
      slider('Container background opacity', 'bgalpha', 0, 100, '%');
      slider('Inner shadow when transparent', 'innershadow', 0, 200, '%');

      // ---- outlines ----
      section('outlines', 'Outlines', '<rect x="4" y="4" width="16" height="16" rx="4"/>');
      toggle('Left sidebar outline', 'olleft');
      toggle('Main view outline', 'olmain');
      toggle('Right sidebar outline', 'olright');
      toggle('Top bar outline', 'oltop');
      toggle('Player bar outline', 'olplayer');
      toggle('Menus & popups outline', 'olmenus');

      // ---- hover and depth ----
      section('hover', 'Hover & depth', '<path d="M5 3l14 7-6 2-2 6z"/>');
      segrow('Hover background', 'hover', [['glass', 'Glass'], ['solid', 'Solid'], ['off', 'Off']]);
      segrow('Hover outline', 'outline', [['spotlight', 'Spotlight'], ['ring', 'Rotating'], ['off', 'Off']], 'Spotlight lights the edge right where your cursor is');
      slider('Spotlight size', 'spotsize', 60, 400, 'px');

      // hover outline color, independent from the accent
      const rc = el('div', 'vz-set-ctl');
      const match = el('button', 'vz-set-default', 'Match accent');
      rc.appendChild(match);
      swatches.slice(0, 4).forEach((c) => {
        const s = el('button', 'vz-swatch');
        s.dataset.c = c;
        s.style.background = c;
        s.title = c;
        rc.appendChild(s);
      });
      const rpick = el('input', 'vz-ring-pick');
      rpick.type = 'color';
      rpick.title = 'Custom color';
      rc.appendChild(rpick);
      const paintring = () => {
        match.setAttribute('aria-pressed', String(!settings.ringcolor));
        rc.querySelectorAll('.vz-swatch').forEach((n) => n.setAttribute('aria-pressed', String(n.dataset.c === settings.ringcolor)));
        rpick.value = settings.ringcolor || rgbhex(accentrgb);
      };
      const setring = (hex) => { settings.ringcolor = hex; savesettings(); paintring(); };
      match.addEventListener('click', () => setring(''));
      rc.querySelectorAll('.vz-swatch').forEach((n) => n.addEventListener('click', () => setring(n.dataset.c)));
      rpick.addEventListener('input', () => setring(rpick.value.toLowerCase()));
      row('Hover outline color', rc);
      paintring();

      slider('Card tilt', 'cardtilt', 0, 12, '°');
      toggle('Glass light follows cursor', 'depthlight', 'The bright corner of each panel moves toward your mouse');
      slider('Panel tilt', 'paneltilt', 0, 3, '°');

      // ---- motion and music ----
      section('motion', 'Motion & music', '<path d="M3 12h3l2-6 4 12 3-9 2 3h4"/>');
      toggle('Ripples on the beat', 'beat');
      toggle('Player bar pulses on the beat', 'pulse', 'The outline and progress bar glow with each beat');
      toggle('Smooth page changes', 'pagefx', 'New pages fade and slide in');
      toggle('Floating shapes', 'shapes');
      toggle('Dot background', 'dots');

      // ---- player bar ----
      section('player', 'Player bar', '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M10.5 15.3v2.4l2-1.2z"/><path d="M7 5h10M9 9h6"/>');
      slider('Bar height', 'pscale', 70, 160, '%');
      slider('Album cover & track text', 'pcover', 50, 160, '%');
      slider('Play / next / previous / shuffle', 'pctrl', 50, 160, '%');
      slider('Progress bar & times', 'pprog', 50, 160, '%');
      slider('Right-side icons & volume', 'pextra', 50, 160, '%');
      slider('Player bar lift', 'plift', 0, 240, 'px');
      toggle('Free-move player bar', 'pfree');
      toggle('Bar lift, tilt and snap', 'pfancy');
      slider('Free bar width', 'pwidth', 25, 100, '%');
      const posbtn = el('button', 'vz-set-default', 'Bottom center');
      posbtn.addEventListener('click', () => { settings.pfx = 0.5; settings.pfy = 1; savesettings(); });
      row('Free bar position', posbtn);

      // ---- layout ----
      section('layout', 'Sidebars & library', '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>');
      toggle('Dock left sidebar to bottom', 'dockleft');
      toggle('Dock right sidebar to bottom', 'dockright');
      toggle('Drag playlists to reorder', 'dragsort');

      // ---- padding around the whole app, on top of spotify's own ----
      section('padding', 'Padding', '<rect x="3" y="3" width="18" height="18" rx="3"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>');
      const padkeys = ['padt', 'padr', 'padb', 'padl'];
      const padsyncs = [];
      const allsync = slider('All sides', null, 0, 160, 'px', {
        read: () => Math.round(padkeys.reduce((sum, k) => sum + settings[k], 0) / 4),
        write: (v) => { padkeys.forEach((k) => { settings[k] = v; }); padsyncs.forEach((f) => f()); },
      });
      [['Top', 'padt'], ['Right', 'padr'], ['Bottom', 'padb'], ['Left', 'padl']].forEach(([label, key]) => {
        padsyncs.push(slider(label, key, 0, 160, 'px', { after: () => allsync() }));
      });

      const empty = el('div', 'vz-set-empty', 'No settings match that');
      empty.style.display = 'none';
      panel.appendChild(empty);

      // search: shows only matching rows, opens their sections while you type, puts things back when cleared
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        let anyhit = false;
        sections.forEach((s) => {
          const titlehit = !!q && s.title.includes(q);
          let hits = 0;
          [...s.body.children].forEach((n) => {
            const hit = !q || titlehit || (n.dataset.label || '').includes(q);
            n.style.display = hit ? '' : 'none';
            if (hit) hits++;
          });
          s.wrap.style.display = !q || hits ? '' : 'none';
          if (hits && q) anyhit = true;
          s.setheight(q ? hits > 0 : s.wrap.hasAttribute('data-open'), false);
        });
        empty.style.display = q && !anyhit ? '' : 'none';
      });

      const actions = el('div', 'vz-set-actions');
      const reset = el('button', 'vz-set-btn', 'Reset to default');
      reset.addEventListener('click', () => {
        Object.assign(settings, defaults);
        savesettings(700);
        beatsettingchanged();
        reopen();
      });
      const done = el('button', 'vz-set-btn', 'Done');
      done.addEventListener('click', close);
      actions.appendChild(reset);
      actions.appendChild(done);
      panel.appendChild(actions);

      document.body.appendChild(overlay);
      search.focus({ preventScroll: true });
    }

    // also reachable from the profile menu, in case the top bar button is ever hidden
    let menuadded = false;
    function addmenuitem() {
      if (menuadded || !(window.Spicetify && Spicetify.Menu && Spicetify.Menu.Item)) return;
      try { new Spicetify.Menu.Item('Viruzz settings', false, opensettings).register(); menuadded = true; } catch (err) {}
    }

    const trackrows = '.main-trackList-trackListRow, [data-testid="tracklist-row"], [role="row"], [role="grid"], [role="rowgroup"]';
    // recents tiles: short wide boxes with cover art sitting in a grid, tagged so the css can glass them
    function tagtiles() {
      const mv = document.getElementById('main-view');
      if (!mv) return;
      // song rows have a wide cover + title cell too, but they are not tiles, so un-tag anything inside a track list
      mv.querySelectorAll('[data-vz-tile]').forEach((t) => { if (t.closest(trackrows)) t.removeAttribute('data-vz-tile'); });
      const imgs = mv.querySelectorAll('img');
      for (let i = 0; i < imgs.length && i < 60; i++) {
        if (imgs[i].closest(trackrows)) continue;
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

    // the cheap part (panels, sidebars) runs on every pass, the heavy probing (see-through panels, tint, tiles) only after a change
    let fullpending = true;
    function sweep() {
      if (document.hidden) return;
      const full = fullpending;
      fullpending = false;
      try {
        const main = tagpanels();
        checksidebars();
        if (full) { sweepbig(); sweeptint(main); tagtiles(); fitroom(); }
      } catch (err) { console.warn('[viruzz] sweep', err); }
    }

    let sweeptimer = null;
    const queuesweep = () => { fullpending = true; clearTimeout(sweeptimer); sweeptimer = setTimeout(sweep, 250); };
    const ours = '.vz-frame-layer, .vz-grip-layer, .vz-shape-field, #viruzz-bg-canvas, .vz-winbtns, .vz-settings-overlay';
    const isours = (n) => n === framelayer || (n.closest && n.closest(ours));

    // spotify draws some menus (the ... share menu etc) inside the player bar or a panel, where our
    // clipping and blur trap them. while one is open that box lets it out
    const popsel = '[data-tippy-root], .tippy-box, [role="menu"], [data-popper-placement], #context-menu';
    let popqueued = false;
    function syncpopups() {
      popqueued = false;
      document.querySelectorAll('[data-vz-panel], [data-vz-player]').forEach((h) => {
        const open = !!h.querySelector(popsel);
        if (open === h.hasAttribute('data-vz-popup')) return;
        h.toggleAttribute('data-vz-popup', open);
        if (open && h._vztilt) settilt(h, '');
      });
    }
    new MutationObserver((records) => {
      if (popqueued) return;
      for (const r of records) {
        if (r.addedNodes.length || r.removedNodes.length) { popqueued = true; requestAnimationFrame(syncpopups); return; }
      }
    }).observe(document.body, { childList: true, subtree: true });

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
            const target = record.target;
            if (isours(target)) continue;
            // the progress bar and time labels change constantly while playing, and list rows on every scroll
            if (playerel && playerel.contains(target)) continue;
            if (record.type === 'attributes' && target.closest && target.closest(rowsel)) continue;
            if (record.attributeName === 'style' && (target === fitted || target.id === 'main-view' || target._vzfx)) continue;
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
      window.addEventListener('resize', () => { markdirty(); queuesweep(); });
      // slow safety net, a full pass (the heavy probing) every fifth tick
      let ticks = 0;
      setInterval(() => { if (++ticks % 5 === 0) fullpending = true; sweep(); }, 2000);
      sweep();
      fitgrid();
    }

    // ---- drag playlists in the library to reorder them ----
    const rowsel = '[data-encore-id="listRow"], [role="row"], [role="listitem"]';
    const libroot = () => document.getElementById('Desktop_LeftSidebar_Id') || cellfor('left');
    let drag = null;

    function playlisturi(row) {
      const a = row && (row.querySelector('a[href*="/playlist/"]') || row.closest('a[href*="/playlist/"]'));
      const m = a && (a.getAttribute('href') || '').match(/\/playlist\/([A-Za-z0-9]+)/);
      return m ? 'spotify:playlist:' + m[1] : null;
    }

    function scrollerof(el) {
      while (el && el !== document.body) {
        const s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight) return el;
        el = el.parentElement;
      }
      return null;
    }

    function droptarget(x, y) {
      const root = libroot();
      for (const el of document.elementsFromPoint(x, y)) {
        const r = el.closest && el.closest(rowsel);
        if (!r || !root || !root.contains(r) || r === drag.row) continue;
        const uri = playlisturi(r);
        if (!uri || uri === drag.uri) continue;
        const b = r.getBoundingClientRect();
        return { uri, after: y > b.top + b.height / 2, b };
      }
      return null;
    }

    function dragstop() {
      if (!drag) return;
      if (drag.ghost) drag.ghost.remove();
      if (drag.lane) drag.lane.remove();
      if (drag.row) drag.row.removeAttribute('data-vz-dragsrc');
      document.documentElement.classList.remove('vz-dragging');
      drag = null;
    }

    function dragbegin() {
      drag.on = true;
      drag.sc = scrollerof(drag.row);
      document.documentElement.classList.add('vz-dragging');
      drag.row.setAttribute('data-vz-dragsrc', '');
      const ghost = document.createElement('div');
      ghost.className = 'vz-dragghost';
      ghost.textContent = drag.name;
      pin(ghost, { position: 'absolute', top: '0', left: '0', 'pointer-events': 'none' });
      const lane = document.createElement('div');
      lane.className = 'vz-droplane';
      pin(lane, { position: 'absolute', top: '0', left: '0', 'pointer-events': 'none', display: 'none' });
      framelayer.appendChild(ghost);
      framelayer.appendChild(lane);
      drag.ghost = ghost;
      drag.lane = lane;
      (function autoscroll() {
        if (!drag) return;
        const sc = drag.sc;
        if (sc) {
          const b = sc.getBoundingClientRect();
          if (drag.y < b.top + 44) sc.scrollTop -= 14;
          else if (drag.y > b.bottom - 44) sc.scrollTop += 14;
        }
        requestAnimationFrame(autoscroll);
      })();
    }

    function note(msg) { try { Spicetify.showNotification(msg); } catch (err) {} }

    // flips the library to custom order so the move is visible
    function setcustomsort() {
      const root = libroot();
      const btn = root && [...root.querySelectorAll('button')].find((b) => /^(recents|recently added|recently played|alphabetical|creator|custom order)$/i.test((b.textContent || '').trim()));
      if (!btn || /custom order/i.test(btn.textContent)) return;
      btn.click();
      setTimeout(() => {
        const item = [...document.querySelectorAll('[role="menuitem"], [role="option"], [role="menu"] button, [role="menu"] li')]
          .find((n) => /^custom order$/i.test((n.textContent || '').trim()));
        if (item) item.click();
        else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      }, 120);
    }

    async function applymove(src, tgt) {
      const R = window.Spicetify && Spicetify.Platform && Spicetify.Platform.RootlistAPI;
      if (!R || !R.move) { note('Moving playlists is not available in this Spotify version'); return; }
      const loc = tgt.after ? { after: tgt.uri } : { before: tgt.uri };
      try {
        await R.move([src.uri], loc);
      } catch (err) {
        try { await R.move([{ uri: src.uri }], loc); } catch (err2) {
          console.warn('[viruzz] playlist move failed', err, err2);
          note('Could not move that playlist');
          return;
        }
      }
      note('Moved ' + src.name);
      setcustomsort();
    }

    document.addEventListener('pointerdown', (e) => {
      if (!settings.dragsort || e.button !== 0) return;
      const root = libroot();
      if (!root || !root.contains(e.target)) return;
      const inner = e.target.closest('button, input, [role="slider"]');
      if (inner && root.contains(inner) && !inner.matches(rowsel)) return;
      const row = e.target.closest(rowsel);
      const uri = playlisturi(row);
      if (!uri) return;
      const label = (row.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean)[0] || 'playlist';
      drag = { row, uri, name: label, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, on: false, tgt: null };
    }, true);

    // spotify's own drag would fight ours, so cancel it for the row we're tracking
    document.addEventListener('dragstart', (e) => { if (drag) e.preventDefault(); }, true);

    document.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.x = e.clientX; drag.y = e.clientY;
      if (!drag.on) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
        dragbegin();
      }
      drag.ghost.style.transform = 'translate(' + (e.clientX + 14) + 'px,' + (e.clientY + 10) + 'px)';
      drag.tgt = droptarget(e.clientX, e.clientY);
      if (drag.tgt) {
        const b = drag.tgt.b;
        drag.lane.style.display = '';
        drag.lane.style.width = Math.max(20, b.width - 12) + 'px';
        drag.lane.style.transform = 'translate(' + (b.left + 6) + 'px,' + ((drag.tgt.after ? b.bottom : b.top) - 1) + 'px)';
      } else {
        drag.lane.style.display = 'none';
      }
    }, true);

    document.addEventListener('pointerup', () => {
      if (!drag) return;
      const was = drag.on, src = { uri: drag.uri, name: drag.name }, tgt = drag.tgt;
      dragstop();
      if (!was) return;
      // the release would otherwise count as a click and open the playlist
      const eat = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      window.addEventListener('click', eat, true);
      setTimeout(() => window.removeEventListener('click', eat, true), 60);
      if (tgt) applymove(src, tgt);
    }, true);
    document.addEventListener('pointercancel', dragstop, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dragstop(); }, true);

    // waits for spotify to load before changing anything
    (function waitforapp() {
      if (document.querySelector('.Root, .Root__top-container, #main > div')) startwatching();
      else setTimeout(waitforapp, 300);
    })();
  }

  boot();
})();
