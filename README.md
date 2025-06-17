# Secret Echo Backend - LLM based Plugin Generator for Woo Ecommerce

## Overview

Secret Echo is the backend service for the WooCommerce Plugin Generator, a web application that allows users to generate custom WooCommerce plugins using AI. This backend handles user authentication, plugin generator session management, real-time chat for plugin generation, and storage of generated plugins. It is built using Node.js with Express for RESTful APIs, WebSocket for real-time communication, MongoDB for data storage, Redis for caching, and integrates with the Gemini API for AI-powered plugin generation.

The backend exposes REST endpoints for user management and plugin generator operations, as well as WebSocket routes for real-time chat during plugin generation.

## Features

- **User Authentication:** Sign up, log in, log out, and retrieve user details.
- **Plugin Generator Sessions:** Create, list, and manage plugin generator sessions.
- **Real-Time Chat:** Communicate with the AI plugin generator via WebSocket.
- **Plugin Generation:** Generate and save WooCommerce plugins as PHP code.
- **MongoDB Storage:** Persist user data and plugin generator sessions.
- **Redis Caching:** Improve performance with Redis Cloud for caching.
- **Rate Limiting:** Improve performance with rate limiting to prevent continous api call.
- **Gemini API Integration:** Leverage AI for generating plugin code.

## Prerequisites

Before setting up the backend, ensure you have the following installed:

- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- **MongoDB** (local or cloud instance, e.g., MongoDB Atlas)
- **Redis** (local or cloud instance, e.g., Redis Cloud)
- **Gemini API Key** (for AI plugin generation)

## Installation

1. **Clone the Repository:**

   ```bash
   git clone <repositary url>
   cd secret-echo-backend
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Set Up Environment Variables:**

   Create a `.env` file in the root directory and configure it based on the example below.

## Environment Variables

The backend requires the following environment variables to be set in a `.env` file. Below is an example configuration:

```env
APP_NAME=secret-echo
APP_ENV=development
APP_PORT=3000

TOKEN_SECRET=your-secure-random-secret-key-12345

MONGO_URI=mongodb+srv://<username>:<password>@secretechocluster0.2s1m3vn.mongodb.net/

GEMINI_API_KEY=your-gemini-api-key

REDIS_CLOUD_HOST=your-redis-host
REDIS_CLOUD_PORT=14004
REDIS_CLOUD_USERNAME=default
REDIS_CLOUD_PASSWORD=your-redis-password
REDIS_CLOUD_TLS=true
```

### Environment Variable Descriptions

- `APP_NAME`: The name of the application (default: `secret-echo`).
- `APP_ENV`: The environment the app is running in (`development`, `production`, etc.).
- `APP_PORT`: The port on which the backend server runs (default: `3000`).
- `TOKEN_SECRET`: A secure key for signing JWT tokens (generate a random, secure string).
- `MONGO_URI`: The MongoDB connection string (replace `<username>` and `<password>` with your credentials).
- `GEMINI_API_KEY`: Your Gemini API key for AI plugin generation.
- `REDIS_CLOUD_HOST`: The host for your Redis Cloud instance.
- `REDIS_CLOUD_PORT`: The port for your Redis Cloud instance (default: `14004`).
- `REDIS_CLOUD_USERNAME`: The username for Redis Cloud (default: `default`).
- `REDIS_CLOUD_PASSWORD`: The password for Redis Cloud.
- `REDIS_CLOUD_TLS`: Whether to use TLS for Redis connections (`true` or `false`).

## Running the Backend

1. **Start the Backend Server:**

   ```bash
   npm run dev
   ```

   The server will start on the specified `APP_PORT` (default: `3000`).

2. **Access the API:**

   The REST API will be available at `http://localhost:3000/api/v1`.

   The WebSocket server will be available at `ws://localhost:3000`.

## API Endpoints

The backend provides RESTful API endpoints under the `/api/v1` base path. All endpoints require authentication via a Bearer token in the `Authorization` header, except for `/auth/signup` and `/auth/login`.

### User Endpoints

#### 1. Sign Up

