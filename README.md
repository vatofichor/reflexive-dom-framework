# Reflexive DOM Framework (RDF)

The "UI is the API" framework. Build reflexively.

**Reflexive DOM Framework (RDF)** is a lightweight, semantic-first architecture designed to make websites **agentic**, **highly accessible**, and **game-able**. It centers on the "UI-as-API" philosophy, where the Document Object Model (DOM) serves as the single source of truth for both human and AI interactions.

By installing RDF, you turn any standard web interface into a programmable coordination surface. Automated agents can easily crawl your site's DOM to discover and execute actions using the exact same pathways as a human—eliminating the "State Gap" between human users, accessibility tools, and automated AIs.

---

## 1. Executive Summary & Core Philosophy

Rather than burying business logic in complex framework states or isolated click handlers, RDF maps "Commands" directly to HTML Element IDs. Triggering a command—whether via a keyboard shortcut, the command palette (Prompter), or an AI agent call—simulates a physical user interaction (`click()`) on the target element.

This approach builds a unified interaction layer that is:
- **Discoverable**: AI agents can scan the DOM for elements with IDs and `data-note` attributes to instantly understand what the web app can do.
- **Accessible & Game-able**: Users can navigate the entire site using high-density keyboard shortcuts and a type-to-navigate command palette, making the site accessible and fun to play like a terminal game.
- **Unified & Parity-Driven**: One command runner (`ReflexiveDOM.instance.run()`) handles navigation, programmatic tools, side-panels, and scripts. Humans and agents leverage the exact same interaction API.
- **Robust & Safe**: Agents don't need to execute risky, arbitrary JavaScript. They only emit clean command strings (e.g. `rdf-tools` or `cx-copy`) which the framework safely routes to verified DOM elements.

---

## 2. Core Modules

RDF is designed as a modular suite. Each script has evaluation-time dependency guardrails and style guide validations to ensure correct loading and strict consistency.

### 1. Core: [`rdf.js`](./reflexive-dom-framework/scripts/rdf.js)
The nervous system of your application.
- **Auto-Discovery**: Scans the DOM for `[data-note]` to auto-build a command registry.
- **Command Routing**: Provides a type-to-execute command palette interface (Prompter).
- **Shortcut Management**: Effortlessly binds key triggers (Alt hotkeys) to commands or DOM elements.

### 2. Utilities: [`rdf.utils.js`](./reflexive-dom-framework/scripts/rdf.utils.js)
Generic helpers for text manipulation and DOM actions.
- `insertText`: Inserts text at current cursor position in standard inputs.
- `getActiveTextElement`: Safely returns the currently focused text area or editable.
- `copyToClipboard` / `readFromClipboard`: Simple wrapper helpers for clipboard operations.

### 3. Drawers: [`rdf.drawers.js`](./reflexive-dom-framework/scripts/rdf.drawers.js)
Centralized manager for responsive, glassmorphic side-panels.
- **API Registration**: Programmatically registers side-drawers: `drawers.register({ id: 'tool', ... })`.
- **Auto-Generation**: Auto-creates drawer UI skeletons for non-existent DOM elements.
- **Exclusive State**: Ensures only one drawer is open at a time.

### 4. Tools Drawer: [`rdf.tools.js`](./reflexive-dom-framework/scripts/rdf.tools.js)
A default operations hub registered programmatically in the drawer coordinator.
- **Quick Note Widget**: Displays a 150px height textarea for temporary notes.
- **Utility Buttons**: Copies draft notes to the clipboard using `RDFUtils.copyToClipboard`.
- **Hard-coded Alt Key**: Listens to the static key `Alt+.` (Alt + dot) mapping to `rdf-tools` command.

### 5. Editor: [`rdf.editor.js`](./reflexive-dom-framework/scripts/rdf.editor.js)
Context-aware text editing tools.
- **Find & Replace**: Scoped strictly to the focused text element (Alt+H) with regex support, case checks, and a loose matcher.
- **WYSIWYG Inline Toolbar**: A floating glassmorphic toolbar (B, I, U, Highlight, H1-H4) that appears on text selection. Supports **Markdown output** on textareas and **HTML markup wrapping** on contenteditable fields.
- **Shadow Copy**: Automatically backs up text contents to the clipboard before replacement actions (Undo-via-Paste).

