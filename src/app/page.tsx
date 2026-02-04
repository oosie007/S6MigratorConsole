"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileCheck,
  FileX,
  Loader2,
  FolderOpen,
  Pause,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardStats } from "@/lib/mock-data";
import { useMigrations } from "@/contexts/migrations-context";
import { useStatusStream, useStatsStream } from "@/hooks/useMigrationStreams";
import { executeMigrationCommand } from "@/lib/migration-api";

export default function DashboardPage() {
  const { migrations } = useMigrations();
  const mockStats = getDashboardStats(migrations);

  // Live status & stats from SSE (backend API)
  const { status: liveStatus, connected: statusConnected } = useStatusStream();
  const { stats: liveStats, connected: statsConnected } = useStatsStream();

  const [commandLoading, setCommandLoading] = useState<
    "pause" | "resume" | "stop" | "restart" | null
  >(null);

  const stats = liveStats ?? mockStats;

  const cards = [
    {
      title: "Total policies",
      value: stats.totalPolicies.toLocaleString(),
      description: liveStats
        ? "Current migration total records"
        : "Across all migration projects (mock)",
      icon: FolderOpen,
    },
    {
      title: "Migrated",
      value: (liveStats?.successCount ?? stats.totalMigrated).toLocaleString(),
      description: liveStats
        ? "Successfully migrated in current run"
        : "Successfully moved to Catalyst",
      icon: FileCheck,
    },
    {
      title: "Failures",
      value: (liveStats?.errorCount ?? stats.totalFailures).toLocaleString(),
      description: liveStats
        ? "Failed migrations in current run"
        : "Require attention",
      icon: FileX,
    },
    {
      title: "In progress",
      value: liveStats
        ? (liveStats.totalRecords - liveStats.processedRecords).toLocaleString()
        : stats.inProgress.toLocaleString(),
      description: liveStats
        ? "Remaining records in current run"
        : "Currently migrating",
      icon: Loader2,
    },
  ];

  async function handleCommand(
    command: "pause" | "resume" | "stop" | "restart"
  ) {
    try {
      setCommandLoading(command);
      await executeMigrationCommand(command);
    } catch (err) {
      console.error(`Failed to execute ${command}`, err);
    } finally {
      setCommandLoading(null);
    }
  }

  const liveState = liveStatus?.status ?? "unknown";
  const isLiveConnected = statusConnected && statsConnected;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Migration dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Live view of the current migration run (from the .NET migration
            tool), plus project-level mock data.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <span
            className={
              isLiveConnected ? "text-green-500 font-medium" : "text-red-400"
            }
          >
            {isLiveConnected ? "Connected to migration server" : "Not connected"}
          </span>
          {liveStatus && (
            <span className="rounded-full border border-border px-2 py-0.5">
              State: {liveState}
            </span>
          )}
        </div>
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
              <div className="text-2xl font-semibold text-foreground">
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[2fr,1.5fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Migration controls</CardTitle>
            <CardDescription>
              Pause, resume, stop, or restart the current migration run.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={!isLiveConnected || commandLoading !== null}
              onClick={() => handleCommand("pause")}
            >
              {commandLoading === "pause" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Pause className="mr-2 h-4 w-4" />
              )}
              Pause
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!isLiveConnected || commandLoading !== null}
              onClick={() => handleCommand("resume")}
            >
              {commandLoading === "resume" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Resume
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!isLiveConnected || commandLoading !== null}
              onClick={() => handleCommand("stop")}
            >
              {commandLoading === "stop" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Square className="mr-2 h-4 w-4" />
              )}
              Stop
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!isLiveConnected || commandLoading !== null}
              onClick={() => handleCommand("restart")}
            >
              {commandLoading === "restart" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Restart
            </Button>
            {liveStatus && (
              <div className="mt-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Progress:</span>{" "}
                  {liveStatus.progress.toFixed(1)}%
                </div>
                <div>
                  <span className="font-medium">Elapsed / Estimated:</span>{" "}
                  {liveStatus.elapsed} / {liveStatus.estimated}
                </div>
                <div>
                  <span className="font-medium">Next task:</span>{" "}
                  {liveStatus.nextTask}
                </div>
                <div>
                  <span className="font-medium">Latest status:</span>{" "}
                  {liveStatus.latestStatus}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Start a new mock migration project or manage existing ones.
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
    </div>
  );
}

