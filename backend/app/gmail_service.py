from __future__ import annotations

import base64
import os
from email.message import EmailMessage
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


BASE_DIR = Path(__file__).resolve().parents[1]

CREDENTIALS_PATH = BASE_DIR / "credentials.json"
TOKEN_PATH = BASE_DIR / "token.json"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]


def get_gmail_service():
    credentials = None

    if TOKEN_PATH.exists():
        credentials = Credentials.from_authorized_user_file(
            TOKEN_PATH,
            SCOPES,
        )

    if not credentials or not credentials.valid:
        if (
            credentials
            and credentials.expired
            and credentials.refresh_token
        ):
            credentials.refresh(
                Request()
            )
        else:
            if not CREDENTIALS_PATH.exists():
                raise FileNotFoundError(
                    "Fisierul credentials.json nu a fost gasit."
                )

            flow = InstalledAppFlow.from_client_secrets_file(
                CREDENTIALS_PATH,
                SCOPES,
            )

            credentials = flow.run_local_server(
                port=0
            )

        TOKEN_PATH.write_text(
            credentials.to_json(),
            encoding="utf-8",
        )

    return build(
        "gmail",
        "v1",
        credentials=credentials,
    )


def get_header(
    headers: list[dict],
    name: str,
) -> str:
    for header in headers:
        if (
            header.get("name", "").lower()
            == name.lower()
        ):
            return header.get(
                "value",
                "",
            )

    return ""


def extract_text_from_payload(
    payload: dict,
) -> str:
    mime_type = payload.get(
        "mimeType",
        "",
    )

    body = payload.get(
        "body",
        {},
    )

    data = body.get(
        "data"
    )

    if (
        mime_type == "text/plain"
        and data
    ):
        decoded = base64.urlsafe_b64decode(
            data.encode("utf-8")
        )

        return decoded.decode(
            "utf-8",
            errors="replace",
        )

    parts = payload.get(
        "parts",
        [],
    )

    for part in parts:
        text = extract_text_from_payload(
            part
        )

        if text.strip():
            return text

    return ""


def list_recent_emails(
    max_results: int = 10,
) -> list[dict]:
    service = get_gmail_service()

    result = (
        service.users()
        .messages()
        .list(
            userId="me",
            maxResults=max_results,
            q="in:inbox",
        )
        .execute()
    )

    messages = result.get(
        "messages",
        [],
    )

    emails: list[dict] = []

    for item in messages:
        message = (
            service.users()
            .messages()
            .get(
                userId="me",
                id=item["id"],
                format="full",
            )
            .execute()
        )

        payload = message.get(
            "payload",
            {},
        )

        headers = payload.get(
            "headers",
            [],
        )

        emails.append(
            {
                "id": message.get(
                    "id"
                ),
                "thread_id": message.get(
                    "threadId"
                ),
                "from": get_header(
                    headers,
                    "From",
                ),
                "to": get_header(
                    headers,
                    "To",
                ),
                "subject": get_header(
                    headers,
                    "Subject",
                ),
                "date": get_header(
                    headers,
                    "Date",
                ),
                "snippet": message.get(
                    "snippet",
                    "",
                ),
                "body": extract_text_from_payload(
                    payload
                ).strip(),
            }
        )

    return emails


def send_email(
    to_email: str,
    subject: str,
    body: str,
) -> dict:
    service = get_gmail_service()

    message = EmailMessage()

    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(
        body
    )

    encoded_message = (
        base64.urlsafe_b64encode(
            message.as_bytes()
        )
        .decode("utf-8")
    )

    sent = (
        service.users()
        .messages()
        .send(
            userId="me",
            body={
                "raw": encoded_message,
            },
        )
        .execute()
    )

    return {
        "id": sent.get(
            "id"
        ),
        "thread_id": sent.get(
            "threadId"
        ),
    }