# Quad Chat

A modern real-time chat application built with React, Vite, and Socket.IO, featuring a clean and intuitive user interface.

## Features

- Real-time messaging with WebSocket support
- Clean and modern user interface
- User authentication
- Message history
- Responsive design for all devices
- Real-time typing indicators
- Online/offline user status

## Tech Stack

- **Frontend:**
  - React
  - Vite (for fast development and building)
  - Socket.IO Client
  - Tailwind CSS

- **Backend:**
  - Node.js
  - Express
  - Socket.IO
  - MongoDB

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/quad-chat.git
   cd quad-chat
   ```

2. Install dependencies for both client and server:
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the server directory
   - Add necessary environment variables (see `.env.example`)

4. Start the development servers:
   ```bash
   # Start the backend server
   cd server
   npm run dev

   # In a new terminal, start the frontend
   cd client
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Development

- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:3000`
- Hot Module Replacement (HMR) is enabled for fast development
- ESLint is configured for code quality

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- React setup powered by [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)
- Styling enhanced with [Tailwind CSS](https://tailwindcss.com/)
