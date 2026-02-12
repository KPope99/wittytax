// NTA 2025 Business Types and Tax Incentives

export type BusinessSector =
  | 'general'
  | 'agriculture'
  | 'mining'
  | 'manufacturing'
  | 'gas_utilization'
  | 'export_oriented'
  | 'renewable_energy'
  | 'technology'
  | 'healthcare'
  | 'professional_services';

export interface BusinessTypeInfo {
  id: BusinessSector;
  name: string;
  description: string;
  taxIncentives: TaxIncentive[];
  ediEligible: boolean;
  ediDetails?: string;
}

export interface TaxIncentive {
  name: string;
  type: 'exemption' | 'credit' | 'deduction' | 'holiday';
  duration?: string;
  rate?: string;
  description: string;
  requirements?: string[];
  qceThreshold?: number; // Qualifying Capital Expenditure threshold
}

// Economic Development Incentive (EDI) - Replaces Pioneer Status
export const EDI_INFO = {
  name: 'Economic Development Incentive (EDI)',
  description: 'NTA 2025 replaces Pioneer Status with EDI - a credit-based system focused on actual capital investment in priority sectors.',
  creditRate: '5% per year',
  maxDuration: '5 years',
  totalCredit: '25% of qualifying capital expenditure',
  keyChange: 'Shift from blanket tax exemptions to targeted, performance-based tax credits',
};

