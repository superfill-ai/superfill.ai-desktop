import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ipc } from "@/ipc/manager";
import type { AIProvider } from "@/lib/providers/registry";
import {
  AI_PROVIDERS,
  getProviderConfig,
  validateProviderKey,
} from "@/lib/providers/registry";
import type { AISettings } from "@/types/settings";
import { queryClient } from "@/lib/query";

export const PROVIDER_KEYS_QUERY_KEY = ["provider-keys"] as const;

export function useProviderKeyStatuses() {
  return useQuery({
    queryKey: PROVIDER_KEYS_QUERY_KEY,
    queryFn: async () => {
      const statuses: Record<string, boolean> = {};
      await Promise.all(
        AI_PROVIDERS.map(async (provider) => {
          const hasKey = await ipc.client.security.checkProviderKey({ provider });
          statuses[provider] = Boolean(hasKey);
        }),
      );

      return statuses;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveApiKeyWithModel() {
  return useMutation({
    mutationFn: async ({
      provider,
      key,
      defaultModel,
    }: {
      provider: AIProvider;
      key: string;
      defaultModel: string;
    }) => {
      const config = getProviderConfig(provider);

      if (config.requiresApiKey && !validateProviderKey(provider, key)) {
        throw new Error(`Invalid ${config.name} API key format`);
      }

      await ipc.client.security.saveProviderKey({ provider, apiKey: key });

      const currentSettings = await ipc.client.settings.readAISettings();
      const updatedModels = {
        ...currentSettings.selectedModels,
        [provider]: defaultModel,
      };
      const updatedSettings: AISettings = {
        ...currentSettings,
        selectedProvider: provider,
        selectedModels: updatedModels,
      };

      await ipc.client.settings.writeAISettings({ settings: updatedSettings });

      return { provider, key, defaultModel };
    },
    onSuccess: async ({ provider }) => {
      const config = getProviderConfig(provider);

      await queryClient.invalidateQueries({
        queryKey: PROVIDER_KEYS_QUERY_KEY,
      });

      await queryClient.invalidateQueries({ queryKey: ["models", provider] });

      toast.success(`${config.name} API key saved successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save API key");
    },
  });
}

export function useDeleteApiKey() {
  return useMutation({
    mutationFn: async (provider: AIProvider) => {
      await ipc.client.security.removeProviderKey({ provider });

      const settings = await ipc.client.settings.readAISettings();
      const updatedModels = { ...(settings.selectedModels || {}) };
      delete updatedModels[provider];

      const updatedSettings: AISettings = {
        ...settings,
        selectedModels: updatedModels,
        selectedProvider:
          settings.selectedProvider === provider
            ? undefined
            : settings.selectedProvider,
      };

      await ipc.client.settings.writeAISettings({ settings: updatedSettings });
      return provider;
    },
    onSuccess: async (provider) => {
      const config = getProviderConfig(provider);

      await queryClient.invalidateQueries({
        queryKey: PROVIDER_KEYS_QUERY_KEY,
      });

      await queryClient.invalidateQueries({ queryKey: ["models", provider] });

      toast.success(`${config.name} API key deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete API key");
    },
  });
}