- **Endpoint:** `POST /api/v1/auth/signup`
- **Description:** Register a new user.
- **Request Body:**

  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123",
    "first_name": "John",
    "last_name": "Doe"
  }
  ```

- **Response (Success):**

  ```json
  {
    "success": true,
    "data": {
      "user_pid": "user_1234567890",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "token": "your-jwt-token"
    }
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["Email already exists"]
  }
  ```

#### 2. Log In

- **Endpoint:** `POST /api/v1/auth/login`
- **Description:** Authenticate a user and return a JWT token.
- **Request Body:**

  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```

- **Response (Success):**

  ```json
  {
    "success": true,
    "data": {
      "token": "your-jwt-token",
      "user_pid": "user_1234567890",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["Invalid email or password"]
  }
  ```

#### 3. Log Out

- **Endpoint:** `POST /api/v1/auth/logout`
- **Description:** Log out the current user and invalidate their session token.
- **Headers:**
  - `Authorization: Bearer your-jwt-token`
- **Response (Success):**

  ```json
  {
    "success": true,
    "data": {
      "message": "Logged out successfully"
    }
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["Could not logout the current user"]
  }
  ```

#### 4. Get User Details

- **Endpoint:** `GET /api/v1/users/me`
- **Description:** Retrieve the authenticated user’s details.
- **Headers:**
  - `Authorization: Bearer your-jwt-token`
- **Response (Success):**

  ```json
  {
    "success": true,
    "data": {
      "user_pid": "user_1234567890",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "created_at": "2025-06-17T13:25:00.000Z",
      "updated_at": "2025-06-17T13:25:00.000Z"
    }
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["User not found"]
  }
  ```

### Plugin Generator Endpoints

#### 1. Create Plugin Generator Session

- **Endpoint:** `POST /api/v1/plugin/plugin-generator`
- **Description:** Create a new plugin generator session for the authenticated user.
- **Headers:**
  - `Authorization: Bearer your-jwt-token`
- **Request Body:**

  ```json
  {
    "pluginName": "Add to Cart Button Color"
  }
  ```

- **Response (Success):**

  ```json
  {
    "success": true,
    "data": {
      "message": "Plugin generator session created successfully",
      "pluginId": "plugin_1234567890"
    }
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["Plugin Name is required"]
  }
  ```

#### 2. List Plugin Generator Sessions

- **Endpoint:** `GET /api/v1/plugin/plugin-generators`
- **Description:** List all plugin generator sessions for the authenticated user.
- **Headers:**
  - `Authorization: Bearer your-jwt-token`
- **Response (Success):**

  ```json
  {
    "success": true,
    "data": [
      {
        "pluginId": "plugin_1234567890",
        "pluginName": "Add to Cart Button Color",
        "chat": [
          {
            "content": "Change the add to cart button to blue",
            "sender": "user",
            "timestamp": "2025-06-17T13:25:00.000Z"
          },
          {
            "content": "<?php\n// Generated plugin code...",
            "sender": "plugin_generator",
            "timestamp": "2025-06-17T13:25:05.000Z"
          }
        ],
        "generatedPlugin": "<?php\n// Generated plugin code..."
      }
    ]
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["User ID is required"]
  }
  ```

#### 3. Get Plugin Generator Chat History

- **Endpoint:** `GET /api/v1/plugin/plugin-generator/chat-history?plugin_id={pluginId}`
- **Description:** Retrieve the chat history for a specific plugin generator session.
- **Headers:**
  - `Authorization: Bearer your-jwt-token`
- **Query Parameters:**
  - `plugin_id`: The ID of the plugin generator session (required).
- **Response (Success):**

  ```json
  {
    "success": true,
    "data": [
      {
        "content": "Change the add to cart button to blue",
        "sender": "user",
        "timestamp": "2025-06-17T13:25:00.000Z"
      },
      {
        "content": "<?php\n// Generated plugin code...",
        "sender": "plugin_generator",
        "timestamp": "2025-06-17T13:25:05.000Z"
      }
    ]
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["Plugin ID is required"]
  }
  ```

#### 4. Save Plugin Generator Message

- **Endpoint:** `POST /api/v1/plugin/plugin-generator/message`
- **Description:** Save a message to the plugin generator session’s chat history (used as a fallback if WebSocket fails).
- **Headers:**
  - `Authorization: Bearer your-jwt-token`
- **Request Body:**

  ```json
  {
    "pluginId": "plugin_1234567890",
    "content": "Change the add to cart button to blue",
    "sender": "user"
  }
  ```

