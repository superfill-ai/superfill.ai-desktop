import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  CheckCircle2,
  Globe,
  Loader2,
  OctagonX,
  Play,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ipc } from "@/ipc/manager";
import type { AutofillResult, FieldMapping } from "@/types/autofill";

type RunState = "idle" | "running" | "done" | "error";

function AutofillPage() {
  const [url, setUrl] = useState("");
  const [runState, setRunState] = useState<RunState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<AutofillResult | null>(null);

  const isRunning = runState === "running";

  const handleStart = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      toast.error("Please enter a valid URL (e.g. https://example.com)");
      return;
    }

    setRunState("running");
    setStatusMessage("Starting autofill…");
    setResult(null);

    try {
      const res = await ipc.client.autofill.startAutofill({ url: trimmed });
      setResult(res);

      if (res.success) {
        const filled = res.mappings.filter(
          (m) => m.value !== null && m.confidence >= 0.35,
        ).length;
        setStatusMessage(
          `Completed — filled ${filled}/${res.mappings.length} fields in ${((res.processingTime ?? 0) / 1000).toFixed(1)}s`,
        );
        setRunState("done");
        toast.success(`Autofill complete — ${filled} fields filled`);
      } else {
        setStatusMessage(res.error ?? "Autofill failed");
        setRunState("error");
        toast.error(res.error ?? "Autofill failed");
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      setStatusMessage(msg);
      setRunState("error");
      toast.error(msg);
    }
  };

  const handleStop = async () => {
    try {
      await ipc.client.autofill.stopAutofill();
      setRunState("idle");
      setStatusMessage("Stopped");
      toast.info("Autofill stopped");
    } catch {
      /* best effort */
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Stagehand</p>
          <h1 className="text-2xl font-semibold">Autofill</h1>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="https://example.com/apply"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isRunning}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRunning) handleStart();
                }}
              />
            </div>
            {isRunning ? (
              <Button variant="destructive" onClick={handleStop}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button onClick={handleStart} disabled={!url.trim()}>
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {runState !== "idle" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {runState === "running" && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {runState === "done" && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {runState === "error" && (
                <OctagonX className="h-4 w-4 text-destructive" />
              )}
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
            {isRunning && (
              <Progress className="mt-3" value={undefined} />
            )}
          </CardContent>
        </Card>
      )}

      {result && result.mappings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              Field Mappings ({result.mappings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[100px]">Confidence</TableHead>
                    <TableHead>Reasoning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.mappings.map((mapping) => (
                    <MappingRow key={mapping.fieldOpid} mapping={mapping} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {runState === "idle" && !result && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Bot className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">
              Enter a URL above and click <strong>Start</strong> to launch
              Stagehand.
            </p>
            <p className="mt-1 text-xs">
              A Chromium window will open and the form will be filled
              automatically using your memories.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MappingRow({ mapping }: { mapping: FieldMapping }) {
  const confidencePercent = Math.round(mapping.confidence * 100);
  const variant: "default" | "secondary" | "destructive" | "outline" =
    confidencePercent >= 80
      ? "default"
      : confidencePercent >= 50
        ? "secondary"
        : confidencePercent >= 35
          ? "outline"
          : "destructive";

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{mapping.fieldOpid}</TableCell>
      <TableCell className="max-w-[200px] truncate text-sm">
        {mapping.value ?? (
          <span className="text-muted-foreground italic">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={variant}>{confidencePercent}%</Badge>
      </TableCell>
      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
        {mapping.reasoning}
      </TableCell>
    </TableRow>
  );
}

export const Route = createFileRoute("/autofill")({
  component: AutofillPage,
});
