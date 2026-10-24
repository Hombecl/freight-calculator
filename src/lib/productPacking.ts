import {singleSkuPacking,verifySingleSkuPacking} from './singleSkuPacking';
export interface Dimensions { l:number; w:number; h:number; }
export interface PackedItem { x:number; y:number; z:number; l:number; w:number; h:number; colorType:number; }
export interface PackingScenario { baselineCount?:number; nameKey:string; descKey:string; dims:[number,number,number]; type:'standard'|'mixed'|'layered'|'optimized'; count:number; utilization:number; gaps:{l:number;w:number;h:number;isMixed?:boolean}; items:PackedItem[]; }
export const calculatePackingScenarios = (item: Dimensions, space: Dimensions): PackingScenario[] => {
  // Use Inner Dimensions for the space available
  const { l: cL, w: cW, h: cH } = space;

  if (item.l <= 0 || item.w <= 0 || item.h <= 0 || cL <= 0 || cW <= 0 || cH <= 0) return [];

  const candidates: PackingScenario[] = [];
  const itemVol = item.l * item.w * item.h;
  const spaceVol = cL * cW * cH;

  // Helper: Create a box item definition
  const createItem = (x: number, y: number, z: number, dim: [number, number, number], colorType: number): PackedItem => ({ x, y, z, l: dim[0], w: dim[1], h: dim[2], colorType });

  const orientations: [number, number, number][] = [
    [item.l, item.w, item.h], [item.l, item.h, item.w],
    [item.w, item.l, item.h], [item.w, item.h, item.l],
    [item.h, item.l, item.w], [item.h, item.w, item.l]
  ];

  // 1. SCENARIO A: Standard Orientations
  orientations.forEach((dims) => {
    const cols = Math.floor(cL / dims[0]);
    const rows = Math.floor(cW / dims[1]);
    const layers = Math.floor(cH / dims[2]);
    const count = cols * rows * layers;

    if (count > 0) {
      const items: PackedItem[] = [];
      for (let z = 0; z < layers; z++) {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            items.push(createItem(x * dims[0], y * dims[1], z * dims[2], dims, 0));
          }
        }
      }

      const usedL = cols * dims[0];
      const usedW = rows * dims[1];
      const usedH = layers * dims[2];

      candidates.push({
        nameKey: "scenarioStandard",
        descKey: "descStandard",
        dims: dims,
        type: 'standard',
        count,
        utilization: (count * itemVol / spaceVol) * 100,
        gaps: { l: cL - usedL, w: cW - usedW, h: cH - usedH },
        items
      });
    }
  });

  // 2. SCENARIO B: Mixed (Gap Filling)
  let bestMixed: Partial<PackingScenario> & { count: number } = { count: 0 };

  orientations.forEach((dims) => {
    const cols = Math.floor(cL / dims[0]);
    const rows = Math.floor(cW / dims[1]);
    const layers = Math.floor(cH / dims[2]);

    const currentItems: PackedItem[] = [];
    for (let z = 0; z < layers; z++) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          currentItems.push(createItem(x * dims[0], y * dims[1], z * dims[2], dims, 0));
        }
      }
    }

    const usedL = cols * dims[0];
    const remainL = cL - usedL;
    let gapItemsL: PackedItem[] = [];

    if (remainL > 0) {
        const gapOrientations = orientations.filter(d => d[0] <= remainL);
        let bestGapCount = 0;

        gapOrientations.forEach(gDims => {
             const gCols = Math.floor(remainL / gDims[0]);
             const gRows = Math.floor(cW / gDims[1]);
             const gLayers = Math.floor(cH / gDims[2]);
             const gCount = gCols * gRows * gLayers;

             if (gCount > bestGapCount) {
                 bestGapCount = gCount;
                 gapItemsL = [];
                 for (let z = 0; z < gLayers; z++) {
                    for (let y = 0; y < gRows; y++) {
                        for (let x = 0; x < gCols; x++) {
                            gapItemsL.push(createItem(usedL + (x * gDims[0]), y * gDims[1], z * gDims[2], gDims, 1));
                        }
                    }
                 }
             }
        });
        if (gapItemsL.length === 0) gapItemsL = [];
    }

    const totalCount = (cols * rows * layers) + gapItemsL.length;
    if (totalCount > bestMixed.count && gapItemsL.length > 0) {
        bestMixed = {
            nameKey: "scenarioMixed",
            descKey: "descMixed",
            dims: dims,
            type: 'mixed',
            count: totalCount,
            utilization: (totalCount * itemVol / spaceVol) * 100,
            gaps: { l: 0, w: 0, h: 0, isMixed: true },
            items: [...currentItems, ...gapItemsL]
        };
    }
  });
  if (bestMixed.count > 0) candidates.push(bestMixed as PackingScenario);


  // 3. SCENARIO C: Mixed Layers
  let bestLayered: Partial<PackingScenario> & { count: number } = { count: 0 };
  const standingDims = orientations.reduce((prev, curr) => curr[2] > prev[2] ? curr : prev, [0,0,0] as [number, number, number]);
  const flatDims = orientations.reduce((prev, curr) => curr[2] < prev[2] ? curr : prev, [999,999,999] as [number, number, number]);

  if (standingDims[2] !== flatDims[2]) {
      const standingLayers = Math.floor(cH / standingDims[2]);
      for (let i = 1; i <= standingLayers; i++) {
          const hUsed = i * standingDims[2];
          const hRemain = cH - hUsed;

          const sCols = Math.floor(cL / standingDims[0]);
          const sRows = Math.floor(cW / standingDims[1]);
          const sCount = sCols * sRows * i;

          const fLayers = Math.floor(hRemain / flatDims[2]);
          const fCols = Math.floor(cL / flatDims[0]);
          const fRows = Math.floor(cW / flatDims[1]);
          const fCount = fCols * fRows * fLayers;

          const total = sCount + fCount;

          if (total > bestLayered.count) {
              const items: PackedItem[] = [];
              for (let z = 0; z < i; z++) {
                  for (let y = 0; y < sRows; y++) {
                      for (let x = 0; x < sCols; x++) {
                          items.push(createItem(x * standingDims[0], y * standingDims[1], z * standingDims[2], standingDims, 0));
                      }
                  }
              }
              for (let z = 0; z < fLayers; z++) {
                  for (let y = 0; y < fRows; y++) {
                      for (let x = 0; x < fCols; x++) {
                          items.push(createItem(x * flatDims[0], y * flatDims[1], hUsed + (z * flatDims[2]), flatDims, 2));
                      }
                  }
              }
              bestLayered = {
                  nameKey: "scenarioLayered",
                  descKey: "descLayered",
                  dims: standingDims,
                  type: 'layered',
                  count: total,
                  utilization: (total * itemVol / spaceVol) * 100,
                  gaps: { l: 0, w: 0, h: 0, isMixed: true },
                  items: items
              };
          }
      }
  }
  if (bestLayered.count > 0) candidates.push(bestLayered as PackingScenario);

  // Sort Logic: Count DESC, then Utilization DESC
  candidates.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.utilization - a.utilization;
  });

  // Filter Logic
  const finalScenarios: PackingScenario[] = [];
  const seenKeys = new Set<string>();

  const addIfUnique = (sc: PackingScenario) => {
      const key = `${sc.type}-${sc.count}-${sc.utilization.toFixed(2)}`;
      if (!seenKeys.has(key)) {
          finalScenarios.push(sc);
          seenKeys.add(key);
      }
  };

  // Keep Best of All + Best of Specific Types
  if(candidates.length > 0) addIfUnique(candidates[0]);

  const bestM = candidates.find(c => c.type === 'mixed');
  if (bestM) addIfUnique(bestM);

  const bestL = candidates.find(c => c.type === 'layered');
  if (bestL) addIfUnique(bestL);

  // Fill remaining slots
  candidates.filter(c => c.type === 'standard').forEach(c => {
      if(finalScenarios.length < 3) addIfUnique(c);
  });

  finalScenarios.sort((a, b) => b.count - a.count);

  return finalScenarios.slice(0, 3);
};



