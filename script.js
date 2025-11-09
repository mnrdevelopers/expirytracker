// App state
let currentUser = null;
let documents = [];
let unsubscribeDocuments = null;
let isLoginMode = true;

// DOM Elements
const authPages = document.getElementById('auth-pages');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const authSwitchLink = document.getElementById('auth-switch-link');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const nameField = document.getElementById('name-field');
const confirmPasswordField = document.getElementById('confirm-password-field');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');

// Initialize the app
function initApp() {
    console.log('Initializing app...');
    
    // Check if Firebase is properly loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not loaded');
        authError.textContent = 'Error: Firebase not loaded. Please check your connection.';
        return;
    }

    // Auth state observer
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        if (user) {
            // User is signed in
            currentUser = user;
            redirectToDashboard();
        } else {
            // User is signed out
            currentUser = null;
            showAuthPages();
            if (unsubscribeDocuments) {
                unsubscribeDocuments();
            }
        }
    });

    // Set up event listeners
    setupEventListeners();
}

// Redirect to dashboard if user is authenticated
function redirectToDashboard() {
    console.log('Redirecting to dashboard...');
    window.location.href = 'dashboard.html';
}

// Set up all event listeners
function setupEventListeners() {
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

// Toggle between login and signup modes
function toggleAuthMode(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        authTitle.textContent = 'Login to Your Account';
        authSubmit.textContent = 'Login';
        authSwitchLink.textContent = "Don't have an account? Sign up";
        nameField.style.display = 'none';
        confirmPasswordField.style.display = 'none';
    } else {
        authTitle.textContent = 'Create Your Account';
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
                console.log('User logged in:', userCredential.user.email);
                // Success handled by auth state change
            })
            .catch((error) => {
                hideLoading();
                console.error('Login error:', error);
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
        
        if (password.length < 6) {
            hideLoading();
            authError.textContent = 'Password should be at least 6 characters';
            return;
        }
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Save user profile
                return userCredential.user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                hideLoading();
                authSuccess.textContent = 'Account created successfully!';
                console.log('User account created');
            })
            .catch((error) => {
                hideLoading();
                console.error('Signup error:', error);
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

// Show authentication pages
function showAuthPages() {
    if (authPages) authPages.classList.remove('hidden');
}

// Show loading indicator
function showLoading() {
    let loading = document.getElementById('loading');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loading';
        loading.className = 'loading';
        loading.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loading);
    }
    loading.classList.remove('hidden');
}

// Hide loading indicator
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
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
function formatDate(date) {
    if (!date) return 'N/A';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return dateObj.toLocaleDateString(undefined, options);
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initApp();
    requestNotificationPermission();
});
