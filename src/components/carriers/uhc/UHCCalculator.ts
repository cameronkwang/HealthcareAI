import { 
  UHCInput, 
  UHCResult, 
  UHCCalculationLine, 
  UHC_CALCULATION_LINES,
  UHCLineType 
} from '../../../types/uhc';
import { 
  determineExperiencePeriods, 
  validateLargeClaimantPeriods,
  getMemberMonthsForPeriod,
  getClaimsForPeriod,
  calculatePooledClaimsForPeriod,
  validateDataQuality 
} from '../../../utils/periodHandling';
import { UniversalInput, ExperiencePeriods, Period } from '../../../types/common';

export class UHCRenewalCalculator {
  private input: UHCInput;
  private periods: ExperiencePeriods;
  private calculations: UHCCalculationLine[] = [];
  private warnings: string[] = [];
  private medicalRxSplit: { medical: number; rx: number };

  constructor(input: UHCInput) {
    this.input = input;
    this.periods = determineExperiencePeriods(
      input.monthlyClaimsData,
      input.effectiveDates.renewalStart
    );
    
    // Calculate actual medical/rx split from experience data
    this.medicalRxSplit = this.calculateMedicalRxSplit();
  }

  public calculate(): UHCResult {
    // Validate input and data quality
    this.validateInput();
    
    // Initialize all calculation lines A through AM
    this.initializeCalculations();
    
    // Execute the complete UHC calculation flow
    this.executeCalculationFlow();
    
    // Build and return the result
    return this.buildResult();
  }

