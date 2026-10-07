"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const defaults = { largeText: false, contrast: false, calm: false };
export function DisplaySettings() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem("water-support-display") ?? "null"); if (stored && Object.values(stored).every(value => typeof value === "boolean")) {
      // Browser-only preferences are hydrated after SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings({ largeText: stored.largeText === true, contrast: stored.contrast === true, calm: stored.calm === true });
    } } catch { /* Defaults remain usable when preferences cannot be read. */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.largeText = String(settings.largeText);
    document.documentElement.dataset.contrast = String(settings.contrast);
    document.documentElement.dataset.calm = String(settings.calm);
    if (loaded) { try { localStorage.setItem("water-support-display", JSON.stringify(settings)); } catch { /* Display controls still work for this session. */ } }
  }, [settings, loaded]);
  return <><Button variant="ghost" className="rounded-xl text-[#506772]" onClick={() => setOpen(true)} aria-label="Display and accessibility settings"><SlidersHorizontal className="size-4" /><span className="hidden sm:inline">Display</span></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Make this space work for you</DialogTitle><DialogDescription>Adjust the display to suit your reading preferences. These settings stay in this browser.</DialogDescription></DialogHeader><div className="space-y-3 pt-3">{[{ key: "largeText", title: "Larger text", text: "A little more room to read." }, { key: "contrast", title: "Stronger contrast", text: "Darker text and clearer card edges." }, { key: "calm", title: "Reduce visual motion", text: "Keep transitions and animations quiet." }].map(item => <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><p className="font-semibold">{item.title}</p><p className="mt-1 text-sm text-[#71828b]">{item.text}</p></div><Switch checked={settings[item.key as keyof typeof settings]} aria-label={item.title} onCheckedChange={checked => setSettings(current => ({ ...current, [item.key]: checked }))} /></div>)}</div></DialogContent></Dialog></>;
}
