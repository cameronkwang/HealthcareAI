import { 
  UniversalInput, 
  CalculationResult, 
  CoverageAmounts,
  ExperiencePeriods,
  ValidationResult 
} from '../../../types/common';
import { 
  AetnaParameters, 
  AetnaResult, 
  AetnaCalculationLine,
  AETNA_CALCULATION_LINES 
} from '../../../types/aetna';
import {
  determineExperiencePeriods,
  validateDataQuality,
  getClaimsForPeriod,
  getMemberMonthsForPeriod,
  calculatePooledClaimsForPeriod,
  annualizeClaims
} from '../../../utils/periodHandling';

/**
 * AETNA Renewal Calculator implementing the exact 28-line methodology
 * with 7-column structure: Row Labels + 3 Current + 3 Prior columns
 */
export class AetnaRenewalCalculator {
  private calculations: AetnaCalculationLine[] = [];
  private periods: ExperiencePeriods;
  private validationResult: ValidationResult;
  private calculatedParameters: AetnaParameters;

  constructor(
    private input: UniversalInput,
    private parameters: AetnaParameters
  ) {
    // Determine experience periods
    this.periods = determineExperiencePeriods(
      input.monthlyClaimsData,
      input.effectiveDates.renewalStart
    );

    // Validate data quality
    this.validationResult = validateDataQuality(
      input.monthlyClaimsData,
      input.largeClaimantsData,
      this.periods
    );

    if (!this.validationResult.valid) {
      throw new Error(`Data validation failed: ${this.validationResult.errors.join(', ')}`);
    }

    // Calculate missing parameters from experience data
    this.calculatedParameters = this.calculateMissingParameters();
  }

  private calculateMissingParameters(): AetnaParameters {
    // Calculate experience PMPM for defaults
    const totalMedical = this.input.monthlyClaimsData.reduce((sum, month) => 
      sum + (month.incurredClaims?.medical || 0), 0);
    const totalRx = this.input.monthlyClaimsData.reduce((sum, month) => 
      sum + (month.incurredClaims?.rx || 0), 0);
    const totalMM = this.input.monthlyClaimsData.reduce((sum, month) => 
      sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
    
    const experiencePMPM = (totalMedical + totalRx) / totalMM;
    const medicalPMPM = totalMedical / totalMM;
    const rxPMPM = totalRx / totalMM;

    // Calculate retention as percentage of experience
    const retentionPct = 0.127; // 12.7% standard Aetna retention
    const retentionPMPM = experiencePMPM * retentionPct;

    return {
      ...this.parameters,
      // Fill in missing values with calculated defaults
      poolingChargesPMPM: this.parameters.poolingChargesPMPM ?? (experiencePMPM * 0.097), // 9.7% pooling factor
      networkAdjustment: this.parameters.networkAdjustment ?? 1.0,
      planAdjustment: this.parameters.planAdjustment ?? 1.0,
      demographicAdjustment: this.parameters.demographicAdjustment ?? 1.0,
      underwritingAdjustment: this.parameters.underwritingAdjustment ?? 1.0,
      manualRates: this.parameters.manualRates ?? {
        medical: medicalPMPM * 1.15, // 15% above experience
        rx: rxPMPM * 1.15 // 15% above experience
      },
      largeClaimAdjustment: this.parameters.largeClaimAdjustment ?? 0,
      nonBenefitExpensesPMPM: this.parameters.nonBenefitExpensesPMPM ?? (retentionPMPM * 0.40),
      retentionComponents: this.parameters.retentionComponents ?? {
        admin: retentionPMPM * 0.35,
        commissions: retentionPMPM * 0.25,
        premium_tax: retentionPMPM * 0.15,
        risk_margin: retentionPMPM * 0.20,
        other: retentionPMPM * 0.05
      },
      currentPremiumPMPM: this.parameters.currentPremiumPMPM ?? (experiencePMPM * 1.16) // 16% retention estimate
    };
  }

  public calculate(): AetnaResult {
    // Reset calculations
    this.calculations = [];

    // Execute the 28-line calculation flow
    this.calculateLine1_IncurredClaims();
    this.calculateLine2_DeductibleSuppression();
    this.calculateLine3_ClaimsWithSuppression();
    this.calculateLine4_PooledClaims();
    this.calculateLine5_PoolingCharge();
    this.calculateLine6_ClaimsWithPooling();
    this.calculateLine7_NetworkAdjustment();
    this.calculateLine8_PlanAdjustment();
    this.calculateLine9_DemographicAdjustment();
    this.calculateLine10_UnderwritingAdjustment();
    this.calculateLine11_ClaimsWithFactors();
    this.calculateLine12_TrendApplication();
    this.calculateLine13_ProjectedClaims();
    this.calculateLine14_PeriodWeighting();
    this.calculateLine15_WeightedProjectedClaims();
    this.calculateLine16_ExperienceCredibility();
    this.calculateLine17_ManualProjectedClaims();
    this.calculateLine18_BlendedProjectedClaims();
    this.calculateLine19_LargeClaimAdjustment();
    this.calculateLine20_NonBenefitExpenses();
    this.calculateLine21_TotalRetentionCharges();
    this.calculateLine22_ProjectedPremium();
    this.calculateLine23_RateAdjustment();
    this.calculateLine24_ProposedPremium();
    this.calculateLine25_ProducerServiceFee();
    this.calculateLine26_TotalAmountDue();
    this.calculateLine27_EstimatedCurrentPremium();
    this.calculateLine28_RequiredRateChange();

    return this.formatResult();
  }

  private calculateLine1_IncurredClaims(): void {
    const currentClaims = getClaimsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const currentMemberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);

    let priorClaims = { medical: 0, rx: 0, total: 0 };
    let priorMemberMonths = 0;

    if (this.periods.prior) {
      priorClaims = getClaimsForPeriod(this.input.monthlyClaimsData, this.periods.prior);
      priorMemberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.prior);
    }

