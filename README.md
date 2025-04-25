# Quotes App

## Overview
A full-featured application for managing and displaying quotes with support for authentication, offline functionality, and responsive design. The app allows authorized users to add, delete, and manage quotes while providing a seamless experience for all users to search and view quotes.

## Features

### Core Functionality
- **Quote Management**: Add, view, search, and delete quotes
- **Authentication**: Secure login system for authorized users
- **Offline Support**: Fallback to local storage when offline with sync capabilities
- **Responsive Design**: Mobile-friendly interface

### Quote Features
- Search quotes by reference, content, or tags
- Filter quotes by collection
- Copy quotes to clipboard
- View quotes by category with color-coded cards

### Admin Features
- **Authorized Quote Deletion**: Only authenticated users can delete quotes
- **Undo Functionality**: Restore recently deleted quotes
- **Backup System**: Deleted quotes are backed up for potential recovery

## Technical Architecture

### Frontend
- React.js with context API for state management
- Responsive CSS with custom styling
- Offline-first approach with localStorage fallback

### Backend
- Node.js with Express
- MongoDB for data storage
- JWT authentication
- RESTful API design

### Data Synchronization
- Automatic sync between MongoDB and client
- Offline changes tracked and synced when connection is restored
- Fallback to local JSON when server is unavailable

## Deployment Instructions

### Prerequisites
- Node.js (v14+)
- MongoDB instance
- Environment variables configured

### Environment Setup
Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

### Installation
1. Clone the repository
   ```
   git clone https://github.com/yourusername/quotes-app.git
   cd quotes-app
   ```

2. Install dependencies
   ```
   npm install
   cd client
   npm install
   cd ..
   ```

3. Build the client
   ```
   cd client
   npm run build
   cd ..
   ```

4. Start the server
   ```
   npm start
   ```

### Development Mode
1. Start the server
   ```
   npm run server
   ```

2. In a separate terminal, start the client
   ```
   cd client
   npm start
   ```

## Scripts

The application includes several utility scripts in the `scripts` directory:

- **deleteQuote.js**: Delete quotes with authentication (requires auth token)
- **syncQuotes.js**: Synchronize quotes between MongoDB and local storage
- **checkQuoteCounts.js**: Check and display quote counts from different sources
- **importQuotes.js**: Import quotes from JSON files
- **updatePublicQuotes.js**: Update the public quotes JSON file

## Security Features

- JWT-based authentication
- Protected API routes
- Secure password storage with bcrypt
- Authorization checks for sensitive operations

## Offline Capabilities

- Quotes are cached in localStorage
- Offline additions and deletions are tracked
- Changes are synchronized when connection is restored
- Fallback to local JSON file when server is unavailable

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.