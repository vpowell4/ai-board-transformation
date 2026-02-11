function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed = 1) {
  const base = Number.isFinite(seed) ? Math.floor(seed) : 1;
  const rng = mulberry32(base);
  return {
    unit() {
      return rng();
    },
    range(min, max) {
      return min + (max - min) * rng();
    },
    pick(list) {
      if (!Array.isArray(list) || list.length === 0) {
        return undefined;
      }
      const index = Math.floor(rng() * list.length);
      return list[index];
    },
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

