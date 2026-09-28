from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CitizenCategory:
    code: str
    label: str
    subcategories: tuple[str, ...]


CATEGORIES = (
    CitizenCategory(
        "infrastructure",
        "Infrastrukturë",
        (
            "Gropë në rrugë",
            "Trotuar i dëmtuar",
            "Pusetë e dëmtuar",
            "Asfalt i dëmtuar",
            "Tjetër",
        ),
    ),
    CitizenCategory(
        "waste",
        "Mbetje",
        (
            "Mbetje të grumbulluara",
            "Kosh i tejmbushur",
            "Mungesë koshash",
            "Hedhje e paligjshme mbetjesh",
            "Tjetër",
        ),
    ),
    CitizenCategory(
        "lighting",
        "Ndriçim",
        (
            "Ndriçim jo funksional",
            "Shtyllë e dëmtuar",
            "Errësirë e zgjatur",
            "Ndriçim me ndërprerje",
            "Tjetër",
        ),
    ),
    CitizenCategory(
        "traffic",
        "Trafik & Sinjalistikë",
        (
            "Semafor jo funksional",
            "Sinjalistikë e dëmtuar ose e munguar",
            "Vija të fshira kalimi këmbësorësh",
            "Parkim i parregullt",
            "Tjetër",
        ),
    ),
    CitizenCategory(
        "green_spaces",
        "Hapësira të gjelbra",
        (
            "Bimësi e neglizhuar",
            "Pemë e rrëzuar ose e rrezikshme",
            "Pajisje lojrash e dëmtuar",
            "Mungesë ujitjeje",
            "Tjetër",
        ),
    ),
    CitizenCategory(
        "public_spaces",
        "Hapësira publike",
        (
            "Mobilje urbane e dëmtuar",
            "Vandalizëm",
            "Aksesueshmëri e kufizuar",
            "Mungesë mirëmbajtjeje",
            "Tjetër",
        ),
    ),
    CitizenCategory(
        "water",
        "Ujë & Kanalizime",
        (
            "Rrjedhje uji",
            "Kanalizim i bllokuar",
            "Ndërprerje e furnizimit me ujë",
            "Vërshim ose pellgëzim uji",
            "Tjetër",
        ),
    ),
    CitizenCategory(
        "administration",
        "Administratë",
        (
            "Vonesë në shërbim",
            "Informacion i pasaktë",
            "Sjellje jo profesionale",
            "Problem me dokumentacion",
            "Tjetër",
        ),
    ),
    # "Other" has no fixed subcategories: the citizen describes the problem in free text.
    CitizenCategory("other", "Tjetër", ()),
)

OTHER_CODE = "other"

BY_CODE = {item.code: item for item in CATEGORIES}
BY_LABEL = {item.label.casefold(): item for item in CATEGORIES}

STATUS_LABELS = {
    "submitted": "Dërguar",
    "under_review": "Në shqyrtim",
    "accepted": "Pranuar",
    "rejected": "Refuzuar",
    "assigned": "Caktuar",
    "in_progress": "Në punë",
    "blocked": "Bllokuar",
    "resolved": "Zgjidhur",
    "published": "Publikuar",
}


def resolve_category(
    category: str, category_code: str = "", subcategory: str = ""
) -> tuple[str, str, str]:
    raw = category.strip()
    embedded_subcategory = ""
    for delimiter in (" — ", " - "):
        if delimiter in raw:
            raw, embedded_subcategory = (
                part.strip() for part in raw.split(delimiter, 1)
            )
            break
    selected = (
        BY_CODE.get(category_code.strip().lower())
        or BY_CODE.get(raw.lower())
        or BY_LABEL.get(raw.casefold())
    )
    if selected is None:
        raise ValueError("Unsupported report category")
    chosen_subcategory = (subcategory or embedded_subcategory).strip()
    if selected.code == OTHER_CODE:
        if not chosen_subcategory:
            raise ValueError("Describe the problem for the 'other' category")
    elif chosen_subcategory and chosen_subcategory not in selected.subcategories:
        raise ValueError("Unsupported report subcategory")
    return selected.code, selected.label, chosen_subcategory


def public_catalog() -> list[dict]:
    return [
        {
            "code": item.code,
            "label": item.label,
            "subcategories": list(item.subcategories),
        }
        for item in CATEGORIES
    ]
