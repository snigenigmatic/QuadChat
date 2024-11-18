// src/components/auth/LoginForm.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../../services/auth'

const LoginForm = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password)
      }
      navigate('/chat')
    } catch (error) {
      console.error('Auth error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded border"
          required
        />
      </div>
      <div>
        <label className="block mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 rounded border"
          required
        />
      </div>
      <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
        {isLogin ? 'Login' : 'Register'}
      </button>
      <p className="text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-blue-500"
        >
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </p>
    </form>
  )
}

export default LoginForm