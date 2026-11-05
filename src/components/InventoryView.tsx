import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Download,
  Upload,
  Edit2,
  Trash2,
  AlertTriangle,
  SlidersHorizontal,
  History,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Product, StockAdjustment, Supplier, UnitOfMeasurement } from '../types';
import { formatINR } from '../utils/numberToWords';
import { downloadCsv } from '../services/storage';

interface InventoryViewProps {
  products: Product[];
  suppliers: Supplier[];
  stockAdjustments: StockAdjustment[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onStockAdjustment: (adjustment: StockAdjustment) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  suppliers,
  stockAdjustments,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onStockAdjustment,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc' | 'price_desc'>('name');

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Add/Edit Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('Hardware Accessories');
  const [formHsn, setFormHsn] = useState('8205');
  const [formPurchasePrice, setFormPurchasePrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formUnit, setFormUnit] = useState<UnitOfMeasurement>('pcs');
  const [formTaxRate, setFormTaxRate] = useState<number>(18);
  const [formMinThreshold, setFormMinThreshold] = useState<number>(5);
  const [formSupplier, setFormSupplier] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Stock Adjustment Form State
  const [adjType, setAdjType] = useState<'add' | 'subtract' | 'audit_set'>('add');
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjReason, setAdjReason] = useState<StockAdjustment['reason']>('Physical Inventory Audit');
  const [adjReference, setAdjReference] = useState('');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Inventory Financial Stats
  const totalItemsCount = products.length;
  const totalStockQty = useMemo(() => products.reduce((s, p) => s + p.stock, 0), [products]);
  const totalStockAtCost = useMemo(
    () => products.reduce((s, p) => s + p.stock * p.purchasePrice, 0),
    [products]
  );
  const totalStockAtRetail = useMemo(
    () => products.reduce((s, p) => s + p.stock * p.sellingPrice, 0),
    [products]
  );
  const potentialGrossProfit = totalStockAtRetail - totalStockAtCost;

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      let matchStock = true;
      if (stockFilter === 'low') matchStock = p.stock > 0 && p.stock <= p.minStockThreshold;
      else if (stockFilter === 'out') matchStock = p.stock <= 0;

