// App state
let currentUser = null;
let documents = [];
let notifications = [];
let unsubscribeDocuments = null;
let unsubscribeNotifications = null;
let documentToEdit = null;

// Delete Document Functions
let documentToDelete = null;

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
    
    // Setup password toggles for index.html (login/signup page)
    setupPasswordToggles();
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

    // Setup password toggles for settings.html (Change Password Modal)
    if (document.getElementById('change-password-modal')) {
        setupPasswordToggles();
    }
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

function populateEditForm(doc) {
    // Update form title
    const formTitle = getElement('form-title');
    if (formTitle) {
        formTitle.textContent = 'Edit Document';
    }
    
    // Update submit button
    const submitBtn = addDocumentForm.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Document';
    }
    
    // Populate form fields
    getElement('doc-type').value = doc.type;
    getElement('doc-name').value = doc.name;
    getElement('doc-number').value = doc.number;
    getElement('issue-date').value = doc.issueDate;
    getElement('expiry-date').value = doc.expiryDate;
    getElement('notes').value = doc.notes || '';
    
    // Store the document ID for updating
    addDocumentForm.setAttribute('data-editing-id', doc.id);
}

async function handleEditDocument(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const docData = collectEditFormData();
        
        // Remove userId and createdAt from update data (these shouldn't change)
        delete docData.userId;
        delete docData.createdAt;
        
        // Add updatedAt timestamp
        docData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('documents').doc(documentToEdit).update(docData);
        
        showEditSuccess('Document updated successfully!');
        
        // Update local documents array and re-render after a short delay
        setTimeout(() => {
            // Refresh the documents list
            const updatedDocIndex = documents.findIndex(doc => doc.id === documentToEdit);
            if (updatedDocIndex !== -1) {
                documents[updatedDocIndex] = {
                    ...documents[updatedDocIndex],
                    ...docData
                };
                renderDocuments();
            }
            
            hideEditModal();
            showToast('Document updated successfully!', 'success');
        }, 1500);
        
    } catch (error) {
        showEditError('Error updating document: ' + error.message);
    } finally {
        hideLoading();
    }
}

function collectEditFormData() {
    return {
        type: getElement('edit-doc-type').value,
        name: getElement('edit-doc-name').value,
        number: getElement('edit-doc-number').value,
        issueDate: getElement('edit-issue-date').value,
        expiryDate: getElement('edit-expiry-date').value,
        notes: getElement('edit-notes').value,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() // This will be ignored in update
    };
}

// Password Toggle Functionality
function setupPasswordToggles() {
    // Select all password toggle buttons in the document
    document.querySelectorAll('.password-input-container .password-toggle').forEach(toggle => {
        // Find the input field relative to the button's container
        const container = toggle.closest('.password-input-container');
        const input = container ? container.querySelector('input[type="password"], input[type="text"]') : null;
        
        if (input && toggle) {
            // Remove any existing listeners to prevent duplicates
            // Note: In a real app, use .removeEventListener before adding, but for this context, 
            // a fresh setup is safer due to how code is run. We'll stick to the core logic.
            
            toggle.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                
                // Toggle the icon
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                }
                
                // Toggle the title attribute
                toggle.setAttribute('title', isPassword ? 'Hide password' : 'Show password');
            });
        }
    });
}

// Enhanced Loading Functions
function showButtonLoading(button) {
    if (!button) return;
    
    button.disabled = true;
    button.classList.add('loading');
    button.setAttribute('data-original-text', button.innerHTML);
    button.innerHTML = '';
}

function hideButtonLoading(button) {
    if (!button) return;
    
    button.disabled = false;
    button.classList.remove('loading');
    const originalText = button.getAttribute('data-original-text');
    if (originalText) {
        button.innerHTML = originalText;
    }
}

