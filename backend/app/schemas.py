from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class AuthLoginRequest(BaseModel):
    username: str = Field(
        min_length=1,
        max_length=100,
    )

    password: str = Field(
        min_length=1,
        max_length=255,
    )


class AuthLoginResponse(BaseModel):
    access_token: str
    token_type: str
    operator_name: str


class AuthMeResponse(BaseModel):
    username: str
    operator_name: str


class ConversationCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
    )

    subject: str = Field(
        min_length=3,
        max_length=200,
    )

    message: str = Field(
        min_length=5,
        max_length=5000,
    )

    @field_validator(
        "name",
        "subject",
        "message",
    )
    @classmethod
    def strip_text(
        cls,
        value: str,
    ):
        value = value.strip()

        if not value:
            raise ValueError(
                "Campul nu poate fi gol."
            )

        return value


class ConversationResponse(BaseModel):
    id: int
    name: str
    subject: str
    message: str
    intent: str
    priority: str
    sentiment: str
    confidence: float

    model_config = ConfigDict(
        from_attributes=True
    )


class GeneratedReplyResponse(BaseModel):
    reply: str
    source: str | None = None


class KnowledgeDocumentResponse(BaseModel):
    id: int
    filename: str
    title: str
    file_type: str
    status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class TicketResponse(BaseModel):
    id: int
    conversation_id: int
    customer_name: str
    title: str
    summary: str
    priority: str
    status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class TicketStatusUpdate(BaseModel):
    status: Literal[
        "Open",
        "In Progress",
        "Resolved",
    ]


class DashboardStatsResponse(BaseModel):
    conversations: int
    tickets_total: int
    tickets_open: int
    tickets_in_progress: int
    tickets_resolved: int
    high_priority_tickets: int
    knowledge_documents: int


class RecentConversationResponse(BaseModel):
    id: int
    name: str
    subject: str
    intent: str
    priority: str
    confidence: float

    model_config = ConfigDict(
        from_attributes=True
    )


class IntentStatsResponse(BaseModel):
    intent: str
    count: int


class ReplyCreate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=10000,
    )

    source: str | None = Field(
        default=None,
        max_length=255,
    )

    @field_validator("content")
    @classmethod
    def clean_content(
        cls,
        value: str,
    ):
        value = value.strip()

        if not value:
            raise ValueError(
                "Raspunsul nu poate fi gol."
            )

        return value


class ReplyResponse(BaseModel):
    id: int
    conversation_id: int
    content: str
    source: str | None
    reply_type: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ResponseModeUpdate(BaseModel):
    mode: Literal[
        "draft",
        "auto",
    ]


class ResponseModeResponse(BaseModel):
    mode: str


class ActivityLogResponse(BaseModel):
    id: int
    event_type: str
    title: str
    description: str
    entity_type: str | None
    entity_id: int | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )