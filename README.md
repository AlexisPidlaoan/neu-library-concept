
# NEU Library Visitor Management System

A digital logbook application for New Era University to track and analyze library usage.

## 🚀 Detailed Setup Guide

### 1. Firebase Console Configuration
To get the app working, you need to configure your project in the [Firebase Console](https://console.firebase.google.com/):

1. **Open Project**: Select your project from the main list.
2. **Find Authentication**:
   - Look at the **left sidebar menu**.
   - Click on the **"Build"** category to expand it.
   - Click on **"Authentication"**.
   - Click the **"Get Started"** button (if you haven't yet).
   - Go to the **"Sign-in method"** tab at the top.
   - Click **"Add new provider"** and select **Google**. Enable it and save.
   - Click **"Add new provider"** again and select **Anonymous**. Enable it and save.
3. **Setup Firestore Database**:
   - In the same **"Build"** menu on the left, click **"Firestore Database"**.
   - Click **"Create database"**.
   - Select your preferred location and start in **"Production Mode"**. (The security rules included in this code will automatically handle permissions).

### 2. Google AI Studio (Gemini)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create your API key.
3. In your project's root folder, create a file named `.env` and add:
   ```
   GOOGLE_GENAI_API_KEY=your_key_here
   ```

### 3. Running the App
1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start development**:
   ```bash
   npm run dev
   ```

## 📂 Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: NEU Library System"
# Create a repo on GitHub then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## 🛠 Features
- **Institutional Login**: Restricted to `@neu.edu.ph` accounts.
- **Terminal Mode**: Fast check-in via Student ID.
- **Admin Dashboard**: Real-time stats, trends, and department analytics.
- **AI Suggester**: Smart visit purpose suggestions powered by Gemini.
- **User Control**: Ability to block/unblock users for security.
