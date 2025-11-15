// App state
let currentUser = null;
let documents = [];
let unsubscribeDocuments = null;
let documentToDelete = null;

// Push Notification Functions
let fcmToken = null;

// DOM Elements (will be initialized per page)
let authForm, authTitle, authSubmit, authSwitchLink, forgotPasswordLink;
let nameField, confirmPasswordField, authError, authSuccess;
let userEmail, logoutBtn;
let totalDocs, activeDocs, expiringDocs, expiredDocs, alertsList;
let documentsList, addDocumentBtn;
let addDocumentForm, cancelAdd;
let editModal, deleteModal, closeModalBtns, cancelEdit, saveEdit, cancelDelete, confirmDelete;
let editDocumentForm, editDocId, editDocType, editDocName, editDocNumber, editIssueDate, editExpiryDate, editNotes;
let settingsForm;
let loading;

// Auth state management
let isLoginMode = true;

// Initialize the app for pages that need it
function initApp() {
    // Auth state observer
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            initializePageElements();
            
            // Update user profile information
            updateUserProfile(user);
            
            // Initialize push notifications
            await initializePushNotifications();
            
            // Redirect to dashboard if on login page
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                window.location.href = 'dashboard.html';
            }
            
            setupDocumentsListener();
        } else {
            // User is signed out - remove FCM token
            if (fcmToken) {
                await removeFCMToken(fcmToken);
                fcmToken = null;
            }
            
            currentUser = null;
            // Redirect to login if not on login page
            if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
                window.location.href = 'index.html';
            }
        }
    });

    // Set up event listeners for current page
    setupEventListeners();
}

// Initialize auth functionality for login page
function initAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Redirect to dashboard if already logged in
            window.location.href = 'dashboard.html';
        }
    });

    initializeAuthElements();
    setupAuthEventListeners();
}

// Initialize DOM elements for auth page
function initializeAuthElements() {
    authForm = document.getElementById('auth-form');
    authTitle = document.getElementById('auth-title');
    authSubmit = document.getElementById('auth-submit');
    authSwitchLink = document.getElementById('auth-switch-link');
    forgotPasswordLink = document.getElementById('forgot-password-link');
    nameField = document.getElementById('name-field');
    confirmPasswordField = document.getElementById('confirm-password-field');
    authError = document.getElementById('auth-error');
    authSuccess = document.getElementById('auth-success');
}

// Initialize DOM elements for other pages
function initializePageElements() {
    userEmail = document.getElementById('user-email');
    logoutBtn = document.getElementById('logout-btn');
    
    // Dashboard elements
    totalDocs = document.getElementById('total-docs');
    activeDocs = document.getElementById('active-docs');
    expiringDocs = document.getElementById('expiring-docs');
    expiredDocs = document.getElementById('expired-docs');
    alertsList = document.getElementById('alerts-list');
    
    // Documents elements
    documentsList = document.getElementById('documents-list');
    addDocumentBtn = document.getElementById('add-document-btn');
    
    // Forms
    addDocumentForm = document.getElementById('add-document-form');
    cancelAdd = document.getElementById('cancel-add');
    settingsForm = document.getElementById('settings-form');
    
    // Modals
    editModal = document.getElementById('edit-modal');
    deleteModal = document.getElementById('delete-modal');
    closeModalBtns = document.querySelectorAll('.close-modal');
    cancelEdit = document.getElementById('cancel-edit');
    saveEdit = document.getElementById('save-edit');
    cancelDelete = document.getElementById('cancel-delete');
    confirmDelete = document.getElementById('confirm-delete');
    
    // Edit form elements
    editDocumentForm = document.getElementById('edit-document-form');
    editDocId = document.getElementById('edit-doc-id');
    editDocType = document.getElementById('edit-doc-type');
    editDocName = document.getElementById('edit-doc-name');
    editDocNumber = document.getElementById('edit-doc-number');
    editIssueDate = document.getElementById('edit-issue-date');
    editExpiryDate = document.getElementById('edit-expiry-date');
    editNotes = document.getElementById('edit-notes');
    
    // Loading
    loading = document.getElementById('loading');
}

