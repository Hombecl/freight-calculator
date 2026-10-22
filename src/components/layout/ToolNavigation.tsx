import { Link, useLocation } from 'react-router-dom';
import { Package, Container, Move3d, BookOpen, Calculator, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useWorkspace } from './WorkspacePreferences';

export const navItems = [
  { path: '/planner', label: 'Load Planner', labelZh: '裝載規劃', icon: Move3d, activeColor: 'bg-indigo-600' },
  { path: '/packing', label: 'Packing', labelZh: '產品裝箱', icon: Package, activeColor: 'bg-blue-600' },
  { path: '/container', label: 'Container', labelZh: '貨櫃裝載', icon: Container, activeColor: 'bg-teal-600' },
  { path: '/#more-tools', label: 'More tools', labelZh: '其他工具', icon: Calculator, activeColor: 'bg-slate-600' },
  { path: '/#calculators', label: 'Calculators', labelZh: '計算器', icon: Calculator, activeColor: 'bg-blue-600' },
  { path: '/guides', label: 'Guides', labelZh: '指南', icon: BookOpen, activeColor: 'bg-slate-600' },
];

export default function ToolNavigation() {
  const { lang } = useApp();
  const { pathname } = useLocation();
  const { compactNav, setCompactNav } = useWorkspace();
  return <aside className={`hidden xl:block shrink-0 border-r border-slate-200 bg-white print:hidden ${compactNav ? 'w-16' : 'w-44'}`}>
    <nav aria-label={lang === 'zh' ? '工具導覽' : 'Tool navigation'} className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto p-2">
      <button type="button" onClick={() => setCompactNav(!compactNav)} aria-expanded={!compactNav} aria-label={lang === 'zh' ? '切換導覽標籤' : 'Toggle navigation labels'} title={lang === 'zh' ? '切換導覽標籤' : 'Toggle navigation labels'} className="mb-3 flex w-full items-center gap-2 rounded-lg p-3 text-xs text-slate-500 hover:bg-slate-100">
        {compactNav ? <PanelLeftOpen size={18} className="shrink-0" /> : <><PanelLeftClose size={18} className="shrink-0" /><span>{lang === 'zh' ? '收起選單' : 'Collapse menu'}</span></>}
      </button>
      {navItems.map(item => {
        const active = item.path === '/guides' ? pathname.startsWith('/guides') : pathname === item.path;
        const label = lang === 'zh' ? item.labelZh : item.label;
        return <Link key={item.path} to={item.path} aria-label={label} title={compactNav ? label : undefined} aria-current={active ? 'page' : undefined} className={`mb-1 flex items-center gap-3 rounded-lg p-3 text-sm font-medium ${active ? item.activeColor + ' text-white' : 'text-slate-600 hover:bg-slate-100'}`}><item.icon size={18} className="shrink-0" />{!compactNav && <span>{label}</span>}</Link>;
      })}
    </nav>
  </aside>;
}
