"""
NetPulse AI — Performance Testing Page
======================================
Throughput, latency, and jitter saturation benchmarks (Day 3 Milestone).
"""

from typing import Any, Dict, List
import streamlit as st
from streamlit_frontend.components.metric_cards import render_kpi_card, render_status_badge
from streamlit_frontend.components.charts import create_performance_chart


def render_performance_page(endpoints: List[Dict[str, Any]]) -> None:
    """Render the Performance Testing workbench."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> PERFORMANCE TESTING</div>'
        f'    <div class="noc-header-subtitle">BANDWIDTH SATURATION &amp; PACKET TRANSMISSION PROFILING</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge("🟡 Day 3 In Development", "warning")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>⚡ Day 3 Milestone Scope:</strong> The active throughput saturation engine, TCP window profiling, '
        '  and UDP packet jitter distribution models are scheduled for the Day 3 release. '
        '  Test configurations staged below are validated against authorized infrastructure endpoints.'
        '</div>',
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns([3, 2])

    with c1:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>⚡</span> Test Configuration Parameters</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        with st.form("perf_form"):
            target_ep = st.selectbox(
                "Authorized Target Endpoint",
                [f"{ep['hostname']} ({ep['ip']})" for ep in endpoints],
            )

            p_col1, p_col2 = st.columns(2)
            with p_col1:
                protocol = st.selectbox("Protocol", ["TCP (Streaming)", "UDP (Datagram)", "ICMP (Latency)"])
                duration = st.slider("Duration (Seconds)", min_value=5, max_value=60, value=15)
            with p_col2:
                bandwidth_target = st.number_input("Target Bandwidth (Mbps)", min_value=1, max_value=1000, value=50)
                parallel_streams = st.number_input("Parallel Streams", min_value=1, max_value=16, value=4)

            perf_submit = st.form_submit_button("🚀 Initialize Performance Run", use_container_width=True)

            if perf_submit:
                st.info(
                    f"Performance test profile staged for **{target_ep}** ({protocol}, {duration}s @ {bandwidth_target} Mbps). "
                    "Packet generator daemon is in development for Day 3. Parameters saved.",
                    icon="ℹ️",
                )

    with c2:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>📊</span> Telemetry Readiness</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Throughput Capacity</span><span>📈</span></div>'
            f'  <div class="noc-kpi-value" style="color:#637C98;">—</div>'
            f'  <div class="noc-kpi-sub">Not Measured (Day 3 Engine)</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
        st.markdown("<div style='margin-top:0.5rem;'></div>", unsafe_allow_html=True)
        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Jitter Variance</span><span>〰️</span></div>'
            f'  <div class="noc-kpi-value" style="color:#637C98;">—</div>'
            f'  <div class="noc-kpi-sub">Not Measured (Day 3 Engine)</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Real-Time Telemetry Graph
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:1.5rem;">'
        '  <div class="noc-panel-title"><span>📈</span> Throughput &amp; Jitter Visualization Preview</div>'
        '</div>',
        unsafe_allow_html=True,
    )
    fig = create_performance_chart("Throughput", "1h")
    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
