"use client";

import Link from "next/link";
import { ArrowRight, FileCheck, FileX, Loader2, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardStats } from "@/lib/mock-data";
import { useMigrations } from "@/contexts/migrations-context";

export default function DashboardPage() {
  const { migrations } = useMigrations();
  const stats = getDashboardStats(migrations);

  const cards = [
    {
      title: "Total policies",
      value: stats.totalPolicies.toLocaleString(),
      description: "Across all migration projects",
      icon: FolderOpen,
    },
    {
      title: "Migrated",
      value: stats.totalMigrated.toLocaleString(),
      description: "Successfully moved to Catalyst",
      icon: FileCheck,
    },
    {
      title: "Failures",
      value: stats.totalFailures.toLocaleString(),
      description: "Require attention",
      icon: FileX,
    },
    {
      title: "In progress",
      value: stats.inProgress.toLocaleString(),
      description: "Currently migrating",
      icon: Loader2,
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Migration dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Overview of System 6 → Catalyst migration activity (mock data).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-border bg-card">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
          <CardDescription>
            Start a new migration or manage existing projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button asChild>
            <Link href="/migrations/new">
              New migration
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/migrations">View migrations</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
