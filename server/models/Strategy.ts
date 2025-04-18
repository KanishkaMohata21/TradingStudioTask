import mongoose, { Schema, Document } from 'mongoose';

// Strategy document interface
export interface IStrategy extends Document {
  name: string;
  description?: string;
  scannerConfig: Record<string, any>;
  buyConfig: Record<string, any>;
  sellConfig: Record<string, any>;
  simulationConfig: {
    startDate: Date;
    endDate: Date;
    initialCapital: number;
    symbols: string[];
    maxPositions: number;
    positionSize: number;
  };
  status: 'saved' | 'in_progress' | 'completed';
  results?: {
    totalPnl: number;
    totalPnlPercentage: number;
    winRate: number;
    trades: Array<{
      symbol: string;
      entryDate: Date;
      entryPrice: number;
      exitDate?: Date;
      exitPrice?: number;
      quantity: number;
      pnl?: number;
      pnlPercentage?: number;
      status: 'open' | 'closed';
    }>;
    equityCurve: Array<{ date: Date; equity: number }>;
    drawdowns: Array<{ date: Date; drawdown: number }>;
    metrics: {
      sharpeRatio?: number;
      maxDrawdown: number;
      averageTrade: number;
      profitFactor?: number;
      totalTrades: number;
      winningTrades: number;
      losingTrades: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Strategy schema
const StrategySchema = new Schema<IStrategy>(
  {
    name: { type: String, required: true },
    description: { type: String },
    scannerConfig: { type: Schema.Types.Mixed, default: {} },
    buyConfig: { type: Schema.Types.Mixed, default: {} },
    sellConfig: { type: Schema.Types.Mixed, default: {} },
    simulationConfig: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      initialCapital: { type: Number, required: true },
      symbols: { type: [String], required: true },
      maxPositions: { type: Number, required: true },
      positionSize: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['saved', 'in_progress', 'completed'],
      default: 'saved',
    },
    results: {
      totalPnl: Number,
      totalPnlPercentage: Number,
      winRate: Number,
      trades: [
        {
          symbol: String,
          entryDate: Date,
          entryPrice: Number,
          exitDate: Date,
          exitPrice: Number,
          quantity: Number,
          pnl: Number,
          pnlPercentage: Number,
          status: {
            type: String,
            enum: ['open', 'closed'],
            default: 'open',
          },
        },
      ],
      equityCurve: [{ date: Date, equity: Number }],
      drawdowns: [{ date: Date, drawdown: Number }],
      metrics: {
        sharpeRatio: Number,
        maxDrawdown: Number,
        averageTrade: Number,
        profitFactor: Number,
        totalTrades: Number,
        winningTrades: Number,
        losingTrades: Number,
      },
    },
  },
  { timestamps: true }
);

// Create and export the Strategy model
export default mongoose.models.Strategy || mongoose.model<IStrategy>('Strategy', StrategySchema);