import { parseDelimited } from "./importCartons";
import { parsePalletRequest, type PalletRequest } from "./palletEstimate";
const HEADERS = [
  ["name", "label", "carton", "sku", "名稱", "箱型"],
  ["l", "length", "length (cm)", "長", "長度"],
  ["w", "width", "width (cm)", "寬", "寬度"],
  ["h", "height", "height (cm)", "高", "高度"],
  ["weight", "kg", "kg/carton", "重量", "每箱重量"],
  ["qty", "quantity", "數量", "箱數"],
];
/** Never infer a header from the label alone: an item may actually be named SKU. */
export function parsePalletTable(
  text: string,
  pallet: PalletRequest["pallet"],
  zh = false
): PalletRequest {
  let rows = parseDelimited(text);
  if (
    rows[0]?.length === 6 &&
    rows[0].every((cell, i) => HEADERS[i].includes(cell.trim().toLowerCase()))
  )
    rows = rows.slice(1);
  const items = rows.map((row, i) => {
    if (row.length !== 6)
      throw new Error(
        zh
          ? `第 ${i + 1} 列需要六個欄位。`
          : `Row ${i + 1}: expected six columns.`
      );
    return {
      label: row[0],
      l: Number(row[1]),
      w: Number(row[2]),
      h: Number(row[3]),
      weight: Number(row[4]),
      qty: Number(row[5]),
      keepUpright: true,
    };
  });
  return parsePalletRequest({ pallet, items });
}
