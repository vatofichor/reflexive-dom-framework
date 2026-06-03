/*
 * Copyright (c) 2026:
 * vatofichor - Sebastian Mass     [>_<]
 * & Assisted By Gemini Antigravity /|\
 */

/**
 * Reflexive DOM Framework (RDF)
 * A lightweight architecture for building agent-interoperable web dashboards.
 * 
 * LICENSE: MIT License
 */

class ReflexiveDOM {
    constructor(options = {}) {
        this.commands = new Map(); // id -> { element, note, handler }
        this.shortcuts = new Map(); // key -> commandId
        this.interceptors = []; // list of async (cmd) => boolean
        this.closeables = []; // list of objects with { close: function, priority: number, active: function }
        ReflexiveDOM.instance = this; // For global access 

        this.config = {
            promptMessage: options.promptMessage || "Enter Command (@id):",
            instructions: options.instructions || "Available Commands:\nScan DOM for [data-note] or ID to interact.",
            discoverySelector: options.discoverySelector || "[id][data-note]",
            shortcutPrefix: options.shortcutPrefix || "alt",
            navSelector: options.navSelector || ".rdf-nav",
            storagePrefix: options.storagePrefix || "rdf",
            ...options
        };

        this.storage = {
            customHotkeys: `${this.config.storagePrefix}-custom-hotkeys`,
            theme: `${this.config.storagePrefix}-theme`
        };

        this._injectCSS();
        this._loadCustomHotkeys();
        this._initKeyboardListener();
        this._registerSystemShortcuts();
    }

    /**
     * Scans the document for elements that match the discovery selector
     * and registers them as commands.
     */
    discoverCommands() {
        const elements = document.querySelectorAll(this.config.discoverySelector);
        elements.forEach(el => {
            const id = el.id.toLowerCase();
            const note = el.getAttribute('data-note') || el.getAttribute('data-desc') || "";
            const skipDiscovery = el.hasAttribute('data-rdf-ignore');
            if (id && !skipDiscovery) {
                this.registerCommand(id, { element: el, note });
            }
        });
        console.log(`[RDF] Discovered ${this.commands.size} commands.`);
    }

