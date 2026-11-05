export type UnitOfMeasurement =
  | 'pcs'
  | 'box'
  | 'kg'
  | 'm'
  | 'ltr'
  | 'set'
  | 'sheet'
  | 'sq.ft'
  | 'pkt';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  description?: string;
  hsnCode?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStockThreshold: number;
  unit: UnitOfMeasurement;
  taxRate: number; // e.g. 0, 5, 12, 18, 28
  supplierId?: string;
  supplierName?: string;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  hsnCode?: string;
  purchasePrice: number;
  price: number; // selling price
  qty: number;
  unit: UnitOfMeasurement;
  taxRate: number; // e.g. 18
  itemDiscountPct?: number;
  itemDiscountAmt?: number;
}

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'card'
  | 'bank_transfer'
  | 'credit';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'returned';

export type TaxType = 'intra_state' | 'inter_state'; // intra = CGST + SGST, inter = IGST

export interface InvoiceItem {
  productId: string;
  name: string;
  sku: string;
  hsnCode?: string;
  purchasePrice: number;
  price: number;
  qty: number;
  unit: UnitOfMeasurement;
  taxRate: number;
  itemDiscountPct?: number;
  itemDiscountAmt?: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string; // ISO string
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;
  customerStateCode?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  taxableAmount: number;
  taxType: TaxType;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmt: number;
  roundOff: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  notes?: string;
  // Return & refund tracking
  isReturned?: boolean;
  returnDate?: string;
  returnAmount?: number;
  returnReason?: string;
  returnedItems?: { productId: string; qty: number; refundAmount: number }[];
}

export interface HeldBill {
  id: string;
  date: string;
  note: string;
  cart: CartItem[];
  customerName: string;
  customerPhone: string;
  customerGst: string;
  discountPct: number;
  taxType: TaxType;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  gst?: string;
  stateCode?: string;
  creditLimit?: number;
  outstandingBalance: number;
  createdAt: string;
  notes?: string;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  invoiceId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  gst?: string;
  outstandingBalance: number;
  createdAt: string;
  notes?: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unit: UnitOfMeasurement;
  purchasePrice: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Salary & Wages'
  | 'Transportation & Freight'
  | 'Tea & Refreshments'
  | 'Maintenance & Repairs'
  | 'Packaging'
  | 'Office & Stationery'
  | 'Other';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  description: string;
}

export interface StockAdjustment {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'add' | 'subtract' | 'audit_set';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason:
    | 'Damage/Wastage'
    | 'Stock In (Purchase)'
    | 'Sales Return'
    | 'Physical Inventory Audit'
    | 'Transfer/Correction'
    | 'Initial Stock';
  reference?: string;
}

export interface BankDetails {
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  upiId: string;
}

export interface ShopInfo {
  name: string;
  logo: string; // Base64 data URI
  tagline: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  stateCode: string; // e.g. "33" for Tamil Nadu
  phone: string;
  email: string;
  gst: string;
  pan: string;
  invoicePrefix: string;
  nextInvoiceNo: number;
  defaultTaxRate: number;
  defaultTaxType: TaxType;
  lowStockThreshold: number;
  invoiceTerms: string;
  invoiceFooter: string;
  bankDetails: BankDetails;
}

export interface AppStoreData {
  version: string;
  products: Product[];
  invoices: Invoice[];
  heldBills: HeldBill[];
  customers: Customer[];
  customerPayments: CustomerPayment[];
  suppliers: Supplier[];
  purchases: Purchase[];
  expenses: Expense[];
  stockAdjustments: StockAdjustment[];
  shopInfo: ShopInfo;
}

export interface BackupSnapshot {
  id: string;
  ts: string;
  kind: 'daily' | 'bill' | 'manual' | 'pre-restore';
  label: string;
  products: number;
  invoices: number;
  data: string; // stringified AppStoreData
}
