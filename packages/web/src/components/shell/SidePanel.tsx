import { Inspector } from "../inspector/Inspector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function SidePanel() {
  return (
    <Tabs defaultValue="inspector" className="flex h-full flex-col">
      <TabsList className="px-3">
        <TabsTrigger value="inspector">Inspector</TabsTrigger>
        <TabsTrigger value="mismatches">Mismatches</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="inspector" className="flex-1 overflow-y-auto">
        <Inspector />
      </TabsContent>
      <TabsContent value="mismatches" className="flex-1 overflow-y-auto">
        <div className="p-4 text-sm text-[--color-muted-foreground]">
          Mismatches will appear here (Phase W5).
        </div>
      </TabsContent>
      <TabsContent value="history" className="flex-1 overflow-y-auto">
        <div className="p-4 text-sm text-[--color-muted-foreground]">
          History will appear here (Phase W6).
        </div>
      </TabsContent>
    </Tabs>
  );
}
