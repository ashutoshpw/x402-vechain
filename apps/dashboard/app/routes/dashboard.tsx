/**
 * Protected Dashboard Page
 * Main dashboard after authentication
 */

import type { Route } from './+types/dashboard'
import { useAuth } from '~/lib/auth'
import { useNavigate } from 'react-router'
import { useEffect } from 'react'

export default function Dashboard({ }: Route.ComponentProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to your Dashboard
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Wallet Address</h3>
              <p className="mt-1 text-sm text-gray-900">{user.walletAddress}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Account Created</h3>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            {user.lastLogin && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Login</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(user.lastLogin).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            API Keys
          </h3>
          <p className="text-sm text-gray-600">
            Manage your API keys for the x402 VeChain Facilitator.
          </p>
          {/* TODO: Add API key management UI */}
        </div>
      </main>
    </div>
  )
}
