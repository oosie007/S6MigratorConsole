import { NextRequest, NextResponse } from "next/server";

interface TokenResponse {
  access_token?: string;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Missing required query parameter 'date' (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const authUrl = process.env.UAT_AUTH_URL;
  const authApiVersion = process.env.UAT_AUTH_API_VERSION ?? "1";
  const resource = process.env.UAT_AUTH_RESOURCE;
  const appId = process.env.UAT_AUTH_APP_ID;
  const appKey = process.env.UAT_AUTH_APP_KEY;
  const policyBaseUrl = process.env.UAT_API_BASE_URL;
  const impersonateId =
    process.env.UAT_POLICY_IMPERSONATE_ID ?? "KULDEEP.NAPHRI@CHUBB.COM";

  if (!authUrl || !resource || !appId || !appKey || !policyBaseUrl) {
    return NextResponse.json(
      {
        error:
          "UAT environment is not fully configured. Ensure UAT_AUTH_URL, UAT_AUTH_RESOURCE, UAT_AUTH_APP_ID, UAT_AUTH_APP_KEY and UAT_API_BASE_URL are set.",
      },
      { status: 500 }
    );
  }

  try {
    // Step 1: obtain access token
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

    // Step 2: call policy search API
    const searchBody = {
      impersonateID: impersonateId,
      language: "en",
      searchvalue: date,
      searchType: "ByPolicyEffectiveDate",
      resultType: "Detailed",
    };

    const searchRes = await fetch(`${policyBaseUrl}/policy/policies/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiversion: "2",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(searchBody),
    });

    const raw = await searchRes.text();

    if (!searchRes.ok) {
      return NextResponse.json(
        {
          error: "UAT policy search returned a non-success status.",
          status: searchRes.status,
          body: raw,
        },
        { status: 502 }
      );
    }

    // Try to parse JSON but fall back to raw text if parsing fails
    try {
      const json = JSON.parse(raw);
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({ raw }, { status: 200 });
    }
  } catch (error) {
    console.error("UAT policy search error", error);
    return NextResponse.json(
      { error: "Unexpected error while calling UAT policy APIs." },
      { status: 500 }
    );
  }
}

