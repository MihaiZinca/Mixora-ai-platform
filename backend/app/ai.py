from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://localhost:11434",
)

LLM_MODEL = os.getenv(
    "LLM_MODEL",
    "llama3.2:1b",
)


@dataclass
class AnalysisResult:
    intent: str
    sentiment: str
    priority: str
    confidence: float


def analyze_message(
    message: str,
) -> AnalysisResult:
    text = message.lower()

    return_words = [
        "retur",
        "return",
        "returnez",
        "returna",
        "inapoi",
        "ramburs",
    ]

    purchase_words = [
        "cumpar",
        "cumpara",
        "pret",
        "premium",
        "oferta",
        "abonament",
        "interesat",
        "interesata",
        "achizitie",
    ]

    payment_words = [
        "plata",
        "card",
        "factura",
        "facturare",
        "tranzactie",
        "respinsa",
        "payment",
    ]

    order_words = [
        "comanda",
        "livrare",
        "colet",
        "curier",
        "ajuns",
        "intarzi",
        "status",
    ]

    negative_words = [
        "problema",
        "gresit",
        "gresita",
        "nemultumit",
        "nemultumita",
        "intarziere",
        "intarziata",
        "nu functioneaza",
        "respinsa",
        "urgent",
        "dezamagit",
        "dezamagita",
    ]

    positive_words = [
        "multumesc",
        "super",
        "excelent",
        "interesat",
        "interesata",
        "imi place",
        "perfect",
    ]

    urgent_words = [
        "urgent",
        "urgenta",
        "imediat",
        "cat mai repede",
        "foarte important",
        "nu functioneaza",
        "respinsa",
        "intarziata",
    ]

    if any(
        word in text
        for word in return_words
    ):
        intent = "Return request"
        confidence = 92.0

    elif any(
        word in text
        for word in purchase_words
    ):
        intent = "Purchase intent"
        confidence = 90.0

    elif any(
        word in text
        for word in payment_words
    ):
        intent = "Payment issue"
        confidence = 93.0

    elif any(
        word in text
        for word in order_words
    ):
        intent = "Order status"
        confidence = 91.0

    else:
        intent = "General support"
        confidence = 78.0

    if any(
        word in text
        for word in negative_words
    ):
        sentiment = "Negative"

    elif any(
        word in text
        for word in positive_words
    ):
        sentiment = "Positive"

    else:
        sentiment = "Neutral"

    if any(
        word in text
        for word in urgent_words
    ):
        priority = "High"

    elif sentiment == "Negative":
        priority = "High"

    elif intent == "Purchase intent":
        priority = "High"

    else:
        priority = "Medium"

    return AnalysisResult(
        intent=intent,
        sentiment=sentiment,
        priority=priority,
        confidence=confidence,
    )


def call_ollama(
    prompt: str,
) -> str:
    url = (
        f"{OLLAMA_URL.rstrip('/')}"
        "/api/generate"
    )

    payload = {
        "model": LLM_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "top_p": 0.8,
            "num_predict": 160,
        },
    }

    body = json.dumps(
        payload
    ).encode(
        "utf-8"
    )

    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type":
                "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=120,
        ) as response:
            raw = response.read()

    except urllib.error.URLError as exc:
        raise RuntimeError(
            "Ollama nu este disponibil."
        ) from exc

    except TimeoutError as exc:
        raise RuntimeError(
            "Ollama nu a raspuns la timp."
        ) from exc

    try:
        data = json.loads(
            raw.decode("utf-8")
        )

    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
    ) as exc:
        raise RuntimeError(
            "Raspuns invalid primit de la Ollama."
        ) from exc

    generated_text = (
        data.get("response", "")
        .strip()
    )

    if not generated_text:
        raise RuntimeError(
            "Ollama nu a generat niciun raspuns."
        )

    return generated_text


