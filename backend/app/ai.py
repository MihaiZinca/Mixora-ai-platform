from dataclasses import dataclass


@dataclass
class AnalysisResult:
    intent: str
    sentiment: str
    priority: str
    confidence: float


def analyze_message(message: str) -> AnalysisResult:
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
        "achizitie",
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

    payment_words = [
        "plata",
        "card",
        "factura",
        "tranzactie",
        "respinsa",
        "payment",
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
    ]

    positive_words = [
        "multumesc",
        "super",
        "excelent",
        "interesat",
        "interesata",
        "imi place",
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

    if any(word in text for word in return_words):
        intent = "Return request"
        confidence = 92.0

    elif any(word in text for word in purchase_words):
        intent = "Purchase intent"
        confidence = 90.0

    elif any(word in text for word in order_words):
        intent = "Order status"
        confidence = 91.0

    elif any(word in text for word in payment_words):
        intent = "Payment issue"
        confidence = 93.0

    else:
        intent = "General support"
        confidence = 72.0

    if any(word in text for word in negative_words):
        sentiment = "Negative"

    elif any(word in text for word in positive_words):
        sentiment = "Positive"

    else:
        sentiment = "Neutral"

    if any(word in text for word in urgent_words):
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


def extract_return_days(
    knowledge_context: str,
) -> str | None:
    text = knowledge_context.lower()

    for days in range(1, 121):
        patterns = [
            f"{days} days",
            f"{days} day",
            f"{days} zile",
        ]

        if any(pattern in text for pattern in patterns):
            return str(days)

    return None


def generate_reply(
    customer_name: str,
    intent: str,
    message: str,
    knowledge_context: str | None = None,
) -> str:
    first_name = customer_name.split()[0]

    if intent == "Return request":
        if knowledge_context:
            return_days = extract_return_days(
                knowledge_context
            )

            if return_days:
                return (
                    f"Buna, {first_name}! "
                    "Conform politicii interne a companiei, "
                    f"produsele eligibile pot fi returnate in termen de "
                    f"{return_days} de zile de la data achizitiei. "
                    "Pentru initierea returului, avem nevoie de numarul comenzii."
                )

        return (
            f"Buna, {first_name}! "
            "Te putem ajuta cu solicitarea de retur. "
            "Pentru continuare, avem nevoie de numarul comenzii."
        )

    if intent == "Purchase intent":
        if knowledge_context:
            return (
                f"Buna, {first_name}! "
                "Multumim pentru interes. "
                "Am gasit informatii relevante in baza interna de cunostinte. "
                "Iti putem oferi detalii despre oferta si configuratia potrivita."
            )

        return (
            f"Buna, {first_name}! "
            "Multumim pentru interes. "
            "Un consultant te poate ajuta cu detaliile comerciale."
        )

    if intent == "Order status":
        return (
            f"Buna, {first_name}! "
            "Imi pare rau pentru intarziere. "
            "Putem verifica statusul livrarii. "
            "Te rog sa ne trimiti numarul comenzii."
        )

    if intent == "Payment issue":
        return (
            f"Buna, {first_name}! "
            "Imi pare rau pentru problema cu plata. "
            "Vom verifica situatia tranzactiei si te vom ajuta cu urmatorii pasi."
        )

    return (
        f"Buna, {first_name}! "
        "Multumim pentru mesaj. "
        "Am inregistrat solicitarea si te vom ajuta cu informatiile necesare."
    )