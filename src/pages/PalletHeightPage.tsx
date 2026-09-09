import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  Box,
  Code2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  PALLET_EXAMPLE,
  PALLET_COLORS,
  PALLET_LIMITS,
  type PalletEstimate,
  type PalletRequest,
} from "../lib/palletEstimate";
import PalletEstimateView from "../components/PalletEstimateView";
import { parsePalletTable } from "../lib/palletImport";
import { track } from "../lib/track";

function inputError(message: string, zh: boolean): string {
  const labels: Record<string, string[]> = {
    l: ["length", "長度"],
    w: ["width", "寬度"],
    h: ["height", "高度"],
    qty: ["quantity", "數量"],
    weight: ["weight per carton", "每箱重量"],
    baseHeight: ["base height", "底座高度"],
    maxHeight: ["maximum loaded height", "連底座最高高度"],
    maxWeight: ["cargo weight limit", "貨物載重上限"],
    label: ["name", "名稱"],
  };
  const match = message.match(/^(?:items\[(\d+)\]|(pallet))\.(\w+): (.*)$/);
  if (!match) return message;
  const field = labels[match[3]]?.[zh ? 1 : 0] ?? match[3];
  const owner = match[2]
    ? zh
      ? "卡板"
      : "Pallet"
    : zh
    ? `紙箱 ${Number(match[1]) + 1}`
    : `Carton ${Number(match[1]) + 1}`;
  let detail = match[4];
  if (zh)
    detail = detail
      .replace("must be a whole number from", "請輸入整數，範圍")
      .replace("must be a number from", "請輸入數字，範圍")
      .replace(" to ", " 至 ")
      .replace("must exceed the pallet base height", "必須高於底座高度")
      .replace("provide a name of 1–60 characters", "請輸入 1 至 60 字元名稱");
  return `${owner} — ${field}: ${detail}`;
}

