// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Corrected import (capital 'S')
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "react-livechat-ff02b.firebaseapp.com",
  projectId: "react-livechat-ff02b",
  storageBucket: "react-livechat-ff02b.appspot.com",
  messagingSenderId: "651248300449",
  appId: "1:651248300449:web:ac38a7695b587adb0f5be0",
  measurementId: "G-J0F7L1NC7Z",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize services with the `app` instance
export const auth = getAuth(app);
export const db = getFirestore(app); // Corrected: `getFirestore`
export const storage = getStorage(app);
