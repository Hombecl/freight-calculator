import { Component, type ReactNode } from 'react';

const COPY: Record<string, [string, string, string]> = {
  en: ['This tool did not finish loading', 'Reload the page to try again. If it still fails, check whether your browser blocked a site file.', 'Reload page'],
  zh: ['工具尚未完成載入', '請重新載入頁面。如仍有問題，請檢查瀏覽器是否封鎖網站檔案。', '重新載入'],
  de: ['Das Tool wurde nicht vollständig geladen', 'Laden Sie die Seite erneut. Prüfen Sie bei weiteren Fehlern, ob Ihr Browser eine Datei der Website blockiert.', 'Seite neu laden'],
  fr: ["Le chargement de l’outil a échoué", 'Rechargez la page. Si le problème persiste, vérifiez si votre navigateur a bloqué un fichier du site.', 'Recharger la page'],
  es: ['La herramienta no terminó de cargarse', 'Vuelva a cargar la página. Si el problema continúa, compruebe si el navegador ha bloqueado un archivo del sitio.', 'Volver a cargar'],
  pt: ['A ferramenta não terminou de carregar', 'Recarregue a página. Se o problema persistir, verifique se o navegador bloqueou um ficheiro do site.', 'Recarregar página'],
};
/** A missing deployment chunk or blocked resource must not leave a blank page. */
export default class PageLoadBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  render() {
    if (!this.state.failed) return this.props.children;
    const t = COPY[location.pathname.split('/')[1]] ?? COPY.en;
    return <main className="max-w-xl mx-auto my-16 p-6" role="alert"><a href="/" className="font-bold text-indigo-700">DimPack3D</a><h1 className="text-2xl font-bold mt-6">{t[0]}</h1><p className="my-4 text-slate-600">{t[1]}</p><button className="rounded-lg bg-indigo-700 text-white px-4 py-3 font-semibold" onClick={()=>location.reload()}>{t[2]}</button></main>;
  }
}
