"use client";

import { Fragment, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Plus,
  ChevronRight,
  ChevronDown,
  XCircle,
  CheckCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getMigrationProductNames,
  getMockPoliciesForProduct,
  runMockValidation,
  runMockVerification,
  type MigrationProject,
  type PolicyPipelineStatus,
} from "@/lib/mock-data";
import { useMigrations } from "@/contexts/migrations-context";

const TAB_ALL = "all";
const TAB_VALIDATION_FAILED = "validation_failed";
const TAB_VALIDATED = "validated";
const TAB_MIGRATED = "migrated";
const TAB_VERIFIED = "verified";
const TAB_VERIFICATION_FAILED = "verification_failed";

const PIPELINE_TABS = [
  { id: TAB_ALL, label: "All" },
  { id: TAB_VALIDATION_FAILED, label: "Validation Failed" },
  { id: TAB_VALIDATED, label: "Validated" },
  { id: TAB_MIGRATED, label: "Migrated" },
  { id: TAB_VERIFIED, label: "Verified" },
  { id: TAB_VERIFICATION_FAILED, label: "Verification Failed" },
];

function statusFitsTab(status: PolicyPipelineStatus, tab: string): boolean {
  if (tab === TAB_ALL) return true;
  if (tab === TAB_VALIDATION_FAILED) return status.validation === "fail";
  if (tab === TAB_VALIDATED) return status.validation === "pass" && status.migration === "pending";
  if (tab === TAB_MIGRATED) return status.migration === "success";
  if (tab === TAB_VERIFIED) return status.verification === "pass";
  if (tab === TAB_VERIFICATION_FAILED) return status.verification === "fail";
  return false;
}

function PipelineStatusBadge({ status }: { status: PolicyPipelineStatus }) {
  if (status.validation === "fail")
    return (
      <Badge variant="destructive" className="gap-1 font-normal">
        <XCircle className="h-3 w-3" /> Validation failed
      </Badge>
    );
  if (status.migration === "migrating")
    return (
      <Badge variant="default" className="gap-1 font-normal">
        <Loader2 className="h-3 w-3 animate-spin" /> Migrating
      </Badge>
    );
  if (status.migration === "success" && status.verification === "pending")
    return <Badge variant="secondary" className="font-normal">Migrated</Badge>;
  if (status.verification === "fail")
    return (
      <Badge variant="destructive" className="gap-1 font-normal">
        <AlertTriangle className="h-3 w-3" /> Verification failed
      </Badge>
    );
  if (status.verification === "pass")
    return (
      <Badge variant="secondary" className="gap-1 font-normal text-green-600 border-green-600/30">
        <CheckCircle2 className="h-3 w-3" /> Verified
      </Badge>
    );
  if (status.validation === "pass")
    return (
      <Badge variant="outline" className="gap-1 font-normal">
        <CheckCircle2 className="h-3 w-3" /> Validated
      </Badge>
    );
  return <Badge variant="outline" className="font-normal text-muted-foreground">Pending</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ElementType; label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    completed: { icon: CheckCircle2, label: "Completed", variant: "secondary" },
    in_progress: { icon: Loader2, label: "In progress", variant: "default" },
    ready: { icon: CircleDashed, label: "Ready", variant: "outline" },
    failed: { icon: AlertCircle, label: "Failed", variant: "destructive" },
    draft: { icon: CircleDashed, label: "Draft", variant: "outline" },
    validating: { icon: Loader2, label: "Validating", variant: "outline" },
  };
  const c = config[status] ?? config.draft;
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1 font-normal">
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

