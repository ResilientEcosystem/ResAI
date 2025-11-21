"use client";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroupContent } from "ui/sidebar";

import { SidebarGroup } from "ui/sidebar";
import Link from "next/link";
import { getShortcutKeyList, Shortcuts } from "lib/keyboard-shortcuts";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MCPIcon } from "ui/mcp-icon";
import { WriteIcon } from "ui/write-icon";
import {
  FolderOpenIcon,
  FolderSearchIcon,
  PlusIcon,
  Waypoints,
  LucideIcon,
} from "lucide-react";
import { useCallback, useMemo, useState, ReactNode } from "react";
import { Skeleton } from "ui/skeleton";
import { useArchives } from "@/hooks/queries/use-archives";
import { ArchiveDialog } from "../archive-dialog";
import { getIsUserAdmin } from "lib/user/utils";
import { BasicUser } from "app-types/user";
import { AppSidebarAdmin } from "./app-sidebar-menu-admin";
import { SIDEBAR_CONFIG } from "lib/const";

type SidebarMenuItemType =
  | "link"
  | "action"
  | "custom"
  | "archive"
  | "admin";

type SidebarMenuItemConfig = {
  id: string;
  type: SidebarMenuItemType;
  label: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  href?: string;
  visible?: boolean | ((user?: BasicUser) => boolean);
  render?: (props: {
    user?: BasicUser;
    router: ReturnType<typeof useRouter>;
    t: ReturnType<typeof useTranslations>;
    setOpenMobile: ReturnType<typeof useSidebar>["setOpenMobile"];
  }) => ReactNode;
  className?: string;
  shortcutKeys?: string[];
};

function NewChatMenuItem({
  user,
  router,
  t,
  setOpenMobile,
}: {
  user?: BasicUser;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useTranslations>;
  setOpenMobile: ReturnType<typeof useSidebar>["setOpenMobile"];
}) {
  return (
    <SidebarMenuItem className="mb-1">
      <Link
        href="/"
        onClick={(e) => {
          e.preventDefault();
          setOpenMobile(false);
          router.push(`/`);
          router.refresh();
        }}
      >
        <SidebarMenuButton className="flex font-semibold group/new-chat bg-input/20 border border-border/40">
          <WriteIcon className="size-4" />
          {t("Layout.newChat")}
          <div className="flex items-center gap-1 text-xs font-medium ml-auto opacity-0 group-hover/new-chat:opacity-100 transition-opacity">
            {getShortcutKeyList(Shortcuts.openNewChat).map((key) => (
              <span
                key={key}
                className="border w-5 h-5 flex items-center justify-center bg-accent rounded"
              >
                {key}
              </span>
            ))}
          </div>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
}

function ArchiveMenuItem({
  user,
  router,
  t,
  setOpenMobile,
  expandedArchive,
  toggleArchive,
  setAddArchiveDialogOpen,
  archives,
  isLoadingArchives,
}: {
  user?: BasicUser;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useTranslations>;
  setOpenMobile: ReturnType<typeof useSidebar>["setOpenMobile"];
  expandedArchive: boolean;
  toggleArchive: () => void;
  setAddArchiveDialogOpen: (open: boolean) => void;
  archives: Array<{ id: string; name: string }> | undefined;
  isLoadingArchives: boolean;
}) {
  return (
    <SidebarMenu className="group/archive">
      <Tooltip>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={toggleArchive}
            className="font-semibold"
          >
            {expandedArchive ? (
              <FolderOpenIcon className="size-4" />
            ) : (
              <FolderSearchIcon className="size-4" />
            )}
            {t("Archive.title")}
          </SidebarMenuButton>
          <SidebarMenuAction
            className="group-hover/archive:opacity-100 opacity-0 transition-opacity"
            onClick={() => setAddArchiveDialogOpen(true)}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PlusIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {t("Archive.addArchive")}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuAction>
        </SidebarMenuItem>
      </Tooltip>
      {expandedArchive && (
        <>
          <SidebarMenuSub>
            {isLoadingArchives ? (
              <div className="gap-2 flex flex-col">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-full" />
                ))}
              </div>
            ) : archives!.length === 0 ? (
              <SidebarMenuSubItem>
                <SidebarMenuSubButton className="text-muted-foreground">
                  {t("Archive.noArchives")}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ) : (
              archives!.map((archive) => (
                <SidebarMenuSubItem
                  onClick={() => {
                    router.push(`/archive/${archive.id}`);
                  }}
                  key={archive.id}
                  className="cursor-pointer"
                >
                  <SidebarMenuSubButton>{archive.name}</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))
            )}
          </SidebarMenuSub>
        </>
      )}
    </SidebarMenu>
  );
}

