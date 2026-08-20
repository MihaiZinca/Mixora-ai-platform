# MIXORA

> Local-first AI Customer Operations Platform

MIXORA is an AI-powered customer operations platform designed to help small and medium-sized businesses manage customer conversations, support tickets and internal knowledge from a single interface.

The platform combines AI-assisted customer support, conversation analysis, RAG-based knowledge retrieval and human-in-the-loop workflows in a local-first architecture.

## Status

🟢 MVP — Active Development

The core MIXORA workflow is functional, including authentication, conversation management, AI reply generation, ticket management, knowledge retrieval and operational monitoring.

## Features

### Dashboard

- Real-time operational statistics
- Conversation overview
- Ticket statistics
- High-priority ticket monitoring
- Knowledge Base statistics
- Intent distribution
- Recent conversations
- Recent activity feed
- System status monitoring

### Inbox

- Customer conversation management
- Automatic intent classification
- Priority detection
- Sentiment analysis
- Confidence scoring
- AI-generated replies
- Manual reply workflow
- Conversation reply history
- Automatic ticket creation
- Draft and Auto Reply modes

### AI Response System

MIXORA supports two response modes:

**Draft**

AI generates a suggested response that must be reviewed and sent by an operator.

**Auto Reply**

MIXORA can automatically send responses when the configured confidence and safety conditions are satisfied.

### Knowledge Base

- TXT document upload
- Markdown document upload
- Duplicate detection
- File validation
- Document indexing
- Vector storage with Qdrant
- RAG-based knowledge retrieval
- Knowledge document deletion

### Tickets

- Automatic ticket creation from conversations
- Priority management
- Open status
- In Progress status
- Resolved status
- Persistent ticket state
- Dashboard integration

### Authentication

- Operator login
- Protected API routes
- Bearer token authentication
- Session validation
- Automatic handling of expired sessions
- Logout
- Environment-based credentials

### Activity Log

MIXORA records important operational events, including:

- Conversation creation
- AI replies
- Manual replies
- Ticket creation
- Ticket status changes
- Knowledge Base changes

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Lucide React

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Async PostgreSQL

### AI & Data

- Ollama
- Llama 3.2
- Qdrant
- Retrieval-Augmented Generation (RAG)

### Database

- PostgreSQL

## Architecture

```text
Customer
   |
   v
React / TypeScript Frontend
   |
   | REST API + Bearer Authentication
   v
FastAPI Backend
   |
   +----------------------+
   |                      |
   v                      v
PostgreSQL              Ollama
   |                      |
   |                      v
   |                AI Generation
   |
   v
Operational Data
   |
   +----------------------+
   |
   v
Qdrant
   |
   v
Knowledge Retrieval / RAG
```

## Project Structure

```text
mixora/
|
|-- backend/
|   |-- app/
|   |   |-- main.py
|   |   |-- models.py
|   |   |-- schemas.py
|   |   |-- database.py
|   |   |-- services/
|   |   |-- ...
|   |
|   |-- requirements.txt
|   |-- .env
|
|-- frontend/
|   |-- src/
|   |   |-- pages/
|   |   |   |-- Dashboard.tsx
|   |   |   |-- Inbox.tsx
|   |   |   |-- Tickets.tsx
|   |   |   |-- Knowledge.tsx
|   |   |   |-- Settings.tsx
|   |   |   |-- Login.tsx
|   |   |
|   |   |-- App.tsx
|   |   |-- App.css
|   |   |-- main.tsx
|   |
|   |-- package.json
|
|-- .env.example
|-- .gitignore
|-- README.md
```

## Local Development

### Requirements

Before running MIXORA locally, install:

- Python 3.11+
- Node.js
- PostgreSQL
- Qdrant
- Ollama

## Environment Configuration

Copy:

```bash
.env.example
```

and create your local environment configuration.

Example:

```env
APP_ENV=development

DATABASE_URL=postgresql+asyncpg://mixora:mixora@localhost:5432/mixora

REDIS_URL=redis://localhost:6379/0

QDRANT_URL=http://localhost:6333

LLM_PROVIDER=ollama
LLM_MODEL=llama3.2

MIXORA_ADMIN_USERNAME=admin
MIXORA_ADMIN_PASSWORD=change-me

MIXORA_AUTH_SECRET=change-this-to-a-long-random-secret
```

Never commit your real `.env` file or production credentials.

## Backend

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn app.main:app --reload
```

The development API runs on port `8000`.

FastAPI documentation is available at:

```text
http://localhost:8000/docs
```

## Frontend

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Production Build

To verify the frontend production build:

```bash
cd frontend
npm run build
```

The generated production files are placed in:

```text
frontend/dist/
```

## AI Model

MIXORA currently uses Ollama for local AI inference.

Make sure the configured model is available locally:

```bash
ollama pull llama3.2
```

The default development configuration uses:

```text
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
```

## Security

MIXORA currently includes MVP-level operator authentication.

API endpoints are protected using Bearer authentication, while credentials and the authentication secret are configured through environment variables.

Production deployments should use strong credentials, secure secret management and HTTPS.

## Current MVP

The current MVP includes:

- Operator authentication
- Protected API
- Dashboard
- Customer Inbox
- AI conversation analysis
- AI-generated responses
- Draft workflow
- Auto Reply workflow
- Knowledge Base
- RAG retrieval
- Ticket management
- Activity logging
- System monitoring
- Persistent application settings

## Roadmap

Future development may include:

- Multi-user authentication
- Roles and permissions
- Email integration
- WhatsApp integration
- Additional communication channels
- Advanced customer profiles
- Persistent customer memory
- Lead scoring
- Multi-agent workflows
- Advanced AI tools
- Analytics and reporting
- Docker-based deployment
- Cloud deployment
- Production-grade authentication

## License

This project is currently under active development.