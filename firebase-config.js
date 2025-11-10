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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Make sure they are globally accessible
window.auth = auth;
window.db = db;
