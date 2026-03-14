
# NEU Library Visitor Management System

A digital logbook application for New Era University to track and analyze library usage.

## 🚀 Deployment to GitHub

Follow these steps to push your project to GitHub:

1. **Create a Repository**: Go to [GitHub](https://github.com/new) and create a new repository (do not initialize with README).
2. **Initialize Git**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: NEU Library System"
   ```
3. **Connect and Push**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

## 🛠 Features & Setup

### 1. Firebase Configuration
The app uses Firebase for Auth and Firestore. The rules are located in `firestore.rules`.
- **Auth**: Enable Google and Anonymous sign-in.
- **Firestore**: Start in production mode. The rules will automatically manage permissions for Student IDs and Admins.

### 2. AI Smart Suggestions
Powered by Genkit and Gemini. To enable:
1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Add it to your `.env` or deployment environment as `GOOGLE_GENAI_API_KEY`.

### 3. Institutional Access
- Restricted to `@neu.edu.ph` accounts.
- Super Admins: `alexis.pidlaoan@neu.edu.ph` and `pampa4858@gmail.com`.

## 📂 Project Structure
- `/admin`: Management for users, colleges, and analytics.
- `/dashboard`: Student-facing check-in and history.
- `/ai`: Genkit flows for smart features.
