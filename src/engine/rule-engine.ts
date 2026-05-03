/**
 * Rule Engine — Externalized clinical decision logic
 *
 * Maps symptoms to specialties, determines outcomes,
 * and provides configurable doctor decision rules.
 */

// ─── Symptom → Specialty Mapping ────────────────────────

export interface SymptomMapping {
  keywords: string[];
  specialty: string;
  severity_boost?: boolean; // if true, these symptoms increase severity
}

export const SYMPTOM_SPECIALTY_MAP: SymptomMapping[] = [
  {
    keywords: [
      'fever',
      'cold',
      'cough',
      'flu',
      'viral',
      'weakness',
      'fatigue',
      'body ache',
    ],
    specialty: 'General Medicine',
  },
  {
    keywords: [
      'chest pain',
      'heart',
      'palpitation',
      'blood pressure',
      'hypertension',
      'cardiac',
    ],
    specialty: 'Cardiology',
    severity_boost: true,
  },
  {
    keywords: [
      'joint pain',
      'back pain',
      'fracture',
      'bone',
      'sprain',
      'arthritis',
      'knee',
    ],
    specialty: 'Orthopedics',
  },
  {
    keywords: [
      'skin',
      'rash',
      'acne',
      'eczema',
      'allergy',
      'itching',
      'dermatitis',
    ],
    specialty: 'Dermatology',
  },
  {
    keywords: ['ear', 'nose', 'throat', 'sinus', 'tonsil', 'hearing', 'voice'],
    specialty: 'ENT',
  },
  {
    keywords: [
      'headache',
      'migraine',
      'dizziness',
      'seizure',
      'numbness',
      'nerve',
      'brain',
    ],
    specialty: 'Neurology',
    severity_boost: true,
  },
  {
    keywords: ['child', 'infant', 'baby', 'pediatric', 'vaccination', 'growth'],
    specialty: 'Pediatrics',
  },
  {
    keywords: [
      'pregnancy',
      'menstrual',
      'period',
      'gynec',
      'uterus',
      'ovary',
      'pcos',
    ],
    specialty: 'Gynecology',
  },
  {
    keywords: [
      'stomach',
      'digestion',
      'vomiting',
      'diarrhea',
      'nausea',
      'abdomen',
      'gastric',
      'acid reflux',
    ],
    specialty: 'Gastroenterology',
  },
  {
    keywords: ['eye', 'vision', 'blurry', 'cataract', 'retina'],
    specialty: 'Ophthalmology',
  },
  {
    keywords: ['diabetes', 'thyroid', 'hormone', 'insulin', 'sugar'],
    specialty: 'Endocrinology',
  },
  { keywords: ['urinary', 'kidney', 'bladder', 'urine'], specialty: 'Urology' },
];

/**
 * Match symptoms text to specialty. Returns best match or 'General Medicine'.
 */
export function mapSymptomsToSpecialty(symptomsText: string): {
  specialty: string;
  matchedKeywords: string[];
  isSevere: boolean;
} {
  const text = symptomsText.toLowerCase();
  let bestMatch = {
    specialty: 'General Medicine',
    matchedKeywords: [] as string[],
    score: 0,
    isSevere: false,
  };

  for (const mapping of SYMPTOM_SPECIALTY_MAP) {
    const matched = mapping.keywords.filter((kw) => text.includes(kw));
    if (matched.length > bestMatch.score) {
      bestMatch = {
        specialty: mapping.specialty,
        matchedKeywords: matched,
        score: matched.length,
        isSevere: mapping.severity_boost || false,
      };
    }
  }

  return {
    specialty: bestMatch.specialty,
    matchedKeywords: bestMatch.matchedKeywords,
    isSevere: bestMatch.isSevere,
  };
}

// ─── Emergency Detection ────────────────────────────────

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'heart attack',
  'stroke',
  'breathing difficulty',
  'unconscious',
  'seizure',
  'severe bleeding',
  'accident',
  'suicidal',
  'overdose',
  'poisoning',
  'choking',
  'anaphylaxis',
  'cannot breathe',
  'unbearable pain',
  'fainting',
  'collapse',
];

export function isEmergency(symptomsText: string): boolean {
  const text = symptomsText.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => text.includes(kw));
}

