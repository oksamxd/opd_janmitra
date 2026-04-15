/**
 * OPD State Machine — Deterministic workflow engine
 *
 * Controls the full lifecycle of an OPD visit including conversational
 * micro-states for member creation and guided appointment booking.
 * No state skipping allowed. Every transition is validated.
 */

export enum OpdState {
  // ─── MEMBER IDENTIFICATION ─────────────────────────────
  NEW                      = 'NEW',
  CHECK_MEMBER             = 'CHECK_MEMBER',
  CREATE_MEMBER            = 'CREATE_MEMBER',
  ASK_NAME                 = 'ASK_NAME',
  ASK_AGE                  = 'ASK_AGE',
  ASK_GENDER               = 'ASK_GENDER',
  ASK_HEIGHT               = 'ASK_HEIGHT',
  ASK_WEIGHT               = 'ASK_WEIGHT',
  ASK_BLOOD_GROUP          = 'ASK_BLOOD_GROUP',

  // ─── LEGACY REGISTRATION (kept for backwards compat) ───
  REGISTERING_NAME         = 'REGISTERING_NAME',
  REGISTERING_EMAIL        = 'REGISTERING_EMAIL',

  // ─── TRIAGE ────────────────────────────────────────────
  ID_VERIFIED              = 'ID_VERIFIED',
  TRIAGED                  = 'TRIAGED',
  EMERGENCY_CHECKED        = 'EMERGENCY_CHECKED',
  MEDICAL_RECORD_READY     = 'MEDICAL_RECORD_READY',
  CONSULTATION_DECIDED     = 'CONSULTATION_DECIDED',

  // ─── CASE + APPOINTMENT ────────────────────────────────
  CASE_CREATED             = 'CASE_CREATED',
  APPOINTMENT_INIT         = 'APPOINTMENT_INIT',
  ASK_TIME_PREFERENCE      = 'ASK_TIME_PREFERENCE',
  ASK_DATE                 = 'ASK_DATE',
  ASK_DOCTOR_PREFERENCE    = 'ASK_DOCTOR_PREFERENCE',
  SHOW_DOCTORS             = 'SHOW_DOCTORS',
  SELECT_DOCTOR            = 'SELECT_DOCTOR',
  SHOW_SLOTS               = 'SHOW_SLOTS',
  CONFIRM_BOOKING          = 'CONFIRM_BOOKING',
  DOCTOR_ASSIGNED          = 'DOCTOR_ASSIGNED',
  APPOINTMENT_BOOKED       = 'APPOINTMENT_BOOKED',

  // ─── CONSULTATION ──────────────────────────────────────
  PRE_CONSULTATION         = 'PRE_CONSULTATION',
  CONSULTATION_IN_PROGRESS = 'CONSULTATION_IN_PROGRESS',
  CONSULTATION_COMPLETED   = 'CONSULTATION_COMPLETED',
  OUTCOME_GENERATED        = 'OUTCOME_GENERATED',
  SCHEDULE_TESTS           = 'SCHEDULE_TESTS',
  ASK_DELIVERY_CONSENT     = 'ASK_DELIVERY_CONSENT',
  ASK_DELIVERY_ADDRESS     = 'ASK_DELIVERY_ADDRESS',
  FOLLOWUP_PENDING         = 'FOLLOWUP_PENDING',
  TEST_COMPLETED           = 'TEST_COMPLETED',
  CLOSED                   = 'CLOSED',
}

/**
 * Valid state transitions map.
 * Key = current state, Value = array of valid next states.
 */
