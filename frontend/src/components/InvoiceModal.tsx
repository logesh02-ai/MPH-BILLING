import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  Share2,
  X,
  FileText,
} from 'lucide-react';
import { Invoice, ShopInfo } from '../types';
import { numberToWordsINR } from '../utils/numberToWords';
import {
  downloadInvoicePdf,
  normalizeInvoiceForOutput,
  triggerDedicatedInvoicePrint,
} from '../utils/pdfGenerator';

interface InvoiceModalProps {
  invoice: Invoice | null;
  shopInfo: ShopInfo;
  onClose: () => void;
  onOpenPrintPage?: (invoice: Invoice) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  shopInfo,
  onClose,
  onOpenPrintPage,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'both' | 'gst' | 'without_gst'>('both');

  if (!invoice) return null;

  const normGst = normalizeInvoiceForOutput(invoice, false);
  const normNoGst = normalizeInvoiceForOutput(invoice, true);

  const handlePrint = () => {
    if (onOpenPrintPage) {
      onOpenPrintPage(invoice);
    } else {
      triggerDedicatedInvoicePrint(invoice, shopInfo, viewMode === 'without_gst');
    }
  };

  const handlePrintWithoutGst = () => {
    triggerDedicatedInvoicePrint(invoice, shopInfo, true);
  };

  const handleDownloadGstPdf = () => {
    downloadInvoicePdf(invoice, shopInfo, false);
  };

  const handleDownloadNoGstPdf = () => {
    downloadInvoicePdf(invoice, shopInfo, true);
  };

