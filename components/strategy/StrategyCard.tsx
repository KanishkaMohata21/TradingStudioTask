"use client"

import { Strategy } from "@/types";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityIcon, LineChartIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StrategyCardProps {
  strategy: Strategy;
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const getStatusBadge = () => {
    switch (strategy.status) {
      case "saved":
        return <Badge variant="secondary"><SaveIcon className="w-3 h-3 mr-1" /> Saved</Badge>;
      case "in_progress":
        return <Badge variant="warning"><ActivityIcon className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case "completed":
        return <Badge variant="success"><LineChartIcon className="w-3 h-3 mr-1" /> Completed</Badge>;
      default:
        return null;
    }
  };

  const getTimeAgo = () => {
    if (!strategy.updatedAt) return "";
    return formatDistanceToNow(new Date(strategy.updatedAt), { addSuffix: true });
  };

  const getPerformanceBadge = () => {
    if (strategy.status !== "completed" || !strategy.results) return null;
    
    const performance = strategy.results.totalPnlPercentage;
    
    if (performance > 0) {
      return <Badge variant="success">+{performance.toFixed(2)}%</Badge>;
    } else if (performance < 0) {
      return <Badge variant="destructive">{performance.toFixed(2)}%</Badge>;
    } else {
      return <Badge variant="secondary">0.00%</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold">{strategy.name}</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription className="text-sm text-muted-foreground mt-1">
          {strategy.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Start Date</p>
            <p className="font-medium">{new Date(strategy.simulationConfig.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">End Date</p>
            <p className="font-medium">{new Date(strategy.simulationConfig.endDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Initial Capital</p>
            <p className="font-medium">${strategy.simulationConfig.initialCapital.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Performance</p>
            <p className="font-medium">
              {strategy.status === "completed" && strategy.results
                ? (strategy.results.totalPnlPercentage > 0 ? "+" : "") + 
                  strategy.results.totalPnlPercentage.toFixed(2) + "%"
                : "—"}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-2">
        <div className="text-xs text-muted-foreground">
          Updated {getTimeAgo()}
        </div>
        <Link href={`/strategy/${strategy._id}`} passHref>
          <Button size="sm" variant="outline">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}