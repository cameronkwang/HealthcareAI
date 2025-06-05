// import { BaseCalculator } from '../BaseCalculator'; // Remove this import
import {
  BCBSInput,
  BCBSParameters,
  BCBSCalculationResult,
  BCBSPlanResult,
  BCBSCompositeResult,
  BCBSEnrollmentSummary,
  BCBSCalculationStep,
  BCBS_CALCULATION_LINES,
  BCBSPlanData,
  BCBSMultiPlanData,
  BCBSPlanParameters,
  BCBSClaimsData,
  BCBSEnrollmentData,
  BCBSMedicalResults,
  BCBSPharmacyResults,
  BCBSTotalResults
} from '../../../types/bcbs';
// import { CalculationMetadata } from '../../../types/common'; // Remove this import
import { ValidationWarning } from '../../../types/common';

/**
 * BCBS Multi-Plan Renewal Calculator
 * Handles the complex multi-plan structure with enrollment-weighted composite calculations
 */
export class BCBSCalculator {
  /**
   * Calculate renewal for BCBS multi-plan structure
   */
  async calculateRenewal(
    input: BCBSInput,
    metadata: { calculationDate: Date; version: string; requestId: string }
  ): Promise<BCBSCalculationResult> {
    const { multiPlanData, carrierSpecificParameters } = input;
    
    // Calculate individual plan results
    const individualPlans = await Promise.all(
      carrierSpecificParameters.plans.map(async (planParams) => {
        const planData = multiPlanData.plans.find(p => p.planId === planParams.planId);
        if (!planData) {
          throw new Error(`Plan data not found for plan ID: ${planParams.planId}`);
        }
        
        return this.calculatePlan(planData, planParams, metadata);
      })
    );
    
    // Calculate composite results
    const composite = this.calculateComposite(individualPlans, carrierSpecificParameters);
    
    // Calculate enrollment summary
    const enrollmentSummary = this.generateEnrollmentSummary(multiPlanData, individualPlans);
    
    return {
      carrier: 'BCBS',
      composite,
      individualPlans,
      enrollmentSummary,
      warnings: this.generateWarnings(individualPlans).map(w => ({ message: w })), // Convert strings to ValidationWarnings
      currentPremiumPMPM: composite.weightedAverages.currentPMPM,
      projectedPremiumPMPM: composite.weightedAverages.projectedPMPM,
      requiredRateChange: composite.compositeRateAction,
      proposedRateChange: composite.compositeRateAction,
      calculationSteps: individualPlans.map((plan, index) => ({
        label: `Plan ${index + 1} Rate Action`,
        value: plan.finalMetrics.rateAction * 100
      }))
    };
  }

  private async calculatePlan(
    planData: BCBSPlanData, 
    planParams: BCBSPlanParameters,
    metadata: { calculationDate: Date; version: string; requestId: string }
  ): Promise<BCBSPlanResult> {
    const calculations: BCBSCalculationStep[] = [];
    
    // Header information (Lines 1-2a)
    this.addHeaderSteps(calculations, planParams, planData);
    
    // Medical calculations (Lines 3-9)
    const medicalResults = this.calculateMedicalSection(planData, planParams, calculations);
    
    // Pharmacy calculations (Lines 3-9)
    const pharmacyResults = this.calculatePharmacySection(planData, planParams, calculations);
    
    // Total calculations (Lines 10-30)
    const totalResults = this.calculateTotalSection(
      planData, planParams, medicalResults, pharmacyResults, calculations
    );
    
    return {
      planId: planData.planId,
      planName: planParams.planName,
      calculations,
      finalMetrics: {
        projectedPremiumPMPM: totalResults.projectedPremiumPMPM,
        requiredPremiumPMPM: totalResults.requiredPremiumPMPM,
        currentPremiumPMPM: planParams.currentPremiumPMPM,
        rateAction: totalResults.rateAction
      },
      intermediateResults: {
        totalProjectedPMPM: totalResults.totalProjectedPMPM,
        adjustedProjectedPMPM: totalResults.adjustedProjectedPMPM,
        credibilityAdjustedPMPM: totalResults.credibilityAdjustedPMPM,
        weightedExperienceClaims: totalResults.weightedExperienceClaims
      }
    };
  }

