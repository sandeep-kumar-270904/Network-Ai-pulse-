"""
NetPulse AI — NOC Backend Status & Telemetry Panel
==================================================
Compact operational panel detailing API health, uptime, and connectivity.
"""

from typing import Any, Dict, Optional
import streamlit as st


def render_status_panel(
    backend_connected: bool,
    health_data: Optional[Dict[str, Any]],
    latency_ms: Optional[float],
    last_check_str: str,
) -> None:
    """Render the enterprise system status panel."""
    api_status_text = "OPERATIONAL (200 OK)" if backend_connected else "UNREACHABLE (OFFLINE)"
    api_color = "#00D69A" if backend_connected else "#FF475F"
    latency_text = f"{latency_ms} ms" if latency_ms is not None else "—"

    app_name = health_data.get("application", "NetPulse AI") if health_data else "NetPulse AI"
    uptime_since = health_data.get("uptime_since", "") if health_data else ""
    if "T" in uptime_since:
        uptime_display = uptime_since.split("T")[1][:8] + " UTC"
    else:
        uptime_display = "Live Process" if backend_connected else "Offline"

    db_status = health_data.get("services", {}).get("database", "in_memory") if health_data else "disconnected"
    db_display = "In-Memory Session" if db_status in ["not_configured", "in_memory"] else db_status.title()

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">API Health</span>'
            f'  <span style="color:{api_color};">●</span></div>'
            f'  <div class="noc-kpi-value" style="font-size:1.15rem; color:{api_color};">{api_status_text}</div>'
            f'  <div class="noc-kpi-sub">HTTP 127.0.0.1:8000/health</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
    with c2:
        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Round-Trip Latency</span><span>⚡</span></div>'
            f'  <div class="noc-kpi-value" style="color:#22D3EE;">{latency_text}</div>'
            f'  <div class="noc-kpi-sub">Local IPC Health Check</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
    with c3:
        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Backend Uptime</span><span>⏱️</span></div>'
            f'  <div class="noc-kpi-value" style="font-size:1.25rem; color:#168BFF;">{uptime_display}</div>'
            f'  <div class="noc-kpi-sub">{app_name}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
    with c4:
        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Data Store</span><span>💾</span></div>'
            f'  <div class="noc-kpi-value" style="font-size:1.2rem; color:#EAF3FF;">{db_display}</div>'
            f'  <div class="noc-kpi-sub">Last Check: {last_check_str}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
