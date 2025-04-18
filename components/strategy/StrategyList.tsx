"use client"

import { Strategy } from "@/types";
import { StrategyCard } from "./StrategyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { getStrategies } from "@/lib/api";
import { PlusCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function StrategyList() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const fetchedStrategies = await getStrategies();
        setStrategies(fetchedStrategies);
        setLoading(false);
      } catch (err) {
        setError("Failed to load strategies. The server might not be running.");
        setLoading(false);
      }
    };

    fetchStrategies();
  }, []);

  const savedStrategies = strategies.filter(s => s.status === "saved");
  const completedStrategies = strategies.filter(s => s.status === "completed");
  const inProgressStrategies = strategies.filter(s => s.status === "in_progress");

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-6 border border-red-200 rounded-lg bg-red-50 text-red-500">
        <p className="mb-4 text-center">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 border border-dashed rounded-lg">
        <h3 className="text-xl font-medium mb-2">No strategies yet</h3>
        <p className="text-muted-foreground mb-6 text-center">
          Create your first trading strategy to get started with simulations
        </p>
        <Link href="/create" passHref>
          <Button>
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            Create Strategy
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Trading Strategies</h2>
        <Link href="/create" passHref>
          <Button>
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            Create Strategy
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Strategies ({strategies.length})</TabsTrigger>
          <TabsTrigger value="completed">Simulated ({completedStrategies.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedStrategies.length})</TabsTrigger>
          {inProgressStrategies.length > 0 && (
            <TabsTrigger value="in-progress">In Progress ({inProgressStrategies.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map(strategy => (
            <StrategyCard key={strategy._id} strategy={strategy} />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedStrategies.length > 0 ? (
            completedStrategies.map(strategy => (
              <StrategyCard key={strategy._id} strategy={strategy} />
            ))
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center min-h-[200px] p-6 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No simulated strategies yet</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedStrategies.length > 0 ? (
            savedStrategies.map(strategy => (
              <StrategyCard key={strategy._id} strategy={strategy} />
            ))
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center min-h-[200px] p-6 border border-dashed rounded-lg">
              <p className="text-muted-foreground">No saved strategies yet</p>
            </div>
          )}
        </TabsContent>

        {inProgressStrategies.length > 0 && (
          <TabsContent value="in-progress" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inProgressStrategies.map(strategy => (
              <StrategyCard key={strategy._id} strategy={strategy} />
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}