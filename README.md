# Social Wall

A modern, real-time social media platform that enables users to share posts, engage with content through likes and comments, and connect with others in a dynamic social feed environment. The application features user authentication, real-time updates via WebSocket connections, and a clean, responsive user interface.

## Features

- **User Authentication**: Secure registration, login, and email verification system
- **Real-time Social Feed**: Live updates of posts, likes, and comments via WebSocket
- **Post Management**: Create, edit, and delete posts with rich content support
- **Interactive Engagement**: Like posts and add comments in real-time
- **Admin Dashboard**: Administrative interface for content and user management
- **Responsive Design**: Mobile-friendly interface that works across all devices
- **Security Features**: Rate limiting, XSS protection, and secure JWT authentication

## Technology Stack

**Frontend**: React.js with modern hooks and context API  
**Backend**: Node.js with Express.js framework  
**Database**: SQLite for lightweight, file-based data storage  
**Real-time Communication**: WebSocket for live updates

## Third-Party Plugins and Dependencies

### Backend Dependencies
- **express** (^4.18.2) - Web application framework for Node.js
- **sqlite3** (^5.1.6) - SQLite database driver for Node.js
- **bcrypt** (^5.1.0) - Password hashing library for secure authentication
- **jsonwebtoken** (^9.0.0) - JWT token generation and verification
- **cookie-parser** (^1.4.6) - Cookie parsing middleware for Express
- **cors** (^2.8.5) - Cross-Origin Resource Sharing middleware
- **ws** (^8.13.0) - WebSocket library for real-time communication
- **dotenv** (^16.0.3) - Environment variable management
- **express-rate-limit** (^6.7.0) - Rate limiting middleware for API protection
- **helmet** (^6.0.1) - Security middleware for Express applications
- **nodemailer** (^6.9.1) - Email sending library for verification emails
- **multer** (^1.4.5-lts.1) - Middleware for handling file uploads
- **uuid** (^9.0.0) - UUID generation library
- **xss-clean** (^0.1.1) - Middleware to clean user input from malicious HTML
- **express-validator** (^7.0.1) - Input validation and sanitization middleware

### Frontend Dependencies
- **react** (^18.2.0) - JavaScript library for building user interfaces
- **react-dom** (^18.2.0) - React DOM rendering library
- **react-router-dom** (^6.8.2) - Declarative routing for React applications
- **axios** (^1.3.4) - HTTP client library for API requests
- **react-toastify** (^9.1.1) - Toast notification library for React
- **emoji-picker-react** (^4.4.9) - Emoji picker component for enhanced user experience
- **react-infinite-scroll-component** (^6.1.0) - Infinite scrolling component for post feeds

### Development Dependencies
- **nodemon** (^2.0.22) - Development utility for auto-restarting Node.js server
- **react-scripts** (5.0.1) - Build tools and configuration for React applications

## Project Structure

```
social-wall/
├── backend/
│   ├── server.js          # Main server file with Express app setup
│   ├── package.json       # Backend dependencies and scripts
│   └── db/
│       ├── init.js        # Database initialization and schema
│       ├── seed.js        # Database seeding with sample data
│       └── social.db      # SQLite database file
├── frontend/
│   ├── package.json       # Frontend dependencies and scripts
│   ├── public/
│   │   ├── index.html     # Main HTML template
│   │   └── manifest.json  # PWA manifest file
│   └── src/
│       ├── App.js         # Main React application component
│       ├── index.js       # React app entry point
│       ├── components/    # Reusable React components
│       ├── contexts/      # React context providers (Auth, WebSocket)
│       └── pages/         # Page components for different routes
└── README.md              # Project documentation
```

## Installation and Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Steps to Run the Project

1. **Clone the repository**
   ```powershell
   git clone <repository-url>
   cd social-wall
   ```

2. **Install Backend Dependencies**
   ```powershell
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```powershell
   cd ../frontend
   npm install
   ```

4. **Setup Environment Variables**
   Create a `.env` file in the backend directory with the following variables:
   ```
   JWT_SECRET=your_jwt_secret_key
   EMAIL_HOST=your_email_host
   EMAIL_PORT=587
   EMAIL_USER=your_email_username
   EMAIL_PASS=your_email_password
   PORT=5000
   ```

5. **Initialize Database**
   ```powershell
   cd ../backend
   node db/init.js
   ```

6. **Seed Database (Optional)**
   ```powershell
   node db/seed.js
   ```

7. **Start the Backend Server**
   ```powershell
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

8. **Start the Frontend Application**
   Open a new terminal window:
   ```powershell
   cd frontend
   npm start
   ```

9. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Usage

1. **Register a new account** or login with existing credentials
2. **Verify your email** through the verification link sent to your email
3. **Create posts** on the home page to share with the community
4. **Engage with content** by liking posts and adding comments
5. **Access admin features** if you have administrative privileges

## Development

For development, use the following commands:

- **Backend development**: `npm run dev` (uses nodemon for auto-restart)
- **Frontend development**: `npm start` (includes hot reload)
- **Build for production**: `npm run build` (frontend only)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).
