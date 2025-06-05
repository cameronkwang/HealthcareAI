import { UniversalInput, ExperiencePeriods } from './common';

export interface CignaParameters {
  // Pooling settings (lowest threshold)
  poolingLevel: number; // $50,000 threshold
  
  // Demographic adjustment
  demographicAdjustment: number; // e.g., 0.9697
  
  // Trend settings
  trendFactor: {
    annual: number; // Annual trend rate
    midpointMonths: number; // Months from experience midpoint to renewal
  };
  
  // Large claim add back
  largeClaimAddBack: {
    pmpm: number; // e.g., $108.63 PMPM
    annual: number; // e.g., $350,000 Annual
  };
  
  // Manual rates for blending
  manualRates: {
    medical: number;
    pharmacy: number;
    total: number;
  };
  
  // Experience vs Manual weighting
  experienceWeight: number; // e.g., 0.80 (80% experience, 20% manual)
  
  // Claims Fluctuation Corridor (CFC)
  claimsFluctuationCorridor: {
    enabled: boolean;
    lowerBound: number; // e.g., -10%
    upperBound: number; // e.g., +15%
  };
  
  // Expense loadings (all in PMPM) - optional since they can be calculated
  expenseLoadings: {
    administration?: number; // Will be calculated as % of claims if not provided
    commissions?: number; // Will be calculated as % of claims if not provided
    premiumTax?: number; // Will be calculated as % of premium if not provided
    profitAndContingency?: number; // Will be calculated as % of claims if not provided
    other?: number; // Will be calculated as % of claims if not provided
  };
  
  // Current premium for comparison - optional since it can be calculated
  currentPremiumPMPM?: number; // Will be calculated from experience if not provided
  
  // Projected membership for annual calculations - optional since it can be calculated
  projectedMemberMonths?: number; // Will be calculated from current data if not provided
  
  // Optional adjustments
  adjustments?: {
    networkChange?: number;
    planDesignChange?: number;
    rateGuarantee?: number;
  };
}

export interface CignaInput extends UniversalInput {
  carrierSpecificParameters: CignaParameters;
}

export interface CignaResult {
  carrier: 'CIGNA';
  finalPremium: {
    pmpm: number;
    annual: number;
  };
  rateChange: number;
  
  // The dual PMPM/Annual calculation breakdown
  calculations: CignaCalculationLine[];
  
  // Experience period used (single 12-month period)
  period: {
    start: Date;
    end: Date;
    months: number;
    memberMonths: number;
  };
  
  // Summary metrics
  summary: {
    totalPaidClaims: {
      pmpm: number;
      annual: number;
    };
    experienceClaimCost: {
      pmpm: number;
      annual: number;
    };
    projectedClaimCost: {
      pmpm: number;
      annual: number;
    };
    totalExpenses: {
      pmpm: number;
      annual: number;
    };
  };
  
  // Claims Fluctuation Corridor analysis
  cfcAnalysis?: {
    originalPremium: number;
    adjustedPremium: number;
    adjustmentApplied: boolean;
    adjustmentPercent: number;
  };
  
  // Validation results
  warnings: string[];
  dataQuality: {
    dataCompleteness: number;
    annualizationApplied: boolean;
  };
}

export interface CignaCalculationLine {
  description: string;
  pmpm: number | string; // Can be numeric value or text (like factors)
  annual: number | string;
  calculation?: string; // Formula description
  notes?: string;
}

// Standard CIGNA calculation flow
export const CIGNA_CALCULATION_LINES = [
  'Total Paid Claims',
  'Less Pooled Claims over $50,000 PMPM',
  'Experience Claim Cost',
  'Demographic Adjustment Factor',
  'Demographically Adjusted Claims',
  'Annual Trend',
  'Midpoint Months',
  'Effective Trend',
  'Trended Experience Claims',
  'Large Claim Add Back',
  'Total Projected Claims',
  'Experience Weight',
  'Manual Claim Cost',
  'Manual Weight',
  'Blended Claims Cost',
  'Claims Fluctuation Corridor',
  'Final Claims Cost',
  'Administration Expense',
  'Commissions',
  'Premium Tax',
  'Profit and Contingency',
  'Other Expenses',
  'Total Required Premium',
  'Current Premium',
  'Required Rate Change'
] as const; 