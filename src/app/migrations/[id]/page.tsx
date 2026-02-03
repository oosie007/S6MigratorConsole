"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  getMockPoliciesForProduct,
  getMigrationProductNames,
  runMockValidation,
  runMockVerification,
  type Policy,
  type PolicyPipelineStatus,
} from "@/lib/mock-data";
import { useMigrations } from "@/contexts/migrations-context";

const TAB_ALL = "all";
const TAB_VALIDATION_FAILED = "validation_failed";
const TAB_VALIDATED = "validated";
const TAB_MIGRATED = "migrated";
const TAB_VERIFIED = "verified";
const TAB_VERIFICATION_FAILED = "verification_failed";

const TABS = [
  { id: TAB_ALL, label: "All" },
  { id: TAB_VALIDATION_FAILED, label: "Validation Failed" },
  { id: TAB_VALIDATED, label: "Validated" },
  { id: TAB_MIGRATED, label: "Migrated" },
  { id: TAB_VERIFIED, label: "Verified" },
  { id: TAB_VERIFICATION_FAILED, label: "Verification Failed" },
] as const;

function statusFitsTab(status: PolicyPipelineStatus, tab: string): boolean {
  if (tab === TAB_ALL) return true;
  if (tab === TAB_VALIDATION_FAILED) return status.validation === "fail";
  if (tab === TAB_VALIDATED) return status.validation === "pass" && status.migration === "pending";
  if (tab === TAB_MIGRATED) return status.migration === "success";
  if (tab === TAB_VERIFIED) return status.verification === "pass";
  if (tab === TAB_VERIFICATION_FAILED) return status.verification === "fail";
  return false;
}

function StatusBadge({ status }: { status: PolicyPipelineStatus }) {
  if (status.validation === "fail")
    return (
      <Badge variant="destructive" className="gap-1 font-normal">
        <XCircle className="h-3 w-3" />
        Validation failed
      </Badge>
    );
  if (status.migration === "migrating")
    return (
      <Badge variant="default" className="gap-1 font-normal">
        <Loader2 className="h-3 w-3 animate-spin" />
        Migrating
      </Badge>
    );
  if (status.migration === "success" && status.verification === "pending")
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        Migrated
      </Badge>
    );
  if (status.verification === "fail")
    return (
      <Badge variant="destructive" className="gap-1 font-normal">
        <AlertTriangle className="h-3 w-3" />
        Verification failed
      </Badge>
    );
  if (status.verification === "pass")
    return (
      <Badge variant="secondary" className="gap-1 font-normal text-green-600 border-green-600/30">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </Badge>
    );
  if (status.validation === "pass")
    return (
      <Badge variant="outline" className="gap-1 font-normal">
        <CheckCircle2 className="h-3 w-3" />
        Validated
      </Badge>
    );
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      Pending
    </Badge>
  );
}

