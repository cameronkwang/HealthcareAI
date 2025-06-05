// UHC exports
export { UHCRenewalCalculator } from './uhc/UHCCalculator';
export { default as UHCTemplate } from './uhc/UHCTemplate';

// Cigna exports  
export { CignaRenewalCalculator } from './cigna/CignaCalculator';
export { default as CignaTemplate } from './cigna/CignaTemplate';

// BCBS exports
export { BCBSCalculator } from './bcbs/BCBSCalculator';
export { default as BCBSTemplate } from './bcbs/BCBSTemplate';

// Aetna exports
export { AetnaRenewalCalculator } from './aetna/AetnaCalculator';
export { default as AetnaTemplate } from './aetna/AetnaTemplate';

// Import for local use in functions
import { UHCRenewalCalculator } from './uhc/UHCCalculator';
import { CignaRenewalCalculator } from './cigna/CignaCalculator';
import { BCBSCalculator } from './bcbs/BCBSCalculator';
import { AetnaRenewalCalculator } from './aetna/AetnaCalculator';
import UHCTemplate from './uhc/UHCTemplate';
import CignaTemplate from './cigna/CignaTemplate';
import BCBSTemplate from './bcbs/BCBSTemplate';
import AetnaTemplate from './aetna/AetnaTemplate';

/**
 * Factory function to get calculator class by carrier type
 */
export function getCalculatorClass(carrier: string) {
  switch (carrier.toUpperCase()) {
    case 'UHC':
      return UHCRenewalCalculator;
    case 'CIGNA':
      return CignaRenewalCalculator;
    case 'BCBS':
      return BCBSCalculator;
    case 'AETNA':
      return AetnaRenewalCalculator;
    default:
      throw new Error(`Unsupported carrier: ${carrier}`);
  }
}

/**
 * Factory function to get template by carrier type
 */
export function getTemplate(carrier: string) {
  switch (carrier.toUpperCase()) {
    case 'UHC':
      return UHCTemplate;
    case 'CIGNA':
      return CignaTemplate;
    case 'BCBS':
      return BCBSTemplate;
    case 'AETNA':
      return AetnaTemplate;
    default:
      throw new Error(`Unsupported carrier: ${carrier}`);
  }
} 