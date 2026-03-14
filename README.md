
# NEU Library Visitor Management System

A digital logbook application for New Era University to track and analyze library usage.

## 🚀 Quick Start

1. **Setup Environment**:
   - Create a `.env` file and add `GOOGLE_GENAI_API_KEY=your_key_here` (get it from Google AI Studio).
2. **Firebase Setup**:
   - Enable **Google** and **Anonymous** authentication in Firebase Console.
   - Create a **Firestore** database in production mode.
3. **Run App**:
   ```bash
   npm install
   npm run dev
   ```

## 🛠 Features
- **Institutional Login**: Restricted to `@neu.edu.ph` accounts.
- **Terminal Mode**: Fast check-in via Student ID.
- **Admin Dashboard**: Real-time stats, trends, and department analytics.
- **AI Suggester**: Smart visit purpose suggestions powered by Gemini.
- **User Control**: Ability to block/unblock users for security.

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
