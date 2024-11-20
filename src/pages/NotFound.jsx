import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-lg mx-auto text-center">
          <div className="space-y-12">
            {/* 404 Text */}
            <div className="relative py-8">
              <h1 className="text-[12rem] font-extrabold text-indigo-600 dark:text-indigo-400 animate-pulse leading-none">
                404
              </h1>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[-1] w-full">
                <div className="text-[16rem] font-extrabold text-gray-900/5 dark:text-white/5 select-none leading-none">
                  404
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-4 px-4">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                Page not found
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Oops! Looks like you've ventured into uncharted territory.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-6 pt-4">
              <Link
                to="/"
                className="inline-flex items-center px-8 py-3 border border-transparent text-lg font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
              >
                Go back home
              </Link>
              <div className="flex justify-center">
                <Link
                  to="/contact"
                  className="text-lg font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-indigo-300 dark:bg-indigo-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-8 -right-10 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
