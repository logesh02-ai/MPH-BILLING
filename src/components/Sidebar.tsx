import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Boxes,
  History,
  Users,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Bookmark,
} from 'lucide-react';
import { SHOP_LOGO_DATA_URI } from '../services/storage';

export type NavTab =
  | 'dashboard'
  | 'billing'
  | 'inventory'
  | 'history'
  | 'customers'
  | 'purchases'
  | 'expenses'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lowStockCount: number;
  heldBillsCount: number;
  khataPendingCount: number;
  shopName: string;
  shopGst: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  lowStockCount,
  heldBillsCount,
  khataPendingCount,
  shopName,
  shopGst,
}) => {
  const navItems: { id: NavTab; label: string; num: string; icon: React.ElementType; badge?: number | string }[] = [
    { id: 'dashboard', label: 'Dashboard', num: '01', icon: LayoutDashboard },
    {
      id: 'billing',
      label: 'New Bill (POS)',
      num: '02',
      icon: ReceiptText,
      badge: heldBillsCount > 0 ? `${heldBillsCount} Held` : undefined,
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      num: '03',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'history', label: 'Invoice History', num: '04', icon: History },
    {
      id: 'customers',
      label: 'Customers & Khata',
      num: '05',
      icon: Users,
      badge: khataPendingCount > 0 ? khataPendingCount : undefined,
    },
    { id: 'purchases', label: 'Purchases & Vendors', num: '06', icon: Truck },
    { id: 'expenses', label: 'Expense Manager', num: '07', icon: Wallet },
    { id: 'reports', label: 'Reports & Profit', num: '08', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Backup', num: '09', icon: Settings },
  ];

  return (
    <aside
      id="app-sidebar"
      className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col shrink-0 min-h-screen select-none"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex flex-col items-center text-center">
        <div className="bg-white p-1.5 rounded shadow-sm mb-2.5 w-20 flex items-center justify-center">
          <img
            src={SHOP_LOGO_DATA_URI}
            alt="Maheswari Plywood & Hardware"
            className="w-full h-auto object-contain"
          />
        </div>
        <h1 className="font-display font-semibold text-white text-base tracking-wide leading-tight">
          {shopName || 'Maheswari Plywood & Hardware'}
        </h1>
        <div className="text-[11px] font-mono-num text-orange-400 font-medium tracking-wider uppercase mt-1">
          Billing &amp; Inventory System
        </div>
        {shopGst && (
          <div className="text-[10px] font-mono-num text-slate-400 mt-1">
            GSTIN: {shopGst}
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all text-left group ${
                isActive
                  ? 'bg-blue-600/90 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span
                className={`text-[10px] font-mono-num ${
                  isActive ? 'text-blue-200' : 'text-slate-500 group-hover:text-slate-400'
                }`}
              >
                {item.num}
              </span>
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="flex-1 truncate">{item.label}</span>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono-num font-semibold ${
                    item.id === 'inventory'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : item.id === 'billing'
                      ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="leading-tight">
          <div className="font-medium text-slate-300">Local Browser Data</div>
          <div className="text-[10px] text-slate-400">Auto-saved · Offline ready</div>
        </div>
      </div>
    </aside>
  );
};
