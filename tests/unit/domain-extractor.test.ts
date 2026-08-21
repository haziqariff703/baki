import { describe, it, expect } from 'vitest';
import {
  extractEmailDomain,
  resolveUniversityDomain,
} from '@/features/settings/domainExtractor';

describe('Malaysian University & Email Domain Resolver (§1.1 / §2.1)', () => {
  it('extracts domain correctly from email addresses and URLs', () => {
    expect(extractEmailDomain('haziq@siswa.um.edu.my')).toBe('siswa.um.edu.my');
    expect(extractEmailDomain('student@graduate.utm.my')).toBe('graduate.utm.my');
    expect(extractEmailDomain('user@gmail.com')).toBe('gmail.com');
    expect(extractEmailDomain('https://taylors.edu.my/programs')).toBe('taylors.edu.my');
    expect(extractEmailDomain('')).toBe('');
  });

  it('recognizes Malaysian public university domains (UM, UTM, UiTM, UKM, USM)', () => {
    const um = resolveUniversityDomain('haziq@siswa.um.edu.my');
    expect(um.isEdu).toBe(true);
    expect(um.institutionName).toBe('Universiti Malaya');
    expect(um.shortCode).toBe('UM');

    const utm = resolveUniversityDomain('student@utm.my');
    expect(utm.isEdu).toBe(true);
    expect(utm.institutionName).toBe('Universiti Teknologi Malaysia');
    expect(utm.shortCode).toBe('UTM');

    const uitm = resolveUniversityDomain('ali@isiswa.uitm.edu.my');
    expect(uitm.isEdu).toBe(true);
    expect(uitm.institutionName).toBe('Universiti Teknologi MARA');
    expect(uitm.shortCode).toBe('UiTM');
  });

  it('recognizes Malaysian private university domains (Sunway, Taylor, MMU, Monash)', () => {
    const sunway = resolveUniversityDomain('student@imail.sunway.edu.my');
    expect(sunway.isEdu).toBe(true);
    expect(sunway.institutionName).toBe('Sunway University');

    const taylors = resolveUniversityDomain('student@sd.taylors.edu.my');
    expect(taylors.isEdu).toBe(true);
    expect(taylors.institutionName).toBe("Taylor's University");

    const mmu = resolveUniversityDomain('student@mmu.edu.my');
    expect(mmu.isEdu).toBe(true);
    expect(mmu.institutionName).toBe('Multimedia University');
  });

  it('handles standard non-educational domains correctly (Gmail, Outlook, Yahoo)', () => {
    const gmail = resolveUniversityDomain('user@gmail.com');
    expect(gmail.isEdu).toBe(false);
    expect(gmail.institutionName).toBeNull();

    const yahoo = resolveUniversityDomain('user@yahoo.com');
    expect(yahoo.isEdu).toBe(false);
  });

  it('identifies generic .edu.my domains as Malaysian higher education', () => {
    const generic = resolveUniversityDomain('lecturer@newcollege.edu.my');
    expect(generic.isEdu).toBe(true);
    expect(generic.institutionName).toBe('Malaysian Higher Education');
  });
});
