export type Strategy = {
  _id?: string;
  name: string;
  description?: string;
  scannerConfig: Record<string, any>;
  buyConfig: Record<string, any>;
  sellConfig: Record<string, any>;
  simulationConfig: SimulationConfig;
  status: StrategyStatus;
  results?: SimulationResults;
  createdAt?: string;
  updatedAt?: string;
};

export type SimulationConfig = {
  startDate: string;
  endDate: string;
  initialCapital: number;
  symbols: string[];
  maxPositions: number;
  positionSize: number; // percentage of capital per position
};

export type Trade = {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  exitDate?: string;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'open' | 'closed';
};

export type SimulationResults = {
  totalPnl: number;
  totalPnlPercentage: number;
  winRate: number;
  trades: Trade[];
  equityCurve: Array<{ date: string; equity: number }>;
  drawdowns: Array<{ date: string; drawdown: number }>;
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

export type StrategyStatus = 'saved' | 'in_progress' | 'completed';

export type PriceData = {
  date: string;
  open: number;
  high: number;
  close: number;
  low: number;
  volume: number;
};