  private calculateMedicalSection(
    planData: BCBSPlanData,
    planParams: BCBSPlanParameters,
    calculations: BCBSCalculationStep[]
  ): BCBSMedicalResults {
    // Line 3: Medical Claims @ 3/25
    const currentMedicalClaims = planData.medicalClaims.current.totalClaims;
    const renewalMedicalClaims = planData.medicalClaims.renewal.totalClaims;
    
    calculations.push({
      lineNumber: '3-Med',
      description: 'Medical Claims @ 3/25',
      formula: 'Total medical claims for experience period',
      inputs: { 
        currentClaims: currentMedicalClaims,
        renewalClaims: renewalMedicalClaims
      },
      result: currentMedicalClaims,
      unit: '$',
      section: 'medical'
    });

    // Line 3: Pooled Medical Claims
    const currentPooledMedical = Math.max(0, currentMedicalClaims - planParams.poolingLevel);
    const renewalPooledMedical = Math.max(0, renewalMedicalClaims - planParams.poolingLevel);
    
    calculations.push({
      lineNumber: '3-Med-Pool',
      description: '(-) Pooled Medical Claims',
      formula: 'max(0, totalClaims - poolingLevel)',
      inputs: { 
        poolingLevel: planParams.poolingLevel,
        currentPooled: currentPooledMedical,
        renewalPooled: renewalPooledMedical
      },
      result: currentPooledMedical,
      unit: '$',
      section: 'medical'
    });

    // Line 4: Net Medical Claims
    const currentNetMedical = currentMedicalClaims - currentPooledMedical;
    const renewalNetMedical = renewalMedicalClaims - renewalPooledMedical;
    
    calculations.push({
      lineNumber: '4-Med',
      description: 'Net Medical Claims',
      formula: 'totalClaims - pooledClaims',
      inputs: { 
        currentNet: currentNetMedical,
        renewalNet: renewalNetMedical
      },
      result: currentNetMedical,
      unit: '$',
      section: 'medical'
    });

    // Line 5: Exp Period FFS Member Months
    const currentMemberMonths = planData.memberMonths.currentTotal;
    const renewalMemberMonths = planData.memberMonths.renewalTotal;
    
    // Line 6: Net Medical PMPM
    const currentNetMedicalPMPM = currentNetMedical / currentMemberMonths;
    const renewalNetMedicalPMPM = renewalNetMedical / renewalMemberMonths;
    
    calculations.push({
      lineNumber: '6-Med',
      description: 'Net Medical PMPM',
      formula: 'netClaims / memberMonths',
      inputs: { 
        currentPMPM: currentNetMedicalPMPM,
        renewalPMPM: renewalNetMedicalPMPM,
        currentMemberMonths,
        renewalMemberMonths
      },
      result: currentNetMedicalPMPM,
      unit: '$',
      section: 'medical'
    });

    // Line 6: IBNR Adjustment
    const currentAdjustedMedicalPMPM = currentNetMedicalPMPM * planParams.ibnrFactors.medical.current;
    const renewalAdjustedMedicalPMPM = renewalNetMedicalPMPM * planParams.ibnrFactors.medical.renewal;
    
    calculations.push({
      lineNumber: '6-Med-IBNR',
      description: '(*) Medical IBNR / Adjusted Net Medical PMPM',
      formula: 'netPMPM * ibnrFactor',
      inputs: { 
        currentIBNR: planParams.ibnrFactors.medical.current,
        renewalIBNR: planParams.ibnrFactors.medical.renewal,
        currentAdjusted: currentAdjustedMedicalPMPM,
        renewalAdjusted: renewalAdjustedMedicalPMPM
      },
      result: currentAdjustedMedicalPMPM,
      unit: '$',
      section: 'medical'
    });

    // Line 8: Compounded Medical Trend
    calculations.push({
      lineNumber: '8-Med',
      description: 'Annual Medical Trend / Months of Trend / (*) Compounded Medical Trend',
      formula: 'Annual trend compounded over months',
      inputs: { 
        annualCurrent: planParams.trendFactors.medical.annualCurrent,
        annualRenewal: planParams.trendFactors.medical.annualRenewal,
        monthsCurrent: planParams.trendFactors.medical.monthsCurrent,
        monthsRenewal: planParams.trendFactors.medical.monthsRenewal,
        compoundedCurrent: planParams.trendFactors.medical.compoundedCurrent,
        compoundedRenewal: planParams.trendFactors.medical.compoundedRenewal
      },
      result: planParams.trendFactors.medical.compoundedCurrent,
      unit: 'factor',
      section: 'medical'
    });

    // Line 9: Projected Medical PMPM
    const currentProjectedMedicalPMPM = currentAdjustedMedicalPMPM * planParams.trendFactors.medical.compoundedCurrent;
    const renewalProjectedMedicalPMPM = renewalAdjustedMedicalPMPM * planParams.trendFactors.medical.compoundedRenewal;
    
    calculations.push({
      lineNumber: '9-Med',
      description: 'Projected Medical PMPM',
      formula: 'adjustedPMPM * compoundedTrend',
      inputs: { 
        currentProjected: currentProjectedMedicalPMPM,
        renewalProjected: renewalProjectedMedicalPMPM
      },
      result: currentProjectedMedicalPMPM,
      unit: '$',
      section: 'medical'
    });

    return {
      netPMPM: { current: currentNetMedicalPMPM, renewal: renewalNetMedicalPMPM },
      adjustedPMPM: { current: currentAdjustedMedicalPMPM, renewal: renewalAdjustedMedicalPMPM },
      projectedPMPM: { current: currentProjectedMedicalPMPM, renewal: renewalProjectedMedicalPMPM }
    };
  }

