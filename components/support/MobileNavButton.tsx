import type { ReactNode } from "react";

export function MobileNavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" aria-current={active ? "page" : undefined} onClick={onClick} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "bg-[#edf7f2] text-[#006f7b]" : "text-[#69798b]"} [&_svg]:size-5`}>{icon}<span className="max-w-full break-words">{label}</span></button>;
}