    /**
     * Automatically populates navigation containers with links to registered commands or custom links.
     * Replaces the legacy anchor_navigation.js logic.
     */
    renderNavigation() {
        const navContainers = document.querySelectorAll(this.config.navSelector);
        navContainers.forEach(container => {
            const navData = container.getAttribute('data-nav');
            let skipIds = [];
            if (navData) {
                try {
                    // Support both JSON and comma-separated lists
                    if (navData.startsWith('{')) {
                        const json = JSON.parse(navData.replace(/'/g, '"'));
                        skipIds = Object.keys(json).filter(k => json[k] === true);
                    } else {
                        skipIds = navData.split(',').map(s => s.trim());
                    }
                } catch (e) {
                    console.error('[RDF] Invalid data-nav attribute:', navData);
                }
            }

            const links = [];
            this.commands.forEach((data, id) => {
                if (!skipIds.includes(id) && data.note) {
                    const label = data.note.split(' (')[0];
                    links.push(`<a href="#${id}" class="rdf-nav-link" onclick="event.preventDefault(); ReflexiveDOM.instance.run(true, '${id}', {scroll: true})">${label}</a>`);
                }
            });

            container.innerHTML = `<b>${links.join(' ✶ ')}</b>`;
        });
    }

    /**
     * Manually registers a command.
     * @param {string} id - The command ID/Trigger.
     * @param {Object} data - { element, note, handler }
     */
    registerCommand(id, data) {
        this.commands.set(id.toLowerCase().trim(), {
            element: data.element || null,
            note: data.note || "",
            handler: data.handler || null
        });
    }

    /**
     * Registers an interceptor function that can handle commands before the default routing.
     * @param {Function} fn - Async function (commandString) => boolean (true if handled)
     */
    addInterceptor(fn) {
        this.interceptors.push(fn);
    }

    /**
     * Binds a keyboard shortcut to a command or function.
     * @param {string} key - The key (e.g., '/')
     * @param {string|Function} target - Command ID or callback function
     */
    bindShortcut(key, target) {
        this.shortcuts.set(key.toLowerCase(), target);
    }

    /**
     * Registers a UI component that can be closed via Escape.
     * @param {Object} component - { close: fn, priority: number, isActive: fn }
     */
    registerCloseable(component) {
        this.closeables.push(component);
        this.closeables.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * Attempts to close the most priority active UI component.
     * @returns {boolean} True if something was closed.
     */
    closeActiveUI() {
        const prompter = document.getElementById('rdf-prompter');
        if (prompter) {
            return false;
        }

        for (const item of this.closeables) {
            if (item.isActive()) {
                item.close();
                return true;
            }
        }
        return false;
    }

    /**
     * Executes a command by ID.
     * @param {string} rawCommand - The input string.
     * @param {boolean} skipPrompt - If true, executes immediately.
     * @param {Object} options - { scroll: boolean }
     */
    async run(skipPrompt = true, rawCommand = null, options = {}) {
        let cmdStr = rawCommand;

        if (!skipPrompt) {
            cmdStr = await this.openPrompter();
        }

        if (!cmdStr) return;

        // Parse command and arguments
        const parts = cmdStr.trim().split(/\s+/);
        const mainCommand = parts[0].toLowerCase(); // The command ID
        const textArgs = parts.slice(1); // The arguments as array

        // 1. Run through interceptors (Pass original string)
        const cleanedFull = cmdStr.toLowerCase().trim();
        for (const intercept of this.interceptors) {
            if (await intercept(cleanedFull)) return;
        }

        // 2. Resolve command
        // Check exact match first
        let cmd = this.commands.get(mainCommand);

        if (cmd) {
            if (cmd.handler) {
                await cmd.handler(textArgs); // Pass args to handler
            } else if (cmd.element) {
                if (options.scroll) {
                    cmd.element.scrollIntoView({ behavior: 'smooth' });
                }
                cmd.element.click();
            }
            console.log(`[RDF] Executed: ${mainCommand}`);
        } else {
            // Fallback: Multi-stage ID Lookup

            // A. Exact Match (Case-Sensitive - e.g. for camelCase IDs)
            let el = document.getElementById(cmdStr.trim());

            // B. Lowercase Match
            if (!el) {
                el = document.getElementById(mainCommand);
            }

            // C. Case-Insensitive Scan (Expensive, but necessary fallback)
            if (!el) {
                // Scan all elements with an ID attribute for a case-insensitive match
                const allIds = document.querySelectorAll('[id]');
                for (const node of allIds) {
                    if (node.id.toLowerCase() === mainCommand) {
                        el = node;
                        break;
                    }
                }
            }

            if (el) {
                if (options.scroll) {
                    el.scrollIntoView({ behavior: 'smooth' });
                }
                el.click();
                console.log(`[RDF] Executed (Direct ID): ${el.id}`);
            } else {
                console.warn(`[RDF] Command not found: ${cmdStr}`);
                alert(`Command not found: ${cmdStr}`);
            }
        }
    }

    /**
     * Keyboard listener setup.
     */
    _initKeyboardListener() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.closeActiveUI()) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }

            if (this.config.shortcutPrefix === 'alt' && !e.altKey) return;

            const key = e.key.toLowerCase();
            const target = this.shortcuts.get(key);

            if (target) {
                e.preventDefault();
                if (typeof target === 'function') {
                    target();
                } else {
                    this.run(true, target);
                }
            }
        });
    }

    /**
     * UI: Opens the command palette.
     * @returns {Promise<string|null>} The command entered or null.
     */
    openPrompter() {
        if (document.getElementById('rdf-prompter')) return Promise.resolve(null);

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'rdf-prompter';
            overlay.className = 'rdf-prompter-overlay';

            const container = document.createElement('div');
            container.className = 'rdf-prompter-container';

            // Header
            const header = document.createElement('div');
            header.className = 'rdf-prompter-header';
            header.textContent = this.config.promptMessage;
            container.appendChild(header);

            // Instructions / Discoveries
            const inst = document.createElement('div');
            inst.className = 'rdf-prompter-instructions';
            inst.innerHTML = this._getDynamicInstructions();
            container.appendChild(inst);

            // Input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'rdf-prompter-input';
            input.placeholder = 'Type a command...';
            container.appendChild(input);

            // Footer
            const footer = document.createElement('div');
            footer.className = 'rdf-prompter-footer';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'rdf-close-btn';
            closeBtn.textContent = 'CANCEL';

            const closePrompter = (val) => {
                document.body.removeChild(overlay);
                document.removeEventListener('focusin', trapFocus); // Cleanup
                resolve(val);
            };

            closeBtn.onclick = () => closePrompter(null);
            footer.appendChild(closeBtn);

            const hint = document.createElement('div');
            hint.style.color = 'gray';
            hint.style.fontSize = '12px';
            hint.innerHTML = '<span class="rdf-shortcut-key">ESC</span> to exit';
            footer.appendChild(hint);

            container.appendChild(footer);
            overlay.appendChild(container);
            document.body.appendChild(overlay);

            input.focus();

            // Focus Trap
            const focusableElements = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const trapFocus = (e) => {
                const isTab = (e.key === 'Tab' || e.keyCode === 9);
                if (!isTab) return;

                if (e.shiftKey) {
                    if (document.activeElement === firstElement || document.activeElement === overlay) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            };

            // Listen on overlay to catch bubbling
            overlay.addEventListener('keydown', trapFocus);

            // Interaction
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    closePrompter(input.value);
                } else if (e.key === 'Escape') {
                    closePrompter(null);
                }
            });

            // Click outside to close
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closePrompter(null);
                }
            });
        });
    }

    _getDynamicInstructions() {
        let text = this.config.instructions + "\n\n";

        // Helper to escape HTML for safety
        const escapeHtml = (str) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        // Commands Section
        if (this.commands.size > 0) {
            text += "[ COMMANDS ]\n";
            const sorted = Array.from(this.commands.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            const reservedCmds = ['find-replace', 'rdf-tools'];
            sorted.forEach(([id, data]) => {
                const isReserved = reservedCmds.includes(id);
                const displayId = escapeHtml(id);
                const displayNote = escapeHtml(data.note);
                if (isReserved) {
                    text += `<span style="color: #00ff66; font-weight: bold;">${displayId}</span>: ${displayNote}\n`;
                } else {
                    text += `${displayId}: ${displayNote}\n`;
                }
            });
            text += "\n";
        }

        // Shortcuts Section
        if (this.shortcuts.size > 0) {
            text += "[ KEYBOARD SHORTCUTS ]\n";
            const sorted = Array.from(this.shortcuts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
            const reserved = this._getReservedKeys();
            sorted.forEach(([key, target]) => {
                const prefix = this.config.shortcutPrefix === 'alt' ? 'Alt + ' : '';
                const targetName = typeof target === 'function' ? '(function)' : target;
                const note = typeof target === 'string' && this.commands.has(target)
                    ? this.commands.get(target).note
                    : targetName;

                const isReserved = reserved.includes(key);
                const displayKey = escapeHtml(`${prefix}${key.toUpperCase()}`);
                const displayNote = escapeHtml(note);

                if (isReserved) {
                    text += `<span style="color: #00ff66; font-weight: bold;">${displayKey}</span> : ${displayNote}\n`;
                } else {
                    text += `${displayKey} : ${displayNote}\n`;
                }
            });
        }

        return text.replace(/\n/g, '<br>');
    }

    _injectCSS() {
        const theme = localStorage.getItem(this.storage.theme) || 'default';
        const scriptTag = document.querySelector('script[src*="rdf.js"]');
        let basePath = './reflexive-dom-framework/styles/';
        
        if (scriptTag) {
            const src = scriptTag.src;
            if (src.includes('scripts/rdf.js')) {
                basePath = src.replace(/scripts\/rdf\.js$/, 'styles/');
            } else {
                basePath = src.replace(/rdf\.js$/, '');
            }
        }
        
        const filename = theme === 'alt' ? 'rdf-alt.css' : 'rdf.css';

        const existing = document.getElementById('rdf-theme-stylesheet');
        if (existing) existing.remove();

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${basePath}${filename}`;
        link.id = 'rdf-theme-stylesheet';
        document.head.insertBefore(link, document.head.firstChild);
    }

    _loadCustomHotkeys() {
        try {
            const stored = localStorage.getItem(this.storage.customHotkeys);
            if (stored) {
                const hotkeys = JSON.parse(stored);
                Object.entries(hotkeys).forEach(([key, commandId]) => {
                    this.bindShortcut(key, commandId);
                });
                console.log(`[RDF] Loaded ${Object.keys(hotkeys).length} custom hotkeys.`);
            }
        } catch (err) {
            console.error('[RDF] Failed to load custom hotkeys:', err);
        }
    }

    _registerSystemShortcuts() {
        this.bindShortcut('/', () => this.run(false));
        this.bindShortcut('o', () => this.openOptions());
    }

    _getReservedKeys() {
        return ['/', 'o', 'h', '.'];
    }

    openOptions() {
        if (document.getElementById('rdf-options')) return;

        const overlay = document.createElement('div');
        overlay.id = 'rdf-options';
        overlay.className = 'rdf-options-overlay';

        const modal = document.createElement('div');
        modal.className = 'rdf-options-modal';

        modal.innerHTML = `
            <div class="rdf-options-header">
                <span>RDF Options</span>
                <span class="rdf-options-close">&times;</span>
            </div>
            <div class="rdf-options-tabs">
                <button class="rdf-tab-btn active" data-tab="hotkeys">Custom Hotkeys</button>
                <button class="rdf-tab-btn" data-tab="theme">Theme</button>
            </div>
            <div class="rdf-options-body">
                <div class="rdf-tab-content active" data-tab="hotkeys">
                    <h3>Custom Alt Hotkeys</h3>
                    <button class="rdf-btn-add-hotkey">+ Add New Hotkey</button>
                    <div class="rdf-hotkey-list"></div>
                </div>
                <div class="rdf-tab-content" data-tab="theme">
                    <h3>Theme Selection</h3>
                    <label><input type="radio" name="rdf-theme" value="default"> Default (rdf.css)</label><br>
                    <label><input type="radio" name="rdf-theme" value="alt"> Alternate (rdf-alt.css)</label><br>
                    <button class="rdf-btn-apply-theme">Apply & Reload</button>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        this._bindOptionsEvents(overlay, modal);
        this._renderHotkeyList();
        this._loadThemeSelection();

        this.registerCloseable({
            priority: 25,
            isActive: () => !!document.getElementById('rdf-options'),
            close: () => this._closeOptions()
        });
    }

    _bindOptionsEvents(overlay, modal) {
        modal.querySelector('.rdf-options-close').onclick = () => this._closeOptions();
        overlay.onclick = (e) => { if (e.target === overlay) this._closeOptions(); };

        modal.querySelectorAll('.rdf-tab-btn').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('.rdf-tab-btn').forEach(b => b.classList.remove('active'));
                modal.querySelectorAll('.rdf-tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                modal.querySelector(`.rdf-tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
            };
        });

        modal.querySelector('.rdf-btn-add-hotkey').onclick = () => this._showAddHotkeyForm();
        modal.querySelector('.rdf-btn-apply-theme').onclick = () => this._applyTheme();
    }

    _renderHotkeyList() {
        const container = document.querySelector('.rdf-hotkey-list');
        if (!container) return;

        const stored = JSON.parse(localStorage.getItem(this.storage.customHotkeys) || '{}');
        const reserved = this._getReservedKeys();

        container.innerHTML = '';
        Object.entries(stored).forEach(([key, commandId]) => {
            const item = document.createElement('div');
            item.className = 'rdf-hotkey-item';
            item.innerHTML = `
                <span>Alt+${key.toUpperCase()} → ${commandId}</span>
                <button class="rdf-btn-delete" data-key="${key}">🗑️</button>
            `;
            container.appendChild(item);
        });

        container.querySelectorAll('.rdf-btn-delete').forEach(btn => {
            btn.onclick = () => this._deleteHotkey(btn.dataset.key);
        });
    }

    _showAddHotkeyForm() {
        const container = document.querySelector('.rdf-hotkey-list');
        const existing = container.querySelector('.rdf-add-form');
        if (existing) return;

        const commands = Array.from(this.commands.keys()).sort();
        const options = commands.map(id => `<option value="${id}">${id}</option>`).join('');

        const form = document.createElement('div');
        form.className = 'rdf-add-form';
        form.innerHTML = `
            <input type="text" class="rdf-input-key" placeholder="Key (single char)" maxlength="1">
            <select class="rdf-select-cmd">${options}</select>
            <button class="rdf-btn-save">Save</button>
            <button class="rdf-btn-cancel">Cancel</button>
            <span class="rdf-error"></span>
        `;

        container.insertBefore(form, container.firstChild);

        form.querySelector('.rdf-btn-save').onclick = () => this._saveHotkey();
        form.querySelector('.rdf-btn-cancel').onclick = () => form.remove();
    }

    _saveHotkey() {
        const form = document.querySelector('.rdf-add-form');
        const key = form.querySelector('.rdf-input-key').value.toLowerCase().trim();
        const commandId = form.querySelector('.rdf-select-cmd').value;
        const error = form.querySelector('.rdf-error');

        if (!key || !commandId) {
            error.textContent = 'Key and command required';
            return;
        }

        const reserved = this._getReservedKeys();
        if (reserved.includes(key)) {
            error.textContent = `Alt+${key.toUpperCase()} is reserved`;
            return;
        }

        const stored = JSON.parse(localStorage.getItem(this.storage.customHotkeys) || '{}');

        // Remove old mapping if this command already mapped to different key
        Object.keys(stored).forEach(existingKey => {
            if (stored[existingKey] === commandId && existingKey !== key) {
                delete stored[existingKey];
                this.shortcuts.delete(existingKey);
            }
        });

        stored[key] = commandId;
        localStorage.setItem(this.storage.customHotkeys, JSON.stringify(stored));

        this.bindShortcut(key, commandId);
        form.remove();
        this._renderHotkeyList();
    }

    _deleteHotkey(key) {
        const stored = JSON.parse(localStorage.getItem(this.storage.customHotkeys) || '{}');
        delete stored[key];
        localStorage.setItem(this.storage.customHotkeys, JSON.stringify(stored));

        this.shortcuts.delete(key);
        this._renderHotkeyList();
    }

    _loadThemeSelection() {
        const current = localStorage.getItem(this.storage.theme) || 'default';
        document.querySelector(`input[name="rdf-theme"][value="${current}"]`).checked = true;
    }

    _applyTheme() {
        const selected = document.querySelector('input[name="rdf-theme"]:checked').value;
        localStorage.setItem(this.storage.theme, selected);
        location.reload();
    }

    _closeOptions() {
        const overlay = document.getElementById('rdf-options');
        if (overlay) overlay.remove();
    }
}

// Export for pluggable use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReflexiveDOM;
} else {
    window.ReflexiveDOM = ReflexiveDOM;
}
