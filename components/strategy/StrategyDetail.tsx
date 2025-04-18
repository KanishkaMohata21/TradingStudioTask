"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Strategy } from "@/types";
import { getStrategy, startSimulation, updateStrategy, copyStrategy } from "@/lib/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  Copy,
  Edit,
  LineChart,
  Loader2,
  PlayCircle,
  TrendingDown,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { EditStrategyForm } from "../strategy/EditStrategy";
import dynamic from "next/dynamic";

// Dynamically import the JSON display component to avoid SSR issues
const JSONInput = dynamic(
  () => import('react-json-editor-ajrm').then(mod => mod.default),
  { ssr: false }
);

interface StrategyDetailProps {
  strategyId: string;
}

export function StrategyDetail({ strategyId }: StrategyDetailProps) {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Load strategy data
  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        const data = await getStrategy(strategyId);
        setStrategy(data);
        setLoading(false);

        // If the strategy is in_progress, start polling for updates
        if (data.status === "in_progress") {
          startPolling();
        }
      } catch (err) {
        setError("Failed to load strategy details.");
        setLoading(false);
      }
    };

    fetchStrategy();

    // Cleanup polling on component unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [strategyId]);

  // Function to start polling for simulation results
  const startPolling = () => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start new polling interval
    const interval = setInterval(async () => {
      try {
        const data = await getStrategy(strategyId);
        setStrategy(data);

        // If simulation is no longer in progress, stop polling
        if (data.status !== "in_progress") {
          clearInterval(interval);
          setPollingInterval(null);
        }
      } catch (err) {
        console.error("Error polling for strategy updates:", err);
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  };

  // Function to start a simulation
  const handleStartSimulation = async () => {
    if (!strategy) return;

    try {
      setSimulating(true);
      await startSimulation(strategyId);
      
      // Update the local strategy state to show in_progress
      setStrategy({
        ...strategy,
        status: "in_progress"
      });
      
      // Start polling for updates
      startPolling();
    } catch (err) {
      setError("Failed to start simulation.");
    } finally {
      setSimulating(false);
    }
  };

  // Function to handle copying strategy
  const handleCopyStrategy = async () => {
    if (!strategy) return;

    try {
      setCopying(true);
      const response = await copyStrategy(strategyId);
      
      toast({
        title: "Strategy copied successfully",
        description: `${strategy.name} (Copy) has been created`,
        variant: "success",
      });

      // Navigate to the new strategy
      router.push(`/strategy/${response.strategy._id}`);
    } catch (error) {
      console.error("Error copying strategy:", error);
      toast({
        title: "Failed to copy strategy",
        description: "An error occurred while copying the strategy",
        variant: "destructive",
      });
    } finally {
      setCopying(false);
    }
  };

  // Handle edit success
  const handleEditSuccess = async () => {
    setShowEditDialog(false);
    
    // Refresh strategy data
    try {
      const data = await getStrategy(strategyId);
      setStrategy(data);
      
      toast({
        title: "Strategy updated",
        description: "Your strategy has been updated successfully",
        variant: "success"
      });
    } catch (err) {
      console.error("Error refreshing strategy data:", err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !strategy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 border border-red-200 rounded-lg bg-red-50 text-red-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p className="mb-4 text-center">{error || "Strategy not found."}</p>
        <Link href="/" passHref>
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Format dates
  const formattedStartDate = strategy.simulationConfig.startDate
    ? format(new Date(strategy.simulationConfig.startDate), "MMM d, yyyy")
    : "N/A";
  
  const formattedEndDate = strategy.simulationConfig.endDate
    ? format(new Date(strategy.simulationConfig.endDate), "MMM d, yyyy")
    : "N/A";

  // Status badge
  const getStatusBadge = () => {
    switch (strategy.status) {
      case "saved":
        return <Badge variant="secondary">Saved</Badge>;
      case "in_progress":
        return <Badge variant="warning" className="animate-pulse">Simulating...</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{strategy.name}</h1>
            {strategy.description && (
              <p className="text-muted-foreground mt-1">{strategy.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyStrategy}
              disabled={copying}
            >
              {copying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              Copy
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            {strategy.status === "saved" && (
              <Button onClick={handleStartSimulation} disabled={simulating}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {simulating ? "Starting..." : "Run Simulation"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Date Range</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="text-2xl font-bold">
              {formattedStartDate} - {formattedEndDate}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Initial Capital</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="text-2xl font-bold">
              ${strategy.simulationConfig.initialCapital.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Return</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="text-2xl font-bold flex items-center">
              {strategy.status === "completed" && strategy.results ? (
                <>
                  {strategy.results.totalPnlPercentage >= 0 ? (
                    <>
                      <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
                      <span className="text-green-500">
                        +{strategy.results.totalPnlPercentage.toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="mr-2 h-5 w-5 text-red-500" />
                      <span className="text-red-500">
                        {strategy.results.totalPnlPercentage.toFixed(2)}%
                      </span>
                    </>
                  )}
                </>
              ) : (
                "—"
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="text-2xl font-bold">
              {strategy.status === "completed" && strategy.results
                ? `${strategy.results.winRate.toFixed(1)}%`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue={strategy.status === "completed" ? "results" : "config"}>
        <TabsList className="mb-6">
          <TabsTrigger value="config">Strategy Configuration</TabsTrigger>
          <TabsTrigger value="results" disabled={strategy.status !== "completed"}>
            Simulation Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="config">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Scanner Configuration</CardTitle>
                <CardDescription>
                  Conditions for filtering instruments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <JSONInput
                    placeholder={strategy.scannerConfig}
                    viewOnly={true}
                    theme="light_mitsuketa_tribute"
                    style={{ body: { fontSize: "14px" } }}
                    height="250px"
                    width="100%"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Buy Rules</CardTitle>
                <CardDescription>
                  Conditions that trigger buy signals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <JSONInput
                    placeholder={strategy.buyConfig}
                    viewOnly={true}
                    theme="light_mitsuketa_tribute"
                    style={{ body: { fontSize: "14px" } }}
                    height="250px"
                    width="100%"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Sell Rules</CardTitle>
                <CardDescription>
                  Conditions that trigger sell signals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <JSONInput
                    placeholder={strategy.sellConfig}
                    viewOnly={true}
                    theme="light_mitsuketa_tribute"
                    style={{ body: { fontSize: "14px" } }}
                    height="250px"
                    width="100%"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Simulation Parameters</CardTitle>
                <CardDescription>
                  Configuration for the backtest.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Date Range</div>
                    <div className="text-base">
                      {formattedStartDate} to {formattedEndDate}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Initial Capital</div>
                    <div className="text-base">
                      ${strategy.simulationConfig.initialCapital.toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Position Size</div>
                    <div className="text-base">
                      {strategy.simulationConfig.positionSize}% of capital
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Max Positions</div>
                    <div className="text-base">
                      {strategy.simulationConfig.maxPositions}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Symbols</div>
                    <div className="text-base flex flex-wrap gap-2">
                      {strategy.simulationConfig.symbols.map((symbol, index) => (
                        <Badge key={index} variant="outline">{symbol}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="results">
          {strategy.status === "completed" && strategy.results ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Total Return</div>
                      <div className={`text-xl font-bold ${strategy.results.totalPnlPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {strategy.results.totalPnlPercentage >= 0 ? '+' : ''}
                        {strategy.results.totalPnlPercentage.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Profit/Loss</div>
                      <div className={`text-xl font-bold ${strategy.results.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {strategy.results.totalPnl >= 0 ? '+' : ''}
                        ${strategy.results.totalPnl.toFixed(2)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Win Rate</div>
                      <div className="text-xl font-bold">
                        {strategy.results.winRate.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Total Trades</div>
                      <div className="text-xl font-bold">
                        {strategy.results.metrics.totalTrades}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Average Trade</div>
                      <div className={`text-xl font-bold ${strategy.results.metrics.averageTrade >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {strategy.results.metrics.averageTrade >= 0 ? '+' : ''}
                        {strategy.results.metrics.averageTrade.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Max Drawdown</div>
                      <div className="text-xl font-bold text-red-500">
                        -{strategy.results.metrics.maxDrawdown.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Profit Factor</div>
                      <div className="text-xl font-bold">
                        {strategy.results.metrics.profitFactor !== undefined
                          ? strategy.results.metrics.profitFactor.toFixed(2)
                          : "N/A"}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Win/Loss</div>
                      <div className="text-xl font-bold">
                        {strategy.results.metrics.winningTrades} / {strategy.results.metrics.losingTrades}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={strategy.results.equityCurve}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(date) => {
                            return format(new Date(date), "MMM dd");
                          }}  
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Portfolio Value"]}
                          labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="equity" 
                          stroke="hsl(var(--chart-1))" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Drawdown Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={strategy.results.drawdowns}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(date) => {
                            return format(new Date(date), "MMM dd");
                          }}  
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value.toFixed(1)}%`}
                          domain={[0, 'dataMax']}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Drawdown"]}
                          labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="drawdown" 
                          stroke="hsl(var(--destructive))" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Trade History</CardTitle>
                  <CardDescription>Record of all trades executed during the simulation.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-medium p-2">Symbol</th>
                          <th className="text-left font-medium p-2">Entry Date</th>
                          <th className="text-right font-medium p-2">Entry Price</th>
                          <th className="text-left font-medium p-2">Exit Date</th>
                          <th className="text-right font-medium p-2">Exit Price</th>
                          <th className="text-right font-medium p-2">Quantity</th>
                          <th className="text-right font-medium p-2">P&L</th>
                          <th className="text-right font-medium p-2">P&L %</th>
                          <th className="text-center font-medium p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {strategy.results.trades.map((trade, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{trade.symbol}</td>
                            <td className="p-2">{format(new Date(trade.entryDate), "MMM d, yyyy")}</td>
                            <td className="p-2 text-right">${trade.entryPrice.toFixed(2)}</td>
                            <td className="p-2">
                              {trade.exitDate ? format(new Date(trade.exitDate), "MMM d, yyyy") : "—"}
                            </td>
                            <td className="p-2 text-right">
                              {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : "—"}
                            </td>
                            <td className="p-2 text-right">{trade.quantity}</td>
                            <td className={`p-2 text-right font-medium ${
                              trade.pnl && trade.pnl > 0 
                                ? "text-green-500" 
                                : trade.pnl && trade.pnl < 0 
                                ? "text-red-500" 
                                : ""
                            }`}>
                              {trade.pnl 
                                ? `${trade.pnl > 0 ? "+" : ""}$${trade.pnl.toFixed(2)}` 
                                : "—"}
                            </td>
                            <td className={`p-2 text-right font-medium ${
                              trade.pnlPercentage && trade.pnlPercentage > 0 
                                ? "text-green-500" 
                                : trade.pnlPercentage && trade.pnlPercentage < 0 
                                ? "text-red-500" 
                                : ""
                            }`}>
                              {trade.pnlPercentage 
                                ? `${trade.pnlPercentage > 0 ? "+" : ""}${trade.pnlPercentage.toFixed(2)}%` 
                                : "—"}
                            </td>
                            <td className="p-2 text-center">
                              {trade.status === "closed" ? (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Closed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-amber-50">
                                  Open
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[300px] p-6 border border-dashed rounded-lg">
              <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">No Simulation Results</h3>
              <p className="text-muted-foreground mb-6 text-center">
                Run a simulation to see performance and trade details
              </p>
              <Button onClick={handleStartSimulation} disabled={simulating || strategy.status === "in_progress"}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {strategy.status === "in_progress" 
                  ? "Simulation in Progress..." 
                  : simulating 
                  ? "Starting Simulation..." 
                  : "Run Simulation"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Edit Strategy Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <EditStrategyForm
            strategy={strategy}
            onSuccess={handleEditSuccess}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}