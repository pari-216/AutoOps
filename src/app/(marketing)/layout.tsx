import { Navbar } from "@/components/navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background selection:bg-violet-500/15">
      <Navbar />

      {/* Ambient background decoration */}
      <div className="relative flex-1">
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-violet-200/35 blur-3xl" />
        <div className="pointer-events-none absolute top-48 right-[8%] size-80 rounded-full bg-purple-200/30 blur-3xl" />
        <div className="pointer-events-none absolute top-96 left-[6%] size-80 rounded-full bg-indigo-200/25 blur-3xl" />
        {children}
      </div>
    </div>
  );
}
