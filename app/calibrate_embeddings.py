"""Kalibrimi i pragut te duplikatave. Kostoja < $0.0001.

Ekzekutimi (nga folderi backend):  python -m app.calibrate_embeddings
Punon edhe me AI_MOCK=1, sepse therret AI-ne direkt.
"""
from __future__ import annotations

import asyncio

from app.ai_service import _get_client, cosine

A_GROPE = ("Ka një gropë shumë të thellë në mes të Rrugës Myslym Shyri, afër kryqëzimit "
           "me Rrugën e Elbasanit. Makinat duhet ta shmangin.")
A_DRITE = ("Drita e rrugës para pallatit nr. 5 te Rruga e Kavajës nuk ndizet prej një jave, "
           "natën është errësirë totale.")
A_KOSH = ("Koshat e mbeturinave te tregu i Zonës së Re janë mbushur plot dhe plehrat "
          "janë derdhur në trotuar.")

DUPLIKATA = [
    ("Gropë", A_GROPE,
     "Te kryqëzimi Myslym Shyri - Elbasani asfalti është shembur dhe ka krijuar "
     "një vrimë të madhe, e rrezikshme për motorrat."),
    ("Dritë", A_DRITE,
     "Shtylla e ndriçimit përballë pallatit 5 në Kavajës është fikur, "
     "rruga mbetet në errësirë çdo natë."),
    ("Mbeturina", A_KOSH,
     "Plehra të grumbulluara pranë tregut në Zonën e Re, kontejnerët nuk janë "
     "boshatisur prej ditësh, erë e rëndë."),
]

JO_DUPLIKATA = [
    ("Gropë vs trotuar", A_GROPE,
     "Trotuari te Rruga e Durrësit ka pllaka të thyera dhe këmbësorët pengohen."),
    ("Dritë vs shtyllë e goditur", A_DRITE,
     "Një shtyllë ndriçimi te Rruga e Barrikadave është goditur nga një makinë "
     "dhe po anon, rrezikon të bjerë."),
    ("Kosh plot vs pa koshe", A_KOSH,
     "Në lagjen tonë në Kombinat nuk ka asnjë kosh mbeturinash, njerëzit "
     "i hedhin plehrat në tokë."),
]

MODELS = ["text-embedding-3-small", "text-embedding-3-large"]


async def score(model: str, pairs: list[tuple[str, str, str]]) -> list[tuple[str, float]]:
    texts = [text for _, first, second in pairs for text in (first, second)]
    response = await _get_client().embeddings.create(model=model, input=texts)
    vectors = [item.embedding for item in response.data]
    return [(pairs[i][0], cosine(vectors[2 * i], vectors[2 * i + 1]))
            for i in range(len(pairs))]


async def main() -> None:
    for model in MODELS:
        print(f"\n===== {model} =====")
        dup = await score(model, DUPLIKATA)
        non = await score(model, JO_DUPLIKATA)
        print("Duplikata (duhet te jene te LARTA):")
        for name, value in dup:
            print(f"  {value:.2f}  {name}")
        print("Jo-duplikata (duhet te jene te ULETA):")
        for name, value in non:
            print(f"  {value:.2f}  {name}")
        lowest_dup = min(value for _, value in dup)
        highest_non = max(value for _, value in non)
        gap = lowest_dup - highest_non
        if gap > 0:
            print(f"✅ I dallon. Hapesira: {gap:.2f}. "
                  f"Pragu i sugjeruar: {(lowest_dup + highest_non) / 2:.2f}")
        else:
            print(f"❌ Nuk i dallon (duplikati me i ulet {lowest_dup:.2f} "
                  f"<= jo-duplikati me i larte {highest_non:.2f})")


if __name__ == "__main__":
    asyncio.run(main())