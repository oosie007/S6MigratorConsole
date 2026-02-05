import { NextRequest, NextResponse } from "next/server";

/** Billing history for an invoice: transactions linked to that invoice (by date range or API). */
interface BillingHistoryTransaction {
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

function parseSortDate(value: string | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export async function GET(req: NextRequest) {
  const policyNumber = req.nextUrl.searchParams.get("policyNumber");
  const invoiceId = req.nextUrl.searchParams.get("invoiceId");

  if (!policyNumber || !invoiceId) {
    return NextResponse.json(
      { error: "Missing required query parameters: policyNumber, invoiceId" },
      { status: 400 }
    );
  }

  try {
    const baseUrl = req.nextUrl.origin;
    const detailRes = await fetch(
      `${baseUrl}/api/policies/detail?policyNumber=${encodeURIComponent(policyNumber)}`
    );
    if (!detailRes.ok) {
      const body = await detailRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (body as { error?: string }).error ?? "Failed to load policy detail." },
        { status: detailRes.status }
      );
    }
    const policy = (await detailRes.json()) as {
      transactions?: BillingHistoryTransaction[];
      invoices?: Array<{
        invoiceId?: string;
        installmentBegin?: string;
        installmentEnd?: string;
        processedDate?: string;
        billedOn?: string;
        [key: string]: unknown;
      }>;
    };

    const invoices = Array.isArray(policy.invoices) ? policy.invoices : [];
    const invoice = invoices.find((inv) => String(inv.invoiceId) === String(invoiceId));
    const allTransactions = Array.isArray(policy.transactions) ? policy.transactions : [];

    if (!invoice) {
      return NextResponse.json(
        { error: `Invoice '${invoiceId}' not found for this policy.`, transactions: [] },
        { status: 404 }
      );
    }

    const begin = invoice.installmentBegin ? new Date(invoice.installmentBegin).getTime() : 0;
    const end = invoice.installmentEnd ? new Date(invoice.installmentEnd).getTime() : Number.MAX_SAFE_INTEGER;

    const transactions = allTransactions
      .filter((tx) => {
        const t = parseSortDate(tx.effectiveDate ?? tx.createdDate);
        return t >= begin && t <= end;
      })
      .sort((a, b) => parseSortDate(b.createdDate) - parseSortDate(a.createdDate));

    return NextResponse.json({ invoice, transactions });
  } catch (error) {
    console.error("Billing history error", error);
    return NextResponse.json(
      { error: "Failed to load billing history." },
      { status: 500 }
    );
  }
}
