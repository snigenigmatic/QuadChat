// src/components/auth/AuthPage.jsx
import React from 'react'
import LoginForm from '../auth/LoginForm.jsx'
import ThemeToggle from '../shared/ThemeToggle.jsx'; // Correct path



const AuthPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">
          Welcome to QuadChat
        </h1>
        <LoginForm />
      </div>
    </div>
  )
}

export default AuthPage