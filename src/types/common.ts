export interface UniversalInput {
  carrier: 'AETNA' | 'UHC' | 'CIGNA' | 'BCBS';
  caseId: string;
  effectiveDates: {
    renewalStart: Date;
    renewalEnd: Date;
  };
  monthlyClaimsData: IMonthlyClaimsData[];
  largeClaimantsData: LargeClaimant[];
  manualRates: ManualRates;
  carrierSpecificParameters: any; // Will be typed per carrier
  enrollmentData?: EnrollmentData[]; // Required for BCBS
  currentMembers?: number; // For projection calculations
}

// Enhanced interface name for consistency with implementation guide
export interface IMonthlyClaimsData {
  month: string; // YYYY-MM
  memberMonths: {
    medical?: number;
    rx?: number;
    total: number;
  };
  incurredClaims: {
    medical: number;
    rx: number;
    total?: number;
  };
  paidClaims?: {
    medical: number;
    rx: number;
  };
  // Add earned premium data for carriers that need it
  earnedPremium?: {
    total?: number;
    medical?: number;
    rx?: number;
  };
}

// Legacy alias for backward compatibility
export interface MonthlyClaimsData extends IMonthlyClaimsData {}

// Enhanced large claimant interface
export interface LargeClaimant {
  claimantId: string;
  incurredDate: Date; // Changed from period to actual date for proper period matching
  totalAmount: number;
  medicalAmount?: number;
  rxAmount?: number;
  diagnosis?: string;
  // Additional fields for carrier-specific calculations
  memberSequence?: string;
  claimType?: 'medical' | 'pharmacy' | 'combined';
}

export interface ManualRates {
  medical: number;
  rx: number;
  total?: number;
}

export interface EnrollmentData {
  month: string;
  subscribers: number;
  members: number;
  // Additional enrollment breakdown for BCBS multi-plan
  planBreakdown?: {
    [planId: string]: {
      single: number;
      couple: number;
      spmd: number; // Single Parent + Dependent(s)
      family: number;
    };
  };
}

// New interfaces for period handling
export interface ExperiencePeriods {
  current: Period;
  prior: Period | null;
}

export interface Period {
  start: Date;
  end: Date;
  months: number;
  label?: string; // For display purposes
}

// Enhanced calculation result interfaces
export interface CalculationResult {
  carrier: string;
  currentPremiumPMPM: number;
  projectedPremiumPMPM: number;
  requiredRateChange: number;
  proposedRateChange: number;
  calculationSteps: CalculationStep[];
  warnings: ValidationWarning[];
  // Enhanced with carrier-specific detailed results
  detailedResults?: CarrierSpecificResults;
  experiencePeriods?: ExperiencePeriods;
  memberMonths?: {
    current: number;
    prior?: number;
    projected: number;
  };
}

// New interfaces for detailed carrier calculations
export interface CarrierSpecificResults {
  // Store full native result objects for templates
  aetna?: any; // Will be AetnaResult 
  uhc?: any; // Will be UHCResult
  cigna?: any; // Will be CignaResult  
  bcbs?: any; // Will be BCBSResult
}

export interface AetnaCalculationRow {
  lineNumber: string;
  description: string;
  current: CoverageAmounts;
  prior: CoverageAmounts;
  notes?: string;
}

export interface UHCCalculationRow {
  line: string;
  description: string;
  current: number;
  prior: number;
  notes?: string;
}

export interface CignaCalculationRow {
  description: string;
  pmpm: number | string;
  annual: number | string;
  notes?: string;
}

export interface CoverageAmounts {
  medCap: number; // Medical + Capitation combined for Aetna
  rx: number;
  total: number;
}

// BCBS-specific interfaces
export interface BCBSResult {
  plans: BCBSPlanCalculation[];
  composite: BCBSComposite;
  rateActions: BCBSRateAction[];
}

export interface BCBSPlanCalculation {
  planId: string;
  planName: string;
  medical: {
    claims: number;
    pooledClaims: number;
    netPMPM: number;
    trendFactor: number;
    projectedPMPM: number;
  };
  pharmacy: {
    claims: number;
    netPMPM: number;
    trendFactor: number;
    projectedPMPM: number;
  };
  total: {
    projectedPMPM: number;
    experienceWeight: number;
    credibilityAdjustedPMPM: number;
    requiredPremium: number;
  };
  enrollment: {
    single: number;
    couple: number;
    spmd: number;
    family: number;
    total: number;
  };
}

export interface BCBSComposite {
  totalEnrollment: number;
  weightedPremiumPMPM: number;
  planWeights: { [planId: string]: number };
  memberMonths: number;
}

export interface BCBSRateAction {
  planId: string;
  currentRate: number;
  requiredRate: number;
  rateChange: number;
  status: 'increase' | 'decrease' | 'minimal';
}

// Enhanced calculation step for more detailed reporting
export interface CalculationStep {
  label: string;
  value: number | string;
  description?: string;
  category?: 'input' | 'calculation' | 'adjustment' | 'output';
  lineNumber?: string; // For carrier-specific line references
}

export interface ValidationWarning {
  message: string;
  field?: string;
  severity?: 'info' | 'warning' | 'error';
  category?: 'data' | 'calculation' | 'assumption';
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Annualized claims interface
export interface AnnualizedClaims {
  annualizedClaims: {
    medical: number;
    rx: number;
    total: number;
  };
  annualizedMemberMonths: number;
  annualizationFactor: number;
  actualMonths: number;
} 