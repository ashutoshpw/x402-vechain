/**
 * TokenDistributionChart Component
 * Pie chart showing payment distribution by token
 */

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TokenData {
  token: string
  count: number
  volume: string
}

interface TokenDistributionChartProps {
  data: TokenData[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const TOKEN_NAMES: Record<string, string> = {
  'VET': 'VET',
  '0x0000000000000000000000000000456e65726779': 'VTHO',
  '0x170f4ba2e7c1c0b5e1b811b67e5c82226b248e77': 'VEUSD',
  '0x5ef79995FE8a89e0812330E4378eB2660ceDe699': 'B3TR',
}

export function TokenDistributionChart({ data }: TokenDistributionChartProps) {
  // Transform data for the chart (memoized to avoid recalculation on every render)
  const chartData = useMemo(() =>
    data.map(item => ({
      name: TOKEN_NAMES[item.token] || item.token,
      value: item.count,
      volume: parseFloat((BigInt(item.volume || '0') / BigInt(10 ** 18)).toString()),
    })),
    [data]
  )

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
