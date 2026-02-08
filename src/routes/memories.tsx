import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

function MemoriesPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Knowledge base</p>
          <h1 className="text-2xl font-semibold">Memories</h1>
        </div>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add memory
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Memory list and editor coming next.
      </div>
    </div>
  );
}

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
});