  private calculateMedicalRxSplit(): { medical: number; rx: number } {
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
        rx: this.input.manualRates.rx / manualTotal
      };
    }
    
    return {
      medical: totalMedical / totalClaims,
      rx: totalRx / totalClaims
    };
  }

  private validateInput(): void {
    const params = this.input.carrierSpecificParameters;
    
    // UHC-specific validations
    if (params.poolingThreshold !== 125000) {
      this.warnings.push('UHC typically uses $125,000 pooling threshold');
    }

    if (!params.credibilityWeights) {
      throw new Error('UHC requires credibility weights (experience/manual)');
    }

    if (!params.experienceWeights || params.experienceWeights.length !== 2) {
      throw new Error('UHC requires experience period weights [current, prior]');
    }

    // Validate data quality using proper function signature
    const dataQuality = validateDataQuality(
      this.input.monthlyClaimsData,
      this.input.largeClaimantsData || [],
      this.periods
    );
    if (!dataQuality.valid) {
      this.warnings.push(...(dataQuality.warnings || []));
    }
  }

  private initializeCalculations(): void {
    this.calculations = UHC_CALCULATION_LINES.map(line => ({
      line: line.line,
      description: line.description,
      current: { medical: 0, rx: 0, total: 0 },
      prior: this.periods.prior ? { medical: 0, rx: 0, total: 0 } : null
    }));
  }

  private executeCalculationFlow(): void {
    // EXPERIENCE RATING PMPM SECTION (Lines A-R)
    this.calculateLineA_IncurredMedicalClaimsPMPM();
    this.calculateLineB_PooledClaimsOver125K();
    this.calculateLineC_AdjustedMedicalClaims();
    this.calculateLineD_IncurredRxClaimsPMPM();
    this.calculateLineE_TotalIncurredClaims();
    this.calculateLineF_UWAdjustment();
    this.calculateLineG_TrendFactor();
    this.calculateLineH_PlanChangeAdjustment();
    this.calculateLineI_TrendedAdjustedClaims();
    this.calculateLineJ_ClaimPeriodWeighting();
    this.calculateLineK_MemberChangeAdjustment();
    this.calculateLineL_PoolingCharge();
    this.calculateLineM_ExpectedClaims();
    this.calculateLineN_Administration();
    this.calculateLineO_StateTaxesAssessments();
    this.calculateLineP_OtherAdjustment();
    this.calculateLineQ_TotalRetention();
    this.calculateLineR_ExperiencePremiumPMPM();
    
    // MANUAL RATING PMPM SECTION (Lines S-V)
    this.calculateLineS_ManualPremiumUnadjusted();
    this.calculateLineT_AgeSexAdjustment();
    this.calculateLineU_OtherAdjustment();
    this.calculateLineV_ManualPremiumPMPM();
    
    // RENEWAL ACTION SECTION (Lines W-AM)
    this.calculateLineW_ExperienceRating();
    this.calculateLineX_ManualRating();
    this.calculateLineY_InitialCalculatedRenewalCost();
    this.calculateLineZ_OtherAdjustment();
    this.calculateLineAA_PMPMPriorToReformItems();
    this.calculateLineAB_ReformItems();
    this.calculateLineAC_Commission();
    this.calculateLineAD_Fees();
    this.calculateLineAE_CalculatedRenewalCostPMPM();
    this.calculateLineAF_CurrentRevenuePMPM();
    this.calculateLineAG_CalculatedRenewalAction();
    this.calculateLineAH_SuggestedRenewalAction();
    this.calculateLineAI_RevenueWithSuggestedAction();
    this.calculateLineAJ_RevenueVsCostDifference();
    this.calculateLineAK_MarginPercent();
    this.calculateLineAL_LossRatio();
    this.calculateLineAM_FinalRateActionSummary();
  }

  // EXPERIENCE RATING PMPM SECTION (Lines A-R)
  
  private calculateLineA_IncurredMedicalClaimsPMPM(): void {
    const lineA = this.getCalculationLine('A');
    
    // Current period
    const currentClaims = getClaimsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const currentMM = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    
    lineA.current.medical = currentClaims.medical / currentMM;
    lineA.current.rx = 0; // Medical only for Line A
    lineA.current.total = lineA.current.medical;
    
    // Prior period (if exists)
    if (this.periods.prior && lineA.prior) {
      const priorClaims = getClaimsForPeriod(this.input.monthlyClaimsData, this.periods.prior);
      const priorMM = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.prior);
      
      lineA.prior.medical = priorClaims.medical / priorMM;
      lineA.prior.rx = 0;
      lineA.prior.total = lineA.prior.medical;
    }
  }

  private calculateLineB_PooledClaimsOver125K(): void {
    const lineB = this.getCalculationLine('B');
    const params = this.input.carrierSpecificParameters;
    
    // Current period
    const currentMM = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const currentPooled = this.calculatePooledClaimsAmount(this.periods.current, params.poolingThreshold);
    
    lineB.current.medical = currentPooled / currentMM;
    lineB.current.rx = 0; // Pooling typically applies to medical only
    lineB.current.total = lineB.current.medical;
    
    // Prior period (if exists)
    if (this.periods.prior && lineB.prior) {
      const priorMM = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.prior);
      const priorPooled = this.calculatePooledClaimsAmount(this.periods.prior, params.poolingThreshold);
      
      lineB.prior.medical = priorPooled / priorMM;
      lineB.prior.rx = 0;
      lineB.prior.total = lineB.prior.medical;
    }
  }

  private calculateLineC_AdjustedMedicalClaims(): void {
    const lineA = this.getCalculationLine('A');
    const lineB = this.getCalculationLine('B');
    const lineC = this.getCalculationLine('C');
    
    // Line C = Line A - Line B
    lineC.current.medical = lineA.current.medical - lineB.current.medical;
    lineC.current.rx = 0;
    lineC.current.total = lineC.current.medical;
    
    if (lineA.prior && lineB.prior && lineC.prior) {
      lineC.prior.medical = lineA.prior.medical - lineB.prior.medical;
      lineC.prior.rx = 0;
      lineC.prior.total = lineC.prior.medical;
    }
  }

  private calculateLineD_IncurredRxClaimsPMPM(): void {
    const lineD = this.getCalculationLine('D');
    
    // Current period
    const currentClaims = getClaimsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const currentMM = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    
    lineD.current.medical = 0; // Rx only for Line D
    lineD.current.rx = currentClaims.rx / currentMM;
    lineD.current.total = lineD.current.rx;
    
    // Prior period (if exists)
    if (this.periods.prior && lineD.prior) {
      const priorClaims = getClaimsForPeriod(this.input.monthlyClaimsData, this.periods.prior);
      const priorMM = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.prior);
      
      lineD.prior.medical = 0;
      lineD.prior.rx = priorClaims.rx / priorMM;
      lineD.prior.total = lineD.prior.rx;
    }
  }

  private calculateLineE_TotalIncurredClaims(): void {
    const lineC = this.getCalculationLine('C');
    const lineD = this.getCalculationLine('D');
    const lineE = this.getCalculationLine('E');
    
    // Line E = Line C + Line D
    lineE.current.medical = lineC.current.medical;
    lineE.current.rx = lineD.current.rx;
    lineE.current.total = lineE.current.medical + lineE.current.rx;
    
    if (lineC.prior && lineD.prior && lineE.prior) {
      lineE.prior.medical = lineC.prior.medical;
      lineE.prior.rx = lineD.prior.rx;
      lineE.prior.total = lineE.prior.medical + lineE.prior.rx;
    }
  }

  private calculateLineF_UWAdjustment(): void {
    const lineE = this.getCalculationLine('E');
    const lineF = this.getCalculationLine('F');
    const params = this.input.carrierSpecificParameters;
    
    lineF.current.medical = lineE.current.medical * params.underwritingAdjustment;
    lineF.current.rx = lineE.current.rx * params.underwritingAdjustment;
    lineF.current.total = lineF.current.medical + lineF.current.rx;
    
    if (lineE.prior && lineF.prior) {
      lineF.prior.medical = lineE.prior.medical * params.underwritingAdjustment;
      lineF.prior.rx = lineE.prior.rx * params.underwritingAdjustment;
      lineF.prior.total = lineF.prior.medical + lineF.prior.rx;
    }
  }

  private calculateLineG_TrendFactor(): void {
    const lineF = this.getCalculationLine('F');
    const lineG = this.getCalculationLine('G');
    const params = this.input.carrierSpecificParameters;
    
    // Calculate trend factors based on projection months
    const currentTrendMonths = params.projectionMonths.current; // typically 20
    const priorTrendMonths = params.projectionMonths.prior; // typically 28
    
    const currentMedicalTrend = Math.pow(1 + params.trendRates.medical, currentTrendMonths / 12);
    const currentRxTrend = Math.pow(1 + params.trendRates.rx, currentTrendMonths / 12);
    
    lineG.current.medical = lineF.current.medical * currentMedicalTrend;
    lineG.current.rx = lineF.current.rx * currentRxTrend;
    lineG.current.total = lineG.current.medical + lineG.current.rx;
    
    if (lineF.prior && lineG.prior) {
      const priorMedicalTrend = Math.pow(1 + params.trendRates.medical, priorTrendMonths / 12);
      const priorRxTrend = Math.pow(1 + params.trendRates.rx, priorTrendMonths / 12);
      
      lineG.prior.medical = lineF.prior.medical * priorMedicalTrend;
      lineG.prior.rx = lineF.prior.rx * priorRxTrend;
      lineG.prior.total = lineG.prior.medical + lineG.prior.rx;
    }
  }

  private calculateLineH_PlanChangeAdjustment(): void {
    const lineG = this.getCalculationLine('G');
    const lineH = this.getCalculationLine('H');
    const params = this.input.carrierSpecificParameters;
    
    lineH.current.medical = lineG.current.medical * params.planChangeAdjustment;
    lineH.current.rx = lineG.current.rx * params.planChangeAdjustment;
    lineH.current.total = lineH.current.medical + lineH.current.rx;
    
    if (lineG.prior && lineH.prior) {
      lineH.prior.medical = lineG.prior.medical * params.planChangeAdjustment;
      lineH.prior.rx = lineG.prior.rx * params.planChangeAdjustment;
      lineH.prior.total = lineH.prior.medical + lineH.prior.rx;
    }
  }

  private calculateLineI_TrendedAdjustedClaims(): void {
    const lineH = this.getCalculationLine('H');
    const lineI = this.getCalculationLine('I');
    
    // Line I = Line H (already calculated through E × F × G × H)
    lineI.current.medical = lineH.current.medical;
    lineI.current.rx = lineH.current.rx;
    lineI.current.total = lineH.current.total;
    
    if (lineH.prior && lineI.prior) {
      lineI.prior.medical = lineH.prior.medical;
      lineI.prior.rx = lineH.prior.rx;
      lineI.prior.total = lineH.prior.total;
    }
  }

  private calculateLineJ_ClaimPeriodWeighting(): void {
    const lineI = this.getCalculationLine('I');
    const lineJ = this.getCalculationLine('J');
    const params = this.input.carrierSpecificParameters;
    
    // Apply 70%/30% weighting (or custom weights)
    const [currentWeight, priorWeight] = params.experienceWeights;
    
    if (lineI.prior) {
      lineJ.current.medical = (lineI.current.medical * currentWeight) + (lineI.prior.medical * priorWeight);
      lineJ.current.rx = (lineI.current.rx * currentWeight) + (lineI.prior.rx * priorWeight);
      lineJ.current.total = lineJ.current.medical + lineJ.current.rx;
    } else {
      // Single period - use 100% current
      lineJ.current.medical = lineI.current.medical;
      lineJ.current.rx = lineI.current.rx;
      lineJ.current.total = lineI.current.total;
    }
    
    // Line J has no prior column (it's the weighted result)
    lineJ.prior = null;
  }

  private calculateLineK_MemberChangeAdjustment(): void {
    const lineJ = this.getCalculationLine('J');
    const lineK = this.getCalculationLine('K');
    const params = this.input.carrierSpecificParameters;
    
    const memberChangeAdj = params.memberChangeAdjustment || 1.000;
    
    lineK.current.medical = lineJ.current.medical * memberChangeAdj;
    lineK.current.rx = lineJ.current.rx * memberChangeAdj;
    lineK.current.total = lineK.current.medical + lineK.current.rx;
    
    lineK.prior = null;
  }

  private calculateLineL_PoolingCharge(): void {
    const lineL = this.getCalculationLine('L');
    const params = this.input.carrierSpecificParameters;
    
    // Pooling charge = pooling threshold × pooling factor ÷ member months
    const poolingFactor = params.poolingFactor || 0.156; // Default UHC factor
    const currentMM = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    
    const poolingCharge = (params.poolingThreshold * poolingFactor) / currentMM;
    
    lineL.current.medical = poolingCharge;
    lineL.current.rx = 0;
    lineL.current.total = poolingCharge;
    
    lineL.prior = null;
  }

  private calculateLineM_ExpectedClaims(): void {
    const lineK = this.getCalculationLine('K');
    const lineL = this.getCalculationLine('L');
    const lineM = this.getCalculationLine('M');
    
    // Line M = Line K + Line L
    lineM.current.medical = lineK.current.medical + lineL.current.medical;
    lineM.current.rx = lineK.current.rx + lineL.current.rx;
    lineM.current.total = lineM.current.medical + lineM.current.rx;
    
    lineM.prior = null;
  }

  private calculateLineN_Administration(): void {
    const lineN = this.getCalculationLine('N');
    const params = this.input.carrierSpecificParameters;
    
    // Administration percentage (e.g., 14.0%)
    const adminPct = params.retentionComponents.administrative / 100;
    
    lineN.current.medical = adminPct;
    lineN.current.rx = adminPct;
    lineN.current.total = adminPct;
    
    lineN.prior = null;
  }

  private calculateLineO_StateTaxesAssessments(): void {
    const lineO = this.getCalculationLine('O');
    const params = this.input.carrierSpecificParameters;
    
    // State taxes and assessments percentage (e.g., 1.6%)
    const taxPct = params.retentionComponents.taxes / 100;
    
    lineO.current.medical = taxPct;
    lineO.current.rx = taxPct;
    lineO.current.total = taxPct;
    
    lineO.prior = null;
  }

  private calculateLineP_OtherAdjustment(): void {
    const lineP = this.getCalculationLine('P');
    const params = this.input.carrierSpecificParameters;
    
    // Other adjustment percentage
    const otherPct = params.retentionComponents.other / 100;
    
    lineP.current.medical = otherPct;
    lineP.current.rx = otherPct;
    lineP.current.total = otherPct;
    
    lineP.prior = null;
  }

  private calculateLineQ_TotalRetention(): void {
    const lineN = this.getCalculationLine('N');
    const lineO = this.getCalculationLine('O');
    const lineP = this.getCalculationLine('P');
    const lineQ = this.getCalculationLine('Q');
    
    // Line Q = Line N + Line O + Line P
    lineQ.current.medical = lineN.current.total + lineO.current.total + lineP.current.total;
    lineQ.current.rx = lineQ.current.medical;
    lineQ.current.total = lineQ.current.medical;
    
    lineQ.prior = null;
  }

  private calculateLineR_ExperiencePremiumPMPM(): void {
    const lineM = this.getCalculationLine('M');
    const lineQ = this.getCalculationLine('Q');
    const lineR = this.getCalculationLine('R');
    
    // Line R = Line M ÷ (1 - Line Q)
    const retentionFactor = 1 - lineQ.current.total;
    
    lineR.current.medical = lineM.current.medical / retentionFactor;
    lineR.current.rx = lineM.current.rx / retentionFactor;
    lineR.current.total = lineM.current.total / retentionFactor;
    
    lineR.prior = null;
  }

  // MANUAL RATING PMPM SECTION (Lines S-V)
  
  private calculateLineS_ManualPremiumUnadjusted(): void {
    const lineS = this.getCalculationLine('S');
    const params = this.input.carrierSpecificParameters;
    
    const baseManual = params.manualRates.baseManualPMPM;
    
    // Use dynamic split based on actual data rather than hardcoded values
    lineS.current.medical = baseManual * this.medicalRxSplit.medical;
    lineS.current.rx = baseManual * this.medicalRxSplit.rx;
    lineS.current.total = baseManual;
    
    lineS.prior = null;
  }

  private calculateLineT_AgeSexAdjustment(): void {
    const lineS = this.getCalculationLine('S');
    const lineT = this.getCalculationLine('T');
    const params = this.input.carrierSpecificParameters;
    
    const ageSexAdj = params.manualRates.ageSexAdjustment;
    
    lineT.current.medical = lineS.current.medical * ageSexAdj;
    lineT.current.rx = lineS.current.rx * ageSexAdj;
    lineT.current.total = lineS.current.total * ageSexAdj;
    
    lineT.prior = null;
  }

  private calculateLineU_OtherAdjustment(): void {
    const lineT = this.getCalculationLine('T');
    const lineU = this.getCalculationLine('U');
    const params = this.input.carrierSpecificParameters;
    
    const otherAdj = params.manualRates.otherAdjustment;
    
    lineU.current.medical = lineT.current.medical * otherAdj;
    lineU.current.rx = lineT.current.rx * otherAdj;
    lineU.current.total = lineT.current.total * otherAdj;
    
    lineU.prior = null;
  }

  private calculateLineV_ManualPremiumPMPM(): void {
    const lineU = this.getCalculationLine('U');
    const lineV = this.getCalculationLine('V');
    
    // Line V = Line U (already calculated through S × T × U)
    lineV.current.medical = lineU.current.medical;
    lineV.current.rx = lineU.current.rx;
    lineV.current.total = lineU.current.total;
    
    lineV.prior = null;
  }

  // RENEWAL ACTION SECTION (Lines W-AM)
  
  private calculateLineW_ExperienceRating(): void {
    const lineR = this.getCalculationLine('R');
    const lineW = this.getCalculationLine('W');
    const params = this.input.carrierSpecificParameters;
    
    const experienceWeight = params.credibilityWeights.experience;
    
    lineW.current.medical = lineR.current.medical * experienceWeight;
    lineW.current.rx = lineR.current.rx * experienceWeight;
    lineW.current.total = lineR.current.total * experienceWeight;
    
    lineW.prior = null;
  }

  private calculateLineX_ManualRating(): void {
    const lineV = this.getCalculationLine('V');
    const lineX = this.getCalculationLine('X');
    const params = this.input.carrierSpecificParameters;
    
    const manualWeight = params.credibilityWeights.manual;
    
    lineX.current.medical = lineV.current.medical * manualWeight;
    lineX.current.rx = lineV.current.rx * manualWeight;
    lineX.current.total = lineV.current.total * manualWeight;
    
    lineX.prior = null;
  }

  private calculateLineY_InitialCalculatedRenewalCost(): void {
    const lineW = this.getCalculationLine('W');
    const lineX = this.getCalculationLine('X');
    const lineY = this.getCalculationLine('Y');
    
    // Line Y = Line W + Line X
    lineY.current.medical = lineW.current.medical + lineX.current.medical;
    lineY.current.rx = lineW.current.rx + lineX.current.rx;
    lineY.current.total = lineW.current.total + lineX.current.total;
    
    lineY.prior = null;
  }

  private calculateLineZ_OtherAdjustment(): void {
    const lineZ = this.getCalculationLine('Z');
    const params = this.input.carrierSpecificParameters;
    
    const otherAdj = params.adjustmentFactors?.other || 1.000;
    
    lineZ.current.medical = otherAdj;
    lineZ.current.rx = otherAdj;
    lineZ.current.total = otherAdj;
    
    lineZ.prior = null;
  }

  private calculateLineAA_PMPMPriorToReformItems(): void {
    const lineY = this.getCalculationLine('Y');
    const lineZ = this.getCalculationLine('Z');
    const lineAA = this.getCalculationLine('AA');
    
    // Line AA = Line Y × Line Z
    lineAA.current.medical = lineY.current.medical * lineZ.current.total;
    lineAA.current.rx = lineY.current.rx * lineZ.current.total;
    lineAA.current.total = lineY.current.total * lineZ.current.total;
    
    lineAA.prior = null;
  }

  private calculateLineAB_ReformItems(): void {
    const lineAB = this.getCalculationLine('AB');
    const params = this.input.carrierSpecificParameters;
    
    const reformItems = params.reformItems || 0;
    
    // Use actual medical/rx split from experience data
    lineAB.current.medical = reformItems * this.medicalRxSplit.medical;
    lineAB.current.rx = reformItems * this.medicalRxSplit.rx;
    lineAB.current.total = reformItems;
    
    lineAB.prior = null;
  }

  private calculateLineAC_Commission(): void {
    const lineAC = this.getCalculationLine('AC');
    const params = this.input.carrierSpecificParameters;
    
    const commission = params.commission || 0;
    
    // Use actual medical/rx split from experience data
    lineAC.current.medical = commission * this.medicalRxSplit.medical;
    lineAC.current.rx = commission * this.medicalRxSplit.rx;
    lineAC.current.total = commission;
    
    lineAC.prior = null;
  }

  private calculateLineAD_Fees(): void {
    const lineAD = this.getCalculationLine('AD');
    const params = this.input.carrierSpecificParameters;
    
    const fees = params.fees || 0;
    
    // Use actual medical/rx split from experience data
    lineAD.current.medical = fees * this.medicalRxSplit.medical;
    lineAD.current.rx = fees * this.medicalRxSplit.rx;
    lineAD.current.total = fees;
    
    lineAD.prior = null;
  }

  private calculateLineAE_CalculatedRenewalCostPMPM(): void {
    const lineAA = this.getCalculationLine('AA');
    const lineAB = this.getCalculationLine('AB');
    const lineAC = this.getCalculationLine('AC');
    const lineAD = this.getCalculationLine('AD');
    const lineAE = this.getCalculationLine('AE');
    
    // Line AE = Line AA + Line AB + Line AC + Line AD
    lineAE.current.medical = lineAA.current.medical + lineAB.current.medical + lineAC.current.medical + lineAD.current.medical;
    lineAE.current.rx = lineAA.current.rx + lineAB.current.rx + lineAC.current.rx + lineAD.current.rx;
    lineAE.current.total = lineAA.current.total + lineAB.current.total + lineAC.current.total + lineAD.current.total;
    
    lineAE.prior = null;
  }

  private calculateLineAF_CurrentRevenuePMPM(): void {
    const lineAF = this.getCalculationLine('AF');
    const params = this.input.carrierSpecificParameters;
    
    const currentRevenue = params.currentRevenuePMPM;
    
    // Use actual medical/rx split from experience data
    lineAF.current.medical = currentRevenue * this.medicalRxSplit.medical;
    lineAF.current.rx = currentRevenue * this.medicalRxSplit.rx;
    lineAF.current.total = currentRevenue;
    
    lineAF.prior = null;
  }

  private calculateLineAG_CalculatedRenewalAction(): void {
    const lineAE = this.getCalculationLine('AE');
    const lineAF = this.getCalculationLine('AF');
    const lineAG = this.getCalculationLine('AG');
    
    // Line AG = (Line AE - Line AF) ÷ Line AF
    const renewalAction = (lineAE.current.total - lineAF.current.total) / lineAF.current.total;
    
    lineAG.current.medical = renewalAction;
    lineAG.current.rx = renewalAction;
    lineAG.current.total = renewalAction;
    
    lineAG.prior = null;
  }

  private calculateLineAH_SuggestedRenewalAction(): void {
    const lineAH = this.getCalculationLine('AH');
    const params = this.input.carrierSpecificParameters;
    
    // Use provided suggested action or calculate based on renewal action
    const suggestedAction = params.suggestedRenewalAction;
    if (suggestedAction === undefined) {
      // If no suggested action provided, use calculated renewal action
      const lineAG = this.getCalculationLine('AG');
      lineAH.current.medical = lineAG.current.total;
      lineAH.current.rx = lineAG.current.total;
      lineAH.current.total = lineAG.current.total;
    } else {
      lineAH.current.medical = suggestedAction;
      lineAH.current.rx = suggestedAction;
      lineAH.current.total = suggestedAction;
    }
    
    lineAH.prior = null;
  }

  private calculateLineAI_RevenueWithSuggestedAction(): void {
    const lineAF = this.getCalculationLine('AF');
    const lineAH = this.getCalculationLine('AH');
    const lineAI = this.getCalculationLine('AI');
    
    // Line AI = Line AF × (1 + Line AH)
    const revenueWithAction = lineAF.current.total * (1 + lineAH.current.total);
    
    // Use actual medical/rx split from experience data
    lineAI.current.medical = revenueWithAction * this.medicalRxSplit.medical;
    lineAI.current.rx = revenueWithAction * this.medicalRxSplit.rx;
    lineAI.current.total = revenueWithAction;
    
    lineAI.prior = null;
  }

  private calculateLineAJ_RevenueVsCostDifference(): void {
    const lineAI = this.getCalculationLine('AI');
    const lineAE = this.getCalculationLine('AE');
    const lineAJ = this.getCalculationLine('AJ');
    
    // Line AJ = Line AI - Line AE
    lineAJ.current.medical = lineAI.current.medical - lineAE.current.medical;
    lineAJ.current.rx = lineAI.current.rx - lineAE.current.rx;
    lineAJ.current.total = lineAI.current.total - lineAE.current.total;
    
    lineAJ.prior = null;
  }

  private calculateLineAK_MarginPercent(): void {
    const lineAJ = this.getCalculationLine('AJ');
    const lineAI = this.getCalculationLine('AI');
    const lineAK = this.getCalculationLine('AK');
    
    // Line AK = Line AJ ÷ Line AI
    const marginPct = lineAJ.current.total / lineAI.current.total;
    
    lineAK.current.medical = marginPct;
    lineAK.current.rx = marginPct;
    lineAK.current.total = marginPct;
    
    lineAK.prior = null;
  }

  private calculateLineAL_LossRatio(): void {
    const lineAE = this.getCalculationLine('AE');
    const lineAI = this.getCalculationLine('AI');
    const lineAL = this.getCalculationLine('AL');
    
    // Line AL = Line AE ÷ Line AI
    const lossRatio = lineAE.current.total / lineAI.current.total;
    
    lineAL.current.medical = lossRatio;
    lineAL.current.rx = lossRatio;
    lineAL.current.total = lossRatio;
    
    lineAL.prior = null;
  }

  private calculateLineAM_FinalRateActionSummary(): void {
    const lineAH = this.getCalculationLine('AH');
    const lineAM = this.getCalculationLine('AM');
    
    // Line AM shows the final recommended action
    lineAM.current.medical = lineAH.current.total;
    lineAM.current.rx = lineAH.current.total;
    lineAM.current.total = lineAH.current.total;
    
    lineAM.prior = null;
  }

  // Helper methods
  
  private calculatePooledClaimsAmount(period: Period, threshold: number): number {
    if (!this.input.largeClaimantsData) return 0;
    
    return this.input.largeClaimantsData
      .filter(claimant => {
        const claimDate = new Date(claimant.incurredDate);
        return claimDate >= period.start && claimDate <= period.end && 
               claimant.totalAmount > threshold;
      })
      .reduce((sum, claimant) => sum + Math.max(0, claimant.totalAmount - threshold), 0);
  }

  private getCalculationLine(line: string): UHCCalculationLine {
    const calc = this.calculations.find(c => c.line === line);
    if (!calc) {
      throw new Error(`Calculation line ${line} not found`);
    }
    return calc;
  }

  private buildResult(): UHCResult {
    const lineAE = this.getCalculationLine('AE'); // Final calculated renewal cost
    const lineAH = this.getCalculationLine('AH'); // Suggested renewal action
    const lineAG = this.getCalculationLine('AG'); // Calculated renewal action
    const lineAF = this.getCalculationLine('AF'); // Current revenue
    const lineR = this.getCalculationLine('R'); // Experience premium
    const lineV = this.getCalculationLine('V'); // Manual premium
    const lineQ = this.getCalculationLine('Q'); // Total retention
    
    const currentMM = getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.current);
    const priorMM = this.periods.prior ? 
      getMemberMonthsForPeriod(this.input.monthlyClaimsData, this.periods.prior) : 0;

    return {
      carrier: 'UHC',
      finalPremium: {
        medical: lineAE.current.medical,
        rx: lineAE.current.rx,
        total: lineAE.current.total
      },
      rateChange: lineAH.current.total, // Use suggested action as primary rate change
      calculations: this.calculations,
      periods: this.periods,
      summary: {
        weightedExperience: {
          medical: this.getCalculationLine('J').current.medical,
          rx: this.getCalculationLine('J').current.rx,
          total: this.getCalculationLine('J').current.total
        },
        credibilityWeighting: {
          experience: this.input.carrierSpecificParameters.credibilityWeights.experience,
          manual: this.input.carrierSpecificParameters.credibilityWeights.manual,
          credibilityFactor: this.input.carrierSpecificParameters.credibilityWeights.experience
        },
        totalRetention: lineQ.current.total,
        projectedAnnualPremium: lineAE.current.total * currentMM
      },
      periodAnalysis: {
        current: {
          memberMonths: currentMM,
          medicalPMPM: this.getCalculationLine('A').current.medical,
          rxPMPM: this.getCalculationLine('D').current.rx,
          totalPMPM: this.getCalculationLine('A').current.medical + this.getCalculationLine('D').current.rx
        },
        prior: this.periods.prior ? {
          memberMonths: priorMM,
          medicalPMPM: this.getCalculationLine('A').prior?.medical || 0,
          rxPMPM: this.getCalculationLine('D').prior?.rx || 0,
          totalPMPM: (this.getCalculationLine('A').prior?.medical || 0) + (this.getCalculationLine('D').prior?.rx || 0)
        } : null
      },
      warnings: this.warnings,
      dataQuality: {
        dataCompleteness: this.calculateDataCompleteness(),
        annualizationApplied: this.periods.current.months < 12,
        credibilityScore: this.input.carrierSpecificParameters.credibilityWeights.experience
      }
    };
  }

  private calculateDataCompleteness(): number {
    const totalMonths = this.input.monthlyClaimsData.length;
    const completeMonths = this.input.monthlyClaimsData.filter(month => 
      month.memberMonths && month.incurredClaims
    ).length;
    return completeMonths / totalMonths;
  }
}