  private calculatePharmacySection(
    planData: BCBSPlanData,
    planParams: BCBSPlanParameters,
    calculations: BCBSCalculationStep[]
  ): BCBSPharmacyResults {
    // Line 3: Pharmacy Claims @ 3/25
    const currentPharmacyClaims = planData.pharmacyClaims.current.totalClaims;
    const renewalPharmacyClaims = planData.pharmacyClaims.renewal.totalClaims;
    
    calculations.push({
      lineNumber: '3-Rx',
      description: 'Pharmacy Claims @ 3/25',
      formula: 'Total pharmacy claims for experience period',
      inputs: { 
        currentClaims: currentPharmacyClaims,
        renewalClaims: renewalPharmacyClaims
      },
      result: currentPharmacyClaims,
      unit: '$',
      section: 'pharmacy'
    });

    // Line 3: Pooled Pharmacy Claims (usually $0 for pharmacy)
    const currentPooledPharmacy = Math.max(0, currentPharmacyClaims - planParams.poolingLevel);
    const renewalPooledPharmacy = Math.max(0, renewalPharmacyClaims - planParams.poolingLevel);
    
    calculations.push({
      lineNumber: '3-Rx-Pool',
      description: '(-) Pooled Pharmacy Claims',
      formula: 'max(0, totalClaims - poolingLevel)',
      inputs: { 
        poolingLevel: planParams.poolingLevel,
        currentPooled: currentPooledPharmacy,
        renewalPooled: renewalPooledPharmacy
      },
      result: currentPooledPharmacy,
      unit: '$',
      section: 'pharmacy'
    });

    // Line 4: Net Pharmacy Claims
    const currentNetPharmacy = currentPharmacyClaims - currentPooledPharmacy;
    const renewalNetPharmacy = renewalPharmacyClaims - renewalPooledPharmacy;
    
    calculations.push({
      lineNumber: '4-Rx',
      description: 'Net Pharmacy Claims',
      formula: 'totalClaims - pooledClaims',
      inputs: { 
        currentNet: currentNetPharmacy,
        renewalNet: renewalNetPharmacy
      },
      result: currentNetPharmacy,
      unit: '$',
      section: 'pharmacy'
    });

    // Line 6: Net Pharmacy PMPM
    const currentMemberMonths = planData.memberMonths.currentTotal;
    const renewalMemberMonths = planData.memberMonths.renewalTotal;
    
    const currentNetPharmacyPMPM = currentNetPharmacy / currentMemberMonths;
    const renewalNetPharmacyPMPM = renewalNetPharmacy / renewalMemberMonths;
    
    calculations.push({
      lineNumber: '6-Rx',
      description: 'Net Pharmacy PMPM',
      formula: 'netClaims / memberMonths',
      inputs: { 
        currentPMPM: currentNetPharmacyPMPM,
        renewalPMPM: renewalNetPharmacyPMPM
      },
      result: currentNetPharmacyPMPM,
      unit: '$',
      section: 'pharmacy'
    });

    // Line 6: Pharmacy IBNR Adjustment
    const currentAdjustedPharmacyPMPM = currentNetPharmacyPMPM * planParams.ibnrFactors.pharmacy.current;
    const renewalAdjustedPharmacyPMPM = renewalNetPharmacyPMPM * planParams.ibnrFactors.pharmacy.renewal;
    
    calculations.push({
      lineNumber: '6-Rx-IBNR',
      description: '(*) Pharmacy IBNR / Adjusted Net Pharmacy PMPM',
      formula: 'netPMPM * ibnrFactor',
      inputs: { 
        currentIBNR: planParams.ibnrFactors.pharmacy.current,
        renewalIBNR: planParams.ibnrFactors.pharmacy.renewal,
        currentAdjusted: currentAdjustedPharmacyPMPM,
        renewalAdjusted: renewalAdjustedPharmacyPMPM
      },
      result: currentAdjustedPharmacyPMPM,
      unit: '$',
      section: 'pharmacy'
    });

    // Line 8: Compounded Pharmacy Trend
    calculations.push({
      lineNumber: '8-Rx',
      description: 'Annual Pharmacy Trend / Months of Trend / (*) Compounded Pharmacy Trend',
      formula: 'Annual trend compounded over months',
      inputs: { 
        annualCurrent: planParams.trendFactors.pharmacy.annualCurrent,
        annualRenewal: planParams.trendFactors.pharmacy.annualRenewal,
        monthsCurrent: planParams.trendFactors.pharmacy.monthsCurrent,
        monthsRenewal: planParams.trendFactors.pharmacy.monthsRenewal,
        compoundedCurrent: planParams.trendFactors.pharmacy.compoundedCurrent,
        compoundedRenewal: planParams.trendFactors.pharmacy.compoundedRenewal
      },
      result: planParams.trendFactors.pharmacy.compoundedCurrent,
      unit: 'factor',
      section: 'pharmacy'
    });

    // Line 9: Projected Pharmacy PMPM
    const currentProjectedPharmacyPMPM = currentAdjustedPharmacyPMPM * planParams.trendFactors.pharmacy.compoundedCurrent;
    const renewalProjectedPharmacyPMPM = renewalAdjustedPharmacyPMPM * planParams.trendFactors.pharmacy.compoundedRenewal;
    
    calculations.push({
      lineNumber: '9-Rx',
      description: 'Projected Pharmacy PMPM',
      formula: 'adjustedPMPM * compoundedTrend',
      inputs: { 
        currentProjected: currentProjectedPharmacyPMPM,
        renewalProjected: renewalProjectedPharmacyPMPM
      },
      result: currentProjectedPharmacyPMPM,
      unit: '$',
      section: 'pharmacy'
    });

    return {
      netPMPM: { current: currentNetPharmacyPMPM, renewal: renewalNetPharmacyPMPM },
      adjustedPMPM: { current: currentAdjustedPharmacyPMPM, renewal: renewalAdjustedPharmacyPMPM },
      projectedPMPM: { current: currentProjectedPharmacyPMPM, renewal: renewalProjectedPharmacyPMPM }
    };
  }