// ─── Severity Assessment ────────────────────────────────

export type SeverityLevel = 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export function assessSeverity(
  symptomsText: string,
  duration?: string,
): SeverityLevel {
  const text = symptomsText.toLowerCase();

  // Check explicit severity mentions
  if (
    text.includes('severe') ||
    text.includes('unbearable') ||
    text.includes('extreme')
  )
    return 'SEVERE';
  if (text.includes('moderate') || text.includes('noticeable'))
    return 'MODERATE';
  if (
    text.includes('mild') ||
    text.includes('slight') ||
    text.includes('minor')
  )
    return 'MILD';

  // Check duration-based severity
  if (duration) {
    const d = duration.toLowerCase();
    if (
      d.includes('week') ||
      d.includes('month') ||
      d.includes('year') ||
      d.includes('chronic')
    )
      return 'MODERATE';
  }

  // Check symptom-based severity
  const severeMapping = SYMPTOM_SPECIALTY_MAP.find(
    (m) => m.severity_boost && m.keywords.some((kw) => text.includes(kw)),
  );
  if (severeMapping) return 'SEVERE';

  return 'MILD';
}

// ─── Doctor Outcome Decision Engine ─────────────────────

export type OutcomeType = 'PRESCRIPTION' | 'TEST' | 'REFERRAL';

export interface OutcomeDecision {
  types: OutcomeType[];
  reasoning: string;
}

/**
 * Rule-based outcome decision engine.
 * Given symptoms + severity, decides what the consultation should produce.
 */
export function decideOutcome(
  specialty: string,
  severity: SeverityLevel,
  symptomsText: string,
): OutcomeDecision {
  const text = symptomsText.toLowerCase();

  // CRITICAL: always test + referral + prescription
  if (severity === 'CRITICAL') {
    return {
      types: ['TEST', 'PRESCRIPTION', 'REFERRAL'],
      reasoning:
        'Critical severity — full workup with specialist referral required.',
    };
  }

  // SEVERE: test + prescription, possibly referral
  if (severity === 'SEVERE') {
    const types: OutcomeType[] = ['TEST', 'PRESCRIPTION'];
    if (specialty !== 'General Medicine') {
      types.push('REFERRAL');
    }
    return {
      types,
      reasoning: 'Severe symptoms — diagnostic tests and treatment required.',
    };
  }

  // Chronic/long-duration: test required
  if (
    text.includes('chronic') ||
    text.includes('weeks') ||
    text.includes('months') ||
    text.includes('recurring')
  ) {
    return {
      types: ['TEST', 'PRESCRIPTION'],
      reasoning:
        'Chronic or recurring condition — diagnostic confirmation needed.',
    };
  }

  // Specialty-specific rules
  if (specialty === 'Cardiology' || specialty === 'Neurology') {
    return {
      types: ['TEST', 'PRESCRIPTION', 'REFERRAL'],
      reasoning: `${specialty} case — specialist workup required.`,
    };
  }

  if (specialty === 'Dermatology' || specialty === 'ENT') {
    return {
      types: ['PRESCRIPTION'],
      reasoning: 'Standard consultation — prescription treatment.',
    };
  }

  // Default: fever/cold/flu → prescription + optional test
  if (
    text.includes('fever') ||
    text.includes('cold') ||
    text.includes('cough')
  ) {
    const types: OutcomeType[] = ['PRESCRIPTION'];
    if (text.includes('high fever') || text.includes('persistent')) {
      types.push('TEST');
    }
    return {
      types,
      reasoning: 'Common ailment — prescription with optional tests.',
    };
  }

  // Moderate catch-all
  return {
    types: ['PRESCRIPTION'],
    reasoning: 'Standard consultation — prescription treatment.',
  };
}

// ─── Seed Data Constants ────────────────────────────────

