import { useCallback, useEffect, useMemo, useState } from 'react'
import AuthContext from './AuthContext'
import api, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../services/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(
    localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY),
  ))

  const clearSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    let active = true
    if (!localStorage.getItem(ACCESS_TOKEN_KEY) && !localStorage.getItem(REFRESH_TOKEN_KEY)) {
      return () => { active = false }
    }
    api.get('/accounts/me/')
      .then(({ data }) => { if (active) setUser(data) })
      .catch(() => { if (active) clearSession() })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [clearSession])

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/accounts/login/', credentials)
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh)
    try {
      const { data: currentUser } = await api.get('/accounts/me/')
      setUser(currentUser)
      return currentUser
    } catch (error) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      throw error
    }
  }, [])

  const register = useCallback(async (details) => {
    await api.post('/accounts/register/', details)
    return login({ email: details.email, password: details.password })
  }, [login])

  const activateWorker = useCallback(async () => {
    const { data } = await api.post('/accounts/activate-worker/')
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    try {
      if (refresh) await api.post('/accounts/logout/', { refresh })
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({ user, loading, login, register, activateWorker, logout, setUser }),
    [user, loading, login, register, activateWorker, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
