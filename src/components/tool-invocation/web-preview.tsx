"use client";

import { ToolUIPart } from "ai";
import equal from "lib/equal";
import { AlertTriangleIcon } from "lucide-react";
import { memo, useMemo, useEffect, useState, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "ui/alert";
import { TextShimmer } from "ui/text-shimmer";
import {
    WebPreview,
    WebPreviewBody,
    WebPreviewNavigation,
    WebPreviewNavigationButton,
    WebPreviewUrl,
} from "ui/web-preview";
import {
    ArrowLeft,
    ArrowRight,
    RefreshCw,
    Maximize2,
    ExternalLink,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
} from "ui/dialog";

interface WebPreviewToolInvocationProps {
    part: ToolUIPart;
}

function PureWebPreviewToolInvocation({
    part,
}: WebPreviewToolInvocationProps) {
    const [expanded, setExpanded] = useState(false);

    const result = useMemo(() => {
        if (!part.state.startsWith("output")) return null;
        return part.output as
            | {
                url?: string;
                html?: string;
                isError?: boolean;
                error?: string;
            }
            | string
            | null;
    }, [part.state, part.output]);

    const previewUrl = useMemo(() => {
        if (!result) return null;

        if (typeof result === "string") {
            try {
                new URL(result);
                return result;
            } catch {
                return null;
            }
        }

        if (result.isError) return null;

        if (result.html) {
            const blob = new Blob([result.html], { type: "text/html" });
            const blobUrl = URL.createObjectURL(blob);
            // Cleanup blob URL on unmount
            return blobUrl;
        }

        if (result.url) {
            try {
                new URL(result.url);
                return result.url;
            } catch {
                return null;
            }
        }

        return null;
    }, [result]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        if (previewUrl && previewUrl.startsWith("blob:")) {
            return () => {
                URL.revokeObjectURL(previewUrl);
            };
        }
    }, [previewUrl]);

    const error = useMemo(() => {
        if (!result) return null;
        if (typeof result === "string") return null;
        if (result.isError && result.error) {
            return result.error;
        }
        return null;
    }, [result]);

    if (!part.state.startsWith("output")) {
        return (
            <div className="flex items-center gap-2 text-sm">
                <RefreshCw className="size-5 animate-spin text-muted-foreground" />
                <TextShimmer>Loading preview...</TextShimmer>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="border-destructive">
                <AlertTriangleIcon className="size-4" />
                <AlertTitle>Preview Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!previewUrl) {
        return (
            <Alert>
                <AlertTriangleIcon className="size-4" />
                <AlertTitle>No Preview Available</AlertTitle>
                <AlertDescription>
                    The tool did not return a valid URL or HTML content for preview.
                </AlertDescription>
            </Alert>
        );
    }

    const originalUrl = useMemo(() => {
        if (!result) return null;
        if (typeof result === "string") return result;
        if (result.url) return result.url;
        if (result.html) return previewUrl; // blob URL for HTML
        return null;
    }, [result, previewUrl]);

    const handleOpenInNewTab = () => {
        if (originalUrl) {
            window.open(originalUrl, "_blank", "noopener,noreferrer");
        }
    };

    const PreviewContent = ({
        className,
        containerRef,
        showExpandButton = true,
    }: {
        className?: string;
        containerRef?: React.RefObject<HTMLDivElement | null>;
        showExpandButton?: boolean;
    }) => {
        const getIframe = () => {
            if (containerRef?.current) {
                return containerRef.current.querySelector(
                    'iframe[title="Preview"]',
                ) as HTMLIFrameElement | null;
            }
            return document.querySelector(
                'iframe[title="Preview"]',
            ) as HTMLIFrameElement | null;
        };

        return (
            <div ref={containerRef} className={className}>
                <WebPreview defaultUrl={previewUrl} className="w-full h-full">
                    <WebPreviewNavigation>
                        <WebPreviewNavigationButton
                            onClick={() => {
                                const iframe = getIframe();
                                if (iframe?.contentWindow) {
                                    iframe.contentWindow.history.back();
                                }
                            }}
                            tooltip="Go back"
                        >
                            <ArrowLeft className="size-4" />
                        </WebPreviewNavigationButton>
                        <WebPreviewNavigationButton
                            onClick={() => {
                                const iframe = getIframe();
                                if (iframe?.contentWindow) {
                                    iframe.contentWindow.history.forward();
                                }
                            }}
                            tooltip="Go forward"
                        >
                            <ArrowRight className="size-4" />
                        </WebPreviewNavigationButton>
                        <WebPreviewNavigationButton
                            onClick={() => {
                                const iframe = getIframe();
                                if (iframe?.contentWindow) {
                                    iframe.contentWindow.location.reload();
                                }
                            }}
                            tooltip="Refresh"
                        >
                            <RefreshCw className="size-4" />
                        </WebPreviewNavigationButton>
                        <WebPreviewUrl />
                        <div className="flex-1" />
                        {/* {showExpandButton && (
                            <WebPreviewNavigationButton
                                onClick={() => setExpanded(true)}
                                tooltip="Expand to fullscreen"
                            >
                                <Maximize2 className="size-4" />
                            </WebPreviewNavigationButton>
                        )} */}
                        {originalUrl && (
                            <WebPreviewNavigationButton
                                onClick={handleOpenInNewTab}
                                tooltip="Open in new tab"
                            >
                                <ExternalLink className="size-4" />
                            </WebPreviewNavigationButton>
                        )}
                    </WebPreviewNavigation>
                    <WebPreviewBody />
                </WebPreview>
            </div>
        );
    };

    const regularContainerRef = useRef<HTMLDivElement>(null);
    const expandedContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex flex-col gap-2 w-full max-w-full">
            {!expanded && (
                <PreviewContent
                    className="h-[700px] w-full max-w-[1200px] mx-auto"
                    containerRef={regularContainerRef}
                    showExpandButton={true}
                />
            )}
            <Dialog open={expanded} onOpenChange={setExpanded}>
                <DialogContent
                    className="max-w-[100vw] max-h-[80vh] w-full h-[80vh] p-0 gap-0"
                    hideClose={false}
                >
                    <PreviewContent
                        className="w-full h-full"
                        containerRef={expandedContainerRef}
                        showExpandButton={false}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

export const WebPreviewToolInvocation = memo(
    PureWebPreviewToolInvocation,
    equal,
);

WebPreviewToolInvocation.displayName = "WebPreviewToolInvocation";

