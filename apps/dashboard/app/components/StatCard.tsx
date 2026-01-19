/**
 * StatCard Component
 * Display a metric with title and value
 */

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatCard({ title, value, description, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span className={`text-sm font-semibold ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      )}
    </div>
  )
}
