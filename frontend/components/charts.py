"""
NetPulse AI — NOC Interactive Performance Time-Series Charts
============================================================
Plotly time-series visualizations styled for dark NOC environments.
"""

from typing import Any, Dict, List, Optional
import datetime
import pandas as pd
import plotly.graph_objects as go


def create_performance_chart(
    metric_name: str = "Latency",
    time_range: str = "24h",
    data_points: Optional[List[Dict[str, Any]]] = None,
) -> go.Figure:
    """
    Render an enterprise time-series performance graph.
    If data_points is empty, renders an informative NOC empty state without crashing.
    """
    fig = go.Figure()

    metric_meta = {
        "Latency": {"unit": "ms", "color": "#22D3EE", "fill": "rgba(34, 211, 238, 0.08)"},
        "Jitter": {"unit": "ms", "color": "#168BFF", "fill": "rgba(22, 139, 255, 0.08)"},
        "Packet Loss": {"unit": "%", "color": "#FF475F", "fill": "rgba(255, 71, 95, 0.08)"},
        "Throughput": {"unit": "Mbps", "color": "#00D69A", "fill": "rgba(0, 214, 154, 0.08)"},
    }
    meta = metric_meta.get(metric_name, metric_meta["Latency"])

    if data_points and len(data_points) > 0:
        df = pd.DataFrame(data_points)
        fig.add_trace(
            go.Scatter(
                x=df["timestamp"],
                y=df["value"],
                mode="lines+markers",
                name=f"{metric_name} ({meta['unit']})",
                line=dict(color=meta["color"], width=2),
                marker=dict(size=4, color=meta["color"]),
                fill="tozeroy",
                fillcolor=meta["fill"],
                hovertemplate=f"<b>Time:</b> %{{x}}<br><b>{metric_name}:</b> %{{y:.2f}} {meta['unit']}<extra></extra>",
            )
        )
    else:
        # Realistic empty-state timeline matching selected range
        now = datetime.datetime.now()
        hours_map = {"1h": 1, "6h": 6, "24h": 24, "7d": 168}
        span_hrs = hours_map.get(time_range, 24)
        intervals = 12
        timestamps = [
            now - datetime.timedelta(hours=span_hrs * (1 - i / intervals))
            for i in range(intervals + 1)
        ]

        # Baseline zero gridline
        fig.add_trace(
            go.Scatter(
                x=timestamps,
                y=[0] * len(timestamps),
                mode="lines",
                name="Awaiting Telemetry",
                line=dict(color="rgba(99, 124, 152, 0.25)", width=1, dash="dash"),
                hoverinfo="none",
            )
        )

        fig.add_annotation(
            text=f"NO ACTIVE {metric_name.upper()} DATA RECORDED IN {time_range.upper()}<br>"
                 "<span style='font-size:11px; color:#637C98;'>Diagnostic tests have not been executed. Run a test to populate metrics.</span>",
            xref="paper",
            yref="paper",
            x=0.5,
            y=0.55,
            showarrow=False,
            font=dict(color="#91A7C0", size=13, family="Inter"),
            align="center",
        )

    fig.update_layout(
        paper_bgcolor="#0D192B",
        plot_bgcolor="#070D18",
        margin=dict(l=50, r=25, t=35, b=45),
        height=320,
        font=dict(family="Inter", color="#EAF3FF"),
        xaxis=dict(
            showgrid=True,
            gridcolor="#13243A",
            gridwidth=1,
            zeroline=False,
            tickfont=dict(color="#637C98", size=10, family="JetBrains Mono"),
        ),
        yaxis=dict(
            title=dict(text=f"{metric_name} ({meta['unit']})", font=dict(color="#91A7C0", size=11)),
            showgrid=True,
            gridcolor="#13243A",
            gridwidth=1,
            zeroline=True,
            zerolinecolor="#203A56",
            tickfont=dict(color="#637C98", size=10, family="JetBrains Mono"),
        ),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1,
            font=dict(size=10, color="#91A7C0"),
        ),
    )
    return fig
