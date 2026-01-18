/**
 * Login Page
 * Wallet-based authentication page
 */

import type { Route } from './+types/login'
import { useAuth } from '~/lib/auth'
import { WalletConnector } from '~/components/WalletConnector'
import { useNavigate } from 'react-router'
import { useEffect } from 'react'

export default function Login({ }: Route.ComponentProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">x402 Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Connect your VeChain wallet to access the dashboard
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <WalletConnector onSuccess={() => navigate('/dashboard')} />
          
          <div className="text-sm text-center text-gray-500">
            <p>Supported wallets:</p>
            <ul className="mt-2 space-y-1">
              <li>• VeWorld (Browser Extension & Mobile)</li>
              <li>• Sync2 (Desktop)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
