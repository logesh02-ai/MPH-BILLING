import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Users,
  Plus,
  ArrowRight,
  Boxes,
  Wallet,
  Printer,
  Download,
  Eye,
  Laptop,
  PackageCheck,
} from 'lucide-react';
import { Customer, Invoice, Product, ShopInfo } from '../types';
import { formatINR } from '../utils/numberToWords';
import { downloadInvoicePdf, triggerDedicatedInvoicePrint } from '../utils/pdfGenerator';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  shopInfo: ShopInfo;
  onNavigate: (tab: NavTab) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onQuickRestock: (product: Product) => void;
  onOpenDownloadModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  invoices,
  customers,
  shopInfo,
  onNavigate,
  onPreviewInvoice,
  onPrintInvoice,
  onQuickRestock,
  onOpenDownloadModal,
}) => {
  const [chartRange, setChartRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const now = new Date();

  // Helper date functions
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  const isThisWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayOfWeek = now.getDay() || 7; // Monday = 1
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    return d >= startOfWeek;
  };

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  // KPIs
  const todayInvoices = useMemo(() => invoices.filter((inv) => isToday(inv.date)), [invoices]);
  const todaySales = useMemo(
    () => todayInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0),
    [todayInvoices]
  );

  const weekInvoices = useMemo(() => invoices.filter((inv) => isThisWeek(inv.date)), [invoices]);
  const weekSales = useMemo(
    () => weekInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0),
    [weekInvoices]
  );

  const monthInvoices = useMemo(() => invoices.filter((inv) => isThisMonth(inv.date)), [invoices]);
  const monthSales = useMemo(
    () => monthInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0),
    [monthInvoices]
  );

  const totalAllTimeSales = useMemo(
    () => invoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0),
    [invoices]
  );

  // Low Stock Items
  const lowStockItems = useMemo(
    () => products.filter((p) => p.stock <= p.minStockThreshold),
    [products]
  );

  // Total Customer Outstanding Dues
  const totalCustomerDues = useMemo(
    () => customers.reduce((s, c) => s + (Number(c.outstandingBalance) || 0), 0),
    [customers]
  );

  // Top Selling Products Calculation (Safe against legacy items without .total)
  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { product: Product; qtySold: number; revenue: number }>();
    invoices.forEach((inv) => {
      (inv.items || []).forEach((it) => {
        const qty = Number(it.qty) || 1;
        const price = Number(it.price) || 0;
        const lineRevenue = Number(it.total) > 0 ? Number(it.total) : qty * price;
        const prod =
          products.find((p) => p.id === it.productId) ||
          products.find((p) => p.name.toLowerCase() === (it.name || '').toLowerCase());
        const key = prod ? prod.id : it.productId || it.name;
        const existing = map.get(key);
        if (existing) {
          existing.qtySold += qty;
          existing.revenue += lineRevenue;
        } else if (prod) {
          map.set(key, { product: prod, qtySold: qty, revenue: lineRevenue });
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [invoices, products]);

  // Dynamic Chart Data (Daily 7-Day, Weekly 4-Week, Monthly 6-Month)
  const chartData = useMemo(() => {
    if (chartRange === 'daily') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - i);
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dayInvoices = invoices.filter((inv) => {
          const d = new Date(inv.date);
          return d >= dayStart && d <= dayEnd;
        });

        const total = dayInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
        days.push({
          label: dayStart.toLocaleDateString('en-IN', { weekday: 'short' }),
          subLabel: dayStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          total,
          count: dayInvoices.length,
          highlight: i === 0,
        });
      }
      return days;
    }

    if (chartRange === 'weekly') {
      const weeks = [];
      for (let w = 3; w >= 0; w--) {
        const end = new Date(now);
        end.setDate(now.getDate() - w * 7);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        const wInvoices = invoices.filter((inv) => {
          const d = new Date(inv.date);
          return d >= start && d <= end;
        });

        const total = wInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
        weeks.push({
          label: w === 0 ? 'This Week' : `${w}w Ago`,
          subLabel: `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
          total,
          count: wInvoices.length,
          highlight: w === 0,
        });
      }
      return weeks;
    }

    // Monthly (Last 6 Months)
    const months = [];
    for (let m = 5; m >= 0; m--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const mInvoices = invoices.filter((inv) => {
        const d = new Date(inv.date);
        return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
      });
      const total = mInvoices.reduce((s, inv) => s + (Number(inv.total) || 0), 0);
      months.push({
        label: ref.toLocaleDateString('en-IN', { month: 'short' }),
        subLabel: String(ref.getFullYear()),
        total,
        count: mInvoices.length,
        highlight: m === 0,
      });
    }
    return months;
  }, [invoices, chartRange]);

  const maxChartRevenue = Math.max(...chartData.map((d) => d.total), 1);

  // Recent 6 Invoices
  const recentInvoices = useMemo(() => [...invoices].reverse().slice(0, 6), [invoices]);

  return (
    <div className="p-6 space-y-6">
      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-num uppercase tracking-wider font-semibold">
              Today&apos;s Sales
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900 tracking-tight">
            {formatINR(todaySales)}
          </div>
          <div className="text-xs text-slate-500 font-mono-num mt-2 flex justify-between">
            <span>{todayInvoices.length} bills today</span>
            <span className="text-slate-400">Week: {formatINR(weekSales)}</span>
          </div>
        </div>

        {/* Total Invoices & Monthly Sales */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-num uppercase tracking-wider font-semibold">
              Total Invoices ({invoices.length})
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900 tracking-tight">
            {formatINR(totalAllTimeSales)}
          </div>
          <div className="text-xs text-slate-500 font-mono-num mt-2 flex justify-between">
            <span>This Month: {formatINR(monthSales)}</span>
            <button
              onClick={() => onNavigate('history')}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              View All &rarr;
            </button>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-num uppercase tracking-wider font-semibold">
              Low Stock Alert
            </span>
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center ${
                lowStockItems.length > 0
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-slate-50 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold font-mono-num tracking-tight ${
              lowStockItems.length > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {lowStockItems.length} Product{lowStockItems.length === 1 ? '' : 's'}
          </div>
          <div className="text-xs text-slate-500 font-mono-num mt-2">
            {lowStockItems.length > 0 ? (
              <button
                onClick={() => onNavigate('inventory')}
                className="text-amber-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Review &amp; Reorder stock</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-emerald-600">All products above minimum</span>
            )}
          </div>
        </div>

        {/* Outstanding Customer Dues */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-num uppercase tracking-wider font-semibold">
              Customer Khata Dues
            </span>
            <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono-num text-red-600 tracking-tight">
            {formatINR(totalCustomerDues)}
          </div>
          <div className="text-xs text-slate-500 font-mono-num mt-2">
            <button
              onClick={() => onNavigate('customers')}
              className="text-blue-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage customer ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="font-display font-semibold text-base text-white tracking-wide">
            Quick Counter Actions
          </h4>
          <p className="text-xs text-slate-400 font-mono-num">
            Fast access to billing, inventory restock, reports &amp; laptop download
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('billing')}
            className="px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Bill</span>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-slate-400" />
            <span>Add / Manage Stock</span>
          </button>

          <button
            onClick={() => onNavigate('customers')}
            className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>Customers &amp; Khata</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span>Sales &amp; Profit Reports</span>
          </button>

          <button
            onClick={onOpenDownloadModal}
            className="px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Laptop className="w-4 h-4" />
            <span>Download ZIP / HTML</span>
          </button>
        </div>
      </div>

      {/* Middle Grid: Daily / Weekly / Monthly Sales Chart & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Sales Revenue Chart
              </h3>
              <p className="text-xs text-slate-500 font-mono-num">
                Total Period Revenue:{' '}
                <strong className="text-slate-900">
                  {formatINR(chartData.reduce((s, d) => s + d.total, 0))}
                </strong>
              </p>
            </div>

            {/* Chart Range Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-mono-num">
              {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setChartRange(mode)}
                  className={`px-2.5 py-1 rounded capitalize transition-colors cursor-pointer ${
                    chartRange === mode
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-56 flex items-end gap-3 pt-6 pb-2">
            {chartData.map((d, idx) => {
              const heightPct = Math.max(
                (d.total / maxChartRevenue) * 100,
                d.total > 0 ? 10 : 3
              );

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-mono-num text-slate-600 font-semibold mb-1">
                    {d.total > 0 ? `₹${Math.round(d.total).toLocaleString('en-IN')}` : ''}
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[44px] rounded-t transition-all ${
                      d.total === 0
                        ? 'bg-slate-200'
                        : d.highlight
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  />
                  <div className="mt-2 text-center">
                    <span
                      className={`text-xs font-mono-num block ${
                        d.highlight ? 'font-bold text-orange-600' : 'text-slate-700'
                      }`}
                    >
                      {d.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-num block">
                      {d.subLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Watchlist (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-display font-semibold text-base text-slate-900">
                Low Stock Warning ({lowStockItems.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-blue-600 hover:underline font-mono-num cursor-pointer"
            >
              View Inventory
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[240px]">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-md border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono-num">
                    SKU: {item.sku} · Min: {item.minStockThreshold} {item.unit}
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <span
                      className={`font-bold font-mono-num block ${
                        item.stock <= 0 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      {item.stock <= 0 ? 'Out of Stock' : `${item.stock} ${item.unit}`}
                    </span>
                  </div>
                  <button
                    onClick={() => onQuickRestock(item)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded font-mono-num cursor-pointer"
                  >
                    + Reorder
                  </button>
                </div>
              </div>
            ))}

            {lowStockItems.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-mono-num flex flex-col items-center gap-2">
                <PackageCheck className="w-6 h-6 text-emerald-500" />
                <span>All inventory items are adequately stocked above minimum threshold.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Invoices (with Direct Print & PDF) & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Invoices Feed (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Recent Invoices (Quick Print &amp; PDF)
              </h3>
              <p className="text-xs text-slate-500 font-mono-num">
                Print bill or download PDF directly from the dashboard
              </p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-blue-600 hover:underline font-mono-num cursor-pointer"
            >
              All Invoices ({invoices.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentInvoices.map((inv) => {
              const status = inv.paymentStatus || (inv.balanceDue > 0 ? 'partial' : 'paid');
              const method = (inv.paymentMethod || 'cash').toUpperCase();

              return (
                <div
                  key={inv.id}
                  onClick={() => onPreviewInvoice(inv)}
                  className="py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-blue-50/40 px-2 rounded cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num font-bold text-xs text-orange-600">
                        {inv.number}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {inv.customerName}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono-num uppercase font-medium ${
                          status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono-num mt-0.5">
                      {new Date(inv.date).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      · {(inv.items || []).length} item(s) · {method}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-right mr-1">
                      <div className="font-mono-num font-bold text-sm text-slate-900">
                        {formatINR(Number(inv.total) || 0)}
                      </div>
                    </div>

                    <button
                      onClick={() => onPrintInvoice(inv)}
                      title="Open Dedicated Print Page for Bill"
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print</span>
                    </button>

                    <button
                      onClick={() => downloadInvoicePdf(inv, shopInfo)}
                      title="Download PDF File"
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>PDF</span>
                    </button>

                    <button
                      onClick={() => onPreviewInvoice(inv)}
                      title="View Bill"
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {recentInvoices.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-mono-num">
                No invoices recorded yet. Click &quot;Create New Bill&quot; to generate your first invoice.
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Top Selling Products
              </h3>
              <p className="text-xs text-slate-500 font-mono-num">
                Highest velocity hardware &amp; plywood
              </p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-blue-600 hover:underline font-mono-num cursor-pointer"
            >
              Full Report
            </button>
          </div>

          <div className="space-y-3">
            {topSellingProducts.map((item, index) => (
              <div key={item.product.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-mono-num font-bold">
                    {index + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-medium text-slate-900 block truncate">
                      {item.product.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-num">
                      {item.product.category}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold font-mono-num text-slate-900 block">
                    {item.qtySold} {item.product.unit}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono-num">
                    {formatINR(item.revenue)}
                  </span>
                </div>
              </div>
            ))}

            {topSellingProducts.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-mono-num">
                Complete sales to discover top moving products.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
