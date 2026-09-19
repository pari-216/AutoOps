/**
 * AutoOps Centralized Legal & Trust Configuration
 *
 * Central source of truth for versioning, dates, and legal contact placeholders.
 * Update this file when revising terms or privacy policy versions.
 */

export const LEGAL_CONFIG = {
  appName: "AutoOps",
  companyLegalName: "[COMPANY LEGAL NAME]",
  contactEmail: "[CONTACT EMAIL]",
  businessAddress: "[BUSINESS ADDRESS]",
  governingJurisdiction: "[GOVERNING LAW / JURISDICTION TO BE CONFIRMED]",
  currentTermsVersion: "1.0",
  currentPrivacyVersion: "1.0",
  lastUpdated: "September 19, 2026",
  effectiveDate: "September 19, 2026",
} as const;

export type LegalConfig = typeof LEGAL_CONFIG;
