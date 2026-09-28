from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import session_dependency
from ..intake import operational_report
from ..limits import rate_limit
from ..schemas import LoginRequest, UserCreate, UserUpdate
from ..security import (
    Principal,
    create_token,
    current_principal,
    hash_password,
    require_roles,
    verify_password,
)
from ..utils import audit, error, row_dict

router = APIRouter()


@router.post("/v1/auth/login")
async def login(
    payload: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(session_dependency),
):
    await rate_limit(request, "login", 10, 60)
    row = (
        await session.execute(
            text(
                """SELECT id,email,full_name,password_hash,role,department_id,active
                   FROM users WHERE lower(email)=:identifier OR username=:identifier"""
            ),
            {"identifier": payload.identifier},
        )
    ).first()
    if (
        row is None
        or not row.active
        or not verify_password(payload.password, row.password_hash)
    ):
        raise error(401, "invalid_credentials", "Email or password is incorrect")
    principal = Principal(
        str(row.id),
        row.email,
        row.full_name,
        row.role,
        str(row.department_id) if row.department_id else None,
    )
    return {
        "access_token": create_token(principal),
        "token_type": "Bearer",
        "expires_in": 3600 * 8,
        "user": principal.__dict__
        if hasattr(principal, "__dict__")
        else {
            "id": principal.subject,
            "email": principal.email,
            "full_name": principal.full_name,
            "role": principal.role,
            "department_id": principal.department_id,
        },
    }


@router.get("/v1/auth/me")
async def me(principal: Annotated[Principal, Depends(current_principal)]):
    return {
        "id": principal.subject,
        "email": principal.email,
        "full_name": principal.full_name,
        "role": principal.role,
        "department_id": principal.department_id,
    }


