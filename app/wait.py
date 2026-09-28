import asyncio

from .db import close_database, wait_for_database


async def main() -> None:
    await wait_for_database()
    await close_database()


if __name__ == "__main__":
    asyncio.run(main())
