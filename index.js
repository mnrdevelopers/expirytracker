const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
admin.initializeApp();

// Email configuration (FREE - using Gmail)
const emailConfig = {
    service: 'gmail',
    auth: {
        user: functions.config().gmail?.email || 'your-email@gmail.com',
        pass: functions.config().gmail?.password || 'your-app-password'
    }
};

const transporter = nodemailer.createTransport(emailConfig);

// Cloud Function to send email notifications for expiring documents
exports.sendEmailExpiryNotification = functions.firestore
    .document('documents/{docId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();
        
        // Check if expiry date changed
        const newExpiry = new Date(newData.expiryDate);
        const oldExpiry = new Date(previousData.expiryDate);
        
        if (newExpiry.getTime() === oldExpiry.getTime()) {
            return null; // Expiry date didn't change
        }
        
        const today = new Date();
        const daysRemaining = Math.ceil((newExpiry - today) / (1000 * 60 * 60 * 24));
        
        // Only send notifications for specific days
        if ([1, 7, 30].includes(daysRemaining) || daysRemaining <= 0) {
            await sendEmailNotificationToUser(newData.userId, newData, daysRemaining);
        }
        
        return null;
    });

// Scheduled function to check expiring documents daily at 9 AM
exports.checkExpiringDocuments = functions.pubsub.schedule('0 9 * * *').onRun(async (context) => {
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
            await sendEmailNotificationToUser(docData.userId, { ...docData, id: doc.id }, daysRemaining);
        }
    }
    
    // Also check for expired documents
    const expiredDocs = await admin.firestore()
        .collection('documents')
        .where('expiryDate', '<', today.toISOString().split('T')[0])
        .get();
    
    for (const doc of expiredDocs.docs) {
        const docData = doc.data();
        await sendEmailNotificationToUser(docData.userId, { ...docData, id: doc.id }, 0);
    }
    
    console.log(`Checked ${expiringDocs.size + expiredDocs.size} documents for expiry`);
    return null;
});

// Helper function to send email notification to user
async function sendEmailNotificationToUser(userId, docData, daysRemaining = null) {
    try {
        // Get user data
        const user = await admin.auth().getUser(userId);
        const userEmail = user.email;
        const userName = user.displayName || 'User';
        
        if (!userEmail) {
            console.log('No email found for user');
            return;
        }

        // Get user's email preferences
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const preferences = userData.emailPreferences || {};
        
        // Check if user has disabled email notifications for this reminder period
        if (!shouldSendEmailNotification(preferences, daysRemaining)) {
            console.log('User has disabled email notifications for this reminder period');
            return;
        }

        // Create and send email
        const emailContent = createEmailContent(userName, docData, daysRemaining);
        await sendEmail(userEmail, emailContent);
        
        console.log(`Email notification sent to ${userEmail} for document: ${docData.name}`);
        
        // Log the notification in user's document
        await admin.firestore().collection('notificationLogs').add({
            userId: userId,
            type: 'email',
            documentId: docData.id,
            documentName: docData.name,
            daysRemaining: daysRemaining,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            recipient: userEmail
        });
        
    } catch (error) {
        console.error('Error sending email notification:', error);
        throw error;
    }
}

// Check if we should send email notification based on user preferences
function shouldSendEmailNotification(preferences, daysRemaining) {
    if (daysRemaining <= 0) {
        return preferences.notifyExpired !== false;
    } else if (daysRemaining === 1) {
        return preferences.notify1Day !== false;
    } else if (daysRemaining === 7) {
        return preferences.notify7Days !== false;
    } else if (daysRemaining === 30) {
        return preferences.notify30Days !== false;
    }
    return true; // Default to true if no preference set
}

// Create email content
function createEmailContent(userName, docData, daysRemaining) {
    const docName = docData.name || 'Document';
    const docType = docData.type || 'document';
    const docNumber = docData.number || 'N/A';
    const expiryDate = new Date(docData.expiryDate).toLocaleDateString();
    const issueDate = docData.issueDate ? new Date(docData.issueDate).toLocaleDateString() : 'N/A';
    
    let subject, body;
    
    if (daysRemaining <= 0) {
        subject = `🚨 EXPIRED: ${docName} - Immediate Action Required`;
        body = createExpiredEmailBody(userName, docName, docType, docNumber, expiryDate, issueDate);
    } else if (daysRemaining === 1) {
        subject = `⚠️ URGENT: ${docName} Expires Tomorrow`;
        body = createUrgentEmailBody(userName, docName, docType, docNumber, expiryDate, issueDate, daysRemaining);
    } else if (daysRemaining <= 7) {
        subject = `🔔 Important: ${docName} Expires in ${daysRemaining} Days`;
        body = createWarningEmailBody(userName, docName, docType, docNumber, expiryDate, issueDate, daysRemaining);
    } else {
        subject = `📋 Reminder: ${docName} Expires in ${daysRemaining} Days`;
        body = createReminderEmailBody(userName, docName, docType, docNumber, expiryDate, issueDate, daysRemaining);
    }
    
    return { subject, body };
}

