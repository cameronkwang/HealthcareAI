import { UniversalInput, CoverageAmounts, ExperiencePeriods, CalculationResult } from './common';

export interface BCBSSpecificInput extends UniversalInput {
  carrierSpecificParameters: BCBSParameters;
  multiPlanData: BCBSMultiPlanData;
}

export interface BCBSParameters {
  plans: BCBSPlanParameters[];
  compositeWeighting: BCBSCompositeWeighting;
  globalSettings: BCBSGlobalSettings;
}

export interface BCBSPlanParameters {
  planId: string;
  planName: string;
  poolingLevel: number;           // e.g., $225,000
  experienceWeights: {
    current: number;              // e.g., 0.33 for Plan 1
    renewal: number;              // e.g., 0.67 for Plan 1
  };
  credibilityFactor: number;      // e.g., 1.00
  ibnrFactors: {
    medical: {
      current: number;            // e.g., 1.0000
      renewal: number;            // e.g., 1.0240
    };
    pharmacy: {
      current: number;            // e.g., 1.0000
      renewal: number;            // e.g., 1.0020
    };
  };
  trendFactors: {
    medical: {
      annualCurrent: number;      // e.g., 1.1000
      annualRenewal: number;      // e.g., 1.1003
      monthsCurrent: number;      // e.g., 35.0
      monthsRenewal: number;      // e.g., 23.0
      compoundedCurrent: number;  // e.g., 1.3235
      compoundedRenewal: number;  // e.g., 1.2010
    };
    pharmacy: {
      annualCurrent: number;      // e.g., 1.1073
      annualRenewal: number;      // e.g., 1.1136
      monthsCurrent: number;      // e.g., 35.0
      monthsRenewal: number;      // e.g., 23.0
      compoundedCurrent: number;  // e.g., 1.3462
      compoundedRenewal: number;  // e.g., 1.2290
    };
  };
  adjustmentFactors: {
    ffsAge: {
      current: number;            // e.g., 1.0375
      renewal: number;            // e.g., 1.0214
    };
    benefitAdjustment: number;    // e.g., 1.0000
    underwriterAdjustment: number; // e.g., 1.0000
    pathwayToSavings: number;     // e.g., 0.9950
  };
  retentionComponents: {
    retentionPMPM: {
      current: number;            // e.g., $93.49
      renewal: number;            // e.g., $145.11
    };
    ppoPremiumTax: {
      current: number;            // e.g., $6.48
      renewal: number;            // e.g., $9.96
    };
    acaAdjustments: {
      current: number;            // e.g., $0.27
      renewal: number;            // e.g., $0.41
    };
  };
  currentPremiumPMPM: number;     // e.g., $624.76
  manualClaimsPMPM: {
    current: number;              // e.g., $367.92
    renewal: number;              // e.g., $536.12
  };
  memberBasedCharges?: {
    current: number;
    renewal: number;
  };
}

export interface BCBSCompositeWeighting {
  enrollmentBased: boolean;
  totalEnrollment: number;
}

export interface BCBSGlobalSettings {
  totalMemberMonths: number;
}

export interface BCBSMultiPlanData {
  plans: BCBSPlanData[];
  totalMemberMonths: number;      // e.g., 3248
}

export interface BCBSPlanData {
  planId: string;
  experiencePeriods: {
    current: BCBSPeriodData;
    renewal: BCBSPeriodData;
  };
  memberMonths: {
    currentTotal: number;
    renewalTotal: number;
    projectedMonthlyMembers: {
      current: number;
      renewal: number;
    };
  };
  medicalClaims: {
    current: BCBSClaimsData;
    renewal: BCBSClaimsData;
  };
  pharmacyClaims: {
    current: BCBSClaimsData;
    renewal: BCBSClaimsData;
  };
  enrollment: BCBSEnrollmentData;
}

export interface BCBSPeriodData {
  startDate: Date;
  endDate: Date;
  memberMonths: number;
}

export interface BCBSClaimsData {
  totalClaims: number;
  poolingLevel: number;
  pooledClaims: number;
  netClaims: number;
  expPeriodMemberMonths: number;
  netPMPM: number;
  adjustedNetPMPM: number;
  projectedPMPM: number;
}

export interface BCBSEnrollmentData {
  current: BCBSEnrollmentTiers;
  renewal: BCBSEnrollmentTiers;
}

export interface BCBSEnrollmentTiers {
  single: { count: number; rate: number };
  couple: { count: number; rate: number };
  spmd: { count: number; rate: number };
  family: { count: number; rate: number };
  total: { count: number; monthlyPremium: number; annualPremium: number };
}

export interface BCBSCalculationResult extends CalculationResult {
  individualPlans: BCBSPlanResult[];
  composite: BCBSCompositeResult;
  enrollmentSummary: BCBSEnrollmentSummary;
}

