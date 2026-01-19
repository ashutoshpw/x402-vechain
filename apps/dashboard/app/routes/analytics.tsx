/**
 * Analytics Page
 * Display payment volume, trends, and API usage statistics
 */

import type { Route } from './+types/analytics'
import { useAuth } from '~/lib/auth'
import { useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { StatCard } from '~/components/StatCard'
import { DailyVolumeChart } from '~/components/DailyVolumeChart'
import { TokenDistributionChart } from '~/components/TokenDistributionChart'
import { HourlyApiCallsChart } from '~/components/HourlyApiCallsChart'
import { formatTokenAmount } from '~/lib/formatters'

interface AnalyticsData {
  timeRange: string
  summary: {
    totalPayments: number
    totalVolume: string
    confirmedPayments: number
    failedPayments: number
    pendingPayments: number
    successRate: number
  }
  paymentsByToken: Array<{
    token: string
    count: number
    volume: string
  }>
  dailyVolume: Array<{
    date: string
    count: number
    volume: string
    confirmedCount: number
  }>
  hourlyActivity: Array<{
    hour: number
    total: number
    verify: number
    settle: number
  }>
}

export default function Analytics({ }: Route.ComponentProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics()
    }
  }, [isAuthenticated, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/analytics/stats?range=${timeRange}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        console.error(`Failed to fetch analytics: ${response.status} ${response.statusText}`)
        return
      }
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">x402 Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </a>
              <a
                href="/analytics"
                className="text-sm font-medium text-blue-600"
              >
                Analytics
              </a>
              <a
                href="/transactions"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Transactions
              </a>
              <span className="text-sm text-gray-600">
                {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h2>
            <p className="text-sm text-gray-600">Payment volume, trends, and API usage</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeRange === '24h'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                timeRange === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              30d
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-600">Loading analytics...</div>
          </div>
        ) : !analytics ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-600">No analytics data available</div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Payments"
                value={analytics.summary.totalPayments.toLocaleString()}
                description={`${timeRange.toUpperCase()} period`}
              />
              <StatCard
                title="Total Volume"
                value={formatTokenAmount(analytics.summary.totalVolume)}
                description="Across all tokens"
              />
              <StatCard
                title="Success Rate"
                value={`${analytics.summary.successRate.toFixed(1)}%`}
                description={`${analytics.summary.confirmedPayments} confirmed`}
              />
              <StatCard
                title="Failed Payments"
                value={analytics.summary.failedPayments}
                description={`${analytics.summary.pendingPayments} pending`}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <DailyVolumeChart data={analytics.dailyVolume} />
              <TokenDistributionChart data={analytics.paymentsByToken} />
            </div>

            <div className="mb-8">
              <HourlyApiCallsChart data={analytics.hourlyActivity} />
            </div>

            {/* Additional Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
              <div className="space-y-4">
                {analytics.paymentsByToken.map((tokenData, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{tokenData.token}</p>
                      <p className="text-sm text-gray-600">{tokenData.count} payments</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatTokenAmount(tokenData.volume)}</p>
                      <p className="text-sm text-gray-600">Total volume</p>
                    </div>
                  </div>
                ))}
                {analytics.paymentsByToken.length === 0 && (
                  <p className="text-sm text-gray-600 text-center py-4">No payment data available</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
