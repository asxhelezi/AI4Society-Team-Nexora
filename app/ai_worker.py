"""AI pipeline ne background, thirret nga worker.py cdo 3 sekonda.

Merr 1 raport te ri (ai_analysis IS NULL) dhe:
  1+2+5  analize (kategori, departament, ashpersi, spam)
  3      embedding + kerkim duplikatash afer (~300 m, 30 ditet e fundit)
  4      permbledhje e RASTIT: ruhet te raporti origjinal dhe perditesohet me cdo duplikat te ri
         (permbledhja e vjeter + raporti i ri, pa i rilexuar te gjitha raportet).
         Vektori i rastit = vektori i permbledhjes, keshtu raporti i ardhshem krahasohet me permbledhjen.
  6      alarm kur i njejti problem eshte zgjidhur me pare ne te njejtin vend
  +      kontrolli i fotove AI (photo_check.py) kopjohet te ai_analysis: photo_checks + photo_ai_flag

VEPRIME AUTOMATIKE sipas confidence (te gjitha regjistrohen ne audit_logs):
  - Duplikat shume i qarte (ngjashmeri >= AI_AUTO_DUPLICATE_SIMILARITY dhe <= 50 m)
      -> lidh raportin me origjinalin (duplicate_of), e mbyll me shenim per qytetarin,
         dhe perditeson numrin e raporteve + permbledhjen te origjinali
  - Analize shume e sigurt (confidence >= AI_AUTO_ACCEPT_CONFIDENCE) DHE AI pajtohet
    me kategorine e qytetarit -> prano raportin, dergoje te departamenti, vendos prioritetin
  - Qytetari zgjodhi "Tjeter" dhe AI e njeh kategorine (confidence >= AI_RECLASSIFY_CONFIDENCE)
      -> raporti ri-kategorizohet nga AI; pastaj vlejne rregullat e mesiperme (p.sh. pranim >= 90)
  - Cdo gje tjeter -> sugjerim per stafin (njeriu vendos)
  - Spam shume i sigurt (confidence >= AI_AUTO_REJECT_SPAM_CONFIDENCE)
      -> refuzohet; qytetari mund ta apeloje NJE HERE (routers/appeals.py) -> stafi vendos
"""

from __future__ import annotations

import json
import logging
import math
import os

from sqlalchemy import text

from . import ai_service
from .db import SessionLocal
from .utils import audit

log = logging.getLogger("sinjal-ai")

# ~300 m ne Tirane (1 grade gjeresi ~ 111 km; 1 grade gjatesi ~ 85 km)
NEAR_LAT, NEAR_LNG = 0.003, 0.004

AUTO_ACTIONS = os.getenv("AI_AUTO_ACTIONS", "1") == "1"  # celesi kryesor: 0 = asnje veprim automatik
AUTO_ACCEPT_CONFIDENCE = int(os.getenv("AI_AUTO_ACCEPT_CONFIDENCE", "90"))
SUGGEST_CONFIDENCE = int(os.getenv("AI_SUGGEST_CONFIDENCE", "60"))
AUTO_DUPLICATE_SIMILARITY = float(os.getenv("AI_AUTO_DUPLICATE_SIMILARITY", "0.70"))
AUTO_DUPLICATE_METERS = float(os.getenv("AI_AUTO_DUPLICATE_METERS", "50"))
AUTO_REJECT_SPAM_CONFIDENCE = int(os.getenv("AI_AUTO_REJECT_SPAM_CONFIDENCE", "95"))
RECLASSIFY_CONFIDENCE = int(os.getenv("AI_RECLASSIFY_CONFIDENCE", "70"))

# Routing i konfigurueshem: kategoria -> departamenti. AI-ja zgjedh KATEGORINE; departamenti
# vendoset nga kjo tabele (deterministik). Ndryshohet pa kod me AI_ROUTING ne .env, p.sh.
#   AI_ROUTING={"traffic": "trafik", "green_spaces": "gjelberim"}
# Per kategorite pa rresht ketu (p.sh. "other") perdoret departamenti i sugjeruar nga AI-ja.
DEFAULT_ROUTING = {
    "infrastructure": "infra", "traffic": "infra",
    "waste": "mjedis", "green_spaces": "mjedis",
    "lighting": "ndricim", "water": "uje",
    "public_spaces": "sherbime", "administration": "sherbime",
}


