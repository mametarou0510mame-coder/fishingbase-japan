// 切り抜いた魚の写真を、墨で写した魚拓のような絵に変える（ブラウザの中だけで処理する）。
// うろこ・ひれの凹凸（明るさの細かい変化）を墨の濃さにし、ふちに墨がたまったような濃さと、紙のかすれを加える。

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const d = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / d;
      s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / d;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

// なめらかなノイズ（墨のむら）
function noise(w: number, h: number, cell: number, seed = 7): Float32Array {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  let s = seed;
  for (let i = 0; i < g.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    g[i] = s / 0x7fffffff;
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  return out;
}

export function inkify(img: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement {
  const w = (img as HTMLCanvasElement).width || (img as HTMLImageElement).naturalWidth;
  const h = (img as HTMLCanvasElement).height || (img as HTMLImageElement).naturalHeight;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sc = src.getContext("2d")!;
  sc.drawImage(img, 0, 0);
  const data = sc.getImageData(0, 0, w, h);
  const px = data.data;
  const g = new Float32Array(w * h), al = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    g[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
    al[i] = px[i * 4 + 3] / 255;
  }
  const r = Math.max(2, Math.round(w / 140));
  const blur = boxBlur(g, w, h, r);
  const blurWide = boxBlur(g, w, h, r * 4);
  const edge = boxBlur(al, w, h, Math.max(2, Math.round(w / 90)));
  const n1 = noise(w, h, Math.max(2, w / 260), 11), n2 = noise(w, h, Math.max(6, w / 40), 29);
  const out = sc.createImageData(w, h);
  const o = out.data;
  for (let i = 0; i < w * h; i++) {
    if (al[i] < 0.02) continue;
    const detail = g[i] - blur[i];
    const shade = blurWide[i];
    // 細かい凹凸は濃く、明るい面はかすれる
    let d = 0.58 - detail * 3.2 + (0.5 - shade) * 0.35;
    // ふちは墨がたまって濃く
    d += Math.max(0, 1 - edge[i]) * 0.55;
    // 墨のむら・紙のかすれ
    d *= 0.72 + 0.4 * n2[i];
    d -= (n1[i] - 0.5) * 0.35;
    d = Math.max(0, Math.min(1, d));
    d = Math.pow(d, 1.15);
    o[i * 4] = 18;
    o[i * 4 + 1] = 17;
    o[i * 4 + 2] = 16;
    o[i * 4 + 3] = Math.round(255 * d * al[i] * 0.95);
  }
  sc.putImageData(out, 0, 0);
  return src;
}
