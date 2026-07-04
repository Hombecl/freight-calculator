import { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';
import { parseText, parseFile, TEMPLATE_CSV, type ImportResult } from '../lib/importCartons';
import { downloadText } from '../lib/exportPlan';
import type { PackItemSpec } from '../lib/binPacking';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (specs: PackItemSpec[]) => void;
}

/**
 * Import cartons from the customer's existing data: drop/browse a CSV or
 * Excel file, or paste cells straight from Excel/Sheets (tab-separated).
 * Preview + warnings before committing.
 */
export default function ImportModal({ open, onClose, onImport }: Props) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasted, setPasted] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const handleFile = async (f: File | undefined | null) => {
    if (!f) return;
    try { setResult(await parseFile(f)); } catch { setResult({ specs: [], warnings: ['Could not read that file'] }); }
  };
  const handlePaste = (text: string) => {
    setPasted(text);
    if (text.trim()) setResult(parseText(text));
  };
  const commit = () => {
    if (result && result.specs.length) {
      onImport(result.specs);
      setResult(null);
      setPasted('');
      onClose();
    }
  };
  const reset = () => { setResult(null); setPasted(''); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet size={18} />
            </span>
            <div>
              <h2 className="font-bold text-slate-800">Import cartons</h2>
              <p className="text-xs text-slate-500">CSV, Excel, or paste cells — dimensions in cm, weight in kg.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {!result ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Upload size={22} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Drop your carton list here</p>
              <p className="text-xs text-slate-500 mt-1">.xlsx / .csv — or click to browse</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">or paste from Excel / Sheets</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <textarea
              value={pasted}
              onChange={(e) => handlePaste(e.target.value)}
              placeholder={'Copy your rows in Excel and paste here…\nname\tlength\twidth\theight\tweight\tqty'}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono outline-none focus:border-blue-500"
            />

            <button
              onClick={() => downloadText('dimpack3d-template.csv', TEMPLATE_CSV)}
              className="mt-3 text-xs text-blue-600 font-medium"
            >
              Download template CSV
            </button>
          </>
        ) : (
          <>
            {result.warnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-3">
                {result.warnings.slice(0, 5).map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{w}</p>
                ))}
              </div>
            )}
            {result.specs.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-left text-slate-500">
                      <th className="p-2">Carton</th><th className="p-2">L×W×H (cm)</th><th className="p-2">kg</th><th className="p-2">Qty</th><th className="p-2">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.specs.slice(0, 8).map((s) => (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="p-2 font-medium text-slate-700">{s.label}</td>
                        <td className="p-2 font-mono">{s.l}×{s.w}×{s.h}</td>
                        <td className="p-2">{s.weight || '—'}</td>
                        <td className="p-2">{s.qty}</td>
                        <td className="p-2 text-slate-500">
                          {[s.maxStack === 0 && 'fragile', s.keepUpright && 'upright', s.group, s.unloadOrder && `stop ${s.unloadOrder}`].filter(Boolean).join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.specs.length > 8 && (
                  <p className="text-[11px] text-slate-400 px-2 py-1.5 bg-slate-50">…and {result.specs.length - 8} more</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={reset} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium">
                Back
              </button>
              <button
                onClick={commit}
                disabled={!result.specs.length}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold disabled:opacity-40"
              >
                <Check size={15} /> Import {result.specs.length} carton type{result.specs.length === 1 ? '' : 's'} &amp; optimize
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