export default function MigrationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { getMigration, getPolicyStatus, updatePolicyStatuses, setPolicyStatusBatch } = useMigrations();
  const migration = getMigration(id);

  const [activeTab, setActiveTab] = useState<string>(TAB_ALL);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const policies = useMemo(() => {
    if (!migration) return [];
    return getMockPoliciesForProduct(migration.sourceProductId, 40);
  }, [migration]);

  const policiesWithStatus = useMemo(() => {
    return policies.map((p) => ({
      policy: p,
      status: getPolicyStatus(id, p.id),
    }));
  }, [policies, id, getPolicyStatus]);

  const filteredPolicies = useMemo(() => {
    return policiesWithStatus.filter(({ status }) => statusFitsTab(status, activeTab));
  }, [policiesWithStatus, activeTab]);

  const canValidate = useMemo(() => {
    const ids = Array.from(selectedIds);
    return ids.some((pid) => {
      const s = getPolicyStatus(id, pid);
      return s.validation === "pending";
    });
  }, [selectedIds, id, getPolicyStatus]);

  const canMigrate = useMemo(() => {
    const ids = Array.from(selectedIds);
    return ids.every((pid) => {
      const s = getPolicyStatus(id, pid);
      return s.validation === "pass" && s.migration === "pending";
    }) && ids.some((pid) => getPolicyStatus(id, pid).validation === "pass");
  }, [selectedIds, id, getPolicyStatus]);

  const canVerify = useMemo(() => {
    const ids = Array.from(selectedIds);
    return ids.every((pid) => {
      const s = getPolicyStatus(id, pid);
      return s.migration === "success";
    }) && ids.length > 0;
  }, [selectedIds, id, getPolicyStatus]);

  const toggleOne = (policyId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(policyId)) next.delete(policyId);
      else next.add(policyId);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(filteredPolicies.map(({ policy }) => policy.id)) : new Set());
  };

  const handleValidate = async () => {
    const toValidate = policies.filter((p) => selectedIds.has(p.id));
    if (toValidate.length === 0) return;
    setValidating(true);
    const result = runMockValidation(toValidate);
    const updates = result.map((p) => ({
      policyId: p.id,
      status: {
        validation: p.validationStatus ?? "pending",
        validationErrors: p.validationErrors,
      } as Partial<PolicyPipelineStatus>,
    }));
    updatePolicyStatuses(id, updates);
    setValidating(false);
    setSelectedIds(new Set());
  };

  const handleMigrate = async () => {
    const toMigrate = policiesWithStatus.filter(
      ({ policy, status }) => selectedIds.has(policy.id) && status.validation === "pass" && status.migration === "pending"
    );
    if (toMigrate.length === 0) return;
    setMigrating(true);
    for (const { policy } of toMigrate) {
      updatePolicyStatuses(id, [{ policyId: policy.id, status: { migration: "migrating" } }]);
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
      const failed = policy.id.includes("2") && Math.random() > 0.85;
      updatePolicyStatuses(id, [{ policyId: policy.id, status: { migration: failed ? "failed" : "success" } }]);
    }
    setMigrating(false);
    setSelectedIds(new Set());
  };

  const handleVerify = async () => {
    const toVerify = policies.filter((p) => {
      const s = getPolicyStatus(id, p.id);
      return selectedIds.has(p.id) && s.migration === "success";
    });
    if (toVerify.length === 0) return;
    setVerifying(true);
    const result = runMockVerification(toVerify);
    const updates = result.map((p) => ({
      policyId: p.id,
      status: {
        verification: p.verificationStatus ?? "pending",
        verificationErrors: p.verificationErrors,
      } as Partial<PolicyPipelineStatus>,
    }));
    updatePolicyStatuses(id, updates);
    setVerifying(false);
    setSelectedIds(new Set());
  };

  if (!migration) {
    return (
      <div className="p-6 md:p-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/migrations">Back to migrations</Link>
        </Button>
        <p className="mt-4 text-muted-foreground">Migration not found.</p>
      </div>
    );
  }

  const productNames = getMigrationProductNames(migration);
  const allSelected = filteredPolicies.length > 0 && selectedIds.size === filteredPolicies.length;

  return (
    <div className="p-6 md:p-8">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/migrations">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to migrations
        </Link>
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{migration.name}</h1>
        <p className="text-muted-foreground">
          {productNames.source} → {productNames.target} · Created {migration.createdAt}
        </p>
      </div>

      {/* Pipeline tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-border pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle>Policies</CardTitle>
          <CardDescription>
            Select one, some, or all. Then use Validate → Migrate → Verify. Policies that fail validation cannot be migrated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap items-start">
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
                    <TableHead className="text-muted-foreground">Policy #</TableHead>
                    <TableHead className="text-muted-foreground">Date effective</TableHead>
                    <TableHead className="text-muted-foreground">Customer</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map(({ policy, status }) => (
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
                        <StatusBadge status={status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredPolicies.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No policies in this tab.</p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {/* All / Validation Failed: Validate button */}
              {(activeTab === TAB_ALL || activeTab === TAB_VALIDATION_FAILED) && (
                <Button
                  onClick={handleValidate}
                  disabled={!canValidate || validating}
                  className="w-full justify-center"
                >
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Validate
                </Button>
              )}
              {/* Validated tab: Migrate button */}
              {activeTab === TAB_VALIDATED && (
                <Button
                  onClick={handleMigrate}
                  disabled={!canMigrate || migrating}
                  className="w-full justify-center"
                >
                  {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Migrate
                </Button>
              )}
              {/* Migrated / Verification Failed: Verify button */}
              {(activeTab === TAB_MIGRATED || activeTab === TAB_VERIFICATION_FAILED) && (
                <Button
                  onClick={handleVerify}
                  disabled={!canVerify || verifying}
                  className="w-full justify-center"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1" />}
                  Verify
                </Button>
              )}
              {/* Verified tab: no primary action */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