    // Handle annualization for current period if needed
    let currentPMPM: CoverageAmounts;
    if (this.periods.current.months < 12) {
      const annualized = annualizeClaims(
        this.input.monthlyClaimsData.filter(m => {
          const monthDate = new Date(m.month);
          return monthDate >= this.periods.current.start && monthDate <= this.periods.current.end;
        }),
        this.periods.current.months
      );
      currentPMPM = {
        medCap: annualized.annualizedClaims.medical / annualized.annualizedMemberMonths,
        rx: annualized.annualizedClaims.rx / annualized.annualizedMemberMonths,
        total: annualized.annualizedClaims.total / annualized.annualizedMemberMonths
      };
    } else {
      currentPMPM = {
        medCap: currentClaims.medical / currentMemberMonths,
        rx: currentClaims.rx / currentMemberMonths,
        total: currentClaims.total / currentMemberMonths
      };
    }

    // Handle annualization for prior period if needed
    let priorPMPM: CoverageAmounts = { medCap: 0, rx: 0, total: 0 };
    if (this.periods.prior) {
      if (this.periods.prior.months < 12) {
        const annualized = annualizeClaims(
          this.input.monthlyClaimsData.filter(m => {
            const monthDate = new Date(m.month);
            return monthDate >= this.periods.prior!.start && monthDate <= this.periods.prior!.end;
          }),
          this.periods.prior.months
        );
        priorPMPM = {
          medCap: annualized.annualizedClaims.medical / annualized.annualizedMemberMonths,
          rx: annualized.annualizedClaims.rx / annualized.annualizedMemberMonths,
          total: annualized.annualizedClaims.total / annualized.annualizedMemberMonths
        };
      } else {
        priorPMPM = {
          medCap: priorClaims.medical / priorMemberMonths,
          rx: priorClaims.rx / priorMemberMonths,
          total: priorClaims.total / priorMemberMonths
        };
      }
    }

