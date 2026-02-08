import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <TabsContent
          value="providers"
          className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-muted-foreground"
        >
          Provider key management coming next.
        </TabsContent>
        <TabsContent
          value="models"
          className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-muted-foreground"
        >
          Model selection coming next.
        </TabsContent>
        <TabsContent
          value="autofill"
          className="flex flex-1 items-center justify-center rounded-lg border border-dashed text-muted-foreground"
        >
          Autofill preferences coming next.
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
