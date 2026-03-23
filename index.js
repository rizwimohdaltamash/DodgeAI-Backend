require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Allow all origins (Vercel frontend can reach Render backend)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check — Render uses this to confirm the service is alive
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
const graphRoutes = require('./routes/graph');
const queryRoutes = require('./routes/query');

app.use('/graph', graphRoutes);
app.use('/query', queryRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dodgeai';

mongoose.connect(MONGO_URI)
.then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => console.error('MongoDB connection error:', err));
