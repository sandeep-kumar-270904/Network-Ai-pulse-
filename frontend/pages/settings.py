"""
NetPulse AI — Platform Settings Page
====================================
API Gateway configuration, security parameters, and operational preferences.
"""

import streamlit as st
from frontend.components.metric_cards import render_kpi_card, render_status_badge


def render_settings_page() -> None:
    """Render the Settings & Configuration interface."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> SETTINGS</div>'
        f'    <div class="noc-header-subtitle">GATEWAY CONFIGURATION &amp; OPERATIONAL PREFERENCES</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge("⚙️ Platform Config", "cyan")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns([3, 2])

    with c1:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>📡</span> API Gateway &amp; Telemetry</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        with st.form("settings_form"):
            api_url = st.text_input("FastAPI Gateway URL", value="http://127.0.0.1:8000")
            timeout_val = st.slider("HTTP Request Timeout (seconds)", min_value=1.0, max_value=10.0, value=3.0, step=0.5)
            refresh_rate = st.selectbox("Telemetry Poll Interval", ["Manual Only", "Every 15 Seconds", "Every 30 Seconds", "Every 60 Seconds"])

            st.markdown(
                '<div class="noc-panel-header" style="margin-top:1rem;">'
                '  <div class="noc-panel-title"><span>🛡️</span> Security &amp; Compliance Enforcements</div>'
                '</div>',
                unsafe_allow_html=True,
            )

            strict_auth = st.checkbox("Strict Endpoint Authorization (Require explicit asset registry)", value=True)
            prohibit_scan = st.checkbox("Enforce Zero-Scan Policy (Block subnet sweeps and non-whitelisted ports)", value=True)

            save_settings = st.form_submit_button("💾 Save Configuration", use_container_width=True)
            if save_settings:
                st.success("Platform settings updated successfully.", icon="✅")

    with c2:
        st.markdown(
            '<div class="noc-panel-header">'
            '  <div class="noc-panel-title"><span>ℹ️</span> About NetPulse AI</div>'
            '</div>',
            unsafe_allow_html=True,
        )

        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Platform Version</span><span>🌐</span></div>'
            f'  <div class="noc-kpi-value" style="font-size:1.35rem; color:#22D3EE;">1.0.0-day1</div>'
            f'  <div class="noc-kpi-sub">Day 1 Enterprise NOC Foundation</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        st.markdown("<div style='margin-top:0.75rem;'></div>", unsafe_allow_html=True)

        st.markdown(
            f'<div class="noc-kpi-card">'
            f'  <div class="noc-kpi-top"><span class="noc-kpi-label">Product Tagline</span><span>⚡</span></div>'
            f'  <div class="noc-kpi-value" style="font-size:1.1rem; color:#EAF3FF;">Observe. Analyze. Optimize.</div>'
            f'  <div class="noc-kpi-sub">Network Operations Center Intelligence</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
