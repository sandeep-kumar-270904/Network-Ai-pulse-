"""
NetPulse AI — Reusable KPI & Metric Card Components
===================================================
Compact enterprise telemetry cards styled for dark NOC environments.
"""

from typing import Optional


def render_kpi_card(
    title: str,
    value: str,
    icon: str = "📊",
    color: str = "#22D3EE",
    sub: str = "",
    trend: Optional[str] = None,
) -> str:
    """Return HTML for an enterprise NOC KPI card."""
    trend_html = ""
    if trend:
        trend_html = f'<span style="color:{color}; font-weight:700;">{trend}</span> '

    sub_content = f"{trend_html}{sub}" if (trend or sub) else ""
    sub_html = f'<div class="noc-kpi-sub">{sub_content}</div>' if sub_content else ""

    return (
        f'<div class="noc-kpi-card">'
        f'  <div class="noc-kpi-top">'
        f'    <span class="noc-kpi-label">{title}</span>'
        f'    <span class="noc-kpi-icon" style="color:{color};">{icon}</span>'
        f'  </div>'
        f'  <div class="noc-kpi-value" style="color:{color};">{value}</div>'
        f'  {sub_html}'
        f'</div>'
    )


def render_status_badge(text: str, badge_type: str = "cyan") -> str:
    """Return HTML for a status pill badge."""
    pill_classes = {
        "success": "pill-success",
        "warning": "pill-warning",
        "critical": "pill-critical",
        "cyan": "pill-cyan",
        "blue": "pill-blue",
        "neutral": "pill-neutral",
    }
    css_class = pill_classes.get(badge_type, "pill-neutral")
    return f'<span class="status-pill {css_class}">{text}</span>'
