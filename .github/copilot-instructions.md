# Agent Instructions for donald.ai

## Project Overview
This is a speech synthesis application running on Node.js (server.js) with a vanilla JavaScript frontend.
- **Frontend:** Located in `assets/js/app.js` and `assets/css/styles.css`. Uses a 3-column "Wide Layout".
- **Backend:** `server.js` handles API requests and serves static files from `assets/`.
- **Media:** Audio/Video files are stored in `assets/audio` and `assets/videos`.

## Database Schema
Always use the following table and column names when writing SQL or database logic. Do not invent new columns.

### Table: users
- `id`: Unique identifier
- `email`: User's email address
- `credits`: Number of speech generation credits remaining
- `is_active`: Boolean status

### Table: generations (Speeches)
- `id`: Unique identifier
- `user_id`: Link to `users.id`
- `input_text`: The text typed by the user
- `audio_path`: Path to the generated audio file
- `created_at`: Timestamp of generation

## Coding Conventions
- Use **ES Modules** (`import`/`export`) in `server.js`.
- Do NOT use React or frontend frameworks; keep the frontend vanilla DOM manipulation.
- When creating new UI elements, ensure they match the "cyan/teal" terminal aesthetic.
