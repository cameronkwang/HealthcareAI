import { UniversalInput, CalculationResult } from '../types/common';
import { UHCInput } from '../types/uhc';
import { CignaInput } from '../types/cigna';
import { AetnaInput } from '../types/aetna';
import { BCBSInput } from '../types/bcbs';
import { UHCRenewalCalculator } from '../components/carriers/uhc/UHCCalculator';
import { CignaRenewalCalculator } from '../components/carriers/cigna/CignaCalculator';
import { AetnaRenewalCalculator } from '../components/carriers/aetna/AetnaCalculator';
import { BCBSCalculator } from '../components/carriers/bcbs/BCBSCalculator';

// Helper function to calculate manual rates from experience data
function calculateManualRatesFromExperience(input: UniversalInput): { medical: number; rx: number; total: number } {
  // Calculate average PMPM from experience data
  const totalMedical = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.medical || 0), 0);
  const totalRx = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.rx || 0), 0);
  const totalMM = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
  
  if (totalMM === 0) {
    // Fallback to provided manual rates if no member months
    return {
      medical: input.manualRates.medical,
      rx: input.manualRates.rx,
      total: input.manualRates.total || (input.manualRates.medical + input.manualRates.rx)
    };
  }
  
  const medicalPMPM = totalMedical / totalMM;
  const rxPMPM = totalRx / totalMM;
  
  // Apply manual rate factors (typically 1.1-1.2x experience for manual rates)
  const manualFactor = 1.15; // 15% above experience for manual rates
  
  return {
    medical: medicalPMPM * manualFactor,
    rx: rxPMPM * manualFactor,
    total: (medicalPMPM + rxPMPM) * manualFactor
  };
}

// Helper function to calculate current premium from experience data
function calculateCurrentPremiumFromExperience(input: UniversalInput): number {
  const totalClaims = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.medical || 0) + (month.incurredClaims?.rx || 0), 0);
  const totalMM = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
  
  if (totalMM === 0) {
    return 0;
  }
  
  const experiencePMPM = totalClaims / totalMM;
  // Apply estimated retention (15-17% typical for UHC)
  const estimatedRetention = 1.16; // 16% retention estimate
  
  return experiencePMPM * estimatedRetention;
}

