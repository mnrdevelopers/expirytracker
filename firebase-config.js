// Firebase configuration
const firebaseConfig = {
    // Replace with your Firebase project configuration
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Firestore settings for offline support
db.enablePersistence()
  .catch((err) => {
      console.log('Firebase persistence error: ', err);
  });