// Set up event listeners for auth page
function setupAuthEventListeners() {
    // Auth form submission
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
    
    // Auth mode switch
    if (authSwitchLink) {
        authSwitchLink.addEventListener('click', toggleAuthMode);
    }
    
    // Forgot password
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
}

// Set up event listeners for other pages
function setupEventListeners() {
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Document actions
    if (addDocumentBtn) {
        addDocumentBtn.addEventListener('click', () => {
            window.location.href = 'add.html';
        });
    }
    
    // Cancel add
    if (cancelAdd) {
        cancelAdd.addEventListener('click', () => {
            window.location.href = 'documents.html';
        });
    }
    
    // Modal controls
    if (closeModalBtns) {
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (editModal) editModal.style.display = 'none';
                if (deleteModal) deleteModal.style.display = 'none';
            });
        });
    }
    
    if (cancelEdit) {
        cancelEdit.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    
    if (saveEdit) {
        saveEdit.addEventListener('click', handleSaveEdit);
    }
    
    if (cancelDelete) {
        cancelDelete.addEventListener('click', () => {
            deleteModal.style.display = 'none';
            documentToDelete = null;
        });
    }
    
    if (confirmDelete) {
        confirmDelete.addEventListener('click', handleConfirmDelete);
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (editModal && e.target === editModal) {
            editModal.style.display = 'none';
        }
        if (deleteModal && e.target === deleteModal) {
            deleteModal.style.display = 'none';
            documentToDelete = null;
        }
    });
}

// Set up add document form
function setupAddDocumentForm() {
    if (addDocumentForm) {
        addDocumentForm.addEventListener('submit', handleAddDocument);
    }
}

// Toggle between login and signup modes
function toggleAuthMode(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.textContent = 'Login to Expiry Tracker';
        authSubmit.textContent = 'Login';
        authSwitchLink.textContent = "Don't have an account? Sign up";
        nameField.style.display = 'none';
        confirmPasswordField.style.display = 'none';
    } else {
        authTitle.textContent = 'Create an Account';
        authSubmit.textContent = 'Sign Up';
        authSwitchLink.textContent = 'Already have an account? Login';
        nameField.style.display = 'block';
        confirmPasswordField.style.display = 'block';
    }
    
    // Clear form and messages
    authForm.reset();
    authError.textContent = '';
    authSuccess.textContent = '';
}

// Handle authentication form submission
function handleAuthSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (isLoginMode) {
        // Login
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                hideLoading();
                // Success handled by auth state change
            })
            .catch((error) => {
                hideLoading();
                authError.textContent = error.message;
            });
    } else {
        // Sign up
        const name = document.getElementById('name').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (password !== confirmPassword) {
            hideLoading();
            authError.textContent = 'Passwords do not match';
            return;
        }
        
        if (!name) {
            hideLoading();
            authError.textContent = 'Please enter your name';
            return;
        }
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Save user profile with name
                return userCredential.user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                hideLoading();
                // Success handled by auth state change
            })
            .catch((error) => {
                hideLoading();
                authError.textContent = error.message;
            });
    }
}

// Handle forgot password
function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    
    if (!email) {
        authError.textContent = 'Please enter your email address';
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            authSuccess.textContent = 'Password reset email sent. Check your inbox.';
        })
        .catch((error) => {
            authError.textContent = error.message;
        });
}

// Handle logout
function handleLogout() {
    auth.signOut();
}

