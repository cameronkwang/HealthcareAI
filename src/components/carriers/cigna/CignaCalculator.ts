import { 
  CignaInput, 
  CignaResult, 
  CignaCalculationLine, 
  CIGNA_CALCULATION_LINES 
} from '../../../types/cigna';
import { 
  determineExperiencePeriods, 
  validateLargeClaimantPeriods,
  getMemberMonthsForPeriod,
  getClaimsForPeriod,
  calculatePooledClaimsForPeriod,
  validateDataQuality 
} from '../../../utils/periodHandling';
import { UniversalInput, ExperiencePeriods } from '../../../types/common';

export class CignaRenewalCalculator {
  private input: CignaInput;
  private periods: ExperiencePeriods;
  private calculations: CignaCalculationLine[] = [];
  private warnings: string[] = [];
  private medicalPharmacySplit: { medical: number; pharmacy: number };

  constructor(input: CignaInput) {
    this.input = input;
    this.periods = determineExperiencePeriods(
      input.monthlyClaimsData,
      input.effectiveDates.renewalStart
    );
    
    // Calculate actual medical/pharmacy split from experience data
    this.medicalPharmacySplit = this.calculateMedicalPharmacySplit();
  }

  calculate(): CignaResult {
    try {
      this.validateInput();
      this.performCalculations();
      
      return {
        carrier: 'CIGNA',
        calculations: this.calculations,
        finalPremium: this.getFinalPremium(),
        rateChange: this.getRateChange(),
        period: this.createPeriodAnalysis(),
        warnings: this.warnings,
        summary: this.createSummary(),
        dataQuality: this.getDataQuality()
      };
    } catch (error) {
      throw new Error(`CIGNA calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateMedicalPharmacySplit(): { medical: number; pharmacy: number } {
    // Calculate split based on actual experience data
    const totalMedical = this.input.monthlyClaimsData.reduce((sum, month) => 
      sum + (month.incurredClaims?.medical || 0), 0);
    const totalRx = this.input.monthlyClaimsData.reduce((sum, month) => 
      sum + (month.incurredClaims?.rx || 0), 0);
    const totalClaims = totalMedical + totalRx;
    
    if (totalClaims === 0) {
      // Fallback to manual rates split if no claims data
      const manualTotal = this.input.manualRates.medical + this.input.manualRates.rx;
      return {
        medical: this.input.manualRates.medical / manualTotal,
        pharmacy: this.input.manualRates.rx / manualTotal
      };
    }
    
    return {
      medical: totalMedical / totalClaims,
      pharmacy: totalRx / totalClaims
    };
  }

  private validateInput(): void {
    if (!this.input.monthlyClaimsData || this.input.monthlyClaimsData.length === 0) {
      throw new Error('Claims data is required');
    }
    
    if (!this.input.carrierSpecificParameters) {
      throw new Error('CIGNA-specific parameters are required');
    }

    // CIGNA typically requires exactly 12 months of experience data
    if (this.input.monthlyClaimsData.length < 4) {
      throw new Error('Minimum 4 months of data required for CIGNA calculations');
    }

    const periodValidation = validateLargeClaimantPeriods(
      this.input.largeClaimantsData || [],
      this.periods
    );
    
    if (!periodValidation.valid) {
      this.warnings.push(...(periodValidation.warnings || []));
    }

    const dataQuality = validateDataQuality(
      this.input.monthlyClaimsData,
      this.input.largeClaimantsData || [],
      this.periods
    );
    
    if (dataQuality.warnings) {
      this.warnings.push(...dataQuality.warnings);
    }
  }

  private performCalculations(): void {
    // CIGNA uses a simpler methodology with PMPM/Annual dual columns
    this.addCalculationLine('Total Paid Claims', ...this.calculateTotalPaidClaims());
    this.addCalculationLine('Less Pooled Claims over $50,000 PMPM', ...this.calculatePooledClaims());
    this.addCalculationLine('Experience Claim Cost', ...this.calculateExperienceClaimCost());
    this.addCalculationLine('Demographic Adjustment Factor', ...this.getDemographicAdjustmentFactor());
    this.addCalculationLine('Demographically Adjusted Claims', ...this.calculateDemographicallyAdjustedClaims());
    this.addCalculationLine('Annual Trend', ...this.getAnnualTrend());
    this.addCalculationLine('Midpoint Months', ...this.getMidpointMonths());
    this.addCalculationLine('Effective Trend', ...this.calculateEffectiveTrend());
    this.addCalculationLine('Trended Experience Claims', ...this.calculateTrendedExperienceClaims());
    this.addCalculationLine('Large Claim Add Back', ...this.getLargeClaimAddBack());
    this.addCalculationLine('Total Projected Claims', ...this.calculateTotalProjectedClaims());
    this.addCalculationLine('Experience Weight', ...this.getExperienceWeight());
    this.addCalculationLine('Manual Claim Cost', ...this.getManualClaimCost());
    this.addCalculationLine('Manual Weight', ...this.getManualWeight());
    this.addCalculationLine('Blended Claims Cost', ...this.calculateBlendedClaimsCost());
    this.addCalculationLine('Claims Fluctuation Corridor', ...this.applyCFC());
    this.addCalculationLine('Final Claims Cost', ...this.calculateFinalClaimsCost());
    this.addCalculationLine('Administration Expense', ...this.getAdministrationExpense());
    this.addCalculationLine('Commissions', ...this.getCommissions());
    this.addCalculationLine('Premium Tax', ...this.getPremiumTax());
    this.addCalculationLine('Profit and Contingency', ...this.getProfitAndContingency());
    this.addCalculationLine('Other Expenses', ...this.getOtherExpenses());
    this.addCalculationLine('Total Required Premium', ...this.calculateTotalRequiredPremium());
    this.addCalculationLine('Current Premium', ...this.getCurrentPremium());
    this.addCalculationLine('Required Rate Change', ...this.calculateRequiredRateChange());
  }

  private addCalculationLine(description: string, pmpm: number | string, annual: number | string, notes?: string): void {
    this.calculations.push({
      description,
      pmpm,
      annual,
      notes
    });
  }

  private calculateTotalPaidClaims(): [number, number] {
    const currentPeriod = this.periods.current;
    const claims = getClaimsForPeriod(this.input.monthlyClaimsData, currentPeriod);
    const memberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, currentPeriod);
    
    const totalPMPM = claims.total / memberMonths;
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    
    return [totalPMPM, totalPMPM * projectedMemberMonths];
  }

  private calculateProjectedMemberMonths(): number {
    // Calculate projected member months based on current data
    const currentMemberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const periodMonths = this.periods.current.months;
    
    // If provided in parameters, use that; otherwise calculate from current data
    if (this.input.carrierSpecificParameters.projectedMemberMonths) {
      return this.input.carrierSpecificParameters.projectedMemberMonths;
    }
    
    // Estimate 12-month projection from current average
    const avgMembersPerMonth = currentMemberMonths / periodMonths;
    return avgMembersPerMonth * 12;
  }

  private calculatePooledClaims(): [number, number] {
    const pooledClaims = calculatePooledClaimsForPeriod(
      this.input.largeClaimantsData || [],
      this.periods.current,
      this.input.carrierSpecificParameters.poolingLevel
    );
    
    const memberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    
    const pooledPMPM = pooledClaims.total / memberMonths;
    return [pooledPMPM, pooledClaims.total * (projectedMemberMonths / memberMonths)];
  }

  private calculateExperienceClaimCost(): [number, number] {
    const totalPaidLine = this.calculations.find(c => c.description === 'Total Paid Claims')!;
    const pooledLine = this.calculations.find(c => c.description === 'Less Pooled Claims over $50,000 PMPM')!;
    
    const pmpm = Number(totalPaidLine.pmpm) - Number(pooledLine.pmpm);
    const annual = Number(totalPaidLine.annual) - Number(pooledLine.annual);
    
    return [pmpm, annual];
  }

  private getDemographicAdjustmentFactor(): [string, string] {
    const factor = this.input.carrierSpecificParameters.demographicAdjustment;
    return [factor.toFixed(4), factor.toFixed(4)];
  }

  private calculateDemographicallyAdjustedClaims(): [number, number] {
    const experienceLine = this.calculations.find(c => c.description === 'Experience Claim Cost')!;
    const demographicFactor = this.input.carrierSpecificParameters.demographicAdjustment;
    
    const pmpm = Number(experienceLine.pmpm) * demographicFactor;
    const annual = Number(experienceLine.annual) * demographicFactor;
    
    return [pmpm, annual];
  }

  private getAnnualTrend(): [string, string] {
    const trend = this.input.carrierSpecificParameters.trendFactor.annual;
    const percentage = ((trend - 1) * 100).toFixed(2) + '%';
    return [percentage, percentage];
  }

  private getMidpointMonths(): [number, number] {
    const months = this.input.carrierSpecificParameters.trendFactor.midpointMonths;
    return [months, months];
  }

  private calculateEffectiveTrend(): [string, string] {
    const annualTrend = this.input.carrierSpecificParameters.trendFactor.annual;
    const months = this.input.carrierSpecificParameters.trendFactor.midpointMonths;
    const effectiveTrend = Math.pow(annualTrend, months / 12);
    
    return [((effectiveTrend - 1) * 100).toFixed(2) + '%', ((effectiveTrend - 1) * 100).toFixed(2) + '%'];
  }

  private calculateTrendedExperienceClaims(): [number, number] {
    const adjustedLine = this.calculations.find(c => c.description === 'Demographically Adjusted Claims')!;
    const trendFactor = Math.pow(
      this.input.carrierSpecificParameters.trendFactor.annual,
      this.input.carrierSpecificParameters.trendFactor.midpointMonths / 12
    );
    
    const pmpm = Number(adjustedLine.pmpm) * trendFactor;
    const annual = Number(adjustedLine.annual) * trendFactor;
    
    return [pmpm, annual];
  }

  private getLargeClaimAddBack(): [number, number] {
    // Calculate large claim add back if not provided
    if (this.input.carrierSpecificParameters.largeClaimAddBack.pmpm && 
        this.input.carrierSpecificParameters.largeClaimAddBack.annual) {
      return [
        this.input.carrierSpecificParameters.largeClaimAddBack.pmpm,
        this.input.carrierSpecificParameters.largeClaimAddBack.annual
      ];
    }
    
    // Calculate from experience data if not provided
    const memberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    
    // Estimate based on claims over pooling threshold
    const pooledAmount = calculatePooledClaimsForPeriod(
      this.input.largeClaimantsData || [],
      this.periods.current,
      this.input.carrierSpecificParameters.poolingLevel
    );
    
    // CIGNA typically adds back ~30% of pooled claims
    const addBackFactor = 0.30;
    const addBackPMPM = (pooledAmount.total * addBackFactor) / memberMonths;
    const addBackAnnual = addBackPMPM * projectedMemberMonths;
    
    return [addBackPMPM, addBackAnnual];
  }

  private calculateTotalProjectedClaims(): [number, number] {
    const trendedLine = this.calculations.find(c => c.description === 'Trended Experience Claims')!;
    const addBackLine = this.calculations.find(c => c.description === 'Large Claim Add Back')!;
    
    const pmpm = Number(trendedLine.pmpm) + Number(addBackLine.pmpm);
    const annual = Number(trendedLine.annual) + Number(addBackLine.annual);
    
    return [pmpm, annual];
  }

  private getExperienceWeight(): [string, string] {
    const weight = this.input.carrierSpecificParameters.experienceWeight;
    const percentage = (weight * 100).toFixed(1) + '%';
    return [percentage, percentage];
  }

  private getManualClaimCost(): [number, number] {
    // Calculate manual rate from experience if not provided, or derive from provided manual rates
    let manualRatePMPM: number;
    
    if (this.input.carrierSpecificParameters.manualRates && 
        this.input.carrierSpecificParameters.manualRates.total) {
      manualRatePMPM = this.input.carrierSpecificParameters.manualRates.total;
    } else {
      // Calculate from experience data as fallback
      const totalClaims = this.input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.incurredClaims?.medical || 0) + (month.incurredClaims?.rx || 0), 0);
      const totalMM = this.input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
      
      const experiencePMPM = totalClaims / totalMM;
      manualRatePMPM = experiencePMPM * 1.20; // 20% above experience for manual rates
    }
    
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    return [manualRatePMPM, manualRatePMPM * projectedMemberMonths];
  }

  private getManualWeight(): [string, string] {
    const weight = 1 - this.input.carrierSpecificParameters.experienceWeight;
    const percentage = (weight * 100).toFixed(1) + '%';
    return [percentage, percentage];
  }

  private calculateBlendedClaimsCost(): [number, number] {
    const projectedLine = this.calculations.find(c => c.description === 'Total Projected Claims')!;
    const manualLine = this.calculations.find(c => c.description === 'Manual Claim Cost')!;
    
    const experienceWeight = this.input.carrierSpecificParameters.experienceWeight;
    const manualWeight = 1 - experienceWeight;
    
    const pmpm = (Number(projectedLine.pmpm) * experienceWeight) + (Number(manualLine.pmpm) * manualWeight);
    const annual = (Number(projectedLine.annual) * experienceWeight) + (Number(manualLine.annual) * manualWeight);
    
    return [pmpm, annual];
  }

  private applyCFC(): [string, string] {
    const cfc = this.input.carrierSpecificParameters.claimsFluctuationCorridor;
    
    if (!cfc.enabled) {
      return ['Not Applied', 'Not Applied'];
    }
    
    return [`${(cfc.lowerBound * 100).toFixed(1)}% to ${(cfc.upperBound * 100).toFixed(1)}%`, 
           `${(cfc.lowerBound * 100).toFixed(1)}% to ${(cfc.upperBound * 100).toFixed(1)}%`];
  }

  private calculateFinalClaimsCost(): [number, number] {
    const blendedLine = this.calculations.find(c => c.description === 'Blended Claims Cost')!;
    
    // For now, CFC is just informational - final cost equals blended cost
    return [Number(blendedLine.pmpm), Number(blendedLine.annual)];
  }

  private getAdministrationExpense(): [number, number] {
    // Calculate administration expense dynamically based on claims cost
    const finalClaimsLine = this.calculations.find(c => c.description === 'Final Claims Cost')!;
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    
    // Use provided value if available, otherwise calculate as percentage of claims
    if (this.input.carrierSpecificParameters.expenseLoadings.administration) {
      const admin = this.input.carrierSpecificParameters.expenseLoadings.administration;
      return [admin, admin * projectedMemberMonths];
    }
    
    // Calculate as percentage of claims (typically 8-12% for administration)
    const adminPercent = 0.10; // 10% default
    const adminPMPM = Number(finalClaimsLine.pmpm) * adminPercent;
    return [adminPMPM, adminPMPM * projectedMemberMonths];
  }

  private getCommissions(): [number, number] {
    // Calculate commissions dynamically
    const finalClaimsLine = this.calculations.find(c => c.description === 'Final Claims Cost')!;
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    
    // Use provided value if available, otherwise calculate as percentage of claims
    if (this.input.carrierSpecificParameters.expenseLoadings.commissions) {
      const commissions = this.input.carrierSpecificParameters.expenseLoadings.commissions;
      return [commissions, commissions * projectedMemberMonths];
    }
    
    // Calculate as percentage of claims (typically 3-5% for commissions)
    const commissionPercent = 0.04; // 4% default
    const commissionPMPM = Number(finalClaimsLine.pmpm) * commissionPercent;
    return [commissionPMPM, commissionPMPM * projectedMemberMonths];
  }

  private getPremiumTax(): [number, number] {
    // Calculate premium tax dynamically
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    
    // Use provided value if available, otherwise calculate
    if (this.input.carrierSpecificParameters.expenseLoadings.premiumTax) {
      const tax = this.input.carrierSpecificParameters.expenseLoadings.premiumTax;
      return [tax, tax * projectedMemberMonths];
    }
    
    // Calculate based on typical state premium tax rates (1-3%)
    const finalClaimsLine = this.calculations.find(c => c.description === 'Final Claims Cost')!;
    const adminLine = this.calculations.find(c => c.description === 'Administration Expense')!;
    const commissionLine = this.calculations.find(c => c.description === 'Commissions')!;
    
    const basePremium = Number(finalClaimsLine.pmpm) + Number(adminLine.pmpm) + Number(commissionLine.pmpm);
    const taxPercent = 0.025; // 2.5% default premium tax
    const taxPMPM = basePremium * taxPercent;
    
    return [taxPMPM, taxPMPM * projectedMemberMonths];
  }

  private getProfitAndContingency(): [number, number] {
    // Calculate profit and contingency dynamically
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    
    // Use provided value if available, otherwise calculate
    if (this.input.carrierSpecificParameters.expenseLoadings.profitAndContingency) {
      const profit = this.input.carrierSpecificParameters.expenseLoadings.profitAndContingency;
      return [profit, profit * projectedMemberMonths];
    }
    
    // Calculate as percentage of claims (typically 3-6% for profit margin)
    const finalClaimsLine = this.calculations.find(c => c.description === 'Final Claims Cost')!;
    const profitPercent = 0.05; // 5% default profit margin
    const profitPMPM = Number(finalClaimsLine.pmpm) * profitPercent;
    return [profitPMPM, profitPMPM * projectedMemberMonths];
  }

  private getOtherExpenses(): [number, number] {
    // Calculate other expenses dynamically
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    
    // Use provided value if available, otherwise calculate
    if (this.input.carrierSpecificParameters.expenseLoadings.other) {
      const other = this.input.carrierSpecificParameters.expenseLoadings.other;
      return [other, other * projectedMemberMonths];
    }
    
    // Calculate as small percentage for miscellaneous expenses
    const finalClaimsLine = this.calculations.find(c => c.description === 'Final Claims Cost')!;
    const otherPercent = 0.02; // 2% default for other expenses
    const otherPMPM = Number(finalClaimsLine.pmpm) * otherPercent;
    return [otherPMPM, otherPMPM * projectedMemberMonths];
  }

  private calculateTotalRequiredPremium(): [number, number] {
    const finalClaimsLine = this.calculations.find(c => c.description === 'Final Claims Cost')!;
    const adminLine = this.calculations.find(c => c.description === 'Administration Expense')!;
    const commissionsLine = this.calculations.find(c => c.description === 'Commissions')!;
    const taxLine = this.calculations.find(c => c.description === 'Premium Tax')!;
    const profitLine = this.calculations.find(c => c.description === 'Profit and Contingency')!;
    const otherLine = this.calculations.find(c => c.description === 'Other Expenses')!;
    
    const pmpm = Number(finalClaimsLine.pmpm) + Number(adminLine.pmpm) + Number(commissionsLine.pmpm) + 
                 Number(taxLine.pmpm) + Number(profitLine.pmpm) + Number(otherLine.pmpm);
    
    const annual = Number(finalClaimsLine.annual) + Number(adminLine.annual) + Number(commissionsLine.annual) + 
                   Number(taxLine.annual) + Number(profitLine.annual) + Number(otherLine.annual);
    
    return [pmpm, annual];
  }

  private getCurrentPremium(): [number, number] {
    // Calculate current premium from experience data if not provided
    let currentPMPM: number;
    
    if (this.input.carrierSpecificParameters.currentPremiumPMPM) {
      currentPMPM = this.input.carrierSpecificParameters.currentPremiumPMPM;
    } else {
      // Calculate from experience data with estimated retention
      const totalClaims = this.input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.incurredClaims?.medical || 0) + (month.incurredClaims?.rx || 0), 0);
      const totalMM = this.input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
      
      const experiencePMPM = totalClaims / totalMM;
      currentPMPM = experiencePMPM * 1.22; // 22% retention estimate for CIGNA
    }
    
    const projectedMemberMonths = this.calculateProjectedMemberMonths();
    return [currentPMPM, currentPMPM * projectedMemberMonths];
  }

  private calculateRequiredRateChange(): [string, string] {
    const requiredLine = this.calculations.find(c => c.description === 'Total Required Premium')!;
    const currentLine = this.calculations.find(c => c.description === 'Current Premium')!;
    
    const rateChange = (Number(requiredLine.pmpm) - Number(currentLine.pmpm)) / Number(currentLine.pmpm);
    const percentage = (rateChange * 100).toFixed(2) + '%';
    
    return [percentage, percentage];
  }

  private getFinalPremium(): { pmpm: number; annual: number } {
    const requiredLine = this.calculations.find(c => c.description === 'Total Required Premium')!;
    
    return {
      pmpm: Number(requiredLine.pmpm),
      annual: Number(requiredLine.annual)
    };
  }

  private getRateChange(): number {
    const requiredLine = this.calculations.find(c => c.description === 'Total Required Premium')!;
    const currentLine = this.calculations.find(c => c.description === 'Current Premium')!;
    
    return (Number(requiredLine.pmpm) - Number(currentLine.pmpm)) / Number(currentLine.pmpm);
  }

  private createPeriodAnalysis(): CignaResult['period'] {
    const memberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    
    return {
      start: this.periods.current.start,
      end: this.periods.current.end,
      months: this.periods.current.months,
      memberMonths: memberMonths
    };
  }

  private createSummary(): CignaResult['summary'] {
    const totalPaidLine = this.calculations.find(c => c.description === 'Total Paid Claims')!;
    const experienceLine = this.calculations.find(c => c.description === 'Experience Claim Cost')!;
    const projectedLine = this.calculations.find(c => c.description === 'Total Projected Claims')!;
    const expenseLines = this.calculations.filter(c => 
      ['Administration Expense', 'Commissions', 'Premium Tax', 'Profit and Contingency', 'Other Expenses'].includes(c.description)
    );
    
    const totalExpensesPMPM = expenseLines.reduce((sum, line) => sum + Number(line.pmpm), 0);
    const totalExpensesAnnual = expenseLines.reduce((sum, line) => sum + Number(line.annual), 0);
    
    return {
      totalPaidClaims: {
        pmpm: Number(totalPaidLine.pmpm),
        annual: Number(totalPaidLine.annual)
      },
      experienceClaimCost: {
        pmpm: Number(experienceLine.pmpm),
        annual: Number(experienceLine.annual)
      },
      projectedClaimCost: {
        pmpm: Number(projectedLine.pmpm),
        annual: Number(projectedLine.annual)
      },
      totalExpenses: {
        pmpm: totalExpensesPMPM,
        annual: totalExpensesAnnual
      }
    };
  }

  private getDataQuality(): CignaResult['dataQuality'] {
    const validation = validateDataQuality(
      this.input.monthlyClaimsData,
      this.input.largeClaimantsData || [],
      this.periods
    );
    
    const completeness = validation.valid ? 1.0 : 0.8; // Simple scoring
    
    return {
      dataCompleteness: completeness,
      annualizationApplied: this.periods.current.months < 12
    };
  }
}

// Legacy compatibility function
export function calculateCignaRenewal(input: UniversalInput): any {
  if (input.carrier !== 'CIGNA') {
    throw new Error('Input carrier must be CIGNA');
  }
  
  // Calculate values from experience data instead of using hardcoded defaults
  const totalMedical = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.medical || 0), 0);
  const totalRx = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.rx || 0), 0);
  const totalMM = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
  
  const experiencePMPM = (totalMedical + totalRx) / totalMM;
  const calculatedManualPMPM = experiencePMPM * 1.20; // 20% above experience for CIGNA manual rates
  const calculatedCurrentPremium = experiencePMPM * 1.22; // 22% retention estimate for CIGNA
  
  // Calculate projected member months (typically 12 months forward)
  const avgMembersPerMonth = totalMM / input.monthlyClaimsData.length;
  const projectedMemberMonths = avgMembersPerMonth * 12;
  
  const cignaInput: CignaInput = {
    ...input,
    carrierSpecificParameters: {
      poolingLevel: 50000, // CIGNA standard
      demographicAdjustment: 1.0,
      trendFactor: {
        annual: 1.085, // 8.5% annual trend (editable)
        midpointMonths: 12
      },
      largeClaimAddBack: {
        pmpm: 0, // Will be calculated from experience data
        annual: 0 // Will be calculated from experience data
      },
      manualRates: {
        medical: calculatedManualPMPM * 0.75, // Derived split
        pharmacy: calculatedManualPMPM * 0.25, // Derived split
        total: calculatedManualPMPM
      },
      experienceWeight: 0.80, // 80% experience, 20% manual (CIGNA standard)
      claimsFluctuationCorridor: {
        enabled: true,
        lowerBound: 0.85,
        upperBound: 1.15
      },
      expenseLoadings: {
        administration: 0, // Will be calculated as % of claims
        commissions: 0, // Will be calculated as % of claims
        premiumTax: 0, // Will be calculated as % of premium
        profitAndContingency: 0, // Will be calculated as % of claims
        other: 0 // Will be calculated as % of claims
      },
      currentPremiumPMPM: calculatedCurrentPremium,
      projectedMemberMonths: projectedMemberMonths
    }
  };
  
  const calculator = new CignaRenewalCalculator(cignaInput);
  const result = calculator.calculate();
  
  return {
    carrier: result.carrier,
    finalPremium: result.finalPremium.pmpm,
    rateChange: result.rateChange,
    calculations: result.calculations,
    warnings: result.warnings
  };
} 