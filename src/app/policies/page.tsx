"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MOCK_SOURCE_PRODUCTS,
  getMockPoliciesForProduct,
  type Policy,
} from "@/lib/mock-data";

const POLICIES_PER_PRODUCT = 80;

/** Extract list of policy-like objects from UAT search/detail response (handles multiple shapes). */
function extractRawPolicies(data: unknown): unknown[] {
  if (data == null) return [];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.details)) return d.details;
  if (Array.isArray(d.policies)) return d.policies;
  if (Array.isArray(d.results)) return d.results;
  if (Array.isArray(d.items)) return d.items;
  const inner = d.data as Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(inner)) return inner;
  if (inner != null && typeof inner === "object" && Array.isArray((inner as Record<string, unknown>).details))
    return (inner as { details: unknown[] }).details;
  if (inner != null && typeof inner === "object" && Array.isArray((inner as Record<string, unknown>).policies))
    return (inner as { policies: unknown[] }).policies;
  if (Array.isArray(data)) return data;
  return [];
}

/** Map a single raw policy object from the API to Policy (tolerates different field names). */
function mapRawToPolicy(raw: unknown, index: number): Policy {
  const r = (raw ?? {}) as Record<string, unknown>;
  const basicInfo = (r.basicInfo ?? {}) as Record<string, unknown>;
  const people = Array.isArray(r.people) ? r.people : [];
  const person = (people[0] ?? {}) as Record<string, unknown>;
  const firstName = String(person.firstName ?? "");
  const lastName = String(person.lastName ?? "");
  const fullName = `${firstName} ${lastName}`.trim();
  const policyNumber = String(basicInfo.policyNumber ?? r.policyNumber ?? "");
  const dateEffective = String(
    basicInfo.effectiveDate ?? basicInfo.effective ?? r.dateEffective ?? r.effectiveDate ?? ""
  );
  const customerName =
    String(r.customerName ?? "").trim() ||
    (fullName || "Unknown customer");
  const productName = String(
    basicInfo.productName ?? r.productName ?? "Unknown"
  );
  const status = String(basicInfo.status ?? r.status ?? "Unknown");
  const id = String(r.id ?? basicInfo.policyNumber ?? r.policyNumber ?? `uat-${index}`);

  return {
    id,
    policyNumber,
    dateEffective,
    customerName,
    productName,
    status,
  };
}