  private calculateTotalSection(
    planData: BCBSPlanData,
    planParams: BCBSPlanParameters,
    medicalResults: BCBSMedicalResults,
    pharmacyResults: BCBSPharmacyResults,
    calculations: BCBSCalculationStep[]
  ): BCBSTotalResults {
    // Line 10: Total Projected PMPM
    const totalProjectedPMPMCurrent = medicalResults.projectedPMPM.current + pharmacyResults.projectedPMPM.current;
    const totalProjectedPMPMRenewal = medicalResults.projectedPMPM.renewal + pharmacyResults.projectedPMPM.renewal;
    
    calculations.push({
      lineNumber: '10',
      description: 'Total Projected PMPM',
      formula: 'Projected Medical PMPM + Projected Pharmacy PMPM',
      inputs: { 
        currentTotal: totalProjectedPMPMCurrent,
        renewalTotal: totalProjectedPMPMRenewal,
        medicalCurrent: medicalResults.projectedPMPM.current,
        pharmacyCurrent: pharmacyResults.projectedPMPM.current
      },
      result: totalProjectedPMPMCurrent,
      unit: '$',
      section: 'total'
    });

    // Line 11a: FFS Age Adjustment for PMPM
    calculations.push({
      lineNumber: '11a',
      description: 'FFS Age Adjustment for PMPM',
      formula: 'Age adjustment factor by period',
      inputs: { 
        currentAdjustment: planParams.adjustmentFactors.ffsAge.current,
        renewalAdjustment: planParams.adjustmentFactors.ffsAge.renewal
      },
      result: planParams.adjustmentFactors.ffsAge.current,
      unit: 'factor',
      section: 'total'
    });

    // Line 12: Sub Total FFS Age Adj. PMPM
    const ffsAgeAdjustedCurrent = totalProjectedPMPMCurrent * planParams.adjustmentFactors.ffsAge.current;
    const ffsAgeAdjustedRenewal = totalProjectedPMPMRenewal * planParams.adjustmentFactors.ffsAge.renewal;
    
    calculations.push({
      lineNumber: '12',
      description: 'Sub Total FFS Age Adj. PMPM',
      formula: 'Total Projected PMPM × FFS Age Adjustment',
      inputs: { 
        currentAdjusted: ffsAgeAdjustedCurrent,
        renewalAdjusted: ffsAgeAdjustedRenewal
      },
      result: ffsAgeAdjustedCurrent,
      unit: '$',
      section: 'total'
    });

    // Line 13: Total Pooling Charges
    const poolingChargesCurrent = this.calculatePoolingCharges(planData, planParams, 'current');
    const poolingChargesRenewal = this.calculatePoolingCharges(planData, planParams, 'renewal');
    
    calculations.push({
      lineNumber: '13',
      description: 'Total Pooling Charges',
      formula: 'Pooled claims spread across member months',
      inputs: { 
        currentCharges: poolingChargesCurrent,
        renewalCharges: poolingChargesRenewal
      },
      result: poolingChargesCurrent,
      unit: '$',
      section: 'total'
    });

    // Line 14: Benefit Adjustment
    calculations.push({
      lineNumber: '14',
      description: '(*) Benefit Adjustment',
      formula: 'Benefit design adjustment factor',
      inputs: { factor: planParams.adjustmentFactors.benefitAdjustment },
      result: planParams.adjustmentFactors.benefitAdjustment,
      unit: 'factor',
      section: 'total'
    });

    // Line 15: Adjusted Projected PMPM
    const adjustedProjectedPMPMCurrent = (ffsAgeAdjustedCurrent + poolingChargesCurrent) * planParams.adjustmentFactors.benefitAdjustment;
    const adjustedProjectedPMPMRenewal = (ffsAgeAdjustedRenewal + poolingChargesRenewal) * planParams.adjustmentFactors.benefitAdjustment;
    
    calculations.push({
      lineNumber: '15',
      description: 'Adjusted Projected PMPM',
      formula: '(FFS Age Adj + Pooling Charges) × Benefit Adjustment',
      inputs: { 
        currentAdjusted: adjustedProjectedPMPMCurrent,
        renewalAdjusted: adjustedProjectedPMPMRenewal
      },
      result: adjustedProjectedPMPMCurrent,
      unit: '$',
      section: 'total'
    });

    // Line 16: Experience Weights
    calculations.push({
      lineNumber: '16',
      description: 'Experience Weights',
      formula: 'Current vs Renewal experience weighting',
      inputs: planParams.experienceWeights,
      result: planParams.experienceWeights.current,
      unit: 'percentage',
      section: 'total'
    });

    // Line 17: Weighted Experience Claims
    const weightedExperienceClaims = 
      adjustedProjectedPMPMCurrent * planParams.experienceWeights.current +
      adjustedProjectedPMPMRenewal * planParams.experienceWeights.renewal;
    
    calculations.push({
      lineNumber: '17',
      description: 'Weighted Experience Claims',
      formula: 'Current × Current Weight + Renewal × Renewal Weight',
      inputs: { 
        weightedClaims: weightedExperienceClaims,
        currentClaims: adjustedProjectedPMPMCurrent,
        renewalClaims: adjustedProjectedPMPMRenewal,
        currentWeight: planParams.experienceWeights.current,
        renewalWeight: planParams.experienceWeights.renewal
      },
      result: weightedExperienceClaims,
      unit: '$',
      section: 'total'
    });

    // Line 18: Member Based Charges
    const memberBasedChargesCurrent = planParams.memberBasedCharges?.current || 0;
    const memberBasedChargesRenewal = planParams.memberBasedCharges?.renewal || 0;
    const weightedMemberBasedCharges = 
      memberBasedChargesCurrent * planParams.experienceWeights.current +
      memberBasedChargesRenewal * planParams.experienceWeights.renewal;
    
    calculations.push({
      lineNumber: '18',
      description: 'Member Based Charges',
      formula: 'Weighted member-based charges PMPM',
      inputs: { 
        currentCharges: memberBasedChargesCurrent,
        renewalCharges: memberBasedChargesRenewal,
        weightedCharges: weightedMemberBasedCharges
      },
      result: weightedMemberBasedCharges,
      unit: '$',
      section: 'total'
    });

    // Line 19: Projected Experience Claim PMPM (incl MBC)
    const projectedExperienceClaimPMPM = weightedExperienceClaims + weightedMemberBasedCharges;
    
    calculations.push({
      lineNumber: '19',
      description: 'Projected Experience Claim PMPM (incl MBC)',
      formula: 'Weighted Experience Claims + Member Based Charges',
      inputs: { 
        experienceClaims: weightedExperienceClaims,
        memberBasedCharges: weightedMemberBasedCharges,
        total: projectedExperienceClaimPMPM
      },
      result: projectedExperienceClaimPMPM,
      unit: '$',
      section: 'total'
    });

    // Line 20: Manual Claims PMPM
    const manualClaimsPMPMCurrent = planParams.manualClaimsPMPM.current;
    const manualClaimsPMPMRenewal = planParams.manualClaimsPMPM.renewal;
    const weightedManualClaimsPMPM = 
      manualClaimsPMPMCurrent * planParams.experienceWeights.current +
      manualClaimsPMPMRenewal * planParams.experienceWeights.renewal;
    
    calculations.push({
      lineNumber: '20',
      description: 'Manual Claims PMPM',
      formula: 'Weighted manual rates PMPM',
      inputs: { 
        currentManual: manualClaimsPMPMCurrent,
        renewalManual: manualClaimsPMPMRenewal,
        weightedManual: weightedManualClaimsPMPM
      },
      result: weightedManualClaimsPMPM,
      unit: '$',
      section: 'total'
    });

    // Line 21: Credibility Factor
    calculations.push({
      lineNumber: '21',
      description: 'Credibility Factor',
      formula: 'Experience credibility weighting',
      inputs: { credibility: planParams.credibilityFactor },
      result: planParams.credibilityFactor,
      unit: 'factor',
      section: 'total'
    });

    // Line 22: Credibility Adjusted Claim PMPM
    const credibilityAdjustedPMPM = 
      projectedExperienceClaimPMPM * planParams.credibilityFactor +
      weightedManualClaimsPMPM * (1 - planParams.credibilityFactor);
    
    calculations.push({
      lineNumber: '22',
      description: 'Credibility Adjusted Claim PMPM',
      formula: 'Experience × Credibility + Manual × (1 - Credibility)',
      inputs: { 
        experiencePMPM: projectedExperienceClaimPMPM,
        manualPMPM: weightedManualClaimsPMPM,
        credibility: planParams.credibilityFactor,
        adjustedPMPM: credibilityAdjustedPMPM
      },
      result: credibilityAdjustedPMPM,
      unit: '$',
      section: 'total'
    });

    // Line 23: Retention PMPM
    const retentionPMPMCurrent = planParams.retentionComponents.retentionPMPM.current;
    const retentionPMPMRenewal = planParams.retentionComponents.retentionPMPM.renewal;
    const weightedRetentionPMPM = 
      retentionPMPMCurrent * planParams.experienceWeights.current +
      retentionPMPMRenewal * planParams.experienceWeights.renewal;
    
    calculations.push({
      lineNumber: '23',
      description: 'Retention PMPM',
      formula: 'Weighted retention costs PMPM',
      inputs: { 
        currentRetention: retentionPMPMCurrent,
        renewalRetention: retentionPMPMRenewal,
        weightedRetention: weightedRetentionPMPM
      },
      result: weightedRetentionPMPM,
      unit: '$',
      section: 'total'
    });

    // Line 24: PPO Premium Tax PMPM
    const ppoPremiumTaxCurrent = planParams.retentionComponents.ppoPremiumTax.current;
    const ppoPremiumTaxRenewal = planParams.retentionComponents.ppoPremiumTax.renewal;
    const weightedPPOPremiumTax = 
      ppoPremiumTaxCurrent * planParams.experienceWeights.current +
      ppoPremiumTaxRenewal * planParams.experienceWeights.renewal;
    
    calculations.push({
      lineNumber: '24',
      description: 'PPO Premium Tax PMPM',
      formula: 'Weighted PPO premium tax PMPM',
      inputs: { 
        currentTax: ppoPremiumTaxCurrent,
        renewalTax: ppoPremiumTaxRenewal,
        weightedTax: weightedPPOPremiumTax
      },
      result: weightedPPOPremiumTax,
      unit: '$',
      section: 'total'
    });

    // Line 24a: Affordable Care Act Adjustments PMPM
    const acaAdjustmentsCurrent = planParams.retentionComponents.acaAdjustments.current;
    const acaAdjustmentsRenewal = planParams.retentionComponents.acaAdjustments.renewal;
    const weightedACAAdj = 
      acaAdjustmentsCurrent * planParams.experienceWeights.current +
      acaAdjustmentsRenewal * planParams.experienceWeights.renewal;
    
    calculations.push({
      lineNumber: '24a',
      description: 'Affordable Care Act Adjustments PMPM',
      formula: 'Weighted ACA adjustments PMPM',
      inputs: { 
        currentACA: acaAdjustmentsCurrent,
        renewalACA: acaAdjustmentsRenewal,
        weightedACA: weightedACAAdj
      },
      result: weightedACAAdj,
      unit: '$',
      section: 'total'
    });

    // Line 25: Underwriter Adjustment Factor
    calculations.push({
      lineNumber: '25',
      description: 'Underwriter Adjustment Factor',
      formula: 'Underwriter discretionary adjustment',
      inputs: { factor: planParams.adjustmentFactors.underwriterAdjustment },
      result: planParams.adjustmentFactors.underwriterAdjustment,
      unit: 'factor',
      section: 'total'
    });

    // Line 26: Required Premium PMPM
    const requiredPremiumPMPM = (credibilityAdjustedPMPM + weightedRetentionPMPM + weightedPPOPremiumTax + weightedACAAdj) * planParams.adjustmentFactors.underwriterAdjustment;
    
    calculations.push({
      lineNumber: '26',
      description: 'Required Premium PMPM',
      formula: '(Claims + Retention + Tax + ACA) × Underwriter Adj',
      inputs: { 
        claimsPMPM: credibilityAdjustedPMPM,
        retentionPMPM: weightedRetentionPMPM,
        taxPMPM: weightedPPOPremiumTax,
        acaPMPM: weightedACAAdj,
        underwriterAdj: planParams.adjustmentFactors.underwriterAdjustment,
        requiredPMPM: requiredPremiumPMPM
      },
      result: requiredPremiumPMPM,
      unit: '$',
      section: 'total'
    });

    // Line 27: Pathway to Savings Adjustment
    calculations.push({
      lineNumber: '27',
      description: 'Pathway to Savings Adjustment',
      formula: 'P2S discount factor',
      inputs: { factor: planParams.adjustmentFactors.pathwayToSavings },
      result: planParams.adjustmentFactors.pathwayToSavings,
      unit: 'factor',
      section: 'total'
    });

    // Line 27a: Post P2S Adj. Required Premium PMPM
    const postP2SAdjRequiredPMPM = requiredPremiumPMPM * planParams.adjustmentFactors.pathwayToSavings;
    
    calculations.push({
      lineNumber: '27a',
      description: 'Post P2S Adj. Required Premium PMPM',
      formula: 'Required Premium × P2S Adjustment',
      inputs: { 
        beforeP2S: requiredPremiumPMPM,
        p2sAdjustment: planParams.adjustmentFactors.pathwayToSavings,
        afterP2S: postP2SAdjRequiredPMPM
      },
      result: postP2SAdjRequiredPMPM,
      unit: '$',
      section: 'total'
    });

    // Line 28: Current Premium PMPM
    calculations.push({
      lineNumber: '28',
      description: 'Current Premium PMPM',
      formula: 'Current premium based on latest enrollment',
      inputs: { currentPremium: planParams.currentPremiumPMPM },
      result: planParams.currentPremiumPMPM,
      unit: '$',
      section: 'total'
    });

    // Line 29: Rate Action
    const rateAction = (postP2SAdjRequiredPMPM / planParams.currentPremiumPMPM) - 1;
    
    calculations.push({
      lineNumber: '29',
      description: 'Rate Action',
      formula: '(Required Premium / Current Premium) - 1',
      inputs: { 
        requiredPremium: postP2SAdjRequiredPMPM,
        currentPremium: planParams.currentPremiumPMPM,
        rateAction: rateAction
      },
      result: rateAction,
      unit: 'percentage',
      section: 'total'
    });

    return {
      totalProjectedPMPM: totalProjectedPMPMCurrent,
      adjustedProjectedPMPM: adjustedProjectedPMPMCurrent,
      weightedExperienceClaims,
      credibilityAdjustedPMPM,
      projectedPremiumPMPM: postP2SAdjRequiredPMPM,
      requiredPremiumPMPM: requiredPremiumPMPM,
      rateAction
    };
  }