// Helper function to create BCBS multi-plan data from experience
function createBCBSMultiPlanFromExperience(input: UniversalInput): BCBSInput {
  // For now, create a single plan from the universal input data
  // In practice, this would be split into multiple plans based on the data structure
  const totalMedical = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.medical || 0), 0);
  const totalRx = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.incurredClaims?.rx || 0), 0);
  const totalMM = input.monthlyClaimsData.reduce((sum, month) => 
    sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);

  const experiencePMPM = (totalMedical + totalRx) / (totalMM || 1); // Add null coalescing
  const calculatedManual = calculateManualRatesFromExperience(input);
  const calculatedCurrent = calculateCurrentPremiumFromExperience(input);

  return {
    ...input,
    carrier: 'BCBS',
    multiPlanData: {
      plans: [{
        planId: 'plan1',
        experiencePeriods: {
          current: {
            startDate: input.effectiveDates.renewalStart, // Fix: use renewalStart
            endDate: input.effectiveDates.renewalEnd, // Fix: use renewalEnd
            memberMonths: totalMM
          },
          renewal: {
            startDate: input.effectiveDates.renewalStart,
            endDate: input.effectiveDates.renewalEnd,
            memberMonths: totalMM
          }
        },
        memberMonths: {
          currentTotal: totalMM,
          renewalTotal: totalMM,
          projectedMonthlyMembers: {
            current: totalMM / 12,
            renewal: totalMM / 12
          }
        },
        medicalClaims: {
          current: {
            totalClaims: totalMedical,
            poolingLevel: 225000,
            pooledClaims: Math.max(0, totalMedical - 225000),
            netClaims: Math.min(totalMedical, 225000),
            expPeriodMemberMonths: totalMM,
            netPMPM: Math.min(totalMedical, 225000) / (totalMM || 1), // Add null coalescing
            adjustedNetPMPM: (Math.min(totalMedical, 225000) / (totalMM || 1)) * 1.0,
            projectedPMPM: 0 // Will be calculated
          },
          renewal: {
            totalClaims: totalMedical,
            poolingLevel: 225000,
            pooledClaims: Math.max(0, totalMedical - 225000),
            netClaims: Math.min(totalMedical, 225000),
            expPeriodMemberMonths: totalMM,
            netPMPM: Math.min(totalMedical, 225000) / (totalMM || 1), // Add null coalescing
            adjustedNetPMPM: (Math.min(totalMedical, 225000) / (totalMM || 1)) * 1.0,
            projectedPMPM: 0 // Will be calculated
          }
        },
        pharmacyClaims: {
          current: {
            totalClaims: totalRx,
            poolingLevel: 225000,
            pooledClaims: 0, // Rx rarely hits pooling
            netClaims: totalRx,
            expPeriodMemberMonths: totalMM,
            netPMPM: totalRx / (totalMM || 1), // Add null coalescing
            adjustedNetPMPM: (totalRx / (totalMM || 1)) * 1.0,
            projectedPMPM: 0 // Will be calculated
          },
          renewal: {
            totalClaims: totalRx,
            poolingLevel: 225000,
            pooledClaims: 0,
            netClaims: totalRx,
            expPeriodMemberMonths: totalMM,
            netPMPM: totalRx / (totalMM || 1), // Add null coalescing
            adjustedNetPMPM: (totalRx / (totalMM || 1)) * 1.0,
            projectedPMPM: 0 // Will be calculated
          }
        },
        enrollment: {
          current: {
            single: { count: Math.floor((totalMM || 0) * 0.4), rate: calculatedCurrent * 1.0 },
            couple: { count: Math.floor((totalMM || 0) * 0.3), rate: calculatedCurrent * 2.0 },
            spmd: { count: Math.floor((totalMM || 0) * 0.1), rate: calculatedCurrent * 1.8 },
            family: { count: Math.floor((totalMM || 0) * 0.2), rate: calculatedCurrent * 2.5 },
            total: { count: totalMM || 0, monthlyPremium: calculatedCurrent * (totalMM || 0), annualPremium: calculatedCurrent * (totalMM || 0) * 12 }
          },
          renewal: {
            single: { count: Math.floor((totalMM || 0) * 0.4), rate: calculatedCurrent * 1.0 },
            couple: { count: Math.floor((totalMM || 0) * 0.3), rate: calculatedCurrent * 2.0 },
            spmd: { count: Math.floor((totalMM || 0) * 0.1), rate: calculatedCurrent * 1.8 },
            family: { count: Math.floor((totalMM || 0) * 0.2), rate: calculatedCurrent * 2.5 },
            total: { count: totalMM || 0, monthlyPremium: calculatedCurrent * (totalMM || 0), annualPremium: calculatedCurrent * (totalMM || 0) * 12 }
          }
        }
      }],
      totalMemberMonths: totalMM || 0 // Add null coalescing
    },
    carrierSpecificParameters: {
      plans: [{
        planId: 'plan1',
        planName: 'BCE Saver $3000 with Coinsurance',
        poolingLevel: 225000,
        experienceWeights: {
          current: 0.33,
          renewal: 0.67
        },
        credibilityFactor: 1.00,
        ibnrFactors: {
          medical: {
            current: 1.0000,
            renewal: 1.0240
          },
          pharmacy: {
            current: 1.0000,
            renewal: 1.0020
          }
        },
        trendFactors: {
          medical: {
            annualCurrent: 1.1000,
            annualRenewal: 1.1003,
            monthsCurrent: 35.0,
            monthsRenewal: 23.0,
            compoundedCurrent: 1.3235,
            compoundedRenewal: 1.2010
          },
          pharmacy: {
            annualCurrent: 1.1073,
            annualRenewal: 1.1136,
            monthsCurrent: 35.0,
            monthsRenewal: 23.0,
            compoundedCurrent: 1.3462,
            compoundedRenewal: 1.2290
          }
        },
        adjustmentFactors: {
          ffsAge: {
            current: 1.0375,
            renewal: 1.0214
          },
          benefitAdjustment: 1.0000,
          underwriterAdjustment: 1.0000,
          pathwayToSavings: 0.9950
        },
        retentionComponents: {
          retentionPMPM: {
            current: experiencePMPM * 0.15,
            renewal: experiencePMPM * 0.17
          },
          ppoPremiumTax: {
            current: experiencePMPM * 0.0104,
            renewal: experiencePMPM * 0.0116
          },
          acaAdjustments: {
            current: experiencePMPM * 0.0004,
            renewal: experiencePMPM * 0.0005
          }
        },
        currentPremiumPMPM: calculatedCurrent,
        manualClaimsPMPM: {
          current: calculatedManual.total * 0.8,
          renewal: calculatedManual.total * 1.2
        }
      }],
      compositeWeighting: {
        enrollmentBased: true,
        totalEnrollment: totalMM || 0 // Add null coalescing
      },
      globalSettings: {
        totalMemberMonths: totalMM || 0 // Add null coalescing
      }
    }
  };
}

