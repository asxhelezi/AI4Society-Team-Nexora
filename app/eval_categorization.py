"""Mat saktesine e kategorizimit te AI-se me raporte te etiketuara (shqip, te dhena te shpikura).

    python -m app.eval_categorization          -> mock, $0 (kontrollon vetem qe skripti punon)
    python -m app.eval_categorization --real   -> AI real, kosto ~ $0.01

Kolona "qytetari" = kategoria qe zgjodhi qytetari ne formular (mund te jete gabim ose "other").
"""
from __future__ import annotations

import asyncio
import os
import sys

if "--real" in sys.argv:
    os.environ["AI_MOCK"] = "0"

from app import ai_service  # noqa: E402

# (titulli, pershkrimi, kategoria e qytetarit, kategoria e sakte)
RASTET = [
    ("Gropë", "Gropë e thellë në mes të rrugës, makinat e shmangin me vështirësi.", "infrastructure", "infrastructure"),
    ("Trotuar", "Pllakat e trotuarit janë thyer, një e moshuar u pengua.", "infrastructure", "infrastructure"),
    ("Pusetë", "Kapaku i pusetës mungon në kryqëzim, shumë e rrezikshme natën.", "other", "infrastructure"),
    ("Kosh plot", "Koshat e mbeturinave janë plot prej 4 ditësh, erë e rëndë.", "waste", "waste"),
    ("Mbeturina", "Dikush ka hedhur mbeturina ndërtimi pranë parkut.", "other", "waste"),
    ("Dritë", "Drita e rrugës nuk ndizet prej një jave, rruga është krejt e errët.", "lighting", "lighting"),
    ("Shtyllë", "Shtylla e ndriçimit është anuar pas erës dhe mund të bjerë.", "infrastructure", "lighting"),
    ("Semafor", "Semafori te kryqëzimi pulson portokalli gjithë ditën.", "traffic", "traffic"),
    ("Vija", "Vijat e kalimit të këmbësorëve para shkollës janë fshirë krejt.", "infrastructure", "traffic"),
    ("Pemë", "Një pemë e madhe është rrëzuar mbi trotuar pas stuhisë.", "green_spaces", "green_spaces"),
    ("Lodra", "Rrëshqitësja në këndin e lojërave të fëmijëve është thyer.", "public_spaces", "green_spaces"),
    ("Stola", "Stolat në shesh janë thyer dhe kanë gozhdë të dala.", "public_spaces", "public_spaces"),
    ("Grafite", "Muret e nënkalimit janë mbushur me grafite dhe xhamat thyer.", "other", "public_spaces"),
    ("Tub", "Një tub i çarë nxjerr ujë në rrugë prej mëngjesit.", "water", "water"),
    ("Kanalizim", "Kanalizimi është bllokuar dhe ujërat e zeza dalin në rrugë.", "other", "water"),
    ("Sportel", "Prita 3 orë në sportelin e bashkisë për një certifikatë dhe s'më shërbyen.", "administration", "administration"),
]


async def main() -> None:
    print("Mode:", "MOCK ($0)" if ai_service.is_mock() else f"REAL ({ai_service.MODEL})\n")
    correct = 0
    for title, description, citizen, expected in RASTET:
        result = await ai_service.analyze_report(title, description, citizen)
        ok = result["category_code"] == expected
        correct += ok
        print(f"{'✅' if ok else '❌'} {title:10s} qytetari={citizen:15s} AI={result['category_code']:15s} "
              f"pritej={expected:15s} conf={result['confidence']}")
    print(f"\nSaktesia: {correct}/{len(RASTET)} ({100 * correct / len(RASTET):.0f}%)")


if __name__ == "__main__":
    asyncio.run(main())