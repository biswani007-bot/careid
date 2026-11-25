import { Injectable, Logger } from '@nestjs/common';
import {
  CheckDrugInteractionRequestDto,
  CheckDrugInteractionResponseDto,
  DrugInteractionAlertDto,
  AllergyAlertDto,
  DuplicateTherapyAlertDto,
} from './dto/prescription.dto';

interface InteractionRule {
  drugAKeywords: string[];
  drugBKeywords: string[];
  severity: 'MAJOR' | 'MODERATE' | 'MINOR';
  clinicalDescription: string;
  recommendation: string;
  source: string;
}

interface DrugClassRule {
  className: string;
  keywords: string[];
}

@Injectable()
export class DrugInteractionService {
  private readonly logger = new Logger(DrugInteractionService.name);

  // Validated Clinical Drug-Drug Interaction Rules (Lexicomp / Micromedex aligned reference)
  private readonly interactionRules: InteractionRule[] = [
    {
      drugAKeywords: ['warfarin', 'coumadin', 'jantoven'],
      drugBKeywords: ['aspirin', 'acetylsalicylic'],
      severity: 'MAJOR',
      clinicalDescription: 'Concurrent use of warfarin and aspirin significantly increases the risk of major upper gastrointestinal and systemic hemorrhage due to dual antiplatelet and anticoagulant inhibition.',
      recommendation: 'Avoid concurrent administration unless clinically indicated (e.g. recent mechanical valve or acute coronary syndrome). If co-administered, monitor INR frequently and assess for occult bleeding.',
      source: 'CareID Clinical Knowledge Base v2.4 (Lexicomp/Micromedex Reference)',
    },
    {
      drugAKeywords: ['warfarin', 'coumadin'],
      drugBKeywords: ['ibuprofen', 'naproxen', 'diclofenac', 'ketorolac', 'meloxicam', 'indomethacin'],
      severity: 'MAJOR',
      clinicalDescription: 'NSAIDs displace warfarin from plasma proteins and inhibit platelet COX-1, dramatically compounding GI ulceration and hemorrhagic risk.',
      recommendation: 'Avoid systemic NSAIDs in anticoagulated patients. Use paracetamol/acetaminophen for analgesia where appropriate.',
      source: 'CareID Clinical Knowledge Base v2.4',
    },
    {
      drugAKeywords: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'losartan', 'valsartan', 'candesartan'],
      drugBKeywords: ['spironolactone', 'eplerenone', 'potassium chloride', 'k-dur'],
      severity: 'MAJOR',
      clinicalDescription: 'Combining renin-angiotensin-aldosterone inhibitors with potassium-sparing diuretics or potassium supplements can precipitate severe, potentially fatal cardiac hyperkalemia.',
      recommendation: 'Monitor serum potassium and renal function within 1 week of initiation and periodically thereafter. Instruct patient to avoid high potassium salt substitutes.',
      source: 'CareID Clinical Knowledge Base v2.4',
    },
    {
      drugAKeywords: ['fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'venlafaxine'],
      drugBKeywords: ['tramadol', 'linezolid', 'selegiline', 'phenelzine', 'rasagiline'],
      severity: 'MAJOR',
      clinicalDescription: 'Concurrent administration of serotonergic antidepressants with tramadol or MAOIs markedly elevates serotonin levels, provoking potentially life-threatening Serotonin Syndrome.',
      recommendation: 'Do not administer concurrently. Allow a minimum 14-day washout (5 weeks for fluoxetine) before initiating serotonergic agents with MAOIs.',
      source: 'CareID Clinical Knowledge Base v2.4',
    },
    {
      drugAKeywords: ['clopidogrel', 'plavix'],
      drugBKeywords: ['omeprazole', 'esomeprazole'],
      severity: 'MODERATE',
      clinicalDescription: 'Omeprazole inhibits CYP2C19 bioactivation of clopidogrel to its active metabolite, diminishing antiplatelet efficacy and increasing secondary thrombotic risk.',
      recommendation: 'Use pantoprazole or an H2-receptor antagonist (famotidine) which demonstrate minimal CYP2C19 inhibitory potential.',
      source: 'CareID Clinical Knowledge Base v2.4',
    },
    {
      drugAKeywords: ['sildenafil', 'viagra', 'tadalafil', 'cialis', 'vardenafil'],
      drugBKeywords: ['nitroglycerin', 'isosorbide', 'nitrostat', 'nitropaste'],
      severity: 'MAJOR',
      clinicalDescription: 'PDE-5 inhibitors potentiate the hypotensive effects of organic nitrates via cGMP accumulation, causing severe, refractory, life-threatening hypotension and syncope.',
      recommendation: 'Absolute contraindication. Nitrates must not be administered within 24 hours of sildenafil/vardenafil or within 48 hours of tadalafil.',
      source: 'CareID Clinical Knowledge Base v2.4',
    },
    {
      drugAKeywords: ['methotrexate'],
      drugBKeywords: ['ibuprofen', 'naproxen', 'diclofenac', 'trimethoprim', 'bactrim'],
      severity: 'MAJOR',
      clinicalDescription: 'NSAIDs and trimethoprim reduce renal tubular clearance of methotrexate, inducing severe pancytopenia, hepatotoxicity, and stomatitis.',
      recommendation: 'Avoid concurrent administration with antineoplastic methotrexate doses. Monitor complete blood count and renal function closely.',
      source: 'CareID Clinical Knowledge Base v2.4',
    },
    {
      drugAKeywords: ['simvastatin', 'atorvastatin', 'lovastatin'],
      drugBKeywords: ['clarithromycin', 'erythromycin', 'ketoconazole', 'itraconazole'],
      severity: 'MAJOR',
      clinicalDescription: 'Potent CYP3A4 inhibitors markedly increase statin plasma exposure, precipitating acute myopathy and life-threatening rhabdomyolysis.',
      recommendation: 'Temporarily withhold statin therapy during clarithromycin or azole antifungal treatment, or switch to rosuvastatin or pravastatin.',
      source: 'CareID Clinical Knowledge Base v2.4',
    },
    {
      drugAKeywords: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin'],
      drugBKeywords: ['prednisone', 'prednisolone', 'dexamethasone', 'methylprednisolone'],
      severity: 'MODERATE',
      clinicalDescription: 'Co-administration of fluoroquinolones with systemic corticosteroids elevates the risk of severe tendinitis and Achilles tendon rupture, especially in elderly patients.',
      recommendation: 'Avoid combination if alternative antimicrobial therapy exists. Discontinue fluoroquinolone immediately if tendon pain or inflammation occurs.',
      source: 'CareID Clinical Knowledge Base v2.4',
    },
  ];