- **Response (Success):**

  ```json
  {
    "success": true,
    "data": {
      "message": "Message saved successfully"
    }
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["Sender must be either 'user' or 'plugin_generator'"]
  }
  ```

#### 5. Save Generated Plugin

- **Endpoint:** `POST /api/v1/plugin/plugin-generator/save-plugin`
- **Description:** Save the final generated plugin code for a plugin generator session.
- **Headers:**
  - `Authorization: Bearer your-jwt-token`
- **Request Body:**

  ```json
  {
    "pluginId": "plugin_1234567890",
    "generatedPlugin": "<?php\n// Generated plugin code..."
  }
  ```

- **Response (Success):**

  ```json
  {
    "success": true,
    "data": {
      "message": "Generated plugin saved successfully"
    }
  }
  ```

- **Response (Error):**

  ```json
  {
    "success": false,
    "errors": ["Generated Plugin is required"]
  }
  ```

## WebSocket Routes

The backend supports real-time communication for plugin generation via WebSocket. The WebSocket server runs on the same port as the REST API and requires authentication via query parameters.

### WebSocket Connection

- **URL:** `ws://localhost:3000/plugin_generator`
- **Query Parameters:**
  - `plugin_id`: The ID of the plugin generator session (required).
  - `token`: The user’s JWT token (required).
- **Example URL:** `ws://localhost:3000/plugin_generator?plugin_id=plugin_1234567890&token=your-jwt-token`

### Message Format

#### Sending a Message

- **Format:** JSON
- **Example:**

  ```json
  {
    "message": "Change the add to cart button to blue",
    "type": "code/chat",
    "pluginId": "plugin_1234567890"
  }
  ```

#### Receiving a Message

- **Format:** JSON
- **Example (Chat Message):**

  ```json
  {
    "response": "Understood! Generating a plugin to change the add to cart button to blue...",
    "sender": "plugin_generator"
  }
  ```

- **Example (Final Plugin Code):**

  ```json
  {
    "response": "<?php\n// Generated plugin code...",
    "isFinal": true
  }
  ```

### Connection Flow

1. Connect to the WebSocket server with the `plugin_id` and `token` query parameters.
2. Send a message with the user’s plugin request (e.g., "Change the add to cart button to blue").
3. Receive real-time responses from the plugin generator, including intermediate messages and the final plugin code.
4. Optionally, send an acknowledgment (`{"message": "ack", "pluginId": "plugin_1234567890"}`) to confirm receipt of the final plugin code.

## Project Structure

The backend follows a modular structure for maintainability:

- **`controllers/`**
  - `plugin_generators/`: Handlers for plugin generator routes.
  - `users/`: Handlers for user routes.
- **`middleware/`**
  - `context.ts`: Middleware for request context and authentication.
- **`models/`**
  - `plugin_generator.ts`: Request/response types and schemas for plugin generator routes.
  - `users.ts`: Request/response types and schemas for user routes.
- **`providers/`**
  - `interface.ts`: Interface for interacting with services (e.g., MongoDB, Redis).
- **`services/`**
  - `users/`: Business logic for user operations.
- **`utils/`**
  - `validator.ts`: Joi validation utilities.
- **`oplog/`**
  - `oplog.ts`: Logging utilities.
- **`routes/`**
  - REST and WebSocket route mappings.

## Dependencies

Key dependencies used in the project:

- `express`: Web framework for RESTful APIs.
- `ws`: WebSocket library for real-time communication.
- `mongoose`: MongoDB ORM for data modeling.
- `redis`: Redis client for caching.
- `joi`: Schema validation for request data.
- `jsonwebtoken`: JWT for authentication.
- `dotenv`: Environment variable management.

Run `npm install` to install all dependencies listed in `package.json`.

## Logging

The backend uses a custom logging utility (`oplog`) to log important events, such as WebSocket connections, errors, and user actions. Logs are written to the console in development mode and can be configured for file output in production.

## Error Handling

All API endpoints return responses in a consistent format:

- **Success Response:**

  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

- **Error Response:**

  ```json
  {
    "success": false,
    "errors": ["Error message"]
  }
  ```

WebSocket errors are logged to the console and may result in the connection being closed with an appropriate close code and message.


## Contact

For questions or support, please contact the project maintainer at `shubhammaurya99663@gmail.com`.
