import React, { useEffect, useState } from 'react';
import { Plus, ReceiptText, Boxes, Wallet, Download, CheckCircle2 } from 'lucide-react';
import { NavTab } from './Sidebar';
import { formatINR } from '../utils/numberToWords';

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  todaySalesTotal: number;
  todayInvoicesCount: number;
  onQuickBackup: () => void;
  onNewBill: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  todaySalesTotal,
  todayInvoicesCount,
  onQuickBackup,
  onNewBill,
}) => {
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(
        now.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard', sub: 'Live sales, stock alerts, and financial overview' };
      case 'billing':
        return { title: 'New Sale Ticket', sub: 'Point of sale billing, barcode scan & invoice generation' };
      case 'inventory':
        return { title: 'Inventory & Stock Management', sub: 'Catalogue, pricing, stock levels and adjustments' };
      case 'history':
        return { title: 'Invoice History & Returns', sub: 'All completed tax invoices, reprints and refunds' };
      case 'customers':
        return { title: 'Customer Ledger & Credit (Khata)', sub: 'Customer directory, balances, and payment receipts' };
      case 'purchases':
        return { title: 'Purchase & Vendor Management', sub: 'Inward stock bills, supplier ledgers and purchase history' };
      case 'expenses':
        return { title: 'Daily Expense Tracker', sub: 'Operating expenses, shop bills, freight and wages' };
      case 'reports':
        return { title: 'Sales & Profit Analysis', sub: 'Tax reports, COGS, gross and net profit margins' };
      case 'settings':
        return { title: 'Shop Settings & Backup Vault', sub: 'Business details, GST settings, and data exports' };
      default:
        return { title: 'Maheswari Plywood & Hardware', sub: 'Billing System' };
    }
  };

  const { title, sub } = getPageTitle();

  return (
    <header
      id="app-header"
      className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs"
    >
      {/* Title & Sub */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-display font-semibold text-slate-900 tracking-tight">
            {title}
            <span className="text-orange-600">.</span>
          </h2>
        </div>
        <p className="text-xs text-slate-500 font-mono-num">{sub}</p>
      </div>

      {/* Right Stats & Quick Actions */}
      <div className="flex items-center gap-4">
        {/* Today's KPI pill */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono-num font-medium">
              Today's Sales
            </span>
            <span className="font-semibold text-slate-900 font-mono-num text-sm">
              {formatINR(todaySalesTotal)}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono-num font-medium">
              Invoices
            </span>
            <span className="font-semibold text-blue-600 font-mono-num text-sm">
              {todayInvoicesCount}
            </span>
          </div>
        </div>

        {/* Live Clock */}
        <div className="hidden md:block text-right">
          <span className="text-[11px] font-mono-num text-slate-500 block">
            {currentDateTime}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> System Active
          </span>
        </div>

        {/* Quick CTA Buttons */}
        <div className="flex items-center gap-2">
          {activeTab !== 'billing' && (
            <button
              onClick={onNewBill}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Bill</span>
            </button>
          )}

          <button
            onClick={onQuickBackup}
            title="Download JSON Backup File"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Backup</span>
          </button>
        </div>
      </div>
    </header>
  );
};
