import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  PieChart,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { Expense, Invoice, Product } from '../types';
import { formatINR } from '../utils/numberToWords';
import { downloadCsv } from '../services/storage';

interface ReportsViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  products: Product[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  invoices,
  expenses,
  products,
}) => {
  const [dateRangePreset, setDateRangePreset] = useState<
    'today' | 'this_week' | 'this_month' | 'this_year' | 'custom'
  >('this_month');

  const now = new Date();
  const [customStart, setCustomStart] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().slice(0, 10));

  // Determine active date boundaries
  const { startDate, endDate } = useMemo(() => {
    let start = new Date(now);
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (dateRangePreset === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (dateRangePreset === 'this_week') {
      const dayOfWeek = now.getDay() || 7;
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - dayOfWeek + 1);
    } else if (dateRangePreset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (dateRangePreset === 'this_year') {
      // Indian Financial Year: April 1 to March 31
      const currentYear = now.getFullYear();
      const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
      start = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
    } else {
      start = new Date(customStart + 'T00:00:00');
      end = new Date(customEnd + 'T23:59:59');
    }

    return { startDate: start, endDate: end };
  }, [dateRangePreset, customStart, customEnd]);

  // Filtered Invoices and Expenses in Range
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const d = new Date(inv.date);
      return d >= startDate && d <= endDate;
    });
  }, [invoices, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });
  }, [expenses, startDate, endDate]);

  // Calculations
  const invoiceCount = filteredInvoices.length;
  const grossInvoicedTotal = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.total, 0),
    [filteredInvoices]
  );
  const totalDiscounts = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.discountAmt, 0),
    [filteredInvoices]
  );
  const totalTaxableSales = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.taxableAmount, 0),
    [filteredInvoices]
  );
  const totalGstCollected = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.taxAmt, 0),
    [filteredInvoices]
  );
  const totalCgst = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.cgstAmount, 0),
    [filteredInvoices]
  );
  const totalSgst = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.sgstAmount, 0),
    [filteredInvoices]
  );
  const totalIgst = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.igstAmount, 0),
    [filteredInvoices]
  );

  // Cost of Goods Sold (COGS)
  const costOfGoodsSold = useMemo(() => {
    let cogs = 0;
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const unitCost = prod ? prod.purchasePrice : it.purchasePrice || it.price * 0.75;
        cogs += unitCost * it.qty;
      });
    });
    return cogs;
  }, [filteredInvoices, products]);

  // Gross Profit = Taxable Sales (Net Revenue excluding tax) - COGS
  const grossProfit = totalTaxableSales - costOfGoodsSold;
  const grossMarginPct =
    totalTaxableSales > 0 ? ((grossProfit / totalTaxableSales) * 100).toFixed(1) : '0.0';

  // Total Expenses
  const totalOperatingExpenses = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );

  // Net Profit = Gross Profit - Operating Expenses
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMarginPct =
    totalTaxableSales > 0 ? ((netProfit / totalTaxableSales) * 100).toFixed(1) : '0.0';

  // Payment Modes Distribution
  const paymentModeSummary = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredInvoices.forEach((inv) => {
      const mode = inv.paymentMethod || 'cash';
      const existing = map.get(mode) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += inv.total;
      map.set(mode, existing);
    });
    return Array.from(map.entries());
  }, [filteredInvoices]);

  // Product-wise Performance
  const productPerformance = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();

    filteredInvoices.forEach((inv) => {
      inv.items.forEach((it) => {
        const existing = map.get(it.productId) || {
          name: it.name,
          sku: it.sku,
          qty: 0,
          revenue: 0,
        };
        existing.qty += it.qty;
        existing.revenue += it.total;
        map.set(it.productId, existing);
      });
    });

    const list = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
    return {
      topSellers: list.slice(0, 6),
      allSales: list,
    };
  }, [filteredInvoices]);

  // CSV Export of Report
  const handleExportCsv = () => {
    const headers = ['Metric', 'Value'];
    const rows: (string | number)[][] = [
      ['Report Period', `${startDate.toDateString()} to ${endDate.toDateString()}`],
      ['Total Invoices Count', invoiceCount],
      ['Gross Invoiced Sales', grossInvoicedTotal],
      ['Total Discounts Given', totalDiscounts],
      ['Net Taxable Sales (Revenue)', totalTaxableSales],
      ['CGST Collected', totalCgst],
      ['SGST Collected', totalSgst],
      ['IGST Collected', totalIgst],
      ['Total GST Collected', totalGstCollected],
      ['Cost of Goods Sold (COGS)', costOfGoodsSold],
      ['Gross Profit', grossProfit],
      ['Gross Margin %', `${grossMarginPct}%`],
      ['Total Operating Expenses', totalOperatingExpenses],
      ['Estimated Net Profit', netProfit],
      ['Net Margin %', `${netMarginPct}%`],
    ];

    downloadCsv(`Maheswari-Profit-Report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Date Filter Strip */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-base text-slate-900">
            Financial &amp; Profit Report
          </h3>
          <p className="text-xs text-slate-500 font-mono-num">
            Period: {startDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })} to{' '}
            {endDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
            {(['today', 'this_week', 'this_month', 'this_year', 'custom'] as const).map(
              (preset) => (
                <button
                  key={preset}
                  onClick={() => setDateRangePreset(preset)}
                  className={`px-3 py-1.5 rounded transition-colors uppercase text-[11px] font-mono-num ${
                    dateRangePreset === preset
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset.replace('_', ' ')}
                </button>
              )
            )}
          </div>

          {dateRangePreset === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs font-mono-num">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded"
              />
              <span>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded"
              />
            </div>
          )}

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* P&L Profit Statement Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
          <div>
            <h4 className="font-display font-bold text-lg text-slate-900">
              Profit &amp; Loss Statement (P&amp;L)
            </h4>
            <p className="text-xs text-slate-500 font-mono-num">
              Clearly distinguishes gross revenue from actual net business profit
            </p>
          </div>
          <span className="text-xs font-mono-num px-2.5 py-1 bg-slate-100 rounded text-slate-700 font-semibold">
            {invoiceCount} Total Invoices
          </span>
        </div>

        {/* 4 Financial KPI Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
              Net Taxable Sales
            </span>
            <div className="text-xl font-bold font-mono-num text-slate-900">
              {formatINR(totalTaxableSales)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono-num mt-1 block">
              Gross Total: {formatINR(grossInvoicedTotal)}
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
            <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
              Cost of Goods Sold (COGS)
            </span>
            <div className="text-xl font-bold font-mono-num text-slate-700">
              {formatINR(costOfGoodsSold)}
            </div>
            <span className="text-[10px] text-slate-500 font-mono-num mt-1 block">
              Purchase cost of items sold
            </span>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-md">
            <span className="text-[11px] font-mono-num uppercase text-blue-600 font-semibold block mb-1">
              Gross Profit ({grossMarginPct}%)
            </span>
            <div className="text-xl font-bold font-mono-num text-blue-800">
              {formatINR(grossProfit)}
            </div>
            <span className="text-[10px] text-blue-600 font-mono-num mt-1 block">
              Sales Revenue minus Purchase Cost
            </span>
          </div>

          <div
            className={`p-4 rounded-md border ${
              netProfit >= 0
                ? 'bg-emerald-50/80 border-emerald-200'
                : 'bg-red-50/80 border-red-200'
            }`}
          >
            <span
              className={`text-[11px] font-mono-num uppercase font-semibold block mb-1 ${
                netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              Estimated Net Profit ({netMarginPct}%)
            </span>
            <div
              className={`text-xl font-bold font-mono-num ${
                netProfit >= 0 ? 'text-emerald-800' : 'text-red-800'
              }`}
            >
              {formatINR(netProfit)}
            </div>
            <span
              className={`text-[10px] font-mono-num mt-1 block ${
                netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              After operating expenses ({formatINR(totalOperatingExpenses)})
            </span>
          </div>
        </div>

        {/* GST Tax Collection Breakdown */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <span className="font-semibold text-slate-800 text-xs uppercase font-mono-num">
              GST Tax Liability &amp; Collection Summary
            </span>
            <span className="text-xs font-bold font-mono-num text-slate-900">
              Total GST: {formatINR(totalGstCollected)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs font-mono-num">
            <div>
              <span className="text-slate-500 block">CGST Collected:</span>
              <span className="font-bold text-slate-900 text-sm">{formatINR(totalCgst)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">SGST Collected:</span>
              <span className="font-bold text-slate-900 text-sm">{formatINR(totalSgst)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">IGST Collected:</span>
              <span className="font-bold text-slate-900 text-sm">{formatINR(totalIgst)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Payment Modes & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Modes Area (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h4 className="font-display font-semibold text-base text-slate-900">
              Payment Methods Breakdown
            </h4>
            <p className="text-xs text-slate-500 font-mono-num">
              Revenue distribution by payment channel
            </p>
          </div>

          <div className="space-y-2.5">
            {paymentModeSummary.map(([mode, data]) => {
              const pct = grossInvoicedTotal > 0 ? (data.total / grossInvoicedTotal) * 100 : 0;
              return (
                <div key={mode} className="space-y-1 text-xs">
                  <div className="flex justify-between items-center font-mono-num">
                    <span className="capitalize font-semibold text-slate-800">
                      {mode.replace('_', ' ')} ({data.count} bills)
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatINR(data.total)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${
                        mode === 'cash'
                          ? 'bg-emerald-500'
                          : mode === 'upi'
                          ? 'bg-blue-600'
                          : mode === 'credit'
                          ? 'bg-red-500'
                          : 'bg-purple-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}

            {paymentModeSummary.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs font-mono-num">
                No payment transactions found in selected period.
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Hardware & Plywood (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
            <div>
              <h4 className="font-display font-semibold text-base text-slate-900">
                Top Products by Revenue
              </h4>
              <p className="text-xs text-slate-500 font-mono-num">
                Highest turnover hardware &amp; plywood stock
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono-num">
              {productPerformance.allSales.length} unique items sold
            </span>
          </div>

          <div className="space-y-2.5">
            {productPerformance.topSellers.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-md border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono-num font-bold">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 block truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-num">
                      SKU: {item.sku}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold font-mono-num text-slate-900 text-sm block">
                    {formatINR(item.revenue)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono-num">
                    {item.qty} units sold
                  </span>
                </div>
              </div>
            ))}

            {productPerformance.topSellers.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs font-mono-num">
                No product sales recorded in selected period.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
