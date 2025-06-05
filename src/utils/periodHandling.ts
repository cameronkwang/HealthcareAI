import { 
  IMonthlyClaimsData, 
  LargeClaimant, 
  ExperiencePeriods, 
  Period, 
  ValidationResult,
  AnnualizedClaims 
} from '../types/common';

/**
 * Universal period determination logic for all carriers
 * Determines current and prior experience periods based on available data
 */
export function determineExperiencePeriods(
  claimsData: IMonthlyClaimsData[], 
  renewalEffectiveDate: Date
): ExperiencePeriods {
  if (!claimsData || claimsData.length === 0) {
    throw new Error('No claims data provided');
  }

  // Sort data by month in descending order (most recent first)
  const sortedData = claimsData.sort((a, b) => 
    new Date(b.month).getTime() - new Date(a.month).getTime()
  );
  
  const totalMonths = sortedData.length;
  
  if (totalMonths < 4) {
    throw new Error('Minimum 4 months of data required for renewal calculations');
  }

  // Helper function to get the last day of a month from "YYYY-MM" format
  const getLastDayOfMonth = (monthString: string): Date => {
    // Parse "YYYY-MM" format
    const [year, month] = monthString.split('-').map(Number);
    // Create last day of the month: use month+1 as the month parameter, then day 0 gives last day of previous month
    const lastDay = new Date(year, month, 0); // month is 1-indexed in string, so month+1-1=month for next month, day 0 = last day of current month
    return lastDay;
  };

  // Helper function to get the first day of a month from "YYYY-MM" format
  const getFirstDayOfMonth = (monthString: string): Date => {
    // Parse "YYYY-MM" format
    const [year, month] = monthString.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1); // First day of the month (month is 1-indexed in string, so subtract 1 for JS)
    return firstDay;
  };

  // Determine current experience period
  const mostRecentMonth = sortedData[0].month;  // e.g. "2024-05"
  const oldestMonth = sortedData[totalMonths - 1].month;  // e.g. "2023-07"

  // Calculate experience periods based on data length
  if (totalMonths >= 24) {
    // 24+ months: Use most recent 12 as current, prior 12 as prior
    const currentPeriodStart = getFirstDayOfMonth(sortedData[11].month);
    const currentPeriodEnd = getLastDayOfMonth(mostRecentMonth);
    const priorPeriodStart = getFirstDayOfMonth(sortedData[23].month);
    const priorPeriodEnd = getLastDayOfMonth(sortedData[12].month);

    return {
      current: {
        start: currentPeriodStart,
        end: currentPeriodEnd,
        months: 12
      },
      prior: {
        start: priorPeriodStart,
        end: priorPeriodEnd,
        months: 12
      }
    };
  } else {
    // 4-23 months: Use all as current period only (will be annualized)
    const currentPeriodStart = getFirstDayOfMonth(oldestMonth);
    const currentPeriodEnd = getLastDayOfMonth(mostRecentMonth);

    return {
      current: {
        start: currentPeriodStart,
        end: currentPeriodEnd,
        months: totalMonths
      },
      prior: null
    };
  }
}

/**
 * Validates that large claimant periods match the determined experience periods
 */