export const MEDICINES_DB: {
  name: string;
  dosage: string;
  frequency: string;
  category: string;
}[] = [
  {
    name: 'Paracetamol 500mg',
    dosage: '500mg',
    frequency: 'Twice daily',
    category: 'Analgesic',
  },
  {
    name: 'Amoxicillin 250mg',
    dosage: '250mg',
    frequency: 'Thrice daily',
    category: 'Antibiotic',
  },
  {
    name: 'Cetirizine 10mg',
    dosage: '10mg',
    frequency: 'Once daily',
    category: 'Antihistamine',
  },
  {
    name: 'Omeprazole 20mg',
    dosage: '20mg',
    frequency: 'Once daily (before breakfast)',
    category: 'Antacid',
  },
  {
    name: 'Ibuprofen 400mg',
    dosage: '400mg',
    frequency: 'Twice daily (after meals)',
    category: 'NSAID',
  },
  {
    name: 'Azithromycin 500mg',
    dosage: '500mg',
    frequency: 'Once daily for 3 days',
    category: 'Antibiotic',
  },
  {
    name: 'Metformin 500mg',
    dosage: '500mg',
    frequency: 'Twice daily',
    category: 'Antidiabetic',
  },
  {
    name: 'Amlodipine 5mg',
    dosage: '5mg',
    frequency: 'Once daily',
    category: 'Antihypertensive',
  },
  {
    name: 'Montelukast 10mg',
    dosage: '10mg',
    frequency: 'Once daily at bedtime',
    category: 'Anti-asthmatic',
  },
  {
    name: 'Pantoprazole 40mg',
    dosage: '40mg',
    frequency: 'Once daily (before breakfast)',
    category: 'PPI',
  },
  {
    name: 'Dolo 650',
    dosage: '650mg',
    frequency: 'As needed (max 3/day)',
    category: 'Analgesic',
  },
  {
    name: 'Vitamin D3 60000 IU',
    dosage: '60000 IU',
    frequency: 'Once weekly',
    category: 'Supplement',
  },
  {
    name: 'Multivitamin',
    dosage: '1 tablet',
    frequency: 'Once daily',
    category: 'Supplement',
  },
  {
    name: 'ORS Packets',
    dosage: '1 sachet in 1L water',
    frequency: 'As needed',
    category: 'Rehydration',
  },
  {
    name: 'Betadine Cream',
    dosage: 'Apply topically',
    frequency: 'Twice daily',
    category: 'Antiseptic',
  },
  {
    name: 'Fluconazole 150mg',
    dosage: '150mg',
    frequency: 'Single dose',
    category: 'Antifungal',
  },
  {
    name: 'Levocetirizine 5mg',
    dosage: '5mg',
    frequency: 'Once daily',
    category: 'Antihistamine',
  },
  {
    name: 'Atorvastatin 10mg',
    dosage: '10mg',
    frequency: 'Once daily at bedtime',
    category: 'Statin',
  },
  {
    name: 'Ranitidine 150mg',
    dosage: '150mg',
    frequency: 'Twice daily',
    category: 'H2 Blocker',
  },
  {
    name: 'Diclofenac Gel',
    dosage: 'Apply topically',
    frequency: 'Thrice daily',
    category: 'Topical NSAID',
  },
];

export const DIAGNOSTIC_TESTS: {
  name: string;
  type: string;
  duration: string;
}[] = [
  { name: 'Complete Blood Count (CBC)', type: 'Blood', duration: '2 hours' },
  { name: 'Blood Sugar (Fasting)', type: 'Blood', duration: '1 hour' },
  { name: 'Blood Sugar (PP)', type: 'Blood', duration: '1 hour' },
  { name: 'Lipid Panel', type: 'Blood', duration: '4 hours' },
  { name: 'Thyroid Function (T3/T4/TSH)', type: 'Blood', duration: '6 hours' },
  { name: 'HbA1c', type: 'Blood', duration: '4 hours' },
  { name: 'Liver Function Test (LFT)', type: 'Blood', duration: '4 hours' },
  { name: 'Kidney Function Test (KFT)', type: 'Blood', duration: '4 hours' },
  { name: 'Urine Routine', type: 'Urine', duration: '1 hour' },
  { name: 'Chest X-Ray', type: 'Imaging', duration: '30 minutes' },
  { name: 'ECG', type: 'Cardiac', duration: '15 minutes' },
  { name: 'MRI Brain', type: 'Imaging', duration: '45 minutes' },
  { name: 'Ultrasound Abdomen', type: 'Imaging', duration: '30 minutes' },
  { name: 'CT Scan', type: 'Imaging', duration: '30 minutes' },
  { name: 'Vitamin D Level', type: 'Blood', duration: '6 hours' },
  { name: 'Vitamin B12 Level', type: 'Blood', duration: '6 hours' },
  { name: 'ESR', type: 'Blood', duration: '2 hours' },
  { name: 'CRP', type: 'Blood', duration: '2 hours' },
];