// Enhanced Validation Functions
function showFieldValidation(fieldId, message, type = 'error') {
    const field = getElement(fieldId);
    if (!field) return;
    
    // Use the parent of the input (which is the .form-group or similar)
    const parentContainer = field.closest('.form-group') || field.parentNode;

    // Remove existing validation message
    const existingMessage = parentContainer.querySelector('.validation-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Add validation classes to input
    field.classList.remove('error', 'success');
    if (type !== 'info') {
        field.classList.add(type);
    }
    
    // Create and append validation message
    if (message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `validation-message ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'warning' ? 'fa-exclamation-triangle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        
        messageDiv.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        parentContainer.appendChild(messageDiv);
    }
}

function clearFieldValidation(fieldId) {
    const field = getElement(fieldId);
    if (!field) return;
    
    field.classList.remove('error', 'success');
    const parentContainer = field.closest('.form-group') || field.parentNode;
    const existingMessage = parentContainer.querySelector('.validation-message');
    if (existingMessage) {
        existingMessage.remove();
    }
}

// Real-time Password Validation
function setupRealTimeValidation() {
    const passwordInput = getElement('password');
    const confirmPasswordInput = getElement('confirm-password');
    
    if (passwordInput) {
        addEventListener(passwordInput, 'input', () => {
            validatePasswordStrength(passwordInput.value);
            // Also validate match if confirm password field is visible
            if (confirmPasswordInput && confirmPasswordInput.closest('.form-group').style.display !== 'none') {
                validatePasswordMatch();
            }
        });
    }
    
    if (confirmPasswordInput) {
        addEventListener(confirmPasswordInput, 'input', () => {
            validatePasswordMatch();
        });
    }
}

function validatePasswordStrength(password) {
    const strengthIndicator = getElement('password-strength');
    
    if (!strengthIndicator) return;
    
    let strength = 'weak';
    let message = 'Weak password';
    
    if (password.length >= 8) {
        if (/[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
            strength = 'strong';
            message = 'Strong password';
        } else if (password.length >= 8 && (/[A-Z]/.test(password) || /[0-9]/.test(password))) {
            strength = 'medium';
            message = 'Medium strength password';
        }
    }
    
    const strengthBar = strengthIndicator.querySelector('.strength-bar');
    if (strengthBar) {
        strengthBar.className = `strength-bar strength-${strength}`;
    }
    
    showFieldValidation('password', message, strength === 'strong' ? 'success' : strength === 'medium' ? 'warning' : 'error');
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
    
    // Add/remove password strength indicator
    const passwordGroup = getElement('password').closest('.form-group');
    const existingStrengthDiv = getElement('password-strength');

    if (config.showFields && !existingStrengthDiv) {
        const strengthDiv = document.createElement('div');
        strengthDiv.id = 'password-strength';
        strengthDiv.className = 'password-strength';
        strengthDiv.innerHTML = '<div class="strength-bar strength-weak"></div>';
        passwordGroup.appendChild(strengthDiv);
    } else if (!config.showFields && existingStrengthDiv) {
        existingStrengthDiv.remove();
    }
    
    // Clear form and messages
    authForm.reset();
    clearMessages();
    clearFieldValidation('email');
    clearFieldValidation('password');
    clearFieldValidation('confirm-password');
    clearFieldValidation('name');
    
    // Setup real-time validation for signup mode
    if (config.showFields) {
        setupRealTimeValidation();
    }
}

// Enhanced Authentication Functions
async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    showButtonLoading(submitButton);
    clearMessages();
    
    const email = getElement('email').value;
    const password = getElement('password').value;
    
    try {
        // Clear previous validations
        clearFieldValidation('email');
        clearFieldValidation('password');
        
        // Basic validation
        if (!email) {
            showFieldValidation('email', 'Please enter your email address', 'error');
            throw new Error('Email missing');
        }
        
        if (!password) {
            showFieldValidation('password', 'Please enter your password', 'error');
            throw new Error('Password missing');
        }
        
        if (isLoginMode) {
            await auth.signInWithEmailAndPassword(email, password);
            showAuthSuccess('Login successful! Redirecting...');
        } else {
            const name = getElement('name').value;
            const confirmPassword = getElement('confirm-password').value;
            
            // Enhanced signup validation
            validateSignUp(name, password, confirmPassword);
            await handleSignUp(email, password, name);
            showAuthSuccess('Account created successfully! Redirecting...');
        }
    } catch (error) {
        handleAuthError(error);
    } finally {
        hideButtonLoading(submitButton);
    }
}

function handleAuthError(error) {
    console.error('Auth error:', error);
    
    // Handle specific Firebase auth errors with user-friendly messages
    let errorMessage = error.message;
    
    switch (error.code) {
        case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address';
            showFieldValidation('email', errorMessage, 'error');
            break;
            
        case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
            
        case 'auth/user-not-found':
            errorMessage = 'No account found with this email address';
            showFieldValidation('email', errorMessage, 'error');
            break;
            
        case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            showFieldValidation('password', errorMessage, 'error');
            break;
            
        case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists';
            showFieldValidation('email', errorMessage, 'error');
            break;
            
        case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger password.';
            showFieldValidation('password', errorMessage, 'error');
            break;
            
        case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
            
        case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
            
        default:
            // For generic errors, show in the general error area
            showAuthError(errorMessage);
            break;
    }
    
    // Only show in general area if not field-specific and not already handled by field validation
    if (!error.code || !['auth/invalid-email', 'auth/user-not-found', 'auth/wrong-password', 'auth/email-already-in-use', 'auth/weak-password'].includes(error.code)) {
        showAuthError(errorMessage);
    }
}

function validateSignUp(name, password, confirmPassword) {
    // Clear previous validations
    clearFieldValidation('name');
    clearFieldValidation('password');
    clearFieldValidation('confirm-password');
    
    let hasError = false;
    
    if (!name || name.trim().length < 2) {
        showFieldValidation('name', 'Please enter your full name (min 2 characters)', 'error');
        hasError = true;
    } else {
        showFieldValidation('name', 'Name looks good!', 'success');
    }
    
    if (password.length < 6) {
        showFieldValidation('password', 'Password must be at least 6 characters', 'error');
        hasError = true;
    } else {
        // Validation handled by real-time validation, just check length here
    }
    
    if (password !== confirmPassword) {
        showFieldValidation('confirm-password', 'Passwords do not match', 'error');
        hasError = true;
    } else if (confirmPassword) {
        showFieldValidation('confirm-password', 'Passwords match', 'success');
    }
    
    if (hasError) {
        throw new Error('Please fix the validation errors above');
    }
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
            handleAuthError(error);
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
    attachDocumentEventListeners();
}

function attachDocumentEventListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-doc').forEach(btn => {
        addEventListener(btn, 'click', (e) => {
            const docId = e.currentTarget.getAttribute('data-doc-id');
            showEditModal(docId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-doc').forEach(btn => {
        addEventListener(btn, 'click', (e) => {
            const docId = e.currentTarget.getAttribute('data-doc-id');
            showDeleteModal(docId);
        });
    });
}

// Edit Document Function
function editDocument(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) {
        showError('Document not found');
        return;
    }
    
    // Store the document data in sessionStorage and redirect to add.html with edit mode
    sessionStorage.setItem('editingDocument', JSON.stringify(doc));
    window.location.href = 'add.html?edit=true';
}

function showDeleteModal(docId) {
    documentToDelete = docId;
    const modal = getElement('delete-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideDeleteModal() {
    documentToDelete = null;
    const modal = getElement('delete-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function deleteDocument(docId) {
    if (!docId) return;
    
    showLoading();
    try {
        await db.collection('documents').doc(docId).delete();
        showSuccess('Document deleted successfully');
        
        // Remove from local array
        documents = documents.filter(doc => doc.id !== docId);
        
        // Re-render documents
        renderDocuments();
        
    } catch (error) {
        showError('Error deleting document: ' + error.message);
    } finally {
        hideLoading();
        hideDeleteModal();
    }
}

function setupDocumentModals() {
    // Delete modal setup (existing code)
    const deleteModal = getElement('delete-modal');
    const closeDeleteModal = getElement('close-delete-modal');
    const cancelDelete = getElement('cancel-delete');
    const confirmDelete = getElement('confirm-delete');
    
    if (deleteModal) {
        addEventListener(deleteModal, 'click', (e) => {
            if (e.target === deleteModal) {
                hideDeleteModal();
            }
        });
    }
    
    if (closeDeleteModal) {
        addEventListener(closeDeleteModal, 'click', hideDeleteModal);
    }
    
    if (cancelDelete) {
        addEventListener(cancelDelete, 'click', hideDeleteModal);
    }
    
    if (confirmDelete) {
        addEventListener(confirmDelete, 'click', () => {
            if (documentToDelete) {
                deleteDocument(documentToDelete);
            }
        });
    }

    // Edit modal setup (new code)
    const editModal = getElement('edit-document-modal');
    const closeEditModal = getElement('close-edit-modal');
    const cancelEdit = getElement('cancel-edit');
    const editDocumentForm = getElement('edit-document-form');
    
    if (editModal) {
        addEventListener(editModal, 'click', (e) => {
            if (e.target === editModal) {
                hideEditModal();
            }
        });
    }
    
    if (closeEditModal) {
        addEventListener(closeEditModal, 'click', hideEditModal);
    }
    
    if (cancelEdit) {
        addEventListener(cancelEdit, 'click', hideEditModal);
    }
    
    if (editDocumentForm) {
        addEventListener(editDocumentForm, 'submit', handleEditDocument);
    }
}

function showEditModal(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) {
        showError('Document not found');
        return;
    }
    
    documentToEdit = docId;
    populateEditForm(doc);
    
    const modal = getElement('edit-document-modal');
    if (modal) {
        modal.style.display = 'flex';
        clearEditMessages();
        
        // Prevent body scrolling when modal is open
        document.body.style.overflow = 'hidden';
    }
}

function hideEditModal() {
    documentToEdit = null;
    const modal = getElement('edit-document-modal');
    if (modal) {
        modal.style.display = 'none';
        clearEditMessages();
        getElement('edit-document-form').reset();
        
        // Restore body scrolling
        document.body.style.overflow = '';
    }
}

function populateEditForm(doc) {
    getElement('edit-doc-type').value = doc.type;
    getElement('edit-doc-name').value = doc.name;
    getElement('edit-doc-number').value = doc.number;
    getElement('edit-issue-date').value = doc.issueDate;
    getElement('edit-expiry-date').value = doc.expiryDate;
    getElement('edit-notes').value = doc.notes || '';
}

function clearEditMessages() {
    const errorElement = getElement('edit-error');
    const successElement = getElement('edit-success');
    
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
    
    if (successElement) {
        successElement.style.display = 'none';
        successElement.textContent = '';
    }
}

function showEditError(message) {
    const errorElement = getElement('edit-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    const successElement = getElement('edit-success');
    if (successElement) {
        successElement.style.display = 'none';
    }
}

function showEditSuccess(message) {
    const successElement = getElement('edit-success');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
    
    const errorElement = getElement('edit-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
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
        <div class="document-card ${status}" data-doc-id="${doc.id}">
            <div class="document-header">
                <div class="document-type">${doc.type}</div>
                <div class="document-actions">
                    <button class="action-btn edit-doc" data-doc-id="${doc.id}" title="Edit Document">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-doc" data-doc-id="${doc.id}" title="Delete Document">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="document-name">${doc.name}</div>
            <div class="document-number">${doc.number}</div>
            ${doc.notes ? `<div class="document-notes">${doc.notes}</div>` : ''}
            <div class="document-footer">
                <div>Expires: ${formatDate(doc.expiryDate)}</div>
                <div class="days-badge ${status}">${daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}</div>
            </div>
        </div>
    `;
}

// Document CRUD Operations
async function handleAddDocument(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const docData = collectFormData();
        
        // Save document to Firestore without file upload
        await db.collection('documents').add(docData);
        
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

// Password Change Functionality
function setupPasswordChangeModal() {
    const changePasswordBtn = getElement('change-password-btn');
    const changePasswordModal = getElement('change-password-modal');
    const closePasswordModal = getElement('close-password-modal');
    const cancelPasswordChange = getElement('cancel-password-change');
    const changePasswordForm = getElement('change-password-form');
    
    // Open modal when clicking change password button
    if (changePasswordBtn) {
        addEventListener(changePasswordBtn, 'click', showPasswordChangeModal);
    }
    
    // Close modal events
    if (closePasswordModal) {
        addEventListener(closePasswordModal, 'click', hidePasswordChangeModal);
    }
    
    if (cancelPasswordChange) {
        addEventListener(cancelPasswordChange, 'click', hidePasswordChangeModal);
    }
    
    // Close modal when clicking outside
    if (changePasswordModal) {
        addEventListener(changePasswordModal, 'click', (e) => {
            if (e.target === changePasswordModal) {
                hidePasswordChangeModal();
            }
        });
    }
    
    // Handle form submission
    if (changePasswordForm) {
        addEventListener(changePasswordForm, 'submit', handlePasswordChange);
    }
    
    // Real-time password validation (re-enabling for modal fields)
    const newPassword = getElement('new-password');
    const confirmNewPassword = getElement('confirm-new-password');
    
    if (newPassword) {
        addEventListener(newPassword, 'input', () => {
            // Simple validation check for modal
            if (confirmNewPassword && newPassword.value && confirmNewPassword.value) {
                validateNewPasswordMatch();
            } else if (confirmNewPassword) {
                clearFieldValidation('confirm-new-password');
            }
        });
    }
    
    if (confirmNewPassword) {
        addEventListener(confirmNewPassword, 'input', validateNewPasswordMatch);
    }
}

function showPasswordChangeModal() {
    const modal = getElement('change-password-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear form and messages
        clearPasswordMessages();
        getElement('change-password-form').reset();
    }
}

function hidePasswordChangeModal() {
    const modal = getElement('change-password-modal');
    if (modal) {
        modal.style.display = 'none';
        clearPasswordMessages();
        getElement('change-password-form').reset();
    }
}

function clearPasswordMessages() {
    const errorElement = getElement('password-error');
    const successElement = getElement('password-success');
    
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }
    
    if (successElement) {
        successElement.style.display = 'none';
        successElement.textContent = '';
    }
    
    // Clear field validations in the modal form
    clearFieldValidation('current-password');
    clearFieldValidation('new-password');
    clearFieldValidation('confirm-new-password');
}

function showPasswordError(message) {
    const errorElement = getElement('password-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    const successElement = getElement('password-success');
    if (successElement) {
        successElement.style.display = 'none';
    }
}

function showPasswordSuccess(message) {
    const successElement = getElement('password-success');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
    
    const errorElement = getElement('password-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function validateNewPasswordMatch() {
    const newPassword = getElement('new-password').value;
    const confirmNewPassword = getElement('confirm-new-password').value;
    
    if (!confirmNewPassword) {
        clearFieldValidation('confirm-new-password');
        return true;
    }
    
    if (newPassword === confirmNewPassword) {
        showFieldValidation('confirm-new-password', 'Passwords match', 'success');
        return true;
    } else {
        showFieldValidation('confirm-new-password', 'Passwords do not match', 'error');
        return false;
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const submitButton = getElement('submit-password-change');
    showButtonLoading(submitButton);
    clearPasswordMessages();
    
    const currentPassword = getElement('current-password').value;
    const newPassword = getElement('new-password').value;
    const confirmPassword = getElement('confirm-new-password').value;
    
    try {
        // Validate inputs
        clearFieldValidation('current-password');
        clearFieldValidation('new-password');
        clearFieldValidation('confirm-new-password');

        if (!currentPassword) {
            showFieldValidation('current-password', 'Current password is required', 'error');
            throw new Error('Current password missing');
        }

        if (newPassword.length < 6) {
            showFieldValidation('new-password', 'Password must be at least 6 characters', 'error');
            throw new Error('New password too short');
        }
        
        if (!validateNewPasswordMatch()) {
            throw new Error('New passwords do not match');
        }
        
        if (newPassword === currentPassword) {
            showFieldValidation('new-password', 'New password must be different from current password', 'error');
            throw new Error('New password must be different from current password');
        }
        
        // Re-authenticate user before changing password
        const user = auth.currentUser;
        const email = user.email;
        
        // Re-authenticate with current password
        const credential = firebase.auth.EmailAuthProvider.credential(email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        
        // Change password
        await user.updatePassword(newPassword);
        
        showPasswordSuccess('Password changed successfully!');
        
        // Clear form and close modal after success
        setTimeout(() => {
            hidePasswordChangeModal();
            showToast('Password updated successfully!', 'success');
        }, 2000);
        
    } catch (error) {
        console.error('Password change error:', error);
        
        // Handle specific Firebase auth errors
        let errorMessage = 'An unexpected error occurred.';
        
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect';
            showFieldValidation('current-password', errorMessage, 'error');
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'New password is too weak';
            showFieldValidation('new-password', errorMessage, 'error');
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Please log in again to change your password';
            showPasswordError(errorMessage);
            // Optionally, you can force logout here
            setTimeout(() => {
                handleLogout();
            }, 3000);
        } else if (error.message && error.message.includes('Current password missing')) {
            // Already handled by field validation
        } else {
            showPasswordError(error.message);
        }
        
    } finally {
        hideButtonLoading(submitButton);
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
    toast.className = `pwa-toast ${type}`; // Use pwa-toast class
    toast.textContent = message; // Use textContent for message
    
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

// PWA-specific enhancements

// Handle app visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // App came to foreground - refresh data if needed
        if (currentUser) {
            checkReminders();
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    showToast('Back online', 'success');
    // Sync any pending operations
    if (currentUser) {
        setupDocumentsListener();
        setupNotificationsListener();
    }
});

window.addEventListener('offline', () => {
    showToast('You are offline', 'warning');
});
