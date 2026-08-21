# MIXORA

> Local-first AI Customer Operations Platform

MIXORA is an AI-powered customer operations platform built to help small and medium-sized businesses manage customer conversations, automate support workflows, and use internal knowledge to generate context-aware responses.

The platform combines a unified customer inbox, AI conversation analysis, RAG-based knowledge retrieval, ticket management, Gmail integration, and human-in-the-loop workflows in a local-first architecture.

## ✨ Features

### Customer Inbox

- Unified conversation management
- Gmail email synchronization
- Email replies directly from MIXORA
- Automatic intent classification
- Priority detection
- Sentiment analysis
- Confidence scoring
- Conversation history
- Manual and AI-assisted replies

### AI Support

MIXORA analyzes incoming conversations and can generate context-aware responses using a local LLM.

Two response modes are available:

- **Draft Mode** — AI prepares a response for operator review
- **Auto Reply Mode** — responses can be sent automatically when confidence and safety conditions are satisfied

### Knowledge Base & RAG

- TXT and Markdown document upload
- Document validation and duplicate detection
- Vector indexing with Qdrant
- Retrieval-Augmented Generation (RAG)
- Knowledge-aware AI responses
- Knowledge document management

### Ticket Management

- Automatic ticket creation
- Priority management
- Open / In Progress / Resolved workflow
- Persistent ticket state
- Dashboard integration

### Dashboard

- Conversation statistics
- Ticket monitoring
- High-priority ticket tracking
- Intent distribution
- Knowledge Base statistics
- Recent conversations
- Activity feed
- System status monitoring

### Authentication & Activity

- Operator authentication
- Protected API routes
- Bearer token authentication
- Session validation
- Activity logging
- Environment-based credentials

## 🧰 Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- React Router
- Lucide React

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Async PostgreSQL

**AI & Data**
- Ollama
- Llama 3.2
- Qdrant
- Retrieval-Augmented Generation (RAG)

**Integrations**
- Gmail API
- Google OAuth 2.0

## 🏗️ Architecture

```text
                    ┌─────────────────┐
                    │     Customer    │
                    └────────┬────────┘
                             │
                    Email / Web Input
                             │
                             ▼
                 ┌─────────────────────┐
                 │   React Frontend    │
                 │    TypeScript       │
                 └──────────┬──────────┘
                            │
                       REST API
                            │
                            ▼
                 ┌─────────────────────┐
                 │   FastAPI Backend   │
                 └─────┬────────┬──────┘
                       │        │
              ┌────────┘        └─────────┐
              ▼                           ▼
       ┌─────────────┐             ┌─────────────┐
       │ PostgreSQL  │             │   Ollama    │
       │ App Data    │             │ Llama 3.2   │
       └─────────────┘             └──────┬──────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │   Qdrant    │
                                  │ Vector DB   │
                                  └─────────────┘
```

## 🚀 Running Locally

### Requirements

Make sure you have installed:

- Python 3.11+
- Node.js
- PostgreSQL
- Qdrant
- Ollama

### Backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies and start the API:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

### AI Model

Pull the local model:

```bash
ollama pull llama3.2
```

Make sure Ollama is running before starting MIXORA.

## ⚙️ Environment

Create your local `.env` configuration using `.env.example` as reference.

Example:

```env
APP_ENV=development

DATABASE_URL=postgresql+asyncpg://mixora:mixora@localhost:5432/mixora

QDRANT_URL=http://localhost:6333

LLM_PROVIDER=ollama
LLM_MODEL=llama3.2

MIXORA_ADMIN_USERNAME=admin
MIXORA_ADMIN_PASSWORD=change-me
MIXORA_AUTH_SECRET=change-this-to-a-long-random-secret
```

Never commit `.env`, Gmail OAuth credentials, access tokens, or other secrets.

## 📧 Gmail Integration

MIXORA supports Gmail as an external customer communication channel.

The integration currently supports:

- Google OAuth 2.0 authentication
- Importing Gmail messages into the MIXORA Inbox
- Duplicate message protection
- Customer email identification
- AI analysis of imported emails
- Sending replies from MIXORA through Gmail

Gmail OAuth credentials are intentionally excluded from version control and must be configured locally.

## 🧪 Production Build

Verify the frontend build with:

```bash
cd frontend
npm run build
```

Verify the backend Python source with:

```bash
cd backend
python -m compileall app
```

## 🗺️ Roadmap

Planned improvements include:

- WhatsApp integration
- Additional communication channels
- Multi-user authentication
- Roles and permissions
- Persistent customer memory
- Lead scoring
- Multi-agent workflows
- Advanced analytics
- Docker deployment
- Cloud deployment

## 📌 Project Status

**MVP — Active Development**

The core workflow is functional, including authentication, customer conversations, Gmail synchronization, AI analysis and response generation, RAG knowledge retrieval, ticket management, activity tracking, and operational monitoring.

MIXORA currently runs as a local-first application.

## License

This project is currently under active development.