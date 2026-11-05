import React, { useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Users,
  Plus,
  ArrowRight,
  Boxes,
  Truck,
  Wallet,
  Clock,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Customer, Invoice, Product } from '../types';
import { formatINR } from '../utils/numberToWords';
import { NavTab } from './Sidebar';

interface DashboardViewProps {
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  onNavigate: (tab: NavTab) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
  onQuickRestock: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  invoices,
  customers,
  onNavigate,
  onPreviewInvoice,
  onQuickRestock,
}) => {
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
  const todaySales = useMemo(() => todayInvoices.reduce((s, inv) => s + inv.total, 0), [todayInvoices]);

  const weekInvoices = useMemo(() => invoices.filter((inv) => isThisWeek(inv.date)), [invoices]);
  const weekSales = useMemo(() => weekInvoices.reduce((s, inv) => s + inv.total, 0), [weekInvoices]);

  const monthInvoices = useMemo(() => invoices.filter((inv) => isThisMonth(inv.date)), [invoices]);
  const monthSales = useMemo(() => monthInvoices.reduce((s, inv) => s + inv.total, 0), [monthInvoices]);

  // Low Stock Items
  const lowStockItems = useMemo(
    () => products.filter((p) => p.stock <= p.minStockThreshold),
    [products]
  );

  // Total Customer Outstanding Dues
  const totalCustomerDues = useMemo(
    () => customers.reduce((s, c) => s + (c.outstandingBalance || 0), 0),
    [customers]
  );

  // Top Selling Products Calculation
  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { product: Product; qtySold: number; revenue: number }>();
    invoices.forEach((inv) => {
      inv.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const existing = map.get(it.productId);
        if (existing) {
          existing.qtySold += it.qty;
          existing.revenue += it.total;
        } else if (prod) {
          map.set(it.productId, { product: prod, qtySold: it.qty, revenue: it.total });
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 5);
  }, [invoices, products]);

  // Last 7 Days Daily Sales Chart Data
  const last7DaysData = useMemo(() => {
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

      const total = dayInvoices.reduce((s, inv) => s + inv.total, 0);
      days.push({
        label: dayStart.toLocaleDateString('en-IN', { weekday: 'short' }),
        dateStr: dayStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        total,
        count: dayInvoices.length,
      });
    }
    return days;
  }, [invoices]);

  const maxDailyRevenue = Math.max(...last7DaysData.map((d) => d.total), 1);

  // Recent 6 Invoices
  const recentInvoices = useMemo(() => [...invoices].reverse().slice(0, 6), [invoices]);

  return (
    <div className="p-6 space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-num uppercase tracking-wider font-semibold">
              Today's Sales
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900 tracking-tight">
            {formatINR(todaySales)}
          </div>
          <div className="text-xs text-slate-500 font-mono-num mt-2">
            <span>{todayInvoices.length} invoices generated today</span>
          </div>
        </div>

        {/* This Week / Month Sales */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-num uppercase tracking-wider font-semibold">
              This Month
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900 tracking-tight">
            {formatINR(monthSales)}
          </div>
          <div className="text-xs text-slate-500 font-mono-num mt-2 flex justify-between">
            <span>This Week: {formatINR(weekSales)}</span>
            <span className="text-slate-400">({monthInvoices.length} bills)</span>
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
                className="text-amber-700 hover:underline font-medium inline-flex items-center gap-1"
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
              className="text-blue-700 hover:underline font-medium inline-flex items-center gap-1"
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
            Quick Actions
          </h4>
          <p className="text-xs text-slate-400 font-mono-num">
            Frequently performed counter and store operations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('billing')}
            className="px-3.5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Bill</span>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5"
          >
            <Boxes className="w-4 h-4 text-slate-400" />
            <span>Manage Inventory</span>
          </button>

          <button
            onClick={() => onNavigate('customers')}
            className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>Customer Khata</span>
          </button>

          <button
            onClick={() => onNavigate('expenses')}
            className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5"
          >
            <Wallet className="w-4 h-4 text-slate-400" />
            <span>Record Expense</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <span>Profit Reports</span>
          </button>
        </div>
      </div>

      {/* Middle Grid: Last 7 Days Revenue Trend & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Sales Trend (Last 7 Days)
              </h3>
              <p className="text-xs text-slate-500 font-mono-num">
                Daily bill revenue in Indian Rupees (₹)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-mono-num block">7-Day Total</span>
              <span className="text-sm font-bold font-mono-num text-slate-900">
                {formatINR(last7DaysData.reduce((s, d) => s + d.total, 0))}
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-56 flex items-end gap-3 pt-6 pb-2">
            {last7DaysData.map((d, idx) => {
              const heightPct = Math.max(
                (d.total / maxDailyRevenue) * 100,
                d.total > 0 ? 8 : 2
              );
              const isTodayCol = idx === last7DaysData.length - 1;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-mono-num text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.total > 0 ? Math.round(d.total) : ''}
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[42px] rounded-t transition-all ${
                      d.total === 0
                        ? 'bg-slate-200'
                        : isTodayCol
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  />
                  <div className="mt-2 text-center">
                    <span
                      className={`text-xs font-mono-num block ${
                        isTodayCol ? 'font-bold text-orange-600' : 'text-slate-600'
                      }`}
                    >
                      {d.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-num block">
                      {d.dateStr}
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
              className="text-xs text-blue-600 hover:underline font-mono-num"
            >
              View Inventory
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[240px]">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-md border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono-num">
                    SKU: {item.sku} · Min threshold: {item.minStockThreshold} {item.unit}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-bold font-mono-num block ${
                      item.stock <= 0 ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {item.stock <= 0 ? 'Out of Stock' : `${item.stock} ${item.unit} left`}
                  </span>
                  <button
                    onClick={() => onQuickRestock(item)}
                    className="text-[10px] text-blue-600 hover:underline font-mono-num mt-0.5 inline-block"
                  >
                    + Restock
                  </button>
                </div>
              </div>
            ))}

            {lowStockItems.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-mono-num">
                No low stock alerts right now. All inventory items are adequately stocked.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Invoices & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Invoices Feed (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900">
                Recent Invoices
              </h3>
              <p className="text-xs text-slate-500 font-mono-num">
                Latest sales completed at the billing counter
              </p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-blue-600 hover:underline font-mono-num"
            >
              All Invoices ({invoices.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => onPreviewInvoice(inv)}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-bold text-xs text-orange-600">
                      {inv.number}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {inv.customerName}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-num mt-0.5">
                    {new Date(inv.date).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    · {inv.items.length} item(s) · Mode: {inv.paymentMethod.toUpperCase()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono-num font-bold text-sm text-slate-900">
                    {formatINR(inv.total)}
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono-num uppercase font-medium ${
                      inv.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inv.paymentStatus === 'partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {inv.paymentStatus}
                  </span>
                </div>
              </div>
            ))}

            {recentInvoices.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-mono-num">
                No invoices recorded yet. Click "New Bill" to generate your first invoice.
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
              className="text-xs text-blue-600 hover:underline font-mono-num"
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
