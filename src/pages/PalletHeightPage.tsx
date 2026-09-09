import { useEffect, useRef, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import {
  ArrowDownToLine,
  Box,
  Plus,
  Printer,
  Save,
  Trash2,
  ArrowRight,
} from "lucide-react";
import {
  PALLET_EXAMPLE,
  parsePalletRequest,
  type PalletRequest,
} from "../lib/palletEstimate";
import {
  ORDER_ENGINE,
  ORDER_LIMITS,
  orderFile,
  parseOrderFile,
  readOrderFile,
  buildSteps,
  csvCell,
  lengthFactor,
  weightFactor,
  FOOTPRINTS,
  type UnitSystem,
  type OrderFile,
  type OrderPlan,
  type compareOrders,
} from "../lib/orderPlanning";
import {
  ORDER_COPY,
  ORDER_LANGUAGES,
  LANGUAGE_NAMES,
  orderHref,
  orderLanguage,
  type OrderLanguage,
} from "../lib/orderLocale";
import {
  loadDeviceOrders,
  writeDeviceOrders,
  loadRules,
  writeRules,
  type DeviceOrder,
  type RuleProfile,
} from "../lib/orderStorage";
import { parseDelimited } from "../lib/importCartons";
import { track } from "../lib/track";
import PalletEstimateView from "../components/PalletEstimateView";
import { useAuth } from "../hooks/useAuth";
import { getPlan, savePlan } from "../lib/plans";

const inputClass =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-blue-600 disabled:opacity-40";
function Button({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function NumberInput({
  label,
  value,
  factor = 1,
  onChange,
  optional = false,
}: {
  label: string;
  value: number | undefined;
  factor?: number;
  onChange: (v: number | undefined) => void;
  optional?: boolean;
}) {
  const formatted =
    value === undefined || !Number.isFinite(value)
      ? ""
      : String(Math.round((value / factor) * 1e6) / 1e6);
  const [focused, setFocused] = useState(false),
    [draft, setDraft] = useState(formatted);
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      <input
        className={`${inputClass} mt-1`}
        type="number"
        step="any"
        value={focused ? draft : formatted}
        onFocus={() => {
          setDraft(formatted);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(
            e.target.value === ""
              ? optional
                ? undefined
                : NaN
              : Number(e.target.value) * factor
          );
        }}
      />
    </label>
  );
}
const cloneExample = (lang: OrderLanguage) => {
  const q = structuredClone(PALLET_EXAMPLE);
  q.items[0].label = ORDER_COPY[lang].mainCartons;
  q.items[1].label = ORDER_COPY[lang].smallCartons;
  return q;
};
export default function PalletHeightPage() {
  const [lang, setLang] = useState<OrderLanguage>(orderLanguage);
  const t = ORDER_COPY[lang];
  const [request, setRequest] = useState<PalletRequest>(() =>
    cloneExample(orderLanguage())
  );
  const [maxPallets, setMaxPallets] = useState(1),
    [units, setUnits] = useState<UnitSystem>("metric");
  const [name, setName] = useState(""),
    [actuals, setActuals] = useState<OrderFile["actuals"]>({});
  const [plan, setPlan] = useState<OrderPlan | null>(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(true);
  const [comparisons, setComparisons] = useState<ReturnType<
      typeof compareOrders
    > | null>(null),
    [comparing, setComparing] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState(0),
    [paste, setPaste] = useState("");
  const [orders, setOrders] = useState<DeviceOrder[]>([]),
    [rules, setRules] = useState<RuleProfile[]>([]),
    [ruleName, setRuleName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null),
    [deleted, setDeleted] = useState<DeviceOrder | null>(null);
  const [dirty, setDirty] = useState(false),
    [notice, setNotice] = useState<keyof typeof t | "">("");
  const [serverState, setServerState] = useState<keyof typeof t | "">(""),
    [serverBusy, setServerBusy] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const compareWorker = useRef<Worker>(),
    serverAbort = useRef<AbortController>();
  const edited = useRef(false),
    activationSent = useRef(false);
  const auth = useAuth();
  const lf = lengthFactor(units),
    wf = weightFactor(units),
    lu = units === "metric" ? "cm" : "in",
    wu = units === "metric" ? "kg" : "lb";
  const fmt = (n: number) =>
    Number.isFinite(n)
      ? new Intl.NumberFormat(lang === "zh" ? "zh-Hant" : lang, {
          maximumFractionDigits: 2,
        }).format(n)
      : "—";
  const length = (n: number) => `${fmt(n / lf)} ${lu}`,
    weight = (n: number) => `${fmt(n / wf)} ${wu}`;
  useEffect(() => {
    track("pageview");
    try {
      setOrders(loadDeviceOrders());
      setRules(loadRules());
    } catch {
      setNotice("storageError");
    }
    const pop = () => setLang(orderLanguage());
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      compareWorker.current?.terminate();
      serverAbort.current?.abort();
    };
  }, []);
  useEffect(() => {
    setBusy(true);
    setPlan(null);
    setError(false);
    setComparisons(null);
    setComparing(false);
    setServerState("");
    setServerBusy(false);
    compareWorker.current?.terminate();
    serverAbort.current?.abort();
    const worker = new Worker(
      new URL("../workers/orderPlanning.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = ({ data }) => {
      setBusy(false);
      setError(Boolean(data.error));
      setPlan(data.result ?? null);
      if (data.result && edited.current && !activationSent.current) {
        track("order_calculated", data.result.status);
        activationSent.current = true;
      }
    };
    worker.onerror = () => {
      setError(true);
      setBusy(false);
    };
    const timer = setTimeout(
      () =>
        worker.postMessage({
          id: 1,
          action: "plan",
          input: { request, maxPallets },
        }),
      200
    );
    return () => {
      clearTimeout(timer);
      worker.terminate();
    };
  }, [request, maxPallets]);
  const replace = (q: PalletRequest, count = maxPallets) => {
    setRequest(q);
    setMaxPallets(count);
    setActuals({});
    setSelectedPallet(0);
    setDirty(true);
    setNotice("");
    edited.current = true;
  };
  const changePallet = (key: keyof PalletRequest["pallet"], value: number) =>
    replace({ ...request, pallet: { ...request.pallet, [key]: value } });
  const changeItem = (
    i: number,
    patch: Partial<PalletRequest["items"][number]>
  ) =>
    replace({
      ...request,
      items: request.items.map((it, n) => (n === i ? { ...it, ...patch } : it)),
    });
  const loadFile = (file: OrderFile, id: string | null = null) => {
    setRequest(file.request);
    setMaxPallets(file.maxPallets);
    setUnits(file.units);
    setName(file.name);
    setActuals(file.actuals);
    setActiveId(id);
    setDirty(false);
    setSelectedPallet(0);
    setNotice("reopened");
    edited.current = true;
    track("order_reopened", id ? "device" : "file");
  };
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("saved");
    if (!id || !auth.ready || !auth.userId) return;
    let cancelled = false;
    getPlan(id)
      .then((saved) => {
        if (cancelled) return;
        try {
          if (!saved?.stats.orderFile) throw new Error();
          loadFile(parseOrderFile(saved.stats.orderFile));
        } catch {
          setNotice("restoreFail");
        }
      })
      .catch(() => {
        if (!cancelled) setNotice("restoreFail");
      });
    return () => {
      cancelled = true;
    };
  }, [auth.ready, auth.userId]);
  const currentFile = () =>
    orderFile(name, request, maxPallets, units, actuals);
  const download = (data: unknown, filename: string, csv = false) => {
    const blob = new Blob(
      [csv ? String(data) : JSON.stringify(data, null, 2)],
      { type: csv ? "text/csv;charset=utf-8" : "application/json" }
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    track("order_export", csv ? "csv" : "json");
  };
  const saveDevice = (copy = false) => {
    try {
      const file = currentFile(),
        id = copy || !activeId ? crypto.randomUUID() : activeId;
      const updated = [
        { id, file, updated: new Date().toISOString() },
        ...loadDeviceOrders().filter((o) => o.id !== id),
      ];
      writeDeviceOrders(updated);
      setOrders(updated);
      setActiveId(id);
      setDirty(false);
      setNotice("saveOk");
      track("order_saved", "device");
    } catch {
      setNotice("storageError");
    }
  };
  const removeSaved = (row: DeviceOrder) => {
    try {
      const updated = loadDeviceOrders().filter((o) => o.id !== row.id);
      writeDeviceOrders(updated);
      setOrders(updated);
      setDeleted(row);
      if (activeId === row.id) setActiveId(null);
    } catch {
      setNotice("storageError");
    }
  };
  const compare = () => {
    compareWorker.current?.terminate();
    setComparing(true);
    setComparisons(null);
    const w = new Worker(
      new URL("../workers/orderPlanning.worker.ts", import.meta.url),
      { type: "module" }
    );
    compareWorker.current = w;
    w.onmessage = ({ data }) => {
      setComparing(false);
      if (data.error) setNotice("invalid");
      else {
        setComparisons(data.result);
        track("order_compared");
      }
      w.terminate();
    };
    w.onerror = () => {
      setComparing(false);
      setNotice("invalid");
      w.terminate();
    };
    w.postMessage({ action: "compare", input: { request, maxPallets } });
  };
  const serverCheck = async () => {
    const controller = new AbortController();
    serverAbort.current?.abort();
    serverAbort.current = controller;
    setServerBusy(true);
    setServerState("");
    try {
      const response = await fetch("/api/order-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, maxPallets }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (!controller.signal.aborted) {
        const matches = JSON.stringify(result) === JSON.stringify(plan);
        setServerState(matches ? "match" : "mismatch");
        track("order_api_check", matches ? "match" : "mismatch");
      }
    } catch {
      if (!controller.signal.aborted) setServerState("serverError");
    } finally {
      if (!controller.signal.aborted) setServerBusy(false);
    }
  };
  const cloudSave = async () => {
    if (!plan?.pallets.length) return;
    setCloudBusy(true);
    try {
      const first = plan.pallets[0];
      const result = await savePlan({
        name: name || t.order,
        container_key: "pallet-order",
        container: {
          l: request.pallet.l,
          w: request.pallet.w,
          h: request.pallet.maxHeight - request.pallet.baseHeight,
          maxWeight: request.pallet.maxWeight,
        },
        specs: request.items.map((it, i) => ({
          ...it,
          id: `sku${i}`,
          color: 0x2563eb,
        })),
        boxes: first.boxes,
        stats: {
          volumeUtil: 0,
          totalWeight: plan.pallets.reduce((s, p) => s + p.cargoWeight, 0),
          placedCount: plan.placedCount,
          orderFile: currentFile(),
          orderEngine: ORDER_ENGINE,
          palletCount: plan.palletCount,
        },
      });
      if (result.error) throw new Error();
      setNotice("cloudOk");
      track("order_saved", "account");
    } catch {
      setNotice("cloudError");
    } finally {
      setCloudBusy(false);
    }
  };
  const exportCsv = () => {
    if (!plan) return;
    const rows: (string | number)[][] = [
      [
        t.pallet,
        t.step,
        t.id,
        t.name,
        `${t.length} (${lu})`,
        `${t.width} (${lu})`,
        `${t.height} (${lu})`,
        `X (${lu})`,
        `Y (${lu})`,
        `Z (${lu})`,
        `${t.weight} (${wu})`,
      ],
    ];
    plan.pallets.forEach((p, i) =>
      buildSteps(p).forEach((b, j) =>
        rows.push([
          i + 1,
          j + 1,
          b.id,
          b.label,
          b.l / lf,
          b.w / lf,
          b.h / lf,
          b.px / lf,
          b.py / lf,
          b.pz / lf,
          (b.weight ?? 0) / wf,
        ])
      )
    );
    download(
      rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
      "pallet-placements.csv",
      true
    );
  };
  const importTable = () => {
    try {
      if (new TextEncoder().encode(paste).byteLength > ORDER_LIMITS.fileBytes)
        throw new Error();
      let rows = parseDelimited(paste);
      const labels = [
        t.name,
        t.length,
        t.width,
        t.height,
        t.weight,
        t.quantity,
      ];
      const aliases = [
        ["name", "label", "sku", "名稱", "品名"],
        ["length", "l", "長", "長度"],
        ["width", "w", "寬", "寬度"],
        ["height", "h", "高", "高度"],
        ["weight", "kg", "重量"],
        ["quantity", "qty", "count", "數量"],
      ];
      if (
        rows[0]?.length === 6 &&
        rows[0].every((v, i) =>
          [labels[i].toLowerCase(), ...aliases[i]].includes(
            v.trim().toLowerCase()
          )
        )
      )
        rows = rows.slice(1);
      const items = rows.map((row) => {
        if (row.length !== 6) throw new Error();
        return {
          label: row[0],
          l: Number(row[1]) * lf,
          w: Number(row[2]) * lf,
          h: Number(row[3]) * lf,
          weight: Number(row[4]) * wf,
          qty: Number(row[5]),
          keepUpright: true,
        };
      });
      replace(parsePalletRequest({ pallet: request.pallet, items }));
      setPaste("");
      track("order_import", "table");
    } catch {
      setNotice("invalid");
    }
  };
  const chosen =
    plan?.pallets[Math.min(selectedPallet, Math.max(0, plan.palletCount - 1))];
  const invalidActual = Object.values(actuals).some(
    (a) => !Number.isFinite(a.height) || a.height <= 0 || a.height > 500
  );
  const disabled = busy || !plan || error || invalidActual;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Helmet>
        <html lang={lang === "zh" ? "zh-Hant" : lang} />
        <title>{t.title}</title>
        <meta name="description" content={t.description} />
        <link
          rel="canonical"
          href={`https://www.dimpack3d.com${orderHref(lang)}`}
        />
        {ORDER_LANGUAGES.map((l) => (
          <link
            key={l}
            rel="alternate"
            hrefLang={l === "zh" ? "zh-Hant" : l}
            href={`https://www.dimpack3d.com${orderHref(l)}`}
          />
        ))}
        <link
          rel="alternate"
          hrefLang="x-default"
          href="https://www.dimpack3d.com/pallet-height-calculator"
        />
      </Helmet>
      <header className="border-b bg-white print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap gap-4 items-center justify-between">
          <a
            href="/"
            className="font-black text-xl text-indigo-700 flex gap-2 items-center"
          >
            <Box />
            DimPack3D
          </a>
          <nav
            aria-label={t.language}
            className="flex flex-wrap gap-x-4 gap-y-2 text-sm"
          >
            {ORDER_LANGUAGES.map((l) => (
              <a
                key={l}
                lang={l === "zh" ? "zh-Hant" : l}
                href={orderHref(l)}
                aria-current={l === lang ? "page" : undefined}
                className={
                  l === lang
                    ? "font-bold text-indigo-700 underline underline-offset-4"
                    : "text-slate-600 hover:underline"
                }
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  history.replaceState(
                    history.state,
                    "",
                    orderHref(l) + location.search
                  );
                  setLang(l);
                }}
              >
                {LANGUAGE_NAMES[l]}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <section className="mb-8 print:hidden max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-3">
            {t.badge}
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {t.heading}
          </h1>
          <p className="mt-4 text-lg text-slate-600">{t.intro}</p>
        </section>
        <div className="print:hidden flex flex-wrap gap-3 justify-between items-end mb-6">
          <label className="text-sm font-semibold flex-1 min-w-[220px] max-w-lg">
            {t.order}
            <input
              value={name}
              maxLength={80}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="text-sm font-semibold">
            {t.units}
            <select
              className={`${inputClass} mt-1`}
              value={units}
              onChange={(e) => {
                setUnits(e.target.value as UnitSystem);
                setDirty(true);
              }}
            >
              <option value="metric">{t.metric}</option>
              <option value="imperial">{t.imperial}</option>
            </select>
          </label>
          <Button
            onClick={() => {
              replace(cloneExample(lang), 1);
              setActiveId(null);
              setName("");
              track("order_example");
            }}
          >
            {t.example}
          </Button>
        </div>
        {notice && (
          <p
            role="status"
            className="print:hidden mb-4 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm"
          >
            {t[notice]}
          </p>
        )}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start print:hidden">
          <div className="space-y-6 min-w-0">
            <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
              <h2 className="text-lg font-bold mb-4">1. {t.limits}</h2>
              <label className="text-sm font-semibold">
                {t.footprint}
                <select
                  className={`${inputClass} mt-1 mb-4`}
                  value={
                    FOOTPRINTS.find(
                      (p) =>
                        Math.abs(p.l - request.pallet.l) < 1e-6 &&
                        Math.abs(p.w - request.pallet.w) < 1e-6
                    )?.id ?? "custom"
                  }
                  onChange={(e) => {
                    const p = FOOTPRINTS.find((p) => p.id === e.target.value);
                    if (p)
                      replace({
                        ...request,
                        pallet: { ...request.pallet, l: p.l, w: p.w },
                      });
                  }}
                >
                  <option value="custom">{t.custom}</option>
                  {FOOTPRINTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {length(p.l)} × {length(p.w)}
                    </option>
                  ))}
                </select>
              </label>
              <div key={units} className="grid grid-cols-2 gap-4">
                {(
                  ["l", "w", "baseHeight", "maxHeight", "maxWeight"] as const
                ).map((key) => (
                  <NumberInput
                    key={key}
                    label={`${
                      {
                        l: t.length,
                        w: t.width,
                        baseHeight: t.base,
                        maxHeight: t.maxHeight,
                        maxWeight: t.payload,
                      }[key]
                    } (${key === "maxWeight" ? wu : lu})`}
                    value={request.pallet[key]}
                    factor={key === "maxWeight" ? wf : lf}
                    onChange={(v) => changePallet(key, v ?? NaN)}
                  />
                ))}
                <NumberInput
                  label={t.maxPallets}
                  value={maxPallets}
                  onChange={(v) => replace(request, v ?? NaN)}
                />
              </div>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                {t.limitsNote}
              </p>
            </section>
            <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
              <h2 className="text-lg font-bold mb-4">2. {t.cartons}</h2>
              <details className="mb-5 rounded-xl bg-indigo-50 p-4">
                <summary className="font-semibold text-sm cursor-pointer">
                  {t.paste}
                </summary>
                <p className="text-xs text-slate-600 my-3">{t.pasteHelp}</p>
                <textarea
                  aria-label={t.paste}
                  className={`${inputClass} min-h-24 font-mono`}
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button onClick={importTable}>{t.importRows}</Button>
                  <Button
                    onClick={() =>
                      download(
                        [
                          [
                            t.name,
                            t.length,
                            t.width,
                            t.height,
                            t.weight,
                            t.quantity,
                          ],
                          [t.carton, 60 / lf, 40 / lf, 30 / lf, 8 / wf, 12],
                        ]
                          .map((r) => r.map(csvCell).join(","))
                          .join("\r\n"),
                        "cartons.csv",
                        true
                      )
                    }
                  >
                    {t.template}
                  </Button>
                </div>
              </details>
              <div className="space-y-4">
                {request.items.map((it, i) => (
                  <fieldset
                    key={i}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <legend className="px-1 text-sm font-bold">
                      {t.carton} {i + 1}
                    </legend>
                    <div className="flex gap-2 mb-3">
                      <label className="flex-1 text-xs font-semibold">
                        {t.name}
                        <input
                          aria-label={`${t.name} ${i + 1}`}
                          className={`${inputClass} mt-1`}
                          value={it.label}
                          maxLength={60}
                          onChange={(e) =>
                            changeItem(i, { label: e.target.value })
                          }
                        />
                      </label>
                      <button
                        aria-label={`${t.remove} ${i + 1}`}
                        disabled={request.items.length === 1}
                        className="px-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                        onClick={() =>
                          replace({
                            ...request,
                            items: request.items.filter((_, n) => n !== i),
                          })
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div
                      key={units}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                    >
                      {(
                        ["l", "w", "h", "qty", "weight", "maxStack"] as const
                      ).map((key) => (
                        <NumberInput
                          key={key}
                          label={`${
                            {
                              l: t.length,
                              w: t.width,
                              h: t.height,
                              qty: t.quantity,
                              weight: t.weight,
                              maxStack: t.topLoad,
                            }[key]
                          } ${i + 1}${
                            key === "qty"
                              ? ""
                              : ` (${
                                  key === "weight" || key === "maxStack"
                                    ? wu
                                    : lu
                                })`
                          }`}
                          value={it[key]}
                          optional={key === "maxStack"}
                          factor={
                            key === "qty"
                              ? 1
                              : key === "weight" || key === "maxStack"
                              ? wf
                              : lf
                          }
                          onChange={(v) => changeItem(i, { [key]: v })}
                        />
                      ))}
                    </div>
                    <label className="flex gap-2 items-center text-sm mt-3">
                      <input
                        type="checkbox"
                        checked={it.keepUpright}
                        onChange={(e) =>
                          changeItem(i, { keepUpright: e.target.checked })
                        }
                      />
                      {t.upright}
                    </label>
                  </fieldset>
                ))}
              </div>
              <div className="mt-4">
                <Button
                  disabled={request.items.length >= 20}
                  onClick={() =>
                    replace({
                      ...request,
                      items: [
                        ...request.items,
                        {
                          label: `${t.carton} ${request.items.length + 1}`,
                          l: 40,
                          w: 30,
                          h: 20,
                          qty: 1,
                          weight: 1,
                          keepUpright: true,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={16} />
                  {t.add}
                </Button>
              </div>
            </section>
          </div>
          <div className="space-y-5 min-w-0 lg:sticky lg:top-4">
            <section
              aria-label={t.result}
              aria-live="polite"
              className="rounded-2xl bg-slate-950 text-white p-6"
            >
              {busy ? (
                <p>{t.calculating}</p>
              ) : error || !plan ? (
                <p role="alert">{t.invalid}</p>
              ) : (
                <>
                  <p
                    className={`text-sm font-bold ${
                      plan.status === "complete"
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }`}
                  >
                    {plan.status === "complete" ? t.complete : t.partial}
                  </p>
                  <div className="grid grid-cols-3 gap-3 my-5">
                    {[
                      [plan.palletCount, t.pallets],
                      [`${plan.placedCount}/${plan.requestedCount}`, t.placed],
                      [plan.unplacedCount, t.remaining],
                    ].map(([v, label]) => (
                      <div key={label}>
                        <p className="text-3xl sm:text-4xl font-black tabular-nums">
                          {v}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">{label}</p>
                      </div>
                    ))}
                  </div>
                  {chosen ? (
                    <>
                      <p className="text-sm text-slate-400">
                        {t.pallet}{" "}
                        {Math.min(selectedPallet + 1, plan.palletCount)} ·{" "}
                        {t.loadedHeight}
                      </p>
                      <p className="text-5xl font-black mt-1 tabular-nums">
                        {length(chosen.loadedHeight)}
                      </p>
                      <p className="text-xs text-slate-400 mt-3">
                        {t.cargoHeight}: {length(chosen.cargoHeight)} + {t.base}
                        : {length(request.pallet.baseHeight)} ·{" "}
                        {weight(chosen.cargoWeight)}
                      </p>
                    </>
                  ) : (
                    <p>{t.noPallet}</p>
                  )}
                  {plan.unplacedCount > 0 && (
                    <p className="text-sm text-amber-200 mt-4">
                      {t.partialNote}
                    </p>
                  )}
                </>
              )}
            </section>
            {plan && (
              <>
                <div className="flex flex-wrap gap-2">
                  {plan.pallets.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPallet(i)}
                      aria-pressed={selectedPallet === i}
                      className={`${buttonClass} ${
                        selectedPallet === i
                          ? "!bg-indigo-50 !border-indigo-400"
                          : ""
                      }`}
                    >
                      {t.pallet} {i + 1}
                    </button>
                  ))}
                </div>
                {chosen && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <PalletEstimateView
                      key={`${selectedPallet}-${JSON.stringify(request)}`}
                      result={chosen}
                      copy={t}
                      length={length}
                      weight={weight}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={disabled || !plan.palletCount}
                    onClick={() => {
                      window.print();
                      track("order_print");
                    }}
                  >
                    <Printer size={16} />
                    {t.print}
                  </Button>
                  <Button disabled={disabled} onClick={exportCsv}>
                    {t.exportCsv}
                  </Button>
                  <Button
                    disabled={disabled}
                    onClick={() => download(plan, "pallet-result.json")}
                  >
                    {t.exportResult}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.method}
                </p>
                <ul className="rounded-xl bg-white border p-4 text-sm space-y-2">
                  {plan.byItem.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3">
                      <span>{it.label}</span>
                      <span>
                        {it.placed}/{it.requested} · {t.remaining}:{" "}
                        {it.remaining}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
        <section className="print:hidden rounded-2xl border bg-white p-5 sm:p-6 mt-6">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-xl font-bold">3. {t.compare}</h2>
            <Button disabled={disabled || comparing} onClick={compare}>
              {comparing ? t.calculating : t.compare}
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-2">{t.compareNote}</p>
          {comparisons && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {comparisons.map((row) => (
                <article key={row.id} className="border rounded-xl p-4">
                  <h3 className="font-bold">
                    {row.id === "current" ? t.current : row.id}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {length(row.l)} × {length(row.w)}
                  </p>
                  <p
                    className={`text-sm font-semibold my-3 ${
                      row.status === "complete"
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {row.status === "complete" ? t.complete : t.partial}
                  </p>
                  <p>
                    {t.pallets}: <b>{row.palletCount}</b>
                  </p>
                  <p>
                    {t.remaining}: <b>{row.unplacedCount}</b>
                  </p>
                  <p className="mb-3">
                    {t.tallest}: <b>{length(row.maxLoadedHeight)}</b>
                  </p>
                  <Button
                    onClick={() =>
                      replace({
                        ...request,
                        pallet: { ...request.pallet, l: row.l, w: row.w },
                      })
                    }
                  >
                    {t.use}
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>
        <div className="grid lg:grid-cols-2 gap-6 mt-6 print:hidden">
          <section className="rounded-2xl border bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold">4. {t.saved}</h2>
            <p className="text-sm text-slate-500 my-3">{t.localNote}</p>
            {dirty && (
              <p className="text-xs text-amber-700 mb-2">{t.unsaved}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button disabled={disabled} onClick={() => saveDevice()}>
                <Save size={16} />
                {t.save}
              </Button>
              <Button disabled={disabled} onClick={() => saveDevice(true)}>
                {t.duplicate}
              </Button>
              <Button
                disabled={disabled}
                onClick={() => download(currentFile(), "pallet-order.json")}
              >
                {t.exportFile}
              </Button>
            </div>
            <label className="block text-sm font-semibold mt-4">
              {t.importFile}
              <input
                type="file"
                accept=".json,application/json"
                className="block mt-2 max-w-full text-sm"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > ORDER_LIMITS.fileBytes) throw new Error();
                    loadFile(readOrderFile(await file.text()));
                  } catch {
                    setNotice("fileError");
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <ul className="mt-5 space-y-3">
              {orders.length === 0 && (
                <li className="text-sm text-slate-400">{t.empty}</li>
              )}
              {orders.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap gap-2 justify-between items-center border-t pt-3"
                >
                  <span className="text-sm font-semibold break-all">
                    {row.file.name || t.order}
                    <small className="block font-normal text-slate-400">
                      {new Date(row.updated).toLocaleDateString(lang)}
                    </small>
                  </span>
                  <div className="flex gap-2">
                    <Button onClick={() => loadFile(row.file, row.id)}>
                      {t.reopen}
                    </Button>
                    <Button onClick={() => removeSaved(row)}>{t.delete}</Button>
                  </div>
                </li>
              ))}
            </ul>
            {deleted && (
              <Button
                onClick={() => {
                  try {
                    const next = [
                      deleted,
                      ...loadDeviceOrders().filter((o) => o.id !== deleted.id),
                    ];
                    writeDeviceOrders(next);
                    setOrders(next);
                    setDeleted(null);
                  } catch {
                    setNotice("storageError");
                  }
                }}
              >
                {t.undo}
              </Button>
            )}
            <details className="mt-6 border-t pt-4">
              <summary className="font-semibold cursor-pointer">
                {t.account}
              </summary>
              <p className="text-sm text-slate-500 my-3">{t.accountNote}</p>
              {auth.userId ? (
                <Button
                  disabled={disabled || cloudBusy || !plan?.palletCount}
                  onClick={cloudSave}
                >
                  {t.cloudSave}
                </Button>
              ) : (
                <a href="/plans" className="text-blue-700 underline">
                  My Plans →
                </a>
              )}
            </details>
          </section>
          <section className="rounded-2xl border bg-white p-5 sm:p-6">
            <h2 className="text-xl font-bold">{t.rules}</h2>
            <p className="text-sm text-slate-500 my-3">{t.rulesNote}</p>
            <label className="text-sm font-semibold">
              {t.ruleName}
              <input
                className={`${inputClass} mt-1 mb-3`}
                maxLength={80}
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
              />
            </label>
            <Button
              disabled={disabled || !ruleName.trim()}
              onClick={() => {
                try {
                  const next = [
                    {
                      id: crypto.randomUUID(),
                      name: ruleName.trim(),
                      pallet: parsePalletRequest(request).pallet,
                      maxPallets,
                    },
                    ...loadRules(),
                  ];
                  writeRules(next);
                  setRules(next);
                  setRuleName("");
                  setNotice("saveOk");
                } catch {
                  setNotice("storageError");
                }
              }}
            >
              {t.saveRules}
            </Button>
            <ul className="space-y-3 mt-4">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-wrap justify-between items-center gap-2 border-t pt-3"
                >
                  <span className="text-sm font-semibold">{rule.name}</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        replace(
                          { ...request, pallet: rule.pallet },
                          rule.maxPallets
                        )
                      }
                    >
                      {t.applyRules}
                    </Button>
                    <Button
                      onClick={() => {
                        try {
                          const next = loadRules().filter(
                            (r) => r.id !== rule.id
                          );
                          writeRules(next);
                          setRules(next);
                        } catch {
                          setNotice("storageError");
                        }
                      }}
                    >
                      {t.delete}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
        {chosen && plan && (
          <section className="print:hidden rounded-2xl border bg-white p-5 sm:p-6 mt-6">
            <h2 className="text-xl font-bold">
              5. {t.actual} · {t.pallet} {selectedPallet + 1}
            </h2>
            <p className="text-sm text-slate-500 mt-2 mb-4">
              {t.feedbackNote} {t.clearActuals}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <NumberInput
                key={`${units}-${selectedPallet}`}
                label={`${t.actualHeight} (${lu})`}
                optional
                value={actuals[selectedPallet]?.height}
                factor={lf}
                onChange={(v) => {
                  const next = { ...actuals };
                  if (v === undefined) delete next[selectedPallet];
                  else
                    next[selectedPallet] = {
                      height: v,
                      note: next[selectedPallet]?.note ?? "",
                    };
                  setActuals(next);
                  setDirty(true);
                }}
              />
              <label className="text-xs font-semibold text-slate-600">
                {t.note}
                <textarea
                  disabled={!actuals[selectedPallet]}
                  maxLength={500}
                  className={`${inputClass} mt-1 disabled:bg-slate-100`}
                  value={actuals[selectedPallet]?.note ?? ""}
                  onChange={(e) => {
                    setActuals({
                      ...actuals,
                      [selectedPallet]: {
                        height: actuals[selectedPallet].height,
                        note: e.target.value,
                      },
                    });
                    setDirty(true);
                  }}
                />
              </label>
            </div>
            {invalidActual && (
              <p role="alert" className="text-red-700 mt-3">
                {t.invalid} (0 &lt; cm ≤ 500)
              </p>
            )}
            {actuals[selectedPallet] && (
              <p className="mt-3 text-sm">
                {t.deviation}:{" "}
                <b>
                  {length(actuals[selectedPallet].height - chosen.loadedHeight)}
                </b>
              </p>
            )}
          </section>
        )}
        <section
          id="api"
          className="print:hidden rounded-2xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6 mt-6"
        >
          <h2 className="text-xl font-bold">{t.api}</h2>
          <p className="text-sm text-slate-600 my-3">{t.apiNote}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={disabled}
              onClick={() =>
                download({ request, maxPallets }, "order-request.json")
              }
            >
              <ArrowDownToLine size={16} />
              {t.request}
            </Button>
            <Button disabled={disabled || serverBusy} onClick={serverCheck}>
              {serverBusy ? t.calculating : t.server}
            </Button>
            <a href="/api-docs#order-plan" className={buttonClass}>
              {t.docs}
              <ArrowRight size={14} />
            </a>
          </div>
          {serverState && (
            <p role="status" className="mt-3 text-sm font-semibold">
              {t[serverState]}
            </p>
          )}
          <pre className="mt-4 rounded-xl bg-slate-950 text-slate-100 p-4 text-xs overflow-x-auto">
            {
              'curl https://www.dimpack3d.com/api/order-plan \\\n  -H "Content-Type: application/json" \\\n  --data-binary @order-request.json'
            }
          </pre>
        </section>
        <section className="print:hidden grid md:grid-cols-2 gap-8 my-10 text-slate-600">
          <article>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              {t.faqTitle}
            </h2>
            <p>{t.faqBody}</p>
            <a
              href="/ti-hi-calculator"
              className="text-blue-700 underline block mt-3"
            >
              {t.sameSize}
            </a>
          </article>
          <article>
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              {t.reuseTitle}
            </h2>
            <p>{t.reuseBody}</p>
          </article>
        </section>
        <section className="print:hidden border-t pt-6">
          <p className="text-slate-600 mb-3">{t.pilotNote}</p>
          <a
            className="inline-flex gap-2 items-center text-indigo-700 font-bold"
            href="mailto:hello@dimpack3d.com?subject=Order%20planning%20pilot"
            onClick={() => track("order_pilot_click")}
          >
            {t.pilot}
            <ArrowRight size={16} />
          </a>
        </section>
        <div className="hidden print:block">
          <h1 className="text-2xl font-black">DimPack3D · {name || t.order}</h1>
          <p>
            {t.build} · {ORDER_ENGINE} ·{" "}
            {plan?.status === "complete" ? t.complete : t.partial}
          </p>
          <p className="text-sm mt-2">{t.method}</p>
          <p className="text-sm mt-2">{t.printNote}</p>
          <p className="font-bold my-3">
            {t.remaining}: {plan?.unplacedCount ?? "—"}
          </p>
          {plan?.pallets.map((p, i) => (
            <section key={i} className="break-before-page py-5">
              <h2 className="text-xl font-bold">
                {t.pallet} {i + 1} · {length(p.loadedHeight)} ·{" "}
                {weight(p.cargoWeight)}
              </h2>
              <p>
                {length(p.pallet.l)} × {length(p.pallet.w)} · {t.base}:{" "}
                {length(p.pallet.baseHeight)}
              </p>
              {actuals[i] && (
                <p>
                  {t.actualHeight}: {length(actuals[i].height)} ·{" "}
                  {actuals[i].note}
                </p>
              )}
              <div className="max-w-sm">
                <PalletEstimateView
                  result={p}
                  copy={t}
                  length={length}
                  weight={weight}
                />
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {[
                      t.step,
                      t.id,
                      t.name,
                      t.dimensions,
                      `${t.position} (${lu})`,
                    ].map((s) => (
                      <th key={s} className="border p-1 text-left">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildSteps(p).map((b, j) => (
                    <tr key={b.id}>
                      <td className="border p-1">{j + 1}</td>
                      <td className="border p-1">{b.id}</td>
                      <td className="border p-1">{b.label}</td>
                      <td className="border p-1">
                        {length(b.l)} × {length(b.w)} × {length(b.h)}
                      </td>
                      <td className="border p-1">
                        {fmt(b.px / lf)} / {fmt(b.py / lf)} / {fmt(b.pz / lf)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
          {plan && plan.unplacedCount > 0 && (
            <section className="mt-4">
              <h2>{t.remaining}</h2>
              {plan.byItem
                .filter((it) => it.remaining)
                .map((it) => (
                  <p key={it.id}>
                    {it.label}: {it.remaining}
                  </p>
                ))}
            </section>
          )}
        </div>
      </main>
      <footer className="print:hidden border-t py-6 px-4 text-sm text-slate-500 flex flex-wrap justify-center gap-6">
        <a href="/">{t.home}</a>
        <a href="/privacy">{t.privacy}</a>
        <span>© {new Date().getFullYear()} DimPack3D</span>
      </footer>
    </div>
  );
}
