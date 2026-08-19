from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ConversationCreate(BaseModel):
    name: str
    subject: str
    message: str


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
    status: str


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
    content: str
    source: str | None = None


class ReplyResponse(BaseModel):
    id: int
    conversation_id: int
    content: str
    source: str | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ResponseModeUpdate(BaseModel):
    mode: str


class ResponseModeResponse(BaseModel):
    mode: str