// Legacy function for backwards compatibility
export async function dispatchCarrierCalculation(
  input: UniversalInput,
  params?: any
): Promise<CalculationResult> {
  switch (input.carrier) {
    case 'UHC':
      // Calculate total member months to determine retention levels based on group size
      const totalMemberMonths = input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.memberMonths?.medical || 0) + (month.memberMonths?.rx || 0), 0);
      
      // Calculate retention percentage based on group size
      // Large groups (>30,000 MM): 12-13% retention
      // Medium groups (10,000-30,000 MM): 13-15% retention  
      // Small groups (<10,000 MM): 15-16% retention
      let totalRetentionPct: number;
      if (totalMemberMonths > 30000) {
        totalRetentionPct = 12.5; // Large group
      } else if (totalMemberMonths > 10000) {
        totalRetentionPct = 14.0; // Medium group
      } else {
        totalRetentionPct = 15.5; // Small group
      }
      
      // Calculate current premium from experience data if not provided
      let currentPremium = params?.currentRevenuePMPM || calculateCurrentPremiumFromExperience(input);
      
      // Calculate manual rates from experience data
      const calculatedManualRates = calculateManualRatesFromExperience(input);
      
      // Convert UniversalInput to UHCInput with calculated parameter structure
      const uhcInput: UHCInput = {
        ...input,
        carrierSpecificParameters: {
          poolingThreshold: 125000,
          poolingFactor: 0.156,
          underwritingAdjustment: 1.0,
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
            baseManualPMPM: calculatedManualRates.total,
            ageSexAdjustment: 1.168,
            otherAdjustment: 1.000
          },
          retentionComponents: {
            administrative: totalRetentionPct * 0.33,  // ~33% of total retention
            taxes: totalRetentionPct * 0.17,        // ~17% of total retention
            commission: 0.0,                         // Separate from retention
            other: totalRetentionPct * 0.10         // ~10% of total retention
          },
          memberChangeAdjustment: 1.000,
          currentRevenuePMPM: currentPremium,
          reformItems: 0,
          commission: totalRetentionPct * 0.27,  // ~27% of total retention as commission
          fees: totalRetentionPct * 0.13,       // ~13% of total retention as fees
          adjustmentFactors: {
            other: 1.000
          }
        }
      };
      
      const uhcCalculator = new UHCRenewalCalculator(uhcInput);
      const uhcResult = uhcCalculator.calculate();
      
      // Convert to legacy CalculationResult format but store the native result in detailedResults
      return {
        carrier: uhcResult.carrier,
        currentPremiumPMPM: uhcInput.carrierSpecificParameters.currentRevenuePMPM,
        projectedPremiumPMPM: uhcResult.finalPremium.total,
        requiredRateChange: uhcResult.rateChange,
        proposedRateChange: uhcResult.rateChange,
        calculationSteps: [
          { label: 'Final Premium PMPM', value: uhcResult.finalPremium.total },
          { label: 'Rate Change %', value: uhcResult.rateChange * 100 }
        ],
        warnings: (uhcResult.warnings || []).map((w: any) => ({ message: typeof w === 'string' ? w : w.message })),
        // Store the native result for template access
        detailedResults: {
          uhc: uhcResult as any
        }
      };
      
    case 'AETNA':
      // Calculate values from experience data instead of using hardcoded defaults
      const totalMedicalAetna = input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.incurredClaims?.medical || 0), 0);
      const totalRxAetna = input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.incurredClaims?.rx || 0), 0);
      const totalMMAetna = input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
      
      const experiencePMPMAetna = (totalMedicalAetna + totalRxAetna) / totalMMAetna;
      const calculatedManualRatesAetna = calculateManualRatesFromExperience(input);
      const calculatedCurrentPremiumAetna = calculateCurrentPremiumFromExperience(input);
      
      // Calculate retention components as percentages of premium
      const totalRetentionPctAetna = 0.127; // 12.7% total retention for Aetna
      const retentionPMPMAetna = experiencePMPMAetna * totalRetentionPctAetna;
      
      // Convert UniversalInput to AetnaInput with calculated parameter structure
      const aetnaInput: AetnaInput = {
        ...input,
        carrierSpecificParameters: {
          deductibleSuppressionFactor: 1.0000, // Standard factor, rarely changes
          poolingLevel: 175000, // Aetna standard - $175K threshold
          poolingChargesPMPM: experiencePMPMAetna * 0.0970, // 9.70% pooling factor applied to experience
          networkAdjustment: 1.0, // Default to no adjustment unless specified
          planAdjustment: 1.0, // Default to no adjustment unless specified
          demographicAdjustment: 1.0, // Default to no adjustment unless specified
          underwritingAdjustment: 1.0, // Default to no adjustment unless specified
          trendFactor: {
            medical: 1.0969, // 9.69% annual medical trend (editable)
            rx: 1.0788, // 7.88% annual rx trend (editable)
            months: 19 // Standard Aetna projection months
          },
          periodWeighting: {
            current: 0.75, // 75% current period weight
            prior: 0.25 // 25% prior period weight
          },
          credibilityParameters: {
            minimumCredibility: 0.25,
            fullCredibilityMemberMonths: 12000, // Standard Aetna credibility formula
            credibilityFormula: 'sqrt' as const
          },
          manualRates: {
            medical: calculatedManualRatesAetna.medical,
            rx: calculatedManualRatesAetna.rx
          },
          nonBenefitExpensesPMPM: retentionPMPMAetna * 0.40, // ~40% of retention as non-benefit expenses
          retentionComponents: {
            admin: retentionPMPMAetna * 0.35, // ~35% of total retention
            commissions: retentionPMPMAetna * 0.25, // ~25% of total retention  
            premium_tax: retentionPMPMAetna * 0.15, // ~15% of total retention
            risk_margin: retentionPMPMAetna * 0.20, // ~20% of total retention
            other: retentionPMPMAetna * 0.05 // ~5% of total retention
          },
          currentPremiumPMPM: calculatedCurrentPremiumAetna
        }
      };
      
      const aetnaCalculator = new AetnaRenewalCalculator(aetnaInput, aetnaInput.carrierSpecificParameters);
      const aetnaResult = aetnaCalculator.calculate();
      
      // Convert to legacy CalculationResult format but store the native result in detailedResults
      return {
        carrier: aetnaResult.carrier,
        currentPremiumPMPM: aetnaResult.summary.memberMonthsUsed.current > 0 ? (aetnaInput.carrierSpecificParameters.currentPremiumPMPM || 0) : 0,
        projectedPremiumPMPM: aetnaResult.finalPremiumPMPM,
        requiredRateChange: aetnaResult.rateChange,
        proposedRateChange: aetnaResult.rateChange,
        calculationSteps: [
          { label: 'Final Premium PMPM', value: aetnaResult.finalPremiumPMPM },
          { label: 'Rate Change %', value: aetnaResult.rateChange * 100 },
          { label: 'Total Lines', value: aetnaResult.calculations.length }
        ],
        warnings: (aetnaResult.warnings || []).map((w: any) => ({ message: typeof w === 'string' ? w : w.message })),
        // Store the native result for template access
        detailedResults: {
          aetna: aetnaResult as any
        }
      };
      
    case 'CIGNA':
      // Calculate values from experience data instead of using hardcoded defaults
      const totalMedicalCigna = input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.incurredClaims?.medical || 0), 0);
      const totalRxCigna = input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.incurredClaims?.rx || 0), 0);
      const totalMMCigna = input.monthlyClaimsData.reduce((sum, month) => 
        sum + (month.memberMonths?.total || month.memberMonths?.medical || 0), 0);
      
      const experiencePMPMCigna = (totalMedicalCigna + totalRxCigna) / totalMMCigna;
      const calculatedManualPMPMCigna = experiencePMPMCigna * 1.20; // 20% above experience for CIGNA manual rates
      const calculatedCurrentPremiumCigna = experiencePMPMCigna * 1.22; // 22% retention estimate for CIGNA
      
      // Calculate projected member months (typically 12 months forward)
      const avgMembersPerMonthCigna = totalMMCigna / input.monthlyClaimsData.length;
      const projectedMemberMonthsCigna = avgMembersPerMonthCigna * 12;
      
      // Convert UniversalInput to CignaInput with calculated parameter structure
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
            medical: calculatedManualPMPMCigna * 0.75, // Derived split
            pharmacy: calculatedManualPMPMCigna * 0.25, // Derived split
            total: calculatedManualPMPMCigna
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
          currentPremiumPMPM: calculatedCurrentPremiumCigna,
          projectedMemberMonths: projectedMemberMonthsCigna
        }
      };
      
      const cignaCalculator = new CignaRenewalCalculator(cignaInput);
      const cignaResult = cignaCalculator.calculate();
      
      // Convert to legacy CalculationResult format but store the native result in detailedResults
      return {
        carrier: cignaResult.carrier,
        currentPremiumPMPM: cignaInput.carrierSpecificParameters.currentPremiumPMPM || 0,
        projectedPremiumPMPM: cignaResult.finalPremium.pmpm,
        requiredRateChange: cignaResult.rateChange,
        proposedRateChange: cignaResult.rateChange,
        calculationSteps: [
          { label: 'Final Premium PMPM', value: cignaResult.finalPremium.pmpm },
          { label: 'Rate Change %', value: cignaResult.rateChange * 100 }
        ],
        warnings: (cignaResult.warnings || []).map((w: any) => ({ message: typeof w === 'string' ? w : w.message })),
        // Store the native result for template access
        detailedResults: {
          cigna: cignaResult as any
        }
      };
      
    case 'BCBS':
      // Create BCBS input from universal input data
      const bcbsInput = createBCBSMultiPlanFromExperience(input);
      
      // Use BCBSCalculator instead of non-existent calculateBCBSRenewal function
      const bcbsCalculator = new BCBSCalculator();
      const bcbsResult = await bcbsCalculator.calculateRenewal(bcbsInput, {
        calculationDate: new Date(),
        version: '1.0',
        requestId: 'test-request'
      });
      
      // Convert to legacy CalculationResult format but store the native result in detailedResults
      return {
        carrier: bcbsResult.carrier,
        currentPremiumPMPM: bcbsResult.composite.weightedAverages.currentPMPM || 0,
        projectedPremiumPMPM: bcbsResult.composite.weightedAverages.projectedPMPM || 0,
        requiredRateChange: bcbsResult.composite.compositeRateAction,
        proposedRateChange: bcbsResult.composite.compositeRateAction,
        calculationSteps: [
          { label: 'Composite Rate Action', value: bcbsResult.composite.compositeRateAction * 100 },
          { label: 'Total Plans', value: bcbsResult.individualPlans.length },
          { label: 'Total Enrollment', value: bcbsResult.enrollmentSummary.totalEnrollment }
        ],
        warnings: bcbsResult.warnings.map((w: any) => ({ message: typeof w === 'string' ? w : w.message })),
        // Store the native result for template access
        detailedResults: {
          bcbs: bcbsResult as any
        }
      };
      
    default:
      throw new Error(`Unsupported carrier: ${input.carrier}`);
  }
}