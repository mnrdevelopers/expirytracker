// firebase-config.js
// Firebase configuration
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
const remoteConfig = firebase.remoteConfig();

// Configure Remote Config
remoteConfig.settings = {
  minimumFetchIntervalMillis: 3600000, // 1 hour
  fetchTimeoutMillis: 60000, // 1 minute
};

// Set default values for Remote Config
remoteConfig.defaultConfig = {
  'onesignal_app_id': '',
  'onesignal_api_key': '',
  'onesignal_web_push_key': ''
};

// Make services globally accessible
window.auth = auth;
window.db = db;
window.remoteConfig = remoteConfig;