// Set up real-time listener for user's documents
function setupDocumentsListener() {
    if (!currentUser) return;
    
    unsubscribeDocuments = db.collection('documents')
        .where('userId', '==', currentUser.uid)
        .orderBy('expiryDate', 'asc')
        .onSnapshot((snapshot) => {
            documents = [];
            snapshot.forEach(doc => {
                documents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Update UI based on current page
            if (window.location.pathname.includes('dashboard.html')) {
                updateDashboard();
            } else if (window.location.pathname.includes('documents.html')) {
                renderDocuments();
            }
            
            checkReminders();
        }, (error) => {
            console.error('Error getting documents: ', error);
        });
}

// Load dashboard data
function loadDashboard() {
    if (documents.length > 0) {
        updateDashboard();
    }
}

// Update dashboard with document statistics
function updateDashboard() {
    if (!totalDocs) return;
    
    const total = documents.length;
    const active = documents.filter(doc => getDocumentStatus(doc.expiryDate) === 'active').length;
    const expiring = documents.filter(doc => getDocumentStatus(doc.expiryDate) === 'expiring').length;
    const expired = documents.filter(doc => getDocumentStatus(doc.expiryDate) === 'expired').length;
    
    totalDocs.textContent = total;
    activeDocs.textContent = active;
    expiringDocs.textContent = expiring;
    expiredDocs.textContent = expired;
    
    // Update alerts
    updateAlerts();
}

// Update alerts list
function updateAlerts() {
    if (!alertsList) return;
    
    alertsList.innerHTML = '';
    
    const today = new Date();
    const alerts = [];
    
    documents.forEach(doc => {
        const daysRemaining = getDaysRemaining(doc.expiryDate);
        
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
    
    if (alerts.length === 0) {
        alertsList.innerHTML = '<p>No upcoming alerts. All documents are up to date.</p>';
        return;
    }
    
    alerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = `
            <span class="alert-icon ${alert.type}"></span>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-date">${alert.date}</div>
            </div>
        `;
        alertsList.appendChild(alertItem);
    });
}

// Load documents
function loadDocuments() {
    if (documents.length > 0) {
        renderDocuments();
    }
}

// Render documents in the documents list
function renderDocuments() {
    if (!documentsList) return;
    
    documentsList.innerHTML = '';
    
    if (documents.length === 0) {
        documentsList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <p>No documents found. <a href="add.html" id="add-first-doc">Add your first document</a></p>
            </div>
        `;
        return;
    }
    
    documents.forEach(doc => {
        const status = getDocumentStatus(doc.expiryDate);
        const daysRemaining = getDaysRemaining(doc.expiryDate);
        
        const documentCard = document.createElement('div');
        documentCard.className = `document-card ${status}`;
        documentCard.innerHTML = `
            <div class="document-type">${doc.type}</div>
            <div class="document-name">${doc.name}</div>
            <div class="document-number">${doc.number}</div>
            <div class="document-expiry">
                <div>Expires: ${formatDate(doc.expiryDate)}</div>
                <div class="days-badge ${status}">${daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}</div>
            </div>
            <div class="document-actions">
                <button class="action-btn edit-doc" data-id="${doc.id}">✏️</button>
                <button class="action-btn delete-doc" data-id="${doc.id}">🗑️</button>
            </div>
        `;
        
        documentsList.appendChild(documentCard);
    });
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-doc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const docId = e.target.closest('button').getAttribute('data-id');
            openEditModal(docId);
        });
    });
    
    document.querySelectorAll('.delete-doc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const docId = e.target.closest('button').getAttribute('data-id');
            openDeleteModal(docId);
        });
    });
}

// Handle adding a new document
function handleAddDocument(e) {
    e.preventDefault();
    showLoading();
    
    const docData = {
        type: document.getElementById('doc-type').value,
        name: document.getElementById('doc-name').value,
        number: document.getElementById('doc-number').value,
        issueDate: document.getElementById('issue-date').value,
        expiryDate: document.getElementById('expiry-date').value,
        notes: document.getElementById('notes').value,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Handle file upload if present
    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    
    if (file) {
        const storageRef = storage.ref();
        const fileRef = storageRef.child(`documents/${currentUser.uid}/${Date.now()}_${file.name}`);
        
        fileRef.put(file)
            .then(snapshot => snapshot.ref.getDownloadURL())
            .then(url => {
                docData.fileUrl = url;
                return db.collection('documents').add(docData);
            })
            .then(() => {
                hideLoading();
                addDocumentForm.reset();
                window.location.href = 'documents.html';
            })
            .catch(error => {
                hideLoading();
                console.error('Error adding document: ', error);
                alert('Error adding document: ' + error.message);
            });
    } else {
        db.collection('documents').add(docData)
            .then(() => {
                hideLoading();
                addDocumentForm.reset();
                window.location.href = 'documents.html';
            })
            .catch(error => {
                hideLoading();
                console.error('Error adding document: ', error);
                alert('Error adding document: ' + error.message);
            });
    }
}

// Open edit modal with document data
function openEditModal(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    editDocId.value = doc.id;
    editDocType.value = doc.type;
    editDocName.value = doc.name;
    editDocNumber.value = doc.number;
    editIssueDate.value = doc.issueDate;
    editExpiryDate.value = doc.expiryDate;
    editNotes.value = doc.notes || '';
    
    editModal.style.display = 'flex';
}

// Save edited document
function handleSaveEdit() {
    const docId = editDocId.value;
    const docData = {
        type: editDocType.value,
        name: editDocName.value,
        number: editDocNumber.value,
        issueDate: editIssueDate.value,
        expiryDate: editExpiryDate.value,
        notes: editNotes.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    showLoading();
    
    db.collection('documents').doc(docId).update(docData)
        .then(() => {
            hideLoading();
            editModal.style.display = 'none';
        })
        .catch(error => {
            hideLoading();
            console.error('Error updating document: ', error);
            alert('Error updating document: ' + error.message);
        });
}

// Open delete confirmation modal
function openDeleteModal(docId) {
    documentToDelete = docId;
    deleteModal.style.display = 'flex';
}

// Confirm document deletion
function handleConfirmDelete() {
    if (!documentToDelete) return;
    
    showLoading();
    
    db.collection('documents').doc(documentToDelete).delete()
        .then(() => {
            hideLoading();
            deleteModal.style.display = 'none';
            documentToDelete = null;
        })
        .catch(error => {
            hideLoading();
            console.error('Error deleting document: ', error);
            alert('Error deleting document: ' + error.message);
        });
}

// Load settings
function loadSettings() {
    const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    
    if (document.getElementById('notify-30-days')) {
        document.getElementById('notify-30-days').checked = preferences.notify30Days !== false;
    }
    if (document.getElementById('notify-7-days')) {
        document.getElementById('notify-7-days').checked = preferences.notify7Days !== false;
    }
    if (document.getElementById('notify-1-day')) {
        document.getElementById('notify-1-day').checked = preferences.notify1Day !== false;
    }
    if (document.getElementById('notify-expired')) {
        document.getElementById('notify-expired').checked = preferences.notifyExpired !== false;
    }
    
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSaveSettings);
    }
}

// Handle saving notification preferences
function handleSaveSettings(e) {
    e.preventDefault();
    
    const preferences = {
        notify30Days: document.getElementById('notify-30-days').checked,
        notify7Days: document.getElementById('notify-7-days').checked,
        notify1Day: document.getElementById('notify-1-day').checked,
        notifyExpired: document.getElementById('notify-expired').checked
    };
    
    // Save to localStorage
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
    
    alert('Notification preferences saved!');
}

// Check for reminders and show alerts
function checkReminders() {
    const today = new Date();
    const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    
    documents.forEach(doc => {
        const daysRemaining = getDaysRemaining(doc.expiryDate);
        
        // Check if we should show a reminder based on user preferences
        if (preferences.notify30Days && daysRemaining === 30) {
            showReminderAlert(doc, 30);
        } else if (preferences.notify7Days && daysRemaining === 7) {
            showReminderAlert(doc, 7);
        } else if (preferences.notify1Day && daysRemaining === 1) {
            showReminderAlert(doc, 1);
        } else if (preferences.notifyExpired && daysRemaining <= 0) {
            showReminderAlert(doc, 0);
        }
    });
}

// Show reminder alert
function showReminderAlert(doc, days) {
    const message = days > 0 
        ? `Your ${doc.name} (${doc.type}) expires in ${days} days`
        : `Your ${doc.name} (${doc.type}) has expired`;
        
    // Check if we've already shown this alert today
    const alertKey = `alert_${doc.id}_${days}`;
    const lastAlertDate = localStorage.getItem(alertKey);
    const today = new Date().toDateString();
    
    if (lastAlertDate !== today) {
        // Show browser notification
        if (Notification.permission === 'granted') {
            new Notification('Expiry Tracker Alert', {
                body: message,
                icon: '/icon.png'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Expiry Tracker Alert', {
                        body: message,
                        icon: '/icon.png'
                    });
                }
            });
        }
        
        // Fallback to alert if notifications not supported
        if (!('Notification' in window)) {
            alert(message);
        }
        
        localStorage.setItem(alertKey, today);
    }
}

// Utility function to get document status
function getDocumentStatus(expiryDate) {
    const daysRemaining = getDaysRemaining(expiryDate);
    
    if (daysRemaining <= 0) {
        return 'expired';
    } else if (daysRemaining <= 30) {
        return 'expiring';
    } else {
        return 'active';
    }
}

// Utility function to calculate days remaining until expiry
function getDaysRemaining(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Utility function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Show loading indicator
function showLoading() {
    if (loading) loading.classList.remove('hidden');
}

// Hide loading indicator
function hideLoading() {
    if (loading) loading.classList.add('hidden');
}

// Mobile-specific functionality
function setupMobileNavigation() {
    const menuToggle = document.getElementById('menu-toggle');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

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

        menuToggle.addEventListener('click', openSidebar);
        if (closeSidebar) closeSidebar.addEventListener('click', closeSidebarFunc);
        if (overlay) overlay.addEventListener('click', closeSidebarFunc);

        // Close sidebar when clicking on a link
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', closeSidebarFunc);
        });
    }
}

// Enhanced mobile alerts with vibration API
function showMobileAlert(message, type = 'warning') {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Expiry Tracker', {
            body: message,
            icon: '/icon.png'
        });
    }
    
    // Vibration if supported
    if ('vibrate' in navigator) {
        navigator.vibrate(200);
    }
    
    // Custom in-app notification
    showToast(message, type);
}

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
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
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        warning: 'exclamation-triangle',
        error: 'times-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Add this CSS for toast notifications
const toastCSS = `
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    padding: 16px;
    box-shadow: var(--shadow);
    transform: translateX(400px);
    transition: transform 0.3s ease;
    z-index: 4000;
    max-width: 300px;
}

.toast.show {
    transform: translateX(0);
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.toast.success {
    border-left: 4px solid var(--success);
}

.toast.warning {
    border-left: 4px solid var(--warning);
}

.toast.error {
    border-left: 4px solid var(--danger);
}

.toast.info {
    border-left: 4px solid var(--primary);
}
`;

// Inject toast CSS
const style = document.createElement('style');
style.textContent = toastCSS;
document.head.appendChild(style);

// Enhanced user profile handling
function updateUserProfile(user) {
    if (!user) return;
    
    // Update user info in sidebar
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const currentEmail = document.getElementById('current-email');
    
    if (userAvatar) {
        const displayName = user.displayName || 'User';
        userAvatar.textContent = displayName.charAt(0).toUpperCase();
    }
    
    if (userName) {
        userName.textContent = user.displayName || 'User';
    }
    
    if (userEmail) {
        userEmail.textContent = user.email;
    }
    
    if (currentEmail) {
        currentEmail.textContent = user.email;
    }
}

// Initialize push notifications
async function initializePushNotifications() {
    try {
        // Request notification permission
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            
            // Get FCM token
            fcmToken = await messaging.getToken({
                vapidKey: 'BNIPHzoLaLW03Tpb0qrqIMgx5M-aFVOndk9-EtIljjiz2NCJkrLzXHxBgmClb7KdX08BOU5fffhDM08Dzs1G8nE' // You need to generate this
            });
            
            if (fcmToken) {
                console.log('FCM Token:', fcmToken);
                await saveFCMToken(fcmToken);
                setupMessageHandlers();
            } else {
                console.log('No registration token available.');
            }
        } else {
            console.log('Unable to get permission to notify.');
        }
    } catch (error) {
        console.error('Error initializing push notifications:', error);
    }
}

// Save FCM token to Firestore
async function saveFCMToken(token) {
    if (!currentUser) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).set({
            fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log('FCM token saved to Firestore');
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
}

// Remove FCM token when user logs out
async function removeFCMToken(token) {
    if (!currentUser || !token) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            fcmTokens: firebase.firestore.FieldValue.arrayRemove(token)
        });
        
        console.log('FCM token removed from Firestore');
    } catch (error) {
        console.error('Error removing FCM token:', error);
    }
}

// Setup message handlers for foreground messages
function setupMessageHandlers() {
    // Handle foreground messages
    messaging.onMessage((payload) => {
        console.log('Received foreground message: ', payload);
        
        // Show in-app notification
        showCustomNotification(payload);
    });
}

// Show custom notification for foreground messages
function showCustomNotification(payload) {
    const notification = document.createElement('div');
    notification.className = 'push-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i class="fas fa-bell"></i>
            </div>
            <div class="notification-body">
                <div class="notification-title">${payload.notification?.title || 'Expiry Tracker'}</div>
                <div class="notification-message">${payload.notification?.body || 'You have a new notification'}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideNotification(notification);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        hideNotification(notification);
    });
    
    // Click to open relevant page
    notification.addEventListener('click', () => {
        hideNotification(notification);
        if (payload.data?.page) {
            window.location.href = payload.data.page;
        } else {
            window.location.href = 'dashboard.html';
        }
    });
}

function hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 300);
}

// Send push notification (for testing and reminders)
async function sendPushNotification(userId, title, body, data = {}) {
    try {
        // In a real app, you would call a Cloud Function here
        // For now, we'll simulate it by showing local notifications
        
        if ('Notification' in window && Notification.permission === 'granted') {
            // Show local notification
            const notification = new Notification(title, {
                body: body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'expiry-tracker',
                requireInteraction: true,
                data: data
            });
            
            notification.onclick = () => {
                window.focus();
                if (data.page) {
                    window.location.href = data.page;
                }
                notification.close();
            };
        }
        
        // For actual FCM, you would use:
        // await fetch('YOUR_CLOUD_FUNCTION_URL', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //         userId: userId,
        //         title: title,
        //         body: body,
        //         data: data
        //     })
        // });
        
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
}

// Enhanced reminder system with push notifications
function checkReminders() {
    const today = new Date();
    const preferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    
    documents.forEach(doc => {
        const daysRemaining = getDaysRemaining(doc.expiryDate);
        
        // Check if we should show a reminder based on user preferences
        const alertKey = `alert_${doc.id}_${daysRemaining}`;
        const lastAlertDate = localStorage.getItem(alertKey);
        const todayStr = new Date().toDateString();
        
        if (lastAlertDate !== todayStr) {
            let shouldNotify = false;
            let message = '';
            
            if (preferences.notify30Days && daysRemaining === 30) {
                shouldNotify = true;
                message = `Your ${doc.name} (${doc.type}) expires in 30 days`;
            } else if (preferences.notify7Days && daysRemaining === 7) {
                shouldNotify = true;
                message = `Your ${doc.name} (${doc.type}) expires in 7 days`;
            } else if (preferences.notify1Day && daysRemaining === 1) {
                shouldNotify = true;
                message = `Your ${doc.name} (${doc.type}) expires tomorrow`;
            } else if (preferences.notifyExpired && daysRemaining <= 0) {
                shouldNotify = true;
                message = `Your ${doc.name} (${doc.type}) has expired`;
            }
            
            if (shouldNotify && message) {
                // Show local notification
                showToast(message, daysRemaining > 0 ? 'warning' : 'error');
                
                // Send push notification
                if (currentUser) {
                    sendPushNotification(
                        currentUser.uid,
                        'Expiry Tracker Alert',
                        message,
                        { page: 'documents.html', docId: doc.id }
                    );
                }
                
                localStorage.setItem(alertKey, todayStr);
            }
        }
    });
}
