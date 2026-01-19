/**
 * HourlyApiCallsChart Component
 * Bar chart showing hourly API activity
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface HourlyData {
  hour: number
  total: number
  verify: number
  settle: number
}

interface HourlyApiCallsChartProps {
  data: HourlyData[]
}

export function HourlyApiCallsChart({ data }: HourlyApiCallsChartProps) {
  // Transform data for the chart
  const chartData = data.map(item => ({
    hour: `${item.hour.toString().padStart(2, '0')}:00`,
    total: item.total,
    verify: item.verify,
    settle: item.settle,
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly API Activity</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="verify" stackId="a" fill="#3b82f6" name="Verify Calls" />
          <Bar dataKey="settle" stackId="a" fill="#10b981" name="Settle Calls" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
