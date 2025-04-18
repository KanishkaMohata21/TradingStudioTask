import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import strategyRoutes from './routes/strategy';

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB (using in-memory database for demo purposes)
// In a real application, you would use a real MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/trading-simulator';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // Use in-memory MongoDB-like store for demo purposes
    console.log('Using in-memory database for demo');
  });

// Routes
app.use('/api/strategy', strategyRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});