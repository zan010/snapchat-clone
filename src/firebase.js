import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ⚠️ IMPORTANT: Replace these with your own Firebase config!
// Go to https://console.firebase.google.com/
// 1. Create a new project
// 2. Add a web app
// 3. Copy the config object here
// 4. Enable Authentication (Email/Password)
// 5. Enable Firestore Database
// 6. Enable Storage

const firebaseConfig = {
  apiKey: "AIzaSyAbwpoci177zAfWo-VmIetWZ_9xYUYkfcA",
  authDomain: "snapchat-e5d38.firebaseapp.com",
  projectId: "snapchat-e5d38",
  storageBucket: "snapchat-e5d38.firebasestorage.app",
  messagingSenderId: "753738851188",
  appId: "1:753738851188:web:ef89bbaa5b4dd59c89c221",
  measurementId: "G-V0YHG4GGJ0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

