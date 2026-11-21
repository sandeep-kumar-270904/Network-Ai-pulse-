"""
NetPulse AI — Network Topology Page
===================================
Interactive network topology visualization and node link inspection.
"""

from typing import Any, Dict, List
import streamlit as st
from frontend.components.metric_cards import render_kpi_card, render_status_badge
from frontend.components.topology import create_topology_graph


def render_topology_page(endpoints: List[Dict[str, Any]]) -> None:
    """Render the full Network Topology interactive visualization."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> NETWORK TOPOLOGY</div>'
        f'    <div class="noc-header-subtitle">INFRASTRUCTURE MAPPING &amp; NODE LINK DISCOVERY</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge("🟢 Interactive Topology Map", "cyan")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>ℹ️ Demonstration Topology:</strong> The interactive topology below represents the '
        '  logical network hierarchy of your registered endpoints and core network infrastructure. '
        '  Nodes can be inspected by hovering over them for link addresses and operational states.'
        '</div>',
        unsafe_allow_html=True,
    )

    t_col1, t_col2 = st.columns([3, 1])

    with t_col2:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>🔍</span> Topology Filter</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        filter_type = st.multiselect(
            "Device Categories",
            ["Gateway", "Switch", "Server", "Probe"],
            default=["Gateway", "Switch", "Server", "Probe"],
        )

        st.markdown(
            f'<div class="noc-kpi-card" style="margin-top:1rem;">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Active Links</span><span>🔗</span></div>'
            f'  <div class="noc-kpi-value" style="color:#00D69A;">6 Links</div>'
            f'  <div class="noc-kpi-sub">All core links operational</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    with t_col1:
        topo_fig = create_topology_graph()
        st.plotly_chart(topo_fig, use_container_width=True, config={"displayModeBar": False})

    # Node Details Table
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:1rem;">'
        '  <div class="noc-panel-title"><span>📋</span> Configured Infrastructure Nodes</div>'
        '  <div class="noc-panel-desc">Node specifications and interface assignments</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    node_rows = ""
    for ep in endpoints:
        badge = "pill-success" if ep.get("status") == "UP" else "pill-warning"
        node_rows += (
            f'<tr>'
            f'  <td><b>{ep.get("hostname", "N/A")}</b></td>'
            f'  <td class="mono-val" style="color:#22D3EE;">{ep.get("ip", "N/A")}</td>'
            f'  <td><span style="color:#91A7C0;">{ep.get("type", "Server")}</span></td>'
            f'  <td><span class="status-pill {badge}">{ep.get("status", "UP")}</span></td>'
            f'  <td class="mono-val" style="color:#637C98;">{ep.get("last_checked", "Recent")}</td>'
            f'</tr>'
        )

    st.markdown(
        f'<table class="noc-table">'
        f'  <thead><tr><th>Node ID</th><th>IP Address</th><th>Category</th><th>State</th><th>Last Verified</th></tr></thead>'
        f'  <tbody>{node_rows}</tbody>'
        f'</table>',
        unsafe_allow_html=True,
    )
