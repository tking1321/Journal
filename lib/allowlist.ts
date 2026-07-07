export const PERMANENT_ACCESS_EMAILS: string[] = [
  'tylerking04@gmail.com',
];

export function isPermanentAccessEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return PERMANENT_ACCESS_EMAILS.includes(email.toLowerCase().trim());
}
