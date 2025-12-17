import { createUIResource } from "@mcp-ui/server";
import { NextResponse } from "next/server";
import { getSession } from "auth/server";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const externalUrl = url.searchParams.get("url");

    if (!externalUrl) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 },
      );
    }

    // Validate URL format
    try {
      new URL(externalUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    // Generate a unique URI for this resource
    const resourceUri = `ui://external/${encodeURIComponent(externalUrl)}` as const;

    // Create UI resource with external URL
    const uiResource = createUIResource({
      uri: resourceUri,
      content: {
        type: "externalUrl",
        iframeUrl: externalUrl,
      },
      encoding: "text",
    });

    return NextResponse.json(uiResource);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create UI resource" },
      { status: 500 },
    );
  }
}

