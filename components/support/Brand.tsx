import { FileCheck2 } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3">
    <span className={`${compact ? "size-9" : "size-10"} grid shrink-0 place-items-center rounded-md bg-[#006f7b] text-white`}><FileCheck2 className={compact ? "size-5" : "size-6"} /></span>
    <div><p className={`${compact ? "text-base" : "text-lg"} font-bold leading-tight text-[#173256]`}>Water Support</p>{!compact && <p className="text-xs font-medium text-[#607084]">Without barriers</p>}</div>
  </div>;
}