  const handleShareWhatsApp = (withoutGst = false) => {
    if (!invoice.customerPhone) {
      return;
    }

    let phone = invoice.customerPhone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const targetNorm = withoutGst ? normNoGst : normGst;
    const itemsSummary = targetNorm.items
      .map(
        (it) =>
          `• ${it.name} - ${it.qty} ${it.unit} @ ₹${it.price.toFixed(2)} = ₹${it.itemTotal.toFixed(2)}`
      )
      .join('\n');

    const message = `*${withoutGst ? 'BILL (WITHOUT GST)' : 'INVOICE'}: ${invoice.number}*
*${shopInfo.name}*
${shopInfo.addressLine1}, ${shopInfo.city}
${!withoutGst ? `GSTIN: ${shopInfo.gst}\n` : ''}Phone: ${shopInfo.phone}

Date: ${new Date(invoice.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
Customer: ${invoice.customerName}
${!withoutGst && invoice.customerGst ? 'Customer GSTIN: ' + invoice.customerGst + '\n' : ''}*Items:*
${itemsSummary}

Subtotal: ₹${targetNorm.subtotal.toFixed(2)}
Discount: ₹${targetNorm.discountAmt.toFixed(2)}
${!withoutGst ? `Taxable: ₹${targetNorm.taxableAmount.toFixed(2)}\nTotal GST: ₹${targetNorm.taxAmt.toFixed(2)}\n` : ''}*Grand Total: ₹${targetNorm.total.toFixed(2)}*
Payment Mode: ${targetNorm.paymentMethod.toUpperCase()}
Amount Paid: ₹${targetNorm.amountPaid.toFixed(2)}
${targetNorm.balanceDue > 0 ? `*Outstanding Balance: ₹${targetNorm.balanceDue.toFixed(2)}*\n` : ''}${numberToWordsINR(targetNorm.total)}

_Thank you for your business!_`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderBillSheet = (norm: ReturnType<typeof normalizeInvoiceForOutput>, isNoGst: boolean) => (
    <div className="bg-white border border-slate-200 rounded-lg p-6 text-slate-800 text-sm shadow-xs">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-300 pb-5 mb-5">
        <div className="flex gap-4 items-center">
          <div className="bg-white p-1 border border-slate-200 rounded shadow-xs w-20 flex-shrink-0">
            <img
              src={shopInfo.logo}
              alt={shopInfo.name}
              className="w-full h-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight">
              {shopInfo.name}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {shopInfo.addressLine1}, {shopInfo.addressLine2}
            </p>
            <p className="text-xs text-slate-600">
              {shopInfo.city}, {shopInfo.state} - {shopInfo.pincode}
            </p>
            <p className="text-xs font-mono-num text-slate-700 mt-1">
              Phone: {shopInfo.phone} | Email: {shopInfo.email}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-3 py-1 text-white font-mono-num font-semibold text-xs rounded tracking-wider uppercase mb-1.5 ${
              isNoGst ? 'bg-orange-600' : 'bg-slate-900'
            }`}
          >
            {isNoGst ? 'BILL (WITHOUT GST)' : 'TAX INVOICE'}
          </span>
          <div className="text-xs text-slate-500 font-mono-num">
            {isNoGst ? '(Retail Cash Memo / Estimate)' : '(Original for Recipient)'}
          </div>
          {!isNoGst && (
            <div className="mt-2 text-xs font-mono-num">
              <span className="text-slate-500">GSTIN: </span>
              <span className="font-semibold text-slate-900 font-mono-num">
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

      {/* Invoice Meta Grid */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50/80 border border-slate-200 p-4 rounded-md mb-6">
        <div>
          <div className="text-[11px] font-mono-num font-semibold uppercase text-slate-400 tracking-wider mb-1">
            Billed To (Customer)
          </div>
          <div className="font-semibold text-slate-900 text-sm">
            {invoice.customerName || 'Walk-in Customer'}
          </div>
          {invoice.customerPhone && (
            <div className="text-xs text-slate-600 font-mono-num">
              Phone: {invoice.customerPhone}
            </div>
          )}
          {invoice.customerAddress && (
            <div className="text-xs text-slate-600">{invoice.customerAddress}</div>
          )}
          {!isNoGst && invoice.customerGst ? (
            <div className="text-xs font-mono-num text-blue-700 font-semibold mt-1">
              GSTIN: {invoice.customerGst}
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-mono-num">
              {isNoGst ? 'Retail / Cash Customer' : 'Unregistered Consumer'}
            </div>
          )}
        </div>

        <div className="space-y-1 text-right">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono-num">
              {isNoGst ? 'Bill Number:' : 'Invoice Number:'}
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
              {isNoGst
                ? 'Without GST (0% Tax)'
                : norm.taxType === 'intra_state'
                ? 'Intra-State (Tamil Nadu)'
                : 'Inter-State'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono-num">Payment Mode:</span>
            <span className="font-semibold text-slate-800 uppercase font-mono-num">
              {norm.paymentMethod}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="border border-slate-300 rounded-md overflow-hidden mb-6">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-mono-num uppercase border-b border-slate-300">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3 text-center">HSN</th>
              <th className="py-2.5 px-3 text-right">Qty</th>
              <th className="py-2.5 px-3 text-right">Rate</th>
              <th className="py-2.5 px-3 text-right">Disc</th>
              {!isNoGst && (
                <>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-center">GST%</th>
                  <th className="py-2.5 px-3 text-right">Tax Amt</th>
                </>
              )}
              <th className="py-2.5 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {norm.items.map((it) => (
              <tr key={it.index} className="hover:bg-slate-50/50 print-break-inside-avoid">
                <td className="py-2.5 px-3 text-center font-mono-num text-slate-500">
                  {it.index}
                </td>
                <td className="py-2.5 px-3 font-medium text-slate-900">
                  {it.name}
                  <span className="text-[10px] text-slate-400 font-mono-num block">
                    SKU: {it.sku}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-mono-num text-slate-600">
                  {it.hsnCode}
                </td>
                <td className="py-2.5 px-3 text-right font-mono-num">
                  {it.qty} {it.unit}
                </td>
                <td className="py-2.5 px-3 text-right font-mono-num">
                  ₹{it.price.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono-num text-slate-500">
                  {it.itemDiscAmt > 0 ? `₹${it.itemDiscAmt.toFixed(2)}` : '—'}
                </td>
                {!isNoGst && (
                  <>
                    <td className="py-2.5 px-3 text-right font-mono-num">
                      ₹{it.itemTaxable.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono-num">
                      {it.itemTaxRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num">
                      ₹{it.itemTaxAmt.toFixed(2)}
                    </td>
                  </>
                )}
                <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                  ₹{it.itemTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Totals & Calculations Grid */}
      <div className="grid grid-cols-12 gap-6 items-start mb-6 print-break-inside-avoid">
        {/* Left Note & Bank details */}
        <div className="col-span-7 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
            <span className="text-[11px] font-mono-num uppercase text-slate-400 block mb-0.5">
              Amount in Words
            </span>
            <span className="font-semibold text-slate-800 italic block">
              {numberToWordsINR(norm.total)}
            </span>
          </div>

          {/* Bank Details */}
          <div className="p-3 border border-dashed border-slate-300 rounded text-xs space-y-1">
            <div className="font-semibold text-slate-800 text-[11px] uppercase font-mono-num">
              Bank Details for Direct RTGS/NEFT/UPI:
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono-num">
              <div>Bank: {shopInfo.bankDetails.bankName}</div>
              <div>A/C No: {shopInfo.bankDetails.accountNo}</div>
              <div>IFSC: {shopInfo.bankDetails.ifsc}</div>
              <div>UPI ID: {shopInfo.bankDetails.upiId}</div>
            </div>
          </div>
        </div>

        {/* Right Summary Table */}
        <div className="col-span-5 bg-slate-50/60 p-4 rounded-md border border-slate-200 space-y-2 text-xs">
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

          <div className="flex justify-between font-medium">
            <span className="text-slate-700">
              {isNoGst ? 'Net Bill Amount:' : 'Taxable Value:'}
            </span>
            <span className="font-mono-num">₹{norm.taxableAmount.toFixed(2)}</span>
          </div>

          {isNoGst ? (
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
            <span className={`font-mono-num text-lg ${isNoGst ? 'text-orange-600' : 'text-blue-700'}`}>
              ₹{norm.total.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-600">
            <span>Amount Paid:</span>
            <span className="font-mono-num font-semibold text-slate-800">
              ₹{norm.amountPaid.toFixed(2)}
            </span>
          </div>

          {norm.balanceDue > 0 && (
            <div className="flex justify-between text-red-600 font-semibold">
              <span>Balance Due (Khata):</span>
              <span className="font-mono-num">₹{norm.balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Terms & Authorised Signature */}
      <div className="grid grid-cols-2 gap-6 items-end border-t border-slate-300 pt-5 print-break-inside-avoid">
        <div>
          <div className="text-[11px] font-mono-num font-semibold uppercase text-slate-500 mb-1">
            Terms &amp; Conditions:
          </div>
          <pre className="text-[10px] text-slate-500 font-sans whitespace-pre-wrap leading-relaxed">
            {shopInfo.invoiceTerms}
          </pre>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold text-slate-900">
            For {shopInfo.name}
          </div>
          <div className="h-14" />
          <div className="text-[11px] font-medium text-slate-600 border-t border-slate-300 inline-block pt-1 px-4">
            Authorised Signatory
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-xs font-mono-num text-slate-400 mt-6 pt-3 border-t border-slate-200">
        {shopInfo.invoiceFooter}
      </div>
    </div>
  );

  return (
    <div
      id="invoice-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="invoice-modal-card"
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col my-auto border border-slate-200"
      >
        {/* Modal Top Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 border-b border-slate-200 bg-slate-50 rounded-t-lg no-print">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-lg text-slate-900">
              Invoice #{invoice.number}
            </span>
            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setViewMode('both')}
                className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                  viewMode === 'both'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Both (With &amp; Without GST)
              </button>
              <button
                onClick={() => setViewMode('gst')}
                className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                  viewMode === 'gst'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GST Invoice
              </button>
              <button
                onClick={() => setViewMode('without_gst')}
                className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                  viewMode === 'without_gst'
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Without GST Bill
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Page</span>
            </button>

            <button
              onClick={handlePrintWithoutGst}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Without GST</span>
            </button>

            <button
              onClick={handleDownloadGstPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>PDF (With GST)</span>
            </button>

            <button
              onClick={handleDownloadNoGstPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-800 bg-orange-50 border border-orange-300 hover:bg-orange-100 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-orange-600" />
              <span>PDF (Without GST)</span>
            </button>

            {invoice.customerPhone && (
              <button
                onClick={() => handleShareWhatsApp(viewMode === 'without_gst')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div
          ref={printAreaRef}
          id="invoice-printable-container"
          className="p-6 overflow-y-auto bg-slate-100 space-y-6 print-area-only"
        >
          {/* 1. GST Tax Invoice */}
          {(viewMode === 'gst' || viewMode === 'both') && renderBillSheet(normGst, false)}

          {/* 2. Down Below: Without GST Bill Banner & Sheet */}
          {(viewMode === 'without_gst' || viewMode === 'both') && (
            <>
              <div className="bg-orange-950 text-white rounded-lg px-5 py-3 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-orange-400" />
                  <div>
                    <div className="font-display font-bold text-xs uppercase text-orange-300">
                      Bill Without GST (0% Tax Cash / Estimate Bill) — Generated Below
                    </div>
                    <div className="text-[11px] text-orange-200/80">
                      Net Payable Without GST: ₹{normNoGst.total.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintWithoutGst}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-md cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Without GST Bill</span>
                  </button>
                  <button
                    onClick={handleDownloadNoGstPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-950 hover:bg-orange-50 font-bold text-xs rounded-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Without GST PDF</span>
                  </button>
                </div>
              </div>

              {renderBillSheet(normNoGst, true)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
