/**
 * DailyVolumeChart Component
 * Line chart showing daily payment volume
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DailyVolumeData {
  date: string
  count: number
  volume: string
  confirmedCount: number
}

interface DailyVolumeChartProps {
  data: DailyVolumeData[]
}

export function DailyVolumeChart({ data }: DailyVolumeChartProps) {
  // Transform data for the chart
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
    confirmed: item.confirmedCount,
    volume: parseFloat((BigInt(item.volume || '0') / BigInt(10 ** 18)).toString()),
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Payment Volume</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            name="Total Payments"
            strokeWidth={2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="confirmed"
            stroke="#10b981"
            name="Confirmed"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="volume"
            stroke="#f59e0b"
            name="Volume (tokens)"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
