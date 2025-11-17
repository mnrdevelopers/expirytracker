// onesignal-config.js
class OneSignalManager {
    constructor() {
        this.initialized = false;
        this.onesignalAppId = null;
    }

    async init() {
        try {
            // Get OneSignal config from Firebase Remote Config
            await this.fetchOneSignalConfig();
            
            if (!this.onesignalAppId) {
                console.warn('OneSignal App ID not configured');
                return false;
            }

            // Initialize OneSignal
            await this.initializeOneSignal();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('OneSignal initialization failed:', error);
            return false;
        }
    }

    async fetchOneSignalConfig() {
        try {
            await firebase.remoteConfig().fetchAndActivate();
            const remoteConfig = firebase.remoteConfig();
            
            this.onesignalAppId = remoteConfig.getString('onesignal_app_id');
            console.log('OneSignal App ID:', this.onesignalAppId);
            
        } catch (error) {
            console.error('Error fetching OneSignal config:', error);
        }
    }

    initializeOneSignal() {
        return new Promise((resolve, reject) => {
            // Load OneSignal SDK
            const script = document.createElement('script');
            script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
            script.async = true;
            script.onload = () => {
                window.OneSignal = window.OneSignal || [];
                
                OneSignal.push(function() {
                    OneSignal.init({
                        appId: this.onesignalAppId,
                        safari_web_id: "", // Optional: Safari web push ID
                        notifyButton: {
                            enable: false, // Set to true if you want the notification bell
                        },
                        allowLocalhostAsSecureOrigin: true,
                    });
                    
                    OneSignal.on('subscriptionChange', (isSubscribed) => {
                        console.log("The user's subscription state is now:", isSubscribed);
                        this.handleSubscriptionChange(isSubscribed);
                    });

                    OneSignal.getUserId().then((userId) => {
                        if (userId) {
                            this.saveOneSignalUserId(userId);
                        }
                    });

                    resolve();
                }.bind(this));
            };
            
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async handleSubscriptionChange(isSubscribed) {
        if (isSubscribed && currentUser) {
            const userId = await OneSignal.getUserId();
            if (userId) {
                await this.saveOneSignalUserId(userId);
            }
        }
    }

    async saveOneSignalUserId(oneSignalUserId) {
        if (!currentUser) return;

        try {
            await db.collection('users').doc(currentUser.uid).set({
                oneSignalUserId: oneSignalUserId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('OneSignal user ID saved to Firestore');
        } catch (error) {
            console.error('Error saving OneSignal user ID:', error);
        }
    }

    async getOneSignalUserId() {
        if (!currentUser) return null;

        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            return userDoc.exists ? userDoc.data().oneSignalUserId : null;
        } catch (error) {
            console.error('Error getting OneSignal user ID:', error);
            return null;
        }
    }

    // Send push notification to specific user
    async sendPushNotification(userId, title, message, data = {}) {
        if (!this.initialized) {
            console.warn('OneSignal not initialized');
            return false;
        }

        try {
            // Get the OneSignal user ID for the target user
            const userDoc = await db.collection('users').doc(userId).get();
            const oneSignalUserId = userDoc.data()?.oneSignalUserId;

            if (!oneSignalUserId) {
                console.warn('No OneSignal user ID found for user:', userId);
                return false;
            }

            // In a real implementation, you'd call your backend API here
            // This is a client-side simulation - actual push should be server-side
            console.log('Simulating push notification:', {
                to: oneSignalUserId,
                title: title,
                message: message,
                data: data
            });

            return true;
        } catch (error) {
            console.error('Error sending push notification:', error);
            return false;
        }
    }

    // Send push notification to all users (admin function)
    async sendPushToAllUsers(title, message, data = {}) {
        if (!this.initialized) return false;

        try {
            // This would typically be done from your backend
            console.log('Simulating push to all users:', {
                title: title,
                message: message,
                data: data
            });

            return true;
        } catch (error) {
            console.error('Error sending push to all users:', error);
            return false;
        }
    }

    // Check if notifications are enabled
    async areNotificationsEnabled() {
        if (!this.initialized) return false;
        
        return new Promise((resolve) => {
            OneSignal.push(function() {
                OneSignal.isPushNotificationsEnabled((isEnabled) => {
                    resolve(isEnabled);
                });
            });
        });
    }

    // Request notification permission
    async requestNotificationPermission() {
        if (!this.initialized) return false;

        return new Promise((resolve) => {
            OneSignal.push(function() {
                OneSignal.showSlidedownPrompt().then(() => {
                    resolve(true);
                }).catch(() => {
                    resolve(false);
                });
            });
        });
    }
}

// Create global instance
window.oneSignalManager = new OneSignalManager();
