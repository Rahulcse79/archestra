"use client";

import { PageLayout } from "@/components/page-layout";

export default function NewMcpRegistryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageLayout title="New MCP Registry">{children}</PageLayout>
  );
}
