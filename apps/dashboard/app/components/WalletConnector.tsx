/**
 * WalletConnector Component
 * Handles VeWorld/Sync2 wallet connection and authentication
 */

import React, { useState } from 'react'
import { useAuth } from '~/lib/auth'
import { client } from '~/lib/api'

interface WalletConnectorProps {
  onSuccess?: () => void
}

export function WalletConnector({ onSuccess }: WalletConnectorProps) {
  const { login } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectWallet = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      // Check if VeChain wallet is available
      const vechain = (window as any).vechain

      if (!vechain) {
        throw new Error(
          'VeChain wallet not found. Please install VeWorld or Sync2.'
        )
      }

      // Request account access
      const accounts = await vechain.request({
        method: 'eth_requestAccounts',
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts found')
      }

      const walletAddress = accounts[0]

      // Get challenge from backend
      const challengeRes = await client['auth']['challenge'].$post({
        json: {
          walletAddress,
        },
      })

      if (!challengeRes.ok) {
        throw new Error('Failed to get authentication challenge')
      }

      const { message, nonce } = await challengeRes.json()

      // Sign the message with the wallet
      const signature = await vechain.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      })

      if (!signature) {
        throw new Error('Failed to sign message')
      }

      // Verify signature and authenticate
      await login(walletAddress, signature, nonce)

      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Wallet connection error:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="wallet-connector">
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="wallet-connect-button"
      >
        {isConnecting ? 'Connecting...' : 'Connect VeChain Wallet'}
      </button>
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
