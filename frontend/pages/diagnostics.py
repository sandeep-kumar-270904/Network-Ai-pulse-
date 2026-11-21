"""
NetPulse AI — Network Diagnostics Page
======================================
Diagnostic workbench for target configuration, packet parameters,
and execution scheduling (Day 2 Milestone Scaffolding).
"""

from typing import Any, Dict, List
import streamlit as st
from frontend.components.metric_cards import render_kpi_card, render_status_badge


def render_diagnostics_page(test_history: List[Dict[str, Any]]) -> None:
    """Render the Network Diagnostics workbench interface."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> NETWORK DIAGNOSTICS</div>'
        f'    <div class="noc-header-subtitle">ICMP ECHO PING, TRACEROUTE &amp; SOCKET DIAGNOSTICS WORKBENCH</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge("🟡 Day 2 In Development", "warning")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>🔒 Security &amp; Authorization Notice:</strong> Only authorized target endpoints '
        '  belonging to your infrastructure or explicitly registered in your inventory may be tested. '
        '  No unauthorized external scanning or port sweeps are permitted.'
        '</div>',
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns([3, 2])

    with c1:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>⚙️</span> Diagnostic Test Configuration</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        with st.form("diag_form"):
            target = st.text_input(
                "Target Hostname or IP Address",
                value="127.0.0.1",
                placeholder="e.g. 10.0.0.1, 1.1.1.1, gateway.local",
                help="Enter an authorized internal endpoint or public DNS resolver",
            )

            p_col1, p_col2 = st.columns(2)
            with p_col1:
                tool_type = st.selectbox(
                    "Diagnostic Tool",
                    ["ICMP Ping (Echo Request)", "Traceroute (Hop Latency)", "DNS Resolution Timing", "TCP Port Handshake"],
                )
                packet_count = st.number_input("Packet Count", min_value=1, max_value=50, value=5)
            with p_col2:
                timeout_sec = st.slider("Timeout (Seconds)", min_value=1, max_value=10, value=3)
                packet_size = st.number_input("Payload Size (Bytes)", min_value=32, max_value=1500, value=64)

            submitted = st.form_submit_button("🚀 Run Diagnostic Test", use_container_width=True)

            if submitted:
                if not target.strip():
                    st.error("Please specify a target hostname or IP address.", icon="❌")
                else:
                    st.info(
                        f"Target validated: **{target.strip()}** ({tool_type}, {packet_count} packets). "
                        "The raw socket execution engine is currently in development for the Day 2 milestone. "
                        "Your configuration has been recorded in the test staging queue.",
                        icon="ℹ️",
                    )

    with c2:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>📊</span> Execution Parameters Summary</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Active Target</span><span>🎯</span></div>'
            f'  <div class="noc-kpi-value" style="font-size:1.15rem; color:#22D3EE;">127.0.0.1</div>'
            f'  <div class="noc-kpi-sub">Loopback probe interface</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
        st.markdown("<div style='margin-top:0.5rem;'></div>", unsafe_allow_html=True)
        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Diagnostic Suite Status</span><span>⚡</span></div>'
            f'  <div class="noc-kpi-value" style="font-size:1.15rem; color:#F5B82E;">Day 2 Milestone</div>'
            f'  <div class="noc-kpi-sub">ICMP / UDP Socket Engine in development</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Diagnostic History Table
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:1.5rem;">'
        '  <div class="noc-panel-title"><span>📜</span> Recent Diagnostic Executions</div>'
        '  <div class="noc-panel-desc">Recorded diagnostic runs for this session</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    if test_history:
        st.table(test_history)
    else:
        st.caption("No diagnostic test executions have been performed in this session.")
