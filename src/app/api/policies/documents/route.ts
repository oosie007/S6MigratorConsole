import { NextRequest, NextResponse } from "next/server";

interface TokenResponse {
  access_token?: string;
  [key: string]: unknown;
}

/** Normalized policy document for UI (ID, Created On, Created By, Type, Transaction, Kit ID, Document Name, Effective Date). */
export interface PolicyDocumentRow {
  id: string;
  createdOn: string;
  createdBy: string;
  type: string;
  transaction: string;
  kitId: string;
  documentName: string;
  effectiveDate: string;
}

function normalizeDocument(doc: Record<string, unknown>): PolicyDocumentRow {
  const id = doc.id ?? doc.documentId ?? doc.DocumentId ?? "";
  const createdOn =
    doc.createdOn ??
    doc.createdDate ??
    doc.created_on ??
    doc.CreatedOn ??
    "";
  const createdBy =
    doc.createdBy ??
    doc.createdByUser ??
    doc.created_by ??
    doc.CreatedBy ??
    "";
  const type = doc.type ?? doc.documentType ?? doc.Type ?? "";
  const transaction = doc.transaction ?? doc.transactionCode ?? doc.Transaction ?? "";
  const kitId = doc.kitId ?? doc.kitID ?? doc.KitId ?? doc.kit_id ?? "";
  const documentName =
    doc.documentName ??
    doc.name ??
    doc.fileName ??
    doc.DocumentName ??
    "";
  const effectiveDate =
    doc.effectiveDate ??
    doc.effective_date ??
    doc.EffectiveDate ??
    "";
  return {
    id: String(id),
    createdOn: String(createdOn),
    createdBy: String(createdBy),
    type: String(type),
    transaction: String(transaction),
    kitId: String(kitId),
    documentName: String(documentName),
    effectiveDate: String(effectiveDate),
  };
}

export async function GET(req: NextRequest) {
  const policyNumber = req.nextUrl.searchParams.get("policyNumber");

  if (!policyNumber) {
    return NextResponse.json(
      { error: "Missing required query parameter 'policyNumber'" },
      { status: 400 }
    );
  }

  const authUrl = process.env.UAT_AUTH_URL;
  const authApiVersion = process.env.UAT_AUTH_API_VERSION ?? "1";
  const resource = process.env.UAT_AUTH_RESOURCE;
  const appId = process.env.UAT_AUTH_APP_ID;
  const appKey = process.env.UAT_AUTH_APP_KEY;
  // 404 = path not found. Set UAT_POLICY_DOCUMENTS_URL to the exact full URL from Postman, or try
  // UAT_POLICY_DOCUMENTS_USE_POLICY_BASE=true to use UAT_API_BASE_URL (e.g. digital.policy.catalyst).
  const usePolicyBase = process.env.UAT_POLICY_DOCUMENTS_USE_POLICY_BASE === "true";
  const documentApiBase =
    usePolicyBase
      ? process.env.UAT_API_BASE_URL
      : (process.env.UAT_DOCUMENT_API_BASE_URL ?? process.env.UAT_API_BASE_URL);
  const documentsPath =
    process.env.UAT_POLICY_DOCUMENTS_PATH || "/CatalystDocumentAPI/documents/search";
  const documentsSearchUrl =
    process.env.UAT_POLICY_DOCUMENTS_URL ||
    (documentApiBase ? `${documentApiBase.replace(/\/$/, "")}${documentsPath.startsWith("/") ? documentsPath : `/${documentsPath}`}` : null);
  const impersonateId =
    process.env.UAT_POLICY_IMPERSONATE_ID ?? "";

  if (!authUrl || !resource || !appId || !appKey) {
    return NextResponse.json(
      {
        error:
          "UAT environment is not fully configured (UAT_AUTH_URL, UAT_AUTH_RESOURCE, UAT_AUTH_APP_ID, UAT_AUTH_APP_KEY).",
      },
      { status: 500 }
    );
  }

  if (!documentsSearchUrl) {
    return NextResponse.json({ documents: [] });
  }

  try {
    const tokenRes = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiVersion: authApiVersion,
        Resource: resource,
        App_ID: appId,
        App_Key: appKey,
      },
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      return NextResponse.json(
        {
          error: "Failed to obtain access token from UAT authorization endpoint.",
          status: tokenRes.status,
          body,
        },
        { status: 502 }
      );
    }

    const tokenJson = (await tokenRes.json()) as TokenResponse;
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Authorization endpoint did not return access_token." },
        { status: 502 }
      );
    }

    const requestId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const body = {
      requestId,
      impersonateId,
      data: {
        context: [{ key: "POLICY", value: policyNumber }],
      },
    };

    if (process.env.NODE_ENV === "development") {
      console.log("[documents] POST", documentsSearchUrl, "policyNumber:", policyNumber);
    }

    const docRes = await fetch(documentsSearchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiversion: "2",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const raw = await docRes.text();

    if (process.env.NODE_ENV === "development") {
      console.log("[documents] Catalyst API status:", docRes.status, "body length:", raw.length);
      if (!docRes.ok || raw.length < 500) console.log("[documents] response:", raw.slice(0, 800));
    }

    if (!docRes.ok) {
      const preview = raw.slice(0, 400);
      const errMessage = `Documents API error ${docRes.status}: ${preview || docRes.statusText}`;
      if (docRes.status === 404) {
        return NextResponse.json({
          documents: [],
          error: errMessage,
          triedUrl: documentsSearchUrl,
          hint:
            "Set UAT_POLICY_DOCUMENTS_URL to the exact full URL from Postman, or add UAT_POLICY_DOCUMENTS_USE_POLICY_BASE=true to use the policy base URL (UAT_API_BASE_URL), or set UAT_POLICY_DOCUMENTS_PATH to try another path.",
        });
      }
      return NextResponse.json(
        { error: errMessage, status: docRes.status, body: raw.slice(0, 500) },
        { status: 502 }
      );
    }

    try {
      const json = JSON.parse(raw || "{}") as Record<string, unknown>;
      const data = json?.data as Record<string, unknown> | undefined;
      const list: unknown[] = Array.isArray(data?.documents)
        ? (data.documents as unknown[])
        : Array.isArray(data?.data)
          ? (data.data as unknown[])
          : Array.isArray(data?.results)
            ? (data.results as unknown[])
            : Array.isArray(json?.documents)
              ? (json.documents as unknown[])
              : Array.isArray(json?.details)
                ? (json.details as unknown[])
                : Array.isArray(json?.data)
                  ? (json.data as unknown[])
                  : Array.isArray(json?.results)
                    ? (json.results as unknown[])
                    : Array.isArray(json)
                      ? json
                      : [];
      const documents: PolicyDocumentRow[] = list.map((item) =>
        normalizeDocument(typeof item === "object" && item != null ? (item as Record<string, unknown>) : {})
      );
      if (documents.length === 0 && process.env.NODE_ENV === "development") {
        console.log("[documents] Parsed 0 documents. Top-level keys:", Object.keys(json));
        if (data) console.log("[documents] data keys:", Object.keys(data));
      }
      return NextResponse.json({
        documents,
        ...(documents.length === 0 && { message: "Catalyst API returned 200 but no document list found. Check server logs for response shape." }),
      });
    } catch (parseErr) {
      console.error("[documents] Parse error:", parseErr, "raw slice:", raw.slice(0, 300));
      return NextResponse.json({
        documents: [],
        error: `Could not parse documents response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}. Check server logs.`,
      });
    }
  } catch (error) {
    console.error("[documents] Unexpected error", error);
    const message = error instanceof Error ? error.message : "Unexpected error while calling policy documents API.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
