"""
NetPulse AI — NOC Overview Dashboard Page
=========================================
The primary Network Operations Center operational display with KPI cards,
circular gauges, performance charts, topology visualization, and inventory.
"""

from typing import Any, Dict, List, Optional
import datetime
import streamlit as st

from frontend.components.metric_cards import render_kpi_card, render_status_badge
from frontend.components.gauges import create_gauge
from frontend.components.charts import create_performance_chart
from frontend.components.status_panel import render_status_panel
from frontend.components.topology import create_topology_graph


def render_overview_page(
    backend_connected: bool,
    health_data: Optional[Dict[str, Any]],
    latency_ms: Optional[float],
    last_check_str: str,
    endpoints: List[Dict[str, Any]],
    alerts: List[Dict[str, Any]],
    test_history: List[Dict[str, Any]],
    host_stats: Dict[str, Any],
) -> None:
    """Render the full NOC operational overview."""

    # ── 1. Top Operational Header ─────────────────────────────────────────
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status_dot = "🟢" if backend_connected else "🔴"
    status_label = "GATEWAY CONNECTED" if backend_connected else "GATEWAY OFFLINE"
    status_pill_type = "success" if backend_connected else "critical"

    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> NOC OVERVIEW</div>'
        f'    <div class="noc-header-subtitle">NETWORK PERFORMANCE OPERATIONS CENTER</div>'
        f'  </div>'
        f'  <div class="noc-header-meta">'
        f'    <div class="noc-header-meta-item">'
        f'      <span class="noc-header-meta-label">Local Host Time</span>'
        f'      <span class="noc-header-meta-val">{now_str}</span>'
        f'    </div>'
        f'    <div class="noc-header-meta-item">'
        f'      <span class="noc-header-meta-label">API Gateway</span>'
        f'      <span>{render_status_badge(f"{status_dot} {status_label}", status_pill_type)}</span>'
        f'    </div>'
        f'    <div class="noc-header-meta-item">'
        f'      <span class="noc-header-meta-label">Telemetry Latency</span>'
        f'      <span class="noc-header-meta-val" style="color:#22D3EE;">{latency_ms if latency_ms is not None else "—"} ms</span>'
        f'    </div>'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    if not backend_connected:
        st.warning(
            "⚠️ **Backend Gateway Offline**: The FastAPI server on `127.0.0.1:8000` is currently unreachable. "
            "Telemetry will refresh automatically upon gateway recovery.",
            icon="⚠️",
        )

    # ── 2. KPI Cards (Truthful Inventory & Alert Counts) ──────────────────
    avail_count = sum(1 for ep in endpoints if ep.get("status") == "UP")
    unavail_count = sum(1 for ep in endpoints if ep.get("status") == "DOWN")
    degraded_count = sum(1 for ep in endpoints if ep.get("status") == "DEGRADED")
    active_alerts = len([a for a in alerts if a.get("level") in ["WARNING", "CRITICAL"]])
    critical_alerts = len([a for a in alerts if a.get("level") == "CRITICAL"])
    completed_tests = len(test_history)

    k1, k2, k3, k4, k5, k6 = st.columns(6)
    with k1:
        st.markdown(render_kpi_card("Available Endpoints", str(avail_count), "🟢", "#00D69A", f"Of {len(endpoints)} configured"), unsafe_allow_html=True)
    with k2:
        st.markdown(render_kpi_card("Unavailable Endpoints", str(unavail_count), "🔴", "#FF475F" if unavail_count > 0 else "#637C98", "Reachable check"), unsafe_allow_html=True)
    with k3:
        st.markdown(render_kpi_card("Degraded Endpoints", str(degraded_count), "🟡", "#F5B82E" if degraded_count > 0 else "#637C98", "High packet latency"), unsafe_allow_html=True)
    with k4:
        st.markdown(render_kpi_card("Active Alerts", str(active_alerts), "🚨", "#F5B82E" if active_alerts > 0 else "#637C98", "Unresolved events"), unsafe_allow_html=True)
    with k5:
        st.markdown(render_kpi_card("Critical Alerts", str(critical_alerts), "⚡", "#FF475F" if critical_alerts > 0 else "#637C98", "Priority incident queue"), unsafe_allow_html=True)
    with k6:
        st.markdown(render_kpi_card("Completed Tests", str(completed_tests), "📜", "#22D3EE", "Session executions"), unsafe_allow_html=True)

    st.markdown("<div style='margin-top: 1rem;'></div>", unsafe_allow_html=True)

    # ── 3. Circular Gauges (Network Health, Latency, CPU, Memory) ─────────
    st.markdown(
        '<div class="noc-panel-header">'
        '  <div class="noc-panel-title"><span>🎯</span> Real-Time Health &amp; Resource Indicators</div>'
        '  <div class="noc-panel-desc">Real host compute resources &amp; measured network health metrics</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    g1, g2, g3, g4 = st.columns(4)
    with g1:
        # Only show health % when real tests exist; otherwise display Not Measured
        health_score = host_stats.get("network_health")
        fig_health = create_gauge(
            title="NETWORK SLA HEALTH",
            value=health_score,
            unit="%",
            color_scheme="green",
            not_measured=(health_score is None),
        )
        st.plotly_chart(fig_health, use_container_width=True, config={"displayModeBar": False})

    with g2:
        avg_latency = host_stats.get("avg_latency")
        fig_lat = create_gauge(
            title="AVERAGE LATENCY",
            value=avg_latency,
            unit="ms",
            min_val=0.0,
            max_val=150.0,
            color_scheme="cyan",
            not_measured=(avg_latency is None),
        )
        st.plotly_chart(fig_lat, use_container_width=True, config={"displayModeBar": False})

    with g3:
        cpu_load = host_stats.get("cpu_percent", 0.0)
        fig_cpu = create_gauge(
            title="HOST CPU UTILIZATION",
            value=cpu_load,
            unit="%",
            color_scheme="amber" if cpu_load > 80 else "cyan",
        )
        st.plotly_chart(fig_cpu, use_container_width=True, config={"displayModeBar": False})

    with g4:
        mem_load = host_stats.get("memory_percent", 0.0)
        fig_mem = create_gauge(
            title="HOST RAM UTILIZATION",
            value=mem_load,
            unit="%",
            color_scheme="red" if mem_load > 90 else "cyan",
        )
        st.plotly_chart(fig_mem, use_container_width=True, config={"displayModeBar": False})

    # ── 4. System Status Panel ───────────────────────────────────────────
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:0.5rem;">'
        '  <div class="noc-panel-title"><span>📡</span> Backend Gateway &amp; Telemetry Status</div>'
        '  <div class="noc-panel-desc">Live FastAPI service health and data store status</div>'
        '</div>',
        unsafe_allow_html=True,
    )
    render_status_panel(backend_connected, health_data, latency_ms, last_check_str)

    # ── 5. Performance Overview Chart ────────────────────────────────────
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:1.25rem;">'
        '  <div class="noc-panel-title"><span>📈</span> Network Performance Overview</div>'
        '  <div class="noc-panel-desc">Time-series telemetry for latency, jitter, loss, and throughput</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    p_col1, p_col2 = st.columns([2, 1])
    with p_col1:
        sel_metric = st.selectbox(
            "Telemetry Metric",
            ["Latency", "Jitter", "Packet Loss", "Throughput"],
            index=0,
            label_visibility="collapsed",
        )
    with p_col2:
        sel_range = st.radio(
            "Time Range",
            ["1h", "6h", "24h", "7d"],
            index=2,
            horizontal=True,
            label_visibility="collapsed",
        )

    # Render Plotly interactive graph
    chart_fig = create_performance_chart(
        metric_name=sel_metric,
        time_range=sel_range,
        data_points=None,  # Truthful Day 1: Awaits test executions
    )
    st.plotly_chart(chart_fig, use_container_width=True, config={"displayModeBar": False})

    # ── 6. Topology & Infrastructure Split View ──────────────────────────
    split_col1, split_col2 = st.columns([1, 1])

    with split_col1:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>🌐</span> Network Topology</div>'
            '  <div><span class="status-pill pill-cyan">Configured Topology</span></div>'
            '</div>',
            unsafe_allow_html=True,
        )
        topo_fig = create_topology_graph()
        st.plotly_chart(topo_fig, use_container_width=True, config={"displayModeBar": False})

    with split_col2:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>🖥️</span> Infrastructure Inventory</div>'
            f'  <div><span class="status-pill pill-blue">{len(endpoints)} Configured</span></div>'
            '</div>',
            unsafe_allow_html=True,
        )

        # Inventory Table
        table_rows = ""
        for ep in endpoints[:5]:
            ep_status = ep.get("status", "UP")
            badge = "pill-success" if ep_status == "UP" else ("pill-warning" if ep_status == "STANDBY" else "pill-critical")
            table_rows += (
                f'<tr>'
                f'  <td><b>{ep.get("hostname", "N/A")}</b></td>'
                f'  <td class="mono-val" style="color:#22D3EE;">{ep.get("ip", "N/A")}</td>'
                f'  <td><span style="color:#91A7C0; font-size:0.75rem;">{ep.get("type", "Server")}</span></td>'
                f'  <td><span class="status-pill {badge}">{ep_status}</span></td>'
                f'  <td class="mono-val" style="color:#637C98; font-size:0.75rem;">{ep.get("last_checked", "Recent")}</td>'
                f'</tr>'
            )

        st.markdown(
            f'<table class="noc-table">'
            f'  <thead>'
            f'    <tr><th>Node</th><th>IP Address</th><th>Type</th><th>Status</th><th>Last Seen</th></tr>'
            f'  </thead>'
            f'  <tbody>{table_rows}</tbody>'
            f'</table>',
            unsafe_allow_html=True,
        )

    # ── 7. AI Anomaly Detection & Insights ───────────────────────────────
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:1.5rem;">'
        '  <div class="noc-panel-title"><span>🧠</span> System Forecast &amp; AI Anomaly Detection</div>'
        '  <div><span class="status-pill pill-warning">🟡 Day 6 Roadmap Milestone</span></div>'
        '</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>🤖 Machine Learning Architecture:</strong> NetPulse AI will integrate '
        '  <strong>scikit-learn Isolation Forests</strong> and Principal Component Analysis (PCA) to detect '
        '  abnormal jitter variance and sudden packet route deviations. In this Day 1 release, the ML model '
        '  training pipeline is structured and awaits operational test telemetry.'
        '</div>',
        unsafe_allow_html=True,
    )
