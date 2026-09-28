"""Visibility rule for reports awaiting citizen photos or screened by the 4K policy."""


def operational_report(alias: str = "r") -> str:
    prefix = f"{alias}." if alias else ""
    return f"{prefix}screened_out=FALSE AND {prefix}intake_ready_at<=now()"
