import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Settings, Zap } from "lucide-react";

function HomePage() {
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Superfill.ai Desktop</p>
        <h1 className="font-bold text-3xl">Welcome back</h1>
        <p className="text-muted-foreground">
          Manage memories, configure BYOK providers, and launch Stagehand
          autofill from one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          className="group flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          to="/memories"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Brain aria-hidden className="h-4 w-4" /> Memories
            </div>
            <span className="text-muted-foreground text-xs">Open</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Add, edit, and import the answers Stagehand will use to fill forms.
          </p>
        </Link>

        <Link
          className="group flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          to="/autofill"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Zap aria-hidden className="h-4 w-4" /> Autofill
            </div>
            <span className="text-muted-foreground text-xs">Open</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Launch Stagehand, detect fields, preview matches, and fill in one
            click.
          </p>
        </Link>

        <Link
          className="group flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          to="/settings"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Settings aria-hidden className="h-4 w-4" /> Settings
            </div>
            <span className="text-muted-foreground text-xs">Open</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Connect AI providers, set default models, and tune autofill
            behavior.
          </p>
        </Link>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
