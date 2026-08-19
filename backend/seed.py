import asyncio

from sqlalchemy import func, select

from app.database import Base, SessionLocal, engine
from app.models import Conversation


async def seed_database():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        result = await session.execute(
            select(func.count()).select_from(Conversation)
        )

        count = result.scalar_one()

        if count > 0:
            print("Database already contains conversations.")
            return

        conversations = [
            Conversation(
                name="Maria Popescu",
                subject="Retur comanda",
                message=(
                    "Buna! Am cumparat produsul acum 10 zile, "
                    "dar nu mi se potriveste. Il mai pot returna?"
                ),
                intent="Return request",
                priority="Medium",
                sentiment="Neutral",
                confidence=94,
            ),
            Conversation(
                name="Andrei Ionescu",
                subject="Interesat de Premium",
                message=(
                    "Salut! Sunt interesat de pachetul Premium "
                    "pentru firma mea. Care este pretul si ce include?"
                ),
                intent="Purchase intent",
                priority="High",
                sentiment="Positive",
                confidence=91,
            ),
            Conversation(
                name="Elena Matei",
                subject="Comanda intarziata",
                message=(
                    "Comanda mea trebuia sa ajunga ieri si inca "
                    "nu am primit nimic. Ma puteti ajuta?"
                ),
                intent="Order status",
                priority="High",
                sentiment="Negative",
                confidence=97,
            ),
        ]

        session.add_all(conversations)
        await session.commit()

        print("MIXORA demo conversations created.")


if __name__ == "__main__":
    asyncio.run(seed_database())