### 6. Smart Typing: [`rdf.smart-typing.js`](./reflexive-dom-framework/scripts/rdf.smart-typing.js)
Generic typing enhancements.
- **Tab Indentation**: Inserts standard 4-space indentation.
- **List Continuation**: Continues numbered lists and bullet points (`*`, `-`, `•`) on Enter. Double Enter exits list mode safely.

### 7. Styles: [`rdf.css`](./reflexive-dom-framework/styles/rdf.css) / [`rdf-alt.css`](./reflexive-dom-framework/styles/rdf-alt.css)
Premium high-density layouts, glassmorphic tokens, and CSS animations. Supports dark mode by default and light theme variations.

---

## 3. Quick Start

### 1. Include Modules in Load Sequence
Due to strict evaluation guardrails, scripts must be loaded in sequential order, and stylesheets must be available on the host server:

```html
<!-- Style guide stylesheet -->
<link rel="stylesheet" href="./reflexive-dom-framework/styles/rdf.css" id="rdf-theme-stylesheet">

<!-- Javascript modules loaded in dependency order -->
<script src="./reflexive-dom-framework/scripts/rdf.js"></script>
<script src="./reflexive-dom-framework/scripts/rdf.utils.js"></script>
<script src="./reflexive-dom-framework/scripts/rdf.drawers.js"></script>
<script src="./reflexive-dom-framework/scripts/rdf.tools.js"></script>
<script src="./reflexive-dom-framework/scripts/rdf.editor.js"></script>
<script src="./reflexive-dom-framework/scripts/rdf.smart-typing.js"></script>
```

### 2. Initialize the Framework
```javascript
// 1. Initialize core coordinator
const rdf = new ReflexiveDOM({
    instructions: "Type 'drawer-toggle' or 'rdf-tools' to open panels."
});

// 2. Initialize drawers (registers window.RDFDrawers.instance automatically)
const drawers = new RDFDrawers();

// 3. Initialize programmatic tools drawer
const tools = new RDFTools();

// 4. Initialize editor & typing helpers
const editor = new RDFEditor();
const smartType = new RDFSmartTyping();

// 4. Run DOM capabilities auto-discovery
rdf.discoverCommands();
rdf.renderNavigation();

// 5. Register custom keyboard shortcuts (Alt prefix)
rdf.bindShortcut('a', 'alert-btn');
rdf.bindShortcut('d', 'demo-drawer');
```

### 3. Build Your Declarative UI
Simply declare commands directly in your HTML using `id` and describe them for agents and screen-readers using `data-note`:

```html
<!-- Clickable link command -->
<a id="salesforce" href="https://salesforce.com" target="_blank" data-note="Launch Salesforce">Salesforce</a>

<!-- Script triggering command button -->
<button id="reset-db" onclick="dbReset()" data-note="Reset Database Schema">Reset DB</button>
```

---

## 4. Agent Interoperability (Making Websites Agentic)

RDF turns standard user interfaces into **AI-ready environments** without requiring developers to write complex API bridges. Here is how agents utilize the "UI is the API" framework:

### A. Capability Discovery
A crawling agent reads the webpage HTML, filters elements with matching IDs and `data-note` descriptions, and maps out a complete, structured capability schema:
```json
{
  "salesforce": "Launch Salesforce",
  "reset-db": "Reset Database Schema",
  "rdf-tools": "Toggle RDF Operations Tools"
}
```

### B. Execution via Command Router
When the agent decides to trigger a tool, instead of executing arbitrary JavaScript, it simply issues a command string via the core router:
```javascript
// Simulates a physical human interaction safely on the target ID
ReflexiveDOM.instance.run(true, 'reset-db');
```
This clicks the element with `id="reset-db"`, running the corresponding JavaScript function (`dbReset()`) safely and transparently inside the page context.

---

## 5. Old-School Premium keyboard shortcuts

RDF implements a high-density, terminal-like shortcut mesh (Alt keys as standard prefix):
*   <kbd>Alt + /</kbd> : Open type-to-navigate command Prompter (command palette).
*   <kbd>Alt + O</kbd> : Open RDF Options Manager (Custom keybindings & theme swappers).
*   <kbd>Alt + H</kbd> : Toggle scoped Find & Replace Modal (in any focused text field).
*   <kbd>Alt + .</kbd> : Toggle default programmatic Operations Tools Drawer.

---

## 6. License

Released under the **[MIT License](file:///d:/Dev/reflexive-dom-framework/LICENSE)**.

```
Copyright (c) 2026:
vatofichor - Sebastian Mass     [>_<]
& Assisted By Gemini Antigravity /|\
```
