import { NextRequest, NextResponse } from "next/server";

interface TokenResponse {
  access_token?: string;
  [key: string]: unknown;
}

function getDocumentApiBase(): string | null {
  const base = process.env.UAT_DOCUMENT_API_BASE_URL ?? process.env.UAT_API_BASE_URL;
  return base ? base.replace(/\/$/, "") : null;
}

/** GET /api/policies/documents/[docId]/download — proxies CatalystDocumentAPI/documents/{docId}/download */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;
  if (!docId) {
    return NextResponse.json({ error: "Missing docId" }, { status: 400 });
  }

  const authUrl = process.env.UAT_AUTH_URL;
  const authApiVersion = process.env.UAT_AUTH_API_VERSION ?? "1";
  const resource = process.env.UAT_AUTH_RESOURCE;
  const appId = process.env.UAT_AUTH_APP_ID;
  const appKey = process.env.UAT_AUTH_APP_KEY;

  if (!authUrl || !resource || !appId || !appKey) {
    return NextResponse.json(
      { error: "UAT environment is not fully configured." },
      { status: 500 }
    );
  }

  // Download uses URL3 (UAT_DOCUMENT_API_BASE_URL) by default so it matches Postman. Override with UAT_POLICY_DOCUMENTS_DOWNLOAD_BASE_URL if needed.
  const documentApiBase =
    process.env.UAT_POLICY_DOCUMENTS_DOWNLOAD_BASE_URL ?? getDocumentApiBase();
  const pathSegment =
    process.env.UAT_POLICY_DOCUMENTS_DOWNLOAD_PATH ||
    "/CatalystDocumentAPI/documents";
  const downloadApiVersion = process.env.UAT_POLICY_DOCUMENTS_DOWNLOAD_API_VERSION || "1";
  const downloadUrl = documentApiBase
    ? `${documentApiBase}${pathSegment.startsWith("/") ? pathSegment : `/${pathSegment}`}/${encodeURIComponent(docId)}/download?api-version=${downloadApiVersion}`
    : null;

  if (!downloadUrl) {
    return NextResponse.json(
      { error: "Document download URL not configured (UAT_DOCUMENT_API_BASE_URL or UAT_POLICY_DOCUMENTS_DOWNLOAD_BASE_URL)." },
      { status: 500 }
    );
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
        { error: "Failed to obtain access token.", status: tokenRes.status, body },
        { status: 502 }
      );
    }

    const tokenJson = (await tokenRes.json()) as TokenResponse;
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      return NextResponse.json(
        { error: "Authorization did not return access_token." },
        { status: 502 }
      );
    }

    const impersonateId =
      process.env.UAT_POLICY_IMPERSONATE_ID ?? "";
    const impersonateHeader =
      process.env.UAT_POLICY_DOCUMENTS_DOWNLOAD_IMPERSONATE_HEADER || "ImpersonateId";

    if (process.env.NODE_ENV === "development") {
      console.log("[documents/download] GET", downloadUrl, "header", impersonateHeader + ":", impersonateId);
    }

    const docRes = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        apiversion: downloadApiVersion,
        Authorization: `Bearer ${accessToken}`,
        ...(impersonateId && { [impersonateHeader]: impersonateId }),
      },
    });

    if (!docRes.ok) {
      const responseText = await docRes.text();
      if (process.env.NODE_ENV === "development") {
        console.log("[documents/download] status:", docRes.status, "body:", responseText.slice(0, 300));
      }
      return NextResponse.json(
        {
          error: `Document download failed: ${docRes.status}`,
          status: docRes.status,
          body: responseText.slice(0, 500),
          hint:
            docRes.status === 401
              ? "Download endpoint returned 401 (AD token invalid). The document API may require a different auth scope or token than search. Check with your API team whether download uses the same token as document search or a different resource/endpoint."
              : docRes.status === 403
                ? "Check that Impersonate-Id is correct and the document API allows download with this token. If your API uses a different impersonation header name, set UAT_POLICY_DOCUMENTS_DOWNLOAD_IMPERSONATE_HEADER (e.g. X-Impersonate-Id)."
                : undefined,
        },
        { status: 502 }
      );
    }

    const contentType =
      docRes.headers.get("Content-Type") ?? "application/octet-stream";
    const contentDisposition =
      docRes.headers.get("Content-Disposition") ??
      (req.nextUrl.searchParams.get("filename")
        ? `attachment; filename="${req.nextUrl.searchParams.get("filename")}"`
        : `attachment; filename="document-${docId}"`);

    return new NextResponse(docRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (err) {
    console.error("[documents/download] Error:", err);
    const message = err instanceof Error ? err.message : "Document download failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
