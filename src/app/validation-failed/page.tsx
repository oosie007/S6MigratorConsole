"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
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

export default function ValidationFailedPage() {
  const { getAllValidationFailed, getPolicyStatus } = useMigrations();
  const failed = getAllValidationFailed();

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
          <XCircle className="h-6 w-6 text-destructive" />
          Validation Failed
        </h1>
        <p className="mt-1 text-muted-foreground">
          Policies across all migrations that failed validation. Fix issues then re-run Validate on the migration page.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Failed policies</CardTitle>
          <CardDescription>
            {rows.length} policy(ies) failed validation. Open the migration to see details and re-validate after fixes.
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
                    {status.validationErrors?.join("; ") ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No validation failures. When policies fail validation they appear here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
