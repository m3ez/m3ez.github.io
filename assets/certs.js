export const CATEGORIES = [
  'All',
  'Offensive',
  'Web',
  'Identity',
  'Mobile',
  'Systems',
  'Foundational',
];

export const certs = [
  {
    name: 'OSEP',
    issuer: 'OffSec',
    year: 2026,
    category: 'Offensive',
    flagship: true,
    description: 'Advanced evasion and Active Directory operations',
    verificationUrl: 'https://www.credential.net/c3607d25-4055-488f-9e75-f9e4b7a659b4',
  },
  {
    name: 'OSCP+',
    issuer: 'OffSec',
    year: 2025,
    category: 'Offensive',
    flagship: true,
    description: 'Network and infrastructure penetration testing',
    verificationUrl: 'https://credentials.offsec.com/1b595015-c060-4e65-9c75-2319d2f31554#acc.nx1uY5OR',
  },
  {
    name: 'OSWE',
    issuer: 'OffSec',
    year: 2021,
    category: 'Web',
    flagship: true,
    description: 'White-box web application exploitation',
    verificationUrl: 'https://www.credential.net/f3a526f9-acbf-4dcd-9dee-0d90c9ee9767',
  },
  {
    name: 'eWPTX',
    issuer: 'INE',
    year: 2026,
    category: 'Web',
    flagship: true,
    description: 'Advanced web application penetration testing',
    verificationUrl: 'https://www.credential.net/6d639d2a-5135-448f-8e84-fec9a16637a6',
  },
  {
    name: 'CRTP',
    issuer: 'Altered Security',
    year: 2026,
    category: 'Identity',
    flagship: true,
    description: 'Active Directory security and attacks',
    verificationUrl: 'https://www.credential.net/02e37ded-be80-4118-b483-92f224d07165',
  },
  {
    name: 'OSCP',
    issuer: 'OffSec',
    year: 2020,
    category: 'Offensive',
    flagship: false,
    description: 'Hands-on penetration testing',
    verificationUrl: 'https://credentials.offsec.com/e93ab215-7572-4ec3-90af-02b768b49266#acc.nwB0fRog',
  },
  {
    name: 'eWPT',
    issuer: 'INE',
    year: 2024,
    category: 'Web',
    flagship: false,
    description: 'Web application penetration testing',
    verificationUrl: 'https://www.credential.net/fd47acc2-d2ca-4b5d-beac-48fb6cd7619f',
  },
  {
    name: 'PMPA',
    issuer: 'TCM Security',
    year: 2024,
    category: 'Mobile',
    flagship: false,
    description: 'Mobile application penetration testing — Android',
    verificationUrl: 'https://www.credential.net/9c00a18f-4987-427e-806e-6e77da018e39',
  },
  {
    name: 'RHCSA',
    issuer: 'Red Hat',
    year: 2026,
    category: 'Systems',
    flagship: false,
    description: 'Linux systems administration',
    verificationUrl: 'https://www.credly.com/badges/d349e815-3399-4402-bfe6-669ee9b4cf4b/public_url',
  },
  {
    name: 'Ethical Hacker',
    issuer: 'Cisco',
    year: 2026,
    category: 'Foundational',
    flagship: false,
    description: 'Offensive security fundamentals',
    verificationUrl: 'https://www.credly.com/badges/5dc57b75-6252-42c2-a40b-6e84aa83c0e2/public_url',
  },
  {
    name: 'PenTest+',
    issuer: 'CompTIA',
    year: 2022,
    category: 'Foundational',
    flagship: false,
    description: 'Penetration testing methodology',
    verificationUrl: 'https://www.credly.com/badges/198b0ac2-e417-4f51-a2f4-46c2ccef7ab7/public_url',
  },
  {
    name: 'CNVP',
    issuer: 'CompTIA',
    year: 2022,
    category: 'Foundational',
    flagship: false,
    description: 'Network vulnerability assessment',
    verificationUrl: 'https://www.credly.com/badges/2fe3137e-201e-4f5f-a1f1-8221e8dc1ab6/public_url',
  },
  {
    name: 'Security+',
    issuer: 'CompTIA',
    year: 2019,
    category: 'Foundational',
    flagship: false,
    description: 'Core security concepts and operations',
    verificationUrl: 'https://www.credly.com/badges/681aca07-d656-4fa4-b4c2-787195b37fe3/public_url',
  },
];

const MONOGRAMS = new Map([
  ['OffSec', 'OffSec'],
  ['INE', 'INE'],
  ['Altered Security', 'Altered'],
  ['TCM Security', 'TCM'],
  ['Red Hat', 'RH'],
  ['Cisco', 'Cisco'],
  ['CompTIA', 'CompTIA'],
]);

export function issuerMonogram(issuer) {
  return MONOGRAMS.get(issuer) ?? issuer
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 6)
    .toUpperCase();
}