// Email templates
function createExpiredEmailBody(userName, docName, docType, docNumber, expiryDate, issueDate) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .document-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .btn { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 Document Expired</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            
            <div class="alert">
                <h3>IMMEDIATE ACTION REQUIRED</h3>
                <p>Your document has <strong>EXPIRED</strong>. Please renew it immediately to avoid any issues.</p>
            </div>
            
            <div class="document-info">
                <h3>Document Details:</h3>
                <p><strong>Name:</strong> ${docName}</p>
                <p><strong>Type:</strong> ${docType}</p>
                <p><strong>Number:</strong> ${docNumber}</p>
                <p><strong>Expiry Date:</strong> <span style="color: #dc3545;">${expiryDate}</span></p>
                ${issueDate !== 'N/A' ? `<p><strong>Issue Date:</strong> ${issueDate}</p>` : ''}
            </div>
            
            <p>Please take immediate action to renew this document.</p>
            
            <a href="https://your-app-url.com/documents.html" class="btn">View in Expiry Tracker</a>
            
            <p>Best regards,<br>Expiry Tracker Team</p>
        </div>
        <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
}

function createUrgentEmailBody(userName, docName, docType, docNumber, expiryDate, issueDate, daysRemaining) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fd7e14; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .document-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .btn { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Document Expires Tomorrow</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            
            <div class="warning">
                <h3>URGENT REMINDER</h3>
                <p>Your document expires <strong>TOMORROW</strong>. Don't forget to renew it!</p>
            </div>
            
            <div class="document-info">
                <h3>Document Details:</h3>
                <p><strong>Name:</strong> ${docName}</p>
                <p><strong>Type:</strong> ${docType}</p>
                <p><strong>Number:</strong> ${docNumber}</p>
                <p><strong>Expiry Date:</strong> <span style="color: #fd7e14;">${expiryDate}</span></p>
                ${issueDate !== 'N/A' ? `<p><strong>Issue Date:</strong> ${issueDate}</p>` : ''}
            </div>
            
            <p>Please make arrangements to renew this document before it expires.</p>
            
            <a href="https://your-app-url.com/documents.html" class="btn">View in Expiry Tracker</a>
            
            <p>Best regards,<br>Expiry Tracker Team</p>
        </div>
        <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
}

function createWarningEmailBody(userName, docName, docType, docNumber, expiryDate, issueDate, daysRemaining) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ffc107; color: #333; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
        .notice { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .document-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .btn { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 Document Expiring Soon</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            
            <div class="notice">
                <h3>EXPIRY NOTICE</h3>
                <p>Your document expires in <strong>${daysRemaining} days</strong>.</p>
            </div>
            
            <div class="document-info">
                <h3>Document Details:</h3>
                <p><strong>Name:</strong> ${docName}</p>
                <p><strong>Type:</strong> ${docType}</p>
                <p><strong>Number:</strong> ${docNumber}</p>
                <p><strong>Expiry Date:</strong> <span style="color: #856404;">${expiryDate}</span></p>
                ${issueDate !== 'N/A' ? `<p><strong>Issue Date:</strong> ${issueDate}</p>` : ''}
            </div>
            
            <p>We recommend starting the renewal process soon to avoid any last-minute issues.</p>
            
            <a href="https://your-app-url.com/documents.html" class="btn">View in Expiry Tracker</a>
            
            <p>Best regards,<br>Expiry Tracker Team</p>
        </div>
        <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
}

function createReminderEmailBody(userName, docName, docType, docNumber, expiryDate, issueDate, daysRemaining) {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
        .reminder { background: #e2e3e5; border: 1px solid #d6d8db; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .document-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .btn { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Expiry Reminder</h1>
        </div>
        <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            
            <div class="reminder">
                <h3>FRIENDLY REMINDER</h3>
                <p>Your document expires in <strong>${daysRemaining} days</strong>.</p>
            </div>
            
            <div class="document-info">
                <h3>Document Details:</h3>
                <p><strong>Name:</strong> ${docName}</p>
                <p><strong>Type:</strong> ${docType}</p>
                <p><strong>Number:</strong> ${docNumber}</p>
                <p><strong>Expiry Date:</strong> ${expiryDate}</p>
                ${issueDate !== 'N/A' ? `<p><strong>Issue Date:</strong> ${issueDate}</p>` : ''}
            </div>
            
            <p>This is an early reminder to help you plan for the renewal process.</p>
            
            <a href="https://your-app-url.com/documents.html" class="btn">View in Expiry Tracker</a>
            
            <p>Best regards,<br>Expiry Tracker Team</p>
        </div>
        <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
}

// Send email function
async function sendEmail(to, emailContent) {
    const mailOptions = {
        from: `"Expiry Tracker" <${emailConfig.auth.user}>`,
        to: to,
        subject: emailContent.subject,
        html: emailContent.body
    };
    
    await transporter.sendMail(mailOptions);
}

// Manual email notification trigger
exports.sendManualEmailNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { userId, docId } = data;
    
    // Verify the user is sending to themselves
    if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Can only send notifications to yourself');
    }
    
    // Get document data
    const docSnapshot = await admin.firestore().collection('documents').doc(docId).get();
    if (!docSnapshot.exists) {
        throw new functions.https.HttpsError('not-found', 'Document not found');
    }
    
    const docData = docSnapshot.data();
    const daysRemaining = getDaysRemaining(docData.expiryDate);
    
    await sendEmailNotificationToUser(userId, docData, daysRemaining);
    
    return { success: true, message: 'Test email notification sent successfully' };
});

// Utility function to calculate days remaining
function getDaysRemaining(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
