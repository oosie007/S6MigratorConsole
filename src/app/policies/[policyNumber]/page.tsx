"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

/** Transaction as returned by the policy detail API */
interface ApiTransaction {
  transactionId?: string;
  code?: string;
  operator?: string;
  currency?: { id?: string; label?: string };
  createdDate?: string;
  effectiveDate?: string;
  amount?: number;
  charge?: number;
  tax?: number;
  reason?: { id?: string | null; label?: string | null; key?: string | null };
  notes?: string | null;
  transactionDescription?: string | null;
  [key: string]: unknown;
}

/** Invoice as returned by the policy detail API */
interface ApiInvoice {
  invoiceId?: string;
  status?: string;
  installmentBegin?: string;
  installmentEnd?: string;
  amount?: number;
  charge?: number;
  tax?: number;
  reason?: { id?: string | null; label?: string | null; key?: string | null };
  currency?: { id?: string; label?: string };
  paidDate?: string | null;
  processedDate?: string;
  billedOn?: string;
  [key: string]: unknown;
}

interface PolicyDetail {
  basicInfo?: {
    policyNumber?: string;
    status?: string;
    effectiveDate?: string;
    expirationDate?: string;
    termEffectiveDate?: string;
    termNumber?: string | number;
    autoRenew?: boolean | string;
    onTermEnd?: string;
    cancellationDate?: string;
    cancellationReason?: string;
    productName?: string;
    productId?: string;
    planName?: string;
    journeyId?: string;
    partner?: string;
    billingCurrency?: string;
    policyPremium?: string | number;
    country?: { label?: string };
    currency?: { id?: string };
    latestPremium?: string | number;
    taxPercentage?: string | number;
  };
  latestPaymentInfo?: {
    paymentMethod?: { label?: string };
  };
  /** Full person/customer records (join to insureds by accountId for email, address, age, etc.) */
  people?: Array<{
    accountId?: string;
    firstName?: string;
    lastName?: string;
    emailAddr?: string;
    dateOfBirth?: string;
    personalId?: string;
    title?: { label?: string };
    gender?: { label?: string };
    occupation?: { label?: string };
    age?: { number?: number; description?: string };
    addresses?: Array<{
      addressLine1?: string;
      addressLine2?: string;
      addressLine3?: string;
      addressLine4?: string;
      city?: string;
      postalCode?: string;
      country?: { id?: string; label?: string };
      contactDetails?: Array<{ type?: string; detail?: string }>;
    }>;
    [key: string]: unknown;
  }>;
  insureds?: Array<{
    accountId?: string;
    firstName?: string;
    lastName?: string;
    insuredType?: string;
    role?: string;
    coverageVariants?: Array<{
      coverageVariantDesc?: string;
      coverageVariantId?: string;
      coverageCode?: string;
      coverageCodes?: string;
      code?: string;
      sumInsured?: number;
      stdCoverage?: { stdCoverageCode?: string; [key: string]: unknown };
      coverageVariantLevel?: {
        insuredLevel?: {
          limit?: { maxAmount?: number; minAmount?: number; [key: string]: unknown };
          deductible?: { amount?: number; [key: string]: unknown };
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      deductibleMainInsured?: string | number;
      limitMainInsured?: string | number;
      deductibleChild?: string | number;
      limitChild?: string | number;
      deductible?: string | number;
      limit?: string | number;
      [key: string]: unknown;
    }>;
    address?: string | { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; country?: string };
    addresses?: Array<{
      type?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string | { label?: string };
    }>;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    age?: string | number;
    personalId?: string;
    [key: string]: unknown;
  }>;
  /** Policy-level rating factors (e.g. premium, applicantAge) – from product definition. */
  ratingFactors?: Array<{ attributeName?: string; name?: string; value?: unknown }>;
  /** Additional policy-level attributes – from product definition. */
  additionalAttributes?: Array<{ attributeName?: string; name?: string; value?: unknown }>;
  /** Nested shape: policyAttributes.ratingFactors / additionalAttributes */
  policyAttributes?: {
    ratingFactors?: Array<{ attributeName?: string; name?: string; value?: unknown }>;
    additionalAttributes?: Array<{ attributeName?: string; name?: string; value?: unknown }>;
  };
  /** Rating factors for the whole policy (person products): Type, Category, Value (e.g. premium, payment frequency, monthly). */
  policyRatingFactors?: Array<{ type?: string; category?: string; value?: unknown }>;
  /** Journey/product context (when returned by API). */
  journey?: {
    journeyId?: string;
    journeyName?: string;
    journeyAlias?: string;
    journeyVersion?: string;
    journeyDescription?: string;
    lineOfBusiness?: string;
    company?: string;
    companyCode?: string;
    partner?: string;
    planId?: string;
    planName?: string;
    billCurrency?: string;
    billCurrencySymbol?: string;
    billCurrencyText?: string;
    servicingUnit?: { unitId?: string; name?: string; type?: string };
    [key: string]: unknown;
  };
  transactions?: ApiTransaction[];
  invoices?: ApiInvoice[];
  paymentHistory?: Array<{
    date?: string;
    amount?: string | number;
    method?: string;
    status?: string;
  }>;
  [key: string]: unknown;
}

/** Format ISO date(time) for display; use as main key for sorting. */
function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = value.includes("T") ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";
  return time ? `${date}, ${time}` : date;
}

/** Parse date for sorting (latest first). */
function parseSortDate(value: string | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${mono ? "font-mono" : ""}`}>{value ?? "—"}</dd>
    </div>
  );
}

export default function PolicyDetailPage() {
  const params = useParams();
  const policyNumber = typeof params.policyNumber === "string"
    ? decodeURIComponent(params.policyNumber)
    : "";

  const [detail, setDetail] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [expandedBeneficiaryKeys, setExpandedBeneficiaryKeys] = useState<Set<string>>(new Set());
  const [billingHistoryByInvoiceId, setBillingHistoryByInvoiceId] = useState<
    Record<string, { transactions: ApiTransaction[]; loading?: boolean; error?: string }>
  >({});
  const [expandedCoverageVariant, setExpandedCoverageVariant] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState("summary");
  const [documents, setDocuments] = useState<Array<{
    id: string;
    createdOn: string;
    createdBy: string;
    type: string;
    transaction: string;
    kitId: string;
    documentName: string;
    effectiveDate: string;
  }> | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsHint, setDocumentsHint] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  /** Coverage amount rows grouped by Coverage Variant Name for accordion */
  const coverageGroups = useMemo(() => {
    const insureds = detail?.insureds;
    if (!Array.isArray(insureds) || insureds.length === 0) return [];
    const flat: Array<{
      ins: (typeof insureds)[number];
      cv: NonNullable<(typeof insureds)[number]["coverageVariants"]>[number];
      code: string;
      dedMain: string | number;
      limMain: string | number;
      dedChild: string | number;
      limChild: string | number;
    }> = [];
    insureds.forEach((ins) => {
      (ins.coverageVariants ?? [{ coverageVariantDesc: undefined }]).forEach((cv) => {
        const code =
          cv.stdCoverage?.stdCoverageCode ??
          cv.coverageVariantId ??
          cv.coverageCode ??
          cv.coverageCodes ??
          cv.code ??
          "—";
        const insuredLevel = cv.coverageVariantLevel?.insuredLevel;
        const dedMain =
          insuredLevel?.deductible?.amount ??
          cv.deductibleMainInsured ??
          cv.deductible ??
          "—";
        const limMain =
          cv.sumInsured ??
          insuredLevel?.limit?.maxAmount ??
          cv.limitMainInsured ??
          cv.limit ??
          "—";
        const dedChild = cv.deductibleChild ?? "—";
        const limChild = cv.limitChild ?? "—";
        flat.push({ ins, cv, code, dedMain, limMain, dedChild, limChild });
      });
    });
    const byVariant = new Map<
      string,
      Array<{
        ins: (typeof insureds)[number];
        cv: NonNullable<(typeof insureds)[number]["coverageVariants"]>[number];
        code: string;
        dedMain: string | number;
        limMain: string | number;
        dedChild: string | number;
        limChild: string | number;
      }>
    >();
    flat.forEach((row) => {
      const name = row.cv.coverageVariantDesc ?? "—";
      if (!byVariant.has(name)) byVariant.set(name, []);
      byVariant.get(name)!.push(row);
    });
    return Array.from(byVariant.entries()).map(([variantName, rows]) => ({ variantName, rows }));
  }, [detail?.insureds]);

  /** Insured-first: one row per insured who has beneficiaries; expand shows all beneficiaries + coverages in one table */
  const insuredBeneficiaryGroups = useMemo(() => {
    const insureds = detail?.insureds;
    if (!Array.isArray(insureds) || insureds.length === 0) return [];
    return insureds
      .map((ins, i) => {
        const rows: Array<{ cv: NonNullable<(typeof ins)["coverageVariants"]>[number]; b: Record<string, unknown> }> = [];
        (ins.coverageVariants ?? []).forEach((cv) => {
          const bens = (cv as { beneficiaries?: unknown[] }).beneficiaries;
          if (!Array.isArray(bens) || bens.length === 0) return;
          bens.forEach((b) => rows.push({ cv, b: b as Record<string, unknown> }));
        });
        return rows.length > 0 ? { key: `ins-${i}`, ins, rows } : null;
      })
      .filter((g): g is NonNullable<typeof g> => g != null);
  }, [detail?.insureds]);

  const fetchDetail = useCallback(async () => {
    if (!policyNumber) {
      setError("Missing policy number.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/policies/detail?policyNumber=${encodeURIComponent(policyNumber)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string })?.error ??
            `Failed to load policy details (status ${res.status}).`
        );
      }
      const data = await res.json();
      setDetail(data as PolicyDetail);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load policy details."
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [policyNumber]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const fetchDocuments = useCallback(async () => {
    if (!policyNumber) return;
    setDocumentsLoading(true);
    setDocumentsError(null);
    setDocumentsHint(null);
    try {
      const res = await fetch(
        `/api/policies/documents?policyNumber=${encodeURIComponent(policyNumber)}`
      );
      const data = await res.json().catch(() => ({}));
      const payload = data as {
        documents?: unknown[];
        error?: string;
        message?: string;
        hint?: string;
        triedUrl?: string;
      };
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to load policy documents.");
      }
      setDocuments(Array.isArray(payload?.documents) ? payload.documents : []);
      setDocumentsError(payload?.error ?? payload?.message ?? null);
      setDocumentsHint(
        [
          payload?.triedUrl ? `Tried: ${payload.triedUrl}` : null,
          payload?.hint ?? null,
        ]
          .filter(Boolean)
          .join(" — ") || null
      );
    } catch (err) {
      setDocumentsError(
        err instanceof Error ? err.message : "Failed to load policy documents."
      );
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [policyNumber]);

  const handleDownloadDocument = useCallback(
    async (doc: { id: string; documentName?: string }) => {
      if (!doc.id) return;
      setDownloadError(null);
      setDownloadingDocId(doc.id);
      const url = `/api/policies/documents/${encodeURIComponent(doc.id)}/download${doc.documentName ? `?filename=${encodeURIComponent(doc.documentName)}` : ""}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string; body?: string; hint?: string };
          const msg = data?.error ?? (data?.body ? `Server: ${data.body}` : `Download failed: ${res.status}`);
          setDownloadError(data?.hint ? `${msg}. ${data.hint}` : msg);
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition");
        let filename = doc.documentName || `document-${doc.id}`;
        if (disposition) {
          const match = /filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i.exec(disposition) || /filename="?([^";\n]+)"?/i.exec(disposition);
          if (match?.[1]) filename = decodeURIComponent(match[1].trim());
        }
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        setDownloadError(err instanceof Error ? err.message : "Download failed.");
      } finally {
        setDownloadingDocId(null);
      }
    },
    []
  );

  useEffect(() => {
    if (
      activeMainTab === "documents" &&
      policyNumber &&
      documents === null &&
      !documentsLoading
    ) {
      fetchDocuments();
    }
  }, [activeMainTab, policyNumber, documents, documentsLoading, fetchDocuments]);

  const fetchBillingHistory = useCallback(
    async (invoiceId: string) => {
      setBillingHistoryByInvoiceId((prev) => ({
        ...prev,
        [invoiceId]: { ...prev[invoiceId], transactions: prev[invoiceId]?.transactions ?? [], loading: true, error: undefined },
      }));
      try {
        const res = await fetch(
          `/api/policies/billing-history?policyNumber=${encodeURIComponent(policyNumber)}&invoiceId=${encodeURIComponent(invoiceId)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? `Failed to load billing history (${res.status}).`);
        }
        const transactions = Array.isArray((data as { transactions?: ApiTransaction[] }).transactions)
          ? (data as { transactions: ApiTransaction[] }).transactions
          : [];
        setBillingHistoryByInvoiceId((prev) => ({
          ...prev,
          [invoiceId]: { transactions, loading: false, error: undefined },
        }));
      } catch (err) {
        setBillingHistoryByInvoiceId((prev) => ({
          ...prev,
          [invoiceId]: {
            transactions: [],
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load billing history.",
          },
        }));
      }
    },
    [policyNumber]
  );

  const handleInvoiceIdClick = useCallback(
    (invoiceId: string) => {
      const next = expandedInvoiceId === invoiceId ? null : invoiceId;
      setExpandedInvoiceId(next);
      if (next) fetchBillingHistory(next);
    },
    [expandedInvoiceId, fetchBillingHistory]
  );

  const rawTransactions = Array.isArray(detail?.transactions) ? detail.transactions : [];
  const rawInvoices = Array.isArray(detail?.invoices) ? detail.invoices : [];
  const transactions = useMemo(
    () => [...rawTransactions].sort((a, b) => parseSortDate(b.createdDate) - parseSortDate(a.createdDate)),
    [rawTransactions]
  );
  const invoices = useMemo(
    () =>
      [...rawInvoices].sort((a, b) => {
        const dateA = a.processedDate ?? a.billedOn ?? "";
        const dateB = b.processedDate ?? b.billedOn ?? "";
        return parseSortDate(dateB) - parseSortDate(dateA);
      }),
    [rawInvoices]
  );

  if (!policyNumber) {
    return (
      <div className="p-6 md:p-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/policies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to policies
          </Link>
        </Button>
        <p className="mt-4 text-sm text-red-400">Invalid policy number.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/policies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to policies
          </Link>
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">Loading policy details…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6 md:p-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/policies">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to policies
          </Link>
        </Button>
        <p className="mt-4 text-sm text-red-400">{error ?? "Policy not found."}</p>
      </div>
    );
  }

  const bi = detail.basicInfo ?? {};
  const autoRenewLabel =
    bi.autoRenew == null
      ? undefined
      : String(bi.autoRenew).toLowerCase() === "y" || bi.autoRenew === true
      ? "Yes"
      : "No";
  const cancellationReasonLabel =
    bi.cancellationReason && typeof bi.cancellationReason === "object"
      ? (bi.cancellationReason as any).label ?? (bi.cancellationReason as any).id
      : (bi.cancellationReason as string | undefined);
  const termNumberLabel =
    bi.termNumber != null ? String(bi.termNumber) : undefined;
  const billingCurrencyLabel =
    bi.billingCurrency ?? bi.currency?.id ?? undefined;
  const policyPremiumLabel =
    bi.policyPremium ?? bi.latestPremium ?? undefined;
  const ratingFactorsList =
    detail.ratingFactors ?? detail.policyAttributes?.ratingFactors ?? [];
  const additionalAttributesList =
    detail.additionalAttributes ?? detail.policyAttributes?.additionalAttributes ?? [];
  const policyRatingFactorsList =
    detail.policyRatingFactors ??
    (Array.isArray(detail.ratingFactors) && detail.ratingFactors.some((r) => "type" in r || "category" in r)
      ? detail.ratingFactors as Array<{ type?: string; category?: string; value?: unknown }>
      : []);

  return (
    <div className="p-6 md:p-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/policies">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to policies
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Policy details
        </h1>
        <p className="mt-1 font-mono text-muted-foreground">
          {bi.policyNumber ?? policyNumber}
        </p>
      </div>

      <Tabs defaultValue="summary" className="w-full" onValueChange={setActiveMainTab}>
        <TabsList className="mb-4 bg-muted">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="space-y-6 mt-0">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Basic & product</CardTitle>
            <CardDescription>
              Policy identification and product information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <DetailSection title="Basic">
                <dl className="mt-1 space-y-1 text-sm">
                  <DetailRow label="Policy number" value={bi.policyNumber} mono />
                  <DetailRow label="Status" value={bi.status} />
                  <DetailRow
                    label="Effective / Expiry"
                    value={
                      bi.effectiveDate && bi.expirationDate
                        ? `${bi.effectiveDate} → ${bi.expirationDate}`
                        : bi.effectiveDate ?? bi.expirationDate
                    }
                  />
                  <DetailRow
                    label="Term effective date"
                    value={bi.termEffectiveDate}
                  />
                  <DetailRow
                    label="Term number"
                    value={termNumberLabel}
                  />
                  <DetailRow
                    label="Auto renew"
                    value={autoRenewLabel}
                  />
                  <DetailRow
                    label="On-term end"
                    value={bi.onTermEnd}
                  />
                  <DetailRow
                    label="Cancellation date"
                    value={bi.cancellationDate}
                  />
                  <DetailRow
                    label="Cancellation reason"
                    value={cancellationReasonLabel}
                  />
                </dl>
              </DetailSection>
              <DetailSection title="Product">
                <dl className="mt-1 space-y-1 text-sm">
                  <DetailRow label="Name" value={bi.productName} />
                  <DetailRow label="Product ID" value={bi.productId} />
                  <DetailRow
                    label="Country / Currency"
                    value={
                      bi.country?.label != null && bi.currency?.id != null
                        ? `${bi.country.label} · ${bi.currency.id}`
                        : bi.country?.label ?? bi.currency?.id
                    }
                  />
                  <DetailRow
                    label="Plan name"
                    value={bi.planName}
                  />
                  <DetailRow
                    label="Journey ID"
                    value={bi.journeyId}
                  />
                  <DetailRow
                    label="Partner"
                    value={bi.partner}
                  />
                </dl>
              </DetailSection>
              <DetailSection title="Premium & billing">
                <dl className="mt-1 space-y-1 text-sm">
                  <DetailRow
                    label="Billing currency"
                    value={billingCurrencyLabel}
                  />
                  <DetailRow
                    label="Policy premium"
                    value={policyPremiumLabel != null ? String(policyPremiumLabel) : undefined}
                    mono
                  />
                  <DetailRow
                    label="Latest premium"
                    value={String(bi.latestPremium ?? "—")}
                  />
                  <DetailRow label="Tax %" value={bi.taxPercentage != null ? String(bi.taxPercentage) : undefined} />
                  <DetailRow
                    label="Payment method"
                    value={detail.latestPaymentInfo?.paymentMethod?.label}
                  />
                </dl>
              </DetailSection>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Insured parties</CardTitle>
            <CardDescription>
              Insureds and coverage variants. Personal details (email, phone, address, age) are from the policy&apos;s people records when available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Array.isArray(detail.insureds) && detail.insureds.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {detail.insureds.map((ins, idx) => {
                  const person = detail.people?.find(
                    (p) => p.accountId != null && String(p.accountId) === String((ins as { accountId?: string }).accountId)
                  );
                  const addr = person?.addresses?.[0] ?? ins.address;
                  const addressStr =
                    typeof addr === "string"
                      ? addr.trim() || "—"
                      : addr != null && typeof addr === "object"
                        ? [
                            "addressLine1" in addr ? addr.addressLine1 : (addr as { line1?: string }).line1,
                            "addressLine2" in addr ? addr.addressLine2 : (addr as { line2?: string }).line2,
                            "addressLine3" in addr ? addr.addressLine3 : null,
                            "addressLine4" in addr ? addr.addressLine4 : null,
                            "city" in addr ? addr.city : (addr as { city?: string }).city,
                            "postalCode" in addr ? addr.postalCode : (addr as { postalCode?: string }).postalCode,
                            typeof (addr as { country?: { label?: string } }).country === "object" && (addr as { country?: { label?: string } }).country?.label
                              ? (addr as { country: { label?: string } }).country.label
                              : (addr as { country?: string }).country,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"
                        : "—";
                  const contactDetails = person?.addresses?.[0]?.contactDetails;
                  const phone =
                    contactDetails?.find((c) => (c.type ?? "").toLowerCase() === "phone")?.detail ??
                    contactDetails?.find((c) => (c.type ?? "").toLowerCase() === "mobile")?.detail ??
                    ins.phone ??
                    "—";
                  const email = person?.emailAddr ?? ins.email ?? "—";
                  const dob = person?.dateOfBirth ?? ins.dateOfBirth ?? "—";
                  const ageStr = person?.age?.description ?? (person?.age?.number != null ? `${person.age.number} years` : null) ?? "—";
                  const personalId = person?.personalId ?? ins.personalId ?? "—";
                  const gender = person?.gender?.label ?? "—";
                  const occupation = person?.occupation?.label ?? "—";
                  const title = person?.title?.label;
                  const displayName = [title, ins.firstName, ins.lastName].filter(Boolean).join(" ") || [ins.firstName, ins.lastName].filter(Boolean).join(" ") || "—";
                  return (
                    <div
                      key={idx}
                      className="rounded-md border border-border bg-background/40 p-4 text-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{displayName}</span>
                        <span className="text-muted-foreground shrink-0">
                          {ins.insuredType ?? "—"}
                        </span>
                      </div>
                      {ins.coverageVariants?.[0]?.coverageVariantDesc && (
                        <p className="mt-1 text-muted-foreground">
                          {ins.coverageVariants[0].coverageVariantDesc}
                        </p>
                      )}
                      <dl className="mt-3 space-y-1.5 border-t border-border pt-3">
                        {email !== "—" && (
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
                            <dd className="mt-0.5 font-mono text-foreground break-all">{email}</dd>
                          </div>
                        )}
                        {phone !== "—" && (
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phone</dt>
                            <dd className="mt-0.5 text-foreground">{phone}</dd>
                          </div>
                        )}
                        {addressStr !== "—" && (
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Address</dt>
                            <dd className="mt-0.5 text-foreground">{addressStr}</dd>
                          </div>
                        )}
                        {dob !== "—" && (
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Date of birth</dt>
                            <dd className="mt-0.5 text-foreground">{dob}</dd>
                          </div>
                        )}
                        {ageStr !== "—" && (
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Age</dt>
                            <dd className="mt-0.5 text-foreground">{ageStr}</dd>
                          </div>
                        )}
                        {gender !== "—" && (
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Gender</dt>
                            <dd className="mt-0.5 text-foreground">{gender}</dd>
                          </div>
                        )}
                        {occupation !== "—" && (
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Occupation</dt>
                            <dd className="mt-0.5 text-foreground">{occupation}</dd>
                          </div>
                        )}
                        {personalId !== "—" && (
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Personal ID</dt>
                            <dd className="mt-0.5 font-mono text-foreground">{personalId}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No insured party details available.
              </p>
            )}
          </CardContent>
        </Card>

        </TabsContent>

        <TabsContent value="transactions" className="space-y-6 mt-0">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Transaction history</CardTitle>
            <CardDescription>
              Transactions sorted by date (latest first).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Code</TableHead>
                    <TableHead className="text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-muted-foreground">Charge</TableHead>
                    <TableHead className="text-muted-foreground">Tax</TableHead>
                    <TableHead className="text-muted-foreground">Reason / notes</TableHead>
                    <TableHead className="text-muted-foreground">Operator</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, idx) => {
                    const currencyId = tx.currency?.id ?? "";
                    const amountStr = tx.amount != null ? `${tx.amount < 0 ? "" : "+"}${tx.amount.toFixed(2)}` : "—";
                    const reasonLabel = tx.reason?.label ?? tx.notes ?? tx.transactionDescription ?? "—";
                    return (
                      <TableRow
                        key={`${tx.transactionId ?? "tx"}-${tx.code ?? ""}-${idx}`}
                        className="border-border"
                      >
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(tx.createdDate)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{tx.code ?? "—"}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {tx.amount != null ? `${amountStr} ${currencyId}`.trim() : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {tx.charge != null ? tx.charge.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {tx.tax != null ? tx.tax.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-muted-foreground" title={String(reasonLabel)}>
                          {reasonLabel}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {tx.operator ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No transaction history available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              Invoices and billing history, sorted by date (latest first).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Invoice</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Period</TableHead>
                    <TableHead className="text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-muted-foreground">Charge</TableHead>
                    <TableHead className="text-muted-foreground">Tax</TableHead>
                    <TableHead className="text-muted-foreground">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv, idx) => {
                    const invId = inv.invoiceId ?? "";
                    const dateStr = formatDate(inv.processedDate ?? inv.billedOn);
                    const period =
                      inv.installmentBegin && inv.installmentEnd
                        ? `${inv.installmentBegin} → ${inv.installmentEnd}`
                        : inv.installmentBegin ?? inv.installmentEnd ?? "—";
                    const currencyId = inv.currency?.id ?? "";
                    const amountStr = inv.amount != null ? `${inv.amount.toFixed(2)} ${currencyId}`.trim() : "—";
                    const reasonLabel = inv.reason?.label ?? "—";
                    const isExpanded = expandedInvoiceId === invId;
                    const billing = billingHistoryByInvoiceId[invId];
                    return (
                      <Fragment key={invId || idx}>
                        <TableRow className="border-border">
                          <TableCell className="font-mono text-sm">
                            {invId ? (
                              <button
                                type="button"
                                className="underline-offset-2 hover:underline text-foreground"
                                onClick={() => handleInvoiceIdClick(invId)}
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? "Collapse billing history" : `View billing history for invoice ${invId}`}
                              >
                                {invId}
                              </button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {dateStr}
                          </TableCell>
                          <TableCell>{inv.status ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{period}</TableCell>
                          <TableCell className="font-mono text-sm">{amountStr}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {inv.charge != null ? `${inv.charge.toFixed(2)} ${currencyId}`.trim() : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {inv.tax != null ? `${inv.tax.toFixed(2)} ${currencyId}`.trim() : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{reasonLabel}</TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="border-border bg-muted/5">
                            <TableCell colSpan={8} className="p-4">
                              {billing?.loading && (
                                <p className="text-sm text-muted-foreground">Loading billing history…</p>
                              )}
                              {billing?.error && (
                                <p className="mb-2 text-xs text-red-400">{billing.error}</p>
                              )}
                              {!billing?.loading && billing?.transactions && billing.transactions.length > 0 && (
                                <div className="space-y-4">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Transaction details
                                  </p>
                                  <div className="rounded-lg border border-border bg-background/40 overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent">
                                          <TableHead className="text-muted-foreground">Date</TableHead>
                                          <TableHead className="text-muted-foreground">Code</TableHead>
                                          <TableHead className="text-muted-foreground">Amount</TableHead>
                                          <TableHead className="text-muted-foreground">Charge</TableHead>
                                          <TableHead className="text-muted-foreground">Tax</TableHead>
                                          <TableHead className="text-muted-foreground">Reason / notes</TableHead>
                                          <TableHead className="text-muted-foreground">Operator</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {billing.transactions.map((tx, txIdx) => {
                                          const amountStrTx = tx.amount != null ? `${tx.amount < 0 ? "" : "+"}${tx.amount.toFixed(2)}` : "—";
                                          const reasonLabelTx = tx.reason?.label ?? tx.notes ?? tx.transactionDescription ?? "—";
                                          const currencyIdTx = tx.currency?.id ?? "";
                                          return (
                                            <TableRow key={`${tx.transactionId ?? "tx"}-${tx.code ?? ""}-${txIdx}`} className="border-border">
                                              <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                                                {formatDate(tx.createdDate)}
                                              </TableCell>
                                              <TableCell className="font-mono text-sm">{tx.code ?? "—"}</TableCell>
                                              <TableCell className="font-mono text-sm">
                                                {tx.amount != null ? `${amountStrTx} ${currencyIdTx}`.trim() : "—"}
                                              </TableCell>
                                              <TableCell className="font-mono text-sm">
                                                {tx.charge != null ? tx.charge.toFixed(2) : "—"}
                                              </TableCell>
                                              <TableCell className="font-mono text-sm">
                                                {tx.tax != null ? tx.tax.toFixed(2) : "—"}
                                              </TableCell>
                                              <TableCell className="max-w-[10rem] truncate text-muted-foreground text-sm" title={String(reasonLabelTx)}>
                                                {reasonLabelTx}
                                              </TableCell>
                                              <TableCell className="text-muted-foreground text-sm">{tx.operator ?? "—"}</TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}
                              {!billing?.loading && billing?.transactions?.length === 0 && !billing?.error && (
                                <p className="text-sm text-muted-foreground">No transactions for this invoice.</p>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No invoices available.
              </p>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="product" className="mt-0">
          <Card className="mb-6 border-border bg-card">
            <CardHeader>
              <CardTitle>Product summary</CardTitle>
              <CardDescription>
                Product and journey details for this policy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <DetailSection title="Product">
                  <dl className="mt-1 space-y-1 text-sm">
                    <DetailRow label="Name" value={bi.productName} />
                    <DetailRow label="Product ID" value={bi.productId} mono />
                    <DetailRow label="Plan name" value={bi.planName ?? detail.journey?.planName} />
                  </dl>
                </DetailSection>
                <DetailSection title="Journey">
                  <dl className="mt-1 space-y-1 text-sm">
                    <DetailRow label="Journey ID" value={detail.journey?.journeyId ?? bi.journeyId} mono />
                    <DetailRow label="Journey name" value={detail.journey?.journeyName} />
                    <DetailRow label="Partner" value={detail.journey?.partner ?? bi.partner} />
                    <DetailRow label="Company" value={detail.journey?.company} />
                    <DetailRow label="Line of business" value={detail.journey?.lineOfBusiness} />
                  </dl>
                </DetailSection>
                <DetailSection title="Billing &amp; servicing">
                  <dl className="mt-1 space-y-1 text-sm">
                    <DetailRow label="Bill currency" value={detail.journey?.billCurrency ?? detail.journey?.billCurrencyText ?? bi.billingCurrency} />
                    <DetailRow label="Servicing unit" value={detail.journey?.servicingUnit?.name} />
                    {detail.journey?.servicingUnit?.unitId && (
                      <DetailRow label="Unit ID" value={detail.journey.servicingUnit.unitId} mono />
                    )}
                  </dl>
                </DetailSection>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="coverage" className="w-full">
            <TabsList className="mb-4 h-auto flex-wrap gap-1 bg-muted">
              <TabsTrigger value="coverage">Coverage Amount</TabsTrigger>
              <TabsTrigger value="insured">Insured Details</TabsTrigger>
              <TabsTrigger value="attributes">Policy Attributes</TabsTrigger>
              <TabsTrigger value="rating">Rating Factors</TabsTrigger>
              <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
            </TabsList>

            <TabsContent value="coverage" className="mt-0">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Coverage Amount</CardTitle>
                  <CardDescription>
                    Coverage amounts by insured / coverage variant. Structure adapts for person or object.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Coverage Variant Name</TableHead>
                        <TableHead className="text-muted-foreground">Object / Person</TableHead>
                        <TableHead className="text-muted-foreground">Coverage Codes</TableHead>
                        <TableHead className="text-muted-foreground">Deductible – Main Insured</TableHead>
                        <TableHead className="text-muted-foreground">Limit – Main Insured</TableHead>
                        <TableHead className="text-muted-foreground">Deductible – Child</TableHead>
                        <TableHead className="text-muted-foreground">Limit – Child</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coverageGroups.length > 0 ? (
                        coverageGroups.map(({ variantName, rows }) => {
                          const isExpanded = expandedCoverageVariant === variantName;
                          const fmt = (v: string | number | undefined) =>
                            v === "—" || v == null ? "—" : typeof v === "number" ? String(v) : v;
                          return (
                            <Fragment key={variantName}>
                              <TableRow
                                className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() =>
                                  setExpandedCoverageVariant((v) => (v === variantName ? null : variantName))
                                }
                              >
                                <TableCell className="align-middle">
                                  <span className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <span className="font-medium">{variantName}</span>
                                  </span>
                                </TableCell>
                                <TableCell colSpan={6} className="text-muted-foreground text-sm">
                                  {rows.length} insured{rows.length !== 1 ? "s" : ""}
                                </TableCell>
                              </TableRow>
                              {isExpanded &&
                                rows.map(({ ins, cv, code, dedMain, limMain, dedChild, limChild }, idx) => (
                                  <TableRow
                                    key={`${variantName}-${idx}`}
                                    className="border-border bg-muted/20 hover:bg-muted/30"
                                  >
                                    <TableCell className="w-8 pl-12 text-muted-foreground" />
                                    <TableCell>
                                      {([ins.firstName, ins.lastName].filter(Boolean).join(" ") || ins.insuredType) ??
                                        "—"}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{fmt(code)}</TableCell>
                                    <TableCell>{fmt(dedMain)}</TableCell>
                                    <TableCell>{fmt(limMain)}</TableCell>
                                    <TableCell>{fmt(dedChild)}</TableCell>
                                    <TableCell>{fmt(limChild)}</TableCell>
                                  </TableRow>
                                ))}
                            </Fragment>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                            No coverage data. Populated from policy insureds and coverage variants when available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insured" className="mt-0">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Insured Details</CardTitle>
                  <CardDescription>
                    Policy-specific insured information (person or object). May include rating answers and attributes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Name / Object ID</TableHead>
                        <TableHead className="text-muted-foreground">Insured Type / Object Type</TableHead>
                        <TableHead className="text-muted-foreground">Inception Date</TableHead>
                        <TableHead className="text-muted-foreground">Maximum Renewal Age</TableHead>
                        <TableHead className="text-muted-foreground">No of children</TableHead>
                        <TableHead className="text-muted-foreground">Brand / Model</TableHead>
                        <TableHead className="text-muted-foreground">Value Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(detail.insureds) && detail.insureds.length > 0 ? (
                        detail.insureds.map((ins, idx) => (
                          <TableRow key={idx} className="border-border">
                            <TableCell>
                              {[ins.firstName, ins.lastName].filter(Boolean).join(" ") || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{ins.insuredType ?? "—"}</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>—</TableCell>
                            <TableCell>—</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                            No insured details. Fields (e.g. inception date, max renewal age, object type) appear when provided by the API.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attributes" className="mt-0">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Policy Attributes</CardTitle>
                  <CardDescription>
                    Policy-level attributes from the product definition (person and object). Shown when the product requires additional attributes at policy level, not under an insured.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Rating Factors</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      The rating factor being assessed (e.g. premium, applicantAge) and its value (e.g. payment frequency, age number).
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Attribute Name</TableHead>
                          <TableHead className="text-muted-foreground">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ratingFactorsList.length > 0 ? (
                          ratingFactorsList.map((row, idx) => (
                            <TableRow key={idx} className="border-border">
                              <TableCell>
                                {row.attributeName ?? row.name ?? "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {row.value != null ? String(row.value) : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground text-sm py-6">
                              No rating factors. Shown when the product defines policy-level rating factors.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Additional Attributes</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Additional rating factors or attributes at policy level (e.g. premium, applicantAge and their values).
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-muted-foreground">Attribute Name</TableHead>
                          <TableHead className="text-muted-foreground">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {additionalAttributesList.length > 0 ? (
                          additionalAttributesList.map((row, idx) => (
                            <TableRow key={idx} className="border-border">
                              <TableCell>
                                {row.attributeName ?? row.name ?? "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {row.value != null ? String(row.value) : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground text-sm py-6">
                              No additional attributes. Shown when the product defines extra policy-level attributes.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rating" className="mt-0">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Rating Factors</CardTitle>
                  <CardDescription>
                    Rating factors that apply to the whole policy rather than under a specific individual (e.g. premium payment frequency). Person only — this option is available for insured people.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Type</TableHead>
                        <TableHead className="text-muted-foreground">Category</TableHead>
                        <TableHead className="text-muted-foreground">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policyRatingFactorsList.length > 0 ? (
                        policyRatingFactorsList.map((row, idx) => (
                          <TableRow key={idx} className="border-border">
                            <TableCell>{row.type ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{row.category ?? "—"}</TableCell>
                            <TableCell>{row.value != null ? String(row.value) : "—"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-8">
                            No rating factors. Populated when the API returns policy-level rating factors (e.g. Type: premium, Category: payment frequency, Value: monthly).
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="beneficiaries" className="mt-0">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Beneficiaries</CardTitle>
                  <CardDescription>
                    By insured. Expand an insured to see all their beneficiaries and the coverages they are designated for in one table.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insuredBeneficiaryGroups.length > 0 && (
                    <div className="mb-3 flex items-center gap-4 text-sm">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setExpandedBeneficiaryKeys(new Set(insuredBeneficiaryGroups.map((g) => g.key)))}
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setExpandedBeneficiaryKeys(new Set())}
                      >
                        Collapse All
                      </button>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground w-8" />
                        <TableHead className="text-muted-foreground">Insured Name</TableHead>
                        <TableHead className="text-muted-foreground">Insured Type</TableHead>
                        <TableHead className="text-muted-foreground">Beneficiaries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insuredBeneficiaryGroups.length > 0 ? (
                        insuredBeneficiaryGroups.map(({ key, ins, rows }) => {
                          const isExpanded = expandedBeneficiaryKeys.has(key);
                          const uniqueBeneficiaryCount = new Set(
                            rows.map(({ b }) => {
                              const cd = b.contactDetails as Array<{ type?: string; detail?: string }> | undefined;
                              const email = Array.isArray(cd) ? cd.find((c) => (c.type ?? "").toLowerCase() === "email")?.detail ?? b.email ?? "" : (b.email ?? "");
                              return [b.firstName ?? "", b.lastName ?? "", email].join("|");
                            })
                          ).size;
                          const summary =
                            rows.length === 1
                              ? "1 beneficiary · 1 coverage"
                              : `${uniqueBeneficiaryCount} beneficiary${uniqueBeneficiaryCount !== 1 ? "s" : ""} · ${rows.length} coverage${rows.length !== 1 ? "s" : ""}`;
                          return (
                            <Fragment key={key}>
                              <TableRow
                                className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  setExpandedBeneficiaryKeys((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(key)) next.delete(key);
                                    else next.add(key);
                                    return next;
                                  });
                                }}
                              >
                                <TableCell className="w-8 align-middle">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  )}
                                </TableCell>
                                <TableCell className="align-middle font-medium">
                                  {[ins.firstName, ins.lastName].filter(Boolean).join(" ") || "—"}
                                </TableCell>
                                <TableCell className="align-middle text-muted-foreground">
                                  {ins.insuredType ?? "—"}
                                </TableCell>
                                <TableCell className="align-middle text-muted-foreground text-sm">
                                  {summary}
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="border-border bg-muted/20">
                                  <TableCell colSpan={4} className="p-0 align-top">
                                    <div className="px-4 pb-4 pt-2">
                                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Beneficiaries &amp; coverages
                                      </p>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="text-muted-foreground">Beneficiary</TableHead>
                                            <TableHead className="text-muted-foreground">Phone</TableHead>
                                            <TableHead className="text-muted-foreground">Email</TableHead>
                                            <TableHead className="text-muted-foreground">Coverage</TableHead>
                                            <TableHead className="text-muted-foreground">Percentage</TableHead>
                                            <TableHead className="text-muted-foreground">Relationship</TableHead>
                                            <TableHead className="text-muted-foreground">Priority</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {rows.map(({ cv, b }, idx) => {
                                            const raw = b as Record<string, unknown>;
                                            const name = (raw.name ?? ((raw.firstName != null || raw.lastName != null)
                                              ? [raw.firstName, raw.lastName].filter(Boolean).join(" ")
                                              : null)) ?? raw.label ?? "—";
                                            const contactDetails = raw.contactDetails as Array<{ type?: string; detail?: string }> | undefined;
                                            const phone = Array.isArray(contactDetails)
                                              ? contactDetails.find((c) => (c.type ?? "").toLowerCase() === "phone")?.detail ?? raw.phone ?? "—"
                                              : (raw.phone ?? "—");
                                            const email = Array.isArray(contactDetails)
                                              ? contactDetails.find((c) => (c.type ?? "").toLowerCase() === "email")?.detail ?? raw.email ?? "—"
                                              : (raw.email ?? "—");
                                            const relObj = raw.relationShipToIns as { id?: string; label?: string } | undefined;
                                            const relationship = relObj?.label ?? relObj?.id ?? raw.relationship ?? "—";
                                            const priority = raw.priorityLevel ?? raw.priority ?? "—";
                                            return (
                                              <TableRow key={idx} className="border-border">
                                                <TableCell className="font-medium">{String(name)}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{phone != null && phone !== "—" ? String(phone) : "—"}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{email != null && email !== "—" ? String(email) : "—"}</TableCell>
                                                <TableCell className="text-muted-foreground">{cv.coverageVariantDesc ?? "—"}</TableCell>
                                                <TableCell>{raw.percentage != null ? `${raw.percentage}%` : "—"}</TableCell>
                                                <TableCell className="text-muted-foreground">{String(relationship)}</TableCell>
                                                <TableCell>{String(priority)}</TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                            No beneficiaries on record. Beneficiaries appear under coverages that support them.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Policy documents</CardTitle>
              <CardDescription>
                Documents associated with this policy. Fetched from the policy documents API when you open this tab.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(documents === null && activeMainTab === "documents") || documentsLoading ? (
                <p className="text-sm text-muted-foreground py-8">Loading documents…</p>
              ) : documentsError ? (
                <div className="py-8 space-y-2">
                  <p className="text-sm text-red-500">{documentsError}</p>
                  {documentsHint ? (
                    <p className="text-sm text-muted-foreground">{documentsHint}</p>
                  ) : null}
                </div>
              ) : Array.isArray(documents) && documents.length > 0 ? (
                <>
                  {downloadError ? (
                    <p className="text-sm text-red-500 mb-4">{downloadError}</p>
                  ) : null}
                  <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Document name</TableHead>
                      <TableHead className="text-muted-foreground">ID</TableHead>
                      <TableHead className="text-muted-foreground">Created on</TableHead>
                      <TableHead className="text-muted-foreground">Created by</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Transaction</TableHead>
                      <TableHead className="text-muted-foreground">Kit ID</TableHead>
                      <TableHead className="text-muted-foreground">Effective date</TableHead>
                      <TableHead className="text-muted-foreground w-[6rem]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc, idx) => (
                      <TableRow key={doc.id || idx} className="border-border">
                        <TableCell className="font-medium">{doc.documentName || "—"}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground" title={doc.id || undefined}>{doc.id ? doc.id.slice(0, 8) + "…" : "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {doc.createdOn ? formatDate(doc.createdOn) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{doc.createdBy || "—"}</TableCell>
                        <TableCell>{doc.type || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{doc.transaction || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{doc.kitId || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {doc.effectiveDate ? formatDate(doc.effectiveDate) : "—"}
                        </TableCell>
                        <TableCell>
                          {doc.id ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary h-8 px-2"
                              disabled={downloadingDocId !== null}
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              {downloadingDocId === doc.id ? (
                                <>
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  Downloading…
                                </>
                              ) : (
                                "Download"
                              )}
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-8">
                  No policy documents found. Ensure the policy documents API is configured (UAT_API_BASE_URL or UAT_POLICY_DOCUMENTS_URL).
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
