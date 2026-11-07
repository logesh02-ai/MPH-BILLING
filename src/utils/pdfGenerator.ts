import { jsPDF } from 'jspdf';
import { Invoice, ShopInfo } from '../types';
import { numberToWordsINR } from './numberToWords';

/**
 * Normalizes all numeric fields on an invoice (including legacy HW-0001..0003 records)
 */
export function normalizeInvoiceForOutput(invoice: Invoice, forceWithoutGst = false) {
  const subtotal = Number(invoice.subtotal) || 0;
  const discountPct = Number(invoice.discountPct) || 0;
  const discountAmt = Number(invoice.discountAmt) || 0;
  const isWithoutGst = forceWithoutGst || invoice.taxType === 'none';
  const rawTaxAmt = isWithoutGst ? 0 : Number(invoice.taxAmt) || 0;
  const rawTotal = Number(invoice.total) || 0;
  const rawTaxable = Number(invoice.taxableAmount) || 0;

  const taxableAmount =
    rawTaxable > 0
      ? rawTaxable
      : subtotal - discountAmt > 0
      ? Number((subtotal - discountAmt).toFixed(2))
      : Math.max(0, Number((rawTotal - (Number(invoice.taxAmt) || 0)).toFixed(2)));

  const taxAmt = isWithoutGst ? 0 : rawTaxAmt;
  const unroundedTotal = taxableAmount + taxAmt;
  const total = isWithoutGst
    ? Math.round(taxableAmount)
    : rawTotal > 0
    ? rawTotal
    : Math.round(unroundedTotal);
  const effectiveSubtotal = subtotal > 0 ? subtotal : taxableAmount + discountAmt;
  const taxType = isWithoutGst ? 'none' : invoice.taxType || 'intra_state';

  const cgstAmount = isWithoutGst
    ? 0
    : invoice.cgstAmount !== undefined && Number(invoice.cgstAmount) > 0
    ? Number(invoice.cgstAmount)
    : taxType === 'intra_state'
    ? Number((taxAmt / 2).toFixed(2))
    : 0;

  const sgstAmount = isWithoutGst
    ? 0
    : invoice.sgstAmount !== undefined && Number(invoice.sgstAmount) > 0
    ? Number(invoice.sgstAmount)
    : taxType === 'intra_state'
    ? Number((taxAmt / 2).toFixed(2))
    : 0;

  const igstAmount = isWithoutGst
    ? 0
    : invoice.igstAmount !== undefined && Number(invoice.igstAmount) > 0
    ? Number(invoice.igstAmount)
    : taxType === 'inter_state'
    ? Number(taxAmt.toFixed(2))
    : 0;

  const roundOff = Number((total - unroundedTotal).toFixed(2));
  const rawPaid = invoice.amountPaid !== undefined ? Number(invoice.amountPaid) : total;
  const amountPaid = isWithoutGst && rawPaid > total ? total : rawPaid;
  const balanceDue =
    !isWithoutGst && invoice.balanceDue !== undefined
      ? Number(invoice.balanceDue)
      : Math.max(0, Number((total - amountPaid).toFixed(2)));
  const paymentStatus = invoice.paymentStatus || (balanceDue > 0 ? 'partial' : 'paid');
  const paymentMethod = invoice.paymentMethod || 'cash';

  const items = (invoice.items || []).map((it, idx) => {
    const qty = Number(it.qty) || 1;
    const price = Number(it.price) || 0;
    const itemDiscAmt = Number(it.itemDiscountAmt) || 0;
    const itemTaxable =
      Number(it.taxableAmount) > 0
        ? Number(it.taxableAmount)
        : Math.max(0, Number((qty * price - itemDiscAmt).toFixed(2)));
    const itemTaxRate = isWithoutGst
      ? 0
      : it.taxRate !== undefined
      ? Number(it.taxRate)
      : taxableAmount > 0 && taxAmt === 0
      ? 0
      : 18;
    const itemTaxAmt = isWithoutGst
      ? 0
      : (Number(it.cgstAmount) || 0) + (Number(it.sgstAmount) || 0) + (Number(it.igstAmount) || 0) ||
        Number(((itemTaxable * itemTaxRate) / 100).toFixed(2));
    const itemTotal = isWithoutGst
      ? Number(itemTaxable.toFixed(2))
      : Number(it.total) > 0
      ? Number(it.total)
      : Number((itemTaxable + itemTaxAmt).toFixed(2));

    return {
      index: idx + 1,
      name: it.name || 'Item',
      sku: it.sku || `SKU-${idx + 1}`,
      hsnCode: it.hsnCode || '4412',
      qty,
      unit: it.unit || 'Pcs',
      price,
      itemDiscAmt,
      itemTaxable,
      itemTaxRate,
      itemTaxAmt,
      itemTotal,
    };
  });

  return {
    isWithoutGst,
    subtotal: effectiveSubtotal,
    discountPct,
    discountAmt,
    taxableAmount,
    taxAmt,
    taxType,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff,
    total,
    amountPaid,
    balanceDue,
    paymentStatus,
    paymentMethod,
    items,
  };
}

