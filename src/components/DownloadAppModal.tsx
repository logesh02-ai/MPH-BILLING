import React, { useState } from 'react';
import {
  X,
  Laptop,
  Download,
  CheckCircle2,
  HardDriveDownload,
  FolderArchive,
  Sparkles,
  FileDown,
  Server,
  Layout,
} from 'lucide-react';
import { exportBackupJson } from '../services/storage';

interface DownloadAppModalProps {
  onClose: () => void;
  onDownloadBackupJson: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  onClose,
  onDownloadBackupJson,
}) => {
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);
  const [downloadedType, setDownloadedType] = useState<'html' | 'zip' | null>(null);
  const [includeCurrentData, setIncludeCurrentData] = useState(true);

  const handleDownloadStandaloneHtml = async () => {
    try {
      setIsDownloadingHtml(true);
      const response = await fetch('/Maheswari_Billing_Software.html');
      if (!response.ok) {
        throw new Error('Standalone package not found');
      }
      let htmlContent = await response.text();

      // Embed current shop data into the standalone HTML file if requested
      if (includeCurrentData) {
        const currentStoreJson = exportBackupJson();
        const encodedData = encodeURIComponent(currentStoreJson);
        const preloadScript = `<script>
(function(){
  try {
    var raw = decodeURIComponent("${encodedData}");
    var parsed = JSON.parse(raw);
    if (parsed && parsed.data) {
      var existingRaw = localStorage.getItem('hardwareShopBillingData');
      if (!existingRaw) {
        localStorage.setItem('hardwareShopBillingData', JSON.stringify(parsed.data));
      } else {
        var existing = JSON.parse(existingRaw);
        var existingInvs = Array.isArray(existing.invoices) ? existing.invoices : [];
        var newInvs = Array.isArray(parsed.data.invoices) ? parsed.data.invoices : [];
        var seenNums = {};
        var mergedInvs = [];
        existingInvs.concat(newInvs).forEach(function(inv) {
          if (inv && inv.number && !seenNums[inv.number]) {
            seenNums[inv.number] = true;
            mergedInvs.push(inv);
          }
        });
        existing.invoices = mergedInvs;
        if (!existing.products || existing.products.length < parsed.data.products.length) {
          existing.products = parsed.data.products;
        }
        localStorage.setItem('hardwareShopBillingData', JSON.stringify(existing));
      }
    }
  } catch (e) { console.warn('Preload skipped:', e); }
})();
</script>`;
        htmlContent = htmlContent.replace('<head>', '<head>\n' + preloadScript);
      }

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Maheswari_Plywood_Billing_Software.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadedType('html');
    } catch (err) {
      console.error('Failed to download standalone HTML:', err);
    } finally {
      setIsDownloadingHtml(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Banner */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold tracking-wide uppercase">
                Download Project (Separated Frontend &amp; Backend)
              </h3>
              <p className="text-xs text-slate-400">
                Download the structured ZIP folder (`frontend/` + `backend/`) or single offline HTML file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Primary Option A: Export ZIP Package (Frontend + Backend) */}
          <div className="rounded-xl border-2 border-orange-500 bg-orange-50/40 p-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-num uppercase font-bold text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-sm">
                <FolderArchive className="w-3.5 h-3.5" /> Separated Frontend &amp; Backend Folders
              </div>
              <h4 className="text-base font-bold text-slate-900">
                1. Download Full Project ZIP (`frontend/` + `backend/`)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Organized into two separate folders inside the ZIP:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="bg-white border border-orange-200/80 rounded-lg p-2.5 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Layout className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-mono-num">frontend/</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    React 19 + TypeScript UI, POS Billing, GST Invoice Print/PDF (`src/`, `index.html`, `vite.config.ts`, `package.json`).
                  </p>
                </div>

                <div className="bg-white border border-orange-200/80 rounded-lg p-2.5 text-xs">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Server className="w-3.5 h-3.5 text-orange-600" />
                    <span className="font-mono-num">backend/</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Node.js + Express REST API Server (`server.ts`, `routes/api.ts`, `db/store.ts`, `data/database.json`, `package.json`).
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <a
                href="/Maheswari_Plywood_Billing_System.zip"
                download="Maheswari_Plywood_Billing_System.zip"
                onClick={() => setDownloadedType('zip')}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm rounded-lg shadow-md transition-all cursor-pointer"
              >
                <FolderArchive className="w-5 h-5" />
                <span>Download Frontend + Backend ZIP (.zip)</span>
              </a>
            </div>
          </div>

          {/* Primary Option B: Single File HTML */}
          <div className="rounded-xl border-2 border-blue-600 bg-blue-50/40 p-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-num uppercase font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-sm">
                <Sparkles className="w-3.5 h-3.5" /> Direct Single-File App (Updated Print &amp; PDF)
              </div>
              <h4 className="text-base font-bold text-slate-900">
                2. Download Single-File Offline App (.HTML)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Downloads <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono-num">Maheswari_Plywood_Billing_Software.html</code> directly with the fixed A4 Bill Print &amp; exact visual PDF download.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-blue-200/70 space-y-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCurrentData}
                  onChange={(e) => setIncludeCurrentData(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Include my current products, invoices &amp; shop settings inside the file</span>
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  onClick={handleDownloadStandaloneHtml}
                  disabled={isDownloadingHtml}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-60"
                >
                  <HardDriveDownload className="w-5 h-5" />
                  <span>
                    {isDownloadingHtml
                      ? 'Preparing Download...'
                      : 'Download Single-File App (.HTML)'}
                  </span>
                </button>

                <a
                  href="/Maheswari_Billing_Software.html"
                  download="Maheswari_Plywood_Billing_Software.html"
                  onClick={() => setDownloadedType('html')}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-blue-600" />
                  <span>Direct HTML Link</span>
                </a>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {downloadedType && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-emerald-950">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-emerald-900">
                  {downloadedType === 'zip'
                    ? 'ZIP Download Started! Check your laptop Downloads folder for Maheswari_Plywood_Billing_System.zip'
                    : 'HTML Download Started! Check your laptop Downloads folder for Maheswari_Plywood_Billing_Software.html'}
                </div>
                <div>
                  {downloadedType === 'zip' ? (
                    <>
                      1. Right-click <strong>Maheswari_Plywood_Billing_System.zip</strong> and click{' '}
                      <strong>Extract All...</strong>
                      <br />
                      2. Inside you will see two separated folders: <strong>frontend/</strong> and{' '}
                      <strong>backend/</strong>, plus the ready-to-open{' '}
                      <strong>Maheswari_Plywood_Billing_Software.html</strong>!
                    </>
                  ) : (
                    <>
                      Move <strong>Maheswari_Plywood_Billing_Software.html</strong> to your Desktop
                      and double-click it anytime to start billing offline!
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Database JSON Backup Row */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">Database Backup (.json):</strong> Save a separate backup of your invoices &amp; stock.
            </div>
            <button
              onClick={onDownloadBackupJson}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-600" />
              <span>Download Backup (.json)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Reopen anytime via the orange &quot;Download to Laptop&quot; button in the top bar.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
