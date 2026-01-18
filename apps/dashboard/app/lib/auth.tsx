/**
 * Authentication Context and Hooks
 * Provides wallet authentication state and methods
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { client } from './api'

interface User {
  id: string
  walletAddress: string
  email?: string
  name?: string
  createdAt: string
  lastLogin?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (walletAddress: string, signature: string, nonce: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch current user on mount
  useEffect(() => {
    refreshUser()
  }, [])

  const refreshUser = async () => {
    try {
      setIsLoading(true)
      const res = await client['auth']['me'].$get()
      
      if (res.ok) {
        const userData = await res.json()
        setUser(userData as User)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (walletAddress: string, signature: string, nonce: string) => {
    try {
      const res = await client['auth']['verify'].$post({
        json: {
          walletAddress,
          signature,
          nonce,
        },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error((error as any).error || 'Authentication failed')
      }

      const data = await res.json()
      if (data.success && data.user) {
        setUser(data.user as User)
      } else {
        throw new Error(data.error || 'Authentication failed')
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await client['auth']['logout'].$post()
      setUser(null)
    } catch (error) {
      console.error('Logout failed:', error)
      // Clear user anyway
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