/**
 * Get recommended medicines for a specialty/symptoms combo.
 */
export function getRecommendedMedicines(
  specialty: string,
  symptomsText: string,
): typeof MEDICINES_DB {
  const text = symptomsText.toLowerCase();
  const meds: typeof MEDICINES_DB = [];

  if (text.includes('fever') || text.includes('pain'))
    meds.push(MEDICINES_DB[0]); // Paracetamol
  if (text.includes('infection') || text.includes('bacterial'))
    meds.push(MEDICINES_DB[1]); // Amoxicillin
  if (
    text.includes('allergy') ||
    text.includes('rash') ||
    text.includes('itching')
  )
    meds.push(MEDICINES_DB[2]); // Cetirizine
  if (
    text.includes('stomach') ||
    text.includes('acid') ||
    text.includes('gastric')
  )
    meds.push(MEDICINES_DB[3]); // Omeprazole
  if (
    text.includes('joint') ||
    text.includes('muscle') ||
    text.includes('inflammation')
  )
    meds.push(MEDICINES_DB[4]); // Ibuprofen
  if (text.includes('cough') || text.includes('cold') || text.includes('flu')) {
    meds.push(MEDICINES_DB[0]); // Paracetamol
    meds.push(MEDICINES_DB[2]); // Cetirizine
  }
  if (text.includes('diabetes') || text.includes('sugar'))
    meds.push(MEDICINES_DB[6]); // Metformin
  if (text.includes('blood pressure') || text.includes('hypertension'))
    meds.push(MEDICINES_DB[7]); // Amlodipine

  // Ensure at least one medicine
  if (meds.length === 0) {
    meds.push(MEDICINES_DB[0]); // Default: Paracetamol
    meds.push(MEDICINES_DB[12]); // + Multivitamin
  }

  // Deduplicate
  const unique = meds.filter(
    (m, i, arr) => arr.findIndex((x) => x.name === m.name) === i,
  );
  return unique;
}

/**
 * Get recommended tests based on symptoms/severity.
 */
export function getRecommendedTests(
  symptomsText: string,
  severity: SeverityLevel,
): typeof DIAGNOSTIC_TESTS {
  const text = symptomsText.toLowerCase();
  const tests: typeof DIAGNOSTIC_TESTS = [];

  // Always CBC for moderate+
  if (severity !== 'MILD') tests.push(DIAGNOSTIC_TESTS[0]); // CBC

  if (text.includes('fever')) {
    tests.push(DIAGNOSTIC_TESTS[0]); // CBC
    tests.push(DIAGNOSTIC_TESTS[16]); // ESR
  }
  if (text.includes('diabetes') || text.includes('sugar')) {
    tests.push(DIAGNOSTIC_TESTS[1]); // Blood Sugar
    tests.push(DIAGNOSTIC_TESTS[5]); // HbA1c
  }
  if (text.includes('thyroid')) tests.push(DIAGNOSTIC_TESTS[4]);
  if (text.includes('chest') || text.includes('heart')) {
    tests.push(DIAGNOSTIC_TESTS[9]); // X-Ray
    tests.push(DIAGNOSTIC_TESTS[10]); // ECG
  }
  if (
    text.includes('headache') ||
    text.includes('brain') ||
    text.includes('seizure')
  ) {
    tests.push(DIAGNOSTIC_TESTS[11]); // MRI Brain
  }
  if (text.includes('stomach') || text.includes('abdomen')) {
    tests.push(DIAGNOSTIC_TESTS[12]); // Ultrasound
  }

  if (tests.length === 0) {
    tests.push(DIAGNOSTIC_TESTS[0]); // Default: CBC
  }

  const unique = tests.filter(
    (t, i, arr) => arr.findIndex((x) => x.name === t.name) === i,
  );
  return unique;
}
