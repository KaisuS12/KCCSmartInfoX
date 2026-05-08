function Skele({ className = '' }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />
}

export function SkeleStatCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <Skele className="w-10 h-10 rounded-xl" />
      </div>
      <Skele className="h-8 w-16 mb-2" />
      <Skele className="h-3 w-28" />
    </div>
  )
}

export function SkeleCard({ lines = 2, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm ${className}`}>
      <Skele className="h-4 w-3/4 mb-2" />
      {lines >= 2 && <Skele className="h-3 w-1/2 mb-1" />}
      {lines >= 3 && <Skele className="h-3 w-2/3" />}
    </div>
  )
}

export function SkeleListItem() {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <Skele className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skele className="h-4 w-full" />
        <Skele className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export function SkeleChartArea({ height = 200 }) {
  return <Skele className="w-full rounded-2xl" style={{ height }} />
}

export function SkeleSummaryCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm ${className}`}>
      <Skele className="h-8 w-12 mb-2" />
      <Skele className="h-3 w-20" />
    </div>
  )
}