export interface BCBSPlanResult {
  planId: string;
  planName: string;
  calculations: BCBSCalculationStep[];
  finalMetrics: {
    projectedPremiumPMPM: number;
    requiredPremiumPMPM: number;
    currentPremiumPMPM: number;
    rateAction: number;
  };
  intermediateResults: {
    totalProjectedPMPM: number;
    adjustedProjectedPMPM: number;
    credibilityAdjustedPMPM: number;
    weightedExperienceClaims: number;
  };
}

export interface BCBSCalculationStep {
  lineNumber: string;
  description: string;
  formula: string;
  inputs: Record<string, any>;
  result: number;
  unit: string;
  section?: 'medical' | 'pharmacy' | 'total';
}

export interface BCBSCompositeResult {
  compositeRateAction: number;     // 4.1%
  totalEnrollment: number;
  weightedAverages: {
    projectedPMPM: number;
    requiredPMPM: number;
    currentPMPM: number;
  };
  enrollmentWeights: Record<string, number>;
}

export interface BCBSEnrollmentSummary {
  totalEnrollment: number;
  totalMonthlyPremium: number;
  totalAnnualPremium: number;
  planBreakdown: Array<{
    planId: string;
    planName: string;
    enrollment: number;
    percentage: number;
  }>;
}

// Helper interfaces for intermediate calculations
export interface BCBSMedicalResults {
  netPMPM: { current: number; renewal: number };
  adjustedPMPM: { current: number; renewal: number };
  projectedPMPM: { current: number; renewal: number };
}

export interface BCBSPharmacyResults {
  netPMPM: { current: number; renewal: number };
  adjustedPMPM: { current: number; renewal: number };
  projectedPMPM: { current: number; renewal: number };
}

export interface BCBSTotalResults {
  totalProjectedPMPM: number;
  adjustedProjectedPMPM: number;
  weightedExperienceClaims: number;
  credibilityAdjustedPMPM: number;
  projectedPremiumPMPM: number;
  requiredPremiumPMPM: number;
  rateAction: number;
}

export interface BCBSTrendResults {
  compoundedCurrent: number;
  compoundedRenewal: number;
}

// Standard BCBS calculation flow lines (30 lines total)
export const BCBS_CALCULATION_LINES = [
  { line: '1', description: 'Experience Period / Enrollment Period' },
  { line: '2', description: 'Member Months Total' },
  { line: '2a', description: 'Projected Total Monthly Mbrs.' },
  { line: '3', description: 'Medical/Pharmacy Claims @ 3/25', section: 'claims' },
  { line: '4', description: 'Net Claims', section: 'claims' },
  { line: '5', description: 'Exp Period FFS Member Months', section: 'claims' },
  { line: '6', description: 'Net PMPM / (*) IBNR / Adjusted Net PMPM', section: 'claims' },
  { line: '7', description: 'Adjusted Net PMPM', section: 'claims' },
  { line: '8', description: 'Annual Trend / Months of Trend / (*) Compounded Trend', section: 'claims' },
  { line: '9', description: 'Projected PMPM', section: 'claims' },
  { line: '10', description: 'Total Projected PMPM' },
  { line: '11a', description: 'FFS Age Adjustment for PMPM' },
  { line: '12', description: 'Sub Total FFS Age Adj. PMPM' },
  { line: '13', description: 'Total Pooling Charges' },
  { line: '14', description: '(*) Benefit Adjustment' },
  { line: '15', description: 'Adjusted Projected PMPM' },
  { line: '16', description: 'Experience Weights' },
  { line: '17', description: 'Weighted Experience Claims' },
  { line: '18', description: 'Member Based Charges' },
  { line: '19', description: 'Projected Experience Claim PMPM (incl MBC)' },
  { line: '20', description: 'Manual Claims PMPM' },
  { line: '21', description: 'Credibility Factor' },
  { line: '22', description: 'Credibility Adjusted Claim PMPM' },
  { line: '23', description: 'Retention PMPM' },
  { line: '24', description: 'PPO Premium Tax PMPM' },
  { line: '24a', description: 'Affordable Care Act Adjustments PMPM' },
  { line: '25', description: 'Underwriter Adjustment Factor' },
  { line: '26', description: 'Required Premium PMPM' },
  { line: '27', description: 'Pathway to Savings Adjustment' },
  { line: '27a', description: 'Post P2S Adj. Required Premium PMPM' },
  { line: '28', description: 'Current Premium PMPM' },
  { line: '29', description: 'Rate Action' },
  { line: '30', description: 'Composite Rate Action' }
] as const;

export type BCBSInput = BCBSSpecificInput;
export type BCBSResult = BCBSCalculationResult;

// Standard BCBS plan types (can be customized)
export const BCBS_PLAN_TYPES = [
  'Silver 3000',
  'Silver 2000', 
  'Silver 1500',
  'Gold 1000',
  'Platinum 500'
] as const;

// Enrollment tier factors for premium calculations
export const BCBS_TIER_FACTORS = {
  single: 1.0,
  couple: 2.0,
  spmd: 1.8, // Single Parent + Dependent(s)
  family: 3.0
} as const; 