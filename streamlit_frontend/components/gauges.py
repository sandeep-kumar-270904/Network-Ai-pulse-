"""
NetPulse AI — NOC Circular Gauge Visualizations
===============================================
Plotly circular indicators formatted to match the dark NOC design system.
"""

from typing import Optional
import plotly.graph_objects as go


def create_gauge(
    title: str,
    value: Optional[float],
    unit: str = "%",
    min_val: float = 0.0,
    max_val: float = 100.0,
    color_scheme: str = "cyan",
    not_measured: bool = False,
) -> go.Figure:
    """
    Generate an enterprise dark-theme circular gauge in Plotly.
    Handles 'not_measured' or None values gracefully without crashing.
    """
    schemes = {
        "cyan": {"bar": "#22D3EE", "accent": "#168BFF"},
        "green": {"bar": "#00D69A", "accent": "#22D3EE"},
        "amber": {"bar": "#F5B82E", "accent": "#FF475F"},
        "red": {"bar": "#FF475F", "accent": "#F5B82E"},
    }
    theme = schemes.get(color_scheme, schemes["cyan"])

    display_val = value if (value is not None and not not_measured) else 0.0
    text_val = f"{display_val:.1f}{unit}" if (value is not None and not not_measured) else "N/A"

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number" if (value is not None and not not_measured) else "gauge",
            value=display_val,
            number={"suffix": unit, "font": {"color": "#EAF3FF", "size": 22, "family": "JetBrains Mono"}},
            title={"text": f"<b>{title}</b>", "font": {"color": "#91A7C0", "size": 12, "family": "Inter"}},
            gauge={
                "axis": {
                    "range": [min_val, max_val],
                    "tickwidth": 1,
                    "tickcolor": "#203A56",
                    "tickfont": {"size": 9, "color": "#637C98", "family": "JetBrains Mono"},
                },
                "bar": {"color": theme["bar"] if (value is not None and not not_measured) else "rgba(99,124,152,0.3)", "thickness": 0.28},
                "bgcolor": "#0D192B",
                "borderwidth": 1,
                "bordercolor": "#203A56",
                "steps": [
                    {"range": [min_val, max_val * 0.7], "color": "rgba(13, 25, 43, 0.8)"},
                    {"range": [max_val * 0.7, max_val * 0.9], "color": "rgba(245, 184, 46, 0.12)"},
                    {"range": [max_val * 0.9, max_val], "color": "rgba(255, 71, 95, 0.15)"},
                ],
            },
        )
    )

    if not_measured or value is None:
        fig.add_annotation(
            text="NOT MEASURED",
            x=0.5,
            y=0.25,
            font=dict(color="#91A7C0", size=11, family="JetBrains Mono"),
            showarrow=False,
        )

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=15, r=15, t=35, b=15),
        height=160,
        font=dict(family="Inter", color="#EAF3FF"),
    )
    return fig
