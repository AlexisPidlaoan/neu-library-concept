
# NEU Library Visitor Management System

A digital logbook application for New Era University to track and analyze library usage by students and faculty.

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- A Firebase project created at [Firebase Console](https://console.firebase.google.com/)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Setup Instructions

1. **Firebase Setup**:
   - Enable **Google** and **Anonymous** sign-in providers in Authentication.
   - Create a **Firestore** database in production mode.
   - Ensure `src/firebase/config.ts` matches your Firebase web app credentials.

2. **AI Integration**:
   - Copy your Gemini API Key from Google AI Studio.
   - Create a `.env` file in the root directory.
   - Add `GOOGLE_GENAI_API_KEY=your_key_here` to the `.env` file.

3. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

## 📂 Deployment to GitHub

To push this project to your GitHub account:

1. Initialize git:
   ```bash
   git init
   ```
2. Add all files:
   ```bash
   git add .
   ```
3. Commit your changes:
   ```bash
   git commit -m "Initial commit: NEU Library Visitor System"
   ```
4. Create a new repository on GitHub.
5. Link to your GitHub repository and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

## 🛠 Features
- **Institutional Login**: Restricts access to `@neu.edu.ph` email addresses.
- **Terminal Mode**: Quick Student ID check-in with automatic account linking.
- **Admin Dashboard**: Real-time analytics, visitor trends, and department breakdowns.
- **User Management**: Search, block, or unblock users to maintain facility security.
- **AI Suggestions**: Smart "Purpose of Visit" suggestions using Google Gemini (via Genkit).

---
© 2024 New Era University Library
