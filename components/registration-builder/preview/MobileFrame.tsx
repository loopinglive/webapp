export function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto" style={{ width: 390 }}>
      <div className="relative rounded-[40px] border-[10px] border-[#1E1E2E] bg-[#0A0A0F] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_40px_80px_-30px_rgba(0,0,0,0.9)]">
        {/* Notch */}
        <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-[#1E1E2E]" />
        <div
          className="overflow-y-auto rounded-[30px]"
          style={{ height: 844 - 20 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
