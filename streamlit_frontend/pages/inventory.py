"""
NetPulse AI — Infrastructure Inventory Page
===========================================
Manage, filter, and register authorized infrastructure test endpoints.
"""

from typing import Any, Dict, List
import streamlit as st
from streamlit_frontend.components.metric_cards import render_kpi_card, render_status_badge


def render_inventory_page(endpoints: List[Dict[str, Any]]) -> None:
    """Render the Infrastructure Inventory management interface."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> INFRASTRUCTURE INVENTORY</div>'
        f'    <div class="noc-header-subtitle">AUTHORIZED TEST ENDPOINTS &amp; NETWORK ASSET REGISTRY</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge(f"{len(endpoints)} Registered Assets", "blue")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>🔒 Security &amp; Compliance Requirement:</strong> All diagnostic benchmarks and performance '
        '  evaluations are strictly constrained to authorized assets registered below. '
        '  <strong>No unauthorized network discovery or port scanning</strong> is permitted. '
        '  Endpoints must be explicitly added by an authorized administrator.'
        '</div>',
        unsafe_allow_html=True,
    )

    # Search & Filter Controls
    f_col1, f_col2, f_col3 = st.columns([2, 1, 1])
    with f_col1:
        search_term = st.text_input("Search Assets", placeholder="Filter by hostname, IP address, or notes...")
    with f_col2:
        category_filter = st.selectbox(
            "Device Category",
            ["All Categories", "Gateway", "Router", "Switch", "Server", "Probe"],
        )
    with f_col3:
        status_filter = st.selectbox("Availability", ["All States", "UP", "DOWN", "STANDBY"])

    # Filter logic
    filtered = endpoints
    if search_term.strip():
        term = search_term.lower()
        filtered = [
            ep for ep in filtered
            if term in ep.get("hostname", "").lower()
            or term in ep.get("ip", "").lower()
            or term in ep.get("notes", "").lower()
        ]
    if category_filter != "All Categories":
        filtered = [ep for ep in filtered if ep.get("type") == category_filter]
    if status_filter != "All States":
        filtered = [ep for ep in filtered if ep.get("status") == status_filter]

    # Render Table
    st.markdown(f"<p style='color:#91A7C0; font-size:0.8rem;'>Displaying {len(filtered)} of {len(endpoints)} assets</p>", unsafe_allow_html=True)

    table_rows = ""
    for ep in filtered:
        status_val = ep.get("status", "UP")
        badge = "pill-success" if status_val == "UP" else ("pill-warning" if status_val == "STANDBY" else "pill-critical")
        table_rows += (
            f'<tr>'
            f'  <td><b>{ep.get("hostname", "N/A")}</b></td>'
            f'  <td class="mono-val" style="color:#22D3EE;">{ep.get("ip", "N/A")}</td>'
            f'  <td><span style="color:#91A7C0;">{ep.get("type", "Server")}</span></td>'
            f'  <td><span class="status-pill {badge}">{status_val}</span></td>'
            f'  <td><span style="color:#637C98; font-size:0.75rem;">{ep.get("notes", "Internal asset")}</span></td>'
            f'  <td class="mono-val" style="color:#637C98; font-size:0.75rem;">{ep.get("last_checked", "Recent")}</td>'
            f'</tr>'
        )

    st.markdown(
        f'<table class="noc-table">'
        f'  <thead><tr><th>Hostname</th><th>IP Address</th><th>Category</th><th>State</th><th>Notes</th><th>Last Verification</th></tr></thead>'
        f'  <tbody>{table_rows}</tbody>'
        f'</table>',
        unsafe_allow_html=True,
    )

    # Asset Registration Form
    st.markdown("<div style='margin-top:2rem;'></div>", unsafe_allow_html=True)
    with st.expander("➕ Register New Authorized Infrastructure Endpoint", expanded=False):
        with st.form("add_endpoint_form"):
            c1, c2 = st.columns(2)
            with c1:
                new_host = st.text_input("Device Hostname", placeholder="e.g. edge-router-01.corp")
                new_ip = st.text_input("IP Address", placeholder="e.g. 192.168.1.1")
            with c2:
                new_type = st.selectbox("Device Type", ["Gateway", "Router", "Switch", "Server", "Probe"])
                new_notes = st.text_input("Operational Notes", placeholder="e.g. Primary border router, Rack B3")

            submit_new = st.form_submit_button("Register Endpoint")
            if submit_new:
                if not new_host.strip() or not new_ip.strip():
                    st.error("Hostname and IP address are mandatory.", icon="❌")
                else:
                    endpoints.append({
                        "id": f"ep_{len(endpoints)+1}",
                        "hostname": new_host.strip(),
                        "ip": new_ip.strip(),
                        "type": new_type,
                        "status": "UP",
                        "notes": new_notes.strip() or "User registered",
                        "last_checked": "Just added",
                    })
                    st.success(f"Endpoint **{new_host}** ({new_ip}) registered successfully!", icon="✅")
                    st.rerun()
