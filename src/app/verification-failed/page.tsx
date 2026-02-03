"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMigrations } from "@/contexts/migrations-context";
import { getMockPoliciesForProduct, getMigrationProductNames } from "@/lib/mock-data";

export default function VerificationFailedPage() {
  const { getAllVerificationFailed, getPolicyStatus } = useMigrations();
  const failed = getAllVerificationFailed();

  const rows = failed.map(({ migration, policyId }) => {
    const policies = getMockPoliciesForProduct(migration.sourceProductId, migration.totalPolicies);
    const policy = policies.find((p) => p.id === policyId);
    const status = getPolicyStatus(migration.id, policyId);
    const productNames = getMigrationProductNames(migration);
    return {
      migration,
      policy,
      status,
      productNames,
    };
  }).filter((r) => r.policy);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          Verification Failed
        </h1>
        <p className="mt-1 text-muted-foreground">
          Migrated policies that failed verification (e.g. premium, dates, customer details mismatch). Review and fix in source/target.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Failed verification</CardTitle>
          <CardDescription>
            {rows.length} policy(ies) failed verification. Compare attributes and re-run Verify after fixes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Migration</TableHead>
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="text-muted-foreground">Policy #</TableHead>
                <TableHead className="text-muted-foreground">Customer</TableHead>
                <TableHead className="text-muted-foreground">Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ migration, policy, status, productNames }) => (
                <TableRow key={`${migration.id}-${policy!.id}`} className="border-border">
                  <TableCell>
                    <Link
                      href={`/migrations/${migration.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {migration.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {productNames.source} → {productNames.target}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{policy!.policyNumber}</TableCell>
                  <TableCell>{policy!.customerName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {status.verificationErrors?.join("; ") ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No verification failures. When migrated policies fail verification they appear here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
