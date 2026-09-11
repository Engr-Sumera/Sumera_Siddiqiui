import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.warn("Failed to initialize GoogleGenAI:", e);
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
      engineVersion: "Phase 1.0 (MVP + Profiling Agent)",
      slaLatencyMaxMs: 2000
    });
  });

  // API Route: Ingest Vital Sign Stream Packet (REST Ingestion API)
  app.post("/api/vitals/ingest", (req, res) => {
    const startTime = Date.now();
    const packet = req.body;

    if (!packet || typeof packet !== 'object') {
      return res.status(400).json({ error: "Invalid payload: vital packet must be an object" });
    }

    const latencyMs = Date.now() - startTime;
    return res.json({
      status: "ingested",
      receivedAt: new Date().toISOString(),
      processingLatencyMs: latencyMs,
      slaCompliant: latencyMs < 2000,
      packetEcho: {
        patientId: packet.patientId || "4471-B",
        hr: packet.hr,
        spo2: packet.spo2,
        bpSys: packet.bpSys,
        bpDia: packet.bpDia
      }
    });
  });

  // API Route: FHIR R4 Bundle Export
  app.get("/api/fhir/patient/:patientId", (req, res) => {
    const patientId = req.params.patientId || "4471-B";
    const now = new Date().toISOString();

    const fhirBundle = {
      resourceType: "Bundle",
      id: `vital-bundle-${Date.now()}`,
      type: "collection",
      timestamp: now,
      entry: [
        {
          fullUrl: `urn:uuid:patient-${patientId}`,
          resource: {
            resourceType: "Patient",
            id: patientId,
            identifier: [{ system: "http://hospital.example.org/patients", value: patientId }],
            active: true
          }
        },
        {
          fullUrl: `urn:uuid:obs-hr-${Date.now()}`,
          resource: {
            resourceType: "Observation",
            status: "preliminary",
            category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
            code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
            subject: { reference: `Patient/${patientId}` },
            effectiveDateTime: now,
            valueQuantity: { value: Number(req.query.hr) || 75, unit: "beats/minute", system: "http://unitsofmeasure.org", code: "/min" }
          }
        },
        {
          fullUrl: `urn:uuid:obs-spo2-${Date.now()}`,
          resource: {
            resourceType: "Observation",
            status: "preliminary",
            category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
            code: { coding: [{ system: "http://loinc.org", code: "2708-6", display: "Oxygen saturation in Arterial blood" }] },
            subject: { reference: `Patient/${patientId}` },
            effectiveDateTime: now,
            valueQuantity: { value: Number(req.query.spo2) || 98.0, unit: "%", system: "http://unitsofmeasure.org", code: "%" }
          }
        },
        {
          fullUrl: `urn:uuid:obs-bp-${Date.now()}`,
          resource: {
            resourceType: "Observation",
            status: "preliminary",
            category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
            code: { coding: [{ system: "http://loinc.org", code: "85354-9", display: "Blood pressure panel with all children optional" }] },
            subject: { reference: `Patient/${patientId}` },
            effectiveDateTime: now,
            component: [
              {
                code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
                valueQuantity: { value: Number(req.query.bpSys) || 120, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
              },
              {
                code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic blood pressure" }] },
                valueQuantity: { value: Number(req.query.bpDia) || 80, unit: "mm[Hg]", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
              }
            ]
          }
        }
      ]
    };

    res.json(fhirBundle);
  });

  // API Route: AI Clinical Agent Reasoning (Gemini 3.8 Flash)
  app.post("/api/ai/clinical-analysis", async (req, res) => {
    try {
      const { patient, vitals, activeAlerts, corridor, activeProfile } = req.body;
      const ai = getAI();

      if (!ai) {
        // Fallback rule-based analysis if API key is not configured
        const isCrit = vitals.hr > 130 || vitals.hr < 45 || vitals.spo2 < 90;
        const isMod = vitals.hr > 110 || vitals.hr < 50 || vitals.spo2 < 93;
        return res.json({
          riskLevel: isCrit ? "High" : isMod ? "Moderate" : "Low",
          summary: isCrit
            ? "Critical multi-parameter physiological deviation detected. Rapid bedside clinical evaluation required."
            : isMod
            ? "Moderate deviation from baseline corridor. Monitor trend closely."
            : "Vitals are physiological and within the established personal corridor.",
          etiologies: [
            vitals.spo2 < 90 ? "Hypoxemic respiratory compromise or probe displacement" : null,
            vitals.hr > 120 ? "Tachyarrhythmia, hypovolemia, pain, or systemic stress" : null,
            vitals.hr < 50 ? "Sinus bradycardia or conduction delay" : null
          ].filter(Boolean),
          actions: [
            "Verify sensor coupling and signal plethysmograph waveform",
            vitals.spo2 < 92 ? "Assess airway patency and supplementary O2 delivery" : "Maintain continuous monitoring",
            "Review medication administration record (antiarrhythmics, sedatives, beta-blockers)"
          ],
          aiSource: "local-clinical-rules"
        });
      }

      const prompt = `You are a Clinical Decision Support AI Agent integrated into an ICU / step-down patient vital sign anomaly detector.
Analyze the following real-time patient telemetry:

Patient Profile:
- Bed ID: ${patient?.bed || '4471-B'}
- Age: ${patient?.age || 'Unknown'} ${patient?.ageUnit || 'years'}
- Chronic Condition: ${patient?.condition || 'None recorded'}
- Active Threshold Profile: ${activeProfile?.label || 'Standard Adult'} (Confidence: ${activeProfile?.confidence || 50}%)
- Personal Baseline Corridor: ${corridor ? `HR ${Math.round(corridor.hrMean - corridor.hrSD)} - ${Math.round(corridor.hrMean + corridor.hrSD)} bpm, SpO2 ~${Math.round(corridor.spo2Mean)}%` : 'Cold start (population baseline)'}

Current Real-Time Vitals:
- Heart Rate: ${vitals?.hr} bpm
- SpO2: ${vitals?.spo2}%
- Blood Pressure: ${vitals?.bpSys}/${vitals?.bpDia} mmHg
- Temperature: ${vitals?.tempC}°C
- Respiration Rate: ${vitals?.respirationRate} breaths/min
- Active Alarms: ${JSON.stringify(activeAlerts || [])}

Provide a concise, high-priority clinical assessment formatted strictly as a JSON object with keys:
{
  "riskLevel": "Low" | "Moderate" | "High",
  "summary": "1-2 sentence clinical summary of current physiological state and trajectory",
  "etiologies": ["likely differential cause 1", "likely differential cause 2"],
  "actions": ["immediate action step 1", "action step 2", "action step 3"],
  "falsePositiveSuspicion": "Low" | "Medium" | "High" (and brief 1-phrase rationale e.g. whether signal looks like motion artifact or true physiologic event)
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);
      return res.json({
        ...parsed,
        aiSource: "gemini-3.8-flash"
      });
    } catch (err: any) {
      console.error("Clinical analysis error:", err);
      return res.status(500).json({
        error: "AI analysis failed",
        message: err?.message || String(err)
      });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vital Sign Anomaly Detector server running on http://localhost:${PORT}`);
  });
}

startServer();
