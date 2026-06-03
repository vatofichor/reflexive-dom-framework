/*
 * Copyright (c) 2026:
 * vatofichor - Sebastian Mass     [>_<]
 * & Assisted By Gemini Antigravity /|\
 */

/**
 * Reflexive Utilities Module
 * Part of the Reflexive DOM Framework (RDF)
 * 
 * Generic utilities for text manipulation and DOM helpers.
 */
(function() {
    // 1. Dependency check: Core RDF must be loaded first
    if (!window.ReflexiveDOM) {
        console.error("[RDF-Utils] ReflexiveDOM core must be loaded first.");
        return;
    }


    class RDFUtils {
        /**
         * Inserts text at the current cursor position in the active element.
         * @param {string} text - The text to insert.
         * @returns {boolean} True if successful, false otherwise.
         */
        static insertText(text) {
            const active = document.activeElement;
            if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
                return false;
            }

            const start = active.selectionStart;
            const end = active.selectionEnd;
            const val = active.value;

            active.value = val.substring(0, start) + text + val.substring(end);
            active.selectionStart = active.selectionEnd = start + text.length;
            active.focus();

            return true;
        }

        /**
         * Gets the currently selected text element (input, textarea, or contenteditable).
         * @returns {HTMLElement|null}
         */
        static getActiveTextElement() {
            const el = document.activeElement;
            if (!el) return null;

            const isValid = el.tagName === 'TEXTAREA' ||
                (el.tagName === 'INPUT' && el.type === 'text') ||
                el.hasAttribute('contenteditable') ||
                el.contentEditable === 'true';

            return isValid ? el : null;
        }

        /**
         * Copies text to clipboard.
         * @param {string} text - The text to copy.
         * @returns {Promise<boolean>}
         */
        static async copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('[RDF-Utils] Clipboard write failed:', err);
                return false;
            }
        }

        /**
         * Reads text from clipboard.
         * @returns {Promise<string|null>}
         */
        static async readFromClipboard() {
            try {
                return await navigator.clipboard.readText();
            } catch (err) {
                console.error('[RDF-Utils] Clipboard read failed:', err);
                return null;
            }
        }
    }

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RDFUtils;
    } else {
        window.RDFUtils = RDFUtils;
    }
})();
