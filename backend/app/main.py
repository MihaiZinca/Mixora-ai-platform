from contextlib import asynccontextmanager
from pathlib import Path
from dotenv import load_dotenv

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

import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Request
from fastapi.responses import JSONResponse

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
    ActivityLog,
    AppSetting,
    Conversation,
    ConversationReply,
    KnowledgeDocument,
    Ticket,
)
from app.rag import (
    delete_document_vectors,
    index_document,
    search_knowledge,
)
from app.schemas import (
    ActivityLogResponse,
    ConversationCreate,
    ConversationResponse,
    DashboardStatsResponse,
    GeneratedReplyResponse,
    IntentStatsResponse,
    KnowledgeDocumentResponse,
    RecentConversationResponse,
    ReplyCreate,
    ReplyResponse,
    ResponseModeResponse,
    ResponseModeUpdate,
    TicketResponse,
    TicketStatusUpdate,
    AuthLoginRequest,
    AuthLoginResponse,
    AuthMeResponse,
)

load_dotenv()


KNOWLEDGE_DIR = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "knowledge"
)

KNOWLEDGE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)
AUTH_USERNAME = os.getenv(
    "MIXORA_ADMIN_USERNAME",
    "admin",
)

AUTH_PASSWORD = os.getenv(
    "MIXORA_ADMIN_PASSWORD",
    "mixora",
)

AUTH_SECRET = os.getenv(
    "MIXORA_AUTH_SECRET",
    "mixora-development-secret-change-me",
)

TOKEN_LIFETIME_SECONDS = 8 * 60 * 60



def encode_base64(value: bytes) -> str:
    return (
        base64.urlsafe_b64encode(value)
        .decode("utf-8")
        .rstrip("=")
    )


def decode_base64(value: str) -> bytes:
    padding = "=" * (
        (4 - len(value) % 4) % 4
    )

    return base64.urlsafe_b64decode(
        value + padding
    )


def create_access_token(
    username: str,
) -> str:
    payload = {
        "sub": username,
        "exp": (
            int(time.time())
            + TOKEN_LIFETIME_SECONDS
        ),
    }

    payload_json = json.dumps(
        payload,
        separators=(",", ":"),
    ).encode("utf-8")

    encoded_payload = encode_base64(
        payload_json
    )

    signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    encoded_signature = encode_base64(
        signature
    )

    return (
        f"{encoded_payload}."
        f"{encoded_signature}"
    )


def verify_access_token(
    token: str,
) -> dict | None:
    try:
        encoded_payload, provided_signature = (
            token.split(".", 1)
        )

        expected_signature = encode_base64(
            hmac.new(
                AUTH_SECRET.encode(
                    "utf-8"
                ),
                encoded_payload.encode(
                    "utf-8"
                ),
                hashlib.sha256,
            ).digest()
        )

        if not hmac.compare_digest(
            provided_signature,
            expected_signature,
        ):
            return None

        payload = json.loads(
            decode_base64(
                encoded_payload
            ).decode("utf-8")
        )

        expiration = payload.get(
            "exp"
        )

        if (
            not expiration
            or int(expiration)
            < int(time.time())
        ):
            return None

        username = payload.get("sub")

        if not username:
            return None

        return payload

    except Exception:
        return None



async def log_activity(
    db: AsyncSession,
    event_type: str,
    title: str,
    description: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
):
    activity = ActivityLog(
        event_type=event_type,
        title=title,
        description=description,
        entity_type=entity_type,
        entity_id=entity_id,
    )

    db.add(activity)


