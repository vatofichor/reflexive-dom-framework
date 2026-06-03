/*
 * Copyright (c) 2026:
 * vatofichor - Sebastian Mass     [>_<]
 * & Assisted By Gemini Antigravity /|\
 */

/**
 * Reflexive Drawers Module
 * Part of the Reflexive DOM Framework (RDF)
 * 
 * Centralized API for managing side-panels and tool drawers.
 */
(function() {
    // 1. Dependency check: Core RDF must be loaded first
    if (!window.ReflexiveDOM) {
        console.error("[RDF-Drawers] ReflexiveDOM core must be loaded first.");
        return;
    }


    // 3. Module check: RDFUtils must be loaded first
    if (!window.RDFUtils) {
        console.error("[RDF-Drawers] RDFUtils must be loaded before RDFDrawers.");
        return;
    }

    class RDFDrawers {
        constructor(options = {}) {
            RDFDrawers.instance = this; // Expose global standard drawers instance

            this.config = {
                selector: options.selector || '.rdf-drawer',
                activeClass: options.activeClass || 'open',
                mobileBreakpoint: options.mobileBreakpoint || 1000,
                onOpen: options.onOpen || null,
                onClose: options.onClose || null,
                ...options
            };

            this.registeredDrawers = new Map(); // id -> config
            this.initialPositions = new Map();
            this.activeDrawer = null;

            this._init();
        }

        _init() {
            // 1. Discover existing drawers in DOM
            const existing = document.querySelectorAll(this.config.selector);
            existing.forEach(el => {
                if (el.id) {
                    this.register({
                        id: el.id,
                        element: el,
                        title: el.getAttribute('data-note') || el.id
                    });
                }
            });

            // 2. Responsive Handler
            this._handleResponsive();
            window.addEventListener('resize', () => {
                this._handleResponsive();
                this._injectMobileToggles();
            });

            // 3. Register with ReflexiveDOM Escape Coordinator
            if (window.ReflexiveDOM && window.ReflexiveDOM.instance) {
                window.ReflexiveDOM.instance.registerCloseable({
                    priority: 10,
                    isActive: () => this.activeDrawer !== null,
                    close: () => {
                        if (this.activeDrawer) this.close(this.activeDrawer.id);
                    }
                });
            }

            console.log(`[RDF-Drawers] Initialized.`);
        }

        /**
         * Programmatically registers a drawer.
         * If element doesn't exist, it creates a shell.
         */
        register(config) {
            const id = config.id.toLowerCase();

            // Default config
            const fullConfig = {
                id,
                title: config.title || id,
                element: config.element || document.getElementById(id),
                content: config.content || '',
                onOpen: config.onOpen || null,
                onClose: config.onClose || null,
                ...config
            };

            // If element doesn't exist, create it
            if (!fullConfig.element) {
                fullConfig.element = this._createDrawerShell(fullConfig);
            }

            // Add class if missing
            if (!fullConfig.element.classList.contains('rdf-drawer')) {
                fullConfig.element.classList.add('rdf-drawer');
            }

            // Save initial position for responsive logic
            if (!this.initialPositions.has(id)) {
                this.initialPositions.set(id, {
                    parent: fullConfig.element.parentElement || document.body,
                    nextSibling: fullConfig.element.nextElementSibling
                });
            }

            this.registeredDrawers.set(id, fullConfig);

            // Re-inject mobile toggles to include new registration
            this._injectMobileToggles();

            // Automatically register as an RDF command if Core is present
            if (window.ReflexiveDOM && window.ReflexiveDOM.instance) {
                window.ReflexiveDOM.instance.registerCommand(id, {
                    note: `Toggle ${fullConfig.title}`,
                    handler: () => this.toggle(id)
                });
            }

            return fullConfig.element;
        }

        /**
         * Toggles a drawer by ID.
         */
        toggle(id) {
            const drawerId = id.toLowerCase();
            const config = this.registeredDrawers.get(drawerId);
            if (!config) return;

            const isOpen = config.element.classList.contains(this.config.activeClass);
            if (isOpen) {
                this.close(drawerId);
            } else {
                this.open(drawerId);
            }
        }

        open(id) {
            const drawerId = id.toLowerCase();
            const config = this.registeredDrawers.get(drawerId);
            if (!config) return;

            // Exclusive state
            if (this.activeDrawer && this.activeDrawer !== config.element) {
                this.activeDrawer.classList.remove(this.config.activeClass);
                const prevId = this.activeDrawer.id.toLowerCase();
                const prevConfig = this.registeredDrawers.get(prevId);
                if (prevConfig && prevConfig.onClose) prevConfig.onClose(this.activeDrawer);
            }

            config.element.classList.add(this.config.activeClass);
            this.activeDrawer = config.element;

            // Focus first input
            this._autoFocus(config.element);

            // Hooks
            if (config.onOpen) config.onOpen(config.element);
            if (this.config.onOpen) this.config.onOpen(config.element);
        }

        close(id) {
            const drawerId = id.toLowerCase();
            const config = this.registeredDrawers.get(drawerId);
            if (!config) return;

            config.element.classList.remove(this.config.activeClass);
            if (this.activeDrawer === config.element) {
                this.activeDrawer = null;
            }

            // Hooks
            if (config.onClose) config.onClose(config.element);
            if (this.config.onClose) this.config.onClose(config.element);
        }

        /**
         * Creates a basic drawer shell if one isn't in the DOM.
         */
        _createDrawerShell(config) {
            const el = document.createElement('div');
            el.id = config.id;
            el.className = 'rdf-drawer';

            const header = document.createElement('div');
            header.className = 'rdf-drawer-header';
            header.innerHTML = `<h3>${config.title}</h3>`;

            const closeIcon = document.createElement('span');
            closeIcon.className = 'rdf-drawer-close-x';
            closeIcon.innerHTML = '&times;';
            closeIcon.onclick = () => this.close(config.id);
            header.appendChild(closeIcon);

            const content = document.createElement('div');
            content.className = 'rdf-drawer-content';
            content.innerHTML = config.content;

            el.appendChild(header);
            el.appendChild(content);

            // Append to body by default (will be handled by responsive logic)
            document.body.appendChild(el);
            return el;
        }

        _handleResponsive() {
            const isMobile = window.innerWidth <= this.config.mobileBreakpoint;

            this.registeredDrawers.forEach((config, id) => {
                const drawer = config.element;
                if (isMobile) {
                    drawer.classList.remove('drawer-fixed');
                    drawer.classList.add('drawer-inline');

                    const pos = this.initialPositions.get(id);
                    if (pos && pos.parent && drawer.parentElement !== pos.parent) {
                        if (pos.nextSibling) {
                            pos.parent.insertBefore(drawer, pos.nextSibling);
                        } else {
                            pos.parent.appendChild(drawer);
                        }
                    }
                } else {
                    drawer.classList.remove('drawer-inline');
                    drawer.classList.add('drawer-fixed');
                    if (drawer.parentElement !== document.body) {
                        document.body.appendChild(drawer);
                    }
                }
            });
        }

        _injectMobileToggles() {
            const isMobile = window.innerWidth <= this.config.mobileBreakpoint;
            const containerId = 'rdf-mobile-toggles';
            let container = document.getElementById(containerId);

            if (!isMobile) {
                if (container) container.style.display = 'none';
                return;
            }

            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                container.className = 'rdf-mobile-toggle-container';
                document.body.appendChild(container);
            }
            container.style.display = 'flex';

            this.registeredDrawers.forEach((config, id) => {
                const toggleId = `rdf-toggle-${id}`;
                if (!document.getElementById(toggleId)) {
                    const btn = document.createElement('button');
                    btn.id = toggleId;
                    btn.className = 'rdf-mobile-toggle';
                    btn.title = `Toggle ${config.title}`;
                    btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>`;
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        this.toggle(id);
                    };
                    container.appendChild(btn);
                }
            });
        }

        _autoFocus(drawer) {
            const input = drawer.querySelector('input, textarea, select');
            if (input) {
                setTimeout(() => input.focus(), 50);
            }
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RDFDrawers;
    } else {
        window.RDFDrawers = RDFDrawers;
    }
})();
