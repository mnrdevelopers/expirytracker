const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Cloud Function to send push notifications
exports.sendExpiryNotification = functions.firestore
    .document('documents/{docId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();
        
        // Check if expiry date changed or document is newly expiring
        const newExpiry = new Date(newData.expiryDate);
        const oldExpiry = new Date(previousData.expiryDate);
        const today = new Date();
        
        const daysRemaining = Math.ceil((newExpiry - today) / (1000 * 60 * 60 * 24));
        
        // Only send notifications for specific days
        if ([1, 7, 30].includes(daysRemaining) || daysRemaining <= 0) {
            await sendNotificationToUser(newData.userId, newData, daysRemaining);
        }
        
        return null;
    });

// Manual notification trigger
exports.sendManualNotification = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { userId, title, body, data: notificationData } = data;
    
    // Verify the user is sending to themselves
    if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Can only send notifications to yourself');
    }
    
    await sendNotificationToUser(userId, { title, body, ...notificationData });
    
    return { success: true };
});

// Helper function to send notification to user
async function sendNotificationToUser(userId, docData, daysRemaining = null) {
    try {
        // Get user's FCM tokens
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            console.log('User document not found');
            return;
        }
        
        const userData = userDoc.data();
        const fcmTokens = userData.fcmTokens || [];
        
        if (fcmTokens.length === 0) {
            console.log('No FCM tokens found for user');
            return;
        }
        
        // Determine notification content based on days remaining
        let title, body;
        if (daysRemaining !== null) {
            if (daysRemaining <= 0) {
                title = 'Document Expired!';
                body = `Your ${docData.name} (${docData.type}) has expired`;
            } else if (daysRemaining === 1) {
                title = 'Document Expires Tomorrow!';
                body = `Your ${docData.name} (${docData.type}) expires tomorrow`;
            } else if (daysRemaining <= 7) {
                title = 'Document Expiring Soon';
                body = `Your ${docData.name} (${docData.type}) expires in ${daysRemaining} days`;
            } else {
                title = 'Document Expiry Reminder';
                body = `Your ${docData.name} (${docData.type}) expires in ${daysRemaining} days`;
            }
        } else {
            title = docData.title || 'Expiry Tracker';
            body = docData.body || 'You have a new notification';
        }
        
        // Create notification payload
        const message = {
            notification: {
                title: title,
                body: body
            },
            data: {
                title: title,
                body: body,
                docId: docData.id || '',
                docName: docData.name || '',
                docType: docData.type || '',
                page: 'documents.html',
                type: daysRemaining <= 0 ? 'expired' : 'expiring',
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            tokens: fcmTokens
        };
        
        // Send notification
        const response = await admin.messaging().sendMulticast(message);
        
        console.log(`${response.successCount} notifications sent successfully`);
        
        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(fcmTokens[idx]);
                }
            });
            
            // Remove failed tokens from user document
            await admin.firestore().collection('users').doc(userId).update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
            });
            
            console.log(`Removed ${failedTokens.length} invalid tokens`);
        }
        
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
}

// Scheduled function to check expiring documents daily
exports.checkExpiringDocuments = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    // Query documents expiring in the next 30 days
    const expiringDocs = await admin.firestore()
        .collection('documents')
        .where('expiryDate', '>=', today.toISOString().split('T')[0])
        .where('expiryDate', '<=', thirtyDaysFromNow.toISOString().split('T')[0])
        .get();
    
    for (const doc of expiringDocs.docs) {
        const docData = doc.data();
        const expiryDate = new Date(docData.expiryDate);
        const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        // Send notification for specific reminder days
        if ([1, 7, 30].includes(daysRemaining)) {
            await sendNotificationToUser(docData.userId, { ...docData, id: doc.id }, daysRemaining);
        }
    }
    
    console.log(`Checked ${expiringDocs.size} documents for expiry`);
    return null;
});
