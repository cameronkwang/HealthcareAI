import { UniversalInput, ExperiencePeriods, CoverageAmounts } from './common';

export interface AetnaParameters {
  // Deductible and pooling settings (Line 2 & 4-5)
  deductibleSuppressionFactor: number; // Usually very close to 1.0000
  poolingLevel: number; // $175,000 threshold
  poolingChargesPMPM?: number; // Calculated from experience if not provided
  
  // Adjustment factors (Lines 7-10) - typically defaulted to 1.0 unless specific adjustments needed
  networkAdjustment?: number; // Default 1.0
  planAdjustment?: number; // Default 1.0
  demographicAdjustment?: number; // Default 1.0
  underwritingAdjustment?: number; // Default 1.0
  
  // Trend settings (Line 12) - annual rates with editable option
  trendFactor: {
    medical: number; // Annual trend rate (e.g., 1.0969 for 9.69%)
    rx: number; // Annual trend rate (e.g., 1.0788 for 7.88%)
    months: number; // Number of months from experience midpoint to renewal midpoint
  };
  
  // Experience period weighting (Line 14)
  periodWeighting: {
    current: number; // Typically 0.75 (75%)
    prior: number;   // Typically 0.25 (25%)
  };
  
  // Credibility settings (Line 16)
  credibilityParameters: {
    minimumCredibility: number;
    fullCredibilityMemberMonths: number; // E.g., 12000
    credibilityFormula: 'sqrt' | 'linear'; // sqrt(memberMonths / fullCredibilityMM)
  };
  
  // Manual rates (Line 17) - can be calculated from experience if not provided
  manualRates?: {
    medical: number;
    rx: number;
  };
  
  // Large claim adjustment (Line 19) - optional, typically 0
  largeClaimAdjustment?: number;
  
  // Non-benefit expenses (Line 20) - can be calculated as % of retention if not provided
  nonBenefitExpensesPMPM?: number;
  
  // Retention components (Line 21) - can be calculated as % of experience if not provided
  retentionComponents?: {
    admin: number;
    commissions: number;
    premium_tax: number;
    risk_margin: number;
    other: number;
  };
  
  // Rate adjustment and producer fees (Lines 23 & 25) - optional
  rateAdjustment?: number; // Optional rate cap/floor
  producerServiceFeePMPM?: number;
  
  // Current premium (Line 27) - can be calculated from experience if not provided
  currentPremiumPMPM?: number;
  
  // Optional overrides for special cases
  overrides?: {
    skipDeductibleSuppression?: boolean;
    useCustomPoolingCalculation?: boolean;
    forceAnnualization?: boolean;
    customAnnualizationFactor?: number;
  };
}

export interface AetnaInput extends UniversalInput {
  carrierSpecificParameters: AetnaParameters;
}

export interface AetnaResult {
  carrier: 'AETNA';
  finalPremiumPMPM: number;
  rateChange: number;
  
  // The detailed 28-line calculation breakdown
  calculations: AetnaCalculationLine[];
  
  // Experience periods used
  periods: ExperiencePeriods;
  
  // Summary metrics
  summary: {
    incurredClaimsPMPM: CoverageAmounts;
    projectedClaimsPMPM: CoverageAmounts;
    totalRetentionPMPM: number;
    memberMonthsUsed: {
      current: number;
      prior: number;
      weighted: number;
    };
  };
  
  // Validation results
  warnings: string[];
  dataQuality: {
    credibilityScore: number;
    dataCompleteness: number;
    annualizationApplied: boolean;
  };
}

export interface AetnaCalculationLine {
  lineNumber: string;
  description: string;
  current: CoverageAmounts;
  prior: CoverageAmounts;
  calculation?: string; // Formula description
  notes?: string;
}

// Standard Aetna calculation flow lines
export const AETNA_CALCULATION_LINES = [
  { line: '1', description: 'Incurred Claims' },
  { line: '2', description: 'Deductible Suppression Factor' },
  { line: '3', description: 'Incurred Claims x Deductible Suppression Factor' },
  { line: '4', description: 'Pooled Claims' },
  { line: '5', description: 'Pooling Charge' },
  { line: '6', description: 'Incurred Claims w/ Pooling' },
  { line: '7', description: 'Network Adjustment' },
  { line: '8', description: 'Plan Adjustment' },
  { line: '9', description: 'Demographic Adjustment' },
  { line: '10', description: 'Underwriting Adjustment' },
  { line: '11', description: 'Incurred Claims x Factors' },
  { line: '12', description: 'Trend Application' },
  { line: '13', description: 'Projected Claims PMPM' },
  { line: '14', description: 'Experience Period Weighting' },
  { line: '15', description: 'Experience Weighted Projected Claims' },
  { line: '16', description: 'Experience Credibility' },
  { line: '17', description: 'Manual Projected Claims' },
  { line: '18', description: 'Blended Projected Claims' },
  { line: '19', description: 'Large Claim Adjustment' },
  { line: '20', description: 'Non-Benefit Expenses' },
  { line: '21', description: 'Total Retention Charges' },
  { line: '22', description: 'Projected Premium' },
  { line: '23', description: 'Rate Adjustment' },
  { line: '24', description: 'Proposed Premium' },
  { line: '25', description: 'Producer Service Fee' },
  { line: '26', description: 'Total Amount Due' },
  { line: '27', description: 'Estimated Current Premium' },
  { line: '28', description: 'Required Rate Change' }
] as const; 