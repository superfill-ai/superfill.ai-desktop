import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldQuestion, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ipc } from "@/ipc/manager";
import { useDefaultModel, useProviderModels } from "@/hooks/use-models";
import {
  useDeleteApiKey,
  useProviderKeyStatuses,
  useSaveApiKeyWithModel,
} from "@/hooks/use-provider-keys";
import {
  AI_PROVIDERS,
  getProviderConfig,
  validateProviderKey,
} from "@/lib/providers/registry";
import type { AIProvider } from "@/lib/providers/registry";
import type { AISettings } from "@/types/settings";

type ProviderFormState = Record<AIProvider, { key: string; model: string }>;

function ProvidersPanel() {
  const { data: statuses, isLoading } = useProviderKeyStatuses();
  const saveKey = useSaveApiKeyWithModel();
  const deleteKey = useDeleteApiKey();

  const initialState = useMemo<ProviderFormState>(() => {
    return AI_PROVIDERS.reduce((acc, provider) => {
      acc[provider] = {
        key: "",
        model: useDefaultModel(provider),
      };
      return acc;
    }, {} as ProviderFormState);
  }, []);

  const [form, setForm] = useState<ProviderFormState>(initialState);

  const handleChange = (
    provider: AIProvider,
    field: "key" | "model",
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {AI_PROVIDERS.map((provider) => (
        <ProviderCard
          key={provider}
          provider={provider}
          hasKey={Boolean(statuses?.[provider])}
          isLoading={isLoading}
          saving={saveKey.isPending}
          deleting={deleteKey.isPending}
          formValue={form[provider]}
          onChange={handleChange}
          onSave={async () => {
            const config = getProviderConfig(provider);
            const { key, model } = form[provider];

            if (config.requiresApiKey && !validateProviderKey(provider, key)) {
              toast.error(`Invalid ${config.name} API key format`);
              return;
            }

            await saveKey.mutateAsync({
              provider,
              key,
              defaultModel: model,
            });
          }}
          onDelete={async () => {
            await deleteKey.mutateAsync(provider);
            setForm((prev) => ({
              ...prev,
              [provider]: { key: "", model: useDefaultModel(provider) },
            }));
          }}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  hasKey,
  isLoading,
  saving,
  deleting,
  formValue,
  onChange,
  onSave,
  onDelete,
}: {
  provider: AIProvider;
  hasKey: boolean;
  isLoading: boolean;
  saving: boolean;
  deleting: boolean;
  formValue: { key: string; model: string };
  onChange: (provider: AIProvider, field: "key" | "model", value: string) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const config = getProviderConfig(provider);
  const { data: models, isLoading: loadingModels } = useProviderModels(provider);

  useEffect(() => {
    if (models && models.length > 0 && !formValue.model) {
      onChange(provider, "model", models[0].id);
    }
  }, [models, formValue.model, onChange, provider]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {config.name}
          {!config.requiresApiKey && <span className="text-xs text-muted-foreground">Local</span>}
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.requiresApiKey ? (
          <div className="space-y-2">
            <Label htmlFor={`${provider}-key`}>API key</Label>
            <Input
              id={`${provider}-key`}
              placeholder={config.keyPlaceholder}
              value={formValue.key}
              onChange={(e) => onChange(provider, "key", e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {hasKey ? "Key saved" : "No key saved"}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            <ShieldQuestion className="h-4 w-4" />
            No API key needed. Ensure Ollama is running locally.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`${provider}-model`}>Default model</Label>
          <Select
            value={formValue.model}
            onValueChange={(value) => onChange(provider, "model", value)}
          >
            <SelectTrigger id={`${provider}-model`}>
              <SelectValue placeholder={loadingModels ? "Loading models..." : "Select a model"} />
            </SelectTrigger>
            <SelectContent>
              {(models || []).map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              void onSave().catch(() => undefined);
            }}
            disabled={saveDisabled(config, formValue) || saving}
          >
            {isLoading || loadingModels || saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save
          </Button>
          {hasKey && (
            <Button
              variant="ghost"
              onClick={() => {
                void onDelete().catch(() => undefined);
              }}
              disabled={deleting}
              className="text-destructive"
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete key
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function saveDisabled(config: ReturnType<typeof getProviderConfig>, formValue: { key: string; model: string }) {
  if (!formValue.model) return true;
  if (!config.requiresApiKey) return false;
  return !validateProviderKey(config.id as AIProvider, formValue.key);
}

function ModelsPanel() {
  const descriptions = useMemo(
    () => ({
      openai: "GPT-5 Nano, GPT-4.1, o series",
      anthropic: "Claude 4.1 family",
      groq: "Groq-hosted Llama and Mixtral",
      deepseek: "DeepSeek models for coding and chat",
      gemini: "Gemini 2.5 family",
      ollama: "Local models via Ollama",
    }),
    [],
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {AI_PROVIDERS.map((provider) => (
        <Card key={provider}>
          <CardHeader>
            <CardTitle>{getProviderConfig(provider).name}</CardTitle>
            <CardDescription>{descriptions[provider]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ModelList provider={provider} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ModelList({ provider }: { provider: AIProvider }) {
  const { data: models, isLoading, isError } = useProviderModels(provider);

  if (isLoading) {
    return <p>Loading models…</p>;
  }

  if (isError || !models) {
    return <p className="text-destructive">Failed to load models.</p>;
  }

  return (
    <div className="space-y-2">
      {models.map((model) => (
        <div key={model.id} className="flex flex-col rounded-md border p-3">
          <span className="font-medium">{model.name}</span>
          <span className="text-xs text-muted-foreground">{model.id}</span>
        </div>
      ))}
    </div>
  );
}

function AutofillPanel() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => ipc.client.settings.readAISettings(),
    staleTime: 1000 * 60 * 5,
  });

  const updateSettings = useMutation({
    mutationFn: async (partial: Partial<AISettings>) => {
      const current = await ipc.client.settings.readAISettings();
      const next: AISettings = { ...current, ...partial };
      await ipc.client.settings.writeAISettings({ settings: next });
      return next;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-settings"] }),
    onError: (error: Error) => toast.error(error.message || "Failed to save settings"),
  });

  if (isLoading || !settings) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Autofill</CardTitle>
          <CardDescription>Control how Superfill injects memories into forms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable autofill</p>
              <p className="text-sm text-muted-foreground">Allow memories to populate form fields automatically.</p>
            </div>
            <Switch
              checked={settings.autoFillEnabled}
              onCheckedChange={(checked) => updateSettings.mutate({ autoFillEnabled: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Autopilot mode</p>
              <p className="text-sm text-muted-foreground">Fill confidently on trusted sites without prompts.</p>
            </div>
            <Switch
              checked={settings.autopilotMode}
              onCheckedChange={(checked) => updateSettings.mutate({ autopilotMode: checked })}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Confidence threshold</p>
                <p className="text-sm text-muted-foreground">Minimum match score before autofill occurs.</p>
              </div>
              <span className="text-sm font-semibold">{Math.round(settings.confidenceThreshold * 100)}%</span>
            </div>
            <Slider
              value={[settings.confidenceThreshold]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([value]) => updateSettings.mutate({ confidenceThreshold: value })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Context menu</p>
              <p className="text-sm text-muted-foreground">Show Superfill in right-click menus.</p>
            </div>
            <Switch
              checked={settings.contextMenuEnabled}
              onCheckedChange={(checked) => updateSettings.mutate({ contextMenuEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Document site-specific rules or exceptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g. Disable autopilot on banking sites; prefer work email on corporate domains."
            rows={10}
            className="resize-none"
            disabled
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Notes sync is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Configuration</p>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>
      <Tabs defaultValue="providers" className="flex flex-1 flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="autofill">Autofill</TabsTrigger>
        </TabsList>
        <TabsContent value="providers" className="flex-1">
          <ProvidersPanel />
        </TabsContent>
        <TabsContent value="models" className="flex-1">
          <ModelsPanel />
        </TabsContent>
        <TabsContent value="autofill" className="flex-1">
          <AutofillPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
