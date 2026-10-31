export default function CatalogSkeleton() {
  return (
    <div className="w-full h-dvh bg-skin-page flex flex-col justify-end overflow-hidden animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-white/[0.02]" />
      <div className="relative pb-20 px-7 space-y-4">
        <div className="h-10 w-40 bg-skin-text/10 rounded-sm" />
        <div className="h-6 w-56 bg-skin-text/10 rounded-sm" />
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-skin-text/5 rounded-sm border border-skin-bdr/10" />
          <div className="h-8 w-16 bg-skin-text/5 rounded-sm border border-skin-bdr/10" />
        </div>
      </div>
    </div>
  );
}
