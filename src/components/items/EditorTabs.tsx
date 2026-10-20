import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EditorTabsProps {
  tabs: { value: string; label: string }[];
}

/**
 * The compact tab strip in an editor window header — Write / Preview,
 * Code / Explain, Original / Optimized. Must sit inside a `<Tabs>`.
 */
export function EditorTabs({ tabs }: EditorTabsProps) {
  return (
    <TabsList variant="line" className="h-6! p-0">
      {tabs.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value} className="px-2 text-xs">
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