async def process_incoming_conversation(
    db: AsyncSession,
    *,
    name: str,
    subject: str,
    message: str,
    channel: str = "web",
    external_id: str | None = None,
    customer_contact: str | None = None,
) -> Conversation:
    analysis = analyze_message(message)

    conversation = Conversation(
        name=name,
        subject=subject,
        message=message,
        intent=analysis.intent,
        priority=analysis.priority,
        sentiment=analysis.sentiment,
        confidence=analysis.confidence,
        channel=channel,
        external_id=external_id,
        customer_contact=customer_contact,
    )

    db.add(conversation)
    await db.flush()

    await log_activity(
        db=db,
        event_type="conversation_created",
        title="Conversatie creata",
        description=(
            f"A fost creata o conversatie pentru {conversation.name} "
            f"din canalul {conversation.channel}."
        ),
        entity_type="conversation",
        entity_id=conversation.id,
    )

    settings_result = await db.execute(
        select(AppSetting).where(
            AppSetting.key == "response_mode"
        )
    )

    response_mode_setting = (
        settings_result.scalar_one_or_none()
    )

    response_mode = (
        response_mode_setting.value
        if response_mode_setting
        else "draft"
    )

    auto_reply_min_confidence = 90

    if (
        response_mode == "auto"
        and conversation.confidence >= auto_reply_min_confidence
    ):
        search_results = search_knowledge(
            query=conversation.message,
            limit=3,
        )

        knowledge_context = None
        knowledge_source = None

        if search_results:
            best_result = search_results[0]
            knowledge_context = best_result.get("text")
            knowledge_source = best_result.get("filename")

        generated_reply = generate_reply(
            customer_name=conversation.name,
            intent=conversation.intent,
            message=conversation.message,
            knowledge_context=knowledge_context,
        )

        automatic_reply = ConversationReply(
            conversation_id=conversation.id,
            content=generated_reply,
            source=knowledge_source,
            reply_type="automatic",
        )

        db.add(automatic_reply)

        await log_activity(
            db=db,
            event_type="automatic_reply_sent",
            title="Raspuns automat MIXORA",
            description=(
                f"MIXORA a generat automat un raspuns "
                f"pentru {conversation.name}."
            ),
            entity_type="conversation",
            entity_id=conversation.id,
        )

    await db.commit()
    await db.refresh(conversation)

    return conversation


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(
            Base.metadata.create_all
        )

    yield


app = FastAPI(
    title="MIXORA API",
    description="Local-first AI Customer Operations Platform",
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

@app.middleware("http")
async def authentication_middleware(
    request: Request,
    call_next,
):
    path = request.url.path

    public_paths = {
        "/health",
        "/api/auth/login",
        "/docs",
        "/openapi.json",
        "/redoc",
    }

    if (
        request.method == "OPTIONS"
        or path in public_paths
        or path.startswith(
            "/docs/"
        )
    ):
        return await call_next(
            request
        )

    if path.startswith("/api/"):
        authorization = (
            request.headers.get(
                "Authorization"
            )
        )

        if (
            not authorization
            or not authorization.startswith(
                "Bearer "
            )
        ):
            return JSONResponse(
                status_code=401,
                content={
                    "detail": (
                        "Autentificarea este necesara."
                    )
                },
            )

        token = authorization[
            len("Bearer "):
        ].strip()

        payload = verify_access_token(
            token
        )

        if payload is None:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": (
                        "Sesiunea a expirat "
                        "sau token-ul nu este valid."
                    )
                },
            )

        request.state.username = (
            payload["sub"]
        )

    return await call_next(
        request
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "mixora-api",
        "version": "0.1.0",
    }
@app.post(
    "/api/auth/login",
    response_model=AuthLoginResponse,
)
async def login(
    payload: AuthLoginRequest,
):
    username_valid = (
        hmac.compare_digest(
            payload.username.strip(),
            AUTH_USERNAME,
        )
    )

    password_valid = (
        hmac.compare_digest(
            payload.password,
            AUTH_PASSWORD,
        )
    )

    if (
        not username_valid
        or not password_valid
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Utilizatorul sau parola "
                "sunt incorecte."
            ),
        )

    token = create_access_token(
        AUTH_USERNAME
    )

    return AuthLoginResponse(
        access_token=token,
        token_type="bearer",
        operator_name="Administrator",
    )


@app.get(
    "/api/auth/me",
    response_model=AuthMeResponse,
)
async def get_current_operator(
    request: Request,
):
    return AuthMeResponse(
        username=request.state.username,
        operator_name="Administrator",
    )



@app.get("/api/system/status")
async def get_system_status(
    db: AsyncSession = Depends(get_db),
):
    database_status = "online"
    qdrant_status = "online"

    try:
        await db.execute(
            select(func.count())
            .select_from(Conversation)
        )
    except Exception:
        database_status = "offline"

    try:
        search_knowledge(
            query="mixora system check",
            limit=1,
        )
    except Exception:
        qdrant_status = "offline"

    return {
        "api": "online",
        "database": database_status,
        "qdrant": qdrant_status,
    }


