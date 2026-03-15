# 📚 NEU Library Visitor Management System

A dedicated digital logbook and analytics platform for **New Era University (NEU)** to monitor, manage, and analyze library usage efficiently.

## 🌟 Overview

The NEU Library System replaces traditional paper-based logs with a modern, high-speed terminal and administrative dashboard. It is designed to handle thousands of daily student entries while providing the administration with real-time data insights.

### Key Features
- **Dual-Mode Login**: Tap RFID/Enter Student ID for instant access or use Institutional Google Login.
- **Smart Check-in**: AI-assisted "Purpose of Visit" suggestions to speed up the entry process.
- **Admin Dashboard**: Real-time traffic trends, department distribution (CAS, CBA, CICS, etc.), and peak hour analytics.
- **Security & Compliance**: Restricted to `@neu.edu.ph` accounts with built-in access control for blocked users.
- **Institutional Branding**: Themed with NEU's signature colors (Blue, Beige, Red, Green, and Yellow).

---

## 🔄 Operational Flow

### 1. Student Entry (Terminal Mode)
- **ID Verification**: Student enters their ID (e.g., `21-12345-678`).
- **First-Time Users**: If the ID isn't linked, the student is prompted to sign in with their Google account once to verify their identity.
- **Returning Users**: System recognizes the ID instantly and skips the Google login, proceeding directly to the Check-in form.
- **Logging**: Student selects their Department, Program, and Purpose of Visit.
- **Confirmation**: A success notification appears, and the entry is recorded in Firestore.

### 2. Administrative Oversight
- **Dashboard**: Admins monitor live visitor counts and department-wise breakdowns.
- **User Management**: Admins can manually update Student IDs, grant admin privileges, or block users from entering the library.
- **College Management**: Dynamic control over the list of university departments and programs.
- **Reporting**: Export detailed visit logs to PDF for institutional reporting.

---

## 🛠️ Instructions for Use

### For Administrators (Initial Setup)
1. **Login**: Sign in using institutional gmail.
2. **Seed Data**: Go to **User Management** and click **"Seed Sample Data"**. This populates the system with test students (like Juan Dela Cruz) and historical visit logs so you can see the charts in action immediately.
3. **Configure Departments**: Use **College Management** to add or edit NEU departments as they evolve.

### For Library Staff
- Monitor the **Visitor Dashboard** during peak hours to ensure the terminal is flowing smoothly.
- Use the **Search** feature in the detailed log to verify specific entries if needed.

##📖 Student Entry Guide: How to Use the Terminal
Welcome to the NEU Library Visitor Log System. Please follow these steps to record your visit:

Step 1: Identification
•	Student ID / RFID: Type your School ID (Format: YY-XXXXX-XXX) into the terminal or scan your RFID-compatible card.
•	Email Lookup: Alternatively, you may sign in using your @neu.edu.ph institutional email.
•	Guest Access: If your ID is not yet registered in the system, you may proceed as a guest or first-time user to link your account for future ease of access.

Step 2: Profile Verification
•	Once identified, the system will display your real-time visitor profile, including your name and department.
•	Note: If you have been restricted by library administration, an "Access Denied" overlay will appear, and you must contact the librarian.

Step 3: Select Department and Course
•	Verify your respective college (e.g., CICS, CAS, CBA, etc.) from the list of supported departments.
•	Ensure your specific course or program information is accurate before proceeding.

Step 4: Purpose of Visit
•	Choose your primary reason for visiting the library from the following options:
1.	Reading Books 
2.	Thesis / Research 
3.	Use of Computer 
4.	Doing Assignments 
5.	General Visit / Viewing 
6.	Borrowing / Returning Books 
7.	Group Study 

Step 5: Confirm Entry
•	Click the Submit button to log your visit instantly into the database.
•	A Success Overlay will appear for 4 seconds, showing a "Welcome to NEU" or confirmation message to signal your entry is recorded.

---

## 🎨 System Color Palette
- **Primary Blue**: `#003399` (Headers & Primary Actions)
- **Institutional Beige**: `#D1C4B5` (Main Background)
- **Success Green**: `#00A859` (Check-in & Trends)
- **Warning Yellow**: `#FFD54F` (Accents & Highlights)
- **Alert Red**: `#ED1C24` (Blocked Users & Branding)

---

© 2024 New Era University Library. All rights reserved.
