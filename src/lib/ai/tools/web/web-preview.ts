import { tool as createTool } from "ai";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";

export interface WebPreviewRequest {
  url?: string;
  html?: string;
}

export interface WebPreviewResponse {
  url?: string;
  html?: string;
  error?: string;
}

export const webPreviewSchema: JSONSchema7 = {
  type: "object",
  properties: {
    url: {
      type: "string",
      description:
        "The URL to preview. Must be a valid HTTP or HTTPS URL. This will be rendered in an iframe.",
    },
    html: {
      type: "string",
      description:
        "HTML content to preview. If provided, this will be rendered instead of the URL. Use this for AI-generated HTML content.",
    },
  },
  required: [],
  additionalProperties: false,
};

export const webPreviewTool = createTool({
  description:
    "Preview a website or HTML content in an interactive iframe. Use this to show users web pages, AI-generated HTML, or any web content. The preview includes navigation controls and can handle both URLs and raw HTML content. IMPORTANT: You can use this tool to preview URLs returned by other tools (like MCP tools, web search, HTTP requests, etc.). When another tool returns a URL, call this webPreview tool with that URL to display it visually to the user.",
  inputSchema: jsonSchemaToZod(webPreviewSchema),
  execute: async ({ url, html }: WebPreviewRequest): Promise<WebPreviewResponse> => {
    if (!url && !html) {
      return {
        error: "Either url or html must be provided",
      };
    }

    if (url) {
      try {
        new URL(url);
        return { url };
      } catch {
        return {
          error: "Invalid URL format",
        };
      }
    }

    if (html) {
      return { html };
    }

    return {
      error: "No valid preview content provided",
    };
  },
});