def routing_table() -> dict[str, str]:
    table = dict(DEFAULT_ROUTING)
    raw = os.getenv("AI_ROUTING", "").strip()
    if raw:
        try:
            table.update({str(k): str(v) for k, v in json.loads(raw).items()})
        except (ValueError, AttributeError):
            log.warning("AI_ROUTING is not valid JSON; using default routing")
    return table


def route_department(category: str, ai_department: str) -> str:
    return routing_table().get(category, ai_department)

REJECT_NOTE = ("Raporti u refuzua automatikisht sepse nuk duket si raport i vlefshëm. "
               "Nëse mendoni se është gabim, mund ta apeloni një herë nga faqja e gjurmimit "
               "dhe do ta shqyrtojë stafi i bashkisë.")


# ---------- Vendimi (funksion i paster, testohet pa databaze) ----------

def decide(analysis: dict, citizen_category: str, duplicate: dict | None) -> dict:
    """Kthen {"action": "duplicate_linked" | "accepted" | None, "review_level": ..., "reason": ...}."""
    if analysis.get("is_spam"):
        confidence = int(analysis.get("confidence", 0))
        if AUTO_ACTIONS and confidence >= AUTO_REJECT_SPAM_CONFIDENCE:
            return {"action": "rejected", "review_level": "auto",
                    "reason": f"Refuzuar automatikisht si spam (confidence {confidence}%). Qytetari mund ta apelojë."}
        return {"action": None, "review_level": "manual",
                "reason": "Dyshim per spam: e shqyrton stafi."}
    if (AUTO_ACTIONS and duplicate
            and duplicate["similarity"] >= AUTO_DUPLICATE_SIMILARITY
            and duplicate["meters"] <= AUTO_DUPLICATE_METERS):
        return {"action": "duplicate_linked", "review_level": "auto",
                "reason": f"Duplikat i qarte i {duplicate['tracking_code']} "
                          f"(ngjashmeri {duplicate['similarity']:.2f}, {duplicate['meters']:.0f} m)."}
    confidence = int(analysis.get("confidence", 0))
    agrees = analysis.get("category_code") == citizen_category and citizen_category != "other"
    # (pas ri-kategorizimit, citizen_category eshte kategoria e re e vendosur nga AI)
    if AUTO_ACTIONS and confidence >= AUTO_ACCEPT_CONFIDENCE and agrees:
        return {"action": "accepted", "review_level": "auto",
                "reason": f"Pranuar automatikisht: confidence {confidence}% dhe AI pajtohet me qytetarin."}
    if confidence >= SUGGEST_CONFIDENCE:
        return {"action": None, "review_level": "suggest",
                "reason": "AI e sigurt mesatarisht: stafi konfirmon sugjerimin."}
    return {"action": None, "review_level": "manual",
            "reason": "AI e pasigurt: stafi e shqyrton nga e para."}


def should_reclassify(citizen_category: str, analysis: dict) -> bool:
    """Kur qytetari zgjodhi "Tjeter", AI-ja vendos kategorine e vertete nese eshte mjaft e sigurt."""
    return (AUTO_ACTIONS and citizen_category == "other"
            and not analysis.get("is_spam")
            and analysis.get("category_code") not in (None, "other")
            and int(analysis.get("confidence", 0)) >= RECLASSIFY_CONFIDENCE)


