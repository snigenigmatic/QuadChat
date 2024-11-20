import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
      <Navbar />
      <div className="pt-24 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">About QuadChat</h1>
            
            <div className="space-y-6 text-gray-600 dark:text-gray-300">
              <p>
                QuadChat is a modern real-time communication platform designed to bring people together in meaningful conversations.
                Our platform provides a seamless and intuitive chat experience for users across different devices and locations.
              </p>

              <div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Our Mission</h2>
                <p>
                  We strive to create a safe and engaging environment where people can connect, share ideas,
                  and build communities. Our focus is on providing reliable, fast, and secure communication tools
                  that enhance collaboration and foster meaningful relationships.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Key Features</h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Real-time messaging with instant delivery</li>
                  <li>Secure end-to-end communication</li>
                  <li>Group chat capabilities</li>
                  <li>File sharing and media support</li>
                  <li>Cross-platform compatibility</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Our Values</h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Privacy and Security</li>
                  <li>User-Centric Design</li>
                  <li>Innovation and Continuous Improvement</li>
                  <li>Community Building</li>
                  <li>Reliability and Performance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AboutUs;
