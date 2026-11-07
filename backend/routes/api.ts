import { Router, Request, Response } from 'express';
import { readDatabase, writeDatabase, readBackups, writeBackups } from '../db/store.js';

export const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Maheswari Plywood & Hardware — Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Get entire store state
apiRouter.get('/store', (_req: Request, res: Response) => {
  const data = readDatabase();
  if (!data) {
    res.status(404).json({ initialized: false, message: 'No backend store saved yet' });
    return;
  }
  res.json({ initialized: true, data });
});

// Save entire store state
apiRouter.put('/store', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ error: 'Invalid store data payload' });
    return;
  }
  const ok = writeDatabase(payload);
  if (!ok) {
    res.status(500).json({ error: 'Failed to persist database' });
    return;
  }
  res.json({ success: true, updatedAt: new Date().toISOString() });
});

// Products CRUD
apiRouter.get('/products', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db?.products || []);
});

apiRouter.post('/products', (req: Request, res: Response) => {
  const db = readDatabase() || { products: [] };
  const newProduct = req.body;
  db.products = [...(db.products || []), newProduct];
  writeDatabase(db);
  res.status(201).json(newProduct);
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  const db = readDatabase();
  if (!db || !Array.isArray(db.products)) {
    res.status(404).json({ error: 'Store not initialized' });
    return;
  }
  const { id } = req.params;
  db.products = db.products.map((p: any) => (p.id === id ? { ...p, ...req.body } : p));
  writeDatabase(db);
  res.json({ success: true });
});

apiRouter.delete('/products/:id', (req: Request, res: Response) => {
  const db = readDatabase();
  if (!db || !Array.isArray(db.products)) {
    res.status(404).json({ error: 'Store not initialized' });
    return;
  }
  const { id } = req.params;
  db.products = db.products.filter((p: any) => p.id !== id);
  writeDatabase(db);
  res.json({ success: true });
});

// Invoices endpoints
apiRouter.get('/invoices', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db?.invoices || []);
});

apiRouter.post('/invoices', (req: Request, res: Response) => {
  const db = readDatabase() || { invoices: [], products: [] };
  const newInvoice = req.body;
  db.invoices = [...(db.invoices || []), newInvoice];
  writeDatabase(db);
  res.status(201).json(newInvoice);
});

// Customers endpoints
apiRouter.get('/customers', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db?.customers || []);
});

apiRouter.post('/customers', (req: Request, res: Response) => {
  const db = readDatabase() || { customers: [] };
  const newCustomer = req.body;
  db.customers = [...(db.customers || []), newCustomer];
  writeDatabase(db);
  res.status(201).json(newCustomer);
});

// Suppliers & Purchases endpoints
apiRouter.get('/suppliers', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db?.suppliers || []);
});

apiRouter.get('/purchases', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db?.purchases || []);
});

// Expenses endpoints
apiRouter.get('/expenses', (_req: Request, res: Response) => {
  const db = readDatabase();
  res.json(db?.expenses || []);
});

// Backups endpoints
apiRouter.get('/backups', (_req: Request, res: Response) => {
  res.json(readBackups());
});

apiRouter.post('/backups', (req: Request, res: Response) => {
  const snapshots = Array.isArray(req.body) ? req.body : [];
  writeBackups(snapshots);
  res.json({ success: true });
});
