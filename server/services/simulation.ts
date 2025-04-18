import { format, parseISO, isAfter, isBefore, parse } from 'date-fns';
import { getHistoricalData } from './financeApi';
import { Strategy, SimulationResults, PriceData, Trade } from '../../types';

// Helper function to evaluate a condition based on the scanner config
function evaluateCondition(
  condition: any,
  priceData: PriceData,
  previousPriceData?: PriceData
): boolean {
  // This is a simplified implementation that could be expanded
  // based on more complex conditions defined in the scanner config
  
  if (!condition || !condition.indicator || !condition.operator || condition.value === undefined) {
    return false;
  }
  
  const { indicator, operator, value } = condition;
  
  // Get the actual value based on the indicator
  let actualValue: number;
  
  switch (indicator) {
    case 'price':
      actualValue = priceData.close;
      break;
    case 'volume':
      actualValue = priceData.volume;
      break;
    case 'priceChange':
      if (!previousPriceData) return false;
      actualValue = ((priceData.close - previousPriceData.close) / previousPriceData.close) * 100;
      break;
    // Add more indicators as needed
    default:
      return false;
  }
  
  // Evaluate the condition
  switch (operator) {
    case '>':
      return actualValue > value;
    case '<':
      return actualValue < value;
    case '>=':
      return actualValue >= value;
    case '<=':
      return actualValue <= value;
    case '==':
      return actualValue === value;
    default:
      return false;
  }
}

// Function to evaluate buy conditions
function shouldBuy(
  buyConfig: Record<string, any>,
  priceData: PriceData,
  previousPriceData?: PriceData
): boolean {
  // Check if there are conditions in the buy config
  if (!buyConfig.conditions || !Array.isArray(buyConfig.conditions) || buyConfig.conditions.length === 0) {
    return false;
  }
  
  // Evaluate all conditions (assuming all conditions must be true - AND logic)
  return buyConfig.conditions.every((condition: any) => 
    evaluateCondition(condition, priceData, previousPriceData)
  );
}

// Function to evaluate sell conditions
function shouldSell(
  sellConfig: Record<string, any>,
  priceData: PriceData,
  previousPriceData?: PriceData,
  trade?: Trade
): boolean {
  // Check if there are conditions in the sell config
  if (!sellConfig.conditions || !Array.isArray(sellConfig.conditions) || sellConfig.conditions.length === 0) {
    return false;
  }
  
  // If there's no trade or it's already closed, nothing to sell
  if (!trade || trade.status === 'closed') {
    return false;
  }
  
  // Evaluate all conditions (assuming all conditions must be true - AND logic)
  const conditionsMet = sellConfig.conditions.some((condition: any) => {
    if (condition.type === 'stopLoss') {
      const currentLoss = ((priceData.close - trade.entryPrice) / trade.entryPrice) * 100;
      return currentLoss <= -condition.value;
    } else if (condition.type === 'takeProfit') {
      const currentProfit = ((priceData.close - trade.entryPrice) / trade.entryPrice) * 100;
      return currentProfit >= condition.value;
    } else {
      return evaluateCondition(condition, priceData, previousPriceData);
    }
  });
  
  return conditionsMet;
}