// Pipeline tabs + filtered policies table + action button (Validate / Migrate / Verify)
function MigrationPipelineSection({
  migration,
  activeTab,
  onTabChange,
  selectedIds,
  onSelectionChange,
  validating,
  migrating,
  verifying,
  onValidate,
  onMigrate,
  onVerify,
  canValidate,
  canMigrate,
  canVerify,
}: {
  migration: MigrationProject;
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  validating: boolean;
  migrating: boolean;
  verifying: boolean;
  onValidate: () => void;
  onMigrate: () => void;
  onVerify: () => void;
  canValidate: boolean;
  canMigrate: boolean;
  canVerify: boolean;
}) {
  const { getPolicyStatus } = useMigrations();
  const policies = useMemo(
    () => getMockPoliciesForProduct(migration.sourceProductId, Math.min(migration.totalPolicies, 50)),
    [migration.sourceProductId, migration.totalPolicies]
  );
  const policiesWithStatus = useMemo(
    () => policies.map((p) => ({ policy: p, status: getPolicyStatus(migration.id, p.id) })),
    [policies, migration.id, getPolicyStatus]
  );
  const filtered = useMemo(
    () => policiesWithStatus.filter(({ status }) => statusFitsTab(status, activeTab)),
    [policiesWithStatus, activeTab]
  );

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };
  const toggleAll = (checked: boolean) => {
    onSelectionChange(checked ? new Set(filtered.map(({ policy }) => policy.id)) : new Set());
  };
  const allSelected = filtered.length > 0 && filtered.every(({ policy }) => selectedIds.has(policy.id));

  const showValidate = activeTab === TAB_ALL || activeTab === TAB_VALIDATION_FAILED;
  const showMigrate = activeTab === TAB_VALIDATED;
  const showVerify = activeTab === TAB_MIGRATED || activeTab === TAB_VERIFICATION_FAILED;

  return (
    <div className="space-y-3">
      {/* Tabs horizontal above table */}
      <div className="flex flex-wrap gap-1">
        {PIPELINE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) => toggleAll(c === true)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="text-muted-foreground">Policy number</TableHead>
                <TableHead className="text-muted-foreground">Date effective</TableHead>
                <TableHead className="text-muted-foreground">Customer</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(({ policy, status }) => (
                <TableRow key={policy.id} className="border-border">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(policy.id)}
                      onCheckedChange={() => toggleOne(policy.id)}
                      aria-label={`Select ${policy.policyNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{policy.policyNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{policy.dateEffective}</TableCell>
                  <TableCell>{policy.customerName}</TableCell>
                  <TableCell>
                    <PipelineStatusBadge status={status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No policies in this tab.</p>
          )}
        </div>
        <div className="shrink-0">
          {showValidate && (
            <Button
              onClick={onValidate}
              disabled={!canValidate || validating}
              size="sm"
              className="whitespace-nowrap"
            >
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Validate
            </Button>
          )}
          {showMigrate && (
            <Button
              onClick={onMigrate}
              disabled={!canMigrate || migrating}
              size="sm"
              className="whitespace-nowrap"
            >
              {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Migrate
            </Button>
          )}
          {showVerify && (
            <Button
              onClick={onVerify}
              disabled={!canVerify || verifying}
              size="sm"
              className="whitespace-nowrap"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1" />}
              Verify
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MigrationsPage() {
  const router = useRouter();
  const { migrations, getPolicyStatus, updatePolicyStatuses } = useMigrations();
  const [expandedMigrationId, setExpandedMigrationId] = useState<string | null>(null);
  const [expandedProductMigrationId, setExpandedProductMigrationId] = useState<string | null>(null);
  const [policySelections, setPolicySelections] = useState<Record<string, Set<string>>>({});
  const [pipelineTab, setPipelineTab] = useState<string>(TAB_ALL);
  const [validating, setValidating] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const toggleMigration = (id: string) => {
    setExpandedMigrationId((prev) => (prev === id ? null : id));
    if (expandedMigrationId === id) setExpandedProductMigrationId(null);
  };

  const toggleProduct = (migrationId: string) => {
    setExpandedProductMigrationId((prev) => (prev === migrationId ? null : migrationId));
  };

  const setSelectionForMigration = (migrationId: string, ids: Set<string>) => {
    setPolicySelections((prev) => ({ ...prev, [migrationId]: ids }));
  };

  const handleValidate = async () => {
    const mid = expandedProductMigrationId;
    if (!mid) return;
    const toValidate = Array.from(policySelections[mid] ?? []).filter((pid) => getPolicyStatus(mid, pid).validation === "pending");
    if (toValidate.length === 0) return;
    setValidating(true);
    const policies = getMockPoliciesForProduct(
      migrations.find((m) => m.id === mid)!.sourceProductId,
      50
    ).filter((p) => toValidate.includes(p.id));
    const result = runMockValidation(policies);
    const updates = result.map((p) => ({
      policyId: p.id,
      status: { validation: p.validationStatus ?? "pending", validationErrors: p.validationErrors } as Partial<PolicyPipelineStatus>,
    }));
    updatePolicyStatuses(mid, updates);
    setValidating(false);
    setPolicySelections((prev) => ({ ...prev, [mid]: new Set() }));
  };

  const handleMigrate = async () => {
    const mid = expandedProductMigrationId;
    if (!mid) return;
    const m = migrations.find((m) => m.id === mid);
    if (!m) return;
    const selected = Array.from(policySelections[mid] ?? []);
    const toMigrate = selected.filter((pid) => {
      const s = getPolicyStatus(mid, pid);
      return s.validation === "pass" && s.migration === "pending";
    });
    if (toMigrate.length === 0) return;
    setMigrating(true);
    for (const pid of toMigrate) {
      updatePolicyStatuses(mid, [{ policyId: pid, status: { migration: "migrating" } }]);
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 150));
      const failed = pid.includes("2") && Math.random() > 0.88;
      updatePolicyStatuses(mid, [{ policyId: pid, status: { migration: failed ? "failed" : "success" } }]);
    }
    setMigrating(false);
    setPolicySelections((prev) => ({ ...prev, [mid]: new Set() }));
  };

  const handleVerify = async () => {
    const mid = expandedProductMigrationId;
    if (!mid) return;
    const selected = Array.from(policySelections[mid] ?? []);
    const toVerify = selected.filter((pid) => getPolicyStatus(mid, pid).migration === "success");
    if (toVerify.length === 0) return;
    setVerifying(true);
    const m = migrations.find((m) => m.id === mid)!;
    const policies = getMockPoliciesForProduct(m.sourceProductId, m.totalPolicies).filter((p) => toVerify.includes(p.id));
    const result = runMockVerification(policies);
    const updates = result.map((p) => ({
      policyId: p.id,
      status: { verification: p.verificationStatus ?? "pending", verificationErrors: p.verificationErrors } as Partial<PolicyPipelineStatus>,
    }));
    updatePolicyStatuses(mid, updates);
    setVerifying(false);
    setPolicySelections((prev) => ({ ...prev, [mid]: new Set() }));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Migrations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Expand a migration to see product and policies. Select policies with checkboxes.
          </p>
        </div>
        <Button asChild>
          <Link href="/migrations/new">
            <Plus className="mr-2 h-4 w-4" />
            New migration
          </Link>
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Click the chevron to expand migration → product → policies. Use &quot;View&quot; to open details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Created</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-muted-foreground">Policies</TableHead>
                <TableHead className="text-right text-muted-foreground">Migrated</TableHead>
                <TableHead className="text-right text-muted-foreground">Failed</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {migrations.map((m) => {
                const migrationOpen = expandedMigrationId === m.id;
                const productOpen = expandedProductMigrationId === m.id;
                const productNames = getMigrationProductNames(m);
                const selectedPolicies = policySelections[m.id] ?? new Set();

                return (
                  <Fragment key={m.id}>
                    <TableRow
                      className="border-border cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => toggleMigration(m.id)}
                    >
                      <TableCell className="w-10">
                        <button
                          type="button"
                          className="flex items-center justify-center p-0.5 rounded hover:bg-muted"
                          onClick={(e) => { e.stopPropagation(); toggleMigration(m.id); }}
                          aria-label={migrationOpen ? "Collapse" : "Expand"}
                        >
                          {migrationOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground">{m.createdAt}</TableCell>
                      <TableCell>
                        <StatusBadge status={m.status} />
                      </TableCell>
                      <TableCell className="text-right">{m.totalPolicies}</TableCell>
                      <TableCell className="text-right">{m.migratedCount}</TableCell>
                      <TableCell className="text-right">{m.failedCount}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => router.push(`/migrations/${m.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                    {migrationOpen && (
                      <TableRow key={`${m.id}-expanded`} className="border-border bg-muted/20">
                        <TableCell colSpan={8} className="p-0 align-top">
                          <div className="px-4 pb-4 pt-1">
                            <Collapsible
                              open={productOpen}
                              onOpenChange={(open) => (open ? setExpandedProductMigrationId(m.id) : setExpandedProductMigrationId(null))}
                            >
                              <div className="rounded-lg border border-border bg-card">
                                <CollapsibleTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 rounded-t-lg transition-colors"
                                  >
                                    {productOpen ? (
                                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <span className="text-sm font-medium">
                                      Product: {productNames.source} → {productNames.target}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({m.totalPolicies} policies)
                                    </span>
                                  </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="border-t border-border px-4 py-3">
                                    <MigrationPipelineSection
                                      migration={m}
                                      activeTab={pipelineTab}
                                      onTabChange={setPipelineTab}
                                      selectedIds={selectedPolicies}
                                      onSelectionChange={(ids) => setSelectionForMigration(m.id, ids)}
                                      validating={validating}
                                      migrating={migrating}
                                      verifying={verifying}
                                      onValidate={handleValidate}
                                      onMigrate={handleMigrate}
                                      onVerify={handleVerify}
                                      canValidate={Array.from(selectedPolicies).some((pid) => getPolicyStatus(m.id, pid).validation === "pending")}
                                      canMigrate={
                                        selectedPolicies.size > 0 &&
                                        Array.from(selectedPolicies).every((pid) => {
                                          const s = getPolicyStatus(m.id, pid);
                                          return s.validation === "pass" && s.migration === "pending";
                                        })
                                      }
                                      canVerify={
                                        selectedPolicies.size > 0 &&
                                        Array.from(selectedPolicies).every((pid) => getPolicyStatus(m.id, pid).migration === "success")
                                      }
                                    />
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
