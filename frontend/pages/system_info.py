"""
NetPulse AI — System Information & Network Environment Page
===========================================================
Displays actual host hardware, OS runtime, memory allocation,
and passive local network adapter discovery (Zero Unauthorized Scanning).
"""

from typing import Any, Dict, Optional
import os
import platform
import sys
import streamlit as st
from frontend.components.metric_cards import render_kpi_card, render_status_badge


def render_system_info_page(
    net_env: Dict[str, Any],
    backend_connected: bool,
    backend_sys_info: Optional[Dict[str, Any]],
) -> None:
    """Render verified local machine compute and network adapter details."""
    st.markdown(
        f'<div class="noc-header-bar">'
        f'  <div>'
        f'    <div class="noc-header-title">NETPULSE AI <span class="tag">/</span> SYSTEM INFORMATION</div>'
        f'    <div class="noc-header-subtitle">HOST COMPUTE ARCHITECTURE &amp; PASSIVE NETWORK INTERFACES</div>'
        f'  </div>'
        f'  <div>'
        f'    {render_status_badge("🟢 Verified Host Diagnostics", "success")}'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>ℹ️ Host Telemetry Notice:</strong> The hardware, memory, and adapter metrics displayed '
        '  below represent the actual local workstation running the NetPulse AI suite. '
        '  These compute metrics are strictly separate from measured network performance telemetry.'
        '</div>',
        unsafe_allow_html=True,
    )

    # ── 1. Operating System & Python Runtime ──────────────────────────────
    st.markdown(
        '<div class="noc-panel-header">'
        '  <div class="noc-panel-title"><span>💻</span> Host Operating System &amp; Runtime</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns(2)
    with c1:
        st.markdown(render_kpi_card("Operating System", platform.system(), "🪟", "#EAF3FF", f"Release {platform.release()} (Build {platform.version()[:16]})"), unsafe_allow_html=True)
        st.markdown(render_kpi_card("CPU Architecture", platform.machine(), "⚙️", "#22D3EE", f"Node: {platform.node()}"), unsafe_allow_html=True)
    with c2:
        py_ver = platform.python_version()
        py_comp = platform.python_compiler()
        st.markdown(render_kpi_card("Python Runtime", f"v{py_ver}", "🐍", "#00D69A", f"Compiler: {py_comp[:28]}"), unsafe_allow_html=True)
        proc_str = platform.processor() or "Generic Processor"
        if len(proc_str) > 42:
            proc_str = proc_str[:40] + "..."
        st.markdown(render_kpi_card("Processor Specification", proc_str, "⚡", "#168BFF", "Host CPU Package"), unsafe_allow_html=True)

    # ── 2. CPU & Memory Resources ────────────────────────────────────────
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:1.25rem;">'
        '  <div class="noc-panel-title"><span>🧠</span> CPU Cores &amp; Memory Allocation</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    logical_cores = os.cpu_count() or 1
    try:
        import psutil
        phys_cores = psutil.cpu_count(logical=False) or logical_cores
        cpu_load = f"{psutil.cpu_percent(interval=None)}% current load"
        core_sub = f"{phys_cores} Physical / {logical_cores} Logical ({cpu_load})"

        vm = psutil.virtual_memory()
        ram_total = f"{vm.total / (1024**3):.2f} GB"
        ram_avail = f"{vm.available / (1024**3):.2f} GB"
        ram_used = f"{vm.used / (1024**3):.2f} GB ({vm.percent}%)"

        sm = psutil.swap_memory()
        swap_str = f"{sm.total / (1024**3):.2f} GB ({sm.percent}% used)"
    except ImportError:
        core_sub = f"{logical_cores} Logical Cores"
        ram_total = "N/A"
        ram_avail = "N/A"
        ram_used = "N/A"
        swap_str = "N/A"

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(render_kpi_card("CPU Cores", str(logical_cores), "⚡", "#22D3EE", core_sub), unsafe_allow_html=True)
    with m2:
        st.markdown(render_kpi_card("Total Installed RAM", ram_total, "💾", "#EAF3FF", "Physical Memory"), unsafe_allow_html=True)
    with m3:
        st.markdown(render_kpi_card("Available Memory", ram_avail, "🟢", "#00D69A", "Free for Workloads"), unsafe_allow_html=True)
    with m4:
        st.markdown(render_kpi_card("Memory Utilization", ram_used, "📊", "#F5B82E", f"Swap: {swap_str}"), unsafe_allow_html=True)

    # ── 3. Network Environment & Interfaces (Safe Passive Discovery) ──────
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:1.5rem;">'
        '  <div class="noc-panel-title"><span>🌐</span> Network Environment &amp; Host Adapters</div>'
        '  <div><span class="status-pill pill-cyan">Zero-Scan Passive Discovery</span></div>'
        '</div>',
        unsafe_allow_html=True,
    )

    st.markdown(
        '<div class="noc-callout">'
        '  <strong>🔒 Passive Local Interface Discovery:</strong> The table below is enumerated '
        '  directly from local operating system adapter tables. <strong>Zero external scanning, port sweeps, '
        '  or packet transmission</strong> are performed.'
        '</div>',
        unsafe_allow_html=True,
    )

    interfaces = net_env.get("interfaces", [])
    active_count = sum(1 for i in interfaces if i.get("is_up"))

    n1, n2, n3 = st.columns(3)
    with n1:
        st.markdown(render_kpi_card("Host Node Name", net_env.get("hostname", "localhost"), "🏷️", "#22D3EE", "OS Registered Hostname"), unsafe_allow_html=True)
    with n2:
        st.markdown(render_kpi_card("Primary Local IP", net_env.get("primary_ip", "127.0.0.1"), "🎯", "#00D69A", "Default Route Interface"), unsafe_allow_html=True)
    with n3:
        st.markdown(render_kpi_card("Network Adapters", f"{active_count} Active", "🔌", "#168BFF", f"{len(interfaces)} Total Detected"), unsafe_allow_html=True)

    if interfaces:
        st.markdown("<div style='margin-top:0.75rem;'></div>", unsafe_allow_html=True)
        for iface in interfaces:
            is_up = iface.get("is_up", False)
            status_dot = "🟢" if is_up else "⚪"
            status_txt = "UP (Active)" if is_up else "DOWN (Inactive)"
            pill_type = "pill-success" if is_up else "pill-neutral"
            speed_txt = f"{iface.get('speed_mbps', 0)} Mbps" if iface.get("speed_mbps") else "N/A"

            # Format IPv4
            ipv4_strs = [
                f"{ip.get('address')} (mask: {ip.get('netmask', 'N/A')})"
                for ip in iface.get("ipv4", [])
            ]
            ipv4_display = ", ".join(ipv4_strs) if ipv4_strs else "None"

            # Format IPv6
            ipv6_strs = iface.get("ipv6", [])
            ipv6_display = ", ".join(ipv6_strs[:2]) if ipv6_strs else "None"
            if len(ipv6_strs) > 2:
                ipv6_display += f" (+{len(ipv6_strs)-2} more)"

            mac_display = iface.get("mac_address", "N/A")

            st.markdown(
                f'<div class="noc-panel" style="margin-bottom:0.65rem; padding:0.9rem 1.15rem;">'
                f'  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">'
                f'    <span style="font-weight:700; color:#22D3EE; font-size:0.95rem;">🔌 {iface.get("name", "Adapter")}</span>'
                f'    <span class="status-pill {pill_type}">{status_dot} {status_txt}</span>'
                f'  </div>'
                f'  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.5rem; font-size:0.8rem;">'
                f'    <div><span style="color:#637C98;">IPv4: </span><span class="mono-val" style="color:#EAF3FF;">{ipv4_display}</span></div>'
                f'    <div><span style="color:#637C98;">MAC: </span><span class="mono-val" style="color:#EAF3FF;">{mac_display}</span></div>'
                f'    <div><span style="color:#637C98;">Speed: </span><span class="mono-val" style="color:#EAF3FF;">{speed_txt}</span></div>'
                f'    <div><span style="color:#637C98;">IPv6: </span><span class="mono-val" style="color:#91A7C0; font-size:0.75rem;">{ipv6_display}</span></div>'
                f'  </div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # ── 4. Backend Gateway Runtime Telemetry ─────────────────────────────
    st.markdown(
        '<div class="noc-panel-header" style="margin-top:1.5rem;">'
        '  <div class="noc-panel-title"><span>📡</span> Backend Gateway Specs</div>'
        '</div>',
        unsafe_allow_html=True,
    )

    if backend_connected and backend_sys_info:
        b_os = backend_sys_info.get("os", "N/A")
        b_arch = backend_sys_info.get("architecture", "N/A")
        b_py = backend_sys_info.get("python_version", "").split()[0]
        b_host = backend_sys_info.get("hostname", "N/A")

        sb1, sb2 = st.columns(2)
        with sb1:
            st.markdown(render_kpi_card("Backend Platform", b_os, "🖥️", "#22D3EE", f"Architecture: {b_arch}"), unsafe_allow_html=True)
        with sb2:
            st.markdown(render_kpi_card("Backend Python", f"v{b_py}", "🐍", "#00D69A", f"Server Host: {b_host}"), unsafe_allow_html=True)
    else:
        st.warning("Backend API is currently offline. Gateway specs will populate upon reconnection.")
