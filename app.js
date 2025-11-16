// App state
let currentUser = null;
let documents = [];
let notifications = [];
let unsubscribeDocuments = null;
let unsubscribeNotifications = null;

// DOM Elements
let authForm, authTitle, authSubmit, authSwitchLink, forgotPasswordLink;
let nameField, confirmPasswordField, authError, authSuccess;
let userEmail, logoutBtn, sidebarLogout;
let totalDocs, activeDocs, expiringDocs, expiredDocs, alertsList;
let documentsList, addDocumentBtn;
let addDocumentForm, cancelAdd;
let settingsForm;
let loading;

// Auth state
let isLoginMode = true;

// Initialize the app
function initApp() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            initializePageElements();
            updateUserProfile(user);
            setupDocumentsListener();
            setupNotificationsListener();
            
            // Redirect to dashboard if on login page
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.href.includes('index.html')) {
                window.location.href = 'dashboard.html';
            }
        } else {
            currentUser = null;
            cleanupListeners();
            
            // Redirect to login if not on login page
            if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/' && !window.location.href.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    });

    setupEventListeners();
}

// Initialize auth functionality for login page
function initAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            window.location.href = 'dashboard.html';
        }
    });

    initializeAuthElements();
    setupAuthEventListeners();
}

// DOM Elements Initialization
function initializeAuthElements() {
    authForm = getElement('auth-form');
    authTitle = getElement('auth-title');
    authSubmit = getElement('auth-submit');
    authSwitchLink = getElement('auth-switch-link');
    forgotPasswordLink = getElement('forgot-password-link');
    nameField = getElement('name-field');
    confirmPasswordField = getElement('confirm-password-field');
    authError = getElement('auth-error');
    authSuccess = getElement('auth-success');
}

function initializePageElements() {
    userEmail = getElement('user-email');
    logoutBtn = getElement('logout-btn');
    sidebarLogout = getElement('sidebar-logout');
    
    // Dashboard elements
    totalDocs = getElement('total-docs');
    activeDocs = getElement('active-docs');
    expiringDocs = getElement('expiring-docs');
    expiredDocs = getElement('expired-docs');
    alertsList = getElement('alerts-list');
    
    // Documents elements
    documentsList = getElement('documents-list');
    addDocumentBtn = getElement('add-document-btn');
    
    // Forms
    addDocumentForm = getElement('add-document-form');
    cancelAdd = getElement('cancel-add');
    settingsForm = getElement('settings-form');
    
    // Loading
    loading = getElement('loading');
}

// Event Listeners Setup
function setupAuthEventListeners() {
    addEventListener(authForm, 'submit', handleAuthSubmit);
    addEventListener(authSwitchLink, 'click', toggleAuthMode);
    addEventListener(forgotPasswordLink, 'click', handleForgotPassword);
}

function setupEventListeners() {
    // Enhanced logout button handling
    const logoutButtons = [
        'logout-btn',
        'sidebar-logout'
    ];
    
    logoutButtons.forEach(btnId => {
        const btn = getElement(btnId);
        if (btn) {
            addEventListener(btn, 'click', handleLogout);
        }
    });
    
    // Other event listeners...
    if (addDocumentBtn) {
        addEventListener(addDocumentBtn, 'click', () => navigateTo('add.html'));
    }
    if (cancelAdd) {
        addEventListener(cancelAdd, 'click', () => navigateTo('documents.html'));
    }
    
    setupMobileNavigation();
    
    // Notification bell
    const notificationBell = getElement('notification-bell');
    if (notificationBell) {
        addEventListener(notificationBell, 'click', () => navigateTo('notifications.html'));
    }
}

function setupAddDocumentForm() {
    if (addDocumentForm) {
        addEventListener(addDocumentForm, 'submit', handleAddDocument);
    }
}

