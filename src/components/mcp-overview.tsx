"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";

import { Button } from "ui/button";
import { GithubIcon } from "ui/github-icon";
import { PrometheusIcon } from "ui/prometheus-icon";

export const RECOMMENDED_MCPS = [
  {
    name: "github",
    label: "GitHub",
    config: {
      url: "https://api.githubcopilot.com/mcp/",
      headers: {
        Authorization: "Bearer ${input:your_github_mcp_pat}",
      },
    },
    icon: GithubIcon,
  },
  {
    name: "prometheus",
    label: "Prometheus",
    config: {
      url: "http://localhost:9090/api/v1/",
      // headers: {
      //   Authorization: "Bearer ${input:your_prometheus_token}",
      // },
    },
    icon: PrometheusIcon,
  },
];

export function MCPOverview() {
  const t = useTranslations("MCP");

  const handleMcpClick = (
    e: React.MouseEvent,
    mcp: (typeof RECOMMENDED_MCPS)[number],
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const params = new URLSearchParams();
    params.set("name", mcp.name);
    params.set("config", JSON.stringify(mcp.config));

    window.location.href = `/mcp/create?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/mcp/create"
        className="rounded-lg overflow-hidden cursor-pointer p-12 text-center relative group transition-all duration-300 "
      >
        <div className="flex flex-col items-center justify-center space-y-4 my-20">
          <h3 className="text-2xl md:text-4xl font-semibold flex items-center gap-3">
            <MCPIcon className="fill-foreground size-6 hidden sm:block" />
            {t("overviewTitle")}
          </h3>

          <p className="text-muted-foreground max-w-md">
            {t("overviewDescription")}
          </p>

          <div className="flex items-center gap-2 text-xl font-bold">
            {t("addMcpServer")}
            <ArrowUpRight className="size-6" />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {RECOMMENDED_MCPS.map((mcp) => (
            <Button
              key={mcp.name}
              variant={"secondary"}
              className="hover:translate-y-[-2px] transition-all duration-300"
              onClick={(e) => handleMcpClick(e, mcp)}
            >
              <mcp.icon />
              {mcp.label}
            </Button>
          ))}
        </div>
      </Link>
    </div>
  );
}
