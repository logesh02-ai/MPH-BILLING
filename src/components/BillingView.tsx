import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  UserCheck,
  UserPlus,
  ArrowRight,
  Percent,
} from 'lucide-react';
import {
  CartItem,
  Customer,
  HeldBill,
  Invoice,
  PaymentMethod,
  Product,
  ShopInfo,
  TaxType,
} from '../types';
import { calculateCartTotals } from '../utils/taxCalculator';
import { formatINR } from '../utils/numberToWords';

interface BillingViewProps {
  products: Product[];
  customers: Customer[];
  heldBills: HeldBill[];
  shopInfo: ShopInfo;
  onCompleteSale: (invoice: Invoice) => void;
  onSaveHeldBill: (heldBill: HeldBill) => void;
  onResumeHeldBill: (heldBillId: string) => void;
  onDeleteHeldBill: (heldBillId: string) => void;
  onQuickAddCustomer: (customer: Customer) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  products,
  customers,
  heldBills,
  shopInfo,
  onCompleteSale,
  onSaveHeldBill,
  onResumeHeldBill,
  onDeleteHeldBill,
  onQuickAddCustomer,
}) => {
  // Billing Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGst, setCustomerGst] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [showCustSuggest, setShowCustSuggest] = useState(false);

  // Billing Config State
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [taxType, setTaxType] = useState<TaxType>(shopInfo.defaultTaxType || 'intra_state');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');

  // UI Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);
  const [holdNoteInput, setHoldNoteInput] = useState('');
  const [showAddCustModal, setShowAddCustModal] = useState(false);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGst, setNewCustGst] = useState('');

  // Derived Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [products, searchQuery, selectedCategory]);

  // Customer Suggestions
  const customerSuggestions = useMemo(() => {
    const q = customerName.toLowerCase().trim();
    if (!q) return [];
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.gst && c.gst.toLowerCase().includes(q))
    );
  }, [customers, customerName]);

  // Calculate Cart Totals
  const totals = useMemo(() => {
    return calculateCartTotals(cart, discountPct, taxType);
  }, [cart, discountPct, taxType]);

  const amountPaidNum = amountPaidInput === '' ? totals.total : parseFloat(amountPaidInput) || 0;
  const balanceDue = Math.max(0, totals.total - amountPaidNum);

  // Cart Operations
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`"${product.name}" is currently out of stock!`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].qty;
      if (currentQty + 1 > product.stock) {
        alert(`Cannot add more. Only ${product.stock} ${product.unit} available in stock.`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        hsnCode: product.hsnCode,
        purchasePrice: product.purchasePrice,
        price: product.sellingPrice,
        qty: 1,
        unit: product.unit,
        taxRate: product.taxRate,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleUpdateQty = (productId: string, newQty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (newQty <= 0) {
      setCart(cart.filter((item) => item.productId !== productId));
      return;
    }
    if (prod && newQty > prod.stock) {
      alert(`Only ${prod.stock} ${prod.unit} available in stock.`);
      return;
    }
    setCart(
      cart.map((item) => (item.productId === productId ? { ...item, qty: newQty } : item))
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear the sales ticket?')) {
      resetTicket();
    }
  };

  const resetTicket = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGst('');
    setSelectedCustomerId(undefined);
    setDiscountPct(0);
    setAmountPaidInput('');
    setPaymentReference('');
    setNotes('');
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (cart.length === 0) {
      alert('Cart is empty. Add items first before holding.');
      return;
    }
    const note = holdNoteInput.trim() || `Held for ${customerName || 'Customer'}`;
    const newHold: HeldBill = {
      id: 'held_' + Date.now(),
      date: new Date().toISOString(),
      note,
      cart,
      customerName,
      customerPhone,
      customerGst,
      discountPct,
      taxType,
    };
    onSaveHeldBill(newHold);
    setHoldNoteInput('');
    resetTicket();
  };

  const handleResumeBill = (held: HeldBill) => {
    if (cart.length > 0 && !window.confirm('Current cart will be replaced. Continue?')) {
      return;
    }
    setCart(held.cart);
    setCustomerName(held.customerName);
    setCustomerPhone(held.customerPhone);
    setCustomerGst(held.customerGst);
    setDiscountPct(held.discountPct);
    setTaxType(held.taxType);
    onResumeHeldBill(held.id);
    setShowHeldDrawer(false);
  };

  // Select Suggested Customer
  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerGst(c.gst || '');
    setSelectedCustomerId(c.id);
    setShowCustSuggest(false);
  };

  // Quick Add Customer
  const handleSaveQuickCustomer = () => {
    if (!newCustName.trim()) {
      alert('Customer name is required.');
      return;
    }
    const newCust: Customer = {
      id: 'c_' + Date.now(),
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim(),
      gst: newCustGst.trim().toUpperCase(),
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
    };
    onQuickAddCustomer(newCust);
    handleSelectCustomer(newCust);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustGst('');
    setShowAddCustModal(false);
  };

  // Complete Sale
  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      alert('Cannot complete empty sale. Add items to ticket.');
      return;
    }

    // Verify stock availability one more time
    for (const item of cart) {
      const p = products.find((x) => x.id === item.productId);
      if (!p || item.qty > p.stock) {
        alert(
          `Stock mismatch for ${item.name}. Available: ${p ? p.stock : 0}, requested: ${item.qty}.`
        );
        return;
      }
    }

    const invNumber = `${shopInfo.invoicePrefix || 'HW-'}${String(
      shopInfo.nextInvoiceNo || 101
    ).padStart(4, '0')}`;

    const paid = amountPaidInput === '' ? totals.total : parseFloat(amountPaidInput) || 0;
    const due = Math.max(0, totals.total - paid);

    let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
    if (due > 0 && paid > 0) paymentStatus = 'partial';
    else if (due > 0 && paid === 0) paymentStatus = 'unpaid';

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      number: invNumber,
      date: new Date().toISOString(),
      customerId: selectedCustomerId,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      customerGst: customerGst.trim().toUpperCase(),
      items: totals.items,
      subtotal: totals.subtotal,
      discountPct: totals.discountPct,
      discountAmt: totals.discountAmt,
      taxableAmount: totals.taxableAmount,
      taxType: totals.taxType,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      taxAmt: totals.taxAmt,
      roundOff: totals.roundOff,
      total: totals.total,
      paymentMethod,
      amountPaid: paid,
      balanceDue: due,
      paymentStatus,
      paymentReference: paymentReference.trim(),
      notes: notes.trim(),
    };

    onCompleteSale(newInvoice);
    setShowConfirmModal(false);
    resetTicket();
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Product Catalogue & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search bar & quick filters */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by Name, SKU (e.g. HW-PLY-009) or Barcode..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[680px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const inCartItem = cart.find((c) => c.productId === p.id);
              const inCartQty = inCartItem ? inCartItem.qty : 0;
              const remainingStock = p.stock - inCartQty;
              const isOutOfStock = p.stock <= 0;
              const isLowStock = !isOutOfStock && p.stock <= p.minStockThreshold;

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && handleAddToCart(p)}
                  className={`bg-white border rounded-lg p-3 text-left transition-all flex flex-col justify-between select-none ${
                    isOutOfStock
                      ? 'opacity-55 cursor-not-allowed border-slate-200 bg-slate-50'
                      : 'cursor-pointer hover:border-orange-500 hover:shadow-sm border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono-num font-medium text-slate-400 truncate">
                        {p.sku}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono-num shrink-0">
                        GST {p.taxRate}%
                      </span>
                    </div>

                    <h4 className="font-display font-medium text-slate-900 text-sm leading-snug line-clamp-2">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <div className="flex items-baseline justify-between">
                      <span className="text-base font-bold font-mono-num text-orange-600">
                        {formatINR(p.sellingPrice)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono-num">
                        /{p.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono-num mt-1">
                      <span
                        className={
                          isOutOfStock
                            ? 'text-red-600 font-semibold'
                            : isLowStock
                            ? 'text-amber-600 font-medium'
                            : 'text-emerald-700'
                        }
                      >
                        {isOutOfStock
                          ? 'Out of Stock'
                          : isLowStock
                          ? `Low: ${p.stock} ${p.unit}`
                          : `Stock: ${p.stock} ${p.unit}`}
                      </span>

                      {inCartQty > 0 && (
                        <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 font-bold rounded">
                          {inCartQty} in ticket
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full p-8 text-center bg-white rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm">
                No matching hardware or plywood products found. Try Inventory to add products.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sales Ticket & Cart Summary (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg shadow-xs sticky top-20 flex flex-col max-h-[88vh]">
          {/* Ticket Header & Held Drawer Trigger */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-base text-slate-900 tracking-wide flex items-center gap-2">
                <span>SALES TICKET</span>
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-mono-num">
                  {cart.length} item{cart.length === 1 ? '' : 's'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 font-mono-num">
                Maheswari Plywood &amp; Hardware
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {heldBills.length > 0 && (
                <button
                  onClick={() => setShowHeldDrawer(true)}
                  className="px-2.5 py-1 text-xs bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100 font-medium flex items-center gap-1"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>{heldBills.length} Held</span>
                </button>
              )}

              {cart.length > 0 && (
                <button
                  onClick={handleHoldBill}
                  title="Park this cart temporarily"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded"
                >
                  <PauseCircle className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleClearCart}
                disabled={cart.length === 0}
                title="Clear Ticket"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Customer Selection Strip */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2">
            <div className="relative">
              <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                Customer Name
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowCustSuggest(true);
                  }}
                  onFocus={() => setShowCustSuggest(true)}
                  placeholder="Type name (saved customers will auto-suggest)..."
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
                <button
                  onClick={() => setShowAddCustModal(true)}
                  title="Add new customer"
                  className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-medium flex items-center gap-1 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showCustSuggest && customerSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {customerSuggestions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-2 text-xs hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono-num">
                          {c.phone || 'No phone'} {c.gst ? `· GSTIN: ${c.gst}` : ''}
                        </div>
                      </div>
                      {c.outstandingBalance > 0 && (
                        <span className="text-[10px] font-mono-num text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          Due: {formatINR(c.outstandingBalance)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phone & GSTIN row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-0.5">
                  Phone (for WhatsApp)
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10 digit mobile"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-0.5">
                  Customer GSTIN
                </label>
                <input
                  type="text"
                  value={customerGst}
                  onChange={(e) => setCustomerGst(e.target.value.toUpperCase())}
                  placeholder="Optional for B2B"
                  maxLength={15}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono-num uppercase"
                />
              </div>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3.5 divide-y divide-slate-100 min-h-[160px]">
            {cart.map((item) => (
              <div key={item.productId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-slate-900 truncate">
                    {item.name}
                  </h5>
                  <div className="text-[10px] font-mono-num text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>
                      {formatINR(item.price)} /{item.unit}
                    </span>
                    <span>·</span>
                    <span>GST {item.taxRate}%</span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
                  <button
                    onClick={() => handleUpdateQty(item.productId, item.qty - 1)}
                    className="w-5 h-5 flex items-center justify-center text-slate-700 hover:bg-white rounded transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) =>
                      handleUpdateQty(item.productId, parseInt(e.target.value) || 1)
                    }
                    className="w-9 text-center text-xs font-bold font-mono-num bg-transparent focus:outline-none"
                  />
                  <button
                    onClick={() => handleUpdateQty(item.productId, item.qty + 1)}
                    className="w-5 h-5 flex items-center justify-center text-slate-700 hover:bg-white rounded transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="text-right min-w-[64px]">
                  <div className="text-xs font-bold font-mono-num text-slate-900">
                    {formatINR(item.price * item.qty)}
                  </div>
                  <button
                    onClick={() => handleRemoveFromCart(item.productId)}
                    className="text-[10px] text-red-500 hover:text-red-700 font-mono-num"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs font-mono-num">
                Sales ticket is empty.
                <br />
                Click product cards on the left to add items.
              </div>
            )}
          </div>

          {/* Totals & Tax Preferences */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 space-y-2 text-xs">
            {/* Tax Type & Discount Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono-num text-slate-500">Tax Type:</span>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value as TaxType)}
                  className="text-xs bg-white border border-slate-200 rounded px-2 py-1 font-mono-num focus:outline-none"
                >
                  <option value="intra_state">Intra-State (CGST + SGST)</option>
                  <option value="inter_state">Inter-State (IGST)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono-num text-slate-500">Disc:</span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discountPct || ''}
                    onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-10 text-right text-xs font-mono-num focus:outline-none"
                  />
                  <Percent className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 font-mono-num text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatINR(totals.subtotal)}</span>
              </div>
              {totals.discountAmt > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({totals.discountPct}%):</span>
                  <span>−{formatINR(totals.discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Taxable Value:</span>
                <span>{formatINR(totals.taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {taxType === 'intra_state'
                    ? `Total GST (CGST+SGST):`
                    : `Total GST (IGST):`}
                </span>
                <span>+{formatINR(totals.taxAmt)}</span>
              </div>
              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Round-off:</span>
                  <span>
                    {totals.roundOff > 0 ? `+₹${totals.roundOff}` : `−₹${Math.abs(totals.roundOff)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span className="font-display">Total Amount:</span>
                <span className="text-blue-700">{formatINR(totals.total)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-2">
              <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                Payment Mode
              </label>
              <div className="grid grid-cols-5 gap-1 text-[11px] font-medium font-mono-num">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'bank_transfer', label: 'Bank', icon: Building },
                  { id: 'credit', label: 'Khata', icon: UserCheck },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMethod === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setPaymentMethod(mode.id as PaymentMethod)}
                      className={`py-1.5 px-1 rounded flex flex-col items-center justify-center gap-0.5 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Partial / Amount Paid Input */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex-1">
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block">
                  Amount Received
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono-num text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    placeholder={String(totals.total)}
                    className="w-full pl-5 pr-2 py-1 text-xs border border-slate-200 rounded font-mono-num bg-white focus:outline-none"
                  />
                </div>
              </div>

              {balanceDue > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-mono-num uppercase text-red-500 font-semibold block">
                    Khata Balance
                  </span>
                  <span className="text-xs font-bold font-mono-num text-red-600">
                    {formatINR(balanceDue)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Footer Action Buttons */}
          <div className="p-3.5 border-t border-slate-200 bg-white flex gap-2">
            <button
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-40"
            >
              Clear
            </button>

            <button
              onClick={() => {
                if (cart.length === 0) {
                  alert('Cart is empty. Please select products first.');
                  return;
                }
                setShowConfirmModal(true);
              }}
              disabled={cart.length === 0}
              className="flex-2 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md shadow-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Sale ({formatINR(totals.total)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sale Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900">
              Confirm &amp; Complete Sale
            </h3>
            <p className="text-xs text-slate-600">
              Please verify invoice details before completing the sale. Stock will be deducted automatically.
            </p>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md space-y-2 text-xs font-mono-num">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900 font-sans">
                  {customerName || 'Walk-in Customer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items Count:</span>
                <span>{cart.length} item(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Bill Amount:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatINR(totals.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-semibold uppercase text-blue-700">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span>{formatINR(amountPaidNum)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-red-600 font-bold border-t border-slate-200 pt-1">
                  <span>Balance Due (to Khata):</span>
                  <span>{formatINR(balanceDue)}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block">
                Payment Ref / Note (Optional)
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. UPI Ref / Cheque No / Notes"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded font-sans"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeSale}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
              >
                Generate GST Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Drawer */}
      {showHeldDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                Held Bills ({heldBills.length})
              </h3>
              <button
                onClick={() => setShowHeldDrawer(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {heldBills.map((h) => {
                const totalAmt = h.cart.reduce((s, c) => s + c.price * c.qty, 0);
                return (
                  <div
                    key={h.id}
                    className="p-3 border border-slate-200 rounded-md hover:bg-slate-50 flex justify-between items-center gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{h.note}</div>
                      <div className="text-[11px] text-slate-500 font-mono-num">
                        {h.customerName || 'Walk-in'} · {h.cart.length} items ·{' '}
                        {new Date(h.date).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                      </div>
                      <div className="text-xs font-bold font-mono-num text-blue-600 mt-1">
                        Est: {formatINR(totalAmt)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResumeBill(h)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => onDeleteHeldBill(h.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {heldBills.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No held bills stored.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHeldDrawer(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              Quick Add Customer
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Murali Carpenter / Shri Constructions"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Address / Site Location
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Poonamallee, Chennai"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={newCustGst}
                  onChange={(e) => setNewCustGst(e.target.value.toUpperCase())}
                  placeholder="15 character GSTIN"
                  maxLength={15}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num uppercase"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddCustModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickCustomer}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
              >
                Save &amp; Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
