import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function AutofillPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Stagehand</p>
          <h1 className="text-2xl font-semibold">Autofill</h1>
        </div>
      </div>
      <div className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm">
        <label className="space-y-2">
          <span className="text-sm text-muted-foreground">Target URL</span>
          <div className="flex gap-2">
            <Input placeholder="https://example.com/form" />
            <Button>Start</Button>
          </div>
        </label>
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          Stagehand-powered detection, matching, and filling will appear here.
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/autofill")({
  component: AutofillPage,
});
