"""
NetPulse AI — Report Generation Page
====================================
Exportable technical performance reports, executive summaries, and compliance audits.
"""

import streamlit as st
from frontend.components.metric_cards import render_kpi_card, render_status_badge


def render_reports_page() -> None:
    """Render the Report Generation interface."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> REPORT GENERATION</div>'
        f'    <div class="noc-header-subtitle">EXECUTIVE SUMMARIES, SLA AUDITS &amp; DIAGNOSTIC ARCHIVES</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge("🔵 Planned Day 7 Milestone", "blue")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>📄 Technical Documentation Engine:</strong> Automated PDF, HTML, and CSV export capabilities '
        '  designed for network operations handoffs, executive briefings, and telecom SLA verification audits.'
        '</div>',
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns([3, 2])
    with c1:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>📝</span> Configure New Report</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        with st.form("report_form"):
            report_type = st.selectbox(
                "Report Type",
                [
                    "Executive Performance Summary (NOC Brief)",
                    "SLA Compliance & Outage Audit",
                    "Detailed Packet Latency & Jitter Breakdown",
                    "Complete Diagnostic Run Log",
                ],
            )
            report_format = st.selectbox("Export Format", ["PDF Document (.pdf)", "HTML Standalone (.html)", "CSV Dataset (.csv)"])
            timeframe = st.selectbox("Audit Period", ["Past 24 Hours", "Past 7 Days", "Past 30 Days", "Custom Range"])
            include_graphs = st.checkbox("Embed High-Resolution Plotly Charts", value=True)

            generate_btn = st.form_submit_button("📄 Generate Report Package", use_container_width=True)
            if generate_btn:
                st.info(
                    f"Report profile configured: **{report_type}** in **{report_format}** for period **{timeframe}**. "
                    "PDF generation worker is in development for Day 7. Parameters archived.",
                    icon="ℹ️",
                )

    with c2:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>📂</span> Report Catalog</div>'
            '</div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Available Templates</span><span>📑</span></div>'
            f'  <div class="noc-kpi-value" style="font-size:1.2rem; color:#22D3EE;">4 Templates</div>'
            f'  <div class="noc-kpi-sub">Executive &amp; Technical Formats</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
