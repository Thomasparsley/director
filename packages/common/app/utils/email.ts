export function isEmail(value: string): boolean {
  // Trim any leading/trailing whitespace
  const trimmedValue = value.trim();

  // Check if string is empty after trimming
  if (!trimmedValue) {
    return false;
  }

  // Split the email into local part and domain part
  const parts = trimmedValue.split("@");
  if (parts.length !== 2) {
    return false; // Must have exactly one @ symbol
  }

  const [localPart, domainPart] = parts;

  // Check local part
  if (!localPart
    || localPart.startsWith(".")
    || localPart.endsWith(".")
    || localPart.includes("..")
    || /^_+$/.test(localPart)) {
    return false;
  }

  // Check domain part
  if (!domainPart
    || domainPart.startsWith(".")
    || domainPart.startsWith("-")
    || domainPart.endsWith(".")
    || domainPart.endsWith("-")
    || domainPart.includes("..")
    || domainPart.includes("_")) {
    return false;
  }

  // Check if domain is just an IP address (123.123.123.123 format)
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domainPart)) {
    return false;
  }

  // Ensure domain has at least one dot (TLD check)
  if (!domainPart.includes(".")) {
    return false;
  }

  // Basic format check with regex
  const basicFormatRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  return basicFormatRegex.test(trimmedValue);
}