const TRANSITION_MAP: Record<OpdState, OpdState[]> = {
  // Member Identification
  [OpdState.NEW]:                      [OpdState.CHECK_MEMBER, OpdState.CREATE_MEMBER, OpdState.ID_VERIFIED, OpdState.REGISTERING_NAME],
  [OpdState.CHECK_MEMBER]:             [OpdState.ID_VERIFIED, OpdState.CREATE_MEMBER],
  [OpdState.CREATE_MEMBER]:            [OpdState.ASK_NAME, OpdState.NEW],
  [OpdState.ASK_NAME]:                 [OpdState.ASK_AGE],
  [OpdState.ASK_AGE]:                  [OpdState.ASK_GENDER],
  [OpdState.ASK_GENDER]:               [OpdState.ASK_HEIGHT],
  [OpdState.ASK_HEIGHT]:               [OpdState.ASK_WEIGHT],
  [OpdState.ASK_WEIGHT]:               [OpdState.ASK_BLOOD_GROUP],
  [OpdState.ASK_BLOOD_GROUP]:          [OpdState.ID_VERIFIED],

  // Legacy Registration (kept for backward compatibility)
  [OpdState.REGISTERING_NAME]:         [OpdState.REGISTERING_EMAIL],
  [OpdState.REGISTERING_EMAIL]:        [OpdState.ID_VERIFIED],

  // Triage
  [OpdState.ID_VERIFIED]:              [OpdState.TRIAGED],
  [OpdState.TRIAGED]:                  [OpdState.EMERGENCY_CHECKED],
  [OpdState.EMERGENCY_CHECKED]:        [OpdState.MEDICAL_RECORD_READY, OpdState.CLOSED],
  [OpdState.MEDICAL_RECORD_READY]:     [OpdState.CONSULTATION_DECIDED],
  [OpdState.CONSULTATION_DECIDED]:     [OpdState.CASE_CREATED],

  // Case + Guided Appointment Flow: doctor first, then date based on availability
  [OpdState.CASE_CREATED]:             [OpdState.APPOINTMENT_INIT],
  [OpdState.APPOINTMENT_INIT]:         [OpdState.ASK_TIME_PREFERENCE],
  [OpdState.ASK_TIME_PREFERENCE]:      [OpdState.ASK_DOCTOR_PREFERENCE],
  [OpdState.ASK_DOCTOR_PREFERENCE]:    [OpdState.SHOW_DOCTORS],
  [OpdState.SHOW_DOCTORS]:             [OpdState.SELECT_DOCTOR],
  [OpdState.SELECT_DOCTOR]:            [OpdState.ASK_DATE],
  [OpdState.ASK_DATE]:                 [OpdState.SHOW_SLOTS],
  [OpdState.SHOW_SLOTS]:               [OpdState.CONFIRM_BOOKING],
  [OpdState.CONFIRM_BOOKING]:          [OpdState.DOCTOR_ASSIGNED, OpdState.SHOW_SLOTS, OpdState.ASK_DATE],
  [OpdState.DOCTOR_ASSIGNED]:          [OpdState.APPOINTMENT_BOOKED],
  [OpdState.APPOINTMENT_BOOKED]:       [OpdState.PRE_CONSULTATION],

  // Consultation
  [OpdState.PRE_CONSULTATION]:         [OpdState.CONSULTATION_IN_PROGRESS],
  [OpdState.CONSULTATION_IN_PROGRESS]: [OpdState.CONSULTATION_COMPLETED],
  [OpdState.CONSULTATION_COMPLETED]:   [OpdState.OUTCOME_GENERATED],
  [OpdState.OUTCOME_GENERATED]:        [OpdState.SCHEDULE_TESTS, OpdState.ASK_DELIVERY_CONSENT, OpdState.FOLLOWUP_PENDING, OpdState.TEST_COMPLETED],
  [OpdState.SCHEDULE_TESTS]:           [OpdState.ASK_DELIVERY_CONSENT, OpdState.ASK_DELIVERY_ADDRESS, OpdState.FOLLOWUP_PENDING, OpdState.TEST_COMPLETED],
  [OpdState.ASK_DELIVERY_CONSENT]:     [OpdState.ASK_DELIVERY_ADDRESS, OpdState.FOLLOWUP_PENDING, OpdState.TEST_COMPLETED],
  [OpdState.ASK_DELIVERY_ADDRESS]:     [OpdState.FOLLOWUP_PENDING, OpdState.TEST_COMPLETED],
  [OpdState.FOLLOWUP_PENDING]:         [OpdState.CLOSED, OpdState.APPOINTMENT_INIT, OpdState.TEST_COMPLETED],
  [OpdState.TEST_COMPLETED]:           [OpdState.FOLLOWUP_PENDING, OpdState.CLOSED, OpdState.APPOINTMENT_INIT],
  [OpdState.CLOSED]:                   [],
};

/**
 * Human-readable labels for each state.
 */
