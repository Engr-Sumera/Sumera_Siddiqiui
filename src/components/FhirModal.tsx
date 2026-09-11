import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Download } from 'lucide-react';
import { PatientInfo, VitalsReading } from '../types';

interface FhirModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientInfo;
  currentVitals: VitalsReading;
}

export const FhirModal: React.FC<FhirModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentVitals
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const now = new Date().toISOString();
  const fhirBundle = {
    resourceType: 'Bundle',
    id: `vital-bundle-${patient.id}-${Date.now()}`,
    type: 'collection',
    timestamp: now,
    entry: [
      {
        fullUrl: `urn:uuid:patient-${patient.id}`,
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [{ system: 'http://hospital.example.org/patients', value: patient.id }],
          name: [{ text: patient.name }],
          active: true
        }
      },
      {
        fullUrl: `urn:uuid:obs-hr-${Date.now()}`,
        resource: {
          resourceType: 'Observation',
          status: 'preliminary',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs'
                }
              ]
            }
          ],
          code: {
            coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }]
          },
          subject: { reference: `Patient/${patient.id}` },
          effectiveDateTime: now,
          valueQuantity: {
            value: Math.round(currentVitals.hr),
            unit: 'beats/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min'
          }
        }
      },
      {
        fullUrl: `urn:uuid:obs-spo2-${Date.now()}`,
        resource: {
          resourceType: 'Observation',
          status: 'preliminary',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs'
                }
              ]
            }
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '2708-6',
                display: 'Oxygen saturation in Arterial blood'
              }
            ]
          },
          subject: { reference: `Patient/${patient.id}` },
          effectiveDateTime: now,
          valueQuantity: {
            value: Number(currentVitals.spo2.toFixed(1)),
            unit: '%',
            system: 'http://unitsofmeasure.org',
            code: '%'
          }
        }
      },
      {
        fullUrl: `urn:uuid:obs-bp-${Date.now()}`,
        resource: {
          resourceType: 'Observation',
          status: 'preliminary',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs'
                }
              ]
            }
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: '85354-9',
                display: 'Blood pressure panel'
              }
            ]
          },
          subject: { reference: `Patient/${patient.id}` },
          effectiveDateTime: now,
          component: [
            {
              code: {
                coding: [
                  { system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }
                ]
              },
              valueQuantity: {
                value: Math.round(currentVitals.bpSys),
                unit: 'mm[Hg]',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]'
              }
            },
            {
              code: {
                coding: [
                  { system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }
                ]
              },
              valueQuantity: {
                value: Math.round(currentVitals.bpDia),
                unit: 'mm[Hg]',
                system: 'http://unitsofmeasure.org',
                code: 'mm[Hg]'
              }
            }
          ]
        }
      }
    ]
  };

  const jsonStr = JSON.stringify(fhirBundle, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-bundle-${patient.bed}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#059669]" />
            <div>
              <h3 className="text-sm font-bold text-[#0f172a]">
                HL7 / FHIR R4 Vital Signs Bundle
              </h3>
              <p className="text-[11px] text-[#64748b]">
                Standard Interoperability Spec for Bed {patient.bed} · LOINC Codes 8867-4, 2708-6, 85354-9
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          <pre className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[11px] font-mono text-[#0f172a] overflow-x-auto leading-relaxed">
            {jsonStr}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <span className="text-[11px] text-[#64748b]">
            Complies with Phase 3 PRD EHR integration via FHIR standard APIs.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] hover:bg-[#d1fae5] shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
