import type { ReactNode } from "react";
export function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button type="button" aria-current={active ? "page" : undefined} onClick={onClick} className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition ${active ? "bg-[#e9f5f7] text-[#006f7b]" : "text-[#536477] hover:bg-[#f1f5f7]"}`}>
    <span className="[&_svg]:size-5">{icon}</span><span>{label}</span>
    {count !== undefined && <span className="ml-auto rounded-full bg-[#dbe7ec] px-2 py-0.5 text-xs text-[#42566a]">{count}</span>}
  </button>;
}