@router.get("/v1/departments")
async def departments(
    _: Annotated[Principal, Depends(current_principal)],
    session: AsyncSession = Depends(session_dependency),
):
    rows = (
        await session.execute(
            text(
                "SELECT id,code,name,active,created_at,updated_at FROM departments WHERE active=TRUE ORDER BY name"
            )
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.get("/v1/zones")
async def zones(
    _: Annotated[Principal, Depends(current_principal)],
    session: AsyncSession = Depends(session_dependency),
):
    rows = (
        await session.execute(
            text(
                "SELECT id,code,name,active,created_at FROM zones WHERE active=TRUE ORDER BY name"
            )
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.get("/v1/stats/overview")
async def overview_stats(
    principal: Annotated[Principal, Depends(current_principal)],
    session: AsyncSession = Depends(session_dependency),
):
    where, params = "TRUE", {}
    if principal.role == "department_authority":
        where, params = (
            "department_id=:department",
            {"department": principal.department_id},
        )
    elif principal.role == "operative_staff":
        where, params = "assigned_to=:user", {"user": principal.subject}
    row = (
        await session.execute(
            text(
                f"""SELECT count(*) AS total,
                count(*) FILTER (WHERE status='submitted') AS submitted,
                count(*) FILTER (WHERE status IN ('accepted','assigned')) AS pending,
                count(*) FILTER (WHERE status IN ('in_progress','blocked')) AS active,
                count(*) FILTER (WHERE status IN ('resolved','published')) AS resolved,
                count(*) FILTER (WHERE due_at<now() AND status NOT IN ('resolved','published','rejected')) AS overdue
                FROM reports WHERE {operational_report('')} AND {where}"""
            ),
            params,
        )
    ).first()
    return row_dict(row)


@router.get("/v1/users")
async def list_users(
    principal: Annotated[
        Principal,
        Depends(require_roles("admin", "municipal_authority", "department_authority")),
    ],
    session: AsyncSession = Depends(session_dependency),
    role: str = "",
    department_id: str = "",
    active: bool | None = None,
):
    conditions, params = ["TRUE"], {}
    if principal.role == "department_authority":
        conditions.append("u.department_id=:department")
        params["department"] = principal.department_id
    elif department_id:
        conditions.append("u.department_id=:department")
        params["department"] = department_id
    if role:
        conditions.append("u.role=:role")
        params["role"] = role
    if active is not None:
        conditions.append("u.active=:active")
        params["active"] = active
    rows = (
        await session.execute(
            text(
                """SELECT u.id,u.email,u.username,u.full_name,u.role,u.department_id,d.name AS department_name,u.active,u.created_at,u.updated_at
                   FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE """
                + " AND ".join(conditions)
                + " ORDER BY u.full_name"
            ),
            params,
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.post("/v1/users", status_code=201)
async def create_user(
    payload: UserCreate,
    principal: Annotated[Principal, Depends(require_roles("admin"))],
    session: AsyncSession = Depends(session_dependency),
):
    if (
        payload.role in {"department_authority", "operative_staff"}
        and not payload.department_id
    ):
        raise error(400, "department_required", "This role requires a department")
    try:
        async with session.begin():
            row = (
                await session.execute(
                    text(
                        """INSERT INTO users(email,username,full_name,password_hash,role,department_id)
                           VALUES(:email,:username,:name,:password,:role,NULLIF(:department,'')::uuid)
                           RETURNING id,email,username,full_name,role,department_id,active,created_at"""
                    ),
                    {
                        "email": payload.email.lower().strip(),
                        "username": payload.username,
                        "name": payload.full_name.strip(),
                        "password": hash_password(payload.password),
                        "role": payload.role,
                        "department": payload.department_id,
                    },
                )
            ).first()
            await audit(session, principal.subject, "user.create", "user", str(row.id))
    except Exception as exc:
        raise error(
            400, "invalid_user", "Email or username already exists, or department is invalid"
        ) from exc
    return row_dict(row)


@router.patch("/v1/users/{user_id}")
async def update_user(
    user_id: str,
    payload: UserUpdate,
    principal: Annotated[Principal, Depends(require_roles("admin"))],
    session: AsyncSession = Depends(session_dependency),
):
    values = payload.model_dump(exclude_unset=True)
    if user_id == principal.subject and values.get("active") is False:
        raise error(400, "self_deactivation", "You cannot deactivate your own account")
    assignments, params = [], {"id": user_id}
    mapping = {"username": "username", "full_name": "full_name", "role": "role", "active": "active"}
    for key, column in mapping.items():
        if key in values:
            assignments.append(f"{column}=:{key}")
            params[key] = values[key]
    if "department_id" in values:
        assignments.append("department_id=NULLIF(:department_id,'')::uuid")
        params["department_id"] = values["department_id"] or ""
    if values.get("password"):
        assignments.append("password_hash=:password_hash")
        params["password_hash"] = hash_password(values["password"])
    if not assignments:
        return {"id": user_id, "updated": False}
    async with session.begin():
        result = await session.execute(
            text(
                "UPDATE users SET "
                + ",".join(assignments)
                + ",updated_at=now() WHERE id=:id"
            ),
            params,
        )
        if result.rowcount != 1:
            raise error(404, "not_found", "User was not found")
        await audit(session, principal.subject, "user.update", "user", user_id)
    return {"id": user_id, "updated": True}


@router.get("/v1/audit-logs")
async def audit_logs(
    _: Annotated[Principal, Depends(require_roles("admin"))],
    session: AsyncSession = Depends(session_dependency),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    rows = (
        await session.execute(
            text(
                """SELECT a.id,a.actor_id,u.full_name AS actor_name,a.action,a.entity_type,a.entity_id,
                   a.ip_address,a.metadata,a.created_at FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id
                   ORDER BY a.created_at DESC LIMIT :limit OFFSET :offset"""
            ),
            {"limit": limit, "offset": offset},
        )
    ).all()
    return {"items": [row_dict(row) for row in rows], "limit": limit, "offset": offset}


@router.get("/v1/notifications")
async def notifications(
    principal: Annotated[Principal, Depends(current_principal)],
    session: AsyncSession = Depends(session_dependency),
):
    rows = (
        await session.execute(
            text(
                "SELECT id,channel,title,body,read_at,created_at FROM notifications WHERE user_id=:user ORDER BY created_at DESC LIMIT 100"
            ),
            {"user": principal.subject},
        )
    ).all()
    return {"items": [row_dict(row) for row in rows]}


@router.patch("/v1/notifications/{notification_id}/read")
async def read_notification(
    notification_id: str,
    principal: Annotated[Principal, Depends(current_principal)],
    session: AsyncSession = Depends(session_dependency),
):
    async with session.begin():
        result = await session.execute(
            text(
                "UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=:id AND user_id=:user"
            ),
            {"id": notification_id, "user": principal.subject},
        )
    if result.rowcount != 1:
        raise error(404, "not_found", "Notification was not found")
    return {"id": notification_id, "read": True}
