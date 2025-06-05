import { UniversalInput, ExperiencePeriods } from './common';

export interface UHCParameters {
  // Pooling settings
  poolingThreshold: number; // $125,000 threshold (renamed from poolingLevel)
  poolingFactor?: number; // Pooling factor for charge calculation (typically 0.156)
  
  // Adjustment factors
  underwritingAdjustment: number; // Line F (UW Adjustment)
  planChangeAdjustment: number; // Line H (Plan Change Adjustment)
  
  // Trend settings (Line G)
  trendRates: {
    medical: number; // Annual medical trend rate
    rx: number; // Annual Rx trend rate
  };
  projectionMonths: {
    current: number; // Months from current period midpoint to renewal (typically 20)
    prior: number; // Months from prior period midpoint to renewal (typically 28)
  };
  
  // Experience period weighting (Line J)
  experienceWeights: [number, number]; // [current, prior] typically [0.70, 0.30]
  
  // Credibility settings (Lines W-X)
  credibilityWeights: {
    experience: number; // Experience credibility weight (e.g., 0.42)
    manual: number; // Manual credibility weight (e.g., 0.58)
  };
  
  // Manual rates for credibility blending (Lines S-V)
  manualRates: {
    baseManualPMPM: number; // Line S: Manual Premium PMPM (unadjusted)
    ageSexAdjustment: number; // Line T: Age/Sex Adjustment factor
    otherAdjustment: number; // Line U: Other Adjustment factor
  };
  
  // Retention components (Lines N-Q)
  retentionComponents: {
    administrative: number; // Line N: Administration percentage
    taxes: number; // Line O: State Taxes and Assessments percentage
    commission: number; // Line AC: Commission percentage
    other: number; // Line P: Other adjustment percentage
  };
  
  // Member change adjustment (Line K)
  memberChangeAdjustment?: number; // Adjustment for member change between plans (typically 1.000)
  
  // Current premium for comparison (Line AF)
  currentRevenuePMPM: number;
  
  // Reform items, commission, and fees (Lines AB-AD)
  reformItems?: number; // Line AB: Reform items amount
  commission?: number; // Line AC: Commission amount (may be separate from retention)
  fees?: number; // Line AD: Fees amount
  
  // Suggested renewal action (Line AH)
  suggestedRenewalAction?: number; // Line AH: Suggested renewal action percentage (optional - calculated if not provided)
  
  // Optional adjustments (Line Z and others)
  adjustmentFactors?: {
    network?: number;
    plan?: number;
    demographic?: number;
    underwriting?: number;
    other?: number; // Line Z: Other adjustment factor
  };
}

export interface UHCInput extends UniversalInput {
  carrierSpecificParameters: UHCParameters;
}

export interface UHCCalculationLine {
  line: string; // A, B, C, etc.
  description: string;
  current: {
    medical: number;
    rx: number;
    total: number;
  };
  prior: {
    medical: number;
    rx: number;
    total: number;
  } | null; // Prior period may not exist for some lines
  calculation?: string; // Formula description
  notes?: string;
}

export interface UHCResult {
  carrier: 'UHC';
  finalPremium: {
    medical: number;
    rx: number;
    total: number;
  };
  rateChange: number;
  
  // The A-Y line calculation breakdown
  calculations: UHCCalculationLine[];
  
  // Experience periods used
  periods: ExperiencePeriods;
  
  // Summary metrics
  summary: {
    weightedExperience: {
      medical: number;
      rx: number;
      total: number;
    };
    credibilityWeighting: {
      experience: number;
      manual: number;
      credibilityFactor: number;
    };
    totalRetention: number;
    projectedAnnualPremium: number;
  };
  
  // Period analysis
  periodAnalysis: {
    current: {
      memberMonths: number;
      medicalPMPM: number;
      rxPMPM: number;
      totalPMPM: number;
    };
    prior: {
      memberMonths: number;
      medicalPMPM: number;
      rxPMPM: number;
      totalPMPM: number;
    } | null;
  };
  
  // Validation results
  warnings: string[];
  dataQuality: {
    dataCompleteness: number;
    annualizationApplied: boolean;
    credibilityScore: number;
  };
}

// UHC Lines A-AM calculation flow (based on actual UHC document)
export const UHC_CALCULATION_LINES = [
  // Experience Rating PMPM Section (Lines A-R)
  { line: 'A', description: 'Incurred Medical Claims PMPM' },
  { line: 'B', description: 'Pooled Claims Over $125,000' },
  { line: 'C', description: 'Adjusted Medical Claims (A - B)' },
  { line: 'D', description: 'Incurred Rx Claims PMPM' },
  { line: 'E', description: 'Total Incurred Claims (C + D)' },
  { line: 'F', description: 'UW Adjustment' },
  { line: 'G', description: 'Trend Factor (Current 20 mos, Prior 28 mos)' },
  { line: 'H', description: 'Plan Change Adjustment' },
  { line: 'I', description: 'Trended/Adjusted Claims (E × F × G × H)' },
  { line: 'J', description: 'Claim Period Weighting (70% / 30%)' },
  { line: 'K', description: 'Adj for Member Change Between Plans' },
  { line: 'L', description: 'Pooling charge for $125,000' },
  { line: 'M', description: 'Expected claims (J × K + L)' },
  { line: 'N', description: 'Administration' },
  { line: 'O', description: 'State Taxes and Assessments' },
  { line: 'P', description: 'Other adjustment' },
  { line: 'Q', description: 'Total retention (N + O + P)' },
  { line: 'R', description: 'Experience Premium PMPM (M / (1 - Q))' },
  
  // Manual Rating PMPM Section (Lines S-V)
  { line: 'S', description: 'Manual Premium PMPM (unadjusted)' },
  { line: 'T', description: 'Age/Sex Adjustment' },
  { line: 'U', description: 'Other Adjustment' },
  { line: 'V', description: 'Manual Premium PMPM (S × T × U)' },
  
  // Renewal Action Section (Lines W-AM)
  { line: 'W', description: 'Experience Rating (with credibility)' },
  { line: 'X', description: 'Manual Rating (with credibility)' },
  { line: 'Y', description: 'Initial Calculated Renewal Cost PMPM (W + X)' },
  { line: 'Z', description: 'Other Adjustment' },
  { line: 'AA', description: 'PMPM Prior to Reform Items, Commission, Fees (Y × Z)' },
  { line: 'AB', description: 'Reform Items' },
  { line: 'AC', description: 'Commission' },
  { line: 'AD', description: 'Fees' },
  { line: 'AE', description: 'Calculated Renewal Cost PMPM (AA + AB + AC + AD)' },
  { line: 'AF', description: 'Current Revenue PMPM' },
  { line: 'AG', description: 'Calculated Renewal Action % ((AE - AF) / AF)' },
  { line: 'AH', description: 'Suggested Renewal Action %' },
  { line: 'AI', description: 'Revenue PMPM with Suggested Action (AF × (1 + AH))' },
  { line: 'AJ', description: 'Revenue vs Cost Difference (AI - AE)' },
  { line: 'AK', description: 'Margin % (AJ / AI)' },
  { line: 'AL', description: 'Loss Ratio (AE / AI)' },
  { line: 'AM', description: 'Final Rate Action Summary' }
] as const;

export type UHCLineType = typeof UHC_CALCULATION_LINES[number]['line']; 