    this.calculations.push({
      lineNumber: '1',
      description: 'Incurred Claims',
      current: currentPMPM,
      prior: priorPMPM,
      calculation: 'Total Claims / Member Months'
    });
  }

  private calculateLine2_DeductibleSuppression(): void {
    const factor = this.calculatedParameters.deductibleSuppressionFactor;
    
    this.calculations.push({
      lineNumber: '2',
      description: 'Deductible Suppression Factor',
      current: { medCap: factor, rx: factor, total: factor },
      prior: { medCap: factor, rx: factor, total: factor },
      calculation: 'Fixed factor applied to both periods'
    });
  }

  private calculateLine3_ClaimsWithSuppression(): void {
    const line1 = this.calculations.find(c => c.lineNumber === '1')!;
    const line2 = this.calculations.find(c => c.lineNumber === '2')!;

    const current: CoverageAmounts = {
      medCap: line1.current.medCap * line2.current.medCap,
      rx: line1.current.rx * line2.current.rx,
      total: line1.current.total * line2.current.total
    };

    const prior: CoverageAmounts = {
      medCap: line1.prior.medCap * line2.prior.medCap,
      rx: line1.prior.rx * line2.prior.rx,
      total: line1.prior.total * line2.prior.total
    };

    this.calculations.push({
      lineNumber: '3',
      description: 'Incurred Claims x Deductible Suppression Factor',
      current,
      prior,
      calculation: 'Line 1 × Line 2'
    });
  }

  private calculateLine4_PooledClaims(): void {
    const currentPooled = calculatePooledClaimsForPeriod(
      this.input.largeClaimantsData,
      this.periods.current,
      this.calculatedParameters.poolingLevel
    );

    let priorPooled = { medical: 0, rx: 0, total: 0 };
    if (this.periods.prior) {
      priorPooled = calculatePooledClaimsForPeriod(
        this.input.largeClaimantsData,
        this.periods.prior,
        this.calculatedParameters.poolingLevel
      );
    }

    const currentMemberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const priorMemberMonths = this.periods.prior ? 
      getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.prior) : 1;

    const current: CoverageAmounts = {
      medCap: currentPooled.medical / currentMemberMonths,
      rx: currentPooled.rx / currentMemberMonths,
      total: currentPooled.total / currentMemberMonths
    };

    const prior: CoverageAmounts = {
      medCap: priorPooled.medical / priorMemberMonths,
      rx: priorPooled.rx / priorMemberMonths,
      total: priorPooled.total / priorMemberMonths
    };

    this.calculations.push({
      lineNumber: '4',
      description: 'Pooled Claims',
      current,
      prior,
      calculation: `Claims over $${this.calculatedParameters.poolingLevel.toLocaleString()} / Member Months`
    });
  }

  private calculateLine5_PoolingCharge(): void {
    const charge = this.calculatedParameters.poolingChargesPMPM || 0;
    
    this.calculations.push({
      lineNumber: '5',
      description: 'Pooling Charge',
      current: { medCap: charge, rx: 0, total: charge },
      prior: { medCap: charge, rx: 0, total: charge },
      calculation: 'Fixed pooling charges PMPM'
    });
  }

  private calculateLine6_ClaimsWithPooling(): void {
    const line3 = this.calculations.find(c => c.lineNumber === '3')!;
    const line4 = this.calculations.find(c => c.lineNumber === '4')!;
    const line5 = this.calculations.find(c => c.lineNumber === '5')!;

    const current: CoverageAmounts = {
      medCap: line3.current.medCap - line4.current.medCap + line5.current.medCap,
      rx: line3.current.rx - line4.current.rx + line5.current.rx,
      total: line3.current.total - line4.current.total + line5.current.total
    };

    const prior: CoverageAmounts = {
      medCap: line3.prior.medCap - line4.prior.medCap + line5.prior.medCap,
      rx: line3.prior.rx - line4.prior.rx + line5.prior.rx,
      total: line3.prior.total - line4.prior.total + line5.prior.total
    };

    this.calculations.push({
      lineNumber: '6',
      description: 'Incurred Claims w/ Pooling',
      current,
      prior,
      calculation: 'Line 3 - Line 4 + Line 5'
    });
  }

  private calculateLine7_NetworkAdjustment(): void {
    const factor = this.calculatedParameters.networkAdjustment || 1.0;
    
    this.calculations.push({
      lineNumber: '7',
      description: 'Network Adjustment',
      current: { medCap: factor, rx: factor, total: factor },
      prior: { medCap: factor, rx: factor, total: factor },
      calculation: 'Network change adjustment factor'
    });
  }

  private calculateLine8_PlanAdjustment(): void {
    const factor = this.calculatedParameters.planAdjustment || 1.0;
    
    this.calculations.push({
      lineNumber: '8',
      description: 'Plan Adjustment',
      current: { medCap: factor, rx: factor, total: factor },
      prior: { medCap: factor, rx: factor, total: factor },
      calculation: 'Plan design change adjustment factor'
    });
  }

  private calculateLine9_DemographicAdjustment(): void {
    const factor = this.calculatedParameters.demographicAdjustment || 1.0;
    
    this.calculations.push({
      lineNumber: '9',
      description: 'Demographic Adjustment',
      current: { medCap: factor, rx: factor, total: factor },
      prior: { medCap: factor, rx: factor, total: factor },
      calculation: 'Age/sex demographic adjustment factor'
    });
  }

  private calculateLine10_UnderwritingAdjustment(): void {
    const factor = this.calculatedParameters.underwritingAdjustment || 1.0;
    
    this.calculations.push({
      lineNumber: '10',
      description: 'Underwriting Adjustment',
      current: { medCap: factor, rx: factor, total: factor },
      prior: { medCap: factor, rx: factor, total: factor },
      calculation: 'Underwriting adjustment factor'
    });
  }

  private calculateLine11_ClaimsWithFactors(): void {
    const line6 = this.calculations.find(c => c.lineNumber === '6')!;
    const line7 = this.calculations.find(c => c.lineNumber === '7')!;
    const line8 = this.calculations.find(c => c.lineNumber === '8')!;
    const line9 = this.calculations.find(c => c.lineNumber === '9')!;
    const line10 = this.calculations.find(c => c.lineNumber === '10')!;

    const current: CoverageAmounts = {
      medCap: line6.current.medCap * line7.current.medCap * line8.current.medCap * 
              line9.current.medCap * line10.current.medCap,
      rx: line6.current.rx * line7.current.rx * line8.current.rx * 
          line9.current.rx * line10.current.rx,
      total: line6.current.total * line7.current.total * line8.current.total * 
             line9.current.total * line10.current.total
    };

    const prior: CoverageAmounts = {
      medCap: line6.prior.medCap * line7.prior.medCap * line8.prior.medCap * 
              line9.prior.medCap * line10.prior.medCap,
      rx: line6.prior.rx * line7.prior.rx * line8.prior.rx * 
          line9.prior.rx * line10.prior.rx,
      total: line6.prior.total * line7.prior.total * line8.prior.total * 
             line9.prior.total * line10.prior.total
    };

    this.calculations.push({
      lineNumber: '11',
      description: 'Incurred Claims x Factors',
      current,
      prior,
      calculation: 'Line 6 × Lines 7-10'
    });
  }

  private calculateLine12_TrendApplication(): void {
    const medicalTrend = Math.pow(
      this.calculatedParameters.trendFactor.medical,
      this.calculatedParameters.trendFactor.months / 12
    );
    const rxTrend = Math.pow(
      this.calculatedParameters.trendFactor.rx,
      this.calculatedParameters.trendFactor.months / 12
    );

    // Get Line 11 claims for weighted total trend calculation
    const line11 = this.calculations.find(c => c.lineNumber === '11')!;
    const totalClaims = line11.current.total;
    let weightedTotalTrend: number;
    
    if (totalClaims > 0) {
      // Calculate weighted trend based on claim amounts
      weightedTotalTrend = (
        (line11.current.medCap * medicalTrend) + 
        (line11.current.rx * rxTrend)
      ) / totalClaims;
    } else {
      // Fallback to simple average if no claims
      weightedTotalTrend = (medicalTrend + rxTrend) / 2;
    }

    this.calculations.push({
      lineNumber: '12',
      description: 'Trend Application',
      current: { 
        medCap: medicalTrend, 
        rx: rxTrend, 
        total: weightedTotalTrend
      },
      prior: { 
        medCap: medicalTrend, 
        rx: rxTrend, 
        total: weightedTotalTrend
      },
      calculation: `Med: ${this.calculatedParameters.trendFactor.medical}^(${this.calculatedParameters.trendFactor.months}/12), Rx: ${this.calculatedParameters.trendFactor.rx}^(${this.calculatedParameters.trendFactor.months}/12)`
    });
  }

  private calculateLine13_ProjectedClaims(): void {
    const line11 = this.calculations.find(c => c.lineNumber === '11')!;
    const line12 = this.calculations.find(c => c.lineNumber === '12')!;

    const current: CoverageAmounts = {
      medCap: line11.current.medCap * line12.current.medCap,
      rx: line11.current.rx * line12.current.rx,
      total: line11.current.total * line12.current.total
    };

    const prior: CoverageAmounts = {
      medCap: line11.prior.medCap * line12.prior.medCap,
      rx: line11.prior.rx * line12.prior.rx,
      total: line11.prior.total * line12.prior.total
    };

    this.calculations.push({
      lineNumber: '13',
      description: 'Projected Claims PMPM',
      current,
      prior,
      calculation: 'Line 11 × Line 12'
    });
  }

  private calculateLine14_PeriodWeighting(): void {
    const currentWeight = this.calculatedParameters.periodWeighting.current;
    const priorWeight = this.calculatedParameters.periodWeighting.prior;
    
    this.calculations.push({
      lineNumber: '14',
      description: 'Experience Period Weighting',
      current: { medCap: currentWeight, rx: currentWeight, total: currentWeight },
      prior: { medCap: priorWeight, rx: priorWeight, total: priorWeight },
      calculation: `Current: ${currentWeight}, Prior: ${priorWeight}`
    });
  }

  private calculateLine15_WeightedProjectedClaims(): void {
    const line13 = this.calculations.find(c => c.lineNumber === '13')!;
    const line14 = this.calculations.find(c => c.lineNumber === '14')!;

    const current: CoverageAmounts = {
      medCap: line13.current.medCap * line14.current.medCap + 
              line13.prior.medCap * line14.prior.medCap,
      rx: line13.current.rx * line14.current.rx + 
          line13.prior.rx * line14.prior.rx,
      total: line13.current.total * line14.current.total + 
             line13.prior.total * line14.prior.total
    };

    // For display, show weighted result in current column, zero in prior
    const prior: CoverageAmounts = { medCap: 0, rx: 0, total: 0 };

    this.calculations.push({
      lineNumber: '15',
      description: 'Experience Weighted Projected Claims',
      current,
      prior,
      calculation: 'Line 13 Current × Line 14 Current + Line 13 Prior × Line 14 Prior'
    });
  }

  private calculateLine16_ExperienceCredibility(): void {
    const currentMemberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const priorMemberMonths = this.periods.prior ? 
      getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.prior) : 0;
    const totalMemberMonths = currentMemberMonths + priorMemberMonths;

    let credibility: number;
    if (this.calculatedParameters.credibilityParameters.credibilityFormula === 'sqrt') {
      credibility = Math.min(1, Math.sqrt(totalMemberMonths / this.calculatedParameters.credibilityParameters.fullCredibilityMemberMonths));
    } else {
      credibility = Math.min(1, totalMemberMonths / this.calculatedParameters.credibilityParameters.fullCredibilityMemberMonths);
    }

    credibility = Math.max(credibility, this.calculatedParameters.credibilityParameters.minimumCredibility);

    this.calculations.push({
      lineNumber: '16',
      description: 'Experience Credibility',
      current: { medCap: credibility, rx: credibility, total: credibility },
      prior: { medCap: 1 - credibility, rx: 1 - credibility, total: 1 - credibility },
      calculation: `sqrt(${totalMemberMonths} / ${this.calculatedParameters.credibilityParameters.fullCredibilityMemberMonths}) = ${credibility.toFixed(3)}`
    });
  }

  private calculateLine17_ManualProjectedClaims(): void {
    const manualMed = this.calculatedParameters.manualRates?.medical || 0;
    const manualRx = this.calculatedParameters.manualRates?.rx || 0;
    
    this.calculations.push({
      lineNumber: '17',
      description: 'Manual Projected Claims',
      current: { medCap: manualMed, rx: manualRx, total: manualMed + manualRx },
      prior: { medCap: manualMed, rx: manualRx, total: manualMed + manualRx },
      calculation: 'Manual rates from carrier'
    });
  }

  private calculateLine18_BlendedProjectedClaims(): void {
    const line15 = this.calculations.find(c => c.lineNumber === '15')!;
    const line16 = this.calculations.find(c => c.lineNumber === '16')!;
    const line17 = this.calculations.find(c => c.lineNumber === '17')!;

    const current: CoverageAmounts = {
      medCap: line15.current.medCap * line16.current.medCap + 
              line17.current.medCap * line16.prior.medCap,
      rx: line15.current.rx * line16.current.rx + 
          line17.current.rx * line16.prior.rx,
      total: line15.current.total * line16.current.total + 
             line17.current.total * line16.prior.total
    };

    // Prior column shows the same blended result
    const prior: CoverageAmounts = { ...current };

    this.calculations.push({
      lineNumber: '18',
      description: 'Blended Projected Claims',
      current,
      prior,
      calculation: 'Line 15 × Line 16 Experience + Line 17 × Line 16 Manual'
    });
  }

  private calculateLine19_LargeClaimAdjustment(): void {
    const adjustment = this.calculatedParameters.largeClaimAdjustment || 0;
    
    this.calculations.push({
      lineNumber: '19',
      description: 'Large Claim Adjustment',
      current: { medCap: adjustment, rx: 0, total: adjustment },
      prior: { medCap: adjustment, rx: 0, total: adjustment },
      calculation: 'Additional large claim loading'
    });
  }

  private calculateLine20_NonBenefitExpenses(): void {
    const expenses = this.calculatedParameters.nonBenefitExpensesPMPM || 0;
    
    this.calculations.push({
      lineNumber: '20',
      description: 'Non-Benefit Expenses',
      current: { medCap: expenses, rx: 0, total: expenses },
      prior: { medCap: expenses, rx: 0, total: expenses },
      calculation: 'Fixed non-benefit expenses PMPM'
    });
  }

  private calculateLine21_TotalRetentionCharges(): void {
    const retention = this.calculatedParameters.retentionComponents || {
      admin: 0, commissions: 0, premium_tax: 0, risk_margin: 0, other: 0
    };
    const { admin, commissions, premium_tax, risk_margin, other } = retention;
    const total = admin + commissions + premium_tax + risk_margin + other;
    
    this.calculations.push({
      lineNumber: '21',
      description: 'Total Retention Charges',
      current: { medCap: total, rx: 0, total },
      prior: { medCap: total, rx: 0, total },
      calculation: `Admin(${admin}) + Comm(${commissions}) + Tax(${premium_tax}) + Risk(${risk_margin}) + Other(${other})`
    });
  }

  private calculateLine22_ProjectedPremium(): void {
    const line18 = this.calculations.find(c => c.lineNumber === '18')!;
    const line19 = this.calculations.find(c => c.lineNumber === '19')!;
    const line20 = this.calculations.find(c => c.lineNumber === '20')!;
    const line21 = this.calculations.find(c => c.lineNumber === '21')!;

    const current: CoverageAmounts = {
      medCap: line18.current.medCap + line19.current.medCap + line20.current.medCap + line21.current.medCap,
      rx: line18.current.rx + line19.current.rx + line20.current.rx + line21.current.rx,
      total: line18.current.total + line19.current.total + line20.current.total + line21.current.total
    };

    const prior: CoverageAmounts = { ...current };

    this.calculations.push({
      lineNumber: '22',
      description: 'Projected Premium',
      current,
      prior,
      calculation: 'Lines 18 + 19 + 20 + 21'
    });
  }

  private calculateLine23_RateAdjustment(): void {
    const adjustment = this.calculatedParameters.rateAdjustment || 1.0;
    
    this.calculations.push({
      lineNumber: '23',
      description: 'Rate Adjustment',
      current: { medCap: adjustment, rx: adjustment, total: adjustment },
      prior: { medCap: adjustment, rx: adjustment, total: adjustment },
      calculation: 'Rate cap/floor adjustment factor'
    });
  }

  private calculateLine24_ProposedPremium(): void {
    const line22 = this.calculations.find(c => c.lineNumber === '22')!;
    const line23 = this.calculations.find(c => c.lineNumber === '23')!;

    const current: CoverageAmounts = {
      medCap: line22.current.medCap * line23.current.medCap,
      rx: line22.current.rx * line23.current.rx,
      total: line22.current.total * line23.current.total
    };

    const prior: CoverageAmounts = { ...current };

    this.calculations.push({
      lineNumber: '24',
      description: 'Proposed Premium',
      current,
      prior,
      calculation: 'Line 22 × Line 23'
    });
  }

  private calculateLine25_ProducerServiceFee(): void {
    const fee = this.calculatedParameters.producerServiceFeePMPM || 0;
    
    this.calculations.push({
      lineNumber: '25',
      description: 'Producer Service Fee',
      current: { medCap: fee, rx: 0, total: fee },
      prior: { medCap: fee, rx: 0, total: fee },
      calculation: 'Producer service fee PMPM'
    });
  }

  private calculateLine26_TotalAmountDue(): void {
    const line24 = this.calculations.find(c => c.lineNumber === '24')!;
    const line25 = this.calculations.find(c => c.lineNumber === '25')!;

    const current: CoverageAmounts = {
      medCap: line24.current.medCap + line25.current.medCap,
      rx: line24.current.rx + line25.current.rx,
      total: line24.current.total + line25.current.total
    };

    const prior: CoverageAmounts = { ...current };

    this.calculations.push({
      lineNumber: '26',
      description: 'Total Amount Due',
      current,
      prior,
      calculation: 'Line 24 + Line 25'
    });
  }

  private calculateLine27_EstimatedCurrentPremium(): void {
    let currentPremium = this.calculatedParameters.currentPremiumPMPM || 0;
    let calculationNote = 'Current premium from parameters';
    
    // Try to calculate current premium from earned premium data if available
    if (this.input.monthlyClaimsData && this.input.monthlyClaimsData.length > 0) {
      const recentMonths = this.input.monthlyClaimsData
        .filter(month => month.earnedPremium?.total && month.memberMonths.total > 0)
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
        .slice(0, 12); // Use most recent 12 months with earned premium data
      
      if (recentMonths.length > 0) {
        const totalEarnedPremium = recentMonths.reduce((sum, month) => sum + (month.earnedPremium!.total || 0), 0);
        const totalMemberMonths = recentMonths.reduce((sum, month) => sum + month.memberMonths.total, 0);
        
        if (totalMemberMonths > 0) {
          currentPremium = totalEarnedPremium / totalMemberMonths;
          calculationNote = `Calculated from earned premium data (${recentMonths.length} months)`;
        }
      }
    }
    
    this.calculations.push({
      lineNumber: '27',
      description: 'Estimated Current Premium',
      current: { medCap: currentPremium || 0, rx: 0, total: currentPremium || 0 },
      prior: { medCap: currentPremium || 0, rx: 0, total: currentPremium || 0 },
      calculation: calculationNote
    });
  }

  private calculateLine28_RequiredRateChange(): void {
    const line26 = this.calculations.find(c => c.lineNumber === '26')!;
    const line27 = this.calculations.find(c => c.lineNumber === '27')!;

    const rateChange = (line26.current.total / line27.current.total) - 1;

    this.calculations.push({
      lineNumber: '28',
      description: 'Required Rate Change',
      current: { medCap: rateChange, rx: 0, total: rateChange },
      prior: { medCap: rateChange, rx: 0, total: rateChange },
      calculation: '(Line 26 / Line 27) - 1'
    });
  }

  private formatResult(): AetnaResult {
    const finalLine = this.calculations.find(c => c.lineNumber === '26')!;
    const rateChangeLine = this.calculations.find(c => c.lineNumber === '28')!;
    const credibilityLine = this.calculations.find(c => c.lineNumber === '16')!;

    const currentMemberMonths = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const priorMemberMonths = this.periods.prior ? 
      getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.prior) : 0;
    const weightedMemberMonths = 
      currentMemberMonths * this.calculatedParameters.periodWeighting.current +
      priorMemberMonths * this.calculatedParameters.periodWeighting.prior;

    return {
      carrier: 'AETNA',
      finalPremiumPMPM: finalLine.current.total,
      rateChange: rateChangeLine.current.total,
      calculations: this.calculations,
      periods: this.periods,
      summary: {
        incurredClaimsPMPM: this.calculations.find(c => c.lineNumber === '1')!.current,
        projectedClaimsPMPM: this.calculations.find(c => c.lineNumber === '18')!.current,
        totalRetentionPMPM: this.calculations.find(c => c.lineNumber === '21')!.current.total,
        memberMonthsUsed: {
          current: currentMemberMonths,
          prior: priorMemberMonths,
          weighted: weightedMemberMonths
        }
      },
      warnings: this.validationResult.warnings || [],
      dataQuality: {
        credibilityScore: credibilityLine.current.total,
        dataCompleteness: this.periods.current.months / 12,
        annualizationApplied: this.periods.current.months < 12
      }
    };
  }
}

