import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../../context/AppContext';

const WorkspaceContext = createContext({ compactNav: true, showUpdates: true, setCompactNav: (_v: boolean) => {}, setShowUpdates: (_v: boolean) => {} });
export const useWorkspace = () => useContext(WorkspaceContext);
export function WorkspacePreferences({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem('dimpack3d-workspace') || '{}'); return { compactNav: saved.version === 2 ? saved.compactNav !== false : true, showUpdates: saved.showUpdates !== false }; }
    catch { return { compactNav: true, showUpdates: true }; }
  });
  useEffect(() => { try { localStorage.setItem('dimpack3d-workspace', JSON.stringify({ ...preferences, version: 2 })); } catch { /* preferences still work for this visit */ } }, [preferences]);
  return <WorkspaceContext.Provider value={{ ...preferences, setCompactNav: compactNav => setPreferences(p => ({ ...p, compactNav })), setShowUpdates: showUpdates => setPreferences(p => ({ ...p, showUpdates })) }}>{children}</WorkspaceContext.Provider>;
}

export function WorkspaceSettings() {
  const { lang, isSettingsOpen, setIsSettingsOpen } = useApp();
  const { compactNav, showUpdates, setCompactNav, setShowUpdates } = useWorkspace();
  const dialog = useRef<HTMLDialogElement>(null);
  const T = (en: string, zh: string) => lang === 'zh' ? zh : en;
  useEffect(() => {
    if (isSettingsOpen && !dialog.current?.open) dialog.current?.showModal();
    if (!isSettingsOpen && dialog.current?.open) dialog.current.close();
  }, [isSettingsOpen]);
  return <dialog ref={dialog} aria-labelledby="workspace-settings-title" onCancel={() => setIsSettingsOpen(false)} onClose={() => setIsSettingsOpen(false)} className="w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/40">
    <div className="flex items-center justify-between border-b px-5 py-4">
      <h2 id="workspace-settings-title" className="font-bold text-slate-900">{T('Workspace settings', '工作區設定')}</h2>
      <button type="button" autoFocus onClick={() => setIsSettingsOpen(false)} aria-label={T('Close settings', '關閉設定')} className="rounded px-3 py-1 text-lg hover:bg-slate-100">×</button>
    </div>
    <div className="space-y-5 p-5 text-sm text-slate-700">
      <label className="flex items-center gap-3"><input type="checkbox" checked={compactNav} onChange={e => setCompactNav(e.target.checked)} />{T('Compact desktop navigation (icons only)', '精簡桌面導覽（只顯示圖示）')}</label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={showUpdates} onChange={e => setShowUpdates(e.target.checked)} />{T('Show calculation updates in Planner', '在 Planner 顯示計算更新公告')}</label>
      <p className="text-xs text-slate-500">{T('Saved on this browser. These display settings do not change your cargo or calculations.', '設定儲存在此瀏覽器。顯示設定不會改動貨物資料或計算。')}</p>
      <p className="rounded-lg bg-slate-50 p-3 text-xs">{T('Planner uses cm and kg. Set cargo constraints beside the carton inputs; freight and packing settings are available within their calculators.', 'Planner 使用 cm 及 kg。貨物限制可在紙箱輸入旁設定；運費及裝箱參數可在對應計算器內設定。')}</p>
      <button type="button" onClick={() => setIsSettingsOpen(false)} className="w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white">{T('Done', '完成')}</button>
    </div>
  </dialog>;
}
