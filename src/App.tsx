import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavTab, Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { BillingView } from './components/BillingView';
import { InventoryView } from './components/InventoryView';
import { InvoiceHistoryView } from './components/InvoiceHistoryView';
import { CustomersView } from './components/CustomersView';
import { PurchasesView } from './components/PurchasesView';
import { ExpensesView } from './components/ExpensesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { InvoiceModal } from './components/InvoiceModal';
import {
  AppStoreData,
  Customer,
  CustomerPayment,
  Expense,
  HeldBill,
  Invoice,
  Product,
  Purchase,
  ShopInfo,
  StockAdjustment,
  Supplier,
} from './types';
import {
  createSnapshot,
  exportBackupJson,
  loadStore,
  saveStore,
} from './services/storage';

export default function App() {
  const [store, setStore] = useState<AppStoreData>(() => loadStore());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeInvoiceModal, setActiveInvoiceModal] = useState<Invoice | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Sync store changes to persistence
  const updateStore = useCallback((updater: (prev: AppStoreData) => AppStoreData) => {
    setStore((prev) => {
      const next = updater(prev);
      saveStore(next);
      return next;
    });
  }, []);

  // Today's Sales Calculation for Header
  const todaySalesStats = useMemo(() => {
    const now = new Date();
    const todayInvs = store.invoices.filter((inv) => {
      const d = new Date(inv.date);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });
    const total = todayInvs.reduce((s, inv) => s + inv.total, 0);
    return { count: todayInvs.length, total };
  }, [store.invoices]);

  // Alert Badges Count
  const lowStockCount = useMemo(
    () => store.products.filter((p) => p.stock <= p.minStockThreshold).length,
    [store.products]
  );

  const khataPendingCount = useMemo(
    () => store.customers.filter((c) => (c.outstandingBalance || 0) > 0).length,
    [store.customers]
  );

  // 1. Complete Sale Handler
  const handleCompleteSale = useCallback(
    (newInvoice: Invoice) => {
      updateStore((prev) => {
        // A. Deduct stock for each cart item
        const updatedProducts = prev.products.map((p) => {
          const cartItem = newInvoice.items.find((item) => item.productId === p.id);
          if (cartItem) {
            return {
              ...p,
              stock: Math.max(0, p.stock - cartItem.qty),
            };
          }
          return p;
        });

        // B. Update Customer Khata balance if balance due
        let updatedCustomers = [...prev.customers];
        if (newInvoice.customerId) {
          const custIdx = updatedCustomers.findIndex((c) => c.id === newInvoice.customerId);
          if (custIdx > -1) {
            updatedCustomers[custIdx] = {
              ...updatedCustomers[custIdx],
              outstandingBalance:
                (updatedCustomers[custIdx].outstandingBalance || 0) + newInvoice.balanceDue,
              phone: newInvoice.customerPhone || updatedCustomers[custIdx].phone,
              gst: newInvoice.customerGst || updatedCustomers[custIdx].gst,
            };
          }
        } else if (newInvoice.customerName && newInvoice.customerName !== 'Walk-in Customer') {
          // If customer isn't in DB yet, auto-save customer
          const existing = updatedCustomers.find(
            (c) => c.name.toLowerCase() === newInvoice.customerName.toLowerCase()
          );
          if (existing) {
            existing.outstandingBalance =
              (existing.outstandingBalance || 0) + newInvoice.balanceDue;
            if (newInvoice.customerPhone) existing.phone = newInvoice.customerPhone;
            if (newInvoice.customerGst) existing.gst = newInvoice.customerGst;
          } else {
            updatedCustomers.push({
              id: 'c_' + Date.now(),
              name: newInvoice.customerName,
              phone: newInvoice.customerPhone || '',
              gst: newInvoice.customerGst || '',
              outstandingBalance: newInvoice.balanceDue,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // C. Record stock movement adjustments
        const newAdjustments: StockAdjustment[] = newInvoice.items.map((it) => {
          const p = prev.products.find((prod) => prod.id === it.productId);
          const prevQty = p ? p.stock : it.qty;
          return {
            id: 'adj_' + Date.now() + '_' + it.productId,
            date: newInvoice.date,
            productId: it.productId,
            productName: it.name,
            sku: it.sku,
            type: 'subtract',
            quantity: it.qty,
            previousStock: prevQty,
            newStock: Math.max(0, prevQty - it.qty),
            reason: 'Physical Inventory Audit',
            reference: `Sale ${newInvoice.number}`,
          };
        });

        const updatedShopInfo = {
          ...prev.shopInfo,
          nextInvoiceNo: (prev.shopInfo.nextInvoiceNo || 101) + 1,
        };

        return {
          ...prev,
          products: updatedProducts,
          invoices: [...prev.invoices, newInvoice],
          customers: updatedCustomers,
          stockAdjustments: [...prev.stockAdjustments, ...newAdjustments],
          shopInfo: updatedShopInfo,
        };
      });

      createSnapshot(`After Sale ${newInvoice.number}`, 'bill');
      setActiveInvoiceModal(newInvoice);
      showToast(`Sale completed! Invoice ${newInvoice.number} generated.`);
    },
    [updateStore, showToast]
  );

  // 2. Return & Refund Handler
  const handleProcessReturn = useCallback(
    (
      invoiceId: string,
      returnedItems: { productId: string; qty: number; refundAmount: number }[],
      refundTotal: number,
      reason: string
    ) => {
      updateStore((prev) => {
        // A. Restore stock for returned items
        const updatedProducts = prev.products.map((p) => {
          const retItem = returnedItems.find((r) => r.productId === p.id);
          if (retItem) {
            return {
              ...p,
              stock: p.stock + retItem.qty,
            };
          }
          return p;
        });

        // B. Mark invoice as returned/adjusted
        const targetInv = prev.invoices.find((i) => i.id === invoiceId);
        const updatedInvoices = prev.invoices.map((inv) => {
          if (inv.id === invoiceId) {
            return {
              ...inv,
              isReturned: true,
              returnDate: new Date().toISOString(),
              returnAmount: refundTotal,
              returnReason: reason,
              paymentStatus: 'returned' as const,
              returnedItems,
            };
          }
          return inv;
        });

        // C. Reduce customer balance if credit sale
        let updatedCustomers = [...prev.customers];
        if (targetInv?.customerId) {
          const cIndex = updatedCustomers.findIndex((c) => c.id === targetInv.customerId);
          if (cIndex > -1) {
            const currentBal = updatedCustomers[cIndex].outstandingBalance || 0;
            updatedCustomers[cIndex] = {
              ...updatedCustomers[cIndex],
              outstandingBalance: Math.max(0, currentBal - refundTotal),
            };
          }
        }

        // D. Record Stock Adjustments
        const newAdjustments: StockAdjustment[] = returnedItems.map((r) => {
          const prod = prev.products.find((p) => p.id === r.productId);
          const cur = prod ? prod.stock : 0;
          return {
            id: 'adj_ret_' + Date.now() + '_' + r.productId,
            date: new Date().toISOString(),
            productId: r.productId,
            productName: prod?.name || 'Item',
            sku: prod?.sku || '',
            type: 'add',
            quantity: r.qty,
            previousStock: cur,
            newStock: cur + r.qty,
            reason: 'Sales Return',
            reference: `Return for ${targetInv?.number || 'Inv'} (${reason})`,
          };
        });

        return {
          ...prev,
          products: updatedProducts,
          invoices: updatedInvoices,
          customers: updatedCustomers,
          stockAdjustments: [...prev.stockAdjustments, ...newAdjustments],
        };
      });

      showToast(`Return processed! Stock restored for ${returnedItems.length} item(s).`);
    },
    [updateStore, showToast]
  );

  // 3. Product Handlers
  const handleAddProduct = useCallback(
    (product: Product) => {
      updateStore((prev) => ({
        ...prev,
        products: [...prev.products, product],
      }));
      showToast(`Product "${product.name}" added to inventory.`);
    },
    [updateStore, showToast]
  );

  const handleUpdateProduct = useCallback(
    (product: Product) => {
      updateStore((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === product.id ? product : p)),
      }));
      showToast(`Product "${product.name}" updated.`);
    },
    [updateStore, showToast]
  );

  const handleDeleteProduct = useCallback(
    (productId: string) => {
      updateStore((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
      showToast('Product removed from inventory.');
    },
    [updateStore, showToast]
  );

  const handleStockAdjustment = useCallback(
    (adjustment: StockAdjustment) => {
      updateStore((prev) => {
        const updatedProducts = prev.products.map((p) => {
          if (p.id === adjustment.productId) {
            return {
              ...p,
              stock: adjustment.newStock,
            };
          }
          return p;
        });
        return {
          ...prev,
          products: updatedProducts,
          stockAdjustments: [...prev.stockAdjustments, adjustment],
        };
      });
      showToast(`Stock updated for ${adjustment.productName} (New: ${adjustment.newStock}).`);
    },
    [updateStore, showToast]
  );

  // 4. Customer Handlers
  const handleAddCustomer = useCallback(
    (customer: Customer) => {
      updateStore((prev) => ({
        ...prev,
        customers: [...prev.customers, customer],
      }));
      showToast(`Customer "${customer.name}" saved.`);
    },
    [updateStore, showToast]
  );

  const handleUpdateCustomer = useCallback(
    (customer: Customer) => {
      updateStore((prev) => ({
        ...prev,
        customers: prev.customers.map((c) => (c.id === customer.id ? customer : c)),
      }));
      showToast(`Customer "${customer.name}" updated.`);
    },
    [updateStore, showToast]
  );

  const handleDeleteCustomer = useCallback(
    (customerId: string) => {
      updateStore((prev) => ({
        ...prev,
        customers: prev.customers.filter((c) => c.id !== customerId),
      }));
      showToast('Customer deleted from directory.');
    },
    [updateStore, showToast]
  );

  const handleCollectPayment = useCallback(
    (payment: CustomerPayment) => {
      updateStore((prev) => {
        const updatedCustomers = prev.customers.map((c) => {
          if (c.id === payment.customerId) {
            return {
              ...c,
              outstandingBalance: Math.max(0, (c.outstandingBalance || 0) - payment.amount),
            };
          }
          return c;
        });

        return {
          ...prev,
          customers: updatedCustomers,
          customerPayments: [...prev.customerPayments, payment],
        };
      });
      showToast(`Payment of ₹${payment.amount.toFixed(2)} received from ${payment.customerName}.`);
    },
    [updateStore, showToast]
  );

  // 5. Purchase & Vendor Handlers
  const handleAddSupplier = useCallback(
    (supplier: Supplier) => {
      updateStore((prev) => ({
        ...prev,
        suppliers: [...prev.suppliers, supplier],
      }));
      showToast(`Supplier "${supplier.name}" registered.`);
    },
    [updateStore, showToast]
  );

  const handleUpdateSupplier = useCallback(
    (supplier: Supplier) => {
      updateStore((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((s) => (s.id === supplier.id ? supplier : s)),
      }));
      showToast(`Supplier "${supplier.name}" updated.`);
    },
    [updateStore, showToast]
  );

  const handleDeleteSupplier = useCallback(
    (supplierId: string) => {
      updateStore((prev) => ({
        ...prev,
        suppliers: prev.suppliers.filter((s) => s.id !== supplierId),
      }));
      showToast('Supplier removed.');
    },
    [updateStore, showToast]
  );

  const handleRecordPurchase = useCallback(
    (purchase: Purchase) => {
      updateStore((prev) => {
        // A. Increase product inventory stock
        const updatedProducts = prev.products.map((p) => {
          const item = purchase.items.find((it) => it.productId === p.id);
          if (item) {
            return {
              ...p,
              stock: p.stock + item.qty,
              purchasePrice: item.purchasePrice, // Update latest purchase cost
            };
          }
          return p;
        });

        // B. Update supplier balance if balance due
        const updatedSuppliers = prev.suppliers.map((s) => {
          if (s.id === purchase.supplierId && purchase.balanceDue > 0) {
            return {
              ...s,
              outstandingBalance: (s.outstandingBalance || 0) + purchase.balanceDue,
            };
          }
          return s;
        });

        // C. Record stock movement adjustments
        const newAdjustments: StockAdjustment[] = purchase.items.map((it) => {
          const prod = prev.products.find((p) => p.id === it.productId);
          const current = prod ? prod.stock : 0;
          return {
            id: 'adj_pur_' + Date.now() + '_' + it.productId,
            date: purchase.date,
            productId: it.productId,
            productName: it.name,
            sku: it.sku,
            type: 'add',
            quantity: it.qty,
            previousStock: current,
            newStock: current + it.qty,
            reason: 'Stock In (Purchase)',
            reference: `Bill ${purchase.invoiceNo} from ${purchase.supplierName}`,
          };
        });

        return {
          ...prev,
          products: updatedProducts,
          purchases: [...prev.purchases, purchase],
          suppliers: updatedSuppliers,
          stockAdjustments: [...prev.stockAdjustments, ...newAdjustments],
        };
      });

      showToast(`Inward stock confirmed for ${purchase.items.length} product(s)!`);
    },
    [updateStore, showToast]
  );

  // 6. Expense Handlers
  const handleAddExpense = useCallback(
    (expense: Expense) => {
      updateStore((prev) => ({
        ...prev,
        expenses: [...prev.expenses, expense],
      }));
      showToast(`Expense of ₹${expense.amount.toFixed(2)} recorded.`);
    },
    [updateStore, showToast]
  );

  const handleUpdateExpense = useCallback(
    (expense: Expense) => {
      updateStore((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === expense.id ? expense : e)),
      }));
      showToast('Expense record updated.');
    },
    [updateStore, showToast]
  );

  const handleDeleteExpense = useCallback(
    (expenseId: string) => {
      updateStore((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== expenseId),
      }));
      showToast('Expense record deleted.');
    },
    [updateStore, showToast]
  );

  // 7. Shop Info Handler
  const handleUpdateShopInfo = useCallback(
    (info: ShopInfo) => {
      updateStore((prev) => ({
        ...prev,
        shopInfo: info,
      }));
      showToast('Settings saved successfully.');
    },
    [updateStore, showToast]
  );

  // 8. Held Bill Handlers
  const handleSaveHeldBill = useCallback(
    (heldBill: HeldBill) => {
      updateStore((prev) => ({
        ...prev,
        heldBills: [...prev.heldBills, heldBill],
      }));
      showToast('Sales ticket parked (Held). You can resume it anytime.');
    },
    [updateStore, showToast]
  );

  const handleResumeHeldBill = useCallback(
    (heldBillId: string) => {
      updateStore((prev) => ({
        ...prev,
        heldBills: prev.heldBills.filter((h) => h.id !== heldBillId),
      }));
      showToast('Held ticket resumed in cart.');
    },
    [updateStore, showToast]
  );

  const handleDeleteHeldBill = useCallback(
    (heldBillId: string) => {
      updateStore((prev) => ({
        ...prev,
        heldBills: prev.heldBills.filter((h) => h.id !== heldBillId),
      }));
      showToast('Held bill deleted.');
    },
    [updateStore, showToast]
  );

  // 9. Quick Restock Action from Dashboard
  const handleQuickRestock = useCallback(
    (product: Product) => {
      const addQtyStr = window.prompt(
        `Quick Restock for ${product.name}\nCurrent Stock: ${product.stock} ${product.unit}\n\nEnter quantity to add:`,
        '10'
      );
      if (!addQtyStr) return;
      const addQty = parseInt(addQtyStr);
      if (isNaN(addQty) || addQty <= 0) return;

      handleStockAdjustment({
        id: 'adj_qr_' + Date.now(),
        date: new Date().toISOString(),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'add',
        quantity: addQty,
        previousStock: product.stock,
        newStock: product.stock + addQty,
        reason: 'Stock In (Purchase)',
        reference: 'Quick Restock from Dashboard',
      });
    },
    [handleStockAdjustment]
  );

  // Quick JSON Backup
  const handleQuickBackup = useCallback(() => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Maheswari-Plywood-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup file downloaded.');
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Dark Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lowStockCount={lowStockCount}
        heldBillsCount={store.heldBills.length}
        khataPendingCount={khataPendingCount}
        shopName={store.shopInfo.name}
        shopGst={store.shopInfo.gst}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          onNavigate={setActiveTab}
          todaySalesTotal={todaySalesStats.total}
          todayInvoicesCount={todaySalesStats.count}
          onQuickBackup={handleQuickBackup}
          onNewBill={() => setActiveTab('billing')}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              products={store.products}
              invoices={store.invoices}
              customers={store.customers}
              onNavigate={setActiveTab}
              onPreviewInvoice={setActiveInvoiceModal}
              onQuickRestock={handleQuickRestock}
            />
          )}

          {activeTab === 'billing' && (
            <BillingView
              products={store.products}
              customers={store.customers}
              heldBills={store.heldBills}
              shopInfo={store.shopInfo}
              onCompleteSale={handleCompleteSale}
              onSaveHeldBill={handleSaveHeldBill}
              onResumeHeldBill={handleResumeHeldBill}
              onDeleteHeldBill={handleDeleteHeldBill}
              onQuickAddCustomer={handleAddCustomer}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={store.products}
              suppliers={store.suppliers}
              stockAdjustments={store.stockAdjustments}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onStockAdjustment={handleStockAdjustment}
            />
          )}

          {activeTab === 'history' && (
            <InvoiceHistoryView
              invoices={store.invoices}
              onSelectInvoice={setActiveInvoiceModal}
              onProcessReturn={handleProcessReturn}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={store.customers}
              invoices={store.invoices}
              customerPayments={store.customerPayments}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onCollectPayment={handleCollectPayment}
              onPreviewInvoice={setActiveInvoiceModal}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              suppliers={store.suppliers}
              purchases={store.purchases}
              products={store.products}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onRecordPurchase={handleRecordPurchase}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={store.expenses}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              invoices={store.invoices}
              expenses={store.expenses}
              products={store.products}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              shopInfo={store.shopInfo}
              onUpdateShopInfo={handleUpdateShopInfo}
              onRestoreCompleted={() => setStore(loadStore())}
            />
          )}
        </main>
      </div>

      {/* Global Invoice Preview / Print Modal */}
      {activeInvoiceModal && (
        <InvoiceModal
          invoice={activeInvoiceModal}
          shopInfo={store.shopInfo}
          onClose={() => setActiveInvoiceModal(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-md shadow-xl text-xs font-mono-num border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
