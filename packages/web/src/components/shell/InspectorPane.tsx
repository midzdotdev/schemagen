import { CircleAlert, History, Settings2 } from "lucide-react";
import { useValidation } from "@/hooks/useValidation";
import { useStore } from "@/state/store";
import { HistoryPanel } from "../history/HistoryPanel";
import { Inspector } from "../inspector/Inspector";
import { MismatchPanel } from "../mismatch-panel/MismatchPanel";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function InspectorPane() {
  const { mismatches } = useValidation();
  const historyCount = useStore((s) => s.history.entries.length);

  return (
    <Tabs defaultValue="inspector" className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center border-b border-border bg-muted/30 px-3">
        <TabsList className="h-8">
          <TabsTrigger value="inspector" className="gap-1.5">
            <Settings2 className="size-3" />
            Inspect
          </TabsTrigger>
          <TabsTrigger value="mismatches" className="gap-1.5">
            <CircleAlert className="size-3" />
            Mismatches
            {mismatches.length > 0 && (
              <Badge variant="destructive" className="ml-0.5 h-4 px-1 normal-case">
                {mismatches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="size-3" />
            History
            {historyCount > 0 && (
              <Badge variant="muted" className="ml-0.5 h-4 px-1 normal-case">
                {historyCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="inspector" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <Inspector />
      </TabsContent>
      <TabsContent value="mismatches" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <MismatchPanel />
      </TabsContent>
      <TabsContent value="history" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        <HistoryPanel />
      </TabsContent>
    </Tabs>
  );
}