// Authentication Functions
function toggleAuthMode(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    const config = isLoginMode ? {
        title: 'Login to Expiry Tracker',
        submit: 'Login',
        switchText: "Don't have an account? Sign up",
        showFields: false
    } : {
        title: 'Create an Account',
        submit: 'Sign Up',
        switchText: 'Already have an account? Login',
        showFields: true
    };
    
    authTitle.textContent = config.title;
    authSubmit.textContent = config.submit;
    authSwitchLink.textContent = config.switchText;
    nameField.style.display = config.showFields ? 'block' : 'none';
    confirmPasswordField.style.display = config.showFields ? 'block' : 'none';
    
    // Clear form and messages
    authForm.reset();
    clearMessages();
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const email = getElement('email').value;
    const password = getElement('password').value;
    
    try {
        if (isLoginMode) {
            await auth.signInWithEmailAndPassword(email, password);
            showSuccess('Login successful!');
        } else {
            const name = getElement('name').value;
            const confirmPassword = getElement('confirm-password').value;
            
            validateSignUp(name, password, confirmPassword);
            await handleSignUp(email, password, name);
            showSuccess('Account created successfully!');
        }
    } catch (error) {
        showAuthError(error.message);
    } finally {
        hideLoading();
    }
}

function validateSignUp(name, password, confirmPassword) {
    if (!name) throw new Error('Please enter your name');
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
}

async function handleSignUp(email, password, name) {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });
    
    // Create user document in Firestore with default notification preferences
    await db.collection('users').doc(userCredential.user.uid).set({
        name: name,
        email: email,
        notificationPreferences: getDefaultPreferences(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function handleForgotPassword(e) {
    e.preventDefault();
    const email = getElement('email').value;
    
    if (!email) {
        showAuthError('Please enter your email address');
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showAuthSuccess('Password reset email sent. Check your inbox.');
        })
        .catch(error => {
            showAuthError(error.message);
        });
}

function handleLogout() {
    auth.signOut()
        .then(() => {
            // Clear any stored data
            currentUser = null;
            documents = [];
            notifications = [];
            
            // Redirect to login page immediately
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Error logging out: ', error);
            showError('Error logging out: ' + error.message);
        });
}

// Notification Preferences Functions
async function getUserNotificationPreferences() {
    if (!currentUser) return getDefaultPreferences();
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return userData.notificationPreferences || getDefaultPreferences();
        }
    } catch (error) {
        console.error('Error getting user preferences:', error);
    }
    
    return getDefaultPreferences();
}

function getDefaultPreferences() {
    return {
        notify30Days: true,
        notify7Days: true,
        notify1Day: true,
        notifyExpired: true
    };
}

async function saveNotificationPreferences(preferences) {
    if (!currentUser) return false;
    
    try {
        await db.collection('users').doc(currentUser.uid).set({
            notificationPreferences: preferences
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('Error saving preferences:', error);
        return false;
    }
}

async function handleSavePreferences() {
    const preferences = {
        notify30Days: getCheckboxValue('notify-30-days'),
        notify7Days: getCheckboxValue('notify-7-days'),
        notify1Day: getCheckboxValue('notify-1-day'),
        notifyExpired: getCheckboxValue('notify-expired')
    };
    
    const success = await saveNotificationPreferences(preferences);
    if (success) {
        showToast('Notification preferences saved successfully', 'success');
    } else {
        showToast('Error saving preferences', 'error');
    }
}

// Documents Management
function setupDocumentsListener() {
    if (!currentUser) return;
    
    unsubscribeDocuments = db.collection('documents')
        .where('userId', '==', currentUser.uid)
        .orderBy('expiryDate', 'asc')
        .onSnapshot(handleDocumentsSnapshot, handleDocumentsError);
}

function handleDocumentsSnapshot(snapshot) {
    documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    updateUI();
    checkReminders();
}

function handleDocumentsError(error) {
    console.error('Error getting documents: ', error);
    showToast('Error loading documents', 'error');
}

function updateUI() {
    if (window.location.pathname.includes('dashboard.html') || window.location.href.includes('dashboard.html')) {
        updateDashboard();
    } else if (window.location.pathname.includes('documents.html') || window.location.href.includes('documents.html')) {
        renderDocuments();
    } else if (window.location.pathname.includes('add.html') || window.location.href.includes('add.html')) {
        setupAddDocumentForm();
    }
}

// Dashboard Functions
function loadDashboard() {
    if (documents.length > 0) {
        updateDashboard();
    }
}

function updateDashboard() {
    if (!totalDocs) return;
    
    const stats = calculateDocumentStats();
    
    totalDocs.textContent = stats.total;
    activeDocs.textContent = stats.active;
    expiringDocs.textContent = stats.expiring;
    expiredDocs.textContent = stats.expired;
    
    updateAlerts();
}

function calculateDocumentStats() {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
        total: documents.length,
        active: documents.filter(doc => {
            const expiryDate = new Date(doc.expiryDate);
            return expiryDate > now;
        }).length,
        expiring: documents.filter(doc => {
            const expiryDate = new Date(doc.expiryDate);
            return expiryDate > now && expiryDate <= thirtyDaysFromNow;
        }).length,
        expired: documents.filter(doc => {
            const expiryDate = new Date(doc.expiryDate);
            return expiryDate <= now;
        }).length
    };
}

function updateAlerts() {
    if (!alertsList) return;
    
    const alerts = generateAlerts();
    
    if (alerts.length === 0) {
        alertsList.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No upcoming alerts. All documents are up to date.</p></div>';
        return;
    }
    
    alertsList.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.type}">
            <span class="alert-icon ${alert.type}"></span>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-date">${alert.date}</div>
            </div>
        </div>
    `).join('');
}

function generateAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alerts = [];
    
    documents.forEach(doc => {
        const expiryDate = new Date(doc.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 30 && daysRemaining > 0) {
            alerts.push({
                type: 'expiring',
                title: `${doc.name} is expiring soon`,
                date: `Expires in ${daysRemaining} days`,
                docId: doc.id
            });
        } else if (daysRemaining <= 0) {
            alerts.push({
                type: 'expired',
                title: `${doc.name} has expired`,
                date: `Expired ${Math.abs(daysRemaining)} days ago`,
                docId: doc.id
            });
        }
    });
    
    return alerts.slice(0, 5); // Show only top 5 alerts
}

// Documents Page Functions
function loadDocuments() {
    if (documents.length > 0) {
        renderDocuments();
    }
}

function renderDocuments() {
    if (!documentsList) return;
    
    if (documents.length === 0) {
        showEmptyState();
        return;
    }
    
    documentsList.innerHTML = documents.map(doc => createDocumentCard(doc)).join('');
}

function showEmptyState() {
    documentsList.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <p>No documents found. <a href="add.html" id="add-first-doc">Add your first document</a></p>
            </div>
        </div>
    `;
}

function createDocumentCard(doc) {
    const status = getDocumentStatus(doc.expiryDate);
    const daysRemaining = getDaysRemaining(doc.expiryDate);
    
    return `
        <div class="document-card ${status}">
            <div class="document-header">
                <div class="document-type">${doc.type}</div>
            </div>
            <div class="document-name">${doc.name}</div>
            <div class="document-number">${doc.number}</div>
            <div class="document-footer">
                <div>Expires: ${formatDate(doc.expiryDate)}</div>
                <div class="days-badge ${status}">${daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}</div>
            </div>
        </div>
    `;
}

// Document CRUD Operations - Only Add functionality remains
async function handleAddDocument(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const docData = collectFormData();
        const file = getElement('file-upload')?.files[0];
        
        if (file) {
            await handleFileUpload(file, docData);
        } else {
            await db.collection('documents').add(docData);
        }
        
        showSuccess('Document added successfully');
        navigateTo('documents.html');
    } catch (error) {
        showError('Error adding document: ' + error.message);
    } finally {
        hideLoading();
    }
}

