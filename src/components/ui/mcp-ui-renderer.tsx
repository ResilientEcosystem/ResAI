"use client";

import { UIResourceRenderer } from "@mcp-ui/client";
import type { UIResource } from "@mcp-ui/server";
import { useMemo, useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { AlertTriangleIcon } from "lucide-react";
import { TextShimmer } from "ui/text-shimmer";
import { RefreshCw } from "lucide-react";

interface McpUIRendererProps {
  url: string;
  className?: string;
}

export function McpUIRenderer({ url, className }: McpUIRendererProps) {
  const [resource, setResource] = useState<UIResource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchResource() {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = new URL("/api/mcp-ui/resource", window.location.origin);
        apiUrl.searchParams.set("url", url);

        const response = await fetch(apiUrl.toString());

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to load resource");
        }

        const resourceData = (await response.json()) as UIResource;

        if (!cancelled) {
          setResource(resourceData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchResource();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleUIAction = useMemo(() => {
    return async (action: any) => {
      // Handle UI actions from the rendered content
      // You can extend this to handle different action types
      if (action?.type === "tool") {
        // Handle tool calls if needed
      }
      return undefined;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm p-4">
        <RefreshCw className="size-5 animate-spin text-muted-foreground" />
        <TextShimmer>Loading MCP UI...</TextShimmer>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="border-destructive">
        <AlertTriangleIcon className="size-4" />
        <AlertTitle>MCP UI Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!resource) {
    return (
      <Alert>
        <AlertTriangleIcon className="size-4" />
        <AlertTitle>No Resource Available</AlertTitle>
        <AlertDescription>
          Failed to load MCP UI resource for the provided URL.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      <UIResourceRenderer
        resource={resource.resource}
        onUIAction={handleUIAction}
      />
    </div>
  );
}
