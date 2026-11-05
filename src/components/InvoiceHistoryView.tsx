import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Eye,
  RotateCcw,
  Calendar,
  Share2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Invoice } from '../types';
import { formatINR } from '../utils/numberToWords';
import { downloadCsv } from '../services/storage';
import { ReturnModal } from './ReturnModal';

interface InvoiceHistoryViewProps {
  invoices: Invoice[];
  onSelectInvoice: (invoice: Invoice) => void;
  onProcessReturn: (
    invoiceId: string,
    returnedItems: { productId: string; qty: number; refundAmount: number }[],
    refundTotal: number,
    reason: string
  ) => void;
}

export const InvoiceHistoryView: React.FC<InvoiceHistoryViewProps> = ({
  invoices,
  onSelectInvoice,
  onProcessReturn,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid' | 'returned'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month'>('all');
  const [returningInvoice, setReturningInvoice] = useState<Invoice | null>(null);

  const now = new Date();

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return [...invoices].reverse().filter((inv) => {
      const matchQuery =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        (inv.customerPhone && inv.customerPhone.includes(q)) ||
        (inv.customerGst && inv.customerGst.toLowerCase().includes(q));

      let matchStatus = true;
      if (statusFilter !== 'all') {
        matchStatus = inv.paymentStatus === statusFilter;
      }

      let matchDate = true;
      const invDate = new Date(inv.date);
      if (dateFilter === 'today') {
        matchDate =
          invDate.getDate() === now.getDate() &&
          invDate.getMonth() === now.getMonth() &&
          invDate.getFullYear() === now.getFullYear();
      } else if (dateFilter === 'this_week') {
        const dayOfWeek = now.getDay() || 7;
        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        matchDate = invDate >= startOfWeek;
      } else if (dateFilter === 'this_month') {
        matchDate =
          invDate.getMonth() === now.getMonth() &&
          invDate.getFullYear() === now.getFullYear();
      }

      return matchQuery && matchStatus && matchDate;
    });
  }, [invoices, searchQuery, statusFilter, dateFilter]);

  const totalRevenue = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.total, 0),
    [filteredInvoices]
  );

  const totalOutstanding = useMemo(
    () => filteredInvoices.reduce((s, inv) => s + inv.balanceDue, 0),
    [filteredInvoices]
  );

  const handleExportCsv = () => {
    const headers = [
      'Invoice No',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Customer GSTIN',
      'Items Count',
      'Subtotal',
      'Discount',
      'Taxable',
      'Total GST',
      'Grand Total',
      'Amount Paid',
      'Balance Due',
      'Payment Status',
      'Payment Mode',
    ];

    const rows = filteredInvoices.map((inv) => [
      inv.number,
      new Date(inv.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      inv.customerName,
      inv.customerPhone || '',
      inv.customerGst || '',
      inv.items.length,
      inv.subtotal,
      inv.discountAmt,
      inv.taxableAmount,
      inv.taxAmt,
      inv.total,
      inv.amountPaid,
      inv.balanceDue,
      inv.paymentStatus,
      inv.paymentMethod,
    ]);

    downloadCsv(`Maheswari-Invoices-Export-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Filtered Invoices Count
          </span>
          <div className="text-2xl font-bold font-mono-num text-slate-900">
            {filteredInvoices.length}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Across selected date and status filters
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Total Invoiced Amount
          </span>
          <div className="text-2xl font-bold font-mono-num text-blue-700">
            {formatINR(totalRevenue)}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Gross bill value with taxes
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Pending Credit / Khata
          </span>
          <div className="text-2xl font-bold font-mono-num text-red-600">
            {formatINR(totalOutstanding)}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Remaining balances on credit sales
          </span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice # (e.g. HW-0101), customer name or phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-sans focus:outline-none"
          >
            <option value="all">Date: All Time</option>
            <option value="today">Date: Today Only</option>
            <option value="this_week">Date: This Week</option>
            <option value="this_month">Date: This Month</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-sans focus:outline-none"
          >
            <option value="all">Status: All</option>
            <option value="paid">Status: Paid</option>
            <option value="partial">Status: Partial Payment</option>
            <option value="unpaid">Status: Unpaid / Khata</option>
            <option value="returned">Status: Returned</option>
          </select>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-mono-num uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3 text-center">Items</th>
                <th className="py-3 px-3 text-right">Taxable</th>
                <th className="py-3 px-3 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-3 text-center">Payment Mode</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold font-mono-num text-orange-600">
                    {inv.number}
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-mono-num">
                    <div>
                      {new Date(inv.date).toLocaleDateString('en-IN', {
                        dateStyle: 'medium',
                      })}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(inv.date).toLocaleTimeString('en-IN', {
                        timeStyle: 'short',
                      })}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{inv.customerName}</div>
                    <div className="text-[10px] text-slate-500 font-mono-num">
                      {inv.customerPhone || 'No phone'}
                      {inv.customerGst ? ` · ${inv.customerGst}` : ''}
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center font-mono-num text-slate-600">
                    {inv.items.length} item(s)
                  </td>

                  <td className="py-3 px-3 text-right font-mono-num text-slate-600">
                    {formatINR(inv.taxableAmount)}
                  </td>

                  <td className="py-3 px-3 text-right font-mono-num text-slate-600">
                    {formatINR(inv.taxAmt)}
                  </td>

                  <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900 text-sm">
                    {formatINR(inv.total)}
                    {inv.balanceDue > 0 && (
                      <div className="text-[10px] text-red-600 font-normal">
                        Due: {formatINR(inv.balanceDue)}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center font-mono-num uppercase text-slate-600">
                    {inv.paymentMethod}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono-num uppercase font-medium ${
                        inv.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : inv.paymentStatus === 'returned'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {inv.paymentStatus}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        title="View / Print Tax Invoice"
                        className="px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      {!inv.isReturned && (
                        <button
                          onClick={() => setReturningInvoice(inv)}
                          title="Process Return & Restock items"
                          className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs font-mono-num">
                    No completed invoices match the selected search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal Component */}
      {returningInvoice && (
        <ReturnModal
          invoice={returningInvoice}
          onConfirmReturn={onProcessReturn}
          onClose={() => setReturningInvoice(null)}
        />
      )}
    </div>
  );
};