  // Therapeutic Drug Classes for Duplicate Therapy Detection
  private readonly drugClasses: DrugClassRule[] = [
    {
      className: 'NSAIDs (Nonsteroidal Anti-inflammatory Drugs)',
      keywords: ['ibuprofen', 'naproxen', 'diclofenac', 'meloxicam', 'ketorolac', 'celecoxib', 'indomethacin'],
    },
    {
      className: 'Statins (HMG-CoA Reductase Inhibitors)',
      keywords: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin'],
    },
    {
      className: 'ACE Inhibitors / ARBs',
      keywords: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'losartan', 'valsartan', 'telmisartan'],
    },
    {
      className: 'Beta-Blockers',
      keywords: ['metoprolol', 'atenolol', 'bisoprolol', 'propranolol', 'carvedilol', 'nebivolol'],
    },
    {
      className: 'Proton Pump Inhibitors (PPIs)',
      keywords: ['omeprazole', 'pantoprazole', 'esomeprazole', 'lansoprazole', 'rabeprazole'],
    },
    {
      className: 'Benzodiazepines',
      keywords: ['diazepam', 'lorazepam', 'alprazolam', 'clonazepam', 'midazolam'],
    },
  ];

  // Drug-Allergy mapping cross-reactivity matrix
  private readonly allergyCrossReact: Record<string, string[]> = {
    penicillin: ['amoxicillin', 'ampicillin', 'penicillin', 'augmentin', 'piperacillin', 'piperacillin-tazobactam'],
    sulfa: ['sulfamethoxazole', 'bactrim', 'septra', 'sulfadiazine', 'sulfasalazine'],
    aspirin: ['aspirin', 'ibuprofen', 'naproxen', 'ketorolac', 'diclofenac'],
    nsaid: ['aspirin', 'ibuprofen', 'naproxen', 'ketorolac', 'diclofenac', 'meloxicam'],
    cephalosporin: ['cephalexin', 'ceftriaxone', 'cefuroxime', 'cefazolin', 'cefdinir'],
  };

  checkInteractions(
    dto: CheckDrugInteractionRequestDto,
    patientAllergies: string[] = [],
  ): CheckDrugInteractionResponseDto {
    const meds = dto.medications || [];
    const interactions: DrugInteractionAlertDto[] = [];
    const duplicateAlerts: DuplicateTherapyAlertDto[] = [];
    const allergyAlerts: AllergyAlertDto[] = [];

    const normalizedMeds = meds.map((m) => ({
      raw: m,
      nameLower: (m.drugName || '').toLowerCase().trim(),
    }));

    // 1. Check Drug-Drug Interactions
    for (let i = 0; i < normalizedMeds.length; i++) {
      for (let j = i + 1; j < normalizedMeds.length; j++) {
        const medA = normalizedMeds[i];
        const medB = normalizedMeds[j];

        for (const rule of this.interactionRules) {
          const aMatchesRuleA = rule.drugAKeywords.some((k) => medA.nameLower.includes(k));
          const bMatchesRuleB = rule.drugBKeywords.some((k) => medB.nameLower.includes(k));

          const aMatchesRuleB = rule.drugBKeywords.some((k) => medA.nameLower.includes(k));
          const bMatchesRuleA = rule.drugAKeywords.some((k) => medB.nameLower.includes(k));

          if ((aMatchesRuleA && bMatchesRuleB) || (aMatchesRuleB && bMatchesRuleA)) {
            interactions.push({
              drugA: medA.raw.drugName,
              drugB: medB.raw.drugName,
              severity: rule.severity,
              clinicalDescription: rule.clinicalDescription,
              recommendation: rule.recommendation,
              source: rule.source,
            });
          }
        }
      }
    }

    // 2. Check Duplicate Therapy
    for (const dClass of this.drugClasses) {
      const matched = normalizedMeds.filter((m) =>
        dClass.keywords.some((k) => m.nameLower.includes(k)),
      );
      if (matched.length > 1) {
        duplicateAlerts.push({
          drugA: matched[0].raw.drugName,
          drugB: matched[1].raw.drugName,
          therapeuticClass: dClass.className,
          warning: `Duplicate active therapy detected in class ${dClass.className}. Concurrent use of multiple agents in this therapeutic class increases toxicity without additive clinical benefit.`,
        });
      }
    }

    // 3. Check Patient Allergies
    for (const med of normalizedMeds) {
      for (const allergy of patientAllergies) {
        const allergyLower = allergy.toLowerCase().trim();
        for (const [allergyKey, drugList] of Object.entries(this.allergyCrossReact)) {
          if (allergyLower.includes(allergyKey)) {
            if (drugList.some((d) => med.nameLower.includes(d))) {
              allergyAlerts.push({
                drugName: med.raw.drugName,
                allergyMatched: allergy,
                severity: 'CRITICAL',
                reaction: `Documented patient allergy to ${allergy} conflicts with prescribed ${med.raw.drugName}. High risk of anaphylaxis or severe hypersensitivity reaction.`,
              });
            }
          }
        }
      }
    }

    const hasConflict = interactions.length > 0 || duplicateAlerts.length > 0 || allergyAlerts.length > 0;
    let severity: 'MAJOR' | 'MODERATE' | 'MINOR' | 'NONE' = 'NONE';

    if (allergyAlerts.length > 0 || interactions.some((i) => i.severity === 'MAJOR')) {
      severity = 'MAJOR';
    } else if (interactions.some((i) => i.severity === 'MODERATE') || duplicateAlerts.length > 0) {
      severity = 'MODERATE';
    } else if (interactions.length > 0) {
      severity = 'MINOR';
    }

    return {
      hasConflict,
      severity,
      interactions,
      allergyAlerts,
      duplicateTherapyAlerts: duplicateAlerts,
    };
  }
}