export const BUSINESS_TYPES: BusinessTypeInfo[] = [
  {
    id: 'general',
    name: 'General Business',
    description: 'Standard business operations not in a specific incentive sector',
    taxIncentives: [
      {
        name: 'Small Company Exemption',
        type: 'exemption',
        rate: '0% CIT',
        description: 'Companies with turnover ≤₦100M and fixed assets <₦250M pay no corporate income tax and are exempt from 4% Development Levy',
        requirements: ['Annual turnover not exceeding ₦100 million', 'Fixed assets below ₦250 million', 'Not a professional service provider'],
      },
    ],
    ediEligible: false,
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Agro-Processing',
    description: 'Crop production, livestock, aquaculture, forestry, dairy, cocoa processing, animal feeds manufacturing',
    taxIncentives: [
      {
        name: 'Agricultural Tax Holiday',
        type: 'holiday',
        duration: '5 years (extendable to 10)',
        rate: '100% exemption',
        description: 'Complete income tax exemption for the first 5 years. Extendable to 10 years if 100% of profits are reinvested in expansion.',
        requirements: ['Engaged in agricultural business (crop production, livestock, aquaculture)', 'New company or new agricultural venture', 'For extension: reinvest 100% of profits into expansion'],
      },
      {
        name: 'Agribusiness Small Company Relief',
        type: 'exemption',
        rate: '0% CIT',
        description: 'Agribusinesses with turnover ≤₦100M are exempt from Companies Income Tax (same threshold as general small company exemption)',
        requirements: ['Annual turnover not exceeding ₦100 million', 'Engaged in agricultural activities'],
      },
      {
        name: 'Withholding Tax Exemption',
        type: 'exemption',
        rate: '0% WHT',
        description: 'Agricultural businesses exempt from WHT deductions on their income, improving cash flow',
        requirements: ['Registered agricultural business', 'Income from agricultural activities'],
      },
      {
        name: 'VAT Zero-Rating',
        type: 'exemption',
        rate: '0% VAT (input recoverable)',
        description: 'Basic food items are zero-rated under NTA 2025, allowing recovery of input VAT on agricultural supplies',
        requirements: ['Production of basic food items', 'Proper VAT registration and documentation'],
      },
      {
        name: 'EDI Tax Credit',
        type: 'credit',
        duration: '5 years',
        rate: '5% per year on QCE',
        description: 'Additional 5% annual tax credit on qualifying capital expenditure for agro-processing (total 25% over 5 years)',
        requirements: ['Minimum qualifying capital expenditure', 'Investment in processing facilities'],
        qceThreshold: 100000000,
      },
    ],
    ediEligible: true,
    ediDetails: 'Agro-processing companies can claim EDI credits on processing equipment, storage facilities, and cold chain infrastructure. This is SEPARATE from the tax holiday - companies can benefit from both.',
  },
  {
    id: 'mining',
    name: 'Mining & Solid Minerals',
    description: 'Coal, limestone, barite, bitumen, bentonite, lead, zinc, iron ore, gold, lithium, and other solid minerals',
    taxIncentives: [
      {
        name: 'Mining Tax Holiday',
        type: 'holiday',
        duration: '3 years',
        rate: '100% exemption',
        description: 'New mining companies exempt from tax for the first 3 years',
        requirements: ['New company engaged in mining of solid minerals', 'Valid mining license'],
      },
      {
        name: 'EDI Tax Credit',
        type: 'credit',
        duration: '5 years',
        rate: '5% per year on QCE',
        description: 'Tax credit on capital expenditure for mineral processing facilities',
        requirements: ['Processing of specified minerals', 'Meeting QCE thresholds'],
        qceThreshold: 500000000,
      },
    ],
    ediEligible: true,
    ediDetails: 'Priority minerals include coal, limestone, barite, bitumen, bentonite, lead, zinc, iron ore, gold, and lithium. Higher QCE thresholds apply.',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & Production',
    description: 'Petroleum refining, chemicals, pharmaceuticals, textiles, waste treatment, electric motors, batteries, agricultural machinery',
    taxIncentives: [
      {
        name: 'EDI Tax Credit',
        type: 'credit',
        duration: '5 years',
        rate: '5% per year on QCE',
        description: 'Annual tax credit of 5% on qualifying capital expenditure for up to 5 years (total 25%)',
        requirements: ['Investment in manufacturing facilities', 'Meeting sector-specific QCE thresholds', 'Local value addition'],
        qceThreshold: 200000000,
      },
      {
        name: 'Accelerated Capital Allowances',
        type: 'deduction',
        rate: '95% first year',
        description: 'Claim up to 95% of plant and machinery cost in the first year',
        requirements: ['Investment in manufacturing equipment', 'Proper documentation'],
      },
    ],
    ediEligible: true,
    ediDetails: 'Target sectors: petroleum refining, chemicals, pharmaceuticals, textiles, waste treatment, electric motors and batteries, agricultural machinery.',
  },
  {
    id: 'renewable_energy',
    name: 'Renewable Energy',
    description: 'Solar, wind, hydro, biomass energy production and equipment manufacturing',
    taxIncentives: [
      {
        name: 'EDI Tax Credit (Enhanced)',
        type: 'credit',
        duration: '5 years',
        rate: '5% per year on QCE',
        description: 'Newly added to EDI priority sectors under NTA 2025',
        requirements: ['Investment in renewable energy production', 'Manufacturing of renewable energy equipment'],
        qceThreshold: 150000000,
      },
      {
        name: 'Green Investment Allowance',
        type: 'deduction',
        rate: '100% deduction',
        description: 'Full deduction of investment in qualifying green energy assets',
        requirements: ['Certified renewable energy project', 'Environmental compliance'],
      },
    ],
    ediEligible: true,
    ediDetails: 'Renewable energy manufacturing is a newly added priority sector under NTA 2025 EDI scheme.',
  },
  {
    id: 'gas_utilization',
    name: 'Gas Utilization',
    description: 'Downstream gas operations, LNG, gas-to-liquids, gas distribution',
    taxIncentives: [
      {
        name: 'Gas Tax Holiday',
        type: 'holiday',
        duration: '5 years (extendable)',
        rate: '100% exemption',
        description: 'Tax-free period of up to 5 years, with possible extension',
        requirements: ['Engaged in gas utilization (downstream)', 'NNPC/DPR approval'],
      },
      {
        name: 'Investment Tax Credit',
        type: 'credit',
        rate: '15%',
        description: 'Tax credit on qualifying gas infrastructure investment',
        requirements: ['Investment in gas processing/distribution infrastructure'],
      },
    ],
    ediEligible: false,
    ediDetails: 'Gas utilization has its own incentive regime separate from EDI.',
  },
  {
    id: 'export_oriented',
    name: 'Export-Oriented Business',
    description: 'Companies in Export Processing Zones (EPZ) or Free Trade Zones (FTZ), or exporting 75%+ of goods/services',
    taxIncentives: [
      {
        name: 'EPZ/FTZ Tax Exemption',
        type: 'exemption',
        rate: '100% exemption',
        description: 'Complete tax exemption for companies in EPZ/FTZ exporting at least 75% of production',
        requirements: ['Located in registered EPZ or FTZ', 'Export at least 75% of goods/services'],
      },
      {
        name: 'Export Tax Holiday',
        type: 'holiday',
        duration: '3 years',
        rate: '100% exemption',
        description: '100% export-oriented companies outside EPZ may enjoy 3-year tax holiday',
        requirements: ['100% of output for export', 'Not located in EPZ/FTZ', 'Meet specific export criteria'],
      },
      {
        name: 'Export Expansion Grant',
        type: 'credit',
        rate: 'Up to 30% of export value',
        description: 'Cash grant based on export performance',
        requirements: ['Registered exporter', 'Qualifying export products'],
      },
    ],
    ediEligible: false,
  },
  {
    id: 'technology',
    name: 'Technology & Innovation',
    description: 'Software development, IT services, fintech, data centers, tech startups',
    taxIncentives: [
      {
        name: 'R&D Tax Deduction',
        type: 'deduction',
        rate: '120%',
        description: 'Claim 120% of qualifying R&D expenses',
        requirements: ['Qualifying R&D activities', 'Proper documentation of R&D spend'],
      },
      {
        name: 'Tech Startup Exemption',
        type: 'exemption',
        rate: '0% for small companies',
        description: 'Small tech companies (turnover ≤₦100M) exempt from CIT and 4% Development Levy',
        requirements: ['Small company classification', 'Not a professional service provider'],
      },
    ],
    ediEligible: false,
    ediDetails: 'Technology companies can benefit from R&D incentives but are not in the core EDI priority sectors.',
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Pharmaceuticals',
    description: 'Pharmaceutical manufacturing, medical devices, hospital services',
    taxIncentives: [
      {
        name: 'Pharmaceutical EDI Credit',
        type: 'credit',
        duration: '5 years',
        rate: '5% per year on QCE',
        description: 'Tax credit for pharmaceutical manufacturing facilities',
        requirements: ['Pharmaceutical manufacturing license', 'Minimum capital investment'],
        qceThreshold: 100000000,
      },
      {
        name: 'Local Drug Manufacturing Incentive',
        type: 'deduction',
        rate: '150%',
        description: 'Enhanced deduction for local drug production costs',
        requirements: ['NAFDAC registration', 'Local manufacturing'],
      },
    ],
    ediEligible: true,
    ediDetails: 'Pharmaceuticals is a priority sector under EDI with focus on local drug manufacturing.',
  },
  {
    id: 'professional_services',
    name: 'Professional Services',
    description: 'Legal, accounting, consulting, engineering, and other professional services',
    taxIncentives: [],
    ediEligible: false,
    ediDetails: 'Professional services are explicitly excluded from small company exemption and most tax incentive programs.',
  },
];

export function getBusinessTypeById(id: BusinessSector): BusinessTypeInfo | undefined {
  return BUSINESS_TYPES.find(bt => bt.id === id);
}

export function getEDIEligibleSectors(): BusinessTypeInfo[] {
  return BUSINESS_TYPES.filter(bt => bt.ediEligible);
}
