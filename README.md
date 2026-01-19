# To-Do List Application - Full Stack

A robust, full-stack Task Management application built with **Node.js**, **Express**, **MongoDB**, and **Vanilla JavaScript**. This project is production-ready, supporting secure authentication, real-time task tracking, and seamless account management.

![Task Management App](https://via.placeholder.com/800x400?text=Task+Management+App+Preview)

## 🚀 Key Features

### 👤 User Experience & Account Management
-   **Authentication**: Secure Signup & Login with JWT (JSON Web Tokens).
-   **Email Verification**: OTP-based verification for new accounts (prevents fake users).
-   **Password Recovery**: Secure Forgot Password flow with email OTPs.
-   **Account Deletion**: Users can permanently delete their account and data (GDPR compliant).
-   **Profile Customization**: "Full Name" customization during signup.
-   **Responsive Design**: Premium UI with glassmorphism, circular inputs, and mobile responsiveness.

### 📝 Task Management
-   **CRUD Operations**: Create, Read, Update, and Delete tasks instantly.
-   **Date Selector**: Scrollable **15-Day** date picker to plan ahead.
-   **Progress Tracking**: Dashboard with circular completion graphs and statistics.
-   **Categorization**: Separate views for "Pending", "Completed", and "All Tasks".

### ⚙️ Technical Highlights
-   **Single-Server Deployment**: Backend serves frontend static files for easy hosting (Render/Railway).
-   **Dynamic API URL**: Frontend automatically adapts to local (`localhost`) or cloud environments.
-   **Security**: `bcryptjs` for password hashing, `express-validator` for input sanitization.
-   **Database**: MongoDB Atlas for scalable cloud storage.

---

## 🛠️ Installation & Local Setup

### 1. Prerequisites
-   **Node.js** (v14+)
-   **MongoDB** (Local or Atlas Connection String)
-   **Gmail Account** (For sending OTPs - requires [App Password](https://myaccount.google.com/apppasswords))

### 2. Clone & Install
```bash
git clone <your-repo-url>
cd To-do-list
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/todolist

# Security
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d

# Email Service (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@todolist.com

# URL Configuration (Optional for local, Auto-detected in prod)
# FRONTEND_URL=http://localhost:5000
```

### 4. Run the Application
The application handles both backend API and frontend serving:

```bash
# Development (Auto-restart)
npm run dev

# Production
npm start
```
Visit `http://localhost:5000` in your browser.

---

## ☁️ Deployment Guide (Render.com)

This application is configured for seamless deployment on Render.

1.  **Push to GitHub**: Ensure your code is in a GitHub repository.
2.  **Create Web Service**:
    -   Go to [Render Dashboard](https://dashboard.render.com/).
    -   Click **New +** -> **Web Service**.
    -   Connect your repository.
3.  **Configure Settings**:
    -   **Build Command**: `npm install`
    -   **Start Command**: `npm start`
    -   **Environment Variables**: Add all variables from your `.env` file.
4.  **Deploy**: Click "Create Web Service". Render will build and deploy your app.

*See `DEPLOYMENT_GUIDE.md` for a detailed step-by-step walkthrough.*

---

## 📂 Project Structure

```
To-do-list/
├── config/             # DB Configuration
├── middleware/         # Auth & Validation Middleware
├── models/             # Mongoose Models (User, Task)
├── routes/             # API Routes (Auth, Tasks)
├── utils/              # Email & DB Utils
├── index.html          # Main Frontend Entry
├── script.js           # Frontend Logic (API Calls, UI)
├── style.css           # Global Styles
├── server.js           # Express App Entry & Static Serving
└── package.json        # Dependencies & Scripts
```

## 🧪 Testing

### Manual Verification
1.  **Signup**: Register with a real email to test OTP delivery.
2.  **Tasks**: Create a task for tomorrow and check the **15-day date selector**.
3.  **Delete**: Go to Sidebar -> Delete Account to test cleanup.

### API Testing
Import the collection into Postman or use the endpoints directly:
-   `POST /api/auth/signup`
-   `POST /api/auth/login`
-   `GET /api/tasks`
-   `DELETE /api/auth/delete`

---

## 📝 License
MIT License. Free to use and modify.

**Happy Task Managing! 🚀**
