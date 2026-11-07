import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Invoice, ShopInfo } from '../types';
import { numberToWordsINR } from '../utils/numberToWords';
import {
  downloadInvoicePdf,
  normalizeInvoiceForOutput,
  triggerDedicatedInvoicePrint,
} from '../utils/pdfGenerator';

interface PrintBillPageProps {
  invoice: Invoice;
  shopInfo: ShopInfo;
  onBack: () => void;
}

export const PrintBillPage: React.FC<PrintBillPageProps> = ({
  invoice,
  shopInfo,
  onBack,
}) => {
  // Default view mode based on how the bill was created, plus option to show Both (GST + Without GST down below)
  const [billMode, setBillMode] = useState<'gst' | 'without_gst' | 'both'>(
    invoice.taxType === 'none' ? 'without_gst' : 'both'
  );

  const normGst = normalizeInvoiceForOutput(invoice, false);
  const normNoGst = normalizeInvoiceForOutput(invoice, true);

  // Automatically open system print dialog once the dedicated print page is mounted
  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn('Auto print prompt skipped:', e);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [invoice.id]);

  // Synchronous print handler inside direct user click gesture
  const handleDirectPrint = () => {
    window.print();
  };

  // Synchronous PDF file download handler inside direct user click gesture
  const handleDownloadGstPdf = () => {
    downloadInvoicePdf(invoice, shopInfo, false);
  };

  const handleDownloadNoGstPdf = () => {
    downloadInvoicePdf(invoice, shopInfo, true);
  };

  const handleShareWhatsApp = (withoutGst = false) => {
    if (!invoice.customerPhone) return;
    let phone = invoice.customerPhone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    const targetNorm = withoutGst ? normNoGst : normGst;
    const itemsSummary = targetNorm.items
      .map(
        (it) =>
          `• ${it.name} - ${it.qty} ${it.unit} @ ₹${it.price.toFixed(2)} = ₹${it.itemTotal.toFixed(2)}`
      )
      .join('\n');

    const message = `*${withoutGst ? 'BILL (WITHOUT GST)' : 'TAX INVOICE'}: ${invoice.number}*
*${shopInfo.name}*
${shopInfo.addressLine1}, ${shopInfo.city}
${!withoutGst ? `GSTIN: ${shopInfo.gst}\n` : ''}Phone: ${shopInfo.phone}

Date: ${new Date(invoice.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
Customer: ${invoice.customerName}
*Items:*
${itemsSummary}

Subtotal: ₹${targetNorm.subtotal.toFixed(2)}
${!withoutGst ? `Taxable: ₹${targetNorm.taxableAmount.toFixed(2)}\nTotal GST: ₹${targetNorm.taxAmt.toFixed(2)}\n` : ''}*Grand Total: ₹${targetNorm.total.toFixed(2)}*
${numberToWordsINR(targetNorm.total)}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderInvoiceSheet = (norm: ReturnType<typeof normalizeInvoiceForOutput>, isNoGstSheet: boolean) => (
    <div
      className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none border border-slate-300 print:border-none rounded-lg print:rounded-none p-8 print:p-2 text-slate-800 text-sm mb-8 print:mb-0"
    >
      {/* Shop Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-5">
        <div className="flex gap-4 items-center">
          <div className="bg-white p-1 border border-slate-200 rounded w-20 flex-shrink-0">
            <img
              src={shopInfo.logo}
              alt={shopInfo.name}
              className="w-full h-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight uppercase">
              {shopInfo.name}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {shopInfo.addressLine1}, {shopInfo.addressLine2}
            </p>
            <p className="text-xs text-slate-600">
              {shopInfo.city}, {shopInfo.state} - {shopInfo.pincode}
            </p>
            <p className="text-xs font-mono-num font-semibold text-slate-800 mt-1">
              Phone: {shopInfo.phone} | Email: {shopInfo.email}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 text-white font-mono-num font-bold text-xs rounded tracking-wider uppercase mb-1 ${
              isNoGstSheet ? 'bg-orange-600' : 'bg-slate-900'
            }`}
          >
            {isNoGstSheet ? 'BILL (WITHOUT GST)' : 'TAX INVOICE'}
          </span>
          <div className="text-[11px] text-slate-500 font-mono-num">
            {isNoGstSheet ? '(Retail Cash Memo / Estimate)' : '(Original for Recipient)'}
          </div>
          {!isNoGstSheet && (
            <div className="mt-2 text-xs font-mono-num">
              <span className="text-slate-500">GSTIN: </span>
              <span className="font-bold text-slate-900 font-mono-num">
                {shopInfo.gst}
              </span>
            </div>
          )}
          <div className="text-xs font-mono-num mt-0.5">
            <span className="text-slate-500">State: </span>
            <span className="text-slate-800">
              {shopInfo.state} ({shopInfo.stateCode})
            </span>
          </div>
        </div>
      </div>

      {/* Buyer & Invoice Meta Grid */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-300 p-4 rounded-md mb-5">
        <div>
          <div className="text-[11px] font-mono-num font-bold uppercase text-slate-500 tracking-wider mb-1">
            Billed To (Customer)
          </div>
          <div className="font-bold text-slate-900 text-sm">
            {invoice.customerName || 'Walk-in Customer'}
          </div>
          {invoice.customerPhone && (
            <div className="text-xs text-slate-700 font-mono-num mt-0.5">
              Phone: {invoice.customerPhone}
            </div>
          )}
          {invoice.customerAddress && (
            <div className="text-xs text-slate-600 mt-0.5">{invoice.customerAddress}</div>
          )}
          {!isNoGstSheet && invoice.customerGst ? (
            <div className="text-xs font-mono-num text-blue-700 font-bold mt-1">
              GSTIN: {invoice.customerGst}
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono-num mt-0.5">
              {isNoGstSheet ? 'Retail / Cash Customer' : 'Unregistered Consumer'}
            </div>
          )}
        </div>

        <div className="space-y-1 text-right">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono-num">
              {isNoGstSheet ? 'Bill Number:' : 'Invoice Number:'}
            </span>
            <span className="font-bold text-slate-900 font-mono-num">
              {invoice.number}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono-num">Date:</span>
            <span className="font-mono-num text-slate-800">
              {new Date(invoice.date).toLocaleDateString('en-IN', {
                dateStyle: 'medium',
              })}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono-num">Time:</span>
            <span className="font-mono-num text-slate-800">
              {new Date(invoice.date).toLocaleTimeString('en-IN', {
                timeStyle: 'short',
              })}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono-num">Bill Type:</span>
            <span className="font-mono-num text-slate-800 font-semibold">
              {isNoGstSheet
                ? 'Without GST (0% Tax)'
                : norm.taxType === 'intra_state'
                ? 'Intra-State (Tamil Nadu)'
                : 'Inter-State'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono-num">Payment Mode:</span>
            <span className="font-bold text-slate-900 uppercase font-mono-num">
              {norm.paymentMethod} ({norm.paymentStatus.toUpperCase()})
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="border border-slate-300 rounded-md overflow-hidden mb-5">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-100 text-slate-800 font-mono-num uppercase border-b border-slate-300">
            <tr>
              <th className="py-2.5 px-2.5 w-8 text-center">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-2 text-center">HSN</th>
              <th className="py-2.5 px-2.5 text-right">Qty</th>
              <th className="py-2.5 px-2.5 text-right">Rate</th>
              <th className="py-2.5 px-2 text-right">Disc</th>
              {!isNoGstSheet && (
                <>
                  <th className="py-2.5 px-2.5 text-right">Taxable</th>
                  <th className="py-2.5 px-2 text-center">GST%</th>
                  <th className="py-2.5 px-2.5 text-right">Tax Amt</th>
                </>
              )}
              <th className="py-2.5 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {norm.items.map((it) => (
              <tr key={it.index} className="print-break-inside-avoid">
                <td className="py-2.5 px-2.5 text-center font-mono-num text-slate-500">
                  {it.index}
                </td>
                <td className="py-2.5 px-3 font-semibold text-slate-900">
                  {it.name}
                  <span className="text-[10px] text-slate-500 font-mono-num block font-normal">
                    SKU: {it.sku}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center font-mono-num text-slate-600">
                  {it.hsnCode}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono-num">
                  {it.qty} {it.unit}
                </td>
                <td className="py-2.5 px-2.5 text-right font-mono-num">
                  ₹{it.price.toFixed(2)}
                </td>
                <td className="py-2.5 px-2 text-right font-mono-num text-slate-500">
                  {it.itemDiscAmt > 0 ? `₹${it.itemDiscAmt.toFixed(2)}` : '—'}
                </td>
                {!isNoGstSheet && (
                  <>
                    <td className="py-2.5 px-2.5 text-right font-mono-num">
                      ₹{it.itemTaxable.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono-num">
                      {it.itemTaxRate}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono-num">
                      ₹{it.itemTaxAmt.toFixed(2)}
                    </td>
                  </>
                )}
                <td className="py-2.5 px-3 text-right font-mono-num font-bold text-slate-900">
                  ₹{it.itemTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Totals & Bank Details */}
      <div className="grid grid-cols-12 gap-6 items-start mb-6 print-break-inside-avoid">
        {/* Left: Amount in Words & Bank Details */}
        <div className="col-span-7 space-y-3.5">
          <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs">
            <span className="text-[10px] font-mono-num uppercase text-slate-500 font-semibold block mb-0.5">
              Amount in Words
            </span>
            <span className="font-bold text-slate-900 italic block">
              {numberToWordsINR(norm.total)}
            </span>
          </div>

          <div className="p-3 border border-dashed border-slate-400 rounded text-xs space-y-1">
            <div className="font-bold text-slate-900 text-[11px] uppercase font-mono-num">
              Bank Details for Direct RTGS / NEFT / UPI:
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-slate-700 font-mono-num">
              <div>Bank: {shopInfo.bankDetails.bankName}</div>
              <div>A/C No: {shopInfo.bankDetails.accountNo}</div>
              <div>IFSC: {shopInfo.bankDetails.ifsc}</div>
              <div>UPI ID: {shopInfo.bankDetails.upiId}</div>
            </div>
          </div>
        </div>

        {/* Right: Summary Box */}
        <div className="col-span-5 bg-slate-50 p-4 rounded-md border border-slate-300 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-mono-num">₹{norm.subtotal.toFixed(2)}</span>
          </div>

          {norm.discountAmt > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount ({norm.discountPct}%):</span>
              <span className="font-mono-num">−₹{norm.discountAmt.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold">
            <span className="text-slate-800">
              {isNoGstSheet ? 'Net Bill Value:' : 'Taxable Value:'}
            </span>
            <span className="font-mono-num">₹{norm.taxableAmount.toFixed(2)}</span>
          </div>

          {isNoGstSheet ? (
            <div className="border-t border-slate-200 pt-1.5 flex justify-between text-slate-500">
              <span>GST (Without GST Bill):</span>
              <span className="font-mono-num">₹0.00 (0%)</span>
            </div>
          ) : (
            <div className="border-t border-slate-200 pt-1.5 space-y-1">
              {norm.taxType === 'intra_state' ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST Total:</span>
                    <span className="font-mono-num">+₹{norm.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST Total:</span>
                    <span className="font-mono-num">+₹{norm.sgstAmount.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST Total:</span>
                  <span className="font-mono-num">+₹{norm.igstAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {norm.roundOff !== 0 && (
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Round Off:</span>
              <span className="font-mono-num">
                {norm.roundOff > 0
                  ? `+₹${norm.roundOff.toFixed(2)}`
                  : `−₹${Math.abs(norm.roundOff).toFixed(2)}`}
              </span>
            </div>
          )}

          <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center text-slate-900 font-bold text-base">
            <span className="font-display tracking-tight">Grand Total:</span>
            <span className={`font-mono-num text-lg ${isNoGstSheet ? 'text-orange-600' : 'text-blue-700'}`}>
              ₹{norm.total.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-700">
            <span>Amount Paid:</span>
            <span className="font-mono-num font-bold text-slate-900">
              ₹{norm.amountPaid.toFixed(2)}
            </span>
          </div>

          {norm.balanceDue > 0 && (
            <div className="flex justify-between text-red-600 font-bold">
              <span>Balance Due (Khata):</span>
              <span className="font-mono-num">₹{norm.balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Terms & Authorised Signatory */}
      <div className="grid grid-cols-2 gap-6 items-end border-t border-slate-300 pt-5 print-break-inside-avoid">
        <div>
          <div className="text-[11px] font-mono-num font-bold uppercase text-slate-600 mb-1">
            Terms &amp; Conditions:
          </div>
          <pre className="text-[10px] text-slate-600 font-sans whitespace-pre-wrap leading-relaxed">
            {shopInfo.invoiceTerms}
          </pre>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold text-slate-900">
            For {shopInfo.name}
          </div>
          <div className="h-14" />
          <div className="text-[11px] font-semibold text-slate-700 border-t border-slate-400 inline-block pt-1 px-4">
            Authorised Signatory
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs font-mono-num text-slate-500 mt-6 pt-3 border-t border-slate-200">
        {shopInfo.invoiceFooter}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white py-6 print:py-0 px-4 print:px-0 font-sans text-slate-900">
      {/* Top Action Bar — Hidden automatically during printing */}
      <div className="max-w-[210mm] mx-auto mb-5 bg-slate-900 text-white rounded-xl px-5 py-4 shadow-lg space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-wide uppercase text-orange-400">
                  Print Preview — Bill #{invoice.number}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono-num">
                  <CheckCircle2 className="w-3 h-3" /> A4 Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Both GST Tax Invoice (₹{normGst.total.toFixed(2)}) and Without GST Bill (₹{normNoGst.total.toFixed(2)}) are ready below
              </p>
            </div>
          </div>

          {/* Format Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setBillMode('both')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                billMode === 'both'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Show Both (With &amp; Without GST)
            </button>
            <button
              onClick={() => setBillMode('gst')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                billMode === 'gst'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Only GST Invoice
            </button>
            <button
              onClick={() => setBillMode('without_gst')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                billMode === 'without_gst'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Only Without GST Bill
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDirectPrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Current View (Ctrl + P)</span>
            </button>

            <button
              onClick={() => triggerDedicatedInvoicePrint(invoice, shopInfo, true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill Without GST (₹{normNoGst.total.toFixed(2)})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadGstPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>PDF (With GST)</span>
            </button>

            <button
              onClick={handleDownloadNoGstPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-orange-500/60 text-orange-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>PDF (Without GST)</span>
            </button>

            {invoice.customerPhone && (
              <button
                onClick={() => handleShareWhatsApp(billMode === 'without_gst')}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Printable Container */}
      <div id="invoice-printable-container">
        {/* 1. GST Tax Invoice Sheet */}
        {(billMode === 'gst' || billMode === 'both') && renderInvoiceSheet(normGst, false)}

        {/* Section Divider in Screen Preview when showing both */}
        {billMode === 'both' && (
          <div className="max-w-[210mm] mx-auto my-6 bg-orange-950 text-white rounded-xl px-5 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-orange-400" />
              <div>
                <div className="font-display font-bold text-sm text-orange-300 uppercase">
                  Bill Without GST (0% Tax Cash / Estimate Bill) — Generated Below
                </div>
                <div className="text-[11px] text-orange-200/80">
                  Same items without GST — Net Payable: ₹{normNoGst.total.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerDedicatedInvoicePrint(invoice, shopInfo, true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Only Without GST Bill</span>
              </button>
              <button
                onClick={handleDownloadNoGstPdf}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-orange-900 hover:bg-orange-50 font-bold text-xs rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Without GST PDF</span>
              </button>
            </div>
          </div>
        )}

        {/* Page Break between GST Invoice and Without GST Bill when printing both */}
        {billMode === 'both' && <div className="hidden print:block" style={{ pageBreakBefore: 'always' }} />}

        {/* 2. Without GST Bill Sheet (Generated Down Below) */}
        {(billMode === 'without_gst' || billMode === 'both') && renderInvoiceSheet(normNoGst, true)}
      </div>
    </div>
  );
};