      return matchCat && matchQuery && matchStock;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      if (sortBy === 'stock_desc') return b.stock - a.stock;
      if (sortBy === 'price_desc') return b.sellingPrice - a.sellingPrice;
      return 0;
    });

    return result;
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy]);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName('');
    const base = 'HW-' + String(products.length + 1).padStart(3, '0');
    setFormSku(base);
    setFormBarcode('');
    setFormCategory('Hardware Accessories');
    setFormHsn('8205');
    setFormPurchasePrice(0);
    setFormSellingPrice(0);
    setFormStock(10);
    setFormUnit('pcs');
    setFormTaxRate(18);
    setFormMinThreshold(5);
    setFormSupplier('');
    setFormDescription('');
    setShowAddEditModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormCategory(p.category || 'Hardware Accessories');
    setFormHsn(p.hsnCode || '8205');
    setFormPurchasePrice(p.purchasePrice || 0);
    setFormSellingPrice(p.sellingPrice);
    setFormStock(p.stock);
    setFormUnit(p.unit);
    setFormTaxRate(p.taxRate);
    setFormMinThreshold(p.minStockThreshold || 5);
    setFormSupplier(p.supplierName || '');
    setFormDescription(p.description || '');
    setShowAddEditModal(true);
  };

  // Save product form
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Product name is required.');
      return;
    }

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: formName.trim(),
        sku: formSku.trim() || editingProduct.sku,
        barcode: formBarcode.trim() || undefined,
        category: formCategory.trim() || 'General',
        hsnCode: formHsn.trim() || '8205',
        purchasePrice: Number(formPurchasePrice) || 0,
        sellingPrice: Number(formSellingPrice) || 0,
        stock: Number(formStock) || 0,
        unit: formUnit,
        taxRate: Number(formTaxRate) || 18,
        minStockThreshold: Number(formMinThreshold) || 5,
        supplierName: formSupplier.trim() || undefined,
        description: formDescription.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProduct(updated);
    } else {
      const newProduct: Product = {
        id: 'p_' + Date.now(),
        name: formName.trim(),
        sku: formSku.trim() || `HW-${Date.now().toString().slice(-4)}`,
        barcode: formBarcode.trim() || undefined,
        category: formCategory.trim() || 'General',
        hsnCode: formHsn.trim() || '8205',
        purchasePrice: Number(formPurchasePrice) || 0,
        sellingPrice: Number(formSellingPrice) || 0,
        stock: Number(formStock) || 0,
        unit: formUnit,
        taxRate: Number(formTaxRate) || 18,
        minStockThreshold: Number(formMinThreshold) || 5,
        supplierName: formSupplier.trim() || undefined,
        description: formDescription.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };
      onAddProduct(newProduct);
    }

    setShowAddEditModal(false);
  };

  // Open Stock Adjustment
  const handleOpenAdjust = (p: Product) => {
    setAdjustingProduct(p);
    setAdjType('add');
    setAdjQty(1);
    setAdjReason('Physical Inventory Audit');
    setAdjReference('');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    let newStock = adjustingProduct.stock;
    if (adjType === 'add') newStock += adjQty;
    else if (adjType === 'subtract') newStock = Math.max(0, newStock - adjQty);
    else if (adjType === 'audit_set') newStock = adjQty;

    const adjustmentRecord: StockAdjustment = {
      id: 'adj_' + Date.now(),
      date: new Date().toISOString(),
      productId: adjustingProduct.id,
      productName: adjustingProduct.name,
      sku: adjustingProduct.sku,
      type: adjType,
      quantity: adjQty,
      previousStock: adjustingProduct.stock,
      newStock,
      reason: adjReason,
      reference: adjReference.trim(),
    };

    onStockAdjustment(adjustmentRecord);
    setShowAdjustModal(false);
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Name',
      'SKU',
      'Barcode',
      'Category',
      'HSN Code',
      'Purchase Price',
      'Selling Price',
      'Stock',
      'Unit',
      'Tax Rate %',
      'Min Threshold',
      'Supplier',
    ];

    const rows = products.map((p) => [
      p.name,
      p.sku,
      p.barcode || '',
      p.category,
      p.hsnCode || '',
      p.purchasePrice,
      p.sellingPrice,
      p.stock,
      p.unit,
      p.taxRate,
      p.minStockThreshold,
      p.supplierName || '',
    ]);

    downloadCsv(`Maheswari-Plywood-Inventory-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // CSV Import
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          alert('CSV file appears empty or missing data rows.');
          return;
        }

        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 7 && cols[0]) {
            const newProd: Product = {
              id: 'p_' + Date.now() + '_' + i,
              name: cols[0],
              sku: cols[1] || `HW-${Date.now().toString().slice(-4)}`,
              barcode: cols[2] || undefined,
              category: cols[3] || 'Hardware Accessories',
              hsnCode: cols[4] || '8205',
              purchasePrice: parseFloat(cols[5]) || 0,
              sellingPrice: parseFloat(cols[6]) || 0,
              stock: parseInt(cols[7]) || 0,
              unit: (cols[8] as UnitOfMeasurement) || 'pcs',
              taxRate: parseInt(cols[9]) || 18,
              minStockThreshold: parseInt(cols[10]) || 5,
              supplierName: cols[11] || undefined,
            };
            onAddProduct(newProd);
            importedCount++;
          }
        }
        alert(`Successfully imported ${importedCount} product(s) from CSV!`);
      } catch (err) {
        alert('Could not parse CSV file. Please verify CSV format.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Total Inventory SKUs
          </span>
          <div className="text-2xl font-bold font-mono-num text-slate-900">
            {totalItemsCount}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            {totalStockQty} total units in stock
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Total Stock Value (At Cost)
          </span>
          <div className="text-2xl font-bold font-mono-num text-slate-900">
            {formatINR(totalStockAtCost)}
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Purchase capital invested
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Stock Value (At Retail Price)
          </span>
          <div className="text-2xl font-bold font-mono-num text-blue-700">
            {formatINR(totalStockAtRetail)}
          </div>
          <span className="text-xs text-emerald-600 font-medium font-mono-num mt-1 block">
            Est. Margin: {formatINR(potentialGrossProfit)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
            Inventory Health
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-300 rounded font-mono-num">
              {products.filter((p) => p.stock > 0 && p.stock <= p.minStockThreshold).length} Low
            </span>
            <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-300 rounded font-mono-num">
              {products.filter((p) => p.stock <= 0).length} Out
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono-num mt-1 block">
            Automatic threshold warnings
          </span>
        </div>
      </div>

      {/* Action Bar: Search, Category, Filter, Add Product, CSV */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU or barcode..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-sans focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-sans focus:outline-none"
          >
            <option value="all">Stock: All</option>
            <option value="low">Stock: Low Stock Only</option>
            <option value="out">Stock: Out of Stock Only</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-sans focus:outline-none"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="stock_asc">Sort: Stock (Low to High)</option>
            <option value="stock_desc">Sort: Stock (High to Low)</option>
            <option value="price_desc">Sort: Selling Price (High to Low)</option>
          </select>

          {/* Stock Movement Log Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Audit Log</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            title="Export products to CSV spreadsheet"
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* CSV Import */}
          <label className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md flex items-center gap-1 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
          </label>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-mono-num uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item &amp; Category</th>
                <th className="py-3 px-3">SKU / Barcode</th>
                <th className="py-3 px-3 text-center">HSN</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">GST</th>
                <th className="py-3 px-3 text-right">Stock</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredProducts.map((p) => {
                const isOut = p.stock <= 0;
                const isLow = !isOut && p.stock <= p.minStockThreshold;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono-num">
                        {p.category} {p.supplierName ? `· ${p.supplierName}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono-num text-slate-600">
                      <div>{p.sku}</div>
                      {p.barcode && <div className="text-[10px] text-slate-400">{p.barcode}</div>}
                    </td>

                    <td className="py-3 px-3 text-center font-mono-num text-slate-500">
                      {p.hsnCode || '—'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-num text-slate-600">
                      {formatINR(p.purchasePrice)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-num font-bold text-slate-900">
                      {formatINR(p.sellingPrice)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono-num text-slate-600">
                      {p.taxRate}%
                    </td>

                    <td className="py-3 px-3 text-right font-mono-num font-bold">
                      <span className={isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}>
                        {p.stock} {p.unit}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono-num font-medium ${
                          isOut
                            ? 'bg-red-100 text-red-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAdjust(p)}
                          title="Adjust stock (Audit / Damage / Return)"
                          className="px-2 py-1 text-[11px] font-mono-num bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                        >
                          Adjust
                        </button>

                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit product"
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${p.name}"?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          title="Delete product"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs font-mono-num">
                    No products matched the search/filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 border border-slate-200 my-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-display font-bold text-lg text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Hardware / Plywood Product'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Commercial Plywood 18mm (8x4 ft)"
                    className="w-full px-3 py-2 border border-slate-200 rounded font-sans text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. HW-PLY-009"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Barcode (Optional)
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Scan or type barcode"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Plywood / Hand Tools / Plumbing"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    value={formHsn}
                    onChange={(e) => setFormHsn(e.target.value)}
                    placeholder="e.g. 4412 (Plywood) or 8205 (Tools)"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Purchase Cost Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Selling Retail Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none focus:ring-1 focus:ring-blue-500 text-orange-600 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Unit of Measurement *
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as UnitOfMeasurement)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="sheet">sheet (Plywood sheet)</option>
                    <option value="box">box (Box/Carton)</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="m">m (Metre/Pipe length)</option>
                    <option value="ltr">ltr (Litre paint/chemical)</option>
                    <option value="set">set (Tool set/lock set)</option>
                    <option value="sq.ft">sq.ft (Square feet)</option>
                    <option value="pkt">pkt (Packet)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    GST Tax Rate % *
                  </label>
                  <select
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% (Essential Hardware)</option>
                    <option value="12">12% (Electricals)</option>
                    <option value="18">18% (Standard Hardware &amp; Plywood)</option>
                    <option value="28">28% (Cement / Luxury)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Low Stock Threshold (Alert Level)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMinThreshold}
                    onChange={(e) => setFormMinThreshold(parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Primary Supplier / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    placeholder="e.g. National Plywoods Ltd / Asian Hardware Suppliers"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Description &amp; Specifications
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Technical specifications, dimensions, finish..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-slate-200 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              Stock Adjustment: {adjustingProduct.name}
            </h3>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs font-mono-num flex justify-between">
              <span>Current Stock:</span>
              <span className="font-bold text-slate-900">
                {adjustingProduct.stock} {adjustingProduct.unit}
              </span>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Adjustment Operation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('add')}
                    className={`py-1.5 rounded font-mono-num font-medium text-center ${
                      adjType === 'add'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    + Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('subtract')}
                    className={`py-1.5 rounded font-mono-num font-medium text-center ${
                      adjType === 'subtract'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    − Reduce Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('audit_set')}
                    className={`py-1.5 rounded font-mono-num font-medium text-center ${
                      adjType === 'audit_set'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Set Count
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  {adjType === 'audit_set' ? 'Actual Count Quantity' : 'Adjustment Quantity'} (
                  {adjustingProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjQty}
                  onChange={(e) => setAdjQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                >
                  <option value="Physical Inventory Audit">Physical Inventory Audit</option>
                  <option value="Damage/Wastage">Damage / Scrap / Breakage</option>
                  <option value="Stock In (Purchase)">Stock In (Direct Supplier Delivery)</option>
                  <option value="Sales Return">Sales Return from Customer</option>
                  <option value="Transfer/Correction">Correction of Entry Error</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Reference / Memo (Optional)
                </label>
                <input
                  type="text"
                  value={adjReference}
                  onChange={(e) => setAdjReference(e.target.value)}
                  placeholder="e.g. Audit note / Supplier challan #"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                >
                  Save Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustments Audit History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                Stock Adjustment Audit History ({stockAdjustments.length})
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stockAdjustments.map((adj) => (
                <div
                  key={adj.id}
                  className="p-3 border border-slate-100 bg-slate-50 rounded-md text-xs font-mono-num flex justify-between items-center"
                >
                  <div>
                    <div className="font-semibold text-slate-900 font-sans">
                      {adj.productName} ({adj.sku})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Reason: <span className="text-slate-700 font-medium">{adj.reason}</span> ·{' '}
                      {new Date(adj.date).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                    {adj.reference && (
                      <div className="text-[10px] text-slate-400">Ref: {adj.reference}</div>
                    )}
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-bold block ${
                        adj.type === 'add'
                          ? 'text-emerald-700'
                          : adj.type === 'subtract'
                          ? 'text-red-600'
                          : 'text-blue-700'
                      }`}
                    >
                      {adj.type === 'add'
                        ? `+${adj.quantity}`
                        : adj.type === 'subtract'
                        ? `−${adj.quantity}`
                        : `Set to ${adj.quantity}`}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {adj.previousStock} → {adj.newStock}
                    </span>
                  </div>
                </div>
              ))}

              {stockAdjustments.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs font-mono-num">
                  No manual stock adjustments recorded yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
