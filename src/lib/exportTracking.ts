import { track, type ExportParameters } from './track';
import type { PrintResult } from './exportPlan';

type ExportEvent = 'export_requested' | 'export_gate_viewed' | 'export_gate_dismissed'
  | 'export_gate_unlocked' | 'export_failed' | 'export_artifact_opened' | 'export_download_triggered';
export type ExportFormat = ExportParameters['export_format'];
type Tool = ExportParameters['export_tool'];
type Reason = NonNullable<ExportParameters['export_reason']>;
export type ExportResult = { ok: true } | { ok: false; reason: Reason };

export function trackExport(event: ExportEvent, tool: Tool, format: ExportFormat, reason?: Reason) {
  track(event, [tool, format, reason].filter(Boolean).join(':'), {
    export_tool: tool, export_format: format, ...(reason ? { export_reason: reason } : {}),
  });
}

/** Opening a printable page / triggering a download is observable; saving a file is not. */
export function performExport(tool: Tool, format: ExportFormat, createArtifact: () => void | PrintResult): ExportResult {
  let result: ExportResult;
  try {
    const opened = createArtifact();
    result = opened ?? { ok: true };
  } catch {
    result = { ok: false, reason: format === 'pdf' ? 'render_error' : 'download_error' };
  }
  if (!result.ok) {
    trackExport('export_failed', tool, format, result.reason);
    return result;
  }
  trackExport(format === 'pdf' ? 'export_artifact_opened' : 'export_download_triggered', tool, format);
  // Preserve existing key events, but only after the artifact opens/download starts.
  track(`export_${format}`, tool === 'warehouse' ? 'warehouse' : undefined, {
    export_tool: tool, export_format: format,
  });
  return result;
}
