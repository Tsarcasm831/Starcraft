# AGENTS: Contributor and Development Guide

This document provides a comprehensive guide for agents and developers contributing to this StarCraft-inspired RTS prototype. It outlines the project structure, development workflow, architectural patterns, and best practices to ensure consistent and high-quality contributions. This monolithic AGENTS file applies to the entire project tree.

## 1. Core Principles

This project is maintained by a distributed team of AI and human developers. To ensure seamless collaboration, all contributors must adhere to the following principles:

### The Golden Rule: Log Everything

**Every action must be logged.** Before committing any changes, you must document your work in `changelog.md`. This is not optional; it is the most critical step in the development process. The log provides the ground truth for project status, enables synchronization between agents, and allows for automated auditing.

*   **Format**: All log entries **must** use the **Agent Shorthand Change Log (ASCL)** format. Review `ascl.md` for the full specification.
*   **Timestamp**: The `[TS]` tag must capture the exact time you commit the change in `MMDDYY-HHMM` format. Do not reuse or approximate this value.
*   **Scope**: Log every change, no matter how small. This includes code refactoring, asset creation, documentation updates, and bug fixes.
*   **Immutability**: Once an entry is logged, it should not be altered.

Failure to log changes will result in desynchronization and project instability.

### Adhere to Existing Patterns

When adding new features (units, buildings, abilities), follow the architectural patterns established in the existing codebase. This ensures consistency and maintainability. For example, new units should extend a base class like `Infantry` or create a new base class if a new category of unit is being introduced.

## 2. Project Overview

This project is a browser-based real-time strategy (RTS) game built with modern web technologies.

*   **Core Technology**: Three.js for 3D rendering and WebGL.
*   **Language**: Modern JavaScript (ES Modules).
*   **Architecture**: A custom, lightweight entity-behavior model.
*   **Goal**: To create a functional and extensible RTS experience that runs directly in the browser with no build step required.

## 3. Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox).
- A local web server.
- Node.js and npm.

### Running the Project
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  From the repository root, start a local HTTP server. A simple Python server is sufficient:
    ```bash
    python3 -m http.server 8000
    ```
3.  Open your browser and navigate to `http://localhost:8000/`. The `index.html` file is the entry point.

## 4. Project Structure

The codebase is organized to separate concerns and make it easy to locate and add new features.

## 5. Contribution and Logging

To maintain a clear and automated track of all changes, every contribution must be accompanied by a log entry. This is a critical step for project synchronization and history tracking.

*   **Changelog File**: All changes, regardless of size, must be logged in `changelog.md`.
*   **Log Format**: The log entries must adhere to the **Agent Shorthand Change Log (ASCL)** format. Please review the specification in `ascl.md` before committing any changes to understand the required syntax.
*   **Workflow**:
    1.  Make your code changes.
    2.  Read `ascl.md` to understand the required logging syntax.
    3.  Add a new entry to the top of `changelog.md` describing your change.
    4.  Commit your code and the updated changelog.
*   **Automatic Archiving**: `scripts/changelog-archive.js` runs on page load and once per day moves entries older than today from `changelog.md` to `changelog.old.md`. This script relies on the `jsdom` package listed in `package.json`.

## 6. How to Add New Units and Buildings

For detailed, step-by-step instructions on how to create and integrate new units into the game, please refer to the dedicated guide:

*   **[Agent's Guide to Creating Units](./agent-units.md)**

This guide covers everything from creating data and class files to integrating assets and updating game logic. Following it ensures consistency and stability.