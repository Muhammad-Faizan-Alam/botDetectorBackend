/**
 * Web Bot Detection: Behavioral Data Collection Script
 * Version: 1.0
 * Description: Collects user behavioral data for bot detection AI training
 * Deployment: Add this script to your website before </body> tag
 */

(function() {
    'use strict';

    // =============================================
    // CONFIGURATION
    // =============================================
    const CONFIG = {
        API_ENDPOINT: 'https://bot-detector-backend.vercel.app/api/collect-behavior',
        BATCH_INTERVAL: 10000, // 10 seconds
        MAX_EVENTS: 1000, // Prevent memory overflow
        SESSION_DURATION: 30 * 60 * 1000 // 30 minutes
    };

    // =============================================
    // SESSION MANAGEMENT
    // =============================================
    
    // Generate unique session ID
    const generateSessionId = () => {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    // Get or create session ID
    const getSessionId = () => {
        let sessionId = sessionStorage.getItem('bot_detection_session_id');
        if (!sessionId) {
            sessionId = generateSessionId();
            sessionStorage.setItem('bot_detection_session_id', sessionId);
        }
        return sessionId;
    };

    // =============================================
    // DATA STORAGE
    // =============================================
    
    const behaviorData = {
        session_id: getSessionId(),
        session_start: Date.now(),
        mouse_events: [],
        click_events: [],
        scroll_events: [],
        key_events: [],
        fingerprint: null,
        page_views: []
    };

    // =============================================
    // FINGERPRINT COLLECTION
    // =============================================
    
    const getFingerprint = () => {
        return {
            // Browser identification
            ua: navigator.userAgent,
            lang: navigator.language,
            plat: navigator.platform,
            
            // Screen properties
            scrw: screen.width,
            scrh: screen.height,
            color: screen.colorDepth,
            
            // System properties
            tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            maxTouch: navigator.maxTouchPoints || 0,
            
            // Additional fingerprint data (non-intrusive)
            cookies: navigator.cookieEnabled,
            java: navigator.javaEnabled ? navigator.javaEnabled() : false,
            pdf: navigator.pdfViewerEnabled || false,
            doNotTrack: navigator.doNotTrack || 'unspecified',
            
            // Connection info
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null,
            
            // Hardware
            deviceMemory: navigator.deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
        };
    };

    // Initialize fingerprint
    behaviorData.fingerprint = getFingerprint();

    // =============================================
    // EVENT COLLECTORS
    // =============================================

    /**
     * MOUSE MOVEMENT COLLECTION
     * Why: Bots fail to simulate natural human mouse patterns
     * When: Every mouse movement on the page
     */
    let lastMouseTime = Date.now();
    document.addEventListener('mousemove', function(e) {
        const now = Date.now();
        
        // Throttle events to prevent excessive data
        if (now - lastMouseTime > 50) { // Max 20 events per second
            behaviorData.mouse_events.push({
                x: e.clientX,
                y: e.clientY,
                t: now,
                // Additional context for AI analysis
                pageX: e.pageX,
                pageY: e.pageY,
                movementX: e.movementX,
                movementY: e.movementY
            });
            
            lastMouseTime = now;
            
            // Prevent memory overflow
            if (behaviorData.mouse_events.length > CONFIG.MAX_EVENTS) {
                behaviorData.mouse_events = behaviorData.mouse_events.slice(-500);
            }
        }
    });

    /**
     * CLICK ACTIVITY COLLECTION
     * Why: Distinguishes genuine users from simple bot scripts
     * When: Every click on any element
     */
    document.addEventListener('click', function(e) {
        behaviorData.click_events.push({
            x: e.clientX,
            y: e.clientY,
            btn: e.button,
            tgt: e.target.tagName,
            t: Date.now(),
            // Additional context
            id: e.target.id || '',
            className: e.target.className || '',
            text: e.target.textContent ? e.target.textContent.substring(0, 50) : '' // Limited text
        });

        if (behaviorData.click_events.length > CONFIG.MAX_EVENTS) {
            behaviorData.click_events = behaviorData.click_events.slice(-200);
        }
    });

    /**
     * SCROLL ACTIVITY COLLECTION
     * Why: Captures reading patterns and engagement depth
     * When: During page scrolling
     */
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        // Throttle scroll events
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            behaviorData.scroll_events.push({
                x: window.scrollX,
                y: window.scrollY,
                t: Date.now(),
                // Viewport information
                vw: window.innerWidth,
                vh: window.innerHeight,
                // Document dimensions
                docH: document.documentElement.scrollHeight,
                docW: document.documentElement.scrollWidth
            });

            if (behaviorData.scroll_events.length > CONFIG.MAX_EVENTS) {
                behaviorData.scroll_events = behaviorData.scroll_events.slice(-100);
            }
        }, 100);
    });

    /**
     * KEYBOARD ACTIVITY COLLECTION
     * Why: Captures typing patterns (privacy-safe - no actual keys)
     * When: Key presses (only timing, not content)
     */
    document.addEventListener('keydown', function(e) {
        behaviorData.key_events.push({
            t: Date.now(),
            // Safe metadata only
            keyCode: e.keyCode,
            location: e.location,
            // Modifier keys (safe to collect)
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey
        });

        if (behaviorData.key_events.length > CONFIG.MAX_EVENTS) {
            behaviorData.key_events = behaviorData.key_events.slice(-300);
        }
    });

    /**
     * PAGE NAVIGATION COLLECTION
     * Why: Gives insight into user journeys and session structure
     * When: Page load and navigation events
     */
    
    // Initial page view
    behaviorData.page_views.push({
        url: window.location.pathname,
        title: document.title,
        ref: document.referrer,
        t: Date.now(),
        loadTime: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0
    });

    // Single Page Application support
    window.addEventListener('popstate', function() {
        behaviorData.page_views.push({
            url: window.location.pathname,
            title: document.title,
            ref: document.referrer,
            t: Date.now(),
            type: 'spa_navigation'
        });
    });

    // Capture pushState/replaceState for SPAs
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function() {
        originalPushState.apply(this, arguments);
        triggerPageView('spa_pushstate');
    };

    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        triggerPageView('spa_replacestate');
    };

    function triggerPageView(type) {
        behaviorData.page_views.push({
            url: window.location.pathname,
            title: document.title,
            ref: document.referrer,
            t: Date.now(),
            type: type
        });
    }

    // =============================================
    // DATA TRANSMISSION
    // =============================================

    /**
     * SEND DATA TO BACKEND API
     * When: Every 10 seconds and when user leaves the page
     */
    const sendData = () => {
        // Don't send if no events collected
        if (behaviorData.mouse_events.length === 0 && 
            behaviorData.click_events.length === 0 && 
            behaviorData.scroll_events.length === 0 && 
            behaviorData.key_events.length === 0) {
            return;
        }

        // Prepare data for sending
        const dataToSend = {
            session_id: behaviorData.session_id,
            session_start: behaviorData.session_start,
            mouse_events: [...behaviorData.mouse_events],
            click_events: [...behaviorData.click_events],
            scroll_events: [...behaviorData.scroll_events],
            key_events: [...behaviorData.key_events],
            fingerprint: behaviorData.fingerprint,
            page_views: [...behaviorData.page_views],
            current_url: window.location.href,
            collected_at: Date.now()
        };

        // Use sendBeacon for reliability (especially on page unload)
        try {
            const success = navigator.sendBeacon 
                ? navigator.sendBeacon(CONFIG.API_ENDPOINT, JSON.stringify(dataToSend))
                : false;

            if (!success) {
                // Fallback to fetch API
                fetch(CONFIG.API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSend),
                    keepalive: true // Ensure request completes even if page unloads
                }).catch(error => {
                    console.warn('Bot detection: Failed to send data', error);
                });
            }

            // Clear sent events (keep recent ones for context)
            behaviorData.mouse_events = behaviorData.mouse_events.slice(-50);
            behaviorData.click_events = behaviorData.click_events.slice(-20);
            behaviorData.scroll_events = behaviorData.scroll_events.slice(-10);
            behaviorData.key_events = behaviorData.key_events.slice(-30);
            
        } catch (error) {
            console.warn('Bot detection: Error sending data', error);
        }
    };

    // =============================================
    // SCHEDULED DATA TRANSMISSION
    // =============================================

    // Send data every 10 seconds
    setInterval(sendData, CONFIG.BATCH_INTERVAL);

    // Send data when user leaves the page
    window.addEventListener('beforeunload', function() {
        // Add final page view for exit
        behaviorData.page_views.push({
            url: window.location.pathname,
            title: document.title,
            ref: document.referrer,
            t: Date.now(),
            type: 'page_exit'
        });
        
        sendData();
    });

    // Send data when page becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            behaviorData.page_views.push({
                url: window.location.pathname,
                title: document.title,
                ref: document.referrer,
                t: Date.now(),
                type: 'tab_return'
            });
        }
    });

    // =============================================
    // ERROR HANDLING & LOGGING
    // =============================================

    // Catch and log any script errors without breaking the page
    window.addEventListener('error', function(e) {
        console.warn('Bot detection script error:', e.error);
    });

    // Log script initialization
    console.log('Bot detection data collector initialized for session:', behaviorData.session_id);

})();