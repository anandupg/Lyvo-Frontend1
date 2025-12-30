// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDzhAKzSVS-Y-s8s4yIufbGufzIWGg-hK0",
    authDomain: "lyvo-ce4ce.firebaseapp.com",
    projectId: "lyvo-ce4ce",
    storageBucket: "lyvo-ce4ce.firebasestorage.app",
    messagingSenderId: "369723896940",
    appId: "1:369723896940:web:110502102b415be5f59449",
    measurementId: "G-RW4WQDGN7R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

export default app;
