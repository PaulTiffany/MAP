(() => {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easings = {
    linear: t => t,
    smoothstep: t => t * t * (3 - 2 * t),
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  };

  function localProgress(p, start = 0, end = 1, easing = 'linear') {
    const raw = end === start ? (p >= end ? 1 : 0) : clamp((p - start) / (end - start));
    return (easings[easing] || easings.linear)(raw);
  }

  function catmull(points, p) {
    if (!points.length) return null;
    if (points.length === 1) return points[0];
    const n = points.length - 1;
    const u = clamp(p, 0, 0.999999) * n;
    const i = Math.floor(u), f = u - i;
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(n, i + 1)];
    const p3 = points[Math.min(n, i + 2)];
    const c = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    return [c(p0.x, p1.x, p2.x, p3.x), c(p0.y, p1.y, p2.y, p3.y), c(p0.scale, p1.scale, p2.scale, p3.scale)];
  }

  class AtlasChoreographer {
    constructor({ root = document, world, trails }) {
      this.root = root;
      this.world = world;
      this.trails = trails;
      this.objects = new Map();
      this.indexObjects();
    }

    indexObjects() {
      for (const [id, spec] of Object.entries(this.world.objects || {})) {
        const element = this.root.querySelector(spec.selector);
        if (element) this.objects.set(id, { element, spec });
      }
    }

    get(id) {
      return this.objects.get(id)?.element || null;
    }

    cameraAt(trailId, p) {
      const trail = this.trails.trails[trailId];
      if (!trail) return null;
      const points = trail.camera_path.map(k => ({ x: k.x, y: k.y, scale: k.scale }));
      return catmull(points, p);
    }

    chapterAt(trailId, p) {
      const trail = this.trails.trails[trailId];
      if (!trail) return null;
      return trail.chapters.find(ch => p >= ch.range[0] && p <= ch.range[1]) || trail.chapters.at(-1);
    }

    applyTrail(trailId, p) {
      const trail = this.trails.trails[trailId];
      if (!trail) return;
      for (const effect of trail.effects || []) this.applyEffect(effect, p);
    }

    applyEffect(effect, p) {
      const target = this.get(effect.target);
      if (!target) return;
      const t = localProgress(p, effect.start, effect.end, effect.easing);
      const from = effect.from ?? 0;
      const to = effect.to ?? 1;
      const value = lerp(from, to, t);

      switch (effect.channel) {
        case 'opacity':
          target.style.opacity = String(value);
          break;
        case 'attribute':
          if (effect.attribute) target.setAttribute(effect.attribute, String(value));
          break;
        case 'draw':
          target.style.strokeDasharray = '1';
          target.style.strokeDashoffset = String(1 - value);
          target.setAttribute('pathLength', '1');
          break;
        case 'follow_path': {
          const path = this.get(effect.path);
          if (!path || typeof path.getTotalLength !== 'function') break;
          try {
            const len = path.getTotalLength();
            const pt = path.getPointAtLength(len * value);
            target.setAttribute('cx', pt.x);
            target.setAttribute('cy', pt.y);
          } catch (_) {}
          break;
        }
        case 'scale':
          target.style.transformBox = 'fill-box';
          target.style.transformOrigin = 'center';
          target.style.transform = `scale(${value})`;
          break;
        case 'translate_x':
          target.style.transform = `translateX(${value}px)`;
          break;
        case 'translate_y':
          target.style.transform = `translateY(${value}px)`;
          break;
        case 'oscillate_x': {
          const cycles = effect.cycles ?? 1;
          const phase = (Math.sin(t * Math.PI * 2 * cycles) + 1) / 2;
          target.setAttribute('cx', String(lerp(from, to, phase)));
          break;
        }
        case 'visibility':
          target.style.display = t > 0 ? (effect.display || '') : 'none';
          break;
      }
    }
  }

  async function loadAtlasSpec(base = 'atlas') {
    const [world, trails] = await Promise.all([
      fetch(`${base}/world.json`).then(r => { if (!r.ok) throw new Error(`world.json ${r.status}`); return r.json(); }),
      fetch(`${base}/trails.json`).then(r => { if (!r.ok) throw new Error(`trails.json ${r.status}`); return r.json(); })
    ]);
    return { world, trails };
  }

  window.MAPAtlasEngine = { AtlasChoreographer, loadAtlasSpec, clamp, localProgress };
})();