const cloneExample = () => structuredClone(PALLET_EXAMPLE);
const inputStyle =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
const buttonStyle =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-blue-600 disabled:opacity-40";
export default function PalletHeightPage() {
  const { lang } = useApp();
  const zh = lang === "zh";
  const T = (en: string, chinese: string) => (zh ? chinese : en);
  const [request, setRequest] = useState<PalletRequest>(cloneExample);
  const [result, setResult] = useState<PalletEstimate | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [customFootprint, setCustomFootprint] = useState(false);
  const [paste, setPaste] = useState("");
  const [pasteMessage, setPasteMessage] = useState("");
  const [copied, setCopied] = useState("");
  const [apiStatus, setApiStatus] = useState("");
  const [apiBusy, setApiBusy] = useState(false);
  const worker = useRef<Worker>();
  const sequence = useRef(0);
  const controller = useRef<AbortController>();
  useEffect(() => {
    const w = new Worker(
      new URL("../workers/palletEstimate.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.current = w;
    w.onmessage = ({ data }) => {
      if (data.id !== sequence.current) return;
      setBusy(false);
      setError(data.error ? inputError(data.error, zh) : "");
      setResult(data.result ?? null);
    };
    w.onerror = () => {
      setBusy(false);
      setError(
        T(
          "The calculation stopped. Reload this page to try again.",
          "計算已停止，請重新載入頁面。"
        )
      );
    };
    return () => {
      w.terminate();
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    const id = ++sequence.current;
    setBusy(true);
    setError("");
    setResult(null);
    setApiStatus("");
    controller.current?.abort();
    const timer = setTimeout(
      () => worker.current?.postMessage({ id, request }),
      180
    );
    return () => clearTimeout(timer);
  }, [request]);
  const changePallet = (key: keyof PalletRequest["pallet"], value: number) =>
    setRequest((r) => ({ ...r, pallet: { ...r.pallet, [key]: value } }));
  const changeItem = (
    i: number,
    patch: Partial<PalletRequest["items"][number]>
  ) =>
    setRequest((r) => ({
      ...r,
      items: r.items.map((it, j) => (i === j ? { ...it, ...patch } : it)),
    }));
  const safeNumber = (value: string) => (value === "" ? NaN : Number(value));
  const display = (value: number) => (Number.isFinite(value) ? value : "");
  const download = (data: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    track("pallet_height_export", type === "application/json" ? "json" : "csv");
  };
  const csv = () => {
    if (!result) return;
    // Neutralize spreadsheet formulas as well as escaping CSV delimiters.
    const cell = (v: unknown) =>
      `"${String(v)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replace(/"/g, '""')}"`;
    const rows = [
      [
        "Carton",
        "Length cm",
        "Width cm",
        "Height cm",
        "X cm",
        "Y above deck cm",
        "Z cm",
        "Weight kg",
      ],
      ...result.boxes.map((b) => [
        b.label,
        b.l,
        b.w,
        b.h,
        b.px,
        b.py,
        b.pz,
        b.weight,
      ]),
    ];
    download(
      rows.map((row) => row.map(cell).join(",")).join("\r\n"),
      "pallet-placements.csv",
      "text/csv"
    );
  };
  const curl = `curl -X POST https://www.dimpack3d.com/api/pallet-estimate \\\n  -H 'Content-Type: application/json' \\\n  --data-binary @pallet-request.json`;
  async function verifyApi() {
    const id = sequence.current;
    const abort = new AbortController();
    controller.current = abort;
    setApiBusy(true);
    setApiStatus("");
    const timer = setTimeout(() => abort.abort(), 15000);
    try {
      const response = await fetch("/api/pallet-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: abort.signal,
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          T("The API is not available on this preview.", "此預覽暫未提供 API。")
        );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || `HTTP ${response.status}`);
      if (id === sequence.current) {
        const matches =
          result &&
          data.loadedHeight === result.loadedHeight &&
          data.placedCount === result.placedCount &&
          JSON.stringify(data.boxes) === JSON.stringify(result.boxes);
        setApiStatus(
          matches
            ? T("Server result matches this plan.", "伺服器結果與此方案一致。")
            : T(
                "Server result differs. Check the deployed API version before integrating.",
                "伺服器結果不同，整合前請核對 API 版本。"
              )
        );
        track("pallet_height_api_check", matches ? "match" : "mismatch");
      }
    } catch (e) {
      if (id === sequence.current)
        setApiStatus(
          e instanceof Error && e.name !== "AbortError"
            ? e.message
            : T("Request timed out. Please try again.", "請求逾時，請重試。")
        );
    } finally {
      clearTimeout(timer);
      setApiBusy(false);
    }
  }
  return (
    <div className="max-w-7xl mx-auto px-1 sm:px-4 py-5 sm:py-8">
      <Helmet>
        <title>
          {T(
            "Pallet Height Calculator — Mixed Cartons & 3D Estimate",
            "卡板高度計算器 — 混合紙箱與 3D 擺位"
          )}{" "}
          | DimPack3D
        </title>
        <meta
          name="description"
          content={T(
            "Estimate loaded pallet height from mixed carton sizes, quantities and weights. See the actual 3D arrangement, unplaced cartons and payload checks. Free calculator and REST API.",
            "輸入混合箱型、數量與重量，估算連底座卡板高度。查看 3D 擺位、未放入紙箱與載重檢查，附免費 REST API。"
          )}
        />
      </Helmet>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <p className="text-sm font-bold tracking-wide text-blue-600 mb-2">
            {T("ORDER → PALLET", "訂單 → 卡板")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            {T("How tall will your pallet be?", "這批貨，卡板會有多高？")}
          </h1>
          <p className="mt-3 text-slate-600 max-w-2xl">
            {T(
              "Add your cartons. See a possible arrangement, loaded height and whether the whole order fits.",
              "輸入紙箱資料，查看可行擺位、連底座高度，以及整批訂單能否放入。"
            )}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 text-sm font-semibold">
          {T("Free beta · no signup", "免費 Beta · 免註冊")}
        </span>
      </div>
      {result && !busy && (
        <a
          href="#pallet-result"
          className="lg:hidden flex justify-between gap-3 items-center bg-slate-900 text-white rounded-xl p-4 mb-4"
        >
          <span>
            <b className="text-2xl">{result.loadedHeight} cm</b>
            <span className="block text-sm text-slate-300">
              {T("Including pallet base", "包含卡板底座")} ·{" "}
              {result.placedCount}/{result.requestedCount} {T("cartons", "箱")}
            </span>
          </span>
          <span className="text-sm">{T("View plan ↓", "查看方案 ↓")}</span>
        </a>
      )}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-6 items-start">
        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {T("1. Set the pallet limits", "1. 設定卡板限制")}
              </h2>
              <span className="text-sm text-slate-500">cm / kg</span>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-4">
              {T("Pallet footprint", "卡板底面")}
              <select
                className={`${inputStyle} mt-1.5`}
                aria-label={T("Pallet footprint", "卡板底面")}
                value={
                  customFootprint ||
                  !["120x80", "121.92x101.6", "120x100"].includes(
                    `${request.pallet.l}x${request.pallet.w}`
                  )
                    ? "custom"
                    : `${request.pallet.l}x${request.pallet.w}`
                }
                onChange={(e) => {
                  setCustomFootprint(e.target.value === "custom");
                  if (e.target.value === "custom") return;
                  const [l, w] = e.target.value.split("x").map(Number);
                  setRequest((r) => ({ ...r, pallet: { ...r.pallet, l, w } }));
                }}
              >
                <option value="120x80">EUR · 120 × 80 cm</option>
                <option value="121.92x101.6">GMA · 48 × 40 in</option>
                <option value="120x100">120 × 100 cm</option>
                <option value="custom">
                  {T("Custom dimensions", "自訂尺寸")}
                </option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["l", "Length (cm)", "長度 (cm)"],
                  ["w", "Width (cm)", "寬度 (cm)"],
                  ["baseHeight", "Pallet base height (cm)", "底座高度 (cm)"],
                  [
                    "maxHeight",
                    "Maximum loaded height (cm)",
                    "連底座最高高度 (cm)",
                  ],
                  ["maxWeight", "Cargo weight limit (kg)", "貨物載重上限 (kg)"],
                ] as const
              ).map(([key, en, chinese]) => (
                <label key={key} className="text-sm font-medium text-slate-700">
                  {T(en, chinese)}
                  <input
                    type="number"
                    step="any"
                    min={key === "baseHeight" ? 0 : 0.01}
                    className={`${inputStyle} mt-1.5`}
                    value={display(request.pallet[key])}
                    onChange={(e) =>
                      changePallet(key, safeNumber(e.target.value))
                    }
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {T(
                "Height includes the base. Weight limit is for cargo only. Confirm your pallet’s rating.",
                "高度包含底座；載重上限只計貨物。請核實卡板額定載重。"
              )}
            </p>
          </section>
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <div className="flex justify-between items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {T("2. Add the order", "2. 輸入訂單")}
              </h2>
              <button
                className="text-sm text-blue-700 flex items-center gap-1"
                onClick={() => {
                  setRequest(cloneExample());
                  setCustomFootprint(false);
                  track("pallet_height_example");
                }}
              >
                <RotateCcw size={14} />
                {T("Load example", "載入範例")}
              </button>
            </div>
            <details className="mb-5 rounded-lg bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-blue-700">
                {T("Paste rows from Excel or CSV", "貼上 Excel 或 CSV 資料")}
              </summary>
              <p className="text-sm text-slate-500 mt-2">
                {T(
                  "Columns: name, length, width, height, kg/carton, quantity. cm/kg; tab or comma separated. Header optional. Imported cartons stay upright; review stacking rules below. Replaces the current carton list.",
                  "欄位：名稱、長、寬、高、每箱 kg、數量。cm/kg；Tab 或逗號分隔，可附標題列。匯入後預設保持直立，請核對堆疊規則。將取代目前紙箱清單。"
                )}
              </p>
              <textarea
                aria-label={T("Paste carton rows", "貼上紙箱資料")}
                className={`${inputStyle} mt-3 font-mono`}
                rows={4}
                maxLength={32768}
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={"Carton A,60,40,30,8,12\nCarton B,40,30,20,4,8"}
              />
              <button
                className={`${buttonStyle} mt-2`}
                onClick={() => {
                  try {
                    const next = parsePalletTable(paste, request.pallet, zh);
                    setRequest(next);
                    setPasteMessage(
                      T(
                        `Imported ${next.items.length} carton type(s).`,
                        `已匯入 ${next.items.length} 種箱型。`
                      )
                    );
                    track("pallet_height_import");
                  } catch (e) {
                    setPasteMessage(
                      e instanceof Error
                        ? e.message
                        : T("Check the pasted rows.", "請核對貼上的資料。")
                    );
                  }
                }}
              >
                {T("Use these cartons", "使用這批紙箱")}
              </button>
              <p role="status" className="text-sm mt-2 text-slate-600">
                {pasteMessage}
              </p>
            </details>
            <div className="space-y-4">
              {request.items.map((it, i) => (
                <fieldset
                  key={i}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <legend className="px-2 text-sm font-semibold text-slate-500">
                    {T("Carton type", "箱型")} {i + 1}
                  </legend>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        background: `#${PALLET_COLORS[i % PALLET_COLORS.length]
                          .toString(16)
                          .padStart(6, "0")}`,
                      }}
                    />
                    <input
                      aria-label={`${T("Carton name", "紙箱名稱")} ${i + 1}`}
                      maxLength={60}
                      className={inputStyle}
                      value={it.label}
                      onChange={(e) => changeItem(i, { label: e.target.value })}
                    />
                    <button
                      aria-label={`${T("Remove carton type", "刪除箱型")} ${
                        i + 1
                      }`}
                      className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      disabled={request.items.length === 1}
                      onClick={() =>
                        setRequest((r) => ({
                          ...r,
                          items: r.items.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["l", "w", "h", "qty", "weight"] as const).map((key) => (
                      <label key={key} className="text-sm text-slate-600">
                        {
                          {
                            l: T("Length", "長"),
                            w: T("Width", "寬"),
                            h: T("Height", "高"),
                            qty: T("Quantity", "數量"),
                            weight: T("kg / carton", "kg / 箱"),
                          }[key]
                        }
                        <input
                          aria-label={`${T("Carton", "紙箱")} ${i + 1} ${key}`}
                          type="number"
                          min={key === "qty" ? 1 : 0.01}
                          step={key === "qty" ? 1 : "any"}
                          className={`${inputStyle} mt-1`}
                          value={display(it[key])}
                          onChange={(e) =>
                            changeItem(i, { [key]: safeNumber(e.target.value) })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-3 mt-4 text-sm text-slate-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={it.keepUpright}
                        onChange={(e) =>
                          changeItem(i, { keepUpright: e.target.checked })
                        }
                        className="accent-blue-600 w-4 h-4"
                      />
                      {T("Keep upright", "保持直立")}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={it.maxStack === 0}
                        onChange={(e) =>
                          changeItem(i, {
                            maxStack: e.target.checked ? 0 : undefined,
                          })
                        }
                        className="accent-blue-600 w-4 h-4"
                      />
                      {T("Nothing on top", "頂部不可承重")}
                    </label>
                  </div>
                </fieldset>
              ))}
            </div>
            <button
              disabled={request.items.length >= PALLET_LIMITS.types}
              onClick={() =>
                setRequest((r) => ({
                  ...r,
                  items: [
                    ...r.items,
                    {
                      label: T(
                        `Carton ${r.items.length + 1}`,
                        `紙箱 ${r.items.length + 1}`
                      ),
                      l: 40,
                      w: 30,
                      h: 20,
                      qty: 1,
                      weight: 4,
                      keepUpright: true,
                    },
                  ],
                }))
              }
              className={`${buttonStyle} w-full mt-4 border-dashed`}
            >
              <Plus size={16} />
              {T("Add another carton size", "新增箱型")}
            </button>
            <p className="text-sm text-slate-500 mt-3">
              {T(
                "Up to 20 carton types / 200 cartons. Calculated on your device.",
                "最多 20 種箱型 / 200 箱。在你的裝置上計算。"
              )}
            </p>
          </section>
        </div>
        <div
          id="pallet-result"
          className="lg:sticky lg:top-5 space-y-4 scroll-mt-20"
          aria-busy={busy}
        >
          {busy && (
            <div
              role="status"
              className="bg-white rounded-2xl border p-8 text-slate-600 flex items-center gap-3"
            >
              <Box className="animate-pulse" />
              {T(
                "Comparing three packing approaches…",
                "正在比較三種擺放方法…"
              )}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900"
            >
              <h2 className="font-bold mb-2">
                {T("Check the order details", "請核對訂單資料")}
              </h2>
              <p className="text-sm break-words">{error}</p>
            </div>
          )}
          {result && !busy && (
            <>
              <section
                className="rounded-2xl bg-slate-900 text-white p-6"
                aria-live="polite"
              >
                <div className="flex justify-between gap-3 items-start">
                  <p className="text-sm text-slate-300">
                    {result.status === "complete"
                      ? T("Estimated loaded height", "估算連底座高度")
                      : T(
                          "Height of the cartons placed",
                          "已放入紙箱的連底座高度"
                        )}
                  </p>
                  <span
                    className={`text-sm px-2.5 py-1 rounded-full ${
                      result.status === "complete"
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-amber-400/15 text-amber-300"
                    }`}
                  >
                    {result.status === "complete"
                      ? T("Whole order fits", "整批可放入")
                      : T("Partial load", "只放入部分")}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <strong className="text-6xl font-black tracking-tight tabular-nums">
                    {result.loadedHeight.toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    })}
                  </strong>
                  <span className="text-xl text-slate-300">cm</span>
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  {result.cargoHeight} cm {T("cargo", "貨物")} +{" "}
                  {result.pallet.baseHeight} cm {T("pallet base", "卡板底座")}
                </p>
                <div className="grid grid-cols-3 gap-3 border-t border-white/15 mt-5 pt-4">
                  {[
                    [
                      `${result.placedCount}/${result.requestedCount}`,
                      T("cartons placed", "已放入箱數"),
                    ],
                    [`${result.cargoWeight} kg`, T("cargo weight", "貨物重量")],
                    [
                      `${result.remainingHeight} cm`,
                      T("height remaining", "剩餘高度"),
                    ],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <p className="font-bold text-lg tabular-nums">{value}</p>
                      <p className="text-sm text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </section>
              {result.unplacedCount > 0 && (
                <div
                  role="status"
                  className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900 text-sm"
                >
                  <b>
                    {result.unplacedCount}{" "}
                    {T("cartons remain outside this plan.", "箱未放入此方案。")}
                  </b>{" "}
                  {T(
                    "This height does not represent the full order. Try a larger footprint or adjust the limits; no-fit by this heuristic is not proof that packing is impossible.",
                    "此高度不代表整批訂單。可嘗試較大板面或調整限制；本算法未能放入不等於不存在可行擺法。"
                  )}
                </div>
              )}
              <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                <PalletEstimateView result={result} zh={zh} />
              </section>
              <div className="flex flex-wrap gap-2">
                <button className={buttonStyle} onClick={csv}>
                  <ArrowDownToLine size={16} />
                  {T("Placement CSV", "擺位 CSV")}
                </button>
                <button
                  className={buttonStyle}
                  onClick={() =>
                    download(
                      JSON.stringify(result, null, 2),
                      "pallet-estimate.json",
                      "application/json"
                    )
                  }
                >
                  <Code2 size={16} />
                  {T("Result JSON", "結果 JSON")}
                </button>
              </div>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-bold mb-3">
                  {T("Order check", "訂單核對")}
                </h2>
                <ul className="space-y-2 text-sm">
                  {result.byItem.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3">
                      <span className="truncate">{it.label}</span>
                      <span
                        className={
                          it.remaining ? "text-amber-700" : "text-emerald-700"
                        }
                      >
                        {it.placed}/{it.requested} {T("placed", "已放入")}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-slate-500">
                  {T(
                    "Best result from three packing approaches, not a proven minimum. Checks geometry, payload, upright rules and 60% base support; it does not certify transport stability or carton strength.",
                    "比較三種擺法得出的估算，並非已證明的最低高度。檢查幾何、載重、直立及 60% 底部支承；不保證運輸穩定性或紙箱強度。"
                  )}
                </p>
              </section>
            </>
          )}
        </div>
      </div>
      <section
        id="api"
        className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 sm:p-7"
      >
        <div className="flex items-start gap-3">
          <Code2 className="text-blue-600 shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {T(
                "Put this estimate into your order workflow",
                "將估算整合至訂單流程"
              )}
            </h2>
            <p className="text-slate-600 mt-2">
              {T(
                "The API accepts the same carton details and returns height, placements and any unplaced items. Try your current order below.",
                "API 接收相同紙箱資料，回傳高度、擺位及未放入數量。可用目前訂單測試。"
              )}
            </p>
          </div>
        </div>
        <details className="mt-5">
          <summary className="cursor-pointer text-blue-700 font-semibold py-2">
            {T("Developer quickstart", "開發者快速入門")}
          </summary>
          <p className="text-sm text-slate-600 my-3">
            {T(
              "Download the request file, then run this command. The server check sends your current carton details to DimPack3D.",
              "下載請求檔案後執行指令。「伺服器核對」會將目前紙箱資料傳至 DimPack3D。"
            )}
          </p>
          <pre className="bg-slate-950 text-slate-100 rounded-xl p-4 text-sm overflow-x-auto">
            <code>{curl}</code>
          </pre>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              disabled={!result || busy}
              className={buttonStyle}
              onClick={() =>
                download(
                  JSON.stringify(request, null, 2),
                  "pallet-request.json",
                  "application/json"
                )
              }
            >
              {T("Download request JSON", "下載請求 JSON")}
            </button>
            <button
              className={buttonStyle}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(curl);
                  setCopied(T("Copied", "已複製"));
                } catch {
                  setCopied(
                    T(
                      "Select the command above to copy it.",
                      "請選取上方指令複製。"
                    )
                  );
                }
              }}
            >
              {copied || T("Copy command", "複製指令")}
            </button>
            <button
              disabled={!result || busy || apiBusy}
              className={buttonStyle}
              onClick={verifyApi}
            >
              {apiBusy
                ? T("Checking…", "核對中…")
                : T("Check with server", "伺服器核對")}
            </button>
          </div>
          <p role="status" className="text-sm mt-3 text-blue-900">
            {apiStatus}
          </p>
          <Link
            className="text-blue-700 text-sm underline"
            to="/api-docs#pallet-height"
          >
            {T("API fields and limits", "API 欄位與限制")}
          </Link>
        </details>
        <div className="mt-5 pt-5 border-t border-blue-100 flex flex-wrap justify-between items-center gap-4">
          <p className="text-sm text-slate-600">
            {T(
              "Need batch orders, larger loads or help integrating? Tell us your order volume and constraints.",
              "需要批次訂單、更大貨量或整合支援？歡迎告訴我們訂單量與限制。"
            )}
          </p>
          <a
            onClick={() => track("pallet_height_contact")}
            href="mailto:hello@dimpack3d.com?subject=Pallet%20planning%20API%20pilot"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"
          >
            {T("Discuss a business pilot", "商討企業試用")}
            <ArrowRight size={16} />
          </a>
        </div>
      </section>
      <section className="mt-8 grid md:grid-cols-2 gap-6 text-slate-600">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {T("How is pallet height calculated?", "如何計算卡板高度？")}
          </h2>
          <p>
            {T(
              "We place the individual cartons within your footprint and height limit, then measure the top of the highest carton and add the base height. Mixed sizes and rotation affect the arrangement. Dividing volume by pallet area alone cannot give a buildable plan.",
              "先按板面與高度限制放置每個紙箱，再取最高紙箱頂部高度，加上底座。混合尺寸及旋轉會影響擺位；單以體積除以板面面積並不能得到實際可砌方案。"
            )}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {T("Quoting or loading?", "報價還是裝貨？")}
          </h2>
          <p>
            {T(
              "Use this as a planning estimate and confirm the build with your warehouse. Same-size cartons only? The pallet calculator shows simple layer counts. Need to adjust a mixed container load by hand? Open the full planner.",
              "可用作規劃估算，再與倉庫確認。只有同尺寸紙箱？卡板計算器可顯示簡單層數。需要手動調整混合貨櫃？請使用完整規劃器。"
            )}
          </p>
          <div className="mt-3 flex gap-4">
            <Link className="text-blue-700 underline" to="/pallet-calculator">
              {T("Cartons per pallet", "每板箱數")}
            </Link>
            <Link className="text-blue-700 underline" to="/planner">
              {T("Load planner", "裝載規劃器")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
