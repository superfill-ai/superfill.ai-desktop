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
import { useState } from "react";
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
import type {
  AutofillResult,
  FilledField,
} from "@/lib/autofill/stagehand-engine";

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
      const res = (await ipc.client.autofill.startAutofill({
        url: trimmed,
      })) as AutofillResult;
      setResult(res);

      if (res.success) {
        const count = res.filledFields.length;
        setStatusMessage(
          `Completed — filled ${count} of ${res.totalFieldsFound} fields in ${((res.processingTime ?? 0) / 1000).toFixed(1)}s`
        );
        setRunState("done");
        toast.success(`Autofill complete — ${count} fields filled`);
      } else {
        setStatusMessage(res.error ?? "Autofill failed");
        setRunState("error");
        toast.error(res.error ?? "Autofill failed");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
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
          <p className="text-muted-foreground text-sm">Stagehand</p>
          <h1 className="font-semibold text-2xl">Autofill</h1>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                disabled={isRunning}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isRunning) {
                    handleStart();
                  }
                }}
                placeholder="https://example.com/apply"
                value={url}
              />
            </div>
            {isRunning ? (
              <Button onClick={handleStop} variant="destructive">
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button disabled={!url.trim()} onClick={handleStart}>
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
            <p className="text-muted-foreground text-sm">{statusMessage}</p>
            {isRunning && <Progress className="mt-3" value={undefined} />}
          </CardContent>
        </Card>
      )}

      {result && result.filledFields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              Filled Fields ({result.filledFields.length} of{" "}
              {result.totalFieldsFound})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.filledFields.map((field, idx) => (
                    <FieldRow field={field} key={`${field.label}-${idx}`} />
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
              Superfill.ai.
            </p>
            <p className="mt-1 text-xs">
              Your browser will open with a persistent profile so logins and
              cookies carry over between sessions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ field }: { field: FilledField }) {
  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{field.label}</TableCell>
      <TableCell className="max-w-[250px] truncate text-sm">
        {field.value}
      </TableCell>
      <TableCell>
        {field.fieldType && (
          <Badge variant="secondary">{field.fieldType}</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

export const Route = createFileRoute("/autofill")({
  component: AutofillPage,
});
