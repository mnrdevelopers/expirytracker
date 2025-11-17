// PWA Installation and Service Worker Registration
class PWAHelper {
    constructor() {
        this.deferredPrompt = null;
        this.isIOS = this.detectIOS();
        this.isStandalone = this.detectStandalone();
        this.basePath = '/expirytracker/';
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupMetaTags();
        this.setupThemeColor();
        this.setupConnectionMonitoring();
        this.showSplashScreen();
    }

    detectIOS() {
        return [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod'
        ].includes(navigator.platform) || 
        (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    }

    detectStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register(this.basePath + 'sw.js');
                console.log('SW registered: ', registration);

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('SW update found!');
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });

            } catch (error) {
                console.log('SW registration failed: ', error);
            }
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPromotion();
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.deferredPrompt = null;
            this.hideInstallPromotion();
            this.showToast('App installed successfully!', 'success');
        });
    }

    showInstallPromotion() {
        if (!this.isStandalone && !this.isIOS) {
            setTimeout(() => this.createInstallButton(), 3000);
        } else if (this.isIOS && !this.isStandalone) {
            setTimeout(() => this.showIOSInstallInstructions(), 3000);
        }
    }

    createInstallButton() {
        if (document.getElementById('pwa-install-btn')) return;

        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.className = 'pwa-install-btn';
        installBtn.innerHTML = `
            <i class="fas fa-download"></i>
            Install App
        `;
        
        installBtn.addEventListener('click', () => this.installApp());
        installBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.installApp();
        });
        
        document.body.appendChild(installBtn);
    }

    showIOSInstallInstructions() {
        if (document.getElementById('ios-install-help')) return;

        const iosHelp = document.createElement('div');
        iosHelp.id = 'ios-install-help';
        iosHelp.className = 'ios-install-help';
        iosHelp.innerHTML = `
            <div class="ios-install-content">
                <h3>Install Expiry Tracker</h3>
                <p>For the best experience, install this app:</p>
                <ol style="text-align: left; margin: 15px 0;">
                    <li>Tap the <i class="fas fa-share"></i> Share button</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" to install</li>
                </ol>
                <button class="btn" id="close-ios-help">Got it</button>
            </div>
        `;
        
        document.body.appendChild(iosHelp);
        
        document.getElementById('close-ios-help').addEventListener('click', () => {
            iosHelp.remove();
        });
    }

    hideInstallPromotion() {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.remove();
        }
        const iosHelp = document.getElementById('ios-install-help');
        if (iosHelp) {
            iosHelp.remove();
        }
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.showToast('Installing app...', 'success');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            this.hideInstallPromotion();
        }
    }

    setupMetaTags() {
        // Add manifest link
        if (!document.querySelector('link[rel="manifest"]')) {
            const manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = this.basePath + 'manifest.json';
            document.head.appendChild(manifestLink);
        }

        // Theme color
        const themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        themeColor.content = '#6366f1';
        document.head.appendChild(themeColor);

        // iOS specific
        if (this.isIOS) {
            const appleMobileWebAppCapable = document.createElement('meta');
            appleMobileWebAppCapable.name = 'apple-mobile-web-app-capable';
            appleMobileWebAppCapable.content = 'yes';
            document.head.appendChild(appleMobileWebAppCapable);

            const appleMobileWebAppStatusBar = document.createElement('meta');
            appleMobileWebAppStatusBar.name = 'apple-mobile-web-app-status-bar-style';
            appleMobileWebAppStatusBar.content = 'black-translucent';
            document.head.appendChild(appleMobileWebAppStatusBar);

            const appleTouchIcon = document.createElement('link');
            appleTouchIcon.rel = 'apple-touch-icon';
            appleTouchIcon.href = this.basePath + 'icon.png';
            document.head.appendChild(appleTouchIcon);

            const appleTouchStartupImage = document.createElement('link');
            appleTouchStartupImage.rel = 'apple-touch-startup-image';
            appleTouchStartupImage.href = this.basePath + 'icon.png';
            document.head.appendChild(appleTouchStartupImage);
        }
    }

    setupThemeColor() {
        const observer = new MutationObserver(() => {
            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            if (themeColorMeta) {
                themeColorMeta.content = '#6366f1';
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    showUpdateNotification() {
        const updateNotification = document.createElement('div');
        updateNotification.className = 'pwa-update-notification';
        updateNotification.innerHTML = `
            <div class="pwa-update-content">
                <p>New version available!</p>
                <button class="btn" id="pwa-update-btn">Update Now</button>
            </div>
        `;

        document.body.appendChild(updateNotification);

        document.getElementById('pwa-update-btn').addEventListener('click', () => {
            window.location.reload();
        });
    }

    setupConnectionMonitoring() {
        window.addEventListener('online', () => {
            this.showToast('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('You are offline', 'warning');
        });
    }

    showSplashScreen() {
        // Only show splash screen on first load in standalone mode
        if (this.isStandalone && !sessionStorage.getItem('splashShown')) {
            const splash = document.createElement('div');
            splash.className = 'app-splash';
            splash.innerHTML = `
                <div class="logo">ExpiryTracker</div>
                <div class="spinner"></div>
            `;
            
            document.body.appendChild(splash);
            
            sessionStorage.setItem('splashShown', 'true');
            
            setTimeout(() => {
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 300);
            }, 2000);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `pwa-toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize PWA when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pwa = new PWAHelper();
    });
} else {
    window.pwa = new PWAHelper();
}
