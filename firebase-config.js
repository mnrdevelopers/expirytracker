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

// Make sure they are globally accessible
window.auth = auth;
window.db = db;

// Initialize Messaging only if it's available (in supported environments)
let messaging = null;
if (firebase.messaging && typeof firebase.messaging === 'function') {
    try {
        messaging = firebase.messaging();
        
        // Configure messaging for background notifications
        messaging.usePublicVapidKey('YOUR_VAPID_KEY_HERE'); // Replace with your VAPID key
        
    } catch (error) {
        console.warn('Firebase Messaging initialization failed:', error);
    }
} else {
    console.warn('Firebase Messaging is not available in this environment');
}