export const STATE_LABELS: Record<OpdState, string> = {
  [OpdState.NEW]:                      'Welcome',
  [OpdState.CHECK_MEMBER]:             'Member Check',
  [OpdState.CREATE_MEMBER]:            'Create Account',
  [OpdState.ASK_NAME]:                 'Your Name',
  [OpdState.ASK_AGE]:                  'Your Age',
  [OpdState.ASK_GENDER]:               'Your Gender',
  [OpdState.ASK_HEIGHT]:               'Your Height',
  [OpdState.ASK_WEIGHT]:               'Your Weight',
  [OpdState.ASK_BLOOD_GROUP]:          'Blood Group',
  [OpdState.REGISTERING_NAME]:         'Registration: Name',
  [OpdState.REGISTERING_EMAIL]:        'Registration: Email',
  [OpdState.ID_VERIFIED]:              'Identity Verified',
  [OpdState.TRIAGED]:                  'Symptoms Assessed',
  [OpdState.EMERGENCY_CHECKED]:        'Emergency Check',
  [OpdState.MEDICAL_RECORD_READY]:     'Medical Record Ready',
  [OpdState.CONSULTATION_DECIDED]:     'Consultation Type Selected',
  [OpdState.CASE_CREATED]:             'Case Created',
  [OpdState.APPOINTMENT_INIT]:         'Booking Appointment',
  [OpdState.ASK_TIME_PREFERENCE]:      'Time Preference',
  [OpdState.ASK_DATE]:                 'Appointment Date',
  [OpdState.ASK_DOCTOR_PREFERENCE]:    'Doctor Preference',
  [OpdState.SHOW_DOCTORS]:             'Available Doctors',
  [OpdState.SELECT_DOCTOR]:            'Doctor Selected',
  [OpdState.SHOW_SLOTS]:               'Available Slots',
  [OpdState.CONFIRM_BOOKING]:          'Confirm Booking',
  [OpdState.DOCTOR_ASSIGNED]:          'Doctor Assigned',
  [OpdState.APPOINTMENT_BOOKED]:       'Appointment Booked',
  [OpdState.PRE_CONSULTATION]:         'Pre-Consultation',
  [OpdState.CONSULTATION_IN_PROGRESS]: 'Consultation In Progress',
  [OpdState.CONSULTATION_COMPLETED]:   'Consultation Completed',
  [OpdState.OUTCOME_GENERATED]:        'Outcome Generated',
  [OpdState.SCHEDULE_TESTS]:           'Scheduling Tests',
  [OpdState.ASK_DELIVERY_CONSENT]:     'Pharmacy Delivery',
  [OpdState.ASK_DELIVERY_ADDRESS]:     'Delivery Address',
  [OpdState.FOLLOWUP_PENDING]:         'Follow-up / Closure',
  [OpdState.TEST_COMPLETED]:           'Diagnostic Report Review',
  [OpdState.CLOSED]:                   'Case Closed',
};

/**
 * What input the system expects at each state.
 */
export interface StateExpectation {
  prompt: string;
  inputType: 'text' | 'selection' | 'confirmation' | 'date' | 'none';
  options?: string[];
  field?: string;
}

