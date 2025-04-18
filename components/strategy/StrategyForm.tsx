"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createStrategy } from "@/lib/api";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

// Dynamically import the JSON editor to avoid SSR issues
const JSONInput = dynamic(
  () => import('react-json-editor-ajrm').then(mod => mod.default),
  { ssr: false }
);

// Define the form schema with Zod
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  scannerConfig: z.any(),
  buyConfig: z.any(),
  sellConfig: z.any(),
  simulationConfig: z.object({
    startDate: z.string(),
    endDate: z.string(),
    initialCapital: z.number().min(1000, "Initial capital must be at least 1000"),
    symbols: z.array(z.string()).min(1, "At least one symbol is required"),
    maxPositions: z.number().min(1, "Maximum positions must be at least 1"),
    positionSize: z.number().min(1, "Position size must be at least 1").max(100, "Position size cannot exceed 100%"),
  }),
});

const defaultScannerConfig = {
  conditions: [
    {
      indicator: "volume",
      operator: ">",
      value: 1000000
    }
  ]
};

const defaultBuyConfig = {
  conditions: [
    {
      indicator: "priceChange",
      operator: ">",
      value: 2.0
    },
    {
      indicator: "price",
      operator: ">",
      value: 10
    }
  ]
};

const defaultSellConfig = {
  conditions: [
    {
      type: "stopLoss",
      value: 5.0
    },
    {
      type: "takeProfit",
      value: 15.0
    }
  ]
};

const defaultSymbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "META"];

export function StrategyForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("basicInfo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      scannerConfig: defaultScannerConfig,
      buyConfig: defaultBuyConfig,
      sellConfig: defaultSellConfig,
      simulationConfig: {
        startDate: format(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        initialCapital: 100000,
        symbols: defaultSymbols,
        maxPositions: 5,
        positionSize: 20,
      },
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      const strategyData = {
        ...values,
        status: "saved",
      };
      
      const strategy = await createStrategy(strategyData);
      router.push(`/strategy/${strategy._id}`);
    } catch (error) {
      console.error("Error creating strategy:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    const tabs = ["basicInfo", "scannerConfig", "buyConfig", "sellConfig", "simulationConfig"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const tabs = ["basicInfo", "scannerConfig", "buyConfig", "sellConfig", "simulationConfig"];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  const handleJsonChange = (tab: string) => (data: any) => {
    if (data.jsObject) {
      form.setValue(tab as any, data.jsObject);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Create Trading Strategy</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle>Strategy Configuration</CardTitle>
              <CardDescription>
                Configure your trading strategy step by step.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5 mb-6">
                  <TabsTrigger value="basicInfo">Basic Info</TabsTrigger>
                  <TabsTrigger value="scannerConfig">Scanner</TabsTrigger>
                  <TabsTrigger value="buyConfig">Buy Rules</TabsTrigger>
                  <TabsTrigger value="sellConfig">Sell Rules</TabsTrigger>
                  <TabsTrigger value="simulationConfig">Simulation</TabsTrigger>
                </TabsList>

                <TabsContent value="basicInfo">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strategy Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter strategy name" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for your trading strategy
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Briefly describe your strategy"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Explain the rationale and goals of your strategy
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="scannerConfig">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Scanner Configuration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Define conditions to filter instruments before applying buy/sell rules.
                    </p>
                    <div className="mb-4 border rounded-md overflow-hidden">
                      <JSONInput
                        placeholder={form.getValues("scannerConfig")}
                        confirmGood={false}
                        onBlur={handleJsonChange("scannerConfig")}
                        theme="light_mitsuketa_tribute"
                        style={{ body: { fontSize: "14px" } }}
                        height="300px"
                        width="100%"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">Example format:</p>
                      <pre className="bg-secondary p-3 rounded-md overflow-auto">
                        {JSON.stringify(defaultScannerConfig, null, 2)}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="buyConfig">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Buy Rules Configuration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Define conditions that trigger buy signals in your strategy.
                    </p>
                    <div className="mb-4 border rounded-md overflow-hidden">
                      <JSONInput
                        placeholder={form.getValues("buyConfig")}
                        confirmGood={false}
                        onBlur={handleJsonChange("buyConfig")}
                        theme="light_mitsuketa_tribute"
                        style={{ body: { fontSize: "14px" } }}
                        height="300px"
                        width="100%"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">Example format:</p>
                      <pre className="bg-secondary p-3 rounded-md overflow-auto">
                        {JSON.stringify(defaultBuyConfig, null, 2)}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sellConfig">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Sell Rules Configuration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Define conditions that trigger sell signals in your strategy.
                    </p>
                    <div className="mb-4 border rounded-md overflow-hidden">
                      <JSONInput
                        placeholder={form.getValues("sellConfig")}
                        confirmGood={false}
                        onBlur={handleJsonChange("sellConfig")}
                        theme="light_mitsuketa_tribute"
                        style={{ body: { fontSize: "14px" } }}
                        height="300px"
                        width="100%"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">Example format:</p>
                      <pre className="bg-secondary p-3 rounded-md overflow-auto">
                        {JSON.stringify(defaultSellConfig, null, 2)}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="simulationConfig">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Simulation Parameters</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure settings for backtesting your strategy.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="simulationConfig.startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                              Beginning of the simulation period
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="simulationConfig.endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                              End of the simulation period
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="simulationConfig.initialCapital"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Capital ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1000}
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Starting capital for the simulation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="simulationConfig.maxPositions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Positions</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum number of simultaneous positions
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="simulationConfig.positionSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Position Size (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Percentage of capital per position
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="simulationConfig.symbols"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Symbols</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="AAPL, MSFT, GOOGL"
                                value={field.value.join(", ")}
                                onChange={(e) => {
                                  const symbols = e.target.value
                                    .split(",")
                                    .map((symbol) => symbol.trim())
                                    .filter(Boolean);
                                  field.onChange(symbols);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Comma-separated list of ticker symbols
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className="flex justify-between">
              <div>
                <Button
                  type="button"
                  onClick={handlePrevious}
                  variant="outline"
                  disabled={activeTab === "basicInfo"}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
              </div>
              <div className="space-x-2">
                {activeTab === "simulationConfig" ? (
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Saving..." : "Save Strategy"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={activeTab === "simulationConfig"}
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}