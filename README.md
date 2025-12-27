# 👻 SnapClone

A fully functional Snapchat clone that works on mobile devices! Send snaps, maintain streaks, and add friends - just like the real thing.

![SnapClone](https://img.shields.io/badge/SnapClone-FFFC00?style=for-the-badge&logo=snapchat&logoColor=black)

## ✨ Features

- 📸 **Camera & Snaps** - Capture photos using your device camera or upload from gallery
- 👻 **Disappearing Messages** - Snaps disappear after viewing (just like Snapchat!)
- 🔥 **Streaks** - Maintain daily snap streaks with friends
- 👥 **Friend System** - Add friends by username, accept/decline requests
- 📱 **Mobile PWA** - Install on your phone like a native app
- 🔐 **Authentication** - Secure signup/login with Firebase
- ⚡ **Real-time** - Instant updates when you receive snaps

## 🚀 Quick Setup Guide

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Firebase (FREE)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Name it something like "snapclone-app"
4. Disable Google Analytics (optional, keeps it simpler)
5. Click **Create project**

### Step 3: Add a Web App to Firebase

1. In your Firebase project, click the **web icon** (</>) to add a web app
2. Name it "SnapClone Web"
3. **DON'T** check "Firebase Hosting" for now
4. Click **Register app**
5. Copy the `firebaseConfig` object shown

### Step 4: Update Firebase Config

Open `src/firebase.js` and replace the config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 5: Enable Firebase Services

In Firebase Console, enable these services:

#### Authentication
1. Go to **Build → Authentication**
2. Click **Get started**
3. Go to **Sign-in method** tab
4. Enable **Email/Password**

#### Firestore Database
1. Go to **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location close to you
5. Click **Enable**

#### Storage
1. Go to **Build → Storage**
2. Click **Get started**
3. Choose **Start in test mode**
4. Click **Next** and then **Done**

### Step 6: Set Firestore Security Rules

Go to **Firestore Database → Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null;
    }
    
    // Friend requests
    match /friendRequests/{requestId} {
      allow read, write: if request.auth != null;
    }
    
    // Snaps
    match /snaps/{snapId} {
      allow read, write: if request.auth != null;
    }
    
    // Streaks
    match /streaks/{streakId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 7: Set Storage Security Rules

Go to **Storage → Rules** and paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /snaps/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 8: Generate PWA Icons (Optional)

1. Open `generate-icons.html` in a browser
2. Right-click each canvas and save to the `public` folder with the correct names

### Step 9: Run the App!

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 📱 Installing on Your Phone

### Method 1: Local Network (Same WiFi)

1. Run the app with `npm run dev`
2. Find your computer's local IP address:
   - Windows: `ipconfig` → Look for IPv4 Address
   - Mac: System Preferences → Network → Your IP
3. On your phone, open: `http://YOUR_IP:5173`
4. On iOS: Tap Share → "Add to Home Screen"
5. On Android: Tap menu → "Add to Home screen" or "Install app"

### Method 2: Deploy Online (Recommended for sharing with friends)

#### Deploy to Vercel (Free)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign up and click "Import Project"
4. Select your GitHub repo
5. Click Deploy!
6. Share the URL with friends

#### Deploy to Firebase Hosting (Free)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select your project
# Set public directory to: dist
# Configure as SPA: Yes
npm run build
firebase deploy
```

## 🎮 How to Use

1. **Sign Up** - Create an account with your email
2. **Add Friends** - Go to Friends tab and search by username
3. **Accept Requests** - When someone adds you, accept their request
4. **Send Snaps** - Tap the camera button, take a photo, add caption, and send!
5. **View Snaps** - Tap on conversations with red rings to view snaps
6. **Maintain Streaks** - Snap back and forth every day to build streaks! 🔥

## 🔥 Streak System

- Streaks count how many consecutive days you've snapped with a friend
- Both users must send at least one snap within 24 hours
- If 24 hours pass without both users snapping, the streak resets!
- An ⏰ icon appears when your streak is about to expire

## 📁 Project Structure

```
snapchat/
├── public/
│   ├── favicon.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── MainLayout.jsx
│   │   ├── ChatList.jsx
│   │   ├── FriendsList.jsx
│   │   ├── Camera.jsx
│   │   ├── SnapViewer.jsx
│   │   └── Profile.jsx
│   ├── App.jsx
│   ├── firebase.js
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool with PWA support
- **Firebase** - Authentication, Firestore, Storage
- **Lucide React** - Icons
- **date-fns** - Date formatting

## ⚠️ Troubleshooting

### Camera not working?
- Make sure you're accessing via HTTPS or localhost
- Check browser permissions for camera access

### Firebase errors?
- Double-check your Firebase config in `src/firebase.js`
- Ensure all Firebase services are enabled
- Check that security rules are set correctly

### Can't install as PWA?
- You need to access via HTTPS (or localhost)
- Generate the PWA icons using `generate-icons.html`

## 📝 License

MIT License - feel free to use this for any purpose!

---

Made with 💛 - Now go snap your friends! 👻

