from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai import (
    analyze_message,
    generate_reply,
)
from app.database import (
    Base,
    engine,
    get_db,
)
from app.models import (
    Conversation,
    ConversationReply,
    KnowledgeDocument,
    Ticket,
)
from app.rag import (
    index_document,
    search_knowledge,
)
from app.schemas import (
    ConversationCreate,
    ConversationResponse,
    DashboardStatsResponse,
    GeneratedReplyResponse,
    IntentStatsResponse,
    KnowledgeDocumentResponse,
    RecentConversationResponse,
    ReplyCreate,
    ReplyResponse,
    TicketResponse,
    TicketStatusUpdate,
)


KNOWLEDGE_DIR = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "knowledge"
)

KNOWLEDGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(
            Base.metadata.create_all
        )

    yield


app = FastAPI(
    title="MIXORA API",
    description=(
        "Local-first AI Customer Operations Platform"
    ),
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# HEALTH
# =========================================================


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "mixora-api",
        "version": "0.1.0",
    }


# =========================================================
# CONVERSATIONS
# =========================================================


@app.get(
    "/api/conversations",
    response_model=list[ConversationResponse],
)
async def get_conversations(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).order_by(
            Conversation.id
        )
    )

    return result.scalars().all()


@app.post(
    "/api/conversations",
    response_model=ConversationResponse,
)
async def create_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
):
    analysis = analyze_message(
        payload.message
    )

    conversation = Conversation(
        name=payload.name,
        subject=payload.subject,
        message=payload.message,
        intent=analysis.intent,
        priority=analysis.priority,
        sentiment=analysis.sentiment,
        confidence=analysis.confidence,
    )

    db.add(conversation)

    await db.commit()
    await db.refresh(conversation)

    return conversation


# =========================================================
# AI GENERATE REPLY
# =========================================================


@app.post(
    "/api/conversations/{conversation_id}/generate-reply",
    response_model=GeneratedReplyResponse,
)
async def generate_conversation_reply(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id
        )
    )

    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    search_results = search_knowledge(
        query=conversation.message,
        limit=3,
    )

    knowledge_context = None
    knowledge_source = None

    if search_results:
        best_result = search_results[0]

        knowledge_context = best_result.get(
            "text"
        )

        knowledge_source = best_result.get(
            "filename"
        )

    reply = generate_reply(
        customer_name=conversation.name,
        intent=conversation.intent,
        message=conversation.message,
        knowledge_context=knowledge_context,
    )

    return GeneratedReplyResponse(
        reply=reply,
        source=knowledge_source,
    )


# =========================================================
# REANALYZE
# =========================================================


@app.post(
    "/api/conversations/{conversation_id}/reanalyze",
    response_model=ConversationResponse,
)
async def reanalyze_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id
        )
    )

    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    analysis = analyze_message(
        conversation.message
    )

    conversation.intent = analysis.intent
    conversation.priority = analysis.priority
    conversation.sentiment = analysis.sentiment
    conversation.confidence = analysis.confidence

    await db.commit()
    await db.refresh(conversation)

    return conversation


# =========================================================
# CONVERSATION REPLIES
# =========================================================


@app.get(
    "/api/conversations/{conversation_id}/replies",
    response_model=list[ReplyResponse],
)
async def get_conversation_replies(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
):
    conversation_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id
        )
    )

    conversation = (
        conversation_result.scalar_one_or_none()
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    result = await db.execute(
        select(ConversationReply)
        .where(
            ConversationReply.conversation_id
            == conversation_id
        )
        .order_by(
            ConversationReply.created_at.asc()
        )
    )

    return result.scalars().all()


@app.post(
    "/api/conversations/{conversation_id}/replies",
    response_model=ReplyResponse,
)
async def send_conversation_reply(
    conversation_id: int,
    payload: ReplyCreate,
    db: AsyncSession = Depends(get_db),
):
    conversation_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id
        )
    )

    conversation = (
        conversation_result.scalar_one_or_none()
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    content = payload.content.strip()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Reply cannot be empty.",
        )

    reply = ConversationReply(
        conversation_id=conversation_id,
        content=content,
        source=payload.source,
    )

    db.add(reply)

    await db.commit()
    await db.refresh(reply)

    return reply


# =========================================================
# KNOWLEDGE BASE
# =========================================================


@app.get(
    "/api/knowledge",
    response_model=list[
        KnowledgeDocumentResponse
    ],
)
async def get_knowledge_documents(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgeDocument).order_by(
            KnowledgeDocument.created_at.desc()
        )
    )

    return result.scalars().all()


@app.post(
    "/api/knowledge/upload",
    response_model=KnowledgeDocumentResponse,
)
async def upload_knowledge_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is missing.",
        )

    extension = (
        Path(file.filename)
        .suffix
        .lower()
    )

    allowed_extensions = {
        ".txt",
        ".md",
    }

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only TXT and MD files "
                "are supported for now."
            ),
        )

    raw_content = await file.read()

    try:
        content = raw_content.decode(
            "utf-8"
        )
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail=(
                "File must use UTF-8 encoding."
            ),
        )

    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="File is empty.",
        )

    safe_filename = (
        Path(file.filename).name
    )

    file_path = (
        KNOWLEDGE_DIR
        / safe_filename
    )

    file_path.write_text(
        content,
        encoding="utf-8",
    )

    document = KnowledgeDocument(
        filename=safe_filename,
        title=Path(
            safe_filename
        ).stem,
        content=content,
        file_type=extension.replace(
            ".",
            "",
        ),
        status="ready",
    )

    db.add(document)

    await db.commit()
    await db.refresh(document)

    index_document(
        document_id=document.id,
        filename=document.filename,
        title=document.title,
        content=document.content,
    )

    document.status = "indexed"

    await db.commit()
    await db.refresh(document)

    return document


