import type { BoxCatalogRequest } from './boxCatalog';
import { parseDelimited } from './importCartons';
export function importHistory(text: string): BoxCatalogRequest['orders'] {
    const rows = parseDelimited(text);
    if (rows[0]?.[0].toLowerCase() === 'orderid')
        rows.shift();
    const orders = new Map<string, Map<string, number>>();
    rows.forEach((r, i) => {
        if (r.length !== 3 || !r[0]?.trim() || !r[1]?.trim() || !Number.isInteger(Number(r[2])) || Number(r[2]) < 1)
            throw new Error(`History row ${i + 1}: orderId, sku, positive integer qty required`);
        const id = r[0].trim(), sku = r[1].trim(), lines = orders.get(id) ?? new Map<string, number>();
        lines.set(sku, (lines.get(sku) ?? 0) + Number(r[2]));
        orders.set(id, lines);
    });
    const shapes = new Map<string, BoxCatalogRequest['orders'][number]>();
    for (const [orderId, quantities] of orders) {
        const lines = [...quantities].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([sku, qty]) => ({ sku, qty })), key = JSON.stringify(lines);
        const shape = shapes.get(key);
        if (shape)
            shape.count = (shape.count ?? 1) + 1;
        else
            shapes.set(key, { orderId, lines, count: 1 });
    }
    return [...shapes.values()];
}
