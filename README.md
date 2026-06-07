# Sanguine AI Command Center

A real-time, AI-driven emergency blood orchestration and dispatch platform that bridges hospital requirements with matching donor registries.

## Core Features

- **Urgent Patient Request Desk**: Real-time hospital ingestion with built-in strict collision deduplication (Name, Blood Group, Units).
- **Live Donor Matching Engine**: Multi-criteria mathematical scoring algorithm executing in real-time against active registry data pools.
- **Intelligent Ingestion Agent**: An AI agentic layer (`AgentOrchestrator`) that intercepts unstructured doctor inputs and extracts precise requirement schemas.
- **Role-Based Access Control (RBAC)**: Secure multi-tenant view boundaries protecting administrative actions for System Admins, Hospital Coordinators, and NGO Partners via custom header middleware.

## System Architecture

```text
[Unstructured Input / UI Portal] 
            │
            ▼
 [AgentOrchestrator Logic] 
            │
            ▼
 [Matching Engine Scoring] 
            │
            ▼
[Unified Database Layer (PostgreSQL Pool / Local JSON Fallback Buffer)]
```

### Dual-Storage Resilience Scheme
Sanguine employs a robust dual-storage persistence mechanism. When live, it manages real-time database transactions seamlessly. However, to guarantee absolute availability during critical network-down medical events, the system utilizes an `isLocalFallback` mode, falling back to a synchronized localized JSON buffer. 

### Bootstrapper Parsing Engine
During cold starts, the application runs a background CSV bootstrapper parsing engine. It autonomously parses foundational legacy tracker data (`Dataset.csv`), sanitizing coordinates, normalizing blood types, validating constraints, and injecting deduplicated base data configurations directly into memory.

## Technical Stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js (TypeScript architecture)
- **AI/Agent Layer**: Built-in orchestration models executing automated extraction.
- **Database/Persistence**: PostgreSQL (`pg` Pool), localized JSON ledger fallbacks, and foundational dataset configurations.

## Getting Started & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file and configure your environment variables:
```env
PORT=3000
DATABASE_URL=postgres://user:password@host:port/database
# Include your necessary AI/Agent API keys (e.g., GEMINI_API_KEY)
```

### 3. Run Development Server
Run the local full-stack development build (this will run `server.ts` seamlessly with Vite):
```bash
npm run dev
```

### 4. Running Production Build
Compile to a single Node.js distributable server script and launch it:
```bash
npm run build
npm start
```
