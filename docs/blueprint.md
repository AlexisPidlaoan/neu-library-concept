# **App Name**: StudyFlow

## Core Features:

- User Account Management: Enables secure user authentication via Google Sign-In, strictly enforcing an @neu.edu.ph domain restriction. It checks the user's 'isBlocked' status in Firestore, denying access if blocked, and redirects authenticated users to the Check-in form. Also allows users to view basic profile details.
- Log New Library Visit: Enables authenticated users to easily record their entry to the library, specifying their purpose of visit and selected college from a dropdown.
- Personal Visit History: Provides each user with a dedicated section to review a list of all their past visit logs.
- Admin All Visits Dashboard: An administrative dashboard for 'admin' role users to view, search, and filter all recorded visitor logs across all colleges. This includes advanced filtering by date ranges (Today, This Week, This Month) and aggregation of visits grouped by college.
- Admin College Management: Allows administrators to add, edit, or remove college entries that appear in the visit log dropdown menu.
- Smart Purpose Suggester: A generative AI tool that suggests common 'purpose of visit' options or auto-completes user input for faster and more consistent logging.
- Admin User Management: Administrators can search the user collection by name, view user details, and toggle the 'isBlocked' status for individual user accounts with a dedicated button.

## Style Guidelines:

- Light color scheme to promote focus and clarity. Primary color: a deep, academic blue (#396EAD) to signify knowledge and concentration.
- Background color: an almost-white, heavily desaturated blue (#ECF0F4) for a clean, open feel.
- Accent color: a rich royal purple (#8766DA) for interactive elements and highlights, complementing the primary blue.
- Success message color: A vibrant green (#4CAF50) for positive feedback, such as the 'Welcome to NEU Library!' card.
- Body and headline font: 'Inter' (sans-serif) for its modern, neutral, and highly readable qualities, suitable for both textual content and data tables.
- Utilize a consistent set of simple, line-based icons for clear visual communication. Icons should align with common library, academic, and administrative themes (e.g., book, clock, gear, person).
- Adopt a clean, structured, and mobile-responsive layout, especially for the Student Check-in flow, that prioritizes readability and ease of data input. Forms should be straightforward with clear dropdowns and a prominent 'Sign in with Institutional ID' button. Dashboards should present information in organized tables or lists with clear filtering options.
- Implement subtle and purposeful animations for state changes (e.g., form submissions, data loading) to provide visual feedback without being distracting. Focus on smooth transitions, such as the appearance of a success card after check-in.