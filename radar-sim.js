/* FIELD OPS 1.1 — fictional contacts only; no sensor/GPS inputs. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FieldOpsRadar = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TAU = Math.PI * 2, STEP = 1 / 60, PERIOD = 4, FADE = 3.2;
  const wrap = a => ((a % TAU) + TAU) % TAU;
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  function position(c, time) {
    const u = Math.max(0, Math.min(1, (time - c.born) / c.duration));
    const bend = Math.sin(Math.PI * u) * c.bend;
    return { x: c.ax + (c.bx - c.ax) * u + c.nx * bend,
      y: c.ay + (c.by - c.ay) * u + c.ny * bend };
  }
  function create(random = Math.random) {
    let time = 0, remainder = 0, serial = 0, nextEntry = 8 + random() * 5;
    let tracks = [], detections = [];
    function spawn(born) {
      const a = random() * TAU, b = a + 2.25 + random() * .55;
      const ax = 1.08 * Math.cos(a), ay = 1.08 * Math.sin(a);
      const bx = 1.08 * Math.cos(b), by = 1.08 * Math.sin(b);
      const length = Math.hypot(bx - ax, by - ay);
      const c = { id: ++serial, born, duration: 65 + random() * 30,
        ax, ay, bx, by, nx: -(by - ay) / length, ny: (bx - ax) / length,
        bend: (random() - .5) * .18, lastSeen: -Infinity };
      Object.assign(c, position(c, time)); tracks.push(c);
    }
    // Three already moving tracks; none is revealed before the first beam hit.
    [-10, -29, -48].forEach(spawn);
    function tick() {
      const previous = time, beam = wrap(previous * TAU / PERIOD - Math.PI / 2);
      time += STEP;
      for (const c of tracks) {
        const old = { x: c.x, y: c.y };
        const p = position(c, time); Object.assign(c, p);
        const a0 = Math.atan2(old.y, old.x), a1 = Math.atan2(p.y, p.x);
        const turn = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
        const travel = STEP * TAU / PERIOD - turn;
        const gap = wrap(a0 - beam);
        if (travel > 0 && gap <= travel && Math.hypot(p.x, p.y) <= 1) {
          c.lastSeen = previous + STEP * gap / travel;
          detections.push(c.id);
        }
      }
      // Only remove completed tracks outside the scope. IDs are never recycled.
      tracks = tracks.filter(c => time < c.born + c.duration || Math.hypot(c.x, c.y) <= 1);
      if (time >= nextEntry) {
        if (tracks.length < 6) spawn(time);
        nextEntry = time + 18 + random() * 10;
      }
    }
    function advance(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return;
      remainder += seconds;
      while (remainder + 1e-10 >= STEP) { tick(); remainder -= STEP; }
    }
    function contacts() {
      return tracks.map(c => {
        const radius = Math.hypot(c.x, c.y), age = time - c.lastSeen;
        const alpha = Number.isFinite(age) && age >= 0 && age < FADE
          ? smooth(age / .08) * (1 - smooth(age / FADE)) * smooth((1 - radius) / .055) : 0;
        return { id: c.id, x: c.x, y: c.y, radius, age, alpha,
          lastSeen: c.lastSeen, born: c.born, duration: c.duration };
      });
    }
    return { advance, contacts, drainDetections() { const result = detections; detections = []; return result; },
      get time() { return time; }, get angle() { return wrap(time * TAU / PERIOD - Math.PI / 2); } };
  }
  return { create, PERIOD, FADE };
});
