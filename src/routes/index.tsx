import { Link, createFileRoute } from "@tanstack/react-router";
import { Brain, Settings, Zap } from "lucide-react";

function HomePage() {
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Superfill.ai Desktop</p>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground">
          Manage memories, configure BYOK providers, and launch Stagehand autofill
          from one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/memories"
          className="group flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Brain className="h-4 w-4" aria-hidden /> Memories
            </div>
            <span className="text-muted-foreground text-xs">Open</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Add, edit, and import the answers Stagehand will use to fill forms.
          </p>
        </Link>

        <Link
          to="/autofill"
          className="group flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Zap className="h-4 w-4" aria-hidden /> Autofill
            </div>
            <span className="text-muted-foreground text-xs">Open</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Launch Stagehand, detect fields, preview matches, and fill in one click.
          </p>
        </Link>

        <Link
          to="/settings"
          className="group flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Settings className="h-4 w-4" aria-hidden /> Settings
            </div>
            <span className="text-muted-foreground text-xs">Open</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect AI providers, set default models, and tune autofill behavior.
          </p>
        </Link>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