function collectFormData() {
    return {
        type: getElement('doc-type').value,
        name: getElement('doc-name').value,
        number: getElement('doc-number').value,
        issueDate: getElement('issue-date').value,
        expiryDate: getElement('expiry-date').value,
        notes: getElement('notes').value,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
}

async function handleFileUpload(file, docData) {
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`documents/${currentUser.uid}/${Date.now()}_${file.name}`);
    
    const snapshot = await fileRef.put(file);
    const url = await snapshot.ref.getDownloadURL();
    
    docData.fileUrl = url;
    await db.collection('documents').add(docData);
}

// Notifications System
function setupNotificationsListener() {
    if (!currentUser) return;
    
    unsubscribeNotifications = db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(handleNotificationsSnapshot, handleNotificationsError);
}

function handleNotificationsSnapshot(snapshot) {
    notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    updateUnreadCount();
    updateNotificationBadge();
    
    if (window.location.pathname.includes('notifications.html') || window.location.href.includes('notifications.html')) {
        renderNotifications();
    }
}

function handleNotificationsError(error) {
    console.error('Error getting notifications: ', error);
    // Display error to user only if on the notifications page
    if (window.location.pathname.includes('notifications.html') || window.location.href.includes('notifications.html')) {
        showToast('Error loading notifications. Check permissions.', 'error');
    }
}

function updateUnreadCount() {
    const unreadCount = notifications.filter(notification => !notification.read).length;
    updateBadge('notification-badge', unreadCount);
}

function updateBadge(elementId, count) {
    const badge = getElement(elementId);
    if (!badge) return;
    
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function updateNotificationBadge() {
    updateUnreadCount();
}

// Reminder System
async function checkReminders() {
    const preferences = await getUserNotificationPreferences();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const doc of documents) {
        const daysRemaining = getDaysRemaining(doc.expiryDate);
        // Use a composite key that includes the day to ensure we only remind once per day per type
        const alertKey = `notification_${doc.id}_${daysRemaining}_${today.toDateString()}`;
        
        // Check if this specific reminder (for this doc and this daysRemaining value) has already been sent today
        const lastAlertDate = localStorage.getItem(alertKey);
        
        if (!lastAlertDate && shouldCreateNotification(daysRemaining, preferences)) {
            await createNotificationForDocument(doc, daysRemaining);
            // Set the reminder flag in localStorage only after successful creation
            localStorage.setItem(alertKey, 'sent');
        }
    }
}

function shouldCreateNotification(daysRemaining, preferences) {
    if (daysRemaining <= 0) {
        return preferences.notifyExpired;
    } else if (daysRemaining === 1) {
        return preferences.notify1Day;
    } else if (daysRemaining === 7) {
        return preferences.notify7Days;
    } else if (daysRemaining === 30) {
        return preferences.notify30Days;
    }
    return false;
}

async function createNotificationForDocument(doc, daysRemaining) {
    let type, title, message;
    
    if (daysRemaining <= 0) {
        type = 'expired';
        title = '🚨 Document Expired';
        message = `Your document "${doc.name}" has expired and requires immediate attention.`;
    } else if (daysRemaining === 1) {
        type = 'expiring';
        title = '⚠️ Expires Tomorrow';
        message = `Your document "${doc.name}" expires tomorrow. Don't forget to renew it!`;
    } else if (daysRemaining === 7) {
        type = 'expiring';
        title = '🔔 Expiring Soon';
        message = `Your document "${doc.name}" expires in ${daysRemaining} days.`;
    } else if (daysRemaining === 30) {
        type = 'expiring';
        title = '📋 Expiry Reminder';
        message = `Your document "${doc.name}" expires in 30 days.`;
    }
    
    if (type && title && message) {
        await createNotification(type, title, message, doc.id, 'documents.html');
    }
}