// Main simulation function
export async function runSimulation(strategy: Strategy): Promise<SimulationResults> {
  const { simulationConfig, scannerConfig, buyConfig, sellConfig } = strategy;
  
  // Parse dates
  const startDate = simulationConfig.startDate;
  const endDate = simulationConfig.endDate;
  
  // Initialize portfolio state
  let cash = simulationConfig.initialCapital;
  let positions: Trade[] = [];
  let allTrades: Trade[] = [];
  const equityCurve: Array<{ date: string; equity: number }> = [];
  
  // Fetch historical data for all symbols
  const historicalDataBySymbol: Record<string, PriceData[]> = {};
  
  for (const symbol of simulationConfig.symbols) {
    historicalDataBySymbol[symbol] = await getHistoricalData(symbol, startDate, endDate);
  }
  
  // Create a sorted list of all trading days
  const allDates = Object.values(historicalDataBySymbol)
    .flat()
    .map(data => data.date)
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort();
  
  // Simulation loop for each day
  for (let i = 0; i < allDates.length; i++) {
    const currentDate = allDates[i];
    const previousDate = i > 0 ? allDates[i - 1] : null;
    
    // Check for sell signals first
    const openPositions = [...positions];
    for (const position of openPositions) {
      // Skip if position is already closed
      if (position.status === 'closed') continue;

      const symbol = position.symbol;
      const currentPriceData = historicalDataBySymbol[symbol].find(
        data => data.date === currentDate
      );
      
      if (!currentPriceData) continue;
      
      let previousPriceData;
      if (previousDate) {
        previousPriceData = historicalDataBySymbol[symbol].find(
          data => data.date === previousDate
        );
      }
      
      if (shouldSell(sellConfig, currentPriceData, previousPriceData, position)) {
        // Close the position
        position.exitDate = currentDate;
        position.exitPrice = currentPriceData.close;
        position.status = 'closed';
        
        // Calculate P&L
        position.pnl = (position.exitPrice! - position.entryPrice) * position.quantity;
        position.pnlPercentage = ((position.exitPrice! - position.entryPrice) / position.entryPrice) * 100;
        
        // Update cash
        cash += position.exitPrice! * position.quantity;
        
        // Remove from active positions
        positions = positions.filter(p => p !== position);
        
        // Add to all trades
        allTrades.push(position);
      }
    }
    
    // Check for buy signals
    for (const symbol of simulationConfig.symbols) {
      // Skip if maximum positions reached
      if (positions.length >= simulationConfig.maxPositions) {
        break;
      }
      
      const currentPriceData = historicalDataBySymbol[symbol].find(
        data => data.date === currentDate
      );
      
      if (!currentPriceData) continue;
      
      let previousPriceData: PriceData | undefined;
      if (previousDate) {
        previousPriceData = historicalDataBySymbol[symbol].find(
          data => data.date === previousDate
        );
      }
      
      // Check scanner conditions first
      const passesScanner = !scannerConfig.conditions || scannerConfig.conditions.every(
        (condition: any) => evaluateCondition(condition, currentPriceData, previousPriceData)
      );
      
      if (passesScanner && shouldBuy(buyConfig, currentPriceData, previousPriceData)) {
        // Calculate position size
        const positionValue = (simulationConfig.positionSize / 100) * simulationConfig.initialCapital;
        
        // Skip if not enough cash
        if (cash < positionValue) continue;
        
        // Calculate quantity (ensuring it's a whole number)
        const quantity = Math.floor(positionValue / currentPriceData.close);
        
        // Skip if quantity is zero
        if (quantity === 0) continue;
        
        // Create new position
        const newTrade: Trade = {
          symbol,
          entryDate: currentDate,
          entryPrice: currentPriceData.close,
          quantity,
          status: 'open'
        };
        
        // Update cash
        cash -= newTrade.entryPrice * newTrade.quantity;
        
        // Add to positions
        positions.push(newTrade);
      }
    }
    
    // Calculate portfolio value for equity curve
    const portfolioValue = positions.reduce(
      (total, position) => {
        const symbolPriceData = historicalDataBySymbol[position.symbol].find(
          data => data.date === currentDate
        );
        
        if (symbolPriceData) {
          return total + symbolPriceData.close * position.quantity;
        }
        
        return total;
      },
      cash
    );
    
    equityCurve.push({
      date: currentDate,
      equity: portfolioValue
    });
  }
  
  // Close any remaining open positions using the last available price
  for (const position of positions) {
    const symbol = position.symbol;
    const lastPriceData = historicalDataBySymbol[symbol][historicalDataBySymbol[symbol].length - 1];
    
    position.exitDate = lastPriceData.date;
    position.exitPrice = lastPriceData.close;
    position.status = 'closed';
    
    // Calculate P&L
    position.pnl = (position.exitPrice - position.entryPrice) * position.quantity;
    position.pnlPercentage = ((position.exitPrice - position.entryPrice) / position.entryPrice) * 100;
    
    // Add to all trades
    allTrades.push(position);
  }
  
  // Calculate performance metrics
  const initialCapital = simulationConfig.initialCapital;
  const finalCapital = equityCurve[equityCurve.length - 1]?.equity || initialCapital;
  
  const totalPnl = finalCapital - initialCapital;
  const totalPnlPercentage = (totalPnl / initialCapital) * 100;
  
  const winningTrades = allTrades.filter(trade => (trade.pnl || 0) > 0).length;
  const totalTrades = allTrades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  // Calculate drawdowns
  const drawdowns: Array<{ date: string; drawdown: number }> = [];
  let peak = initialCapital;
  
  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }
    
    const drawdown = ((peak - point.equity) / peak) * 100;
    drawdowns.push({
      date: point.date,
      drawdown
    });
  }
  
  // Calculate max drawdown
  const maxDrawdown = Math.max(...drawdowns.map(d => d.drawdown), 0);
  
  // Calculate average trade
  const averageTrade = totalTrades > 0
    ? allTrades.reduce((sum, trade) => sum + (trade.pnlPercentage || 0), 0) / totalTrades
    : 0;
  
  // Calculate profit factor
  const grossProfit = allTrades
    .filter(trade => (trade.pnl || 0) > 0)
    .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  
  const grossLoss = Math.abs(
    allTrades
      .filter(trade => (trade.pnl || 0) < 0)
      .reduce((sum, trade) => sum + (trade.pnl || 0), 0)
  );
  
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  
  // Return simulation results
  return {
    totalPnl,
    totalPnlPercentage,
    winRate,
    trades: allTrades,
    equityCurve,
    drawdowns,
    metrics: {
      maxDrawdown,
      averageTrade,
      profitFactor,
      totalTrades,
      winningTrades,
      losingTrades: totalTrades - winningTrades
    }
  };
}