def meters_between(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


# ---------- Pipeline ----------

async def process_ai_analysis() -> None:
    await merge_photo_checks()
    if not ai_service.is_enabled():
        return
    async with SessionLocal.begin() as session:
        row = (
            await session.execute(
                text(
                    """SELECT id,tracking_code,title,description,category,category_code,subcategory,
                    latitude,longitude,status FROM reports WHERE ai_analysis IS NULL
                    AND screened_out=FALSE AND intake_ready_at<=now()
                    ORDER BY submitted_at FOR UPDATE SKIP LOCKED LIMIT 1"""
                )
            )
        ).first()
        if row is None:
            return
        try:
            analysis, duplicate, category = await _analyze(session, row)
            decision = decide(analysis, category, duplicate)
            analysis["decision"] = decision
            if row.status == "submitted" and decision["action"]:
                await _apply(session, row, analysis, decision, duplicate)
        except Exception as exc:  # noqa: BLE001
            # E shenojme si te deshtuar qe te MOS provohet pafundesisht (mbron buxhetin).
            log.warning("AI analysis failed report=%s error=%s", row.id, type(exc).__name__)
            analysis = {"error": "ai_failed", "rationale": "Analiza AI deshtoi.",
                        "decision": {"action": None, "review_level": "manual",
                                     "reason": "Analiza deshtoi: e shqyrton stafi."}}
        await session.execute(
            text("UPDATE reports SET ai_analysis=CAST(:a AS jsonb),updated_at=now() WHERE id=:id"),
            {"id": row.id, "a": json.dumps(analysis, ensure_ascii=False)},
        )
        log.info("AI analysis saved report=%s action=%s", row.id,
                 analysis.get("decision", {}).get("action"))


async def merge_photo_checks() -> None:
    """Kopjon rezultatin e kontrollit te fotove (report_files) te ai_analysis i raportit, qe ta shohe stafi.

    Behet ketu dhe jo gjate ngarkimit, sepse fotot shpesh ngarkohen pasi raporti eshte analizuar.
    """
    async with SessionLocal.begin() as session:
        rows = (
            await session.execute(
                text(
                    """SELECT f.id,f.report_id,f.ai_photo_check FROM report_files f
                    JOIN reports r ON r.id=f.report_id
                    WHERE f.ai_photo_check IS NOT NULL AND NOT (f.ai_photo_check ? 'merged')
                    AND r.ai_analysis IS NOT NULL
                    ORDER BY f.created_at LIMIT 20 FOR UPDATE OF f SKIP LOCKED"""
                )
            )
        ).all()
        for file_row in rows:
            check = file_row.ai_photo_check if isinstance(file_row.ai_photo_check, dict) \
                else json.loads(file_row.ai_photo_check)
            entry = json.dumps({"file_id": str(file_row.id), **check}, ensure_ascii=False)
            await session.execute(
                text(
                    """UPDATE reports SET ai_analysis = ai_analysis
                        || jsonb_build_object('photo_checks',
                               COALESCE(ai_analysis->'photo_checks','[]'::jsonb) || jsonb_build_array(CAST(:entry AS jsonb)))
                        || CASE WHEN :is_ai THEN '{"photo_ai_flag": true}'::jsonb ELSE '{}'::jsonb END,
                    updated_at=now() WHERE id=:report"""
                ),
                {"entry": entry, "is_ai": check.get("verdict") == "ai_label", "report": file_row.report_id},
            )
            await session.execute(
                text("""UPDATE report_files SET ai_photo_check = ai_photo_check || '{"merged": true}'::jsonb
                        WHERE id=:id"""),
                {"id": file_row.id},
            )


async def _apply(session, row, analysis: dict, decision: dict, duplicate: dict | None) -> None:
    note = f"[AI] {decision['reason']}"
    if decision["action"] == "duplicate_linked":
        await _merge_into_case(session, row, duplicate, note)
        return

    if decision["action"] == "rejected":
        await session.execute(
            text(
                """UPDATE reports SET status='rejected',resolution_note=:note,
                first_action_at=COALESCE(first_action_at,now()),updated_at=now() WHERE id=:id"""
            ),
            {"id": row.id, "note": REJECT_NOTE},
        )
        await session.execute(
            text(
                """INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by)
                VALUES(:id,'submitted','rejected',:note,NULL)"""
            ),
            {"id": row.id, "note": note},
        )
        await audit(session, "", "report.ai_auto_reject", "report", str(row.id),
                    metadata={"confidence": analysis["confidence"]})
        return

    # "accepted": e njejta gje qe ben stafi kur klikon "Prano" (routers/reports.py review_report)
    department_code = route_department(analysis["category_code"], analysis["department_code"])
    analysis["routed_department"] = department_code
    department_id = await session.scalar(
        text("SELECT id FROM departments WHERE code=:code"), {"code": department_code}
    )
    if department_id is None:
        analysis["decision"] = {"action": None, "review_level": "suggest",
                                "reason": "Departamenti i sugjeruar nuk u gjet: stafi konfirmon."}
        return
    priority = analysis["suggested_priority"]
    await session.execute(
        text(
            """UPDATE reports SET status='accepted',priority=:priority,department_id=:department,
            accepted_at=now(),first_action_at=COALESCE(first_action_at,now()),
            due_at=submitted_at + CASE :priority
                WHEN 'urgent' THEN interval '24 hours' WHEN 'high' THEN interval '72 hours'
                WHEN 'normal' THEN interval '120 hours' ELSE interval '168 hours' END,
            updated_at=now() WHERE id=:id"""
        ),
        {"id": row.id, "priority": priority, "department": department_id},
    )
    await session.execute(
        text(
            """INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by)
            VALUES(:id,'submitted','accepted',:note,NULL)"""
        ),
        {"id": row.id, "note": note},
    )
    await audit(session, "", "report.ai_auto_review", "report", str(row.id),
                metadata={"decision": "accepted", "confidence": analysis["confidence"],
                          "department": department_code, "priority": priority})


async def _merge_into_case(session, row, duplicate: dict, note: str) -> None:
    """Raporti i ri behet pjese e rastit origjinal: rasti merr permbledhjen, i riu mbyllet."""
    case = (
        await session.execute(
            text("SELECT id,tracking_code,description,ai_analysis FROM reports "
                 "WHERE id=CAST(:id AS uuid) FOR UPDATE"),
            {"id": duplicate["id"]},
        )
    ).first()
    case_ai = case.ai_analysis if isinstance(case.ai_analysis, dict) else json.loads(case.ai_analysis or "{}")
    count = int(case_ai.get("case_report_count", 1)) + 1
    previous = case_ai.get("case_summary") or case.description
    case_ai["case_report_count"] = count
    case_ai["case_summary"] = await ai_service.update_case_summary(previous, row.description, count)
    case_ai["case_duplicates"] = (case_ai.get("case_duplicates") or []) + [row.tracking_code]
    # Vektori i rastit behet vektori i PERMBLEDHJES: raportet e reja krahasohen me permbledhjen
    # e te gjitha raporteve te rastit, jo me raportin e pare.
    case_vector = await ai_service.embed(case_ai["case_summary"])
    await session.execute(
        text("UPDATE reports SET ai_analysis=CAST(:a AS jsonb),embedding=CAST(:v AS jsonb),"
             "updated_at=now() WHERE id=:id"),
        {"id": case.id, "a": json.dumps(case_ai, ensure_ascii=False), "v": json.dumps(case_vector)},
    )
    citizen_note = (f"Ky problem është raportuar tashmë si {case.tracking_code} dhe po trajtohet atje. "
                    f"Mund të ndiqni statusin me kodin {case.tracking_code}.")
    await session.execute(
        text(
            """UPDATE reports SET duplicate_of=:case,status='rejected',resolution_note=:note,
            first_action_at=COALESCE(first_action_at,now()),updated_at=now() WHERE id=:id"""
        ),
        {"id": row.id, "case": case.id, "note": citizen_note},
    )
    await session.execute(
        text(
            """INSERT INTO report_status_history(report_id,old_status,new_status,note,changed_by)
            VALUES(:id,'submitted','rejected',:note,NULL)"""
        ),
        {"id": row.id, "note": note},
    )
    await audit(session, "", "report.ai_duplicate_merge", "report", str(row.id),
                metadata={"duplicate_of": str(case.id), "case_report_count": count,
                          "similarity": duplicate["similarity"], "meters": round(duplicate["meters"])})


async def _analyze(session, row) -> tuple[dict, dict | None]:
    hint = f"{row.category} — {row.subcategory}" if row.subcategory else row.category
    analysis = await ai_service.analyze_report(row.title, row.description, hint)
    category = row.category_code
    if analysis["is_spam"]:
        return analysis, None, category  # s'ka kuptim te kerkojme duplikata per spam
    if row.status == "submitted" and should_reclassify(category, analysis):
        category = await _reclassify(session, row, analysis)

    vector = await ai_service.embed(f"{row.title}. {row.description}")
    await session.execute(
        text("UPDATE reports SET embedding=CAST(:v AS jsonb) WHERE id=:id"),
        {"id": row.id, "v": json.dumps(vector)},
    )
    near = {"id": row.id, "lat": row.latitude, "lng": row.longitude,
            "dlat": NEAR_LAT, "dlng": NEAR_LNG, "cat": category}

    # ---- 3 + 4: Duplikata (raporte te hapura afer, 30 ditet e fundit) ----
    open_rows = (
        await session.execute(
            text(
                """SELECT id,tracking_code,description,embedding,latitude,longitude FROM reports
                WHERE id<>:id AND embedding IS NOT NULL AND category_code=:cat
                AND duplicate_of IS NULL
                AND screened_out=FALSE AND intake_ready_at<=now()
                AND status NOT IN ('resolved','published','rejected')
                AND submitted_at > now() - interval '30 days'
                AND abs(latitude-:lat)<:dlat AND abs(longitude-:lng)<:dlng
                ORDER BY submitted_at DESC LIMIT 50"""
            ),
            near,
        )
    ).all()
    matches = _similar(vector, open_rows)
    duplicate = None
    if matches:
        score, best = matches[0]
        duplicate = {
            "id": str(best.id), "tracking_code": best.tracking_code,
            "similarity": round(score, 3),
            "meters": meters_between(row.latitude, row.longitude, best.latitude, best.longitude),
        }
        analysis["possible_duplicate_of"] = {k: duplicate[k] for k in ("id", "tracking_code", "similarity")}
        analysis["possible_duplicate_of"]["meters"] = round(duplicate["meters"])

    # ---- 6: Problem i perseritur (i zgjidhur me pare, 6 muajt e fundit) ----
    resolved_rows = (
        await session.execute(
            text(
                """SELECT id,tracking_code,description,embedding FROM reports
                WHERE id<>:id AND embedding IS NOT NULL AND category_code=:cat
                AND status IN ('resolved','published')
                AND screened_out=FALSE
                AND resolved_at > now() - interval '180 days'
                AND abs(latitude-:lat)<:dlat AND abs(longitude-:lng)<:dlng
                ORDER BY resolved_at DESC LIMIT 20"""
            ),
            near,
        )
    ).all()
    history = _similar(vector, resolved_rows)
    if history:
        analysis["recurring_count"] = len(history)
        analysis["recurring_alert"] = await ai_service.recurring_alert(
            row.description, [h[1].description for h in history]
        )
    return analysis, duplicate, category


async def _reclassify(session, row, analysis: dict) -> str:
    """Qytetari zgjodhi "Tjeter": AI-ja vendos kategorine. Teksti i qytetarit ruhet te ai_analysis."""
    from .citizen_catalog import BY_CODE

    new_code = analysis["category_code"]
    await session.execute(
        text("UPDATE reports SET category_code=:code,category=:label,subcategory=NULL,updated_at=now() WHERE id=:id"),
        {"id": row.id, "code": new_code, "label": BY_CODE[new_code].label},
    )
    analysis["reclassified_from"] = {"category_code": row.category_code, "subcategory": row.subcategory}
    await audit(session, "", "report.ai_reclassify", "report", str(row.id),
                metadata={"from": row.category_code, "to": new_code, "confidence": analysis["confidence"]})
    return new_code


def _similar(vector: list[float], rows) -> list[tuple[float, object]]:
    scored = []
    for other in rows:
        other_vector = other.embedding if isinstance(other.embedding, list) else json.loads(other.embedding)
        if len(other_vector) != len(vector):  # p.sh. vektor mock vs real
            continue
        score = ai_service.cosine(vector, other_vector)
        if score >= ai_service.DUPLICATE_THRESHOLD:
            scored.append((score, other))
    return sorted(scored, key=lambda item: item[0], reverse=True)