/**
 * Synchronously generates and downloads a professional boxed A4 Invoice PDF file (With GST or Without GST).
 * Runs synchronously inside the click gesture so browsers/iframes never block the file download.
 */
export function downloadInvoicePdf(
  invoice: Invoice,
  shopInfo: ShopInfo,
  forceWithoutGst = false
): void {
  const norm = normalizeInvoiceForOutput(invoice, forceWithoutGst);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pw = doc.internal.pageSize.getWidth(); // 210mm
  const m = 10; // 10mm margin -> 190mm usable width
  const contentW = pw - m * 2;
  let y = 12;

  // 1. HEADER SECTION
  // Logo frame box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(m, y, 24, 17, 1.5, 1.5, 'FD');
  try {
    if (shopInfo.logo) {
      doc.addImage(shopInfo.logo, 'JPEG', m + 1, y + 1, 22, 15);
    }
  } catch {
    // Ignore logo error if any
  }

  // Shop Name & Address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(shopInfo.name.toUpperCase(), m + 27, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${shopInfo.addressLine1}, ${shopInfo.addressLine2}`, m + 27, y + 10);
  doc.text(`${shopInfo.city}, ${shopInfo.state} - ${shopInfo.pincode}`, m + 27, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Phone: ${shopInfo.phone}  |  Email: ${shopInfo.email}`, m + 27, y + 18.2);

  // Right Side: Badge (TAX INVOICE vs CASH / ESTIMATE BILL)
  if (norm.isWithoutGst) {
    doc.setFillColor(234, 88, 12); // Orange badge for Without GST Cash Bill
    doc.roundedRect(pw - m - 44, y, 44, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('BILL (WITHOUT GST)', pw - m - 22, y + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('(Retail Cash Memo / Estimate)', pw - m, y + 10.5, { align: 'right' });
  } else {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(pw - m - 34, y, 34, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TAX INVOICE', pw - m - 17, y + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('(Original for Recipient)', pw - m, y + 10.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`GSTIN: ${shopInfo.gst}`, pw - m, y + 14.8, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`State: ${shopInfo.state} (${shopInfo.stateCode})`, pw - m, y + 18.5, {
    align: 'right',
  });

  y += 22;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(m, y, pw - m, y);
  y += 4.5;

  // 2. BUYER & INVOICE META BOX
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(m, y, contentW, 25, 1.5, 1.5, 'FD');

  // Left: Billed To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO (CUSTOMER)', m + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName || 'Walk-in Customer', m + 4, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let buyerY = y + 14.5;
  if (invoice.customerPhone) {
    doc.text(`Phone: ${invoice.customerPhone}`, m + 4, buyerY);
    buyerY += 4;
  }
  if (invoice.customerAddress) {
    doc.text(invoice.customerAddress.slice(0, 55), m + 4, buyerY);
    buyerY += 4;
  }
  if (!norm.isWithoutGst && invoice.customerGst) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216);
    doc.text(`GSTIN: ${invoice.customerGst}`, m + 4, buyerY);
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text(norm.isWithoutGst ? 'Retail / Cash Customer' : 'Unregistered Consumer', m + 4, buyerY);
  }

  // Right: Invoice Meta
  const metaLabelX = pw - m - 75;
  const metaValX = pw - m - 4;
  doc.setFontSize(8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(norm.isWithoutGst ? 'Bill Number:' : 'Invoice Number:', metaLabelX, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.number, metaValX, y + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Date:', metaLabelX, y + 10);
  doc.setTextColor(30, 41, 59);
  doc.text(
    new Date(invoice.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }),
    metaValX,
    y + 10,
    { align: 'right' }
  );

  doc.setTextColor(100, 116, 139);
  doc.text('Time:', metaLabelX, y + 14.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    new Date(invoice.date).toLocaleTimeString('en-IN', { timeStyle: 'short' }),
    metaValX,
    y + 14.5,
    { align: 'right' }
  );

  doc.setTextColor(100, 116, 139);
  doc.text('Bill Type:', metaLabelX, y + 19);
  doc.setTextColor(30, 41, 59);
  doc.text(
    norm.isWithoutGst
      ? 'Without GST (0% Tax)'
      : norm.taxType === 'intra_state'
      ? 'Intra-State GST (CGST+SGST)'
      : 'Inter-State GST (IGST)',
    metaValX,
    y + 19,
    { align: 'right' }
  );

  doc.setTextColor(100, 116, 139);
  doc.text('Payment Mode:', metaLabelX, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${norm.paymentMethod.toUpperCase()} (${norm.paymentStatus.toUpperCase()})`,
    metaValX,
    y + 23,
    { align: 'right' }
  );

  y += 29;

  // 3. ITEMIZED TABLE
  // Columns X positions (Total width = 190mm, from x=10 to x=200)
  const col = {
    idx: m + 3,
    desc: m + 9,
    hsn: m + 75,
    qty: m + 96,
    rate: m + 116,
    disc: m + 131,
    taxable: m + 151,
    gst: m + 163,
    taxAmt: m + 177,
    total: pw - m - 2,
  };

  // Table Header Bar
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(m, y, contentW, 7.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  doc.text('#', col.idx, y + 5, { align: 'center' });
  doc.text('ITEM DESCRIPTION', col.desc, y + 5);
  doc.text('HSN', col.hsn, y + 5, { align: 'center' });
  doc.text('QTY', col.qty, y + 5, { align: 'right' });
  doc.text('RATE (Rs.)', col.rate, y + 5, { align: 'right' });
  doc.text('DISC', col.disc, y + 5, { align: 'right' });
  doc.text('TAXABLE', col.taxable, y + 5, { align: 'right' });
  doc.text('GST%', col.gst, y + 5, { align: 'center' });
  doc.text('TAX AMT', col.taxAmt, y + 5, { align: 'right' });
  doc.text('TOTAL (Rs.)', col.total, y + 5, { align: 'right' });

  y += 7.5;

  // Table Rows
  norm.items.forEach((it, idx) => {
    const rowH = 8.5;
    if (y + rowH > 265) {
      doc.addPage();
      y = 14;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 252);
      doc.rect(m, y, contentW, rowH, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(m, y, contentW, rowH, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(String(it.index), col.idx, y + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(it.name.slice(0, 36), col.desc, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`SKU: ${it.sku}`, col.desc, y + 7.2);

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(it.hsnCode, col.hsn, y + 5, { align: 'center' });
    doc.text(`${it.qty} ${it.unit}`, col.qty, y + 5, { align: 'right' });
    doc.text(it.price.toFixed(2), col.rate, y + 5, { align: 'right' });
    doc.text(it.itemDiscAmt > 0 ? it.itemDiscAmt.toFixed(2) : '-', col.disc, y + 5, {
      align: 'right',
    });
    doc.text(it.itemTaxable.toFixed(2), col.taxable, y + 5, { align: 'right' });
    doc.text(`${it.itemTaxRate}%`, col.gst, y + 5, { align: 'center' });
    doc.text(it.itemTaxAmt.toFixed(2), col.taxAmt, y + 5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(it.itemTotal.toFixed(2), col.total, y + 5, { align: 'right' });

    y += rowH;
  });

  y += 5;

  if (y + 65 > 282) {
    doc.addPage();
    y = 15;
  }

  // 4. BOTTOM GRID: LEFT (AMOUNT IN WORDS + BANK DETAILS) & RIGHT (SUMMARY TOTALS BOX)
  const leftW = 108;
  const rightW = 78;
  const rightX = pw - m - rightW;

  // Left Box 1: Amount in Words
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(m, y, leftW, 14, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('AMOUNT IN WORDS', m + 3, y + 4.5);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  const wordsLines = doc.splitTextToSize(numberToWordsINR(norm.total), leftW - 6);
  doc.text(wordsLines, m + 3, y + 9.2);

  // Left Box 2: Bank Details
  const bankY = y + 17;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(m, bankY, leftW, 18, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  doc.text('BANK DETAILS FOR DIRECT RTGS / NEFT / UPI:', m + 3, bankY + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank: ${shopInfo.bankDetails.bankName}`, m + 3, bankY + 9.8);
  doc.text(`A/C No: ${shopInfo.bankDetails.accountNo}`, m + 55, bankY + 9.8);
  doc.text(`IFSC: ${shopInfo.bankDetails.ifsc}`, m + 3, bankY + 14.5);
  doc.text(`UPI ID: ${shopInfo.bankDetails.upiId}`, m + 55, bankY + 14.5);

  // Right Box: Summary Card
  const summaryRows: { label: string; value: string; bold?: boolean; color?: [number, number, number] }[] = [
    { label: 'Subtotal:', value: `Rs. ${norm.subtotal.toFixed(2)}` },
  ];
  if (norm.discountAmt > 0) {
    summaryRows.push({
      label: `Discount (${norm.discountPct}%):`,
      value: `-Rs. ${norm.discountAmt.toFixed(2)}`,
      color: [4, 120, 87],
    });
  }
  summaryRows.push({
    label: norm.isWithoutGst ? 'Net Bill Amount:' : 'Taxable Value:',
    value: `Rs. ${norm.taxableAmount.toFixed(2)}`,
    bold: true,
  });
  if (norm.isWithoutGst) {
    summaryRows.push({ label: 'GST (Without GST):', value: 'Rs. 0.00 (0%)' });
  } else if (norm.taxType === 'intra_state') {
    summaryRows.push({ label: 'CGST Total:', value: `+Rs. ${norm.cgstAmount.toFixed(2)}` });
    summaryRows.push({ label: 'SGST Total:', value: `+Rs. ${norm.sgstAmount.toFixed(2)}` });
  } else {
    summaryRows.push({ label: 'IGST Total:', value: `+Rs. ${norm.igstAmount.toFixed(2)}` });
  }
  if (norm.roundOff !== 0) {
    summaryRows.push({
      label: 'Round Off:',
      value: `${norm.roundOff > 0 ? '+' : ''}Rs. ${norm.roundOff.toFixed(2)}`,
    });
  }

  const summaryBoxH = summaryRows.length * 4.8 + 20;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, y, rightW, summaryBoxH, 1.5, 1.5, 'FD');

  let sy = y + 5.5;
  summaryRows.forEach((r) => {
    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    if (r.color) {
      doc.setTextColor(r.color[0], r.color[1], r.color[2]);
    } else {
      doc.setTextColor(71, 85, 105);
    }
    doc.text(r.label, rightX + 3.5, sy);
    doc.text(r.value, rightX + rightW - 3.5, sy, { align: 'right' });
    sy += 4.8;
  });

  // Grand Total Divider
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(rightX + 3.5, sy - 1.5, rightX + rightW - 3.5, sy - 1.5);
  sy += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', rightX + 3.5, sy);
  doc.setTextColor(29, 78, 216);
  doc.text(`Rs. ${norm.total.toFixed(2)}`, rightX + rightW - 3.5, sy, { align: 'right' });

  sy += 5.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Amount Paid:', rightX + 3.5, sy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${norm.amountPaid.toFixed(2)}`, rightX + rightW - 3.5, sy, { align: 'right' });

  if (norm.balanceDue > 0) {
    sy += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Balance Due (Khata):', rightX + 3.5, sy);
    doc.text(`Rs. ${norm.balanceDue.toFixed(2)}`, rightX + rightW - 3.5, sy, { align: 'right' });
  }

  y += Math.max(38, summaryBoxH + 5);

  // 5. TERMS & SIGNATURE SECTION
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(m, y, pw - m, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TERMS & CONDITIONS:', m, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const splitTerms = doc.splitTextToSize(shopInfo.invoiceTerms || '', 115);
  doc.text(splitTerms, m, y + 4);

  // Right Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${shopInfo.name}`, pw - m, y, { align: 'right' });

  doc.setDrawColor(148, 163, 184);
  doc.line(pw - m - 42, y + 14, pw - m, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorised Signatory', pw - m - 21, y + 18, { align: 'center' });

  // Footer
  y += 23;
  doc.setDrawColor(226, 232, 240);
  doc.line(m, y, pw - m, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(shopInfo.invoiceFooter || 'Thank you for your business!', pw / 2, y + 4.5, {
    align: 'center',
  });

  // Trigger immediate browser file download using explicit Blob + <a download>
  const arrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = norm.isWithoutGst
    ? `Bill_Without_GST_${invoice.number}.pdf`
    : `Invoice_${invoice.number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

/**
 * Generates self-contained printable HTML for an invoice and triggers printing via a dedicated iframe
 * + top-level print portal so it works reliably on both local file:// and web preview iframes.
 */
export function triggerDedicatedInvoicePrint(
  invoice: Invoice,
  shopInfo: ShopInfo,
  forceWithoutGst = false
): void {
  const norm = normalizeInvoiceForOutput(invoice, forceWithoutGst);

  const rowsHtml = norm.items
    .map(
      (it) => `
      <tr>
        <td style="text-align:center;color:#64748b;">${it.index}</td>
        <td>
          <div style="font-weight:600;color:#0f172a;">${it.name}</div>
          <div style="font-size:10px;color:#94a3b8;">SKU: ${it.sku}</div>
        </td>
        <td style="text-align:center;">${it.hsnCode}</td>
        <td style="text-align:right;">${it.qty} ${it.unit}</td>
        <td style="text-align:right;">₹${it.price.toFixed(2)}</td>
        <td style="text-align:right;color:#64748b;">${it.itemDiscAmt > 0 ? '₹' + it.itemDiscAmt.toFixed(2) : '—'}</td>
        <td style="text-align:right;">₹${it.itemTaxable.toFixed(2)}</td>
        <td style="text-align:center;">${it.itemTaxRate}%</td>
        <td style="text-align:right;">₹${it.itemTaxAmt.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700;color:#0f172a;">₹${it.itemTotal.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const printHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${norm.isWithoutGst ? 'Bill (Without GST)' : 'Tax Invoice'} - ${invoice.number}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 0; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 14px; margin-bottom: 16px; }
    .shop-left { display: flex; gap: 14px; align-items: center; }
    .logo-box { width: 76px; padding: 4px; border: 1px solid #e2e8f0; border-radius: 6px; }
    .logo-box img { width: 100%; height: auto; display: block; }
    .shop-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 3px 0; }
    .shop-sub { font-size: 11px; color: #475569; margin: 1px 0; }
    .badge { display: inline-block; background: ${norm.isWithoutGst ? '#ea580c' : '#0f172a'}; color: #fff; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 4px; letter-spacing: 0.05em; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; }
    th { background: #f1f5f9; color: #334155; font-size: 10.5px; text-transform: uppercase; padding: 8px 8px; border-bottom: 1px solid #cbd5e1; text-align: left; }
    td { padding: 8px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
    .bottom-grid { display: grid; grid-template-columns: 7fr 5fr; gap: 20px; align-items: start; margin-bottom: 18px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
    .bank-box { border: 1px dashed #94a3b8; border-radius: 6px; padding: 10px 12px; font-size: 11px; }
    .tot-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 11.5px; }
    .tot-grand { border-top: 2px solid #0f172a; padding-top: 7px; margin-top: 6px; display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #0f172a; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: end; border-top: 1px solid #cbd5e1; padding-top: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-left">
      <div class="logo-box"><img src="${shopInfo.logo}" alt="Logo" /></div>
      <div>
        <div class="shop-name">${shopInfo.name}</div>
        <div class="shop-sub">${shopInfo.addressLine1}, ${shopInfo.addressLine2}</div>
        <div class="shop-sub">${shopInfo.city}, ${shopInfo.state} - ${shopInfo.pincode}</div>
        <div class="shop-sub" style="font-weight:600;color:#1e293b;margin-top:3px;">Phone: ${shopInfo.phone} | Email: ${shopInfo.email}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div class="badge">${norm.isWithoutGst ? 'BILL (WITHOUT GST)' : 'TAX INVOICE'}</div>
      <div style="font-size:10.5px;color:#64748b;margin-top:3px;">${norm.isWithoutGst ? '(Retail Cash Memo / Estimate)' : '(Original for Recipient)'}</div>
      ${!norm.isWithoutGst ? `<div style="font-size:11.5px;margin-top:5px;">GSTIN: <strong>${shopInfo.gst}</strong></div>` : ''}
      <div style="font-size:11px;color:#475569;">State: ${shopInfo.state} (${shopInfo.stateCode})</div>
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Billed To (Customer)</div>
      <div style="font-size:13.5px;font-weight:700;color:#0f172a;">${invoice.customerName || 'Walk-in Customer'}</div>
      ${invoice.customerPhone ? `<div style="font-size:11.5px;color:#475569;">Phone: ${invoice.customerPhone}</div>` : ''}
      ${invoice.customerAddress ? `<div style="font-size:11.5px;color:#475569;">${invoice.customerAddress}</div>` : ''}
      ${!norm.isWithoutGst && invoice.customerGst ? `<div style="font-size:11.5px;font-weight:700;color:#1d4ed8;margin-top:2px;">GSTIN: ${invoice.customerGst}</div>` : `<div style="font-size:11px;color:#94a3b8;">${norm.isWithoutGst ? 'Retail / Cash Customer' : 'Unregistered Consumer'}</div>`}
    </div>
    <div>
      <div class="meta-row"><span style="color:#64748b;">${norm.isWithoutGst ? 'Bill Number:' : 'Invoice Number:'}</span><strong>${invoice.number}</strong></div>
      <div class="meta-row"><span style="color:#64748b;">Date:</span><span>${new Date(invoice.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span></div>
      <div class="meta-row"><span style="color:#64748b;">Time:</span><span>${new Date(invoice.date).toLocaleTimeString('en-IN', { timeStyle: 'short' })}</span></div>
      <div class="meta-row"><span style="color:#64748b;">Bill Type:</span><span>${norm.isWithoutGst ? 'Without GST (0% Tax)' : norm.taxType === 'intra_state' ? 'Intra-State (Tamil Nadu)' : 'Inter-State'}</span></div>
      <div class="meta-row"><span style="color:#64748b;">Payment Mode:</span><strong style="text-transform:uppercase;">${norm.paymentMethod} (${norm.paymentStatus})</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:center;width:32px;">#</th>
        <th>Item Description</th>
        <th style="text-align:center;">HSN</th>
        <th style="text-align:right;">Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Disc</th>
        <th style="text-align:right;">Taxable</th>
        <th style="text-align:center;">GST%</th>
        <th style="text-align:right;">Tax Amt</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="bottom-grid">
    <div>
      <div class="box">
        <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:2px;">Amount in Words</div>
        <div style="font-weight:700;font-style:italic;color:#1e293b;">${numberToWordsINR(norm.total)}</div>
      </div>
      <div class="bank-box">
        <div style="font-weight:700;font-size:10.5px;text-transform:uppercase;margin-bottom:5px;color:#0f172a;">Bank Details for Direct RTGS / NEFT / UPI:</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;color:#475569;">
          <div>Bank: ${shopInfo.bankDetails.bankName}</div>
          <div>A/C No: ${shopInfo.bankDetails.accountNo}</div>
          <div>IFSC: ${shopInfo.bankDetails.ifsc}</div>
          <div>UPI ID: ${shopInfo.bankDetails.upiId}</div>
        </div>
      </div>
    </div>
    <div class="box" style="margin-bottom:0;">
      <div class="tot-row"><span>Subtotal:</span><span>₹${norm.subtotal.toFixed(2)}</span></div>
      ${norm.discountAmt > 0 ? `<div class="tot-row" style="color:#047857;"><span>Discount (${norm.discountPct}%):</span><span>−₹${norm.discountAmt.toFixed(2)}</span></div>` : ''}
      <div class="tot-row" style="font-weight:600;"><span>${norm.isWithoutGst ? 'Net Bill Amount:' : 'Taxable Value:'}</span><span>₹${norm.taxableAmount.toFixed(2)}</span></div>
      ${
        norm.isWithoutGst
          ? `<div class="tot-row"><span>GST (Without GST):</span><span>₹0.00 (0%)</span></div>`
          : norm.taxType === 'intra_state'
          ? `<div class="tot-row"><span>CGST Total:</span><span>+₹${norm.cgstAmount.toFixed(2)}</span></div>
             <div class="tot-row"><span>SGST Total:</span><span>+₹${norm.sgstAmount.toFixed(2)}</span></div>`
          : `<div class="tot-row"><span>IGST Total:</span><span>+₹${norm.igstAmount.toFixed(2)}</span></div>`
      }
      ${norm.roundOff !== 0 ? `<div class="tot-row"><span>Round Off:</span><span>${norm.roundOff > 0 ? '+' : ''}₹${norm.roundOff.toFixed(2)}</span></div>` : ''}
      <div class="tot-grand">
        <span>Grand Total:</span>
        <span style="color:#1d4ed8;">₹${norm.total.toFixed(2)}</span>
      </div>
      <div class="tot-row" style="margin-top:6px;padding-top:6px;border-top:1px solid #e2e8f0;">
        <span>Amount Paid:</span><strong>₹${norm.amountPaid.toFixed(2)}</strong>
      </div>
      ${norm.balanceDue > 0 ? `<div class="tot-row" style="color:#dc2626;font-weight:700;"><span>Balance Due (Khata):</span><span>₹${norm.balanceDue.toFixed(2)}</span></div>` : ''}
    </div>
  </div>

  <div class="sign-grid">
    <div>
      <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:3px;">Terms &amp; Conditions:</div>
      <div style="font-size:10px;color:#64748b;white-space:pre-wrap;line-height:1.4;">${shopInfo.invoiceTerms}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:700;color:#0f172a;font-size:12px;">For ${shopInfo.name}</div>
      <div style="height:45px;"></div>
      <div style="display:inline-block;border-top:1px solid #94a3b8;padding:4px 16px 0;font-size:11px;color:#475569;">Authorised Signatory</div>
    </div>
  </div>

  <div style="text-align:center;font-size:10.5px;color:#94a3b8;margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;">
    ${shopInfo.invoiceFooter}
  </div>
</body>
</html>`;

  // Create or reuse a dedicated hidden print iframe
  let printIframe = document.getElementById('dedicated-invoice-print-iframe') as HTMLIFrameElement | null;
  if (printIframe) {
    printIframe.remove();
  }
  printIframe = document.createElement('iframe');
  printIframe.id = 'dedicated-invoice-print-iframe';
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  document.body.appendChild(printIframe);

  const frameDoc = printIframe.contentWindow?.document;
  if (frameDoc && printIframe.contentWindow) {
    frameDoc.open();
    frameDoc.write(printHtml);
    frameDoc.close();

    const triggerFramePrint = () => {
      try {
        printIframe?.contentWindow?.focus();
        printIframe?.contentWindow?.print();
      } catch {
        window.print();
      }
    };

    // Wait briefly for the base64 logo image to decode before opening print dialog
    setTimeout(triggerFramePrint, 180);
  } else {
    window.print();
  }
}
