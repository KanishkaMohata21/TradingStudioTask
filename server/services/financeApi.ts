import { format, subDays, parse, isAfter, isBefore, addDays } from 'date-fns';
import { PriceData } from '../../types';

// Mock stock symbols and their base prices
const stockSymbols = [
  { symbol: 'AAPL', basePrice: 150 },
  { symbol: 'MSFT', basePrice: 300 },
  { symbol: 'GOOGL', basePrice: 2500 },
  { symbol: 'AMZN', basePrice: 3300 },
  { symbol: 'META', basePrice: 300 },
  { symbol: 'TSLA', basePrice: 800 },
  { symbol: 'NVDA', basePrice: 700 },
  { symbol: 'JPM', basePrice: 160 },
  { symbol: 'V', basePrice: 230 },
  { symbol: 'WMT', basePrice: 140 },
];

// Function to generate realistic price fluctuations
function generatePriceData(
  symbol: string,
  startDate: string | Date,
  endDate: string | Date
): PriceData[] {
  const startDateStr = startDate instanceof Date ? format(startDate, 'yyyy-MM-dd') : startDate;
  const endDateStr = endDate instanceof Date ? format(endDate, 'yyyy-MM-dd') : endDate;
  
  const parsedStartDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
  const parsedEndDate = parse(endDateStr, 'yyyy-MM-dd', new Date());

  const stockInfo = stockSymbols.find(s => s.symbol === symbol) || { symbol, basePrice: 100 };
  let currentPrice = stockInfo.basePrice;
  
  const data: PriceData[] = [];
  let currentDate = parsedStartDate;
  
  while (!isAfter(currentDate, parsedEndDate)) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const dailyChange = (Math.random() - 0.48) * 0.04 * currentPrice;
      const openPrice = currentPrice;
      const closePrice = openPrice + dailyChange;
      const highPrice = Math.max(openPrice, closePrice) + (Math.random() * 0.01 * openPrice);
      const lowPrice = Math.min(openPrice, closePrice) - (Math.random() * 0.01 * openPrice);

      const volume = Math.floor(Math.random() * 9000000) + 1000000;
      
      data.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        open: parseFloat(openPrice.toFixed(2)),
        close: parseFloat(closePrice.toFixed(2)),
        high: parseFloat(highPrice.toFixed(2)),
        low: parseFloat(lowPrice.toFixed(2)),
        volume
      });

      currentPrice = closePrice;
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return data;
}

// Mock API function to get historical data
export async function getHistoricalData(
  symbol: string,
  startDate: string | Date,
  endDate: string | Date
): Promise<PriceData[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Generate and return mock data
  return generatePriceData(symbol, startDate, endDate);
}

// Function to get available symbols
export function getAvailableSymbols(): string[] {
  return stockSymbols.map(stock => stock.symbol);
}