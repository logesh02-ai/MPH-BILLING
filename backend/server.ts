import express from 'express';
import { apiRouter } from './routes/api.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Enable CORS for separate frontend dev server (e.g., localhost:3000 -> localhost:4000)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use('/api', apiRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Maheswari Plywood & Hardware Backend API running on http://localhost:${PORT}`);
});