// Legacy function for backward compatibility
export function calculateUHCRenewal(input: UniversalInput): UHCResult {
  // Calculate manual rates from experience data
  const totalMedical = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.medical || 0), 0);
  const totalRx = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.rx || 0), 0);
  const totalMM = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
  
  let baseManualPMPM: number;
  if (totalMM > 0) {
    const experiencePMPM = (totalMedical + totalRx) / totalMM;
    baseManualPMPM = experiencePMPM * 1.15; // 15% above experience for manual rates
  } else {
    baseManualPMPM = input.manualRates.total || (input.manualRates.medical + input.manualRates.rx);
  }
  
  // Calculate current premium from experience data
  let currentRevenuePMPM: number;
  if (totalMM > 0) {
    const experiencePMPM = (totalMedical + totalRx) / totalMM;
    currentRevenuePMPM = experiencePMPM * 1.16; // 16% retention estimate
  } else {
    currentRevenuePMPM = baseManualPMPM * 1.10; // Fallback estimate
  }
  
  // Calculate retention based on group size
  let totalRetentionPct: number;
  if (totalMM > 30000) {
    totalRetentionPct = 12.5; // Large group
  } else if (totalMM > 10000) {
    totalRetentionPct = 14.0; // Medium group
  } else {
    totalRetentionPct = 15.5; // Small group
  }
  
  // Convert UniversalInput to UHCInput with calculated parameter structure
  const uhcInput: UHCInput = {
    ...input,
    carrierSpecificParameters: {
      poolingThreshold: 125000,
      poolingFactor: 0.156,
      underwritingAdjustment: 1.0000,
      planChangeAdjustment: 1.002,
      trendRates: {
        medical: 0.0969, // 9.69% annual
        rx: 0.0788       // 7.88% annual
      },
      projectionMonths: {
        current: 20,  // Current period projection months
        prior: 28     // Prior period projection months
      },
      experienceWeights: [0.70, 0.30], // 70% current, 30% prior
      credibilityWeights: {
        experience: 0.42, // 42% experience
        manual: 0.58      // 58% manual
      },
      manualRates: {
        baseManualPMPM: baseManualPMPM,
        ageSexAdjustment: 1.168,
        otherAdjustment: 1.000
      },
      retentionComponents: {
        administrative: totalRetentionPct * 0.33,  // ~33% of total retention
        taxes: totalRetentionPct * 0.17,        // ~17% of total retention
        commission: 0.0,      // Separate from retention
        other: totalRetentionPct * 0.10         // ~10% of total retention
      },
      memberChangeAdjustment: 1.000,
      currentRevenuePMPM: currentRevenuePMPM,
      reformItems: 0,
      commission: totalRetentionPct * 0.27,
      fees: totalRetentionPct * 0.13,
      // Don't provide suggestedRenewalAction - let it be calculated
      adjustmentFactors: {
        other: 1.000
      }
    }
  };
  
  const calculator = new UHCRenewalCalculator(uhcInput);
  return calculator.calculate();
} 