// Legacy function for backward compatibility
export function calculateAetnaRenewal(input: UniversalInput, params: AetnaParameters): CalculationResult {
  const calculator = new AetnaRenewalCalculator(input, params);
  const result = calculator.calculate();
  
  // Convert to legacy format
  return {
    carrier: result.carrier,
    currentPremiumPMPM: params.currentPremiumPMPM || 0,
    projectedPremiumPMPM: result.finalPremiumPMPM,
    requiredRateChange: result.rateChange,
    proposedRateChange: result.rateChange,
    calculationSteps: result.calculations.map(calc => ({
      label: `${calc.lineNumber}. ${calc.description}`,
      value: `Med: $${calc.current.medCap.toFixed(2)}, Rx: $${calc.current.rx.toFixed(2)}, Total: $${calc.current.total.toFixed(2)}`,
      description: calc.calculation,
      category: 'calculation' as const,
      lineNumber: calc.lineNumber
    })),
    warnings: result.warnings.map(w => ({ message: w, severity: 'warning' as const })),
    detailedResults: { aetna: result.calculations },
    experiencePeriods: result.periods,
    memberMonths: {
      current: result.summary.memberMonthsUsed.current,
      prior: result.summary.memberMonthsUsed.prior,
      projected: result.summary.memberMonthsUsed.weighted
    }
  };
} 