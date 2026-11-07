import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  History,
  Share2,
  DollarSign,
  ArrowDownLeft,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Customer, CustomerPayment, Invoice, PaymentMethod } from '../types';
import { formatINR } from '../utils/numberToWords';

interface CustomersViewProps {
  customers: Customer[];
  invoices: Invoice[];
  customerPayments: CustomerPayment[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onCollectPayment: (payment: CustomerPayment) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  invoices,
  customerPayments,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onCollectPayment,
  onPreviewInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'due_only' | 'cleared'>('all');

  // Modals & Active Customer
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGst, setFormGst] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState<number>(25000);
  const [formNotes, setFormNotes] = useState('');

  // Payment Collection Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMethod>('cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Total Outstanding Khata
  const totalKhataBalance = useMemo(
    () => customers.reduce((s, c) => s + (c.outstandingBalance || 0), 0),
    [customers]
  );

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.gst && c.gst.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q));

      let matchBalance = true;
      if (balanceFilter === 'due_only') matchBalance = (c.outstandingBalance || 0) > 0;
      else if (balanceFilter === 'cleared') matchBalance = (c.outstandingBalance || 0) <= 0;

      return matchQuery && matchBalance;
    });
  }, [customers, searchQuery, balanceFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormGst('');
    setFormCreditLimit(25000);
    setFormNotes('');
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone || '');
    setFormAddress(c.address || '');
    setFormGst(c.gst || '');
    setFormCreditLimit(c.creditLimit || 25000);
    setFormNotes(c.notes || '');
    setShowAddEditModal(true);
  };

  // Submit Add/Edit Form
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Customer name is required.');
      return;
    }

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: formName.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
        gst: formGst.trim().toUpperCase(),
        creditLimit: Number(formCreditLimit) || 0,
        notes: formNotes.trim(),
      };
      onUpdateCustomer(updated);
    } else {
      const newCust: Customer = {
        id: 'c_' + Date.now(),
        name: formName.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
        gst: formGst.trim().toUpperCase(),
        creditLimit: Number(formCreditLimit) || 25000,
        outstandingBalance: 0,
        createdAt: new Date().toISOString(),
        notes: formNotes.trim(),
      };
      onAddCustomer(newCust);
    }

    setShowAddEditModal(false);
  };

  // Open Payment Collection Modal
  const handleOpenPayment = (c: Customer) => {
    setPaymentCustomer(c);
    setPayAmount(c.outstandingBalance > 0 ? c.outstandingBalance : 0);
    setPayMode('upi');
    setPayRef('');
    setPayNotes(`Payment received from ${c.name}`);
    setShowPaymentModal(true);
  };

  // Submit Payment Collection
  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    if (payAmount <= 0) {
      alert('Enter a valid payment amount greater than zero.');
      return;
    }

    const paymentRecord: CustomerPayment = {
      id: 'pay_' + Date.now(),
      customerId: paymentCustomer.id,
      customerName: paymentCustomer.name,
      date: new Date().toISOString(),
      amount: payAmount,
      paymentMethod: payMode,
      reference: payRef.trim(),
      notes: payNotes.trim(),
    };

    onCollectPayment(paymentRecord);
    setShowPaymentModal(false);
  };

  // Send WhatsApp Reminder
  const handleSendReminder = (c: Customer) => {
    if (!c.phone) {
      alert('No phone number on record for this customer.');
      return;
    }

    let phone = c.phone.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;

    const message = `Dear ${c.name},
Greetings from *Maheswari Plywood & Hardware*.

This is a gentle reminder that your current outstanding khata balance is *${formatINR(
      c.outstandingBalance
    )}*.

Kindly arrange payment via UPI, Bank Transfer or cash at our shop.
Thank you for your continuous patronage!

Maheswari Plywood & Hardware`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Ledger calculation for active customer
  const customerLedger = useMemo(() => {
    if (!selectedLedgerCustomer) return [];

    const entries: {
      id: string;
      date: string;
      type: 'invoice' | 'payment';
      ref: string;
      debit: number; // Invoiced
      credit: number; // Paid
      balance: number;
    }[] = [];

    // Get all customer invoices
    const custInvoices = invoices.filter(
      (inv) =>
        inv.customerId === selectedLedgerCustomer.id ||
        inv.customerName.toLowerCase() === selectedLedgerCustomer.name.toLowerCase()
    );

    // Get all payments
    const custPayments = customerPayments.filter(
      (p) => p.customerId === selectedLedgerCustomer.id
    );

    const merged = [
      ...custInvoices.map((inv) => ({
        id: inv.id,
        date: inv.date,
        type: 'invoice' as const,
        ref: inv.number,
        debit: inv.total,
        credit: inv.amountPaid,
        originalInvoice: inv,
      })),
      ...custPayments.map((p) => ({
        id: p.id,
        date: p.date,
        type: 'payment' as const,
        ref: p.reference || 'Khata Payment',
        debit: 0,
        credit: p.amount,
        originalInvoice: undefined,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    merged.forEach((item) => {
      const netChange = item.debit - item.credit;
      runningBalance += netChange;
      entries.push({
        id: item.id,
        date: item.date,
        type: item.type,
        ref: item.ref,
        debit: item.debit,
        credit: item.credit,
        balance: runningBalance,
      });
    });

    return entries;
  }, [selectedLedgerCustomer, invoices, customerPayments]);

  return (
    <div className="p-6 space-y-6">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Total Customers
          </span>
          <div className="text-2xl font-bold font-mono-num text-slate-900">
            {customers.length}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Contractors, carpenters, and homeowners
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Total Outstanding Khata (Udhar)
          </span>
          <div className="text-2xl font-bold font-mono-num text-red-600">
            {formatINR(totalKhataBalance)}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Total receivables across all accounts
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Accounts with Pending Dues
          </span>
          <div className="text-2xl font-bold font-mono-num text-amber-600">
            {customers.filter((c) => (c.outstandingBalance || 0) > 0).length}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Eligible for WhatsApp payment reminders
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
            placeholder="Search customers by name, phone, address or GSTIN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={balanceFilter}
            onChange={(e) => setBalanceFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-sans focus:outline-none"
          >
            <option value="all">Balance: All Accounts</option>
            <option value="due_only">Balance: With Pending Dues Only</option>
            <option value="cleared">Balance: Zero Balance Cleared</option>
          </select>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-mono-num uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name &amp; Contact</th>
                <th className="py-3 px-4">Address / Site</th>
                <th className="py-3 px-3">GSTIN</th>
                <th className="py-3 px-3 text-right">Credit Limit</th>
                <th className="py-3 px-3 text-right">Outstanding Khata</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredCustomers.map((c) => {
                const hasDue = (c.outstandingBalance || 0) > 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono-num">
                        {c.phone || 'No phone'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {c.address || '—'}
                    </td>

                    <td className="py-3 px-3 font-mono-num text-slate-600">
                      {c.gst || 'Unregistered'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-num text-slate-500">
                      {c.creditLimit ? formatINR(c.creditLimit) : 'No Limit'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-num font-bold text-sm">
                      <span className={hasDue ? 'text-red-600' : 'text-emerald-700'}>
                        {formatINR(c.outstandingBalance || 0)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasDue && (
                          <button
                            onClick={() => handleOpenPayment(c)}
                            title="Collect Khata payment"
                            className="px-2 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1 shadow-xs"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>Collect</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedLedgerCustomer(c)}
                          title="View customer ledger statement"
                          className="px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded flex items-center gap-1 font-medium"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Ledger</span>
                        </button>

                        {hasDue && c.phone && (
                          <button
                            onClick={() => handleSendReminder(c)}
                            title="Send WhatsApp payment reminder"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit customer details"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete customer "${c.name}"? Past invoices remain preserved.`)) {
                              onDeleteCustomer(c.id);
                            }
                          }}
                          title="Delete customer"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-mono-num">
                    No customers found matching the search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Ledger Statement Drawer/Modal */}
      {selectedLedgerCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Customer Ledger: {selectedLedgerCustomer.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono-num">
                  Phone: {selectedLedgerCustomer.phone || 'None'} · GSTIN: {selectedLedgerCustomer.gst || 'None'}
                </p>
              </div>
              <button
                onClick={() => setSelectedLedgerCustomer(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex justify-between items-center text-xs font-mono-num">
              <span>Current Outstanding Khata Balance:</span>
              <span className="text-base font-bold text-red-600">
                {formatINR(selectedLedgerCustomer.outstandingBalance || 0)}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-md">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-mono-num text-slate-600 uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Particulars / Ref</th>
                    <th className="p-2.5 text-right">Invoiced (+)</th>
                    <th className="p-2.5 text-right">Paid (−)</th>
                    <th className="p-2.5 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-num">
                  {customerLedger.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-slate-600">
                        {new Date(row.date).toLocaleDateString('en-IN', {
                          dateStyle: 'medium',
                        })}
                      </td>
                      <td className="p-2.5 font-medium text-slate-900">
                        {row.type === 'invoice' ? (
                          <span className="text-orange-600 font-bold">{row.ref}</span>
                        ) : (
                          <span className="text-emerald-700">Payment ({row.ref})</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-medium">
                        {row.debit > 0 ? formatINR(row.debit) : '—'}
                      </td>
                      <td className="p-2.5 text-right text-emerald-700 font-medium">
                        {row.credit > 0 ? formatINR(row.credit) : '—'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatINR(row.balance)}
                      </td>
                    </tr>
                  ))}

                  {customerLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => handleSendReminder(selectedLedgerCustomer)}
                className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100 flex items-center gap-1"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send WhatsApp Statement</span>
              </button>

              <button
                onClick={() => setSelectedLedgerCustomer(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {showPaymentModal && paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              Collect Khata Payment: {paymentCustomer.name}
            </h3>

            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs font-mono-num flex justify-between items-center">
              <span className="text-red-700">Outstanding Balance:</span>
              <span className="font-bold text-red-700 text-sm">
                {formatINR(paymentCustomer.outstandingBalance || 0)}
              </span>
            </div>

            <form onSubmit={handleCollectPayment} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num text-sm font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                >
                  <option value="cash">Cash Received at Counter</option>
                  <option value="upi">UPI / GPay / PhonePe / QR</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="card">Debit/Credit Card POS</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UPI Ref / Bank UTR / Cash receipt #"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Optional memo"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
                >
                  Save &amp; Credit Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              {editingCustomer ? 'Edit Customer Details' : 'Add New Customer / Contractor'}
            </h3>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Karthik Interiors / Suresh Carpenter"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="10-digit mobile for bills and WhatsApp"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Address / Site Location
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Delivery or billing address"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  GSTIN (For Business Customers)
                </label>
                <input
                  type="text"
                  value={formGst}
                  onChange={(e) => setFormGst(e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formCreditLimit}
                  onChange={(e) => setFormCreditLimit(parseFloat(e.target.value) || 0)}
                  placeholder="Maximum allowed khata balance"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Trade terms, carpenter referral, etc."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                >
                  {editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
