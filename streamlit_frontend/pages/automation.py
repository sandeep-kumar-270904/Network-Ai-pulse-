"""
NetPulse AI — Test Automation & Scheduling Page
===============================================
Automated diagnostic schedules, cron recurrence, and SLA assertions.
"""

import streamlit as st
from streamlit_frontend.components.metric_cards import render_kpi_card, render_status_badge


def render_automation_page() -> None:
    """Render the Test Automation management interface."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> TEST AUTOMATION</div>'
        f'    <div class="noc-header-subtitle">CRON-BASED RECURRENCE &amp; AUTOMATED SLA MONITORING</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge("🔵 Planned Day 5 Milestone", "blue")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>🤖 Automation Engine:</strong> Allows network engineers to schedule autonomous tests, '
        '  configure cron expressions, and establish regression benchmarks. '
        '  Scheduled tests trigger automated alerts if latency or loss crosses defined thresholds.'
        '</div>',
        unsafe_allow_html=True,
    )

    # Active Automation Schedules Table
    st.markdown(
        '<div class="noc-panel-header">'
        '  <div class="noc-panel-title"><span>⏰</span> Configured Test Schedules</div>'
        '  <div><span class="status-pill pill-cyan">3 Configured Profiles</span></div>'
        '</div>',
        unsafe_allow_html=True,
    )

    schedules = [
        {"name": "Core DNS Health Probe", "target": "1.1.1.1", "interval": "Every 5 mins", "tool": "DNS Lookup", "status": "ACTIVE", "last_run": "2 mins ago"},
        {"name": "Gateway Ping Baseline", "target": "10.0.0.1", "interval": "Every 15 mins", "tool": "ICMP Ping", "status": "ACTIVE", "last_run": "8 mins ago"},
        {"name": "Nightly Throughput Saturation", "target": "10.0.2.50", "interval": "Daily @ 02:00", "tool": "TCP Saturation", "status": "STANDBY", "last_run": "Yesterday"},
    ]

    sched_rows = ""
    for s in schedules:
        badge = "pill-success" if s["status"] == "ACTIVE" else "pill-warning"
        sched_rows += (
            f'<tr>'
            f'  <td><b>{s["name"]}</b></td>'
            f'  <td class="mono-val" style="color:#22D3EE;">{s["target"]}</td>'
            f'  <td><span style="color:#91A7C0;">{s["tool"]}</span></td>'
            f'  <td class="mono-val" style="color:#EAF3FF;">{s["interval"]}</td>'
            f'  <td><span class="status-pill {badge}">{s["status"]}</span></td>'
            f'  <td class="mono-val" style="color:#637C98; font-size:0.75rem;">{s["last_run"]}</td>'
            f'</tr>'
        )

    st.markdown(
        f'<table class="noc-table">'
        f'  <thead><tr><th>Schedule Name</th><th>Target</th><th>Test Type</th><th>Cadence</th><th>Status</th><th>Last Run</th></tr></thead>'
        f'  <tbody>{sched_rows}</tbody>'
        f'</table>',
        unsafe_allow_html=True,
    )

    st.markdown("<div style='margin-top:1.5rem;'></div>", unsafe_allow_html=True)
    with st.expander("➕ Define New Test Automation Schedule", expanded=False):
        with st.form("new_schedule_form"):
            s_name = st.text_input("Schedule Name", placeholder="e.g. Hourly Gateway Latency Check")
            s_target = st.text_input("Target IP/Host", value="10.0.0.1")
            s_cron = st.selectbox("Frequency", ["Every 5 Minutes", "Every 15 Minutes", "Hourly", "Daily @ Midnight"])
            s_submit = st.form_submit_button("Save Automation Schedule")
            if s_submit:
                st.info(f"Schedule '{s_name}' staged. Background cron daemon will be enabled in Day 5.", icon="ℹ️")
