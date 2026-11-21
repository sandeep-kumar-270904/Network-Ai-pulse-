"""
NetPulse AI — Interactive Network Topology Visualizer
=====================================================
Plotly-based graph representation for infrastructure nodes & topology.
"""

from typing import Any, Dict, List, Optional
import plotly.graph_objects as go


def create_topology_graph(
    custom_nodes: Optional[List[Dict[str, Any]]] = None,
    custom_links: Optional[List[Dict[str, Any]]] = None,
) -> go.Figure:
    """
    Render an interactive NOC topology graph in Plotly.
    Default topology displays configured/authorized endpoints and network hierarchy.
    """
    if custom_nodes:
        nodes = custom_nodes
    else:
        # Standard NOC hierarchical demonstration topology
        nodes = [
            {"id": "gw", "name": "Core Gateway", "type": "Gateway", "ip": "10.0.0.1", "status": "UP", "x": 0.5, "y": 0.95, "color": "#22D3EE"},
            {"id": "sw1", "name": "Distribution Switch A", "type": "Switch", "ip": "10.0.1.1", "status": "UP", "x": 0.25, "y": 0.65, "color": "#168BFF"},
            {"id": "sw2", "name": "Distribution Switch B", "type": "Switch", "ip": "10.0.2.1", "status": "UP", "x": 0.75, "y": 0.65, "color": "#168BFF"},
            {"id": "srv1", "name": "Primary DNS Server", "type": "Server", "ip": "1.1.1.1", "status": "UP", "x": 0.12, "y": 0.25, "color": "#00D69A"},
            {"id": "srv2", "name": "Secondary DNS", "type": "Server", "ip": "8.8.8.8", "status": "UP", "x": 0.38, "y": 0.25, "color": "#00D69A"},
            {"id": "probe1", "name": "Local Probe (Host)", "type": "Probe", "ip": "127.0.0.1", "status": "UP", "x": 0.62, "y": 0.25, "color": "#22D3EE"},
            {"id": "srv3", "name": "Telemetry Ingestion", "type": "Server", "ip": "10.0.2.50", "status": "STANDBY", "x": 0.88, "y": 0.25, "color": "#F5B82E"},
        ]

    links = custom_links or [
        ("gw", "sw1"),
        ("gw", "sw2"),
        ("sw1", "srv1"),
        ("sw1", "srv2"),
        ("sw2", "probe1"),
        ("sw2", "srv3"),
    ]

    node_dict = {n["id"]: n for n in nodes}

    fig = go.Figure()

    # Draw edge lines
    for src_id, dst_id in links:
        if src_id in node_dict and dst_id in node_dict:
            src = node_dict[src_id]
            dst = node_dict[dst_id]
            fig.add_trace(
                go.Scatter(
                    x=[src["x"], dst["x"]],
                    y=[src["y"], dst["y"]],
                    mode="lines",
                    line=dict(color="rgba(34, 211, 238, 0.35)", width=1.5),
                    hoverinfo="none",
                    showlegend=False,
                )
            )

    # Draw node markers
    node_x = [n["x"] for n in nodes]
    node_y = [n["y"] for n in nodes]
    node_colors = [n.get("color", "#22D3EE") for n in nodes]
    node_texts = [
        f"<b>{n['name']}</b><br>Type: {n['type']}<br>IP: {n['ip']}<br>Status: {n['status']}"
        for n in nodes
    ]
    node_labels = [n["name"] for n in nodes]

    fig.add_trace(
        go.Scatter(
            x=node_x,
            y=node_y,
            mode="markers+text",
            marker=dict(
                size=28,
                color=node_colors,
                line=dict(color="#070D18", width=2),
                symbol="circle",
            ),
            text=node_labels,
            textposition="top center",
            textfont=dict(color="#EAF3FF", size=10, family="Inter"),
            hoverinfo="text",
            hovertext=node_texts,
            showlegend=False,
        )
    )

    fig.update_layout(
        paper_bgcolor="#0D192B",
        plot_bgcolor="#070D18",
        margin=dict(l=20, r=20, t=30, b=20),
        height=380,
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-0.05, 1.05]),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[0.1, 1.1]),
        font=dict(family="Inter", color="#EAF3FF"),
    )
    return fig
