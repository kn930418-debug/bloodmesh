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

export const donorsFor = (recipient) =>
  BLOOD_GROUPS.filter((donor) => CAN_DONATE_TO[donor].includes(recipient));

export const RARE_GROUPS = ['O-', 'AB-'];
export const isRare = (group) => RARE_GROUPS.includes(group);

export const URGENCY_META = {
  normal: { label: 'Normal', chip: 'border-sky-400/40 bg-sky-400/10 text-sky-300', bar: 'bg-sky-400' },
  urgent: { label: 'Urgent', chip: 'border-amber-400/40 bg-amber-400/10 text-amber-300', bar: 'bg-amber-400' },
  critical: { label: 'Critical', chip: 'border-blood-500/50 bg-blood-500/15 text-blood-400', bar: 'bg-blood-500' },
};

export const COOLDOWN_DAYS = 90;

export function daysToNextDonation(lastDonationDate) {
  if (!lastDonationDate) return 0;
  const daysSince = Math.floor((Date.now() - new Date(lastDonationDate).getTime()) / 864e5);
  return Math.max(COOLDOWN_DAYS - daysSince, 0);
}