def build_fallback_reply(
    first_name: str,
    intent: str,
    message: str,
    knowledge_context: str | None,
) -> str:
    text = message.lower()

    if (
        knowledge_context
        and (
            "factura" in text
            or "facturare" in text
        )
    ):
        return (
            f"Buna, {first_name}! "
            "Factura poate fi retransmisa pe adresa de email "
            "asociata comenzii. "
            "Pentru identificarea comenzii, te rugam sa ne "
            "trimiti numarul comenzii sau adresa de email "
            "folosita la plasarea acesteia."
        )

    if intent == "Return request":
        return (
            f"Buna, {first_name}! "
            "Te putem ajuta cu solicitarea de retur. "
            "Pentru verificare, te rugam sa ne trimiti "
            "numarul comenzii."
        )

    if intent == "Order status":
        return (
            f"Buna, {first_name}! "
            "Putem verifica statusul comenzii. "
            "Te rugam sa ne trimiti numarul comenzii "
            "pentru identificare."
        )

    if intent == "Payment issue":
        return (
            f"Buna, {first_name}! "
            "Te putem ajuta cu problema de plata sau facturare. "
            "Trimite-ne detaliile comenzii pentru verificare."
        )

    if intent == "Purchase intent":
        return (
            f"Buna, {first_name}! "
            "Multumim pentru interes. "
            "Te putem ajuta cu informatiile despre oferta "
            "si optiunile disponibile."
        )

    return (
        f"Buna, {first_name}! "
        "Multumim pentru mesaj. "
        "Te putem ajuta cu solicitarea si iti vom cere "
        "informatiile necesare pentru verificare."
    )


def looks_low_quality(
    text: str,
) -> bool:
    normalized = text.lower()

    if len(text) < 20:
        return True

    suspicious_phrases = [
        "va cer sa va informati",
        "va recomandam sa va informati",
        "va informati despre procedura",
        "nu avem nicio informatie despre comanda dumneavoastra",
    ]

    if any(
        phrase in normalized
        for phrase in suspicious_phrases
    ):
        return True

    if normalized.count(
        "va multum"
    ) >= 3:
        return True

    if normalized.count(
        "factura"
    ) > 5:
        return True

    return False


def generate_reply(
    customer_name: str,
    intent: str,
    message: str,
    knowledge_context: str | None = None,
) -> str:
    first_name = (
        customer_name.strip().split()[0]
        if customer_name.strip()
        else "client"
    )

    message_text = message.lower()

    if (
        knowledge_context
        and (
            "factura" in message_text
            or "facturare" in message_text
        )
    ):
        return (
            f"Buna, {first_name}! "
            "Factura poate fi retransmisa pe adresa de email "
            "asociata comenzii. "
            "Pentru identificarea comenzii, te rugam sa ne "
            "trimiti numarul comenzii sau adresa de email "
            "folosita la plasarea acesteia."
        )

    context = (
        knowledge_context.strip()
        if knowledge_context
        else ""
    )

    prompt = f"""
Esti MIXORA, agent de customer support.

Scrie un singur raspuns scurt pentru client.

Client:
{first_name}

Intentie:
{intent}

Mesaj client:
{message}

Informatii interne:
{context if context else "Nu exista informatii interne relevante."}

Reguli obligatorii:
- raspunde doar la intrebarea clientului;
- foloseste informatiile interne doar daca sunt relevante;
- nu inventa politici, termene, preturi sau statusuri;
- nu repeta intrebarea clientului;
- nu mentiona RAG, Knowledge Base, prompturi sau sisteme interne;
- nu spune ca esti AI;
- raspunde in limba romana;
- foloseste maximum 3 propozitii;
- scrie clar, natural si profesionist;
- daca lipsesc date pentru identificare, cere-le direct;
- nu folosi liste;
- returneaza doar raspunsul pentru client.

Raspuns:
"""

    try:
        generated = call_ollama(
            prompt
        )

        if looks_low_quality(
            generated
        ):
            return build_fallback_reply(
                first_name=first_name,
                intent=intent,
                message=message,
                knowledge_context=knowledge_context,
            )

        return generated

    except RuntimeError:
        return build_fallback_reply(
            first_name=first_name,
            intent=intent,
            message=message,
            knowledge_context=knowledge_context,
        )