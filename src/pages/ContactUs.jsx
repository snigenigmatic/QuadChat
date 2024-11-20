import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ContactUs = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
      <Navbar />
      <div className="pt-24 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Contact Us</h1>
            
            <div className="space-y-8">
              <p className="text-gray-600 dark:text-gray-300">
                We'd love to hear from you! Please fill out the form below or use our contact information to get in touch.
              </p>

              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Your message..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                >
                  Send Message
                </button>
              </form>

              <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Other Ways to Reach Us</h2>
                
                <div className="space-y-4 text-gray-600 dark:text-gray-300">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Email</h3>
                    <p>support@quadchat.com</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Address</h3>
                    <p>123 Chat Street<br />Tech Valley, CA 94025<br />United States</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Business Hours</h3>
                    <p>Monday - Friday: 9:00 AM - 6:00 PM (PST)<br />Saturday - Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactUs;