export function AppSidebarMenus({ user }: { user?: BasicUser }) {
  const router = useRouter();
  const t = useTranslations("");
  const { setOpenMobile } = useSidebar();
  const [expandedArchive, setExpandedArchive] = useState(false);
  const [addArchiveDialogOpen, setAddArchiveDialogOpen] = useState(false);

  const { data: archives, isLoading: isLoadingArchives } = useArchives();
  const toggleArchive = useCallback(() => {
    setExpandedArchive((prev) => !prev);
  }, []);

  const sidebarMenuItems: SidebarMenuItemConfig[] = useMemo(
    () => [
      {
        id: "new-chat",
        type: "custom",
        label: t("Layout.newChat"),
        icon: WriteIcon,
        visible: SIDEBAR_CONFIG.showNewChat,
        render: ({ router, t, setOpenMobile }) => (
          <SidebarMenu key="new-chat">
            <Tooltip>
              <NewChatMenuItem
                user={user}
                router={router}
                t={t}
                setOpenMobile={setOpenMobile}
              />
            </Tooltip>
          </SidebarMenu>
        ),
      },
      {
        id: "mcp",
        type: "link",
        label: t("Layout.mcpConfiguration"),
        icon: MCPIcon,
        href: "/mcp",
        visible: SIDEBAR_CONFIG.showMCP,
      },
      {
        id: "workflow",
        type: "link",
        label: t("Layout.workflow"),
        icon: Waypoints,
        href: "/workflow",
        visible: SIDEBAR_CONFIG.showWorkflow,
      },
      {
        id: "admin",
        type: "admin",
        label: "",
        icon: Waypoints,
        visible: SIDEBAR_CONFIG.showAdmin && getIsUserAdmin(user),
        render: () => <AppSidebarAdmin key="admin" />,
      },
      {
        id: "archive",
        type: "archive",
        label: t("Archive.title"),
        icon: FolderSearchIcon,
        visible: SIDEBAR_CONFIG.showArchive,
        render: () => (
          <ArchiveMenuItem
            key="archive"
            user={user}
            router={router}
            t={t}
            setOpenMobile={setOpenMobile}
            expandedArchive={expandedArchive}
            toggleArchive={toggleArchive}
            setAddArchiveDialogOpen={setAddArchiveDialogOpen}
            archives={archives}
            isLoadingArchives={isLoadingArchives}
          />
        ),
      },
    ],
    [
      t,
      user,
      router,
      setOpenMobile,
      expandedArchive,
      toggleArchive,
      setAddArchiveDialogOpen,
      archives,
      isLoadingArchives,
    ],
  );

  const visibleMenuItems = useMemo(
    () =>
      sidebarMenuItems.filter((item) => {
        if (item.visible === false) return false;
        if (item.visible === true) return true;
        if (typeof item.visible === "function") return item.visible(user);
        return true;
      }),
    [sidebarMenuItems, user],
  );

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        {visibleMenuItems.map((item) => {
          if (item.render) {
            return item.render({
              user,
              router,
              t,
              setOpenMobile,
            });
          }

          if (item.type === "link" && item.href) {
            const Icon = item.icon;
            return (
              <SidebarMenu key={item.id}>
                <Tooltip>
                  <SidebarMenuItem>
                    <Link href={item.href}>
                      <SidebarMenuButton className={item.className || "font-semibold"}>
                        {item.id === "mcp" ? (
                          <MCPIcon className="size-4 fill-accent-foreground" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                        {item.label}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                </Tooltip>
              </SidebarMenu>
            );
          }

          return null;
        })}
      </SidebarGroupContent>
      <ArchiveDialog
        open={addArchiveDialogOpen}
        onOpenChange={setAddArchiveDialogOpen}
      />
    </SidebarGroup>
  );
}
