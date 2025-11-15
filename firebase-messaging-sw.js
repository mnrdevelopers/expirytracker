// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

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

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message: ', payload);
    
    const notificationTitle = payload.notification?.title || 'Expiry Tracker';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'expiry-tracker-notification',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    // Show notification
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open') {
        // Open the app
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('/dashboard.html') && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/dashboard.html');
                }
            })
        );
    } else if (event.action === 'dismiss') {
        // Notification dismissed, do nothing
    } else {
        // Default click behavior
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('/dashboard.html') && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/dashboard.html');
                }
            })
        );
    }
});
