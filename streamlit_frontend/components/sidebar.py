"""
NetPulse AI — NOC Navigation Sidebar Component
==============================================
Fixed-look collapsible sidebar with 13 enterprise navigation destinations,
brand identity, and live backend telemetry.
"""

from typing import Tuple
import streamlit as st

NAV_ITEMS = [
    ("📊 NOC Overview", "NOC Overview"),
    ("🔍 Network Diagnostics", "Network Diagnostics"),
    ("🌐 Network Topology", "Network Topology"),
    ("🖥️ Infrastructure Inventory", "Infrastructure Inventory"),
    ("⚡ Performance Testing", "Performance Testing"),
    ("🤖 Test Automation", "Test Automation"),
    ("🧠 AI Analysis", "AI Analysis"),
    ("🚨 Alerts & Events", "Alerts & Events"),
    ("📜 Test History", "Test History"),
    ("📈 Analytics", "Analytics"),
    ("📄 Reports", "Reports"),
    ("ℹ️ System Information", "System Information"),
    ("⚙️ Settings", "Settings"),
]


def render_sidebar(
    backend_connected: bool,
    latency_ms: float = None,
    app_version: str = "1.0.0-day1",
    app_env: str = "Development",
) -> str:
    """Render the enterprise NOC collapsible sidebar and return the selected page name."""
    with st.sidebar:
        # Brand Block
        st.markdown(
            '<div class="sidebar-brand-box">'
            '  <div class="sidebar-brand-title">🌐 NETPULSE AI</div>'
            '  <div class="sidebar-brand-tagline">NETWORK INTELLIGENCE PLATFORM</div>'
            '  <div class="sidebar-brand-sub">Observe. Analyze. Optimize.</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        st.markdown(
            '<div style="font-size:0.68rem; font-weight:700; color:#637C98; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:0.4rem;">'
            'OPERATIONS NAVIGATION'
            '</div>',
            unsafe_allow_html=True,
        )

        # Radio Navigation
        labels = [item[0] for item in NAV_ITEMS]
        raw_selection = st.radio(
            "Navigation",
            labels,
            index=0,
            label_visibility="collapsed",
        )

        # Extract clean page name
        selected_page = "NOC Overview"
        for label, page_name in NAV_ITEMS:
            if label == raw_selection:
                selected_page = page_name
                break

        # Telemetry Footer
        status_color = "#00D69A" if backend_connected else "#FF475F"
        status_text = "BACKEND ONLINE" if backend_connected else "BACKEND OFFLINE"
        lat_text = f"{latency_ms:.1f} ms" if latency_ms is not None else "—"

        st.markdown(
            f'<div class="sidebar-footer-box">'
            f'  <div class="sidebar-footer-row">'
            f'    <span style="color:#637C98; text-transform:uppercase; font-size:0.68rem; font-weight:700;">API Gateway</span>'
            f'    <span style="color:{status_color}; font-weight:800; font-size:0.75rem;">● {status_text}</span>'
            f'  </div>'
            f'  <div class="sidebar-footer-row">'
            f'    <span style="color:#637C98; font-size:0.68rem;">Latency</span>'
            f'    <span style="color:#22D3EE; font-family:var(--font-mono); font-weight:600;">{lat_text}</span>'
            f'  </div>'
            f'  <div class="sidebar-footer-row">'
            f'    <span style="color:#637C98; font-size:0.68rem;">Build</span>'
            f'    <span style="color:#EAF3FF; font-family:var(--font-mono);">{app_version}</span>'
            f'  </div>'
            f'  <div class="sidebar-footer-row">'
            f'    <span style="color:#637C98; font-size:0.68rem;">Env</span>'
            f'    <span style="color:#168BFF; font-weight:600;">{app_env}</span>'
            f'  </div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        st.markdown("<div style='margin-top:0.75rem;'></div>", unsafe_allow_html=True)
        if st.button("🔄 Refresh Telemetry", use_container_width=True):
            st.rerun()

    return selected_page
