"""
A.R.C SENTINEL - Gemini AI Integration
========================================
Google Gemini API integration for intelligent incident summarization
"""

import google.generativeai as genai
from typing import Dict, Any, Optional
import json
import asyncio
from functools import partial

from app.config import settings


class GeminiClient:
    """
    Client for Google Gemini AI API.
    Provides intelligent summarization of forensic reports and incidents.
    Uses gemini-pro model with temperature 0.2 for consistent analysis.
    """
    
    def __init__(self):
        self.model = None
        self.is_configured = False
        self._configure()
    
    def _configure(self):
        """Configure Gemini API with credentials"""
        if settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                # Configure model with temperature 0.2 for consistent, factual output
                generation_config = genai.types.GenerationConfig(
                    temperature=0.2,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=2048
                )
                self.model = genai.GenerativeModel(
                    'gemini-pro',
                    generation_config=generation_config
                )
                self.is_configured = True
                print("[GEMINI] API configured successfully (temperature=0.2)")
            except Exception as e:
                print(f"[GEMINI] Configuration error: {e}")
                self.is_configured = False
    
    async def summarize_incident(
        self,
        incident: Dict[str, Any],
        forensic_data: Dict[str, Any]
    ) -> str:
        """
        Generate an AI summary of an incident with forensic data.
        Returns a structured summary with remediation recommendations.
        
        Prompt format: "Summarize forensic snapshot for IR analysis. 
        Provide remediation in 5 bullets."
        """
        if not self.is_configured or not self.model:
            return self._generate_fallback_summary(incident, forensic_data)
        
        try:
            prompt = self._build_summary_prompt(incident, forensic_data)
            
            # Run generation in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                partial(self.model.generate_content, prompt)
            )
            
            if response and response.text:
                return response.text
            else:
                return self._generate_fallback_summary(incident, forensic_data)
                
        except Exception as e:
            print(f"[GEMINI] Summarization error: {e}")
            return self._generate_fallback_summary(incident, forensic_data)
    
    def _build_summary_prompt(
        self,
        incident: Dict[str, Any],
        forensic_data: Dict[str, Any]
    ) -> str:
        """
        Build the prompt for Gemini to summarize the incident.
        Core prompt: "Summarize forensic snapshot for IR analysis. Provide remediation in 5 bullets."
        """
        
        # Extract key information
        incident_type = incident.get("type", incident.get("threat_type", "Unknown"))
        severity = incident.get("severity", "Unknown")
        description = incident.get("description", "No description available")
        timestamp = incident.get("timestamp", incident.get("created_at", "Unknown"))
        anomaly_score = incident.get("anomaly_score", 0)
        ml_flagged = incident.get("ml_flagged", False)
        
        # Format forensic data summary
        system_info = forensic_data.get("system_info", {})
        processes = forensic_data.get("processes", [])
        connections = forensic_data.get("connections", [])
        packet_data = forensic_data.get("packet_data", [])
        indicators = forensic_data.get("suspicious_indicators", [])
        
        # Top processes by CPU
        top_processes = sorted(processes[:5], key=lambda x: x.get('cpu_percent', 0), reverse=True) if processes else []
        
        prompt = f"""
You are a Senior SOC (Security Operations Center) Analyst. 
Summarize this forensic snapshot for Incident Response (IR) analysis. 
Provide remediation in 5 bullets.

=== INCIDENT DETAILS ===
Incident Type: {incident_type}
Severity Level: {severity.upper()}
Description: {description}
Detection Time: {timestamp}
Status: {incident.get("status", "active")}
ML Anomaly Score: {anomaly_score:.2f}
ML Flagged: {"Yes" if ml_flagged else "No"}

=== SYSTEM STATE AT CAPTURE ===
CPU Usage: {system_info.get("cpu_percent", "N/A")}%
Memory Usage: {system_info.get("memory_percent", "N/A")}%
Disk Usage: {system_info.get("disk_percent", "N/A")}%
System Uptime: {system_info.get("uptime_hours", "N/A")} hours

=== TOP PROCESSES (by CPU) ===
{json.dumps(top_processes, indent=2) if top_processes else "No process data available"}

=== NETWORK CONNECTIONS ===
Active Connections: {len(connections)}
{json.dumps(connections[:5], indent=2) if connections else "No connection data available"}

=== PACKET CAPTURE SUMMARY ===
{json.dumps(packet_data[:3], indent=2) if packet_data else "No packet data available"}

=== INDICATORS OF COMPROMISE (IOCs) ===
{chr(10).join([f"- {i}" for i in indicators]) if indicators else "None identified"}

=== REQUIRED OUTPUT ===
Please provide a structured analysis with:

1. **Executive Summary** (2-3 sentences for management briefing)

2. **Technical Analysis** (What happened, attack vector, affected components)

3. **Impact Assessment** (What systems/data may be compromised, business impact)

4. **Remediation Recommendations** (Exactly 5 specific, actionable bullet points)

5. **Prevention Measures** (How to prevent this type of incident in the future)

Format your response in clear markdown with the headers above.
Be specific and actionable. Avoid generic advice.
"""
        return prompt
    
    async def analyze_threat_pattern(
        self,
        events: list,
        incident_type: str
    ) -> str:
        """Analyze a pattern of events for threat intelligence"""
        if not self.is_configured or not self.model:
            return "AI analysis unavailable - API not configured"
        
        try:
            events_summary = json.dumps(events[:10], indent=2, default=str)
            
            prompt = f"""
You are a Threat Intelligence Analyst reviewing security events.
Analyze these events for patterns indicative of: {incident_type}

=== EVENTS DATA ===
{events_summary}

=== ANALYSIS REQUIRED ===
1. **Pattern Confidence** (Low/Medium/High) with justification
2. **Attack Stage** (Reconnaissance/Initial Access/Execution/Persistence/Exfiltration)
3. **Threat Actor TTPs** (Techniques, Tactics, Procedures observed)
4. **Immediate Actions** (3 specific steps to take now)
5. **MITRE ATT&CK Mapping** (Relevant technique IDs if applicable)

Be specific and reference actual data from the events.
"""
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                partial(self.model.generate_content, prompt)
            )
            
            return response.text if response and response.text else "Analysis unavailable"
            
        except Exception as e:
            print(f"[GEMINI] Pattern analysis error: {e}")
            return f"Analysis error: {str(e)}"
    
    def _generate_fallback_summary(
        self,
        incident: Dict[str, Any],
        forensic_data: Dict[str, Any]
    ) -> str:
        """Generate a basic summary when Gemini is unavailable"""
        incident_type = incident.get("type", incident.get("threat_type", "Unknown"))
        severity = incident.get("severity", "Unknown")
        anomaly_score = incident.get("anomaly_score", 0)
        
        indicators = forensic_data.get("suspicious_indicators", [])
        recommendations = forensic_data.get("recommended_actions", [])
        system_info = forensic_data.get("system_info", {})
        
        summary = f"""
## Incident Summary

**Type:** {incident_type}
**Severity:** {severity.upper()}
**Status:** {incident.get("status", "Active")}
**ML Anomaly Score:** {anomaly_score:.2f}

### Executive Summary
A {severity} severity {incident_type} incident has been detected and requires immediate attention. The automated forensic capture has collected system state data for analysis.

### Technical Analysis
{incident.get("description", "Incident detected by automated monitoring system.")}

### Indicators of Compromise
{chr(10).join([f"- {i}" for i in indicators]) if indicators else "- None identified"}

### System State at Detection
- **CPU:** {system_info.get("cpu_percent", "N/A")}%
- **Memory:** {system_info.get("memory_percent", "N/A")}%
- **Disk:** {system_info.get("disk_percent", "N/A")}%
- **Active Processes:** {len(forensic_data.get("processes", []))}
- **Network Connections:** {len(forensic_data.get("connections", []))}

### Remediation Recommendations
{chr(10).join([f"{i+1}. {r}" for i, r in enumerate(recommendations[:5])]) if recommendations else "1. Follow standard incident response procedures"}

### Prevention Measures
1. Review and update detection rules
2. Implement additional monitoring for this attack type
3. Conduct security awareness training
4. Review access controls and permissions
5. Update incident response playbook

---
*Note: This is an automated summary. AI-powered analysis is currently unavailable.*
"""
        return summary


# Global Gemini client instance
gemini_client = GeminiClient()
