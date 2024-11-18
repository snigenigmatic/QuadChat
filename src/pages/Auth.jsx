// src/pages/Auth.jsx
import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true)
  const { user } = useAuth()

  // If user is already authenticated, redirect to chat
  if (user) {
    console.log('Auth page - User already authenticated, redirecting to chat')
    return <Navigate to="/chat" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          {isLogin ? 'Welcome Back!' : 'Create Account'}
        </h2>
        
        {isLogin ? (
          <LoginForm />
        ) : (
          <RegisterForm />
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Auth