// Donor blood groups (RBC transfusion) that can safely donate to each recipient group.
export const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const CAN_DONATE_TO = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export function donorsFor(recipientGroup) {
  return Object.keys(CAN_DONATE_TO).filter((donor) => CAN_DONATE_TO[donor].includes(recipientGroup));
}

export const RARE_GROUPS = ['O-', 'AB-'];

export const WHOLE_BLOOD_COOLDOWN_DAYS = 90;
