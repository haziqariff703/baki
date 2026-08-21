/**
 * Malaysian Higher Education & Email Domain Recognition Engine.
 *
 * Automatically extracts and matches email domains (including Google OAuth sign-in)
 * to official Malaysian public and private tertiary universities (§1.1 / §2.1).
 * Deterministic, zero-AI, privacy-preserving regex and dictionary lookup.
 */

export interface UniversityMatch {
  readonly domain: string;
  readonly canonicalName: string;
  readonly shortCode: string;
  readonly isMalaysianEdu: boolean;
}

const MALAYSIAN_UNIVERSITIES: readonly UniversityMatch[] = [
  { domain: 'um.edu.my', canonicalName: 'Universiti Malaya', shortCode: 'UM', isMalaysianEdu: true },
  { domain: 'siswa.um.edu.my', canonicalName: 'Universiti Malaya', shortCode: 'UM', isMalaysianEdu: true },
  { domain: 'utm.my', canonicalName: 'Universiti Teknologi Malaysia', shortCode: 'UTM', isMalaysianEdu: true },
  { domain: 'graduate.utm.my', canonicalName: 'Universiti Teknologi Malaysia', shortCode: 'UTM', isMalaysianEdu: true },
  { domain: 'uitm.edu.my', canonicalName: 'Universiti Teknologi MARA', shortCode: 'UiTM', isMalaysianEdu: true },
  { domain: 'isiswa.uitm.edu.my', canonicalName: 'Universiti Teknologi MARA', shortCode: 'UiTM', isMalaysianEdu: true },
  { domain: 'ukm.edu.my', canonicalName: 'Universiti Kebangsaan Malaysia', shortCode: 'UKM', isMalaysianEdu: true },
  { domain: 'siswa.ukm.edu.my', canonicalName: 'Universiti Kebangsaan Malaysia', shortCode: 'UKM', isMalaysianEdu: true },
  { domain: 'usm.my', canonicalName: 'Universiti Sains Malaysia', shortCode: 'USM', isMalaysianEdu: true },
  { domain: 'student.usm.my', canonicalName: 'Universiti Sains Malaysia', shortCode: 'USM', isMalaysianEdu: true },
  { domain: 'upm.edu.my', canonicalName: 'Universiti Putra Malaysia', shortCode: 'UPM', isMalaysianEdu: true },
  { domain: 'student.upm.edu.my', canonicalName: 'Universiti Putra Malaysia', shortCode: 'UPM', isMalaysianEdu: true },
  { domain: 'iium.edu.my', canonicalName: 'International Islamic University Malaysia', shortCode: 'IIUM', isMalaysianEdu: true },
  { domain: 'live.iium.edu.my', canonicalName: 'International Islamic University Malaysia', shortCode: 'IIUM', isMalaysianEdu: true },
  { domain: 'mmu.edu.my', canonicalName: 'Multimedia University', shortCode: 'MMU', isMalaysianEdu: true },
  { domain: 'student.mmu.edu.my', canonicalName: 'Multimedia University', shortCode: 'MMU', isMalaysianEdu: true },
  { domain: 'sunway.edu.my', canonicalName: 'Sunway University', shortCode: 'Sunway', isMalaysianEdu: true },
  { domain: 'imail.sunway.edu.my', canonicalName: 'Sunway University', shortCode: 'Sunway', isMalaysianEdu: true },
  { domain: 'taylors.edu.my', canonicalName: "Taylor's University", shortCode: "Taylor's", isMalaysianEdu: true },
  { domain: 'sd.taylors.edu.my', canonicalName: "Taylor's University", shortCode: "Taylor's", isMalaysianEdu: true },
  { domain: 'monash.edu.my', canonicalName: 'Monash University Malaysia', shortCode: 'Monash', isMalaysianEdu: true },
  { domain: 'student.monash.edu', canonicalName: 'Monash University Malaysia', shortCode: 'Monash', isMalaysianEdu: true },
  { domain: 'apu.edu.my', canonicalName: 'Asia Pacific University', shortCode: 'APU', isMalaysianEdu: true },
  { domain: 'mail.apu.edu.my', canonicalName: 'Asia Pacific University', shortCode: 'APU', isMalaysianEdu: true },
  { domain: 'tarc.edu.my', canonicalName: 'Tunku Abdul Rahman UMT', shortCode: 'TAR UMT', isMalaysianEdu: true },
  { domain: 'utar.edu.my', canonicalName: 'Universiti Tunku Abdul Rahman', shortCode: 'UTAR', isMalaysianEdu: true },
  { domain: '1utar.my', canonicalName: 'Universiti Tunku Abdul Rahman', shortCode: 'UTAR', isMalaysianEdu: true },
  { domain: 'uniten.edu.my', canonicalName: 'Universiti Tenaga Nasional', shortCode: 'UNITEN', isMalaysianEdu: true },
  { domain: 'ump.edu.my', canonicalName: 'Universiti Malaysia Pahang', shortCode: 'UMPSA', isMalaysianEdu: true },
  { domain: 'unimas.my', canonicalName: 'Universiti Malaysia Sarawak', shortCode: 'UNIMAS', isMalaysianEdu: true },
  { domain: 'ums.edu.my', canonicalName: 'Universiti Malaysia Sabah', shortCode: 'UMS', isMalaysianEdu: true },
  { domain: 'curtin.edu.my', canonicalName: 'Curtin University Malaysia', shortCode: 'Curtin', isMalaysianEdu: true },
  { domain: 'swinburne.edu.my', canonicalName: 'Swinburne University Malaysia', shortCode: 'Swinburne', isMalaysianEdu: true },
];

/**
 * Extract clean domain name from an email or web host string.
 */
export function extractEmailDomain(emailOrDomain: string): string {
  if (!emailOrDomain) return '';
  const trimmed = emailOrDomain.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed.split('@').pop()?.trim() ?? '';
  }
  return trimmed.replace(/^https?:\/\//i, '').split('/')[0].trim();
}

/**
 * Resolve domain and match against Malaysian higher education database.
 */
export function resolveUniversityDomain(emailOrDomain: string): {
  readonly domain: string;
  readonly isEdu: boolean;
  readonly institutionName: string | null;
  readonly shortCode: string | null;
} {
  const domain = extractEmailDomain(emailOrDomain);
  if (!domain) {
    return {
      domain: '',
      isEdu: false,
      institutionName: null,
      shortCode: null,
    };
  }

  // Exact or sub-domain lookup in Malaysian Universities catalog
  const match = MALAYSIAN_UNIVERSITIES.find(
    (u) => domain === u.domain || domain.endsWith(`.${u.domain}`)
  );

  if (match) {
    return {
      domain,
      isEdu: true,
      institutionName: match.canonicalName,
      shortCode: match.shortCode,
    };
  }

  // Generic .edu.my or .edu recognition
  const isEdu = domain.endsWith('.edu.my') || domain.endsWith('.edu') || domain.endsWith('.ac.my');
  return {
    domain,
    isEdu,
    institutionName: isEdu ? 'Malaysian Higher Education' : null,
    shortCode: isEdu ? 'EDU' : null,
  };
}
