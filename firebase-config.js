// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBnRKEd7Up3qbwC3mqCQhQLD2_Wd11rdzw",
  authDomain: "expiry-tracker-aadcc.firebaseapp.com",
  projectId: "expiry-tracker-aadcc",
  storageBucket: "expiry-tracker-aadcc.firebasestorage.app",
  messagingSenderId: "17745090137",
  appId: "1:17745090137:web:077f0c5e0e1eca1fd34348",
  measurementId: "G-ST64HBYQLD"
};

// Check if Firebase is already initialized
if (!firebase.apps.length) {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Initialize Cloud Functions
const functions = firebase.functions();

// Make sure they are globally accessible
window.auth = auth;
window.db = db;

// Initialize Messaging
let messaging = null;
try {
    messaging = firebase.messaging();
    
    // Use your VAPID key here (get from Firebase Console → Cloud Messaging)
    messaging.usePublicVapidKey('BNIPHzoLaLW03Tpb0qrqIMgx5M-aFVOndk9-EtIljjiz2NCJkrLzXHxBgmClb7KdX08BOU5fffhDM08Dzs1G8nE');
    
} catch (error) {
    console.warn('Firebase Messaging initialization failed:', error);
}