async function createNotification(type, title, message, documentId = null, actionUrl = null) {
    if (!currentUser) return;
    
    try {
        const notificationData = {
            userId: currentUser.uid,
            type: type,
            title: title,
            message: message,
            documentId: documentId,
            actionUrl: actionUrl,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('notifications').add(notificationData);
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Notifications Page Functions
function loadNotifications() {
    if (notifications.length > 0) {
        renderNotifications();
    }
}

function setupNotificationsEvents() {
    const backBtn = getElement('back-btn');
    const markAllRead = getElement('mark-all-read');
    
    if (backBtn) addEventListener(backBtn, 'click', () => window.history.back());
    if (markAllRead) addEventListener(markAllRead, 'click', markAllNotificationsAsRead);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        addEventListener(btn, 'click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const filter = e.target.getAttribute('data-filter');
            renderNotifications(filter);
        });
    });
}

function renderNotifications(filter = 'all') {
    const notificationsList = getElement('notifications-list');
    if (!notificationsList) return;
    
    let filteredNotifications = filterNotifications(filter);
    
    if (filteredNotifications.length === 0) {
        showEmptyNotificationsState();
        return;
    }
    
    notificationsList.innerHTML = filteredNotifications.map(notification => 
        createNotificationItem(notification)
    ).join('');
    
    attachNotificationEventListeners();
}

function filterNotifications(filter) {
    switch (filter) {
        case 'expiring':
            return notifications.filter(n => n.type === 'expiring');
        case 'expired':
            return notifications.filter(n => n.type === 'expired');
        case 'unread':
            return notifications.filter(n => !n.read);
        default:
            return notifications;
    }
}

