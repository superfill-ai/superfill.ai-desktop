import { QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import DragWindowRegion from "@/components/drag-window-region";
import NavigationMenu from "@/components/navigation-menu";
import { APP_NAME } from "@/constants";
import { queryClient } from "@/lib/query";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <DragWindowRegion title={APP_NAME} />
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-64 border-r bg-muted/40">
            <NavigationMenu />
          </aside>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