export default function PoliciesPage() {
  const [query, setQuery] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livePolicies, setLivePolicies] = useState<Policy[] | null>(null);
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);
  const [detailsByPolicyId, setDetailsByPolicyId] = useState<Record<string, any>>({});
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [detailsErrorByPolicyId, setDetailsErrorByPolicyId] = useState<Record<string, string>>({});

  // Build a mock catalogue of policies across all System 6 products.
  const allPolicies = useMemo<Policy[]>(() => {
    return MOCK_SOURCE_PRODUCTS.flatMap((product) =>
      getMockPoliciesForProduct(product.id, POLICIES_PER_PRODUCT)
    );
  }, []);

  const filteredPolicies = useMemo(() => {
    const source = livePolicies ?? allPolicies;

    return source.filter((policy) => {
      const matchesQuery =
        !query ||
        policy.policyNumber.toLowerCase().includes(query.toLowerCase()) ||
        policy.customerName.toLowerCase().includes(query.toLowerCase());

      const matchesDate = !effectiveDate || policy.dateEffective === effectiveDate;

      return matchesQuery && matchesDate;
    });
  }, [allPolicies, livePolicies, query, effectiveDate]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Policies
        </h1>
        <p className="mt-1 text-muted-foreground">
          Search System 6 policies by policy number, customer, or effective date.
        </p>
      </div>

      <Card className="mb-6 border-border bg-card">
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>
            Start with a policy number or customer name, and optionally filter by
            effective date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="policy-query">Policy or customer</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="policy-query"
                  placeholder="e.g. S6-10023 or Acme Corp"
                  className="pl-8 bg-background"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full space-y-2 md:w-56">
              <Label htmlFor="effective-date">Effective date</Label>
              <Input
                id="effective-date"
                type="date"
                className="bg-background"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <div className="w-full md:w-auto">
              <Button
                type="button"
                className="w-full md:w-auto"
                disabled={(!effectiveDate && !query) || loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    setError(null);

                    let mapped: Policy[] = [];
                    let searchResponse: unknown = null;

                    if (effectiveDate) {
                      // Date-based search via UAT API
                      const res = await fetch(
                        `/api/policies/search?date=${encodeURIComponent(
                          effectiveDate
                        )}`
                      );
                      if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(
                          body.error ||
                            `Policy search failed with status ${res.status}`
                        );
                      }
                      const data = await res.json();
                      console.log("UAT policy search raw data", data);
                      searchResponse = data;

                      const rawPolicies = extractRawPolicies(data);
                      mapped = rawPolicies.map((raw, index) =>
                        mapRawToPolicy(raw, index)
                      );
                    } else if (query) {
                      // Policy-number search via detail endpoint
                      const res = await fetch(
                        `/api/policies/detail?policyNumber=${encodeURIComponent(
                          query.trim()
                        )}`
                      );
                      if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(
                          body.error ||
                            `Policy search failed with status ${res.status}`
                        );
                      }
                      const raw = await res.json();
                      mapped = [mapRawToPolicy(raw, 0)];
                    }

                    if (!mapped.length) {
                      const rawPolicies = searchResponse != null ? extractRawPolicies(searchResponse) : [];
                      const hadResults = rawPolicies.length > 0;
                      setError(
                        hadResults
                          ? "Live API call succeeded but no policies could be mapped. Check the API schema mapping."
                          : "No policies found for the given search. Try a different date or policy number."
                      );
                      setLivePolicies(null);
                    } else {
                      setError(null);
                      setLivePolicies(mapped);
                    }
                  } catch (err) {
                    console.error("Policy search error", err);
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Unexpected error while searching policies."
                    );
                    setLivePolicies(null);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Showing {filteredPolicies.length.toLocaleString()} policy
            {filteredPolicies.length === 1 ? "" : " entries"}{" "}
            {livePolicies
              ? "from live UAT search (mapped for demo)."
              : "from mock data."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Policy number</TableHead>
                <TableHead className="text-muted-foreground">Date effective</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Customer</TableHead>
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="w-12 text-right text-muted-foreground" aria-label="View full details" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.map((policy) => {
                const isExpanded = expandedPolicyId === policy.id;
                const detail = detailsByPolicyId[policy.id];
                const detailError = detailsErrorByPolicyId[policy.id];

                return (
                  <Fragment key={policy.id}>
                    <TableRow className="border-border">
                      <TableCell className="font-mono text-sm">
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline"
                          onClick={async () => {
                            const nextExpanded = isExpanded ? null : policy.id;
                            setExpandedPolicyId(nextExpanded);
                            if (!nextExpanded) return;

                            // If we already have details for this policy, do not refetch.
                            if (detailsByPolicyId[policy.id]) return;

                            try {
                              setDetailsLoadingId(policy.id);
                              setDetailsErrorByPolicyId((prev) => {
                                const clone = { ...prev };
                                delete clone[policy.id];
                                return clone;
                              });

                              const res = await fetch(
                                `/api/policies/detail?policyNumber=${encodeURIComponent(
                                  policy.policyNumber
                                )}`
                              );
                              if (!res.ok) {
                                const body = await res.json().catch(() => ({}));
                                throw new Error(
                                  (body as any).error ||
                                    `Failed to load policy details (status ${res.status}).`
                                );
                              }
                              const detailJson = await res.json();
                              setDetailsByPolicyId((prev) => ({
                                ...prev,
                                [policy.id]: detailJson,
                              }));
                            } catch (err) {
                              console.error("Load policy detail error", err);
                              setDetailsErrorByPolicyId((prev) => ({
                                ...prev,
                                [policy.id]:
                                  err instanceof Error
                                    ? err.message
                                    : "Unexpected error while loading policy details.",
                              }));
                            } finally {
                              setDetailsLoadingId(null);
                            }
                          }}
                        >
                          {policy.policyNumber}
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {policy.dateEffective}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {policy.status ?? "—"}
                      </TableCell>
                      <TableCell>{policy.customerName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {policy.productName}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={`View full details for ${policy.policyNumber}`}
                          asChild
                        >
                          <Link href={`/policies/${encodeURIComponent(policy.policyNumber)}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-border bg-muted/5">
                        <TableCell colSpan={6} className="p-4">
                          {detailsLoadingId === policy.id && (
                            <p className="text-sm text-muted-foreground">
                              Loading details…
                            </p>
                          )}
                          {detailError && (
                            <p className="mb-2 text-xs text-red-400">
                              {detailError}
                            </p>
                          )}
                          {detail && (
                            <div className="space-y-4">
                              <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Basic
                                  </p>
                                  <dl className="mt-1 space-y-1 text-sm">
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Policy number
                                      </dt>
                                      <dd className="font-mono">
                                        {detail.basicInfo?.policyNumber ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Status
                                      </dt>
                                      <dd>{detail.basicInfo?.status ?? "—"}</dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Effective / Expiry
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.effectiveDate ?? "—"}{" "}
                                        →{" "}
                                        {detail.basicInfo?.expirationDate ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Term effective date
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.termEffectiveDate ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Term number
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.termNumber ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Auto renew
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.autoRenew ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        On-term end
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.onTermEnd ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Cancellation date
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.cancellationDate ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Cancellation reason
                                      </dt>
                                      <dd>
                                        {typeof detail.basicInfo?.cancellationReason === "object"
                                          ? (detail.basicInfo?.cancellationReason as any)?.label ??
                                            (detail.basicInfo?.cancellationReason as any)?.id ??
                                            "—"
                                          : detail.basicInfo?.cancellationReason ?? "—"}
                                      </dd>
                                    </div>
                                  </dl>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Product
                                  </p>
                                  <dl className="mt-1 space-y-1 text-sm">
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Name
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.productName ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Product ID
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.productId ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Country / Currency
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.country?.label ??
                                          "—"}
                                        {" · "}
                                        {detail.basicInfo?.currency?.id ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Plan name
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.planName ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Journey ID
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.journeyId ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Partner
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.partner ?? "—"}
                                      </dd>
                                    </div>
                                  </dl>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Premium & billing
                                  </p>
                                  <dl className="mt-1 space-y-1 text-sm">
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Latest premium
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.latestPremium ??
                                          "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Billing currency
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.billingCurrency ??
                                          detail.basicInfo?.currency?.id ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Policy premium
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.policyPremium ??
                                          detail.basicInfo?.latestPremium ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Tax %
                                      </dt>
                                      <dd>
                                        {detail.basicInfo?.taxPercentage ?? "—"}
                                      </dd>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                      <dt className="text-muted-foreground">
                                        Payment method
                                      </dt>
                                      <dd>
                                        {
                                          detail.latestPaymentInfo
                                            ?.paymentMethod?.label
                                        }
                                      </dd>
                                    </div>
                                  </dl>
                                </div>
                              </div>

                              <div className="border-t border-border pt-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Insured parties
                                </p>
                                <div className="mt-2 grid gap-2 md:grid-cols-2">
                                  {Array.isArray(detail.insureds) &&
                                  detail.insureds.length > 0 ? (
                                    detail.insureds.slice(0, 3).map(
                                      (ins: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="rounded-md border border-border bg-background/40 p-2 text-xs"
                                        >
                                          <div className="flex justify-between">
                                            <span className="font-medium">
                                              {ins.firstName} {ins.lastName}
                                            </span>
                                            <span className="text-muted-foreground">
                                              {ins.insuredType}
                                            </span>
                                          </div>
                                          {ins.coverageVariants?.[0]?.coverageVariantDesc && (
                                            <p className="mt-1 text-muted-foreground">
                                              {
                                                ins.coverageVariants[0]
                                                  .coverageVariantDesc
                                              }
                                            </p>
                                          )}
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <p className="text-xs text-muted-foreground">
                                      No insured party details available.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {filteredPolicies.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No policies match your current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

