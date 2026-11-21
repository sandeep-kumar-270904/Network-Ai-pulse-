"""
NetPulse AI — Test History Page
===============================
Audit records and execution metrics for all diagnostic and throughput tests.
"""

from typing import Any, Dict, List
import streamlit as st
from frontend.components.metric_cards import render_kpi_card, render_status_badge


def render_history_page(test_history: List[Dict[str, Any]]) -> None:
    """Render the historical test execution archive."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> TEST EXECUTION HISTORY</div>'
        f'    <div class="noc-header-subtitle">HISTORICAL DIAGNOSTIC BENCHMARKS &amp; TELEMETRY LOGS</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge(f"{len(test_history)} Recorded Tests", "blue")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    if test_history:
        rows = ""
        for t in test_history:
            rows += (
                f'<tr>'
                f'  <td class="mono-val" style="color:#22D3EE;">{t.get("id", "N/A")}</td>'
                f'  <td><b>{t.get("target", "N/A")}</b></td>'
                f'  <td><span style="color:#91A7C0;">{t.get("type", "Diagnostic")}</span></td>'
                f'  <td class="mono-val">{t.get("start_time", "N/A")}</td>'
                f'  <td class="mono-val">{t.get("duration", "N/A")}</td>'
                f'  <td><span class="status-pill pill-success">{t.get("result", "COMPLETED")}</span></td>'
                f'</tr>'
            )

        st.markdown(
            f'<table class="noc-table">'
            f'  <thead><tr><th>Test ID</th><th>Target</th><th>Test Type</th><th>Start Time</th><th>Duration</th><th>Result</th></tr></thead>'
            f'  <tbody>{rows}</tbody>'
            f'</table>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            f'<div class="noc-kpi-card" style="text-align:center; padding:3rem 1.5rem;">'
            f'  <div style="font-size:2.5rem; margin-bottom:0.75rem;">📜</div>'
            f'  <div style="font-size:1.2rem; font-weight:700; color:#EAF3FF; margin-bottom:0.35rem;">No Test Records Found</div>'
            f'  <div style="font-size:0.85rem; color:#91A7C0; max-width:480px; margin:0 auto;">'
            f'    Diagnostic test records will be archived here once test suites are executed in Day 2. '
            f'    Persistence engine (SQLite) is scheduled for the Day 4 milestone.'
            f'  </div>'
            f'</div>',
            unsafe_allow_html=True,
        )
