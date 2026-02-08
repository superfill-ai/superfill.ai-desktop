import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, ShieldQuestion, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useProviderModels } from "@/hooks/use-models";
import {
  useDeleteApiKey,
  useProviderKeyStatuses,
  useSaveApiKeyWithModel,
} from "@/hooks/use-provider-keys";
import { ipc } from "@/ipc/manager";
import type { AIProvider } from "@/lib/providers/registry";
import {
  AI_PROVIDERS,
  getProviderConfig,
  validateProviderKey,
} from "@/lib/providers/registry";
import { queryClient } from "@/lib/query";
import type { AISettings } from "@/types/settings";

type ProviderFormState = Record<AIProvider, { key: string; model: string }>;

const getDefaultModel = (provider: AIProvider): string => {
  const defaults: Record<AIProvider, string> = {
    openai: "gpt-5-nano",
    anthropic: "claude-haiku-4-5-latest",
    groq: "llama-4-maverick",
    deepseek: "deepseek-v3",
    gemini: "gemini-2.5-flash",
    ollama: "llama3.2",
  };
  return defaults[provider];
};

function ProvidersPanel() {
  const { data: statuses, isLoading } = useProviderKeyStatuses();
  const saveKey = useSaveApiKeyWithModel();
  const deleteKey = useDeleteApiKey();

  const initialState = useMemo<ProviderFormState>(() => {
    return AI_PROVIDERS.reduce((acc, provider) => {
      acc[provider] = {
        key: "",
        model: getDefaultModel(provider),
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
          deleting={deleteKey.isPending}
          formValue={form[provider]}
          hasKey={Boolean(statuses?.[provider])}
          isLoading={isLoading}
          key={provider}
          onChange={handleChange}
          onDelete={async () => {
            await deleteKey.mutateAsync(provider);
            setForm((prev) => ({
              ...prev,
              [provider]: { key: "", model: getDefaultModel(provider) },
            }));
          }}
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
          provider={provider}
          saving={saveKey.isPending}
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
  onChange: (
    provider: AIProvider,
    field: "key" | "model",
    value: string,
  ) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const config = getProviderConfig(provider);
  const { data: models, isLoading: loadingModels } =
    useProviderModels(provider);

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
          {!config.requiresApiKey && (
            <span className="text-muted-foreground text-xs">Local</span>
          )}
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.requiresApiKey ? (
          <div className="space-y-2">
            <Label htmlFor={`${provider}-key`}>API key</Label>
            <Input
              disabled={isLoading}
              id={`${provider}-key`}
              onChange={(e) => onChange(provider, "key", e.target.value)}
              placeholder={config.keyPlaceholder}
              value={formValue.key}
            />
            <p className="text-muted-foreground text-xs">
              {hasKey ? "Key saved" : "No key saved"}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3 text-muted-foreground text-sm">
            <ShieldQuestion className="h-4 w-4" />
            No API key needed. Ensure Ollama is running locally.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`${provider}-model`}>Default model</Label>
          <Select
            onValueChange={(value) => onChange(provider, "model", value)}
            value={formValue.model}
          >
            <SelectTrigger id={`${provider}-model`}>
              <SelectValue
                placeholder={
                  loadingModels ? "Loading models..." : "Select a model"
                }
              />
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
            disabled={saveDisabled(config, formValue) || saving}
            onClick={() => {
              onSave().catch(() => undefined);
            }}
          >
            {isLoading || loadingModels || saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save
          </Button>
          {hasKey && (
            <Button
              className="text-destructive"
              disabled={deleting}
              onClick={() => {
                onDelete().catch(() => undefined);
              }}
              variant="ghost"
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

function saveDisabled(
  config: ReturnType<typeof getProviderConfig>,
  formValue: { key: string; model: string },
) {
  if (!formValue.model) {
    return true;
  }
  if (!config.requiresApiKey) {
    return false;
  }
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
          <CardContent className="space-y-3 text-muted-foreground text-sm">
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
        <div className="flex flex-col rounded-md border p-3" key={model.id}>
          <span className="font-medium">{model.name}</span>
          <span className="text-muted-foreground text-xs">{model.id}</span>
        </div>
      ))}
    </div>
  );
}

function AutofillPanel() {
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
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] }),
    onError: (error: Error) =>
      toast.error(error.message || "Failed to save settings"),
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
          <CardDescription>
            Control how Superfill injects memories into forms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable autofill</p>
              <p className="text-muted-foreground text-sm">
                Allow memories to populate form fields automatically.
              </p>
            </div>
            <Switch
              checked={settings.autoFillEnabled}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ autoFillEnabled: checked })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Autopilot mode</p>
              <p className="text-muted-foreground text-sm">
                Fill confidently on trusted sites without prompts.
              </p>
            </div>
            <Switch
              checked={settings.autopilotMode}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ autopilotMode: checked })
              }
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Confidence threshold</p>
                <p className="text-muted-foreground text-sm">
                  Minimum match score before autofill occurs.
                </p>
              </div>
              <span className="font-semibold text-sm">
                {Math.round(settings.confidenceThreshold * 100)}%
              </span>
            </div>
            <Slider
              max={1}
              min={0}
              onValueChange={([value]) =>
                updateSettings.mutate({ confidenceThreshold: value })
              }
              step={0.05}
              value={[settings.confidenceThreshold]}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Context menu</p>
              <p className="text-muted-foreground text-sm">
                Show Superfill in right-click menus.
              </p>
            </div>
            <Switch
              checked={settings.contextMenuEnabled}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ contextMenuEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Document site-specific rules or exceptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="resize-none"
            disabled
            placeholder="e.g. Disable autopilot on banking sites; prefer work email on corporate domains."
            rows={10}
          />
          <p className="mt-2 text-muted-foreground text-xs">
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
        <p className="text-muted-foreground text-sm">Configuration</p>
        <h1 className="font-semibold text-2xl">Settings</h1>
      </div>
      <Tabs className="flex flex-1 flex-col" defaultValue="providers">
        <TabsList className="w-fit">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="autofill">Autofill</TabsTrigger>
        </TabsList>
        <TabsContent className="flex-1" value="providers">
          <ProvidersPanel />
        </TabsContent>
        <TabsContent className="flex-1" value="models">
          <ModelsPanel />
        </TabsContent>
        <TabsContent className="flex-1" value="autofill">
          <AutofillPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