export const STATE_EXPECTATIONS: Record<OpdState, StateExpectation> = {
  [OpdState.NEW]: {
    prompt: 'Please provide your Member ID to begin, or choose to create a new account.',
    inputType: 'text',
    field: 'memberId',
  },
  [OpdState.CHECK_MEMBER]: {
    prompt: 'Checking your membership...',
    inputType: 'none',
  },
  [OpdState.CREATE_MEMBER]: {
    prompt: 'Would you like to create a new account?',
    inputType: 'selection',
    options: ['Yes, create my account', 'No, go back'],
  },
  [OpdState.ASK_NAME]: {
    prompt: 'Please enter your full name:',
    inputType: 'text',
    field: 'newMemberName',
  },
  [OpdState.ASK_AGE]: {
    prompt: 'What is your age?',
    inputType: 'text',
    field: 'newMemberAge',
  },
  [OpdState.ASK_GENDER]: {
    prompt: 'What is your gender?',
    inputType: 'selection',
    options: ['Male', 'Female', 'Other', 'Prefer not to say'],
    field: 'newMemberGender',
  },
  [OpdState.ASK_HEIGHT]: {
    prompt: 'What is your height?',
    inputType: 'text',
    field: 'newMemberHeight',
  },
  [OpdState.ASK_WEIGHT]: {
    prompt: 'What is your weight (in kg)?',
    inputType: 'text',
    field: 'newMemberWeight',
  },
  [OpdState.ASK_BLOOD_GROUP]: {
    prompt: 'What is your blood group?',
    inputType: 'selection',
    options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'I don\'t know'],
    field: 'newMemberBloodGroup',
  },
  [OpdState.REGISTERING_NAME]: {
    prompt: 'Please enter your full name (e.g. John Doe):',
    inputType: 'text',
    field: 'newMemberName',
  },
  [OpdState.REGISTERING_EMAIL]: {
    prompt: 'Please enter your email address:',
    inputType: 'text',
    field: 'newMemberEmail',
  },
  [OpdState.ID_VERIFIED]: {
    prompt: 'Please describe your symptoms, how long you have been experiencing them, and rate the severity (mild, moderate, severe).',
    inputType: 'text',
    field: 'triageInput',
  },
  [OpdState.TRIAGED]: {
    prompt: 'Checking for emergency indicators...',
    inputType: 'none',
  },
  [OpdState.EMERGENCY_CHECKED]: {
    prompt: 'Your medical record is being prepared...',
    inputType: 'none',
  },
  [OpdState.MEDICAL_RECORD_READY]: {
    prompt: 'What type of consultation would you prefer?',
    inputType: 'selection',
    options: ['In-Person Consultation', 'Teleconsultation'],
    field: 'consultationType',
  },
  [OpdState.CONSULTATION_DECIDED]: {
    prompt: 'Creating your case...',
    inputType: 'none',
  },
  [OpdState.CASE_CREATED]: {
    prompt: 'Your case is ready. Starting appointment booking...',
    inputType: 'none',
  },
  [OpdState.APPOINTMENT_INIT]: {
    prompt: 'Let\'s book your appointment!',
    inputType: 'none',
  },
  [OpdState.ASK_TIME_PREFERENCE]: {
    prompt: 'What time of day works best for you?',
    inputType: 'selection',
    options: ['Morning (8AM–12PM)', 'Afternoon (12PM–4PM)', 'Evening (4PM–8PM)'],
    field: 'timePreference',
  },
  [OpdState.ASK_DOCTOR_PREFERENCE]: {
    prompt: 'Do you have a doctor preference?',
    inputType: 'selection',
    options: ['Show me available doctors', 'Recommend the best match'],
    field: 'doctorPreference',
  },
  [OpdState.ASK_DATE]: {
    prompt: 'Which date works for you? (based on doctor availability)',
    inputType: 'selection',
    field: 'preferredDate',
  },
  [OpdState.SHOW_DOCTORS]: {
    prompt: 'Here are available doctors. Please select one.',
    inputType: 'selection',
    field: 'selectedDoctorId',
  },
  [OpdState.SELECT_DOCTOR]: {
    prompt: 'Doctor selected. Fetching available slots...',
    inputType: 'none',
  },
  [OpdState.SHOW_SLOTS]: {
    prompt: 'Please select an available time slot.',
    inputType: 'selection',
    field: 'selectedSlotId',
  },
  [OpdState.CONFIRM_BOOKING]: {
    prompt: 'Please confirm your booking.',
    inputType: 'confirmation',
    options: ['Confirm Booking', 'Choose Different Slot'],
  },
  [OpdState.DOCTOR_ASSIGNED]: {
    prompt: 'Doctor assigned. Booking appointment...',
    inputType: 'none',
  },
  [OpdState.APPOINTMENT_BOOKED]: {
    prompt: 'Your appointment is confirmed. Preparing pre-consultation information...',
    inputType: 'none',
  },
  [OpdState.PRE_CONSULTATION]: {
    prompt: 'Are you ready to start your consultation?',
    inputType: 'confirmation',
    options: ['Start Consultation'],
    field: 'consultationReady',
  },
  [OpdState.CONSULTATION_IN_PROGRESS]: {
    prompt: 'Doctor is reviewing your case...',
    inputType: 'none',
  },
  [OpdState.CONSULTATION_COMPLETED]: {
    prompt: 'Generating outcomes from consultation...',
    inputType: 'none',
  },
  [OpdState.OUTCOME_GENERATED]: {
    prompt: 'Your consultation outcomes are ready. How would you like to proceed?',
    inputType: 'selection',
    field: 'outcomeAction',
  },
  [OpdState.SCHEDULE_TESTS]: {
    prompt: 'Scheduling tests automatically...',
    inputType: 'none',
  },
  [OpdState.ASK_DELIVERY_CONSENT]: {
    prompt: 'Would you like Janmitra to deliver the medicines securely to your door?',
    inputType: 'selection',
    options: ['Deliver to my door', 'I will get it myself'],
  },
  [OpdState.ASK_DELIVERY_ADDRESS]: {
    prompt: 'Please provide your full delivery address.',
    inputType: 'text',
    field: 'deliveryAddress',
  },
  [OpdState.FOLLOWUP_PENDING]: {
    prompt: 'Would you like to close this case or schedule a follow-up?',
    inputType: 'selection',
    options: ['Close Case', 'Schedule Follow-up'],
    field: 'followupDecision',
  },
  [OpdState.TEST_COMPLETED]: {
    prompt: 'Your laboratory reports are ready. Would you like to review them and schedule a follow-up with your doctor?',
    inputType: 'selection',
    options: ['Review My Reports', 'Schedule Follow-up Consultation'],
  },
  [OpdState.CLOSED]: {
    prompt: 'Your case has been closed. Thank you for using Jana AI. Stay healthy! 💚',
    inputType: 'none',
  },
};

