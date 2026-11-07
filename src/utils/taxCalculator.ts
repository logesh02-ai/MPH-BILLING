import { CartItem, InvoiceItem, TaxType } from '../types';

export interface CalculatedInvoiceTotals {
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  taxableAmount: number;
  taxType: TaxType;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmt: number;
  roundOff: number;
  total: number;
  items: InvoiceItem[];
}

export function calculateCartTotals(
  cart: CartItem[],
  billDiscountPct: number,
  taxType: TaxType
): CalculatedInvoiceTotals {
  let subtotal = 0;

  // First calculate gross subtotal after any item-level discounts
  cart.forEach((c) => {
    const itemGross = c.price * c.qty;
    const itemDiscount = c.itemDiscountPct ? (itemGross * c.itemDiscountPct) / 100 : 0;
    subtotal += itemGross - itemDiscount;
  });

  const discountPct = Math.min(Math.max(billDiscountPct || 0, 0), 100);
  const discountAmt = (subtotal * discountPct) / 100;
  const netTaxable = Math.max(0, subtotal - discountAmt);

  // Distribute bill-level discount proportionally across items for exact GST line-item compliance
  const discountRatio = subtotal > 0 ? (subtotal - discountAmt) / subtotal : 1;

  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const invoiceItems: InvoiceItem[] = cart.map((c) => {
    const itemGross = c.price * c.qty;
    const itemDisc = c.itemDiscountPct ? (itemGross * c.itemDiscountPct) / 100 : 0;
    const itemNetBeforeBillDisc = itemGross - itemDisc;
    const itemTaxable = itemNetBeforeBillDisc * discountRatio;

    const rawRate = c.taxRate || 0;
    const rate = taxType === 'none' ? 0 : rawRate;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (taxType === 'intra_state') {
      const halfRate = rate / 2;
      cgst = Number(((itemTaxable * halfRate) / 100).toFixed(2));
      sgst = Number(((itemTaxable * halfRate) / 100).toFixed(2));
    } else if (taxType === 'inter_state') {
      igst = Number(((itemTaxable * rate) / 100).toFixed(2));
    }

    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    const itemLineTotal = itemTaxable + cgst + sgst + igst;

    return {
      productId: c.productId,
      name: c.name,
      sku: c.sku,
      hsnCode: c.hsnCode || '4412',
      purchasePrice: c.purchasePrice,
      price: c.price,
      qty: c.qty,
      unit: c.unit,
      taxRate: rate,
      itemDiscountPct: c.itemDiscountPct || 0,
      itemDiscountAmt: Number(itemDisc.toFixed(2)),
      taxableAmount: Number(itemTaxable.toFixed(2)),
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      total: Number(itemLineTotal.toFixed(2)),
    };
  });

  const totalTax = totalCgst + totalSgst + totalIgst;
  const unroundedTotal = netTaxable + totalTax;
  const roundedTotal = Math.round(unroundedTotal);
  const roundOff = Number((roundedTotal - unroundedTotal).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discountPct,
    discountAmt: Number(discountAmt.toFixed(2)),
    taxableAmount: Number(netTaxable.toFixed(2)),
    taxType,
    cgstAmount: Number(totalCgst.toFixed(2)),
    sgstAmount: Number(totalSgst.toFixed(2)),
    igstAmount: Number(totalIgst.toFixed(2)),
    taxAmt: Number(totalTax.toFixed(2)),
    roundOff,
    total: roundedTotal,
    items: invoiceItems,
  };
}

export function isValidGSTIN(gstin?: string): boolean {
  if (!gstin) return false;
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return pattern.test(gstin.trim().toUpperCase());
}
