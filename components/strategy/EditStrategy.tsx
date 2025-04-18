"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Strategy } from "@/types";
import { updateStrategy } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Dynamically import the JSON display component to avoid SSR issues
const JSONInput = dynamic(
  () => import('react-json-editor-ajrm').then(mod => mod.default),
  { ssr: false }
);

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  simulationConfig: z.object({
    initialCapital: z.number().min(1, "Initial capital must be at least 1"),
    positionSize: z.number().min(1, "Position size must be at least 1").max(100, "Position size cannot exceed 100%"),
    maxPositions: z.number().int().min(1, "Must have at least 1 position"),
    startDate: z.string(),
    endDate: z.string(),
    symbols: z.array(z.string())
  }),
  scannerConfig: z.any(),
  buyConfig: z.any(),
  sellConfig: z.any()
});

type FormValues = z.infer<typeof formSchema>;

interface EditStrategyFormProps {
  strategy: Strategy;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditStrategyForm({ strategy, onSuccess, onCancel }: EditStrategyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerJson, setScannerJson] = useState(strategy.scannerConfig);
  const [buyJson, setBuyJson] = useState(strategy.buyConfig);
  const [sellJson, setSellJson] = useState(strategy.sellConfig);
  const { toast } = useToast();

  // Initialize form with strategy data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: strategy.name,
      description: strategy.description || "",
      simulationConfig: {
        initialCapital: strategy.simulationConfig.initialCapital,
        positionSize: strategy.simulationConfig.positionSize,
        maxPositions: strategy.simulationConfig.maxPositions,
        startDate: strategy.simulationConfig.startDate,
        endDate: strategy.simulationConfig.endDate,
        symbols: strategy.simulationConfig.symbols
      },
      scannerConfig: strategy.scannerConfig,
      buyConfig: strategy.buyConfig,
      sellConfig: strategy.sellConfig
    }
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Update JSON values from the editor
      values.scannerConfig = scannerJson;
      values.buyConfig = buyJson;
      values.sellConfig = sellJson;
      
      // Reset simulation results when config changes
      const updatedStrategy = await updateStrategy(strategy._id, {
        ...values,
        status: "saved",
        results: null
      });
      
      toast({
        title: "Strategy updated",
        description: "Your strategy has been updated successfully",
        variant: "success"
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error updating strategy:", error);
      toast({
        title: "Update failed",
        description: "Failed to update strategy. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strategy Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter strategy name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your strategy (optional)" 
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                A brief description of what this strategy does
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="simulationConfig.initialCapital"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Capital ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    step={1000}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))} 
                  />
                </FormControl>
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
                    onChange={(e) => field.onChange(Number(e.target.value))} 
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
            name="simulationConfig.maxPositions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Positions</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))} 
                  />
                </FormControl>
                <FormDescription>
                  Maximum number of open positions
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Scanner Configuration</h3>
            <div className="border rounded-md overflow-hidden">
              <JSONInput
                placeholder={scannerJson}
                theme="light_mitsuketa_tribute"
                style={{ body: { fontSize: "14px" } }}
                height="200px"
                width="100%"
                onChange={(data: any) => {
                  if (data.jsObject) {
                    setScannerJson(data.jsObject);
                  }
                }}
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Buy Configuration</h3>
            <div className="border rounded-md overflow-hidden">
              <JSONInput
                placeholder={buyJson}
                theme="light_mitsuketa_tribute"
                style={{ body: { fontSize: "14px" } }}
                height="200px"
                width="100%"
                onChange={(data: any) => {
                  if (data.jsObject) {
                    setBuyJson(data.jsObject);
                  }
                }}
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Sell Configuration</h3>
            <div className="border rounded-md overflow-hidden">
              <JSONInput
                placeholder={sellJson}
                theme="light_mitsuketa_tribute"
                style={{ body: { fontSize: "14px" } }}
                height="200px"
                width="100%"
                onChange={(data: any) => {
                  if (data.jsObject) {
                    setSellJson(data.jsObject);
                  }
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}