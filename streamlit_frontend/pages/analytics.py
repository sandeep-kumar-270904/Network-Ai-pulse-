"""
NetPulse AI — Analytics & Trend Analysis Page
=============================================
Comparative historical analysis, SLA compliance tracking, and distribution profiling (Day 7 Milestone).
"""

import streamlit as st
from streamlit_frontend.components.metric_cards import render_kpi_card, render_status_badge
from streamlit_frontend.components.charts import create_performance_chart


def render_analytics_page() -> None:
    """Render the Performance Analytics dashboard."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> PERFORMANCE ANALYTICS</div>'
        f'    <div class="noc-header-subtitle">HISTORICAL COMPARATIVE ANALYSIS &amp; SLA COMPLIANCE REPORTING</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge("🔵 Planned Day 7 Milestone", "blue")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>📈 Long-Term Analytical Trends:</strong> Day 7 milestone will incorporate aggregated '
        '  latency percentiles (p50, p95, p99), jitter variance distributions, and multi-endpoint comparative benchmarks.'
        '</div>',
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns(2)
    with c1:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>📊</span> 7-Day Latency Profile (p95)</div>'
            '</div>',
            unsafe_allow_html=True,
        )
        fig_lat = create_performance_chart("Latency", "7d")
        st.plotly_chart(fig_lat, use_container_width=True, config={"displayModeBar": False})

    with c2:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>📉</span> Packet Loss Rate (%)</div>'
            '</div>',
            unsafe_allow_html=True,
        )
        fig_loss = create_performance_chart("Packet Loss", "7d")
        st.plotly_chart(fig_loss, use_container_width=True, config={"displayModeBar": False})
