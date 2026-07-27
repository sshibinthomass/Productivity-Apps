import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export const missingAuthProviderMessage = 'useAuth must be used within AuthProvider.'

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(missingAuthProviderMessage)
  }

  return context
}
