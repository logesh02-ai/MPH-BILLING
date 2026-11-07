import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building2,
  FileCheck2,
  Trash2,
  Edit2,
  ArrowUpRight,
  PackagePlus,
  Receipt,
  DollarSign,
} from 'lucide-react';
import { Product, Purchase, PurchaseItem, Supplier, PaymentMethod } from '../types';
import { formatINR } from '../utils/numberToWords';

interface PurchasesViewProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  products: Product[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onRecordPurchase: (purchase: Purchase) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  suppliers,
  purchases,
  products,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onRecordPurchase,
}) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Supplier Form State
  const [supName, setSupName] = useState('');
  const [supPerson, setSupPerson] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supGst, setSupGst] = useState('');

  // New Purchase Bill Form State
  const [purSupplierId, setPurSupplierId] = useState('');
  const [purInvoiceNo, setPurInvoiceNo] = useState('');
  const [purDate, setPurDate] = useState(new Date().toISOString().slice(0, 10));
  const [purItems, setPurItems] = useState<
    { productId: string; qty: number; purchasePrice: number; taxRate: number }[]
  >([]);
  const [purPaymentMode, setPurPaymentMode] = useState<PaymentMethod>('bank_transfer');
  const [purAmountPaid, setPurAmountPaid] = useState<string>('');
  const [purNotes, setPurNotes] = useState('');

  // Add Item to Purchase Form
  const [selectedProdId, setSelectedProdId] = useState('');
  const [itemQty, setItemQty] = useState<number>(10);
  const [itemRate, setItemRate] = useState<number>(0);
  const [itemTax, setItemTax] = useState<number>(18);

  const handleSelectProductForPurchase = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setItemRate(prod.purchasePrice);
      setItemTax(prod.taxRate);
    }
  };

  const handleAddItemToPurchase = () => {
    if (!selectedProdId) {
      alert('Select a product to add.');
      return;
    }
    const existingIdx = purItems.findIndex((it) => it.productId === selectedProdId);
    if (existingIdx > -1) {
      const updated = [...purItems];
      updated[existingIdx].qty += itemQty;
      updated[existingIdx].purchasePrice = itemRate;
      updated[existingIdx].taxRate = itemTax;
      setPurItems(updated);
    } else {
      setPurItems([
        ...purItems,
        {
          productId: selectedProdId,
          qty: itemQty,
          purchasePrice: itemRate,
          taxRate: itemTax,
        },
      ]);
    }
    setSelectedProdId('');
    setItemQty(10);
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurItems(purItems.filter((_, i) => i !== index));
  };

  // Calculate Purchase Bill Totals
  const { calculatedPurchaseItems, purSubtotal, purTaxAmount, purGrandTotal } = useMemo(() => {
    let sub = 0;
    let tax = 0;

    const items: PurchaseItem[] = purItems.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const taxable = it.qty * it.purchasePrice;
      const taxAmt = (taxable * it.taxRate) / 100;
      const lineTotal = taxable + taxAmt;

      sub += taxable;
      tax += taxAmt;

      return {
        productId: it.productId,
        name: prod?.name || 'Item',
        sku: prod?.sku || '',
        qty: it.qty,
        unit: prod?.unit || 'pcs',
        purchasePrice: it.purchasePrice,
        taxRate: it.taxRate,
        taxableAmount: Number(taxable.toFixed(2)),
        taxAmount: Number(taxAmt.toFixed(2)),
        total: Number(lineTotal.toFixed(2)),
      };
    });

    return {
      calculatedPurchaseItems: items,
      purSubtotal: Number(sub.toFixed(2)),
      purTaxAmount: Number(tax.toFixed(2)),
      purGrandTotal: Math.round(sub + tax),
    };
  }, [purItems, products]);

  // Submit Purchase
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purSupplierId) {
      alert('Please select a supplier.');
      return;
    }
    if (!purInvoiceNo.trim()) {
      alert('Please enter supplier invoice number.');
      return;
    }
    if (calculatedPurchaseItems.length === 0) {
      alert('Add at least one product to the inward purchase bill.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === purSupplierId);
    const paid = purAmountPaid === '' ? purGrandTotal : parseFloat(purAmountPaid) || 0;
    const due = Math.max(0, purGrandTotal - paid);

    const newPurchase: Purchase = {
      id: 'pur_' + Date.now(),
      invoiceNo: purInvoiceNo.trim(),
      supplierId: purSupplierId,
      supplierName: supplier?.name || 'Supplier',
      date: new Date(purDate).toISOString(),
      items: calculatedPurchaseItems,
      subtotal: purSubtotal,
      taxAmount: purTaxAmount,
      grandTotal: purGrandTotal,
      amountPaid: paid,
      balanceDue: due,
      paymentStatus: due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      paymentMethod: purPaymentMode,
      notes: purNotes.trim(),
    };

    onRecordPurchase(newPurchase);

    // Reset
    setShowAddPurchaseModal(false);
    setPurItems([]);
    setPurSupplierId('');
    setPurInvoiceNo('');
    setPurAmountPaid('');
    setPurNotes('');
  };

  // Submit Supplier
  const handleSubmitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      alert('Supplier name is required.');
      return;
    }

    if (editingSupplier) {
      const updated: Supplier = {
        ...editingSupplier,
        name: supName.trim(),
        contactPerson: supPerson.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        address: supAddress.trim(),
        gst: supGst.trim().toUpperCase(),
      };
      onUpdateSupplier(updated);
    } else {
      const newSup: Supplier = {
        id: 's_' + Date.now(),
        name: supName.trim(),
        contactPerson: supPerson.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim(),
        address: supAddress.trim(),
        gst: supGst.trim().toUpperCase(),
        outstandingBalance: 0,
        createdAt: new Date().toISOString(),
      };
      onAddSupplier(newSup);
    }

    setShowAddSupplierModal(false);
  };

  const totalPurchasesAmount = useMemo(
    () => purchases.reduce((s, p) => s + p.grandTotal, 0),
    [purchases]
  );

  const totalSupplierPayable = useMemo(
    () => suppliers.reduce((s, sup) => s + (sup.outstandingBalance || 0), 0),
    [suppliers]
  );

  return (
    <div className="p-6 space-y-6">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Total Purchase Invoices
          </span>
          <div className="text-2xl font-bold font-mono-num text-slate-900">
            {purchases.length}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            {formatINR(totalPurchasesAmount)} inward goods value
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Registered Suppliers
          </span>
          <div className="text-2xl font-bold font-mono-num text-blue-700">
            {suppliers.length}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Plywood mills, cement &amp; hardware distributors
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Payable to Suppliers
          </span>
          <div className="text-2xl font-bold font-mono-num text-red-600">
            {formatINR(totalSupplierPayable)}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Outstanding credit balance due to vendors
          </span>
        </div>
      </div>

      {/* Tabs and Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'purchases'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inward Purchase Bills ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'suppliers'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vendor Directory ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'purchases' ? (
            <button
              onClick={() => {
                setPurDate(new Date().toISOString().slice(0, 10));
                setShowAddPurchaseModal(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1.5"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Record Inward Stock Bill</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setSupName('');
                setSupPerson('');
                setSupPhone('');
                setSupEmail('');
                setSupAddress('');
                setSupGst('');
                setShowAddSupplierModal(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* View Switch: Purchases List vs Suppliers List */}
      {activeTab === 'purchases' ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-mono-num uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Supplier Bill #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-3 text-right">Taxable</th>
                  <th className="py-3 px-3 text-right">GST</th>
                  <th className="py-3 px-4 text-right">Total Bill</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono-num font-bold text-slate-900">
                      {pur.invoiceNo}
                    </td>

                    <td className="py-3 px-4 font-mono-num text-slate-600">
                      {new Date(pur.date).toLocaleDateString('en-IN', {
                        dateStyle: 'medium',
                      })}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {pur.supplierName}
                    </td>

                    <td className="py-3 px-3 text-center font-mono-num text-slate-600">
                      {pur.items.length} item(s)
                    </td>

                    <td className="py-3 px-3 text-right font-mono-num text-slate-600">
                      {formatINR(pur.subtotal)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-num text-slate-600">
                      {formatINR(pur.taxAmount)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900 text-sm">
                      {formatINR(pur.grandTotal)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono-num uppercase font-medium ${
                          pur.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pur.paymentStatus === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {pur.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}

                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-mono-num">
                      No purchase bills recorded yet. Click "Record Inward Stock Bill" to log incoming inventory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-mono-num uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-3">Phone &amp; Email</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-3">GSTIN</th>
                  <th className="py-3 px-3 text-right">Payable Balance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 text-sm">
                      {s.name}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {s.contactPerson || '—'}
                    </td>

                    <td className="py-3 px-3 font-mono-num text-slate-600">
                      <div>{s.phone}</div>
                      {s.email && <div className="text-[10px] text-slate-400">{s.email}</div>}
                    </td>

                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {s.address || '—'}
                    </td>

                    <td className="py-3 px-3 font-mono-num text-slate-700 font-medium">
                      {s.gst || 'Unregistered'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-num font-bold text-red-600">
                      {formatINR(s.outstandingBalance || 0)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingSupplier(s);
                            setSupName(s.name);
                            setSupPerson(s.contactPerson || '');
                            setSupPhone(s.phone);
                            setSupEmail(s.email || '');
                            setSupAddress(s.address || '');
                            setSupGst(s.gst || '');
                            setShowAddSupplierModal(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete supplier "${s.name}"?`)) {
                              onDeleteSupplier(s.id);
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Inward Purchase Modal */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 border border-slate-200 my-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                Record Inward Stock / Purchase Bill
              </h3>
              <button
                onClick={() => setShowAddPurchaseModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={purSupplierId}
                    onChange={(e) => setPurSupplierId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Supplier Invoice / Bill # *
                  </label>
                  <input
                    type="text"
                    required
                    value={purInvoiceNo}
                    onChange={(e) => setPurInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-9841"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purDate}
                    onChange={(e) => setPurDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                  />
                </div>
              </div>

              {/* Add Items Row */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                <span className="text-[11px] font-mono-num font-semibold text-slate-700 block uppercase">
                  Add Product to Purchase Bill
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] text-slate-500 font-mono-num block mb-0.5">
                      Select Hardware / Plywood
                    </label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleSelectProductForPurchase(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-sans text-xs bg-white"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-mono-num block mb-0.5">
                      Qty Inward
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono-num bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-500 font-mono-num block mb-0.5">
                      Cost Rate (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemRate}
                      onChange={(e) => setItemRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded font-mono-num bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[10px] text-slate-500 font-mono-num block mb-0.5">
                      GST%
                    </label>
                    <select
                      value={itemTax}
                      onChange={(e) => setItemTax(parseInt(e.target.value) || 0)}
                      className="w-full px-1 py-1.5 border border-slate-200 rounded font-mono-num bg-white"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItemToPurchase}
                      className="w-full py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[10px] font-mono-num uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-right">Inward Qty</th>
                      <th className="p-2 text-right">Cost Rate</th>
                      <th className="p-2 text-center">GST%</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-num">
                    {calculatedPurchaseItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 font-sans font-medium text-slate-900">{it.name}</td>
                        <td className="p-2 text-right">
                          {it.qty} {it.unit}
                        </td>
                        <td className="p-2 text-right">₹{it.purchasePrice.toFixed(2)}</td>
                        <td className="p-2 text-center">{it.taxRate}%</td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {formatINR(it.total)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePurchaseItem(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {calculatedPurchaseItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 font-mono-num">
                          No items added yet. Select a product above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payment Area */}
              <div className="grid grid-cols-2 gap-4 items-end pt-2">
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-0.5">
                      Payment Mode
                    </label>
                    <select
                      value={purPaymentMode}
                      onChange={(e) => setPurPaymentMode(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono-num"
                    >
                      <option value="bank_transfer">Bank Transfer (RTGS / NEFT)</option>
                      <option value="upi">UPI / Online</option>
                      <option value="cash">Cash Paid</option>
                      <option value="credit">Credit (Vendor Khata)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-0.5">
                      Amount Paid Now (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={purAmountPaid}
                      onChange={(e) => setPurAmountPaid(e.target.value)}
                      placeholder={String(purGrandTotal)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono-num"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 font-mono-num text-xs text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxable Value:</span>
                    <span>{formatINR(purSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total GST:</span>
                    <span>+{formatINR(purTaxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1">
                    <span>Grand Total:</span>
                    <span className="text-blue-700">{formatINR(purGrandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={calculatedPurchaseItems.length === 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs disabled:opacity-40"
                >
                  Confirm Purchase &amp; Increase Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              {editingSupplier ? 'Edit Supplier' : 'Register New Supplier / Vendor'}
            </h3>

            <form onSubmit={handleSubmitSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Supplier Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. National Plywoods Ltd"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={supPerson}
                  onChange={(e) => setSupPerson(e.target.value)}
                  placeholder="Sales representative name"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="orders@supplier.com"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Timber market, warehouse location"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={supGst}
                  onChange={(e) => setSupGst(e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN"
                  maxLength={15}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                >
                  {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