@app.get(
    "/api/knowledge/search"
)
async def search_knowledge_endpoint(
    query: str,
):
    results = search_knowledge(
        query=query,
        limit=3,
    )

    return {
        "query": query,
        "results": results,
    }


# =========================================================
# TICKETS
# =========================================================


@app.get(
    "/api/tickets",
    response_model=list[TicketResponse],
)
async def get_tickets(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Ticket).order_by(
            Ticket.created_at.desc()
        )
    )

    return result.scalars().all()


@app.post(
    "/api/conversations/{conversation_id}/ticket",
    response_model=TicketResponse,
)
async def create_ticket_from_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id
        )
    )

    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    existing_ticket_result = await db.execute(
        select(Ticket).where(
            Ticket.conversation_id
            == conversation_id
        )
    )

    existing_ticket = (
        existing_ticket_result
        .scalar_one_or_none()
    )

    if existing_ticket is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "A ticket already exists "
                "for this conversation."
            ),
        )

    summary = (
        f"Clientul {conversation.name} "
        f"a trimis o solicitare cu intentia "
        f"'{conversation.intent}'. "
        f"Mesaj: {conversation.message}"
    )

    ticket = Ticket(
        conversation_id=conversation.id,
        customer_name=conversation.name,
        title=conversation.subject,
        summary=summary,
        priority=conversation.priority,
        status="Open",
    )

    db.add(ticket)

    await db.commit()
    await db.refresh(ticket)

    return ticket


@app.patch(
    "/api/tickets/{ticket_id}/status",
    response_model=TicketResponse,
)
async def update_ticket_status(
    ticket_id: int,
    payload: TicketStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    allowed_statuses = {
        "Open",
        "In Progress",
        "Resolved",
    }

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid ticket status.",
        )

    result = await db.execute(
        select(Ticket).where(
            Ticket.id == ticket_id
        )
    )

    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found.",
        )

    ticket.status = payload.status

    await db.commit()
    await db.refresh(ticket)

    return ticket


# =========================================================
# DASHBOARD STATS
# =========================================================


@app.get(
    "/api/dashboard/stats",
    response_model=DashboardStatsResponse,
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
):
    conversations_result = await db.execute(
        select(func.count())
        .select_from(Conversation)
    )

    tickets_total_result = await db.execute(
        select(func.count())
        .select_from(Ticket)
    )

    tickets_open_result = await db.execute(
        select(func.count())
        .select_from(Ticket)
        .where(
            Ticket.status == "Open"
        )
    )

    tickets_in_progress_result = (
        await db.execute(
            select(func.count())
            .select_from(Ticket)
            .where(
                Ticket.status
                == "In Progress"
            )
        )
    )

    tickets_resolved_result = (
        await db.execute(
            select(func.count())
            .select_from(Ticket)
            .where(
                Ticket.status
                == "Resolved"
            )
        )
    )

    high_priority_result = await db.execute(
        select(func.count())
        .select_from(Ticket)
        .where(
            Ticket.priority == "High"
        )
    )

    knowledge_result = await db.execute(
        select(func.count())
        .select_from(KnowledgeDocument)
    )

    return DashboardStatsResponse(
        conversations=(
            conversations_result.scalar_one()
        ),
        tickets_total=(
            tickets_total_result.scalar_one()
        ),
        tickets_open=(
            tickets_open_result.scalar_one()
        ),
        tickets_in_progress=(
            tickets_in_progress_result.scalar_one()
        ),
        tickets_resolved=(
            tickets_resolved_result.scalar_one()
        ),
        high_priority_tickets=(
            high_priority_result.scalar_one()
        ),
        knowledge_documents=(
            knowledge_result.scalar_one()
        ),
    )


# =========================================================
# DASHBOARD RECENT CONVERSATIONS
# =========================================================


@app.get(
    "/api/dashboard/recent-conversations",
    response_model=list[
        RecentConversationResponse
    ],
)
async def get_recent_conversations(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .order_by(
            Conversation.id.desc()
        )
        .limit(5)
    )

    return result.scalars().all()


# =========================================================
# DASHBOARD INTENTS
# =========================================================


@app.get(
    "/api/dashboard/intents",
    response_model=list[
        IntentStatsResponse
    ],
)
async def get_intent_stats(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Conversation.intent,
            func.count(
                Conversation.id
            ),
        )
        .group_by(
            Conversation.intent
        )
        .order_by(
            func.count(
                Conversation.id
            ).desc()
        )
    )

    rows = result.all()

    return [
        IntentStatsResponse(
            intent=intent,
            count=count,
        )
        for intent, count in rows
    ]