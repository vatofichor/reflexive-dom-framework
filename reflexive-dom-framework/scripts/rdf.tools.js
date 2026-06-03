/*
 * Copyright (c) 2026:
 * vatofichor - Sebastian Mass     [>_<]
 * & Assisted By Gemini Antigravity /|\
 */

/**
 * Reflexive Tools Module
 * Part of the Reflexive DOM Framework (RDF)
 * 
 * Provides an operations tool drawer programmatically registered.
 * Exposes the rdf-tools command and hardcoded Alt+. shortcut.
 */
(function () {
    // 1. Dependency check: Core RDF must be loaded first
    if (!window.ReflexiveDOM) {
        console.error("[RDF-Tools] ReflexiveDOM core must be loaded first.");
        return;
    }


    // 3. Module check: RDFDrawers class must be loaded first
    if (!window.RDFDrawers) {
        console.error("[RDF-Tools] RDFDrawers class must be loaded before RDFTools.");
        return;
    }

    // 4. Module check: RDFUtils must be loaded first
    if (!window.RDFUtils) {
        console.error("[RDF-Tools] RDFUtils must be loaded before RDFTools.");
        return;
    }

    class RDFTools {
        constructor() {
            if (!window.RDFDrawers || !window.RDFDrawers.instance) {
                console.error("[RDF-Tools] RDFDrawers instance must be initialized before instantiating RDFTools.");
                return;
            }
            this._init();
        }

        _init() {
            const drawers = window.RDFDrawers.instance;
            const rdf = window.ReflexiveDOM.instance;

            // Register Programmatic Drawer
            drawers.register({
                id: 'rdf-tools-drawer',
                title: 'Notes',
                content: `
                    <div class="rdf-tools-container" style="display: flex; flex-direction: column; gap: 10px;">
                        <label style="color: var(--rdf-text-secondary); font-size: 13px; font-weight: bold; margin-bottom: 2px; display: block; text-align: left;">Quick Stateful Editing Env</label>
                        <p style="color: var(--rdf-text-secondary); font-size: 11px; margin: 0 0 5px 0; line-height: 1.4; text-align: left; opacity: 0.8;">
                            This scratchpad is a stateful, HTML-enabled rich editor. Select text to format it using the floating toolbar. Changes are autosaved dynamically (600ms debounce) to your session storage.
                        </p>
                        <div style="position: relative; width: 100%;">
                            <div id="rdf-quick-note" contenteditable="true" style="width: 100%; height: 180px; overflow-y: auto; background: rgba(0,0,0,0.2); border: 1px solid var(--rdf-glass-border); border-radius: 4px; padding: 10px; padding-right: 15px; color: var(--rdf-text-primary); font-family: var(--rdf-font); box-sizing: border-box; outline: none; text-align: left;" placeholder="Type notes here..."></div>
                            <div class="rdf-resize-handle" title="Drag to resize notes vertically"></div>
                        </div>
                        <button id="rdf-copy-note-btn" style="background: rgba(0, 229, 255, 0.1); border: 1px solid var(--rdf-accent); color: var(--rdf-accent); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; transition: all 0.2s; outline: none; width: 100%; text-align: center;">Copy Note</button>
                    </div>
                `,
                onOpen: (el) => {
                    const btn = el.querySelector('#rdf-copy-note-btn');
                    const area = el.querySelector('#rdf-quick-note');
                    const handle = el.querySelector('.rdf-resize-handle');
                    if (btn && area) {
                        // Load saved notes from session storage
                        const saved = sessionStorage.getItem('rdf-notes-content') || '';
                        area.innerHTML = saved;

                        // Drag resize handler
                        if (handle) {
                            handle.onmousedown = (e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const startY = e.clientY;
                                const startHeight = area.offsetHeight;

                                const onMouseMove = (moveEvent) => {
                                    const currentHeight = startHeight + (moveEvent.clientY - startY);
                                    const finalHeight = Math.max(120, Math.min(600, currentHeight));
                                    area.style.height = `${finalHeight}px`;
                                };

                                const onMouseUp = () => {
                                    document.removeEventListener('mousemove', onMouseMove);
                                    document.removeEventListener('mouseup', onMouseUp);
                                };

                                document.addEventListener('mousemove', onMouseMove);
                                document.addEventListener('mouseup', onMouseUp);
                            };
                        }

                        // Apply hover dynamic styles programmatically to respect HSL / alt themes
                        btn.onmouseenter = () => {
                            btn.style.background = 'var(--rdf-accent)';
                            btn.style.color = '#000000';
                        };
                        btn.onmouseleave = () => {
                            btn.style.background = 'rgba(0, 229, 255, 0.1)';
                            btn.style.color = 'var(--rdf-accent)';
                        };

                        btn.onclick = async () => {
                            const success = await window.RDFUtils.copyToClipboard(area.innerText);
                            if (success) {
                                const origText = btn.textContent;
                                btn.textContent = 'Copied!';
                                btn.style.color = '#55ff55';
                                btn.style.borderColor = '#55ff55';
                                setTimeout(() => {
                                    btn.textContent = origText;
                                    btn.style.color = 'var(--rdf-accent)';
                                    btn.style.borderColor = 'var(--rdf-accent)';
                                }, 1500);
                            }
                        };

                        // Debounce session storage updates to 600ms after typing ceases
                        let debounceTimeout = null;
                        area.oninput = () => {
                            if (debounceTimeout) clearTimeout(debounceTimeout);
                            debounceTimeout = setTimeout(() => {
                                sessionStorage.setItem('rdf-notes-content', area.innerHTML);
                                console.log('[RDF-Tools] Notes saved to session.');
                            }, 600);
                        };
                    }
                }
            });

            // Register System Command in Core
            if (rdf) {
                rdf.registerCommand('rdf-tools', {
                    note: 'Toggle RDF Notes',
                    handler: () => {
                        drawers.toggle('rdf-tools-drawer');
                    }
                });

                // Hardcode Alt+. static system key
                rdf.bindShortcut('.', 'rdf-tools');
            }

            console.log('[RDF-Tools] Notes drawer registered.');
        }
    }

    // Expose class globally
    window.RDFTools = RDFTools;
})();
