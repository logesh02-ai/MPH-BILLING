import React, { useState, useEffect } from 'react';
import {
  Settings,
  Download,
  Upload,
  ShieldCheck,
  RefreshCw,
  Building,
  CreditCard,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Database,
  FileJson,
  RotateCcw,
} from 'lucide-react';
import { BackupSnapshot, ShopInfo, TaxType } from '../types';
import {
  createSnapshot,
  exportBackupJson,
  importBackupJson,
  readSnapshots,
  resetToSeedData,
  restoreSnapshot,
  SHOP_LOGO_DATA_URI,
} from '../services/storage';

interface SettingsViewProps {
  shopInfo: ShopInfo;
  onUpdateShopInfo: (info: ShopInfo) => void;
  onRestoreCompleted: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  shopInfo,
  onUpdateShopInfo,
  onRestoreCompleted,
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'billing' | 'backup'>('shop');

  // Form State for Shop Info
  const [name, setName] = useState(shopInfo.name);
  const [tagline, setTagline] = useState(shopInfo.tagline);
  const [addressLine1, setAddressLine1] = useState(shopInfo.addressLine1);
  const [addressLine2, setAddressLine2] = useState(shopInfo.addressLine2);
  const [city, setCity] = useState(shopInfo.city);
  const [state, setState] = useState(shopInfo.state);
  const [pincode, setPincode] = useState(shopInfo.pincode);
  const [stateCode, setStateCode] = useState(shopInfo.stateCode);
  const [phone, setPhone] = useState(shopInfo.phone);
  const [email, setEmail] = useState(shopInfo.email);
  const [gst, setGst] = useState(shopInfo.gst);
  const [pan, setPan] = useState(shopInfo.pan);

  // Bank details
  const [bankName, setBankName] = useState(shopInfo.bankDetails?.bankName || '');
  const [accountNo, setAccountNo] = useState(shopInfo.bankDetails?.accountNo || '');
  const [ifsc, setIfsc] = useState(shopInfo.bankDetails?.ifsc || '');
  const [branch, setBranch] = useState(shopInfo.bankDetails?.branch || '');
  const [upiId, setUpiId] = useState(shopInfo.bankDetails?.upiId || '');

  // Billing configuration
  const [invoicePrefix, setInvoicePrefix] = useState(shopInfo.invoicePrefix || 'HW-');
  const [nextInvoiceNo, setNextInvoiceNo] = useState(shopInfo.nextInvoiceNo || 101);
  const [defaultTaxRate, setDefaultTaxRate] = useState(shopInfo.defaultTaxRate || 18);
  const [defaultTaxType, setDefaultTaxType] = useState<TaxType>(
    shopInfo.defaultTaxType || 'intra_state'
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(shopInfo.lowStockThreshold || 5);
  const [invoiceTerms, setInvoiceTerms] = useState(shopInfo.invoiceTerms || '');
  const [invoiceFooter, setInvoiceFooter] = useState(shopInfo.invoiceFooter || '');

  // Snapshots list state
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);

  useEffect(() => {
    setSnapshots(readSnapshots().reverse());
  }, []);

