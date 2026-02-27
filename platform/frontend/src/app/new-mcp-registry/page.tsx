"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Users,
  Building2,
  MessageSquare,
  CheckCircle2,
  Circle,
  Pencil,
  Bot,
  Network,
} from "lucide-react";

type SharingLevel = "personal" | "team" | "organization";
type AuthLevel = "personal" | "team" | "organization";

interface McpRegistryItem {
  id: string;
  name: string;
  description: string;
  sharingLevel: SharingLevel;
  auth: {
    personal: boolean;
    teams: string[];
    organization: boolean;
  };
  disabledAuth?: AuthLevel[];
}

const DEMO_DATA: McpRegistryItem[] = [
  {
    id: "jira",
    name: "Jira",
    description:
      "Track issues, manage sprints, and collaborate on projects.",
    sharingLevel: "personal",
    auth: { personal: true, teams: [], organization: false },
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Access repositories, pull requests, and code reviews.",
    sharingLevel: "personal",
    auth: { personal: false, teams: [], organization: false },
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    description:
      "Manage on-call schedules, incidents, and alerting.",
    sharingLevel: "team",
    auth: { personal: false, teams: ["Infra"], organization: false },
  },
  {
    id: "datadog",
    name: "Datadog",
    description:
      "Monitor infrastructure metrics, logs, and performance.",
    sharingLevel: "team",
    auth: { personal: true, teams: ["Infra", "Dev"], organization: false },
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Send messages, search conversations, and manage channels.",
    sharingLevel: "organization",
    auth: { personal: false, teams: [], organization: true },
    disabledAuth: ["team", "organization"],
  },
  {
    id: "confluence",
    name: "Confluence",
    description:
      "Search and create documentation and knowledge base articles.",
    sharingLevel: "organization",
    auth: { personal: false, teams: ["Engineering"], organization: true },
  },
];

const SECTIONS: {
  level: SharingLevel;
  title: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    level: "personal",
    title: "Personal",
    description: "Only visible to you",
    icon: User,
  },
  {
    level: "team",
    title: "Team",
    description: "Shared with team members",
    icon: Users,
  },
  {
    level: "organization",
    title: "Organization",
    description: "Available org-wide",
    icon: Building2,
  },
];

function getHighlightedAuth(auth: McpRegistryItem["auth"]): AuthLevel | null {
  if (auth.personal) return "personal";
  if (auth.teams.length > 0) return "team";
  if (auth.organization) return "organization";
  return null;
}

function getVisibleAuthLevels(sharingLevel: SharingLevel): AuthLevel[] {
  switch (sharingLevel) {
    case "personal":
      return ["personal"];
    case "team":
      return ["personal", "team"];
    case "organization":
      return ["personal", "team", "organization"];
  }
}

function isConfigured(auth: McpRegistryItem["auth"], level: AuthLevel): boolean {
  switch (level) {
    case "personal":
      return auth.personal;
    case "team":
      return auth.teams.length > 0;
    case "organization":
      return auth.organization;
  }
}

const AUTH_ROW_CONFIG: Record<
  AuthLevel,
  { label: string; action: string }
> = {
  personal: { label: "Personal", action: "Authenticate" },
  team: { label: "Team", action: "Share your auth with a team" },
  organization: { label: "Org", action: "Share with org" },
};

function AuthRow({
  level,
  configured,
  highlighted,
  disabled,
  promptPersonalAuth,
  teams,
}: {
  level: AuthLevel;
  configured: boolean;
  highlighted: boolean;
  disabled?: boolean;
  promptPersonalAuth?: boolean;
  teams?: string[];
}) {
  const config = AUTH_ROW_CONFIG[level];
  const Icon = configured && !disabled ? CheckCircle2 : Circle;

  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 rounded-md ${
        disabled
          ? "opacity-40"
          : highlighted
            ? "border-l-2 border-emerald-500 bg-emerald-500/5"
            : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-3.5 w-3.5 ${
            disabled
              ? "text-muted-foreground/30"
              : configured
                ? "text-emerald-500"
                : "text-muted-foreground/30"
          }`}
        />
        <span
          className={`text-xs ${
            disabled
              ? "text-muted-foreground line-through"
              : configured
                ? "text-foreground"
                : "text-muted-foreground/50"
          }`}
        >
          {config.label}
        </span>
        {level === "team" && teams && teams.length > 0 && (
          <div className="flex items-center gap-1">
            {teams.map((team) => (
              <Badge
                key={team}
                variant="secondary"
                className="text-[10px] font-normal px-1.5 py-0 h-[18px]"
              >
                {team}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {disabled ? (
        <span className="text-[11px] text-muted-foreground/50">
          Disabled by admin
        </span>
      ) : (
        <>
          {configured && level === "personal" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground"
            >
              Revoke
            </Button>
          )}
          {(!configured || level === "team") && (
            <Button
              variant={promptPersonalAuth && level === "personal" ? "outline" : "ghost"}
              size="sm"
              className={`h-6 px-2 text-[11px] ${
                promptPersonalAuth && level === "personal"
                  ? "text-emerald-600 border-emerald-500 hover:bg-emerald-500/10"
                  : "text-muted-foreground"
              }`}
            >
              {config.action}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function McpTile({ item }: { item: McpRegistryItem }) {
  const highlighted = getHighlightedAuth(item.auth);
  const visibleLevels = getVisibleAuthLevels(item.sharingLevel);
  const disabledAuth = item.disabledAuth ?? [];
  const hasUsableAuth = visibleLevels.some(
    (l) => isConfigured(item.auth, l) && !disabledAuth.includes(l),
  );

  return (
    <Card className="group relative flex flex-col gap-0 py-0 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/80">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">
            {item.name}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {visibleLevels.map((level) => (
            <AuthRow
              key={level}
              level={level}
              configured={isConfigured(item.auth, level)}
              highlighted={highlighted === level}
              disabled={item.disabledAuth?.includes(level)}
              promptPersonalAuth={!hasUsableAuth}
              teams={level === "team" ? item.auth.teams : undefined}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            disabled={!hasUsableAuth}
          >
            <MessageSquare className="h-3 w-3" />
            Chat with {item.name}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground"
          >
            <Bot className="h-3 w-3" />
            Assign to Agents (3)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground"
          >
            <Network className="h-3 w-3" />
            Assign to MCP Gateways (0)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NewMcpRegistryPage() {
  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 space-y-8">
      {SECTIONS.map((section, idx) => {
        const items = DEMO_DATA.filter(
          (d) => d.sharingLevel === section.level,
        );
        const Icon = section.icon;

        return (
          <section key={section.level}>
            {idx > 0 && <Separator className="mb-8" />}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/80">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  {section.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {items.length}
                  </span>
                </h2>
                <p className="text-[11px] text-muted-foreground/70">
                  {section.description}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <McpTile key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