function showEmptyNotificationsState() {
    const notificationsList = getElement('notifications-list');
    notificationsList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-bell-slash"></i>
            <h3>No notifications</h3>
            <p>You're all caught up! New alerts will appear here.</p>
        </div>
    `;
}

function createNotificationItem(notification) {
    return `
        <div class="notification-item ${notification.type} ${notification.read ? '' : 'unread'}">
            <div class="notification-header">
                <h3 class="notification-title">${notification.title}</h3>
                <span class="notification-time">${formatNotificationTime(notification.createdAt)}</span>
            </div>
            <p class="notification-message">${notification.message}</p>
            <div class="notification-actions">
                ${!notification.read ? `
                    <button class="notification-action-btn primary mark-read-btn" data-id="${notification.id}">
                        Mark as Read
                    </button>
                ` : ''}
                <button class="notification-action-btn delete-btn" data-id="${notification.id}">
                    Delete
                </button>
                ${notification.actionUrl ? `
                    <button class="notification-action-btn primary view-btn" data-url="${notification.actionUrl}">
                        View
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function attachNotificationEventListeners() {
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
        addEventListener(btn, 'click', (e) => {
            const notificationId = e.target.getAttribute('data-id');
            markNotificationAsRead(notificationId);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        addEventListener(btn, 'click', (e) => {
            const notificationId = e.target.getAttribute('data-id');
            deleteNotification(notificationId);
        });
    });
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        addEventListener(btn, 'click', (e) => {
            const url = e.target.getAttribute('data-url');
            navigateTo(url);
        });
    });
}

async function markNotificationAsRead(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).update({
            read: true,
            readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllNotificationsAsRead() {
    try {
        const unreadNotifications = notifications.filter(n => !n.read);
        const batch = db.batch();
        
        unreadNotifications.forEach(notification => {
            const notificationRef = db.collection('notifications').doc(notification.id);
            batch.update(notificationRef, {
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        showToast('All notifications marked as read', 'success');
    } catch (error) {
        showError('Error marking notifications as read');
    }
}

async function deleteNotification(notificationId) {
    try {
        await db.collection('notifications').doc(notificationId).delete();
        showToast('Notification deleted', 'success');
    } catch (error) {
        showError('Error deleting notification');
    }
}

// Settings Functions
async function loadSettings() {
    const preferences = await getUserNotificationPreferences();
    
    // Set checkbox values based on preferences
    setCheckboxValue('notify-30-days', preferences.notify30Days);
    setCheckboxValue('notify-7-days', preferences.notify7Days);
    setCheckboxValue('notify-1-day', preferences.notify1Day);
    setCheckboxValue('notify-expired', preferences.notifyExpired);
    
    // Add event listener for save button
    const saveButton = document.getElementById('save-email-preferences');
    if (saveButton) {
        saveButton.addEventListener('click', handleSavePreferences);
    }
}

// Utility Functions
function getElement(id) {
    return document.getElementById(id);
}

function addEventListener(element, event, handler) {
    if (element && typeof element.addEventListener === 'function') {
        element.addEventListener(event, handler);
    }
}

function navigateTo(url) {
    window.location.href = url;
}

function showLoading() {
    if (loading) loading.classList.remove('hidden');
}

function hideLoading() {
    if (loading) loading.classList.add('hidden');
}

function showAuthError(message) {
    if (authError) {
        authError.textContent = message;
        authError.style.display = 'block';
        if (authSuccess) authSuccess.style.display = 'none';
    }
}

function showAuthSuccess(message) {
    if (authSuccess) {
        authSuccess.textContent = message;
        authSuccess.style.display = 'block';
        if (authError) authError.style.display = 'none';
    }
}

function clearMessages() {
    if (authError) {
        authError.textContent = '';
        authError.style.display = 'none';
    }
    if (authSuccess) {
        authSuccess.textContent = '';
        authSuccess.style.display = 'none';
    }
}

function showError(message) {
    console.error(message);
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function getDocumentStatus(expiryDate) {
    const daysRemaining = getDaysRemaining(expiryDate);
    
    if (daysRemaining <= 0) return 'expired';
    if (daysRemaining <= 30) return 'expiring';
    return 'active';
}

function getDaysRemaining(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatNotificationTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const notificationTime = timestamp.toDate();
    const diffMs = now - notificationTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return notificationTime.toLocaleDateString();
}

function setCheckboxValue(id, value) {
    const element = getElement(id);
    if (element) {
        element.checked = value;
    }
}

function getCheckboxValue(id) {
    const element = getElement(id);
    return element ? element.checked : false;
}

// Mobile Navigation
function setupMobileNavigation() {
    const menuToggle = getElement('menu-toggle');
    const closeSidebar = getElement('close-sidebar');
    const sidebar = getElement('sidebar');
    const overlay = getElement('sidebar-overlay');

    if (menuToggle && sidebar) {
        function openSidebar() {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeSidebarFunc() {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        addEventListener(menuToggle, 'click', openSidebar);
        if (closeSidebar) addEventListener(closeSidebar, 'click', closeSidebarFunc);
        if (overlay) addEventListener(overlay, 'click', closeSidebarFunc);

        // Close sidebar when clicking on a link
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            addEventListener(link, 'click', closeSidebarFunc);
        });
    }
}

// User Profile
function updateUserProfile(user) {
    if (!user) return;
    
    updateElementText('user-avatar', user.displayName?.charAt(0).toUpperCase() || 'U');
    updateElementText('user-name', user.displayName || 'User');
    updateElementText('user-email', user.email);
    updateElementText('current-email', user.email);
}

function updateElementText(id, text) {
    const element = getElement(id);
    if (element) element.textContent = text;
}

// Cleanup
function cleanupListeners() {
    if (unsubscribeDocuments) {
        unsubscribeDocuments();
        unsubscribeDocuments = null;
    }
    
    if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
    }
}

// Export for global access (if needed)
window.ExpiryTracker = {
    initApp,
    initAuth,
    loadDashboard,
    loadDocuments,
    loadNotifications,
    loadSettings
};