  const handleSaveShopSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ShopInfo = {
      ...shopInfo,
      name: name.trim(),
      tagline: tagline.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      stateCode: stateCode.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gst: gst.trim().toUpperCase(),
      pan: pan.trim().toUpperCase(),
      bankDetails: {
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        branch: branch.trim(),
        upiId: upiId.trim(),
      },
    };
    onUpdateShopInfo(updated);
    alert('Shop details and bank information saved successfully.');
  };

  const handleSaveBillingSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ShopInfo = {
      ...shopInfo,
      invoicePrefix: invoicePrefix.trim(),
      nextInvoiceNo: Number(nextInvoiceNo),
      defaultTaxRate: Number(defaultTaxRate),
      defaultTaxType,
      lowStockThreshold: Number(lowStockThreshold),
      invoiceTerms: invoiceTerms.trim(),
      invoiceFooter: invoiceFooter.trim(),
    };
    onUpdateShopInfo(updated);
    alert('Billing and tax preferences saved successfully.');
  };

  // Export Full JSON Backup
  const handleDownloadBackupFile = () => {
    const jsonStr = exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `Maheswari-Plywood-Backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Backup file downloaded successfully. Keep this file safe on your computer, pen drive, or email.');
  };

  // Import Backup File
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !window.confirm(
        'Restore from this backup file?\n\nThis will replace products, invoices, customers, and settings with the contents of the backup. An automatic restore safety snapshot will be created before proceeding.'
      )
    ) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = importBackupJson(content);
      if (res.success) {
        alert('Backup successfully restored!');
        onRestoreCompleted();
        setSnapshots(readSnapshots().reverse());
      } else {
        alert(`Restore failed: ${res.error}`);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // Restore snapshot
  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    if (
      !window.confirm(
        `Restore snapshot from ${new Date(snap.ts).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}?\n\nCurrent data will be backed up automatically before restoring.`
      )
    ) {
      return;
    }

    const res = restoreSnapshot(snap.id);
    if (res) {
      alert('Snapshot restored successfully!');
      onRestoreCompleted();
      setSnapshots(readSnapshots().reverse());
    } else {
      alert('Could not restore snapshot.');
    }
  };

  // Create on-demand manual snapshot
  const handleCreateSnapshotNow = () => {
    createSnapshot('Manual on-demand snapshot', 'manual');
    setSnapshots(readSnapshots().reverse());
    alert('Manual snapshot created in browser vault.');
  };

  // Factory Reset
  const handleFactoryReset = () => {
    const confirm1 = window.confirm(
      'WARNING: Are you sure you want to reset all data back to the default sample dataset?\n\nAn automatic safety backup snapshot will be recorded first.'
    );
    if (!confirm1) return;

    const confirm2 = window.prompt('Type "RESET" to confirm:');
    if (confirm2 !== 'RESET') {
      alert('Reset cancelled.');
      return;
    }

    resetToSeedData();
    alert('Application reset to fresh default dataset.');
    onRestoreCompleted();
    setSnapshots(readSnapshots().reverse());
  };

  return (
    <div className="p-6 space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'shop'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Shop Profile &amp; Bank Details
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'billing'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Billing, GST &amp; Invoice Terms
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'backup'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Backup, Restore &amp; Data Security
        </button>
      </div>

      {/* Tab 1: Shop Profile & Bank Details */}
      {activeTab === 'shop' && (
        <form onSubmit={handleSaveShopSettings} className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Shop Information
                </h3>
                <p className="text-xs text-slate-500 font-mono-num">
                  Appears at the top of your printed tax invoices and receipts
                </p>
              </div>
              <div className="w-16 h-10 p-1 border border-slate-200 rounded flex items-center justify-center bg-white">
                <img
                  src={shopInfo.logo || SHOP_LOGO_DATA_URI}
                  alt="Shop Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Shop Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded font-sans text-sm font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Tagline / Business Description
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    State Code (GST) *
                  </label>
                  <input
                    type="text"
                    required
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="e.g. 33"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Pincode *
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Phone Number (Displayed on Invoices) *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Shop GSTIN *
                  </label>
                  <input
                    type="text"
                    required
                    value={gst}
                    onChange={(e) => setGst(e.target.value.toUpperCase())}
                    placeholder="33ABCDE1234F1Z5"
                    maxLength={15}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num uppercase font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                    Income Tax PAN
                  </label>
                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                Bank &amp; Digital UPI Payment Details
              </h3>
              <p className="text-xs text-slate-500 font-mono-num">
                Printed on invoice for direct bank transfer and UPI QR settlement
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  placeholder="e.g. 30491029384"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num uppercase"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. Poonamallee Branch"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Shop UPI ID (For GPay / PhonePe / Paytm / BHIM)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. maheswariph@sbi or mobile@upi"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="submit"
                className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
              >
                Save Shop &amp; Bank Profile
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Billing & GST Preferences */}
      {activeTab === 'billing' && (
        <form onSubmit={handleSaveBillingSettings} className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                Invoice Numbering &amp; GST Defaults
              </h3>
              <p className="text-xs text-slate-500 font-mono-num">
                Configure sequence numbers, tax types, and terms printed on bills
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  required
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="e.g. HW- or INV-"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Next Invoice Sequence Number
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={nextInvoiceNo}
                  onChange={(e) => setNextInvoiceNo(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Default Tax Treatment
                </label>
                <select
                  value={defaultTaxType}
                  onChange={(e) => setDefaultTaxType(e.target.value as TaxType)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                >
                  <option value="intra_state">Intra-State: CGST (50%) + SGST (50%)</option>
                  <option value="inter_state">Inter-State: IGST (100%)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Default Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono-num"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Invoice Terms &amp; Conditions
                </label>
                <textarea
                  rows={4}
                  value={invoiceTerms}
                  onChange={(e) => setInvoiceTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded font-sans"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
                  Invoice Footer Greeting
                </label>
                <input
                  type="text"
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="submit"
                className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs"
              >
                Save Billing &amp; Tax Preferences
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Backup, Restore & Data Security */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Export & Import Box */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Data Backup &amp; Restore Vault
                </h3>
                <p className="text-xs text-slate-500 font-mono-num">
                  Protect shop records by regularly downloading complete data backup files
                </p>
              </div>
              <button
                onClick={handleCreateSnapshotNow}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded font-medium flex items-center gap-1.5 text-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Backup Now (In Browser)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Download Backup File</span>
                </div>
                <p className="text-xs text-slate-600">
                  Exports all products, invoices, customers, suppliers, expenses, and settings into a single versioned JSON file.
                </p>
                <button
                  onClick={handleDownloadBackupFile}
                  className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Backup (.json)</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Restore from Backup File</span>
                </div>
                <p className="text-xs text-slate-600">
                  Restore from a previous backup file. Current records are automatically saved as a pre-restore snapshot.
                </p>
                <label className="mt-2 w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Select &amp; Restore Backup File</span>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImportBackupFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Automatic Snapshot Ring Buffer */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Automatic Browser Snapshots ({snapshots.length})
                </h3>
                <p className="text-xs text-slate-500 font-mono-num">
                  Automatic points-in-time created after every bill and before restores
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{snap.label}</div>
                    <div className="text-[11px] text-slate-500 font-mono-num">
                      {new Date(snap.ts).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      · {snap.invoices} bills · {snap.products} products
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono-num font-medium text-xs flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              ))}

              {snapshots.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs font-mono-num">
                  No automatic snapshots recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Architecture & Multi-device Notice */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg text-xs space-y-2 text-slate-700">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Storage Architecture &amp; Database Recommendations</span>
            </h4>
            <p className="leading-relaxed">
              <strong>Current Deployment:</strong> The application utilizes hardened browser storage (localStorage with automatic snapshot ring buffering and JSON backup export/restore). This provides zero-network dependency, instant local response, and complete privacy for standalone shop computers.
            </p>
            <p className="leading-relaxed">
              <strong>Multi-Counter / Multi-Device Recommendation:</strong> If Maheswari Plywood &amp; Hardware expands to multiple checkout counters, mobile tablets for yard staff, or remote inventory tracking, browser storage is scoped per device. For simultaneous multi-user access, migrating to a centralized relational database (e.g., PostgreSQL or SQLite with Node/Express backend) is recommended so all cashiers access live shared stock.
            </p>
          </div>

          {/* Factory Reset Area */}
          <div className="bg-red-50/60 border border-red-200 p-4 rounded-lg flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-red-900 text-xs">Factory Reset</div>
              <div className="text-[11px] text-red-700 font-mono-num">
                Resets the application back to the initial sample hardware dataset.
              </div>
            </div>
            <button
              onClick={handleFactoryReset}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shrink-0"
            >
              Reset to Sample Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
