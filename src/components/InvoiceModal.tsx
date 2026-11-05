import React, { useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  Printer,
  Download,
  Share2,
  X,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  QrCode,
} from 'lucide-react';
import { Invoice, ShopInfo } from '../types';
import { formatINR, numberToWordsINR } from '../utils/numberToWords';

interface InvoiceModalProps {
  invoice: Invoice | null;
  shopInfo: ShopInfo;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  invoice,
  shopInfo,
  onClose,
}) => {
  if (!invoice) return null;

  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let y = 14;

    // Header Shop Info
    try {
      if (shopInfo.logo) {
        doc.addImage(shopInfo.logo, 'JPEG', margin, y, 22, 14);
      }
    } catch (e) {
      // ignore logo failure in pdf
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(shopInfo.name, margin + 26, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `${shopInfo.addressLine1}, ${shopInfo.addressLine2}, ${shopInfo.city} - ${shopInfo.pincode}`,
      margin + 26,
      y + 10
    );
    doc.text(
      `Phone: ${shopInfo.phone}  |  Email: ${shopInfo.email}  |  GSTIN: ${shopInfo.gst}`,
      margin + 26,
      y + 14
    );

    y += 22;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // Invoice Meta & Customer Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TAX INVOICE', margin, y);
    doc.text(`Invoice No: ${invoice.number}`, pageWidth - margin - 50, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(
      `Date: ${new Date(invoice.date).toLocaleDateString('en-IN', {
        dateStyle: 'medium',
      })} ${new Date(invoice.date).toLocaleTimeString('en-IN', { timeStyle: 'short' })}`,
      pageWidth - margin - 50,
      y
    );
    doc.text(`Place of Supply: ${shopInfo.state} (${shopInfo.stateCode})`, pageWidth - margin - 50, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.text('Billed To (Customer):', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customerName || 'Walk-in Customer', margin, y + 4);
    if (invoice.customerPhone) {
      doc.text(`Phone: ${invoice.customerPhone}`, margin, y + 8);
    }
    if (invoice.customerGst) {
      doc.text(`GSTIN: ${invoice.customerGst}`, margin, y + 12);
    }

    y += 20;

    // Items Table Header
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', margin, y);
    doc.text('Item Description', margin + 8, y);
    doc.text('HSN', margin + 70, y);
    doc.text('Qty', margin + 88, y);
    doc.text('Rate', margin + 104, y);
    doc.text('GST%', margin + 124, y);
    doc.text('Taxable', margin + 142, y);
    doc.text('Total', pageWidth - margin, y, { align: 'right' });

    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // Items Rows
    doc.setFont('helvetica', 'normal');
    invoice.items.forEach((item, index) => {
      const itemDesc = item.name.length > 36 ? item.name.substring(0, 36) + '...' : item.name;
      doc.text(String(index + 1), margin, y);
      doc.text(itemDesc, margin + 8, y);
      doc.text(item.hsnCode || '4412', margin + 70, y);
      doc.text(`${item.qty} ${item.unit}`, margin + 88, y);
      doc.text(`Rs.${item.price.toFixed(2)}`, margin + 104, y);
      doc.text(`${item.taxRate}%`, margin + 124, y);
      doc.text(`Rs.${item.taxableAmount.toFixed(2)}`, margin + 142, y);
      doc.text(`Rs.${item.total.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
      y += 5;
    });

    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Totals Area
    const rightAlignX = pageWidth - margin;
    const totalsLabelX = pageWidth - margin - 60;

    doc.setFontSize(9);
    doc.text('Subtotal:', totalsLabelX, y);
    doc.text(`Rs.${invoice.subtotal.toFixed(2)}`, rightAlignX, y, { align: 'right' });
    y += 5;

    if (invoice.discountAmt > 0) {
      doc.text(`Discount (${invoice.discountPct}%):`, totalsLabelX, y);
      doc.text(`-Rs.${invoice.discountAmt.toFixed(2)}`, rightAlignX, y, { align: 'right' });
      y += 5;
    }

    doc.text('Taxable Amount:', totalsLabelX, y);
    doc.text(`Rs.${invoice.taxableAmount.toFixed(2)}`, rightAlignX, y, { align: 'right' });
    y += 5;

    if (invoice.taxType === 'intra_state') {
      doc.text('CGST Total:', totalsLabelX, y);
      doc.text(`+Rs.${invoice.cgstAmount.toFixed(2)}`, rightAlignX, y, { align: 'right' });
      y += 5;
      doc.text('SGST Total:', totalsLabelX, y);
      doc.text(`+Rs.${invoice.sgstAmount.toFixed(2)}`, rightAlignX, y, { align: 'right' });
      y += 5;
    } else {
      doc.text('IGST Total:', totalsLabelX, y);
      doc.text(`+Rs.${invoice.igstAmount.toFixed(2)}`, rightAlignX, y, { align: 'right' });
      y += 5;
    }

    if (invoice.roundOff !== 0) {
      doc.text('Round Off:', totalsLabelX, y);
      doc.text(`Rs.${invoice.roundOff.toFixed(2)}`, rightAlignX, y, { align: 'right' });
      y += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Grand Total:', totalsLabelX, y);
    doc.text(`Rs.${invoice.total.toFixed(2)}`, rightAlignX, y, { align: 'right' });
    y += 8;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text(numberToWordsINR(invoice.total), margin, y);
    y += 10;

    // Terms and Sign
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Terms & Conditions:', margin, y);
    y += 4;
    const splitTerms = doc.splitTextToSize(shopInfo.invoiceTerms, 100);
    doc.text(splitTerms, margin, y);

    doc.setFont('helvetica', 'bold');
    doc.text(`For ${shopInfo.name}`, pageWidth - margin - 50, y);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorised Signatory', pageWidth - margin - 50, y + 16);

    doc.save(`${invoice.number}.pdf`);
  };

  const handleShareWhatsApp = () => {
    if (!invoice.customerPhone) {
      alert('No phone number provided for this customer.');
      return;
    }

    let phone = invoice.customerPhone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const itemsSummary = invoice.items
      .map(
        (it) =>
          `• ${it.name} - ${it.qty} ${it.unit} @ ₹${it.price.toFixed(2)} = ₹${it.total.toFixed(2)}`
      )
      .join('\n');

    const message = `*INVOICE: ${invoice.number}*
*${shopInfo.name}*
${shopInfo.addressLine1}, ${shopInfo.city}
GSTIN: ${shopInfo.gst}
Phone: ${shopInfo.phone}

Date: ${new Date(invoice.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
Customer: ${invoice.customerName}
${invoice.customerGst ? 'Customer GSTIN: ' + invoice.customerGst + '\n' : ''}
*Items:*
${itemsSummary}

Subtotal: ₹${invoice.subtotal.toFixed(2)}
Discount: ₹${invoice.discountAmt.toFixed(2)}
Taxable: ₹${invoice.taxableAmount.toFixed(2)}
Total GST: ₹${invoice.taxAmt.toFixed(2)}
*Grand Total: ₹${invoice.total.toFixed(2)}*
Payment Mode: ${invoice.paymentMethod.toUpperCase()}
Amount Paid: ₹${invoice.amountPaid.toFixed(2)}
${invoice.balanceDue > 0 ? `*Outstanding Balance: ₹${invoice.balanceDue.toFixed(2)}*\n` : ''}
${numberToWordsINR(invoice.total)}

_Thank you for your business!_`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto app-modal-backdrop-overlay">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col my-auto border border-slate-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 rounded-t-lg no-print">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-lg text-slate-900">
              Invoice #{invoice.number}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                invoice.paymentStatus === 'paid'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : invoice.paymentStatus === 'partial'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : invoice.paymentStatus === 'returned'
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {invoice.paymentStatus.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {invoice.customerPhone && (
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-md transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div
          ref={printAreaRef}
          id="invoice-printable-container"
          className="p-8 overflow-y-auto bg-white text-slate-800 text-sm print-area-only"
        >
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
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono-num font-semibold text-xs rounded tracking-wider uppercase mb-1.5">
                TAX INVOICE
              </span>
              <div className="text-xs text-slate-500 font-mono-num">
                (Original for Recipient)
              </div>
              <div className="mt-2 text-xs font-mono-num">
                <span className="text-slate-500">GSTIN: </span>
                <span className="font-semibold text-slate-900 font-mono-num">
                  {shopInfo.gst}
                </span>
              </div>
              <div className="text-xs font-mono-num">
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
                Billed To (Buyer)
              </div>
              <div className="font-semibold text-slate-900 text-sm">
                {invoice.customerName}
              </div>
              {invoice.customerPhone && (
                <div className="text-xs text-slate-600 font-mono-num">
                  Phone: {invoice.customerPhone}
                </div>
              )}
              {invoice.customerAddress && (
                <div className="text-xs text-slate-600">{invoice.customerAddress}</div>
              )}
              {invoice.customerGst ? (
                <div className="text-xs font-mono-num text-blue-700 font-semibold mt-1">
                  GSTIN: {invoice.customerGst}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-mono-num">Unregistered Consumer</div>
              )}
            </div>

            <div className="space-y-1 text-right">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-mono-num">Invoice Number:</span>
                <span className="font-bold text-slate-900 font-mono-num">
                  {invoice.number}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-mono-num">Invoice Date:</span>
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
                <span className="text-slate-500 font-mono-num">Place of Supply:</span>
                <span className="font-mono-num text-slate-800">
                  {invoice.taxType === 'intra_state' ? 'Intra-State (Tamil Nadu)' : 'Inter-State'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-mono-num">Payment Mode:</span>
                <span className="font-semibold text-slate-800 uppercase font-mono-num">
                  {invoice.paymentMethod}
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
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-center">GST%</th>
                  <th className="py-2.5 px-3 text-right">Tax Amt</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 print-break-inside-avoid">
                    <td className="py-2.5 px-3 text-center font-mono-num text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {it.name}
                      <span className="text-[10px] text-slate-400 font-mono-num block">
                        SKU: {it.sku}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono-num text-slate-600">
                      {it.hsnCode || '4412'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num">
                      {it.qty} {it.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num">
                      ₹{it.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num text-slate-500">
                      {it.itemDiscountAmt && it.itemDiscountAmt > 0
                        ? `₹${it.itemDiscountAmt.toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num">
                      ₹{it.taxableAmount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono-num">
                      {it.taxRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num">
                      ₹{(it.cgstAmount + it.sgstAmount + it.igstAmount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                      ₹{it.total.toFixed(2)}
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
                  {numberToWordsINR(invoice.total)}
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
                <span className="font-mono-num">₹{invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.discountAmt > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({invoice.discountPct}%):</span>
                  <span className="font-mono-num">−₹{invoice.discountAmt.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-medium">
                <span className="text-slate-700">Taxable Value:</span>
                <span className="font-mono-num">₹{invoice.taxableAmount.toFixed(2)}</span>
              </div>

              <div className="border-t border-slate-200 pt-1.5 space-y-1">
                {invoice.taxType === 'intra_state' ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST Total:</span>
                      <span className="font-mono-num">+₹{invoice.cgstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST Total:</span>
                      <span className="font-mono-num">+₹{invoice.sgstAmount.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST Total:</span>
                    <span className="font-mono-num">+₹{invoice.igstAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Round Off:</span>
                  <span className="font-mono-num">{invoice.roundOff > 0 ? `+₹${invoice.roundOff.toFixed(2)}` : `−₹${Math.abs(invoice.roundOff).toFixed(2)}`}</span>
                </div>
              )}

              <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center text-slate-900 font-bold text-base">
                <span className="font-display tracking-tight">Grand Total:</span>
                <span className="font-mono-num text-blue-700 text-lg">
                  ₹{invoice.total.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-mono-num font-semibold text-slate-800">
                  ₹{invoice.amountPaid.toFixed(2)}
                </span>
              </div>

              {invoice.balanceDue > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>Balance Due (Khata):</span>
                  <span className="font-mono-num">₹{invoice.balanceDue.toFixed(2)}</span>
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
      </div>
    </div>
  );
};