  private calculatePoolingCharges(
    planData: BCBSPlanData,
    planParams: BCBSPlanParameters,
    period: 'current' | 'renewal'
  ): number {
    const memberMonths = period === 'current' ? 
      planData.memberMonths.currentTotal : 
      planData.memberMonths.renewalTotal;
    
    // Calculate pooling charges PMPM based on actual pooled claims
    const medicalPooled = period === 'current' ? 
      planData.medicalClaims.current.pooledClaims : 
      planData.medicalClaims.renewal.pooledClaims;
    
    const pharmacyPooled = period === 'current' ? 
      planData.pharmacyClaims.current.pooledClaims : 
      planData.pharmacyClaims.renewal.pooledClaims;
    
    const totalPooled = medicalPooled + pharmacyPooled;
    return totalPooled / memberMonths;
  }

  private calculateComposite(
    individualPlans: BCBSPlanResult[],
    params: BCBSInput['carrierSpecificParameters']
  ): BCBSCompositeResult {
    const totalEnrollment = params.compositeWeighting.totalEnrollment;
    
    // Calculate enrollment weights for each plan
    const enrollmentWeights: Record<string, number> = {};
    let weightedProjectedPMPM = 0;
    let weightedRequiredPMPM = 0;
    let weightedCurrentPMPM = 0;
    
    individualPlans.forEach((plan, index) => {
      const planParams = params.plans[index];
      
      // Get plan enrollment (sum of all tiers)
      const planEnrollment = Object.values(planParams).find(val => 
        typeof val === 'object' && val !== null && 'total' in val
      )?.total || 100; // Fallback if enrollment data not found
      
      const weight = planEnrollment / totalEnrollment;
      enrollmentWeights[plan.planId] = weight;
      
      weightedProjectedPMPM += plan.finalMetrics.projectedPremiumPMPM * weight;
      weightedRequiredPMPM += plan.finalMetrics.requiredPremiumPMPM * weight;
      weightedCurrentPMPM += plan.finalMetrics.currentPremiumPMPM * weight;
    });
    
    // Calculate composite rate action (4.1% in example)
    const compositeRateAction = (weightedProjectedPMPM / weightedCurrentPMPM) - 1;
    
    return {
      compositeRateAction,
      totalEnrollment,
      weightedAverages: {
        projectedPMPM: weightedProjectedPMPM,
        requiredPMPM: weightedRequiredPMPM,
        currentPMPM: weightedCurrentPMPM
      },
      enrollmentWeights
    };
  }

