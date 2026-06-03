/*
 * Copyright (c) 2026:
 * vatofichor - Sebastian Mass     [>_<]
 * & Assisted By Gemini Antigravity /|\
 */

/**
 * Reflexive Editor Module (RDF)
 * Provides text processing tools like Find & Replace.
 * Scoped to the currently focused text element.
 */
(function() {
    // 1. Dependency check: Core RDF must be loaded first
    if (!window.ReflexiveDOM) {
        console.error("[RDF-Editor] ReflexiveDOM core must be loaded first.");
        return;
    }


    // 3. Module check: RDFTools must be loaded first
    if (!window.RDFTools) {
        console.error("[RDF-Editor] RDFTools must be loaded before RDFEditor.");
        return;
    }

    class RDFEditor {
        constructor(options = {}) {
            this.config = {
                modalId: options.modalId || 'rdf-editor-fr-modal',
                ...options
            };

            this.activeTarget = null;
            this.active = false;
            this.elements = {};

            this._init();
        }

        _init() {
            // 1. Register with ReflexiveDOM if available
            if (window.ReflexiveDOM && window.ReflexiveDOM.instance) {
                const rdf = window.ReflexiveDOM.instance;

                // Register Command
                rdf.registerCommand('find-replace', {
                    note: 'Open Find & Replace for focused text element',
                    handler: () => this.toggle()
                });

                // Register Shortcut (Alt+H for origin compatibility)
                rdf.bindShortcut('h', 'find-replace');

                // Register as Closeable
                rdf.registerCloseable({
                    priority: 20, // Higher than drawers
                    isActive: () => this.active,
                    close: () => this.close()
                });
            }

            // 2. Listen to selection changes for WYSIWYG floating toolbar
            document.addEventListener('selectionchange', () => this._handleSelectionChange());

            console.log('[RDF-Editor] Initialized.');
        }

        /**
         * Toggles the Find & Replace tool.
         * Only works if a text element is focused.
         */
        toggle() {
            if (this.active) {
                this.close();
            } else {
                this.open();
            }
        }

        open() {
            const target = document.activeElement;
            const isValid = target && (
                target.tagName === 'TEXTAREA' ||
                (target.tagName === 'INPUT' && target.type === 'text') ||
                target.hasAttribute('contenteditable') ||
                target.contentEditable === 'true'
            );

            if (!isValid) {
                console.warn('[RDF-Editor] No valid text element focused.');
                return;
            }

            this.activeTarget = target;
            this.active = true;

            this._ensureUI();
            this.elements.modal.classList.add('active');
            this.elements.findInput.focus();
            this.elements.findInput.select();

            this._attachInterceptor();
        }

        close() {
            if (!this.active) return;

            this._detachInterceptor();

            this.active = false;
            if (this.elements.modal) {
                this.elements.modal.classList.remove('active');
            }
            if (this.activeTarget) {
                this.activeTarget.focus();
            }
        }

        _attachInterceptor() {
            if (!this.activeTarget) return;
            this._interceptor = (e) => {
                if (e.key === 'Enter' && this.active && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.findNext();
                }
            };
            this.activeTarget.addEventListener('keydown', this._interceptor);
        }

        _detachInterceptor() {
            if (this.activeTarget && this._interceptor) {
                this.activeTarget.removeEventListener('keydown', this._interceptor);
                this._interceptor = null;
            }
        }

        /**
         * Ensures the UI is present in the DOM.
         */
        _ensureUI() {
            if (this.elements.modal) return;

            const modal = document.createElement('div');
            modal.id = this.config.modalId;
            modal.className = 'rdf-editor-modal';
            modal.innerHTML = `
                <div class="rdf-editor-header">
                    <span>Find & Replace</span>
                    <span class="rdf-editor-close">&times;</span>
                </div>
                <div class="rdf-editor-body">
                    <div class="rdf-editor-row">
                        <input type="text" class="fr-find" placeholder="Find text...">
                    </div>
                    <div class="rdf-editor-row">
                        <input type="text" class="fr-replace" placeholder="Replace with...">
                    </div>
                    <div class="rdf-editor-options">
                        <label><input type="checkbox" class="fr-case"> Case</label>
                        <label><input type="checkbox" class="fr-loose"> Loose</label>
                    </div>
                    <div class="rdf-editor-actions">
                        <button class="fr-btn-find">Find</button>
                        <button class="fr-btn-replace">Replace</button>
                        <button class="fr-btn-all">All</button>
                    </div>
                    <div class="fr-status"></div>
                </div>
            `;

            document.body.appendChild(modal);

            this.elements = {
                modal,
                findInput: modal.querySelector('.fr-find'),
                replaceInput: modal.querySelector('.fr-replace'),
                caseCheck: modal.querySelector('.fr-case'),
                looseCheck: modal.querySelector('.fr-loose'),
                status: modal.querySelector('.fr-status'),
                closeBtn: modal.querySelector('.rdf-editor-close')
            };

            // Attach Events
            this.elements.closeBtn.onclick = () => this.close();
            modal.querySelector('.fr-btn-find').onclick = () => this.findNext();
            modal.querySelector('.fr-btn-replace').onclick = () => this.replace();
            modal.querySelector('.fr-btn-all').onclick = () => this.replaceAll();

            // Keyboard support within modal
            modal.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.findNext();
                }
            };
        }

        _getRegex() {
            const query = this.elements.findInput.value;
            if (!query) return null;

            const isCase = this.elements.caseCheck.checked;
            const isLoose = this.elements.looseCheck.checked;
            const flags = isCase ? 'g' : 'gi';

            let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (isLoose) {
                pattern = `\\s*${pattern}\\s*`;
            }

            try {
                return new RegExp(pattern, flags);
            } catch (e) {
                this._setStatus('Invalid Regex', true);
                return null;
            }
        }

        findNext() {
            const regex = this._getRegex();
            if (!regex || !this.activeTarget) return;

            const target = this.activeTarget;
            const isContentEditable = target.hasAttribute('contenteditable') || target.contentEditable === 'true';

            if (isContentEditable) {
                this._findContentEditable(regex);
            } else {
                this._findStandard(regex);
            }
        }

        _findStandard(regex) {
            const target = this.activeTarget;
            const text = target.value;
            const start = target.selectionEnd;

            const suffix = text.substring(start);
            let match = regex.exec(suffix);
            let index = -1;
            let length = 0;

            if (match) {
                index = start + match.index;
                length = match[0].length;
            } else {
                // Wrap
                match = regex.exec(text);
                if (match) {
                    index = match.index;
                    length = match[0].length;
                    this._setStatus('Wrapped');
                }
            }

            if (index !== -1) {
                // Highlight match in target
                target.setSelectionRange(index, index + length);
                // target.focus(); // Keep focus on target (already there due to interceptor or logic flow)

                this._setStatus('Found');
            } else {
                this._setStatus('Not found', true);
            }
        }

        _findContentEditable(regex) {
            // Contenteditable elements require complex DOM walking.
            // Standard Find & Replace is currently optimized for standard text inputs and textareas.
            this._setStatus('Not yet optimized for contenteditable', true);
        }

        replace() {
            if (!this.activeTarget) return;

            const target = this.activeTarget;
            const isContentEditable = target.hasAttribute('contenteditable') || target.contentEditable === 'true';
            if (isContentEditable) return; // Contenteditable elements are not currently supported

            const start = target.selectionStart;
            const end = target.selectionEnd;
            const replacement = this.elements.replaceInput.value;

            if (start !== end) {
                // Safety backup
                navigator.clipboard.writeText(target.value);

                target.setRangeText(replacement, start, end, 'select');
                this._setStatus('Replaced');
                this.findNext();
            } else {
                this.findNext();
            }
        }

        replaceAll() {
            const regex = this._getRegex();
            if (!regex || !this.activeTarget) return;

            const target = this.activeTarget;
            const isContentEditable = target.hasAttribute('contenteditable') || target.contentEditable === 'true';
            if (isContentEditable) return;

            // Safety backup
            navigator.clipboard.writeText(target.value);

            const oldText = target.value;
            const newText = oldText.replace(regex, this.elements.replaceInput.value);

            if (oldText !== newText) {
                target.value = newText;
                this._setStatus('Replaced All');
            } else {
                this._setStatus('No matches');
            }
        }

        _setStatus(msg, isError = false) {
            if (!this.elements.status) return;
            this.elements.status.textContent = msg;
            this.elements.status.style.color = isError ? '#ff5555' : 'var(--rdf-accent)';
            setTimeout(() => {
                if (this.elements.status.textContent === msg) this.elements.status.textContent = '';
            }, 2000);
        }

        _handleSelectionChange() {
            if (this._selectionTimeout) clearTimeout(this._selectionTimeout);
            this._selectionTimeout = setTimeout(() => {
                this._updateSelectionToolbar();
            }, 50);
        }

        _updateSelectionToolbar() {
            const activeEl = document.activeElement;
            if (!activeEl) {
                this.hideToolbar();
                return;
            }

            const isTextArea = activeEl.tagName === 'TEXTAREA';
            const isInputText = activeEl.tagName === 'INPUT' && activeEl.type === 'text';
            const isContentEditable = activeEl.hasAttribute('contenteditable') || activeEl.contentEditable === 'true';

            if (!isTextArea && !isInputText && !isContentEditable) {
                this.hideToolbar();
                return;
            }

            let hasSelection = false;
            let textType = 'markdown';
            let rect = null;

            if (isContentEditable) {
                textType = 'html';
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
                    hasSelection = true;
                    const range = selection.getRangeAt(0);
                    rect = range.getBoundingClientRect();
                }
            } else {
                const start = activeEl.selectionStart;
                const end = activeEl.selectionEnd;
                if (start !== undefined && end !== undefined && start !== end && (end - start) > 0 && activeEl.value.substring(start, end).trim().length > 0) {
                    hasSelection = true;
                    // Use bounding client rect of the input as a positioning anchor
                    rect = activeEl.getBoundingClientRect();
                }
            }

            if (!hasSelection) {
                this.hideToolbar();
                return;
            }

            this._ensureToolbar();

            // Position coordinates (absolute position relative to document body)
            let left = 0;
            let top = 0;

            if (rect) {
                left = rect.left + rect.width / 2 + window.scrollX;
                top = rect.top - 10 + window.scrollY; // Position 10px above selection/element
            }

            this.activeTarget = activeEl;
            this.activeTargetType = textType;

            // Make active at initial position so browser renders it for layout queries
            this.toolbar.style.left = `${left}px`;
            this.toolbar.style.top = `${top}px`;
            this.toolbar.classList.add('active');

            // Viewport edge detection using actual post-render client bounds
            const tRect = this.toolbar.getBoundingClientRect();
            const minX = 10;
            const maxX = window.innerWidth - 10;
            const minY = 10;

            let diffX = 0;
            if (tRect.left < minX) {
                diffX = minX - tRect.left; // shift right
            } else if (tRect.right > maxX) {
                diffX = maxX - tRect.right; // shift left
            }

            let diffY = 0;
            if (tRect.top < minY && rect) {
                // Flip below selection/element: height of element + 20px margins + height of toolbar
                diffY = rect.height + 20 + tRect.height;
            }

            // Adjust positions by the calculated offsets to re-enter viewport perfectly
            if (diffX !== 0 || diffY !== 0) {
                this.toolbar.style.left = `${left + diffX}px`;
                this.toolbar.style.top = `${top + diffY}px`;
            }

            // Dynamic Active Button State Highlights
            if (isContentEditable && this.toolbar) {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    this.toolbar.querySelectorAll('.tb-btn').forEach(btn => {
                        const action = btn.dataset.action;
                        if (this._isActionActive(action, range, activeEl)) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                }
            } else if (this.toolbar) {
                this.toolbar.querySelectorAll('.tb-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
            }
        }

        _nodeMatchesAction(node, action) {
            if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
            const tagName = node.tagName.toLowerCase();
            
            if (action === 'bold') {
                if (tagName === 'b' || tagName === 'strong') return true;
                const weight = node.style.fontWeight;
                if (weight === 'bold' || weight === '700' || parseInt(weight) >= 700) return true;
            } else if (action === 'italic') {
                if (tagName === 'i' || tagName === 'em') return true;
                if (node.style.fontStyle === 'italic') return true;
            } else if (action === 'underline') {
                if (tagName === 'u') return true;
                if (node.style.textDecoration && node.style.textDecoration.includes('underline')) return true;
            } else if (action === 'highlight') {
                if (tagName === 'mark') return true;
                if (node.style.backgroundColor || node.style.background) return true;
            } else if (action.startsWith('h')) {
                if (tagName === action.toLowerCase()) return true;
            }
            return false;
        }

        _isActionActive(action, range, root) {
            return !!this._getAncestorNode(range, action, root);
        }

        _getAncestorNode(range, action, root) {
            if (!range) return null;
            let node = range.commonAncestorContainer;
            while (node && node !== root) {
                if (this._nodeMatchesAction(node, action)) {
                    return node;
                }
                node = node.parentNode;
            }
            // Check startContainer and endContainer ancestors
            let startNode = range.startContainer;
            while (startNode && startNode !== root) {
                if (this._nodeMatchesAction(startNode, action)) {
                    return startNode;
                }
                startNode = startNode.parentNode;
            }
            let endNode = range.endContainer;
            while (endNode && endNode !== root) {
                if (this._nodeMatchesAction(endNode, action)) {
                    return endNode;
                }
                endNode = endNode.parentNode;
            }
            return null;
        }

        _ensureToolbar() {
            if (this.toolbar) return;

            const toolbar = document.createElement('div');
            toolbar.id = 'rdf-editor-inline-toolbar';
            toolbar.className = 'rdf-editor-inline-toolbar';
            toolbar.innerHTML = `
                <button class="tb-btn" data-action="bold" title="Bold (B)"><b>B</b></button>
                <button class="tb-btn" data-action="italic" title="Italic (I)"><i>I</i></button>
                <button class="tb-btn" data-action="underline" title="Underline (U)"><u>U</u></button>
                <button class="tb-btn" data-action="highlight" title="Highlight (H)"><mark>H</mark></button>
                <button class="tb-btn" data-action="h1" title="H1">H1</button>
                <button class="tb-btn" data-action="h2" title="H2">H2</button>
                <button class="tb-btn" data-action="h3" title="H3">H3</button>
                <button class="tb-btn" data-action="h4" title="H4">H4</button>
            `;

            document.body.appendChild(toolbar);
            this.toolbar = toolbar;

            // Attach click events
            toolbar.querySelectorAll('.tb-btn').forEach(btn => {
                btn.addEventListener('mousedown', (e) => {
                    // Prevent taking focus away from text input!
                    e.preventDefault();
                    e.stopPropagation();
                    this._applyFormatting(btn.dataset.action);
                });
            });
        }

        _unwrapNode(node) {
            if (!node || !node.parentNode) return;
            const parent = node.parentNode;
            while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }
            parent.removeChild(node);
        }

        _applyFormatting(action) {
            const target = this.activeTarget;
            if (!target) return;

            const type = this.activeTargetType;

            if (type === 'markdown') {
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const val = target.value;
                const selectedText = val.substring(start, end);
                let newText = selectedText;

                if (action === 'bold') {
                    newText = `**${selectedText}**`;
                } else if (action === 'italic') {
                    newText = `*${selectedText}*`;
                } else if (action === 'underline') {
                    newText = `<u>${selectedText}</u>`;
                } else if (action === 'highlight') {
                    newText = `<mark>${selectedText}</mark>`;
                } else if (action.startsWith('h')) {
                    const level = action.substring(1);
                    const hashPrefix = '#'.repeat(parseInt(level)) + ' ';
                    
                    // Prepend hashPrefix to the beginning of the line containing the selection start
                    const lastNewLine = val.lastIndexOf('\n', start - 1);
                    const lineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
                    
                    target.value = val.substring(0, lineStart) + hashPrefix + val.substring(lineStart);
                    target.selectionStart = start + hashPrefix.length;
                    target.selectionEnd = end + hashPrefix.length;
                    target.dispatchEvent(new Event('input', { bubbles: true }));
                    this._updateSelectionToolbar();
                    return;
                }

                target.value = val.substring(0, start) + newText + val.substring(end);
                target.selectionStart = start;
                target.selectionEnd = start + newText.length;
                target.dispatchEvent(new Event('input', { bubbles: true }));
                this._updateSelectionToolbar();
            } else if (type === 'html') {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const activeNode = this._getAncestorNode(range, action, target);

                    if (activeNode) {
                        // Action is active, so we unwrap/remove formatting!
                        const startMarker = document.createElement('span');
                        startMarker.className = 'rdf-marker-start';
                        startMarker.style.display = 'none';

                        const endMarker = document.createElement('span');
                        endMarker.className = 'rdf-marker-end';
                        endMarker.style.display = 'none';

                        try {
                            const rangeStart = range.cloneRange();
                            rangeStart.collapse(true);
                            rangeStart.insertNode(startMarker);

                            const rangeEnd = range.cloneRange();
                            rangeEnd.collapse(false);
                            rangeEnd.insertNode(endMarker);

                            this._unwrapNode(activeNode);

                            const newRange = document.createRange();
                            newRange.setStartAfter(startMarker);
                            newRange.setEndBefore(endMarker);

                            selection.removeAllRanges();
                            selection.addRange(newRange);

                            if (startMarker.parentNode) startMarker.parentNode.removeChild(startMarker);
                            if (endMarker.parentNode) endMarker.parentNode.removeChild(endMarker);
                        } catch (err) {
                            console.error('[RDF-Editor] Error during unwrapping selection restoration:', err);
                            this._unwrapNode(activeNode);
                        }
                    } else {
                        // Action is not active, so we apply it!
                        if (action === 'bold') {
                            document.execCommand('bold', false, null);
                        } else if (action === 'italic') {
                            document.execCommand('italic', false, null);
                        } else if (action === 'underline') {
                            document.execCommand('underline', false, null);
                        } else if (action === 'highlight') {
                            const mark = document.createElement('mark');
                            try {
                                range.surroundContents(mark);
                            } catch (e) {
                                document.execCommand('hiliteColor', false, 'yellow');
                            }
                        } else if (action.startsWith('h')) {
                            const tag = action.toUpperCase();
                            document.execCommand('formatBlock', false, tag);
                        }
                    }
                }
                this._updateSelectionToolbar();
            }
        }

        hideToolbar() {
            if (this.toolbar) {
                this.toolbar.classList.remove('active');
            }
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RDFEditor;
    } else {
        window.RDFEditor = RDFEditor;
    }
})();
