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

    model_config = ConfigDict(from_attributes=True)

class GeneratedReplyResponse(BaseModel):
    reply: str