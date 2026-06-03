/*
 * Copyright (c) 2026:
 * vatofichor - Sebastian Mass     [>_<]
 * & Assisted By Gemini Antigravity /|\
 */

/**
 * Reflexive Smart Typing Module
 * Part of the Reflexive DOM Framework (RDF)
 * 
 * Provides generic text editing enhancements:
 * - Tab indentation (4 spaces)
 * - Automatic list continuation (Bullets, Numbering)
 */
(function() {
    // 1. Dependency check: Core RDF must be loaded first
    if (!window.ReflexiveDOM) {
        console.error("[RDF-Smart-Typing] ReflexiveDOM core must be loaded first.");
        return;
    }


    // 3. Module check: RDFEditor must be loaded first
    if (!window.RDFEditor) {
        console.error("[RDF-Smart-Typing] RDFEditor must be loaded before RDFSmartTyping.");
        return;
    }

    class RDFSmartTyping {
        constructor() {
            this.handlers = new Map();
            this._init();
        }

        _init() {
            console.log('[RDF-SmartTyping] Ready.');
        }

        attach(element) {
            if (!element || this.handlers.has(element)) return;

            const handler = (e) => this._handleKeydown(e, element);
            element.addEventListener('keydown', handler);
            this.handlers.set(element, handler);
        }

        detach(element) {
            const handler = this.handlers.get(element);
            if (handler) {
                element.removeEventListener('keydown', handler);
                this.handlers.delete(element);
            }
        }

        _handleKeydown(e, el) {
            // 1. Tab Indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const value = el.value;

                // Insert 4 spaces
                el.value = value.substring(0, start) + "    " + value.substring(end);
                el.selectionStart = el.selectionEnd = start + 4;
                return;
            }

            // 2. Bullet/List Continuation
            if (e.key === 'Enter') {
                const start = el.selectionStart;
                const value = el.value;

                // Get current line
                const lastNewLine = value.lastIndexOf('\n', start - 1);
                const currentLineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;
                const currentLine = value.substring(currentLineStart, start);

                // Regex for bullets: *, -, +, >, •, etc. OR Numbering: 1., 1)
                // Matches: optional whitespace, bullet char/number, optional whitespace
                const bulletRegex = /^\s*([*+\->•]|\d+[\.\)\-])\s*/;
                const match = currentLine.match(bulletRegex);

                if (match) {
                    const fullMatch = match[0];
                    const bulletContent = match[1];
                    const trimmedLine = currentLine.trim();

                    // Exit list if pressing enter on empty bullet
                    if (trimmedLine === bulletContent) {
                        e.preventDefault();
                        // Remove the bullet from current line
                        const part1 = value.substring(0, currentLineStart);
                        const part2 = value.substring(start);
                        el.value = part1 + part2;
                        el.selectionStart = el.selectionEnd = currentLineStart;
                    } else {
                        // Continue list
                        e.preventDefault();

                        // Logic for numbering increment
                        let nextMarker = fullMatch;
                        const numMatch = bulletContent.match(/^(\d+)([\.\)\-])/);
                        if (numMatch) {
                            const currentNum = parseInt(numMatch[1]);
                            const delimiter = numMatch[2];
                            const nextNum = currentNum + 1;
                            nextMarker = fullMatch.replace(currentNum + delimiter, nextNum + delimiter);
                        }

                        const insertion = "\n" + nextMarker;
                        el.value = value.substring(0, start) + insertion + value.substring(start);
                        el.selectionStart = el.selectionEnd = start + insertion.length;

                        // Scroll to cursor
                        el.blur();
                        el.focus();
                    }
                }
            }
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RDFSmartTyping;
    } else {
        window.RDFSmartTyping = RDFSmartTyping;
    }
})();