  private generateEnrollmentSummary(multiPlanData: BCBSInput['multiPlanData'], individualPlans: BCBSPlanResult[]): BCBSEnrollmentSummary {
    let totalEnrollment = 0;
    let totalMonthlyPremium = 0;
    
    const planBreakdown = individualPlans.map((plan, index) => {
      const planResult = plan;
      const planData = multiPlanData.plans[index];
      
      // Get total enrollment for this plan from plan data
      const enrollment = planData.enrollment.current.total.count;
      const monthlyPremium = planData.enrollment.current.total.monthlyPremium;
      
      totalEnrollment += enrollment;
      totalMonthlyPremium += monthlyPremium;
      
      return {
        planId: plan.planId,
        planName: planResult.planName,
        enrollment,
        percentage: 0 // Will be calculated after we have total
      };
    });
    
    // Calculate percentages
    planBreakdown.forEach(plan => {
      plan.percentage = plan.enrollment / totalEnrollment;
    });
    
    return {
      totalEnrollment,
      totalMonthlyPremium,
      totalAnnualPremium: totalMonthlyPremium * 12,
      planBreakdown
    };
  }

  private calculateRateRange(plans: BCBSPlanResult[]): { minimum: number; maximum: number } {
    const rateActions = plans.map(plan => plan.finalMetrics.rateAction);
    return {
      minimum: Math.min(...rateActions),
      maximum: Math.max(...rateActions)
    };
  }

