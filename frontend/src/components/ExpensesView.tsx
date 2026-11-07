import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  Edit2,
  Trash2,
  Download,
  Receipt,
  PieChart,
} from 'lucide-react';
import { Expense, ExpenseCategory, PaymentMethod } from '../types';
import { formatINR } from '../utils/numberToWords';
import { downloadCsv } from '../services/storage';

interface ExpensesViewProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Electricity',
  'Salary & Wages',
  'Transportation & Freight',
  'Tea & Refreshments',
  'Maintenance & Repairs',
  'Packaging',
  'Office & Stationery',
  'Other',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'today'>('this_month');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Rent');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('cash');
  const [formRef, setFormRef] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const now = new Date();

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return [...expenses].reverse().filter((e) => {
      const matchCat = selectedCategory === 'All' || e.category === selectedCategory;
      const matchQuery =
        !q ||
        e.description.toLowerCase().includes(q) ||
        (e.referenceNo && e.referenceNo.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q);

      let matchDate = true;
      const d = new Date(e.date);
      if (dateFilter === 'today') {
        matchDate =
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
      } else if (dateFilter === 'this_month') {
        matchDate = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }

      return matchCat && matchQuery && matchDate;
    });
  }, [expenses, searchQuery, selectedCategory, dateFilter]);

  // Total Expenses
  const totalExpenseAmount = useMemo(
    () => filteredExpenses.reduce((s, e) => s + e.amount, 0),
    [filteredExpenses]
  );

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    filteredExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCategory('Tea & Refreshments');
    setFormAmount(0);
    setFormPaymentMethod('cash');
    setFormRef('');
    setFormDesc('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormDate(new Date(exp.date).toISOString().slice(0, 10));
    setFormCategory(exp.category);
    setFormAmount(exp.amount);
    setFormPaymentMethod(exp.paymentMethod);
    setFormRef(exp.referenceNo || '');
    setFormDesc(exp.description);
    setShowAddModal(true);
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formAmount <= 0) {
      alert('Amount must be greater than zero.');
      return;
    }
    if (!formDesc.trim()) {
      alert('Description is required.');
      return;
    }

    if (editingExpense) {
      const updated: Expense = {
        ...editingExpense,
        date: new Date(formDate).toISOString(),
        category: formCategory,
        amount: Number(formAmount),
        paymentMethod: formPaymentMethod,
        referenceNo: formRef.trim() || undefined,
        description: formDesc.trim(),
      };
      onUpdateExpense(updated);
    } else {
      const newExp: Expense = {
        id: 'exp_' + Date.now(),
        date: new Date(formDate).toISOString(),
        category: formCategory,
        amount: Number(formAmount),
        paymentMethod: formPaymentMethod,
        referenceNo: formRef.trim() || undefined,
        description: formDesc.trim(),
      };
      onAddExpense(newExp);
    }

    setShowAddModal(false);
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Reference No'];
    const rows = filteredExpenses.map((e) => [
      new Date(e.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }),
      e.category,
      e.description,
      e.amount,
      e.paymentMethod,
      e.referenceNo || '',
    ]);

    downloadCsv(`Maheswari-Expenses-Export-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Total Operating Expenses
          </span>
          <div className="text-2xl font-bold font-mono-num text-red-600">
            {formatINR(totalExpenseAmount)}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            {filteredExpenses.length} expense records ({dateFilter.replace('_', ' ')})
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Highest Expense Category
          </span>
          <div className="text-lg font-bold text-slate-900 truncate">
            {categoryBreakdown[0] ? categoryBreakdown[0][0] : 'None'}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            {categoryBreakdown[0] ? formatINR(categoryBreakdown[0][1]) : '₹0.00'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            P&amp;L Integration
          </span>
          <div className="text-sm font-semibold text-emerald-700">
            Auto-linked to Net Profit
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Deducted from gross profit without double-counting
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
            placeholder="Search description, reference # or category..."
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
            <option value="this_month">This Month</option>
            <option value="today">Today Only</option>
            <option value="all">All Time</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-sans focus:outline-none"
          >
            <option value="All">Category: All</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Add Expense Button */}
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-mono-num uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-3">Payment Mode</th>
                <th className="py-3 px-3">Ref / Voucher #</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono-num text-slate-600">
                    {new Date(exp.date).toLocaleDateString('en-IN', {
                      dateStyle: 'medium',
                    })}
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-medium text-[11px]">
                      {exp.category}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                    {exp.description}
                  </td>

                  <td className="py-3 px-3 font-mono-num uppercase text-slate-600 text-[11px]">
                    {exp.paymentMethod.replace('_', ' ')}
                  </td>

                  <td className="py-3 px-3 font-mono-num text-slate-500">
                    {exp.referenceNo || '—'}
                  </td>

                  <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900 text-sm">
                    {formatINR(exp.amount)}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this expense record?')) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs font-mono-num">
                    No expense records found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              {editingExpense ? 'Edit Expense' : 'Record Shop Operating Expense'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. November shop rent / Auto freight for delivery"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Payment Method
                </label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                >
                  <option value="cash">Cash Paid</option>
                  <option value="upi">UPI / GPay / PhonePe</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="card">Card POS</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Voucher / Receipt / Reference #
                </label>
                <input
                  type="text"
                  value={formRef}
                  onChange={(e) => setFormRef(e.target.value)}
                  placeholder="e.g. Receipt # / TNEB consumer ID"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