@app.get(
    "/api/settings/response-mode",
    response_model=ResponseModeResponse,
)
async def get_response_mode(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AppSetting).where(
            AppSetting.key == "response_mode"
        )
    )

    setting = result.scalar_one_or_none()

    if setting is None:
        setting = AppSetting(
            key="response_mode",
            value="draft",
        )

        db.add(setting)

        await db.commit()
        await db.refresh(setting)

    return ResponseModeResponse(
        mode=setting.value,
    )


@app.put(
    "/api/settings/response-mode",
    response_model=ResponseModeResponse,
)
async def update_response_mode(
    payload: ResponseModeUpdate,
    db: AsyncSession = Depends(get_db),
):
    allowed_modes = {
        "draft",
        "auto",
    }

    if payload.mode not in allowed_modes:
        raise HTTPException(
            status_code=400,
            detail="Modul de raspuns nu este valid.",
        )

    result = await db.execute(
        select(AppSetting).where(
            AppSetting.key == "response_mode"
        )
    )

    setting = result.scalar_one_or_none()

    old_mode = (
        setting.value
        if setting is not None
        else "draft"
    )

    if setting is None:
        setting = AppSetting(
            key="response_mode",
            value=payload.mode,
        )

        db.add(setting)
    else:
        setting.value = payload.mode

    await log_activity(
        db=db,
        event_type="response_mode_changed",
        title="Mod AI schimbat",
        description=(
            f"Modul de raspuns a fost schimbat "
            f"din {old_mode} in {payload.mode}."
        ),
        entity_type="setting",
    )

    await db.commit()
    await db.refresh(setting)

    return ResponseModeResponse(
        mode=setting.value,
    )


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
    return await process_incoming_conversation(
        db=db,
        name=payload.name,
        subject=payload.subject,
        message=payload.message,
        channel=payload.channel,
        external_id=payload.external_id,
        customer_contact=payload.customer_contact,
    )


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
            detail="Conversatia nu a fost gasita.",
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

    await log_activity(
        db=db,
        event_type="ai_reply_generated",
        title="Draft AI generat",
        description=(
            f"MIXORA a generat un draft AI pentru "
            f"{conversation.name}."
        ),
        entity_type="conversation",
        entity_id=conversation.id,
    )

    await db.commit()

    return GeneratedReplyResponse(
        reply=reply,
        source=knowledge_source,
    )


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
            detail="Conversatia nu a fost gasita.",
        )

    analysis = analyze_message(
        conversation.message
    )

    conversation.intent = analysis.intent
    conversation.priority = analysis.priority
    conversation.sentiment = analysis.sentiment
    conversation.confidence = analysis.confidence

    await log_activity(
        db=db,
        event_type="conversation_reanalyzed",
        title="Conversatie reanalizata",
        description=(
            f"Conversatia lui {conversation.name} "
            f"a fost reanalizata de MIXORA."
        ),
        entity_type="conversation",
        entity_id=conversation.id,
    )

    await db.commit()
    await db.refresh(conversation)

    return conversation


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
            detail="Conversatia nu a fost gasita.",
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
            detail="Conversatia nu a fost gasita.",
        )

    content = payload.content.strip()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Raspunsul nu poate fi gol.",
        )

    reply = ConversationReply(
        conversation_id=conversation_id,
        content=content,
        source=payload.source,
        reply_type="manual",
    )

    db.add(reply)

    await log_activity(
        db=db,
        event_type="manual_reply_sent",
        title="Raspuns manual trimis",
        description=(
            f"A fost trimis un raspuns manual "
            f"pentru {conversation.name}."
        ),
        entity_type="conversation",
        entity_id=conversation.id,
    )

    await db.commit()
    await db.refresh(reply)

    return reply


