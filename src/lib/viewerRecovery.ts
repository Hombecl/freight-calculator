/** Retry without MSAA before giving up. No change to orbit or cargo geometry. */
export function createViewerRenderer<T>(create: (antialias: boolean) => T, antialias: boolean): {renderer: T; reduced: boolean} {
  try { return {renderer: create(antialias), reduced: false}; }
  catch (error) {
    if (!antialias) throw error;
    return {renderer: create(false), reduced: true};
  }
}
/** Coarse diagnostics only: no device model, full user agent or cargo data. */
export function viewerDiagnostic(width: number, touch: boolean, retry: boolean): string {
  return `${width < 768 ? 'small' : width < 1200 ? 'medium' : 'large'}:${touch ? 'touch' : 'pointer'}:${retry ? 'retry' : 'initial'}`;
}
