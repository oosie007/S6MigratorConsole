"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_SOURCE_PRODUCTS, MOCK_TARGET_PRODUCTS, createMigration } from "@/lib/mock-data";
import { useMigrations } from "@/contexts/migrations-context";

const STEPS = ["Name & date", "Source product", "Target product"];

export default function NewMigrationPage() {
  const router = useRouter();
  const { addMigration } = useMigrations();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sourceProductId, setSourceProductId] = useState<string>("");
  const [targetProductId, setTargetProductId] = useState<string>("");

  const handleDone = () => {
    const m = createMigration({ name, date, sourceProductId, targetProductId });
    addMigration(m);
    router.push("/migrations");
  };

  return (
    <div className="p-6 md:p-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/migrations">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to migrations
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">New migration</h1>
        <p className="mt-1 text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-muted text-muted-foreground hover:bg-muted/80"
                    : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="max-w-xl border-border bg-card">
          <CardHeader>
            <CardTitle>Migration name and date</CardTitle>
            <CardDescription>Identify this migration run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Auto Q1 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-background"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="max-w-xl border-border bg-card">
          <CardHeader>
            <CardTitle>Source System 6 product</CardTitle>
            <CardDescription>Select the product to migrate from. Policies will be loaded on the migration page.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={sourceProductId} onValueChange={setSourceProductId}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select source product" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_SOURCE_PRODUCTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.policyCount} policies)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="max-w-xl border-border bg-card">
          <CardHeader>
            <CardTitle>Target Catalyst product</CardTitle>
            <CardDescription>Select the product to migrate to.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={targetProductId} onValueChange={setTargetProductId}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select target product" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_TARGET_PRODUCTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 max-w-xl flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Previous
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && !name) ||
              (step === 1 && !sourceProductId) ||
              (step === 2 && !targetProductId)
            }
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleDone}
            disabled={!name || !sourceProductId || !targetProductId}
          >
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
