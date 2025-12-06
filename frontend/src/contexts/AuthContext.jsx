import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

// Get API base URL - prioritize environment variable
const getApiBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL
  
  // Debug: Log the environment variable (remove in production if needed)
  if (typeof window !== 'undefined') {
    console.log('VITE_API_URL:', envUrl)
  }
  
  // If VITE_API_URL is set and is a full URL, use it
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
  }
  
  // For production (when not on localhost), we should have a full URL
  // If envUrl is set but not a full URL, something is wrong
  if (envUrl && !envUrl.startsWith('/')) {
    console.warn('VITE_API_URL is set but not a valid URL:', envUrl)
  }
  
  // Default to relative path for local development
  return '/api'
}

const apiBaseURL = getApiBaseURL()
const apiClient = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Debug: Log the configured base URL
if (typeof window !== 'undefined') {
  console.log('API Base URL configured:', apiBaseURL)
}

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('token')
      delete apiClient.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    const response = await apiClient.post('/auth/login', { username, password })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete apiClient.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