// Cache geometry only: weight/currency calculations remain live in the UI.
const cache = new Map<string, PackingScenario[]>();
export function productPackingScenarios(item:Dimensions, space:Dimensions):PackingScenario[] {
 const values=[item.l,item.w,item.h,space.l,space.w,space.h];
 if(!values.every(v=>Number.isFinite(v)&&v>0))return [];
 const key=values.join(':');const cached=cache.get(key);if(cached)return cached;
 const baseline=calculatePackingScenarios(item,space);
 const upper=Math.floor((space.l*space.w*space.h)/(item.l*item.w*item.h)+1e-8);
 let result=baseline;
 // Bounded single-product search. Retain the baseline outside this budget.
 if(upper>0 && upper<=2000 && upper>(baseline[0]?.count??0)) {
  const spec={...item,id:'product',label:'Product',qty:upper,weight:1,color:0x60a5fa};
  const boxes=singleSkuPacking(space,spec);
  if(boxes.length>(baseline[0]?.count??0) && verifySingleSkuPacking(boxes,space,spec)) {
   const first=boxes[0];
   const improved:PackingScenario={baselineCount:baseline[0]?.count??0,nameKey:'scenarioOptimized',descKey:'descOptimized',type:'optimized',dims:[first.l,first.w,first.h],count:boxes.length,utilization:100*boxes.length*item.l*item.w*item.h/(space.l*space.w*space.h),gaps:{l:0,w:0,h:0,isMixed:true},items:boxes.map(b=>({x:b.px,y:b.pz,z:b.py,l:b.l,w:b.w,h:b.h,colorType:b.l===first.l&&b.w===first.w&&b.h===first.h?0:1}))};
   result=[improved,...baseline].slice(0,3);
  }
 }
 if(cache.size>=32)cache.delete(cache.keys().next().value!);
 cache.set(key,result);return result;
}