export function validateLargeClaimantPeriods(
  claimants: LargeClaimant[],
  periods: ExperiencePeriods
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  claimants.forEach(claimant => {
    // Check if claimant is within current or prior period (if exists)
    const claimantDate = claimant.incurredDate;
    const claimantDateStr = typeof claimantDate === 'string' ? claimantDate : claimantDate.toISOString().split('T')[0];
    
    // Use string comparison for dates (YYYY-MM-DD format)
    const currentStart = periods.current.start.toISOString().split('T')[0];
    const currentEnd = periods.current.end.toISOString().split('T')[0];
    
    let inCurrentPeriod = claimantDateStr >= currentStart && claimantDateStr <= currentEnd;
    let inPriorPeriod = false;
    
    if (periods.prior) {
      const priorStart = periods.prior.start.toISOString().split('T')[0];
      const priorEnd = periods.prior.end.toISOString().split('T')[0];
      inPriorPeriod = claimantDateStr >= priorStart && claimantDateStr <= priorEnd;
    }

    if (!inCurrentPeriod && !inPriorPeriod) {
      errors.push(`Claimant ${claimant.claimantId} with incurred date ${claimantDateStr} falls outside experience periods`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Annualizes claims data for periods with less than 12 months
 */
export function annualizeClaims(
  monthlyData: IMonthlyClaimsData[],
  actualMonths: number
): AnnualizedClaims {
  if (actualMonths >= 12) {
    throw new Error('Annualization only applies to periods with less than 12 months of data');
  }
  
  if (actualMonths < 1) {
    throw new Error('At least 1 month of data required for annualization');
  }

  const annualizationFactor = 12 / actualMonths;
  
  // Sum all claims and member months from the period
  const totalClaims = monthlyData.reduce((sum, month) => ({
    medical: sum.medical + (month.incurredClaims.medical || 0),
    rx: sum.rx + (month.incurredClaims.rx || 0),
    total: sum.total + (month.incurredClaims.total || 
                       (month.incurredClaims.medical || 0) + (month.incurredClaims.rx || 0))
  }), { medical: 0, rx: 0, total: 0 });
  
  const totalMemberMonths = monthlyData.reduce((sum, month) => 
    sum + (month.memberMonths.total || 0), 0
  );
  
  return {
    annualizedClaims: {
      medical: totalClaims.medical * annualizationFactor,
      rx: totalClaims.rx * annualizationFactor,
      total: totalClaims.total * annualizationFactor
    },
    annualizedMemberMonths: totalMemberMonths * annualizationFactor,
    annualizationFactor,
    actualMonths
  };
}

/**
 * Gets member months for a specific period from monthly data
 */
export function getMemberMonthsForPeriod(
  monthlyData: IMonthlyClaimsData[],
  period: Period
): number {
  const periodData = monthlyData.filter(month => {
    const monthDate = new Date(month.month);
    return monthDate >= period.start && monthDate <= period.end;
  });

  return periodData.reduce((sum, month) => sum + (month.memberMonths.total || 0), 0);
}

/**
 * Gets claims for a specific period from monthly data
 */
export function getClaimsForPeriod(
  monthlyData: IMonthlyClaimsData[],
  period: Period
): { medical: number; rx: number; total: number } {
  const periodData = monthlyData.filter(month => {
    const monthDate = new Date(month.month);
    return monthDate >= period.start && monthDate <= period.end;
  });

  return periodData.reduce((sum, month) => ({
    medical: sum.medical + (month.incurredClaims.medical || 0),
    rx: sum.rx + (month.incurredClaims.rx || 0),
    total: sum.total + (month.incurredClaims.total || 
                      (month.incurredClaims.medical || 0) + (month.incurredClaims.rx || 0))
  }), { medical: 0, rx: 0, total: 0 });
}

/**
 * Filters large claimants for a specific period
 */
export function getClaimantsForPeriod(
  claimants: LargeClaimant[],
  period: Period
): LargeClaimant[] {
  return claimants.filter(claimant => {
    const claimDate = new Date(claimant.incurredDate);
    return claimDate >= period.start && claimDate <= period.end;
  });
}

/**
 * Calculates pooled claims over a threshold for a specific period
 */
export function calculatePooledClaimsForPeriod(
  claimants: LargeClaimant[],
  period: Period,
  poolingThreshold: number
): { medical: number; rx: number; total: number } {
  const periodClaimants = getClaimantsForPeriod(claimants, period);
  
  console.log(`🏊 Pooling Calculation Debug:`);
  console.log(`   Pooling threshold: $${poolingThreshold.toLocaleString()}`);
  console.log(`   Period: ${period.start.toISOString().split('T')[0]} to ${period.end.toISOString().split('T')[0]}`);
  console.log(`   All claimants: ${claimants.length}`);
  console.log(`   Period claimants: ${periodClaimants.length}`);
  
  return periodClaimants.reduce((sum, claimant) => {
    const excessAmount = Math.max(0, claimant.totalAmount - poolingThreshold);
    
    // If we have medical/rx breakdown, use it; otherwise assume all medical
    const medicalExcess = claimant.medicalAmount ? 
      Math.max(0, claimant.medicalAmount - poolingThreshold) : excessAmount;
    const rxExcess = claimant.rxAmount ? 
      Math.max(0, claimant.rxAmount - poolingThreshold) : 0;
    
    console.log(`   Claimant ${claimant.claimantId}: Total=$${claimant.totalAmount.toLocaleString()}, Excess=$${excessAmount.toLocaleString()}, MedExcess=$${medicalExcess.toLocaleString()}, RxExcess=$${rxExcess.toLocaleString()}`);
    
    return {
      medical: sum.medical + medicalExcess,
      rx: sum.rx + rxExcess,
      total: sum.total + excessAmount
    };
  }, { medical: 0, rx: 0, total: 0 });
}

/**
 * Validates the overall data quality for renewal calculations
 */
export function validateDataQuality(
  monthlyData: IMonthlyClaimsData[],
  claimants: LargeClaimant[],
  periods: ExperiencePeriods
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check data completeness
  if (periods.current.months < 12) {
    warnings.push(`Limited data: Only ${periods.current.months} months in current period. Results will be annualized.`);
  }

  if (periods.current.months < 6) {
    warnings.push('Very limited data: Less than 6 months available. Consider supplementing with industry benchmarks.');
  }

  if (!periods.prior) {
    warnings.push('No prior period available for trend analysis. Results based on current period only.');
  }

  // Check for missing data
  const monthsWithoutClaims = monthlyData.filter(month => 
    !month.incurredClaims.medical && !month.incurredClaims.rx
  );
  
  if (monthsWithoutClaims.length > 0) {
    warnings.push(`${monthsWithoutClaims.length} months have no claims data: ${monthsWithoutClaims.map(m => m.month).join(', ')}`);
  }

  const monthsWithoutMembers = monthlyData.filter(month => 
    !month.memberMonths.total || month.memberMonths.total === 0
  );
  
  if (monthsWithoutMembers.length > 0) {
    errors.push(`${monthsWithoutMembers.length} months have no member months: ${monthsWithoutMembers.map(m => m.month).join(', ')}`);
  }

  // Validate large claimants
  const claimantValidation = validateLargeClaimantPeriods(claimants, periods);
  errors.push(...claimantValidation.errors);
  warnings.push(...(claimantValidation.warnings || []));

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
} 