"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getOrder } from "@/lib/shipstation-api";

export default function Component() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const result = await getOrder(orderId);
      console.log(result);
      setOrder(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Order Lookup</CardTitle>
        <CardDescription>Enter an order ID to fetch details</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderId">Order ID</Label>
            <Input
              id="orderId"
              placeholder="Enter order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Get Order"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        {error && <p className="text-destructive">{error}</p>}
      </CardFooter>
    </Card>
  );
}
