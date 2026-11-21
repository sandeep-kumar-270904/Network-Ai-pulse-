"""
NetPulse AI — Alerts & Events Log Page
======================================
Timeline of actual network, gateway, and system operational events.
"""

from typing import Any, Dict, List
import streamlit as st
from frontend.components.metric_cards import render_kpi_card, render_status_badge


def render_alerts_page(activity_log: List[Dict[str, Any]]) -> None:
    """Render the enterprise Alerts & Operational Events log."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> ALERTS &amp; EVENTS</div>'
        f'    <div class="noc-header-subtitle">LIVE INCIDENT FEED &amp; APPLICATION LIFECYCLE AUDIT TRAIL</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge(f"{len(activity_log)} Logged Events", "cyan")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>📋 Genuine Audit Trail:</strong> All entries below represent authentic application events, '
        '  backend state changes, and gateway health validations. No fabricated event history is shown.'
        '</div>',
        unsafe_allow_html=True,
    )

    # Filter Controls
    c1, c2, c3 = st.columns([2, 1, 1])
    with c1:
        search_kw = st.text_input("Filter Events", placeholder="Search messages, errors, or timestamps...")
    with c2:
        type_filter = st.selectbox(
            "Event Category",
            ["All Categories", "startup", "connection", "disconnection", "health_check", "warning", "general"],
        )
    with c3:
        st.write("")
        st.write("")
        if st.button("🗑️ Clear Event Log", use_container_width=True):
            st.session_state.activity_log = []
            st.rerun()

    # Apply filter
    filtered = activity_log
    if search_kw.strip():
        kw = search_kw.lower()
        filtered = [e for e in filtered if kw in e.get("message", "").lower() or kw in e.get("time", "").lower()]
    if type_filter != "All Categories":
        filtered = [e for e in filtered if e.get("type") == type_filter]

    # Render Table
    if filtered:
        rows = ""
        for ev in filtered:
            ev_type = ev.get("type", "general")
            badge_type = "success" if ev_type == "connection" else (
                "critical" if ev_type == "disconnection" else (
                    "warning" if ev_type == "warning" else "cyan"
                )
            )
            rows += (
                f'<tr>'
                f'  <td class="mono-val" style="color:#637C98; font-size:0.75rem;">{ev.get("time", "")}</td>'
                f'  <td><span class="status-pill pill-{badge_type}">{ev_type.upper()}</span></td>'
                f'  <td><span>{ev.get("icon", "•")}</span> <span style="color:#EAF3FF; font-size:0.85rem;">{ev.get("message", "")}</span></td>'
                f'</tr>'
            )

        st.markdown(
            f'<table class="noc-table">'
            f'  <thead><tr><th>Timestamp</th><th>Category</th><th>Event Message</th></tr></thead>'
            f'  <tbody>{rows}</tbody>'
            f'</table>',
            unsafe_allow_html=True,
        )
    else:
        st.caption("No events matching your filter criteria.")
