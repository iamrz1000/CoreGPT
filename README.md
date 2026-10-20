# NextGen AI Assistant

NextGen AI Assistant is an enterprise-grade, full-stack intelligent conversational AI web application inspired by the clean, intuitive user experience of ChatGPT, crafted with a distinct brand identity, robust security architecture, persistent chat history, and deep multi-model reasoning.

---

## 🌟 Key Features

1. **Multi-Model AI Chat Engine**:
   - **Gemini 3.8 Flash** (`gemini-3.8-flash`): High-speed, high-capability general intelligence.
   - **Gemini 3.1 Flash-Lite** (`gemini-3.1-flash-lite`): Ultra-low latency for instant responses.
   - **Gemini 4 Argon** (`gemini-4-argon`): Deep reasoning, complex mathematics, and STEM coding.
   - **NextGen Experimental AI Mode (Admin-Only)**: Lowered refusal thresholds for advanced research, algorithmic exploration, and technical analysis. Strictly validated on server side (HTTP 403 for unauthorized users).

2. **Multilingual Intelligence**:
   - Native support for Hindi (हिन्दी), Urdu (اردو), Marathi (मराठी), Arabic (العربية), Spanish (Español), French (Français), German (Deutsch), Chinese (中文), Japanese (日本語), and English with automated language detection.

3. **Dedicated Image Studio**:
   - Generates real high-fidelity artwork using Gemini Image models (`gemini-3.1-flash-lite-image`).
   - Aspect ratio selection: `1:1` Square, `16:9` Landscape, `9:16` Portrait, `4:3` Classic, `3:4` Poster.
   - Visual style presets (Photorealistic, Cyberpunk Neon, Cinematic 3D, Anime/Manga, Minimalist Vector).
   - Real-time progress loader, gallery, full-screen lightbox, and one-click image download.

4. **Conversational Voice & Speech**:
   - Hands-free **Voice Conversation Mode** with speech recognition and live pulsing audio visualizer.
   - High-fidelity text-to-speech using official Gemini audio models (`gemini-3.8-flash-lite-tts`) with prebuilt voices (`Kore`, `Puck`, `Charon`, `Fenrir`, `Zephyr`).
   - Server-side audio transcription via `gemini-3.5-transcribe`.

5. **Full Authentication & Security**:
   - User Registration (Display name, email, password strength check, password confirmation, terms acceptance).
   - User Sign-in with bcrypt password hashing (10 salt rounds) and secure HTTP-only SameSite cookies (`nextgen_session`).
   - Rate limiting and brute-force lockout protection on login attempts.
   - Forgot-password and tokenized password reset workflows.
   - Conversation ownership verification: users cannot view, edit, or delete another user's private conversations.

6. **Daily Quotas & Atomic Usage**:
   - Normal Users: 20 text messages/day and 5 image generations/day (resets at midnight).
   - Administrators: Unlimited quota.
   - Backend atomic quota tracking prevents race conditions.
   - Dynamic real-time quota adjustment via Admin Dashboard.

7. **Protected Administrator Dashboard**:
   - Accessible only by users with role `admin` (e.g. configured `ADMIN_EMAIL`).
   - Real-time overview metrics: Total Users, Active Users (24h), Messages Today, Images Generated, Uptime & System Health.
   - User Governance: search users, suspend/activate accounts, promote/demote roles, set custom quota overrides.
   - Application Settings: update text/image limits, toggle image generation, toggle voice features, change default models.
   - Audit Logs: persistent logging of all administrative actions and security events.

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Marked (GFM Markdown parsing).
- **Backend**: Node.js, Express, tsx runtime.
- **AI SDK**: `@google/genai` (official Google Gemini TypeScript SDK).
- **Security**: `bcryptjs` (password hashing), `jsonwebtoken` (JWT), `cookie-parser` (HTTP-only cookies).
- **Database**:
  - PostgreSQL schema migration provided in `migrations/001_initial_schema.sql`.
  - Resilient persistent relational JSON storage in `data/nextgen_db.json` with foreign key cascading deletes, atomic transactions, and zero external dependency setup.

---

## 🚀 Getting Started

### 1. Environment Variables

Create a `.env` file (refer to `.env.example`):

```bash
# Required for Gemini AI models (injected automatically in AI Studio)
GEMINI_API_KEY="your-gemini-api-key"

# Secret key for JWT session cookies
SESSION_SECRET="your-strong-random-session-secret"

# Default Administrator Email
ADMIN_EMAIL="faqruddin00000@gmail.com"

# One-time Admin Setup Secret
ADMIN_SETUP_SECRET="nextgen-admin-setup-secret-key-2025"

# Optional: PostgreSQL Database URI (if connecting to external Postgres)
DATABASE_URL=""
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The app will be running at `http://localhost:3000`.

### 4. Run Automated Test Suite

```bash
npm test
```

Verifies:
- Input validation & password strength rules
- Cryptographic password hashing and verification
- JWT session creation and verification
- Database models and duplicate email constraints
- Conversation ownership isolation (multi-tenant security)
- Daily usage quota limits and atomic enforcement
- Admin audit logging and security tracking

---

## 🗄️ Database Schema & Migrations

The database tables defined in `migrations/001_initial_schema.sql` include:
1. `users`: Account credentials, display names, roles, statuses, and custom quota overrides.
2. `sessions`: Active user sessions and expiration timestamps.
3. `conversations`: Chat sessions with titles, selected models, and system prompts.
4. `messages`: User prompts, assistant answers, tokens, and image references.
5. `usage_records`: Atomic daily usage tracking per user per day (`YYYY-MM-DD`).
6. `generated_images`: Stored prompts, aspect ratios, image data URLs, and model metadata.
7. `app_settings`: Global configurable settings and quota limits.
8. `password_reset_tokens`: 1-hour expiration tokens for password resets.
9. `admin_audit_logs`: Detailed logs of administrative operations and unauthorized attempts.

---

## 🔒 Security Best Practices

- **Zero Client-Side Secrets**: All Gemini SDK calls, API keys, and admin validations happen exclusively on the server.
- **HTTP-Only Cookies**: Session tokens cannot be accessed or stolen via JavaScript (`XSS`).
- **Authorization Guard**: Every read, update, and delete checks user ownership.
- **Admin Privilege Isolation**: Ordinary users cannot access admin endpoints or trigger Experimental Mode via request tampering or frontend modifications.
