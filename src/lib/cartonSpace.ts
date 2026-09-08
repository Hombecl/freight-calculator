export function cartonSpace(carton: number[], product: number[], quantity: number) {
  if (carton.length !== 3 || product.length !== 3 || ![...carton, ...product].every(v => Number.isFinite(v) && v >= .01 && v <= 10000) ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 1e7) throw new Error('invalid-input');
  const [a, b, c] = product;
  const orientations = [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]];
  const layouts = orientations.map(dims => {
    const grid = dims.map((dim, i) => Math.floor(carton[i] / dim + 1e-10));
    return { dims, grid, count: grid[0] * grid[1] * grid[2] };
  });
  const best = layouts.reduce((a, b) => b.count > a.count ? b : a);
  const cartonVolume = carton.reduce((a,b) => a*b, 1);
  const productVolume = product.reduce((a,b) => a*b, 1) * quantity;
  return { best, cartonVolume, productVolume, fits: quantity <= best.count,
    fillPct: quantity <= best.count ? productVolume / cartonVolume * 100 : null,
    emptyLitres: quantity <= best.count ? (cartonVolume - productVolume) / 1000 : null };
}