  private generateWarnings(plans: BCBSPlanResult[]): string[] {
    const warnings: string[] = [];
    
    plans.forEach(plan => {
      if (Math.abs(plan.finalMetrics.rateAction) > 0.25) {
        warnings.push(`Plan ${plan.planName} has significant rate change: ${(plan.finalMetrics.rateAction * 100).toFixed(1)}%`);
      }
    });
    
    return warnings;
  }

  private assessDataQuality(multiPlanData: BCBSInput['multiPlanData']): number {
    let completeness = 0;
    let totalChecks = 0;
    
    multiPlanData.plans.forEach(plan => {
      // Check if essential data is present
      totalChecks += 4;
      if (plan.medicalClaims.current.totalClaims > 0) completeness++;
      if (plan.pharmacyClaims.current.totalClaims >= 0) completeness++;
      if (plan.memberMonths.currentTotal > 0) completeness++;
      if (plan.enrollment.current.total.count > 0) completeness++;
    });
    
    return completeness / totalChecks;
  }

  private addHeaderSteps(
    calculations: BCBSCalculationStep[],
    planParams: BCBSPlanParameters,
    planData: BCBSPlanData
  ): void {
    // Line 1: Experience Period / Enrollment Period
    calculations.push({
      lineNumber: '1',
      description: 'Experience Period / Enrollment Period',
      formula: 'Period dates for experience and enrollment',
      inputs: {
        currentPeriod: '2/23 - 1/24',
        renewalPeriod: '2/24 - 1/25'
      },
      result: 0,
      unit: 'period',
      section: 'total'
    });

    // Line 2: Member Months Total
    calculations.push({
      lineNumber: '2',
      description: 'Member Months Total',
      formula: 'Total member months per period',
      inputs: {
        current: planData.memberMonths.currentTotal,
        renewal: planData.memberMonths.renewalTotal
      },
      result: planData.memberMonths.currentTotal,
      unit: 'member_months',
      section: 'total'
    });

    // Line 2a: Projected Total Monthly Members
    calculations.push({
      lineNumber: '2a',
      description: 'Projected Total Monthly Mbrs.',
      formula: 'Average monthly members',
      inputs: {
        current: planData.memberMonths.projectedMonthlyMembers.current,
        renewal: planData.memberMonths.projectedMonthlyMembers.renewal
      },
      result: planData.memberMonths.projectedMonthlyMembers.current,
      unit: 'members',
      section: 'total'
    });
  }

  private consolidateCalculations(individualPlans: BCBSPlanResult[]): any[] {
    // Consolidate all calculation steps from all plans
    const allSteps: any[] = [];
    
    individualPlans.forEach((plan, index) => {
      plan.calculations.forEach(step => {
        allSteps.push({
          ...step,
          planIndex: index,
          planName: plan.planName
        });
      });
    });
    
    return allSteps;
  }

  private consolidateIntermediateResults(individualPlans: BCBSPlanResult[]): any {
    // Create consolidated intermediate results
    return {
      planResults: individualPlans.map(plan => plan.intermediateResults),
      totalPlans: individualPlans.length,
      averageProjectedPMPM: individualPlans.reduce((sum, plan) => 
        sum + plan.intermediateResults.totalProjectedPMPM, 0) / individualPlans.length
    };
  }

  private calculateAverageCredibility(plans: BCBSPlanParameters[]): number {
    return plans.reduce((sum, plan) => sum + plan.credibilityFactor, 0) / plans.length;
  }
} 