@app.get(
    "/api/knowledge",
    response_model=list[KnowledgeDocumentResponse],
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
            detail="Numele fisierului lipseste.",
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
                "Momentan sunt acceptate doar "
                "fisiere TXT si MD."
            ),
        )

    raw_content = await file.read()
    max_file_size = 1 * 1024 * 1024

    if len(raw_content) > max_file_size:
        raise HTTPException(
            status_code=413,
            detail=(
                "Fisierul este prea mare. "
                "Dimensiunea maxima permisa este 1 MB."
            ),
        )

    try:
        content = raw_content.decode(
            "utf-8"
        )
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail=(
                "Fisierul trebuie sa foloseasca "
                "codarea UTF-8."
            ),
        )

    if not content.strip():
        raise HTTPException(
            status_code=400,
            detail="Fisierul este gol.",
        )

    safe_filename = Path(
        file.filename
    ).name

    existing_result = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.filename
            == safe_filename
        )
    )

    existing_document = (
        existing_result.scalars().first()
    )

    if existing_document is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Documentul exista deja "
                "in baza de cunostinte."
            ),
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

    await db.flush()

    try:
        index_document(
            document_id=document.id,
            filename=document.filename,
            title=document.title,
            content=document.content,
        )
    except Exception as exc:
        document.status = "error"

        await db.commit()
        await db.refresh(document)

        raise HTTPException(
            status_code=500,
            detail=(
                "Documentul a fost salvat, "
                "dar indexarea in Qdrant a esuat."
            ),
        ) from exc

    document.status = "indexed"

    await log_activity(
        db=db,
        event_type="knowledge_uploaded",
        title="Document indexat",
        description=(
            f"Documentul {document.filename} "
            f"a fost adaugat in Knowledge Base."
        ),
        entity_type="knowledge_document",
        entity_id=document.id,
    )

    await db.commit()
    await db.refresh(document)

    return document


@app.get("/api/knowledge/search")
async def search_knowledge_endpoint(
    query: str,
):
    if not query.strip():
        raise HTTPException(
            status_code=400,
            detail="Textul cautarii nu poate fi gol.",
        )

    results = search_knowledge(
        query=query,
        limit=3,
    )

    return {
        "query": query,
        "results": results,
    }


@app.delete(
    "/api/knowledge/{document_id}"
)
async def delete_knowledge_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.id == document_id
        )
    )

    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Documentul nu a fost gasit.",
        )

    filename = document.filename

    try:
        delete_document_vectors(
            document_id=document.id
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Documentul nu a putut fi eliminat "
                "din indexul Qdrant."
            ),
        ) from exc

    file_path = (
        KNOWLEDGE_DIR
        / document.filename
    )

    if file_path.exists():
        file_path.unlink()

    await log_activity(
        db=db,
        event_type="knowledge_deleted",
        title="Document sters",
        description=(
            f"Documentul {filename} "
            f"a fost eliminat din Knowledge Base."
        ),
        entity_type="knowledge_document",
        entity_id=document.id,
    )

    await db.delete(document)
    await db.commit()

    return {
        "status": "sters",
        "document_id": document_id,
        "filename": filename,
        "message": (
            "Documentul a fost sters cu succes."
        ),
    }



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
            detail="Conversatia nu a fost gasita.",
        )

    existing_ticket_result = await db.execute(
        select(Ticket).where(
            Ticket.conversation_id
            == conversation_id
        )
    )

    existing_ticket = (
        existing_ticket_result.scalar_one_or_none()
    )

    if existing_ticket is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Exista deja un tichet "
                "pentru aceasta conversatie."
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

    await db.flush()

    await log_activity(
        db=db,
        event_type="ticket_created",
        title="Tichet creat",
        description=(
            f"Tichetul #{ticket.id} a fost creat "
            f"pentru {conversation.name}."
        ),
        entity_type="ticket",
        entity_id=ticket.id,
    )

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
            detail=(
                "Statusul tichetului nu este valid."
            ),
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
            detail="Tichetul nu a fost gasit.",
        )

    old_status = ticket.status

    ticket.status = payload.status

    await log_activity(
        db=db,
        event_type="ticket_status_changed",
        title="Status tichet schimbat",
        description=(
            f"Tichetul #{ticket.id} a trecut "
            f"din {old_status} in {payload.status}."
        ),
        entity_type="ticket",
        entity_id=ticket.id,
    )

    await db.commit()
    await db.refresh(ticket)

    return ticket


@app.get(
    "/api/activity",
    response_model=list[ActivityLogResponse],
)
async def get_activity(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ActivityLog)
        .order_by(
            ActivityLog.created_at.desc()
        )
        .limit(50)
    )

    return result.scalars().all()


@app.get(
    "/api/dashboard/recent-activity",
    response_model=list[ActivityLogResponse],
)
async def get_recent_activity(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ActivityLog)
        .order_by(
            ActivityLog.created_at.desc()
        )
        .limit(8)
    )

    return result.scalars().all()


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

    tickets_in_progress_result = await db.execute(
        select(func.count())
        .select_from(Ticket)
        .where(
            Ticket.status == "In Progress"
        )
    )

    tickets_resolved_result = await db.execute(
        select(func.count())
        .select_from(Ticket)
        .where(
            Ticket.status == "Resolved"
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