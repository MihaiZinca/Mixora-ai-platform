from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base, engine, get_db
from app.models import Conversation

from app.schemas import (
    ConversationCreate,
    ConversationResponse,
    GeneratedReplyResponse,
)

from app.ai import analyze_message, generate_reply


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

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


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "mixora-api",
        "version": "0.1.0",
    }


@app.get(
    "/api/conversations",
    response_model=list[ConversationResponse],
)
async def get_conversations(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).order_by(Conversation.id)
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
    analysis = analyze_message(payload.message)

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
        return GeneratedReplyResponse(
            reply="Conversation not found."
        )

    reply = generate_reply(
        customer_name=conversation.name,
        intent=conversation.intent,
        message=conversation.message,
    )

    return GeneratedReplyResponse(reply=reply)
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
        return ConversationResponse(
            id=0,
            name="Not found",
            subject="Not found",
            message="Not found",
            intent="Unknown",
            priority="Unknown",
            sentiment="Unknown",
            confidence=0,
        )

    analysis = analyze_message(conversation.message)

    conversation.intent = analysis.intent
    conversation.priority = analysis.priority
    conversation.sentiment = analysis.sentiment
    conversation.confidence = analysis.confidence

    await db.commit()
    await db.refresh(conversation)

    return conversation