/**
 * Validate whether a state transition is allowed.
 */
export function isValidTransition(from: OpdState, to: OpdState): boolean {
  const validTargets = TRANSITION_MAP[from];
  if (!validTargets) return false;
  return validTargets.includes(to);
}

/**
 * Get valid next states from current state.
 */
export function getNextStates(current: OpdState): OpdState[] {
  return TRANSITION_MAP[current] || [];
}

/**
 * Attempt a state transition. Throws if invalid.
 */
export function transition(from: OpdState, to: OpdState): OpdState {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid state transition: ${from} → ${to}. Valid targets: [${getNextStates(from).join(', ')}]`,
    );
  }
  return to;
}

/**
 * Get the progress percentage for the UI progress bar.
 * Uses the main clinical flow only (not micro-states) for progress calc.
 */
export function getProgressPercent(state: OpdState): number {
  const mainFlow = [
    OpdState.NEW,
    OpdState.ID_VERIFIED,
    OpdState.TRIAGED,
    OpdState.EMERGENCY_CHECKED,
    OpdState.MEDICAL_RECORD_READY,
    OpdState.CONSULTATION_DECIDED,
    OpdState.CASE_CREATED,
    OpdState.APPOINTMENT_BOOKED,
    OpdState.PRE_CONSULTATION,
    OpdState.CONSULTATION_IN_PROGRESS,
    OpdState.CONSULTATION_COMPLETED,
    OpdState.OUTCOME_GENERATED,
    OpdState.FOLLOWUP_PENDING,
    OpdState.CLOSED,
  ];
  const idx = mainFlow.indexOf(state);
  if (idx === -1) {
    // For micro-states, use approx range
    const microBefore = [OpdState.CHECK_MEMBER, OpdState.CREATE_MEMBER, OpdState.ASK_NAME, OpdState.ASK_AGE, OpdState.ASK_GENDER, OpdState.ASK_HEIGHT, OpdState.ASK_WEIGHT, OpdState.ASK_BLOOD_GROUP];
    const microAppt = [OpdState.APPOINTMENT_INIT, OpdState.ASK_TIME_PREFERENCE, OpdState.ASK_DATE, OpdState.ASK_DOCTOR_PREFERENCE, OpdState.SHOW_DOCTORS, OpdState.SELECT_DOCTOR, OpdState.SHOW_SLOTS, OpdState.CONFIRM_BOOKING, OpdState.DOCTOR_ASSIGNED];
    if (microBefore.includes(state)) return 5;
    if (microAppt.includes(state)) return 50;
    return 0;
  }
  return Math.round((idx / (mainFlow.length - 1)) * 100);
}

/**
 * Get all states as ordered array (for progress display).
 */
export function getAllStatesOrdered(): { state: OpdState; label: string }[] {
  return Object.values(OpdState).map((s) => ({
    state: s,
    label: STATE_LABELS[s],
  }));
}
