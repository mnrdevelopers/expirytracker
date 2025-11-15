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

// Initialize Firebase services with error handling
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Initialize Firebase Functions with error handling
let functions = null;
try {
    if (firebase.functions) {
        functions = firebase.functions();
        // If you want to use emulator for development, uncomment below:
        // functions.useEmulator('localhost', 5001);
    } else {
        console.warn('Firebase Functions not available');
    }
} catch (error) {
    console.warn('Firebase Functions initialization failed:', error);
}

// Initialize Firebase Messaging with error handling
let messaging = null;
try {
    if (firebase.messaging && typeof firebase.messaging === 'function') {
        messaging = firebase.messaging();
        
        // Use your VAPID key here (get from Firebase Console → Cloud Messaging)
        // Replace 'YOUR_VAPID_KEY_HERE' with your actual VAPID key
        messaging.usePublicVapidKey('BNIPHzoLaLW03Tpb0qrqIMgx5M-aFVOndk9-EtIljjiz2NCJkrLzXHxBgmClb7KdX08BOU5fffhDM08Dzs1G8nE');
        
        console.log('Firebase Messaging initialized successfully');
    } else {
        console.warn('Firebase Messaging not available');
    }
} catch (error) {
    console.warn('Firebase Messaging initialization failed:', error);
}

// Export services for use in other files
window.firebaseServices = {
    auth,
    db,
    storage,
    functions,
    messaging,
    firebaseConfig
};
