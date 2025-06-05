import React, { useState } from 'react';
import FileUploader from '../common/FileUploader';
import CarrierSelector from './CarrierSelector';
import { dispatchCarrierCalculation } from '../../utils/carrierDispatcher';
import { UniversalInput, CalculationResult, EnrollmentData, IMonthlyClaimsData, LargeClaimant } from '../../types/common';
import { AetnaParameters } from '../../types/aetna';
import { UHCParameters } from '../../types/uhc';
import { CignaParameters } from '../../types/cigna';
import { BCBSParameters } from '../../types/bcbs';
import AetnaTemplate from '../carriers/aetna/AetnaTemplate';
import UHCTemplate from '../carriers/uhc/UHCTemplate';
import CignaTemplate from '../carriers/cigna/CignaTemplate';
import BCBSTemplate from '../carriers/bcbs/BCBSTemplate';

// Helper function to parse numeric values from Excel (handles formatted numbers, percentages, etc.)
function parseExcelNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  
  // If already a number, return it
  if (typeof value === 'number') return value;
  
  // Convert to string and clean up
  let stringValue = value.toString().trim();
  
  // Remove common Excel formatting
  stringValue = stringValue
    .replace(/[$,]/g, '') // Remove dollar signs and commas
    .replace(/[()]/g, '') // Remove parentheses (negative numbers)
    .replace(/%$/, ''); // Remove percentage signs
  
  // Handle negative numbers in parentheses
  const isNegative = value.toString().includes('(') && value.toString().includes(')');
  
  // Parse the cleaned number
  const parsed = parseFloat(stringValue);
  
  if (isNaN(parsed)) return 0;
  
  return isNegative ? -parsed : parsed;
}

// Helper function to parse Excel dates with support for "MMM-YY" format
function parseExcelDate(value: any): Date {
  if (value === null || value === undefined || value === '') {
    return new Date('1970-01-01'); // Default fallback
  }
  
  // If already a Date object, return it
  if (value instanceof Date) return value;
  
  // Convert to string for processing
  const stringValue = value.toString().trim();
  
  // Handle "MMM-YY" format like "Jan-23", "Feb-23", etc.
  const monthYearMatch = stringValue.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (monthYearMatch) {
    const [, monthStr, yearStr] = monthYearMatch;
    const year = parseInt(yearStr) + (parseInt(yearStr) < 50 ? 2000 : 1900); // 23 = 2023, 89 = 1989
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.indexOf(monthStr.toLowerCase());
    if (monthIndex !== -1) {
      // Always return the first day of the month for consistency
      return new Date(year, monthIndex, 1);
    }
  }
  
  // Handle "MMM YYYY" format like "Jan 2023", "February 2024"
  const monthYearSpaceMatch = stringValue.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monthYearSpaceMatch) {
    const [, monthStr, yearStr] = monthYearSpaceMatch;
    const year = parseInt(yearStr);
    const date = new Date(`${monthStr} 1, ${year}`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Handle "MM/YYYY" or "M/YYYY" format
  const monthSlashYearMatch = stringValue.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthSlashYearMatch) {
    const [, monthStr, yearStr] = monthSlashYearMatch;
    const month = parseInt(monthStr) - 1; // JavaScript months are 0-indexed
    const year = parseInt(yearStr);
    return new Date(year, month, 1);
  }
  
  // Handle "YYYY-MM" format
  const yearMonthMatch = stringValue.match(/^(\d{4})-(\d{1,2})$/);
  if (yearMonthMatch) {
    const [, yearStr, monthStr] = yearMonthMatch;
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1; // JavaScript months are 0-indexed
    return new Date(year, month, 1);
  }
  
  // Handle Excel serial date numbers (e.g., 44927 = Dec 1, 2022)
  if (typeof value === 'number' || /^\d{4,5}$/.test(stringValue)) {
    const serialDate = typeof value === 'number' ? value : parseInt(stringValue);
    
    // Excel serial dates: 1 = Jan 1, 1900 (but Excel has a leap year bug)
    // Reasonable range for dates (between 1900 and 2100)
    if (serialDate > 0 && serialDate < 100000) {
      // Convert Excel serial to JavaScript Date
      // Excel epoch: Jan 1, 1900 but JavaScript Date epoch is Jan 1, 1970
      const excelEpoch = new Date(1900, 0, 1);
      const daysSinceEpoch = serialDate - 1; // Excel starts counting from 1, not 0
      const result = new Date(excelEpoch.getTime() + daysSinceEpoch * 24 * 60 * 60 * 1000);
      
      // Additional adjustment for Excel's leap year bug (treats 1900 as leap year)
      if (serialDate > 59) { // After Feb 28, 1900
        result.setDate(result.getDate() - 1);
      }
      
      return result;
    }
  }
  
  // Handle standard date formats like "MM/DD/YYYY", "YYYY-MM-DD", etc.
  const standardDate = new Date(stringValue);
  if (!isNaN(standardDate.getTime())) {
    return standardDate;
  }
  
  // Handle "DD/MM/YYYY" vs "MM/DD/YYYY" ambiguity by trying both
  const slashMatch = stringValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, first, second, yearStr] = slashMatch;
    const year = parseInt(yearStr);
    
    // Try MM/DD/YYYY first (more common in US)
    const mmdd = new Date(year, parseInt(first) - 1, parseInt(second));
    if (!isNaN(mmdd.getTime()) && parseInt(first) <= 12) {
      return mmdd;
    }
    
    // Try DD/MM/YYYY if MM/DD doesn't make sense
    const ddmm = new Date(year, parseInt(second) - 1, parseInt(first));
    if (!isNaN(ddmm.getTime()) && parseInt(second) <= 12) {
      return ddmm;
    }
  }
  
  console.warn('Could not parse date:', value, typeof value);
  return new Date('1970-01-01'); // Default fallback
}

function mapToUniversalInput(data: any[], carrier: string): UniversalInput {
  if (!data || data.length === 0) {
    throw new Error('No data provided');
  }

  const row = data[0]; // Assume data structure for single group
  
  // Debug logging for renewal dates
  console.log('Raw renewal dates from Excel:');
  console.log('renewalStart:', row.renewalStart, typeof row.renewalStart);
  console.log('renewalEnd:', row.renewalEnd, typeof row.renewalEnd);
  
  // Parse the monthly claims data to find actual date range
  const monthlyData = data.filter(row => row.Month && row['Medical Claims'] !== undefined);
  console.log('Found', monthlyData.length, 'monthly data rows');
  
  if (monthlyData.length > 0) {
    console.log('Sample monthly data:', monthlyData[0]);
    console.log('First month:', monthlyData[0].Month);
    console.log('Last month:', monthlyData[monthlyData.length - 1].Month);
  }
  
  // Parse dates from monthly data and sort them
  const monthDates = monthlyData
    .map(row => parseExcelDate(row.Month))
    .filter(date => date.getFullYear() > 1970) // Filter out invalid dates
    .sort((a, b) => a.getTime() - b.getTime());
  
  console.log('Parsed monthly dates:', monthDates.map(d => d.toLocaleDateString()));
  
  // Determine renewal dates from the data range with proper full-month periods
  let renewalStart: Date;
  let renewalEnd: Date;
  
  if (monthDates.length > 0) {
    // Create full month periods: first day of first month to last day of last month
    const firstDate = monthDates[0];
    const lastDate = monthDates[monthDates.length - 1];
    
    // Set renewal start to first day of the first month
    renewalStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    
    // Set renewal end to last day of the last month
    renewalEnd = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0); // Last day of month
    
    console.log('Experience period (full months):');
    console.log('Start:', renewalStart.toLocaleDateString());
    console.log('End:', renewalEnd.toLocaleDateString());
    console.log('Period span:', renewalStart.toLocaleDateString(), 'to', renewalEnd.toLocaleDateString());
  } else {
    // Fallback to explicit renewal dates if provided
    renewalStart = parseExcelDate(row.renewalStart);
    renewalEnd = parseExcelDate(row.renewalEnd);
    
    // If still invalid, create a reasonable default
    if (renewalStart.getFullYear() <= 1970 || renewalEnd.getFullYear() <= 1970) {
      console.warn('No valid renewal dates found, using defaults');
      renewalStart = new Date('2023-01-01');
      renewalEnd = new Date('2024-12-31');
    }
  }

  const enrollmentDataArr: EnrollmentData[] = data.filter(r => r.enrollmentMonth).map((r) => ({
    month: r.enrollmentMonth,
    subscribers: parseExcelNumber(r.enrollmentSubscribers) || 0,
    members: parseExcelNumber(r.enrollmentMembers) || 0,
  }));
  // Attach enrollmentDataArr to the first row for BCBS param mapping
  if (row) row._enrollmentDataArray = enrollmentDataArr;
  
  // Process monthly claims data
  const monthlyClaimsData: IMonthlyClaimsData[] = data
    .filter(row => row.Month && row['Medical Claims'] !== undefined)
    .map(row => {
      const parsedDate = parseExcelDate(row.Month);
      const monthString = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
      
      const memberMonthsMed = parseExcelNumber(row.memberMonthsMedical) || parseExcelNumber(row.Members) || parseExcelNumber(row['Member Months']) || 0;
      const memberMonthsRx = parseExcelNumber(row.memberMonthsRx) || memberMonthsMed;
      const medicalClaims = parseExcelNumber(row['Medical Claims']) || 0;
      const rxClaims = parseExcelNumber(row['Rx Claims']) || parseExcelNumber(row['Pharmacy Claims']) || 0;

      return {
        month: monthString,
        memberMonths: {
          medical: memberMonthsMed,
          rx: memberMonthsRx,
          total: Math.max(memberMonthsMed, memberMonthsRx)
        },
        incurredClaims: {
          medical: medicalClaims,
          rx: rxClaims,
          total: medicalClaims + rxClaims
        }
      };
    });

  console.log(`Processed ${monthlyClaimsData.length} months of claims data:`, monthlyClaimsData.slice(0, 3));

  // Debug: Log the structure of all data to understand the Excel format
  console.log('🔍 DEBUGGING: All Excel data structure:');
  data.forEach((row, index) => {
    if (index < 10) { // Only log first 10 rows to avoid spam
      console.log(`Row ${index}:`, {
        keys: Object.keys(row),
        claimantRelatedFields: Object.keys(row).filter(key => 
          key.toLowerCase().includes('claimant') || 
          key.toLowerCase().includes('claim') ||
          key.toLowerCase().includes('member') ||
          key.toLowerCase().includes('id')
        ),
        amountFields: Object.keys(row).filter(key => 
          key.toLowerCase().includes('amount') ||
          key.toLowerCase().includes('claims') ||
          key.toLowerCase().includes('medical') ||
          key.toLowerCase().includes('rx') ||
          key.toLowerCase().includes('pharmacy')
        ),
        sampleValues: row
      });
    }
  });

  // Enhanced large claimant processing with guaranteed date assignment within periods
  const largeClaimantsData: LargeClaimant[] = data
    .filter((row, index) => {
      // First, check if this looks like a monthly summary row (skip those)
      const hasMonthField = row.Month || row.month || row.monthYear;
      if (hasMonthField) {
        console.log(`⏭️ Skipping monthly summary row ${index}:`, row);
        return false;
      }

      // Look for rows that have claimant identifiers
      const hasClaimantId = row['Claimant Number'] || 
        row.largeClaimantId || 
        row.ClaimantId ||
        row.claimantNumber ||
        row['Member ID'] ||
        row.memberId;
      
      // Look for rows with claim amounts (be more specific about thresholds)
      const totalClaims = parseExcelNumber(row['Total Claims']);
      const largeClaimantTotal = parseExcelNumber(row.largeClaimantTotal);
      const claimAmount = parseExcelNumber(row['Claim Amount']);
      const totalAmount = parseExcelNumber(row['Total Amount']);
      
      // Use a higher threshold to avoid picking up small claims or summary data
      const significantAmount = Math.max(totalClaims, largeClaimantTotal, claimAmount, totalAmount);
      const hasLargeClaim = significantAmount > 50000; // Raised threshold to $50k
      
      const isLargeClaimant = hasClaimantId && hasLargeClaim;
      
      if (hasClaimantId || hasLargeClaim) {
        console.log(`🔍 Evaluating row ${index} for large claimant:`, {
          hasClaimantId: !!hasClaimantId,
          hasLargeClaim,
          significantAmount,
          isLargeClaimant,
          claimantIdValue: hasClaimantId,
          availableAmountFields: Object.keys(row).filter(key => 
            key.toLowerCase().includes('amount') || key.toLowerCase().includes('claims')
          ),
          rowData: row
        });
      }
      
      return isLargeClaimant;
    })
    .map((row, index) => {
      // Try to extract claimant ID from various possible column names
      const claimantId = row['Claimant Number'] || 
                        row.largeClaimantId || 
                        row.ClaimantId ||
                        row.claimantNumber ||
                        row['Member ID'] ||
                        row.memberId ||
                        `LC${index + 1}`;

      // Smart date assignment using the actual monthly claims data
      let incurredDate: Date | null = null;
      
      // If we have monthly claims data, use it to determine safe date ranges
      if (monthlyClaimsData.length > 0) {
        // Sort the monthly data to get the actual range
        const sortedMonthlyData = [...monthlyClaimsData].sort((a, b) => 
          new Date(a.month).getTime() - new Date(b.month).getTime()
        );
        
        const oldestMonth = sortedMonthlyData[0].month; // "2023-01"
        const newestMonth = sortedMonthlyData[sortedMonthlyData.length - 1].month; // "2024-12"
        
        // Parse the newest month to get a safe date within that month
        const [year, month] = newestMonth.split('-').map(Number);
        // Use the 15th of the most recent month - this should always be within the month
        incurredDate = new Date(year, month - 1, 15);
      }
      
      // Fallback to a more recent date if we don't have monthly data
      if (!incurredDate) {
        incurredDate = new Date('2024-06-15'); // Safe middle date
      }

      // Extract amounts with detailed debugging
      const totalAmount = parseExcelNumber(row['Total Claims']) || 
                         parseExcelNumber(row.largeClaimantTotal) || 
                         parseExcelNumber(row.totalAmount) || 
                         parseExcelNumber(row['Total Amount']) ||
                         parseExcelNumber(row['Claim Amount']) ||
                         0;

      const medicalAmount = parseExcelNumber(row['Medical Claims']) || 
                           parseExcelNumber(row.medicalAmount) || 
                           parseExcelNumber(row['Medical Amount']) ||
                           parseExcelNumber(row['Medical']) ||
                           totalAmount * 0.85; // Default split: 85% medical, 15% Rx

      const rxAmount = parseExcelNumber(row['Rx Claims']) || 
                      parseExcelNumber(row.rxAmount) || 
                      parseExcelNumber(row['Pharmacy Claims']) ||
                      parseExcelNumber(row['Rx Amount']) ||
                      parseExcelNumber(row['Pharmacy']) ||
                      totalAmount * 0.15;

      console.log(`🏥 Processing claimant ${claimantId}:`, {
        rawRow: row,
        extractedAmounts: {
          totalAmount,
          medicalAmount,
          rxAmount,
          calculatedTotal: medicalAmount + rxAmount
        },
        availableColumns: Object.keys(row).filter(key => 
          key.toLowerCase().includes('claim') || 
          key.toLowerCase().includes('medical') || 
          key.toLowerCase().includes('rx') || 
          key.toLowerCase().includes('pharmacy') ||
          key.toLowerCase().includes('amount')
        )
      });

      return {
        claimantId: String(claimantId),
        incurredDate,
        totalAmount,
        medicalAmount,
        rxAmount
      };
    })
    .filter(claimant => claimant.totalAmount > 0);

  console.log(`Found ${largeClaimantsData.length} large claimants:`, largeClaimantsData);

  // Debug: Calculate total large claimant amounts to verify they're reasonable
  const totalLargeClaimantAmount = largeClaimantsData.reduce((sum, claimant) => sum + claimant.totalAmount, 0);
  const totalMedicalAmount = largeClaimantsData.reduce((sum, claimant) => sum + (claimant.medicalAmount || 0), 0);
  const totalRxAmount = largeClaimantsData.reduce((sum, claimant) => sum + (claimant.rxAmount || 0), 0);
  
  console.log('🏥 Large Claimant Summary:');
  console.log(`   Count: ${largeClaimantsData.length}`);
  console.log(`   Total Amount: $${totalLargeClaimantAmount.toLocaleString()}`);
  console.log(`   Medical: $${totalMedicalAmount.toLocaleString()}`);
  console.log(`   Rx: $${totalRxAmount.toLocaleString()}`);
  console.log('   Individual Claimants:');
  largeClaimantsData.forEach((claimant, index) => {
    console.log(`     ${index + 1}. ${claimant.claimantId}: Total=$${claimant.totalAmount.toLocaleString()}, Medical=$${(claimant.medicalAmount || 0).toLocaleString()}, Rx=$${(claimant.rxAmount || 0).toLocaleString()}, Date=${claimant.incurredDate.toLocaleDateString()}`);
  });

  return {
    carrier: carrier as any,
    caseId: row.caseId || '',
    effectiveDates: {
      renewalStart: renewalStart,
      renewalEnd: renewalEnd,
    },
    monthlyClaimsData: monthlyClaimsData,
    largeClaimantsData: largeClaimantsData,
    manualRates: {
      medical: parseExcelNumber(row.manualRateMedical) || 0,
      rx: parseExcelNumber(row.manualRateRx) || 0,
    },
    carrierSpecificParameters: mapToCarrierParams(row, carrier),
    enrollmentData: enrollmentDataArr,
  };
}

// Helper function to parse month strings into sortable dates
function parseMonthForSorting(monthStr: string): Date | null {
  if (!monthStr) return null;
  
  try {
    // Handle Excel serial date numbers (e.g., "44927" = Dec 1, 2022)
    if (typeof monthStr === 'number' || /^\d{4,5}$/.test(monthStr.toString())) {
      const serialDate = typeof monthStr === 'number' ? monthStr : parseInt(monthStr.toString());
      
      // Excel serial dates: 1 = Jan 1, 1900 (but Excel has a leap year bug)
      // Reasonable range for dates (between 1900 and 2100)
      if (serialDate > 0 && serialDate < 100000) {
        // Convert Excel serial to JavaScript Date
        // Excel epoch: Jan 1, 1900 (but with leap year bug, so actually Dec 30, 1899)
        const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
        const jsDate = new Date(excelEpoch.getTime() + (serialDate * 24 * 60 * 60 * 1000));
        return jsDate;
      }
    }
    
    const dateStr = monthStr.toString().trim();
    
    // Handle "YYYY-MM" format
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + '-01');
    }
    
    // Handle "YYYY-MM-DD" format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }
    
    // Handle "Month YYYY" format (e.g., "January 2023")
    if (/^[A-Za-z]+ \d{4}$/.test(dateStr)) {
      return new Date(dateStr + ' 01');
    }
    
    // Handle "MM/YYYY" format
    if (/^\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    }
    
    // Handle "MM-YYYY" format
    if (/^\d{1,2}-\d{4}$/.test(dateStr)) {
      const [month, year] = dateStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    }
    
    // Handle "MMM-YY" format (e.g., "Jan-24", "Feb-23")
    if (/^[A-Za-z]{3}-\d{2}$/.test(dateStr)) {
      const [monthAbbr, yearShort] = dateStr.split('-');
      const year = 2000 + parseInt(yearShort); // Assume 21st century
      const date = new Date(`${monthAbbr} 1, ${year}`);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Handle "MMMYY" format (e.g., "Jan24", "Feb23")
    if (/^[A-Za-z]{3}\d{2}$/.test(dateStr)) {
      const monthAbbr = dateStr.substring(0, 3);
      const yearShort = dateStr.substring(3);
      const year = 2000 + parseInt(yearShort);
      const date = new Date(`${monthAbbr} 1, ${year}`);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Handle MM/DD/YYYY format (common in Excel exports) - use first day of month
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, 1); // Use first day of month
    }
    
    // Handle YYYY/MM/DD format - use first day of month
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, 1); // Use first day of month
    }
    
    // Handle DD/MM/YYYY format - use first day of month
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      // This is ambiguous with MM/DD/YYYY, but we'll assume MM/DD/YYYY format is more common
      // If you need DD/MM/YYYY specifically, you may need additional logic to detect the format
      const [month, day, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    }
    
    // Try direct parsing as fallback
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
    
  } catch (error) {
    console.warn(`Could not parse month: ${monthStr}`, error);
    return null;
  }
}

// Helper function to map carrier-specific parameters
function mapToCarrierParams(row: any, carrier: string): any {
  // Return all fields for carrier-specific mapping
  // Each carrier will extract what it needs from this object
  return {
    ...row,
    carrier
  };
}

function getDefaultCarrierParams(carrier: string) {
  switch (carrier) {
    case 'UHC':
      return {
        poolingThreshold: 125000,
        poolingFactor: 1,
        deductibleSuppressionFactor: 1,
        annualTrendFactor: 1.05,
        experienceWeightingCurrent: 0.70,
        experienceWeightingPrior: 0.30,
        retentionAdmin: 0,
        retentionRisk: 0,
        retentionProfit: 0,
        retentionOther: 0,
      };
    case 'AETNA':
      return {
        poolingLevel: 175000,
        trendFactor: 1.05,
        networkAdjustment: 1,
        demographicAdjustment: 1,
        retentionComponents: { admin: 0.05, risk: 0.02, profit: 0.01, other: 0.01 },
      };
    case 'CIGNA':
      return {
        poolingThreshold: 50000,
        trendFactor: 1.04,
        planChangeAdjustment: 1,
        memberChangeAdjustment: 1,
        credibilityWeighting: { current: 0.8, prior: 0.2 },
        retentionComponents: { admin: 0.05, risk: 0.02, profit: 0.01, other: 0.01 },
      };
    case 'BCBS':
      return {
        poolingThreshold: 100000,
        poolingCharge: 1,
        trendFactor: 1.02,
        enrollmentData: [],
        retentionComponents: { admin: 0.05, risk: 0.02, profit: 0.01, other: 0.01 },
      };
    default:
      return {};
  }
}

function autoCalculateParams(data: any[], carrier: string) {
  // Calculate total member months
  const totalMemberMonths = data.reduce((sum, r) => sum + (parseExcelNumber(r.memberMonthsMedical) || 0) + (parseExcelNumber(r.memberMonthsRx) || 0), 0);
  // Industry standard credibility formula (sqrt(totalMemberMonths/12000), capped at 1)
  const credibility = Math.min(1, Math.sqrt(totalMemberMonths / 12000));
  // Get system defaults
  const defaults = getDefaultCarrierParams(carrier);
  // Get carrier-specific parameters from uploaded data
  const carrierParams = mapToCarrierParams(data[0] || {}, carrier);
  // Allow override from uploaded data (first row)
  const row = data[0] || {};
  // Compose params, preferring uploaded value if present, else default
  let params: any = { ...defaults, ...carrierParams };
  Object.keys(defaults).forEach((key) => {
    if (row[key] !== undefined && row[key] !== '') params[key] = row[key];
  });
  // Inject calculated credibility if relevant
  if (carrier === 'CIGNA') {
    params.credibilityWeighting = { current: credibility, prior: 1 - credibility };
  }
  // For BCBS, pass enrollmentData if present
  if (carrier === 'BCBS' && row._enrollmentDataArray) {
    params.enrollmentData = row._enrollmentDataArray;
  }
  return { params, totalMemberMonths, credibility };
}

const ProjectionDashboard: React.FC = () => {
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('AETNA');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'main' | 'audit'>('main');
  const [parsedData, setParsedData] = useState<{
    monthlyClaimsData: IMonthlyClaimsData[];
    largeClaimantsData: LargeClaimant[];
  } | null>(null);

  const handleRunProjection = async () => {
    if (!uploadedData.length || !selectedCarrier) {
      setError('Please upload data and select a carrier.');
      return;
    }
    // Only require non-derivable fields
    const requiredFields = ['Medical Claims', 'Pharmacy Claims'];
    for (const field of requiredFields) {
      if (!uploadedData[0][field]) {
        setError(`Missing required field: ${field}`);
        return;
      }
    }
    setError(null);
    const input = mapToUniversalInput(uploadedData, selectedCarrier);
    
    // Store parsed data for audit view
    setParsedData({
      monthlyClaimsData: input.monthlyClaimsData,
      largeClaimantsData: input.largeClaimantsData
    });
    
    // Auto-calculate params and allow override
    const { params, totalMemberMonths, credibility } = autoCalculateParams(uploadedData, selectedCarrier);
    const mergedParams = { ...params, ...overrides };
    const calcResult = dispatchCarrierCalculation(input, mergedParams);
    setResult(await calcResult);
  };

  const handleSampleData = () => {
    setUploadedData([
      {
        caseId: 'SAMPLE123',
        renewalStart: '2024-01-01',
        renewalEnd: '2024-12-31',
        month: '2024-01',
        memberMonthsMedical: 100,
        memberMonthsRx: 90,
        incurredClaimsMedical: 10000,
        incurredClaimsRx: 2000,
        paidClaimsMedical: 9500,
        paidClaimsRx: 1800,
        manualRateMedical: 120,
        manualRateRx: 30,
        poolingThreshold: 100000,
        poolingFactor: 1,
        deductibleSuppressionFactor: 1,
        annualTrendFactor: 1.05,
        experienceWeightingCurrent: 0.75,
        experienceWeightingPrior: 0.25,
        retentionAdmin: 0,
        retentionRisk: 0,
        retentionProfit: 0,
        retentionOther: 0,
        trendFactor: 1.04,
        planChangeAdjustment: 1,
        memberChangeAdjustment: 1,
        credibilityWeightingCurrent: 0.8,
        credibilityWeightingPrior: 0.2,
        enrollmentMonth: '2024-01',
        enrollmentSubscribers: 60,
        enrollmentMembers: 150,
      },
    ]);
    setSelectedCarrier('AETNA');
    setResult(null);
    setError(null);
  };

  // UI for showing calculated/default values and allowing override
  const renderOverrides = () => {
    if (!selectedCarrier) return null;
    const { params, totalMemberMonths, credibility } = autoCalculateParams(uploadedData, selectedCarrier);
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Calculation Parameters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Total Member Months</div>
            <div className="text-xl font-bold text-gray-900">{totalMemberMonths.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Credibility Factor</div>
            <div className="text-xl font-bold text-gray-900">{(credibility * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="space-y-3">
          {Object.entries(params).map(([key, value]) => (
            typeof value !== 'object' ? (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <input
                  type="number"
                  step="any"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={overrides[key] !== undefined ? overrides[key] : value}
                  onChange={e => setOverrides({ ...overrides, [key]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ) : null
          ))}
        </div>
      </div>
    );
  };

  const renderTemplate = () => {
    if (!result) return null;

    // Use carrier-specific templates based on actual result types
    switch (selectedCarrier) {
      case 'UHC':
        if (result.carrier === 'UHC' && result.detailedResults?.uhc) {
          return <UHCTemplate result={result.detailedResults.uhc} />;
        }
        break;
      case 'AETNA':
        if (result.carrier === 'AETNA' && result.detailedResults?.aetna) {
          return <AetnaTemplate result={result.detailedResults.aetna} />;
        }
        break;
      case 'CIGNA':
        if (result.carrier === 'CIGNA' && result.detailedResults?.cigna) {
          return <CignaTemplate result={result.detailedResults.cigna} />;
        }
        break;
      case 'BCBS':
        if (result.carrier === 'BCBS') {
          return <BCBSTemplate result={result as any} />;
        }
        break;
      default:
        break;
    }

    // Fallback for unsupported carriers or mismatched types
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">
          Template not available for {selectedCarrier}. 
          Raw calculation result available in console.
        </p>
        <pre className="mt-2 text-xs bg-white p-2 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  // Step indicator component
  const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = [
      { number: 1, title: 'Upload Data', description: 'Upload your claims and member data' },
      { number: 2, title: 'Select Carrier', description: 'Choose your insurance carrier' },
      { number: 3, title: 'Configure', description: 'Review and adjust parameters' },
      { number: 4, title: 'Run Projection', description: 'Generate renewal projections' }
    ];

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  ${currentStep >= step.number 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-400'
                  }
                `}>
                  {currentStep > step.number ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <div className="ml-3 hidden md:block">
                  <div className={`text-sm font-medium ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  hidden md:block w-20 h-0.5 mx-4
                  ${currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'}
                `}></div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Determine current step
  const getCurrentStep = () => {
    if (result) return 4;
    if (selectedCarrier && uploadedData.length > 0) return 3;
    if (selectedCarrier) return 2;
    if (uploadedData.length > 0) return 1;
    return 1;
  };

  // Data Audit View Component
  const DataAuditView = () => {
    if (!parsedData) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Processed Yet</h3>
            <p className="text-gray-500">Upload data and run a projection to see the parsed data audit.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Monthly Claims Data */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Monthly Claims Data</h2>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {parsedData.monthlyClaimsData.length} months
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medical Claims</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rx Claims</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Claims</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Months</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PMPM</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parsedData.monthlyClaimsData.map((month, index) => {
                  const pmpm = (month.incurredClaims.total || month.incurredClaims.medical + month.incurredClaims.rx) / month.memberMonths.total;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${month.incurredClaims.medical.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${month.incurredClaims.rx.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${(month.incurredClaims.total || month.incurredClaims.medical + month.incurredClaims.rx).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{month.memberMonths.total.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${pmpm.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Monthly Data Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-600">Total Medical Claims</div>
              <div className="text-xl font-bold text-blue-900">
                ${parsedData.monthlyClaimsData.reduce((sum, m) => sum + m.incurredClaims.medical, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">Total Rx Claims</div>
              <div className="text-xl font-bold text-green-900">
                ${parsedData.monthlyClaimsData.reduce((sum, m) => sum + m.incurredClaims.rx, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-600">Total Claims</div>
              <div className="text-xl font-bold text-purple-900">
                ${parsedData.monthlyClaimsData.reduce((sum, m) => sum + (m.incurredClaims.total || m.incurredClaims.medical + m.incurredClaims.rx), 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm font-medium text-orange-600">Total Member Months</div>
              <div className="text-xl font-bold text-orange-900">
                {parsedData.monthlyClaimsData.reduce((sum, m) => sum + m.memberMonths.total, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Large Claimants Data */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center mb-6">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Large Claimants</h2>
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full">
              {parsedData.largeClaimantsData.length} claimants
            </span>
          </div>
          
          {parsedData.largeClaimantsData.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claimant ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incurred Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medical Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rx Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pooled @ $175K</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pooled @ $125K</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.largeClaimantsData.map((claimant, index) => {
                      const pooled175k = Math.max(0, claimant.totalAmount - 175000);
                      const pooled125k = Math.max(0, claimant.totalAmount - 125000);
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{claimant.claimantId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {claimant.incurredDate.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${claimant.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(claimant.medicalAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(claimant.rxAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={pooled175k > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                              ${pooled175k.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={pooled125k > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                              ${pooled125k.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Large Claimants Summary */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-600">Total Large Claimant Amount</div>
                  <div className="text-xl font-bold text-red-900">
                    ${parsedData.largeClaimantsData.reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-orange-600">Pooled @ $175K (Aetna)</div>
                  <div className="text-xl font-bold text-orange-900">
                    ${parsedData.largeClaimantsData.reduce((sum, c) => sum + Math.max(0, c.totalAmount - 175000), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-yellow-600">Pooled @ $125K (UHC)</div>
                  <div className="text-xl font-bold text-yellow-900">
                    ${parsedData.largeClaimantsData.reduce((sum, c) => sum + Math.max(0, c.totalAmount - 125000), 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-600">Pooled @ $50K (Cigna)</div>
                  <div className="text-xl font-bold text-blue-900">
                    ${parsedData.largeClaimantsData.reduce((sum, c) => sum + Math.max(0, c.totalAmount - 50000), 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Large Claimants Found</h3>
              <p className="text-gray-500">No claimants over $25,000 were detected in the uploaded data.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Insurance Renewal Projections</h1>
              <p className="mt-2 text-lg text-gray-600">Advanced actuarial modeling for informed renewal decisions</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>4 Carriers</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>24+ Months Data</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>AI Powered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('main')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'main'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Projections
              </div>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'audit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Data Audit
                {parsedData && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {parsedData.largeClaimantsData.length} claimants
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'main' ? (
          /* Main Projection View */
          <div className="space-y-8">
            {/* Step Indicator */}
            <StepIndicator currentStep={getCurrentStep()} />

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left Column - Data Upload & Configuration */}
              <div className="xl:col-span-2 space-y-6">
                {/* Data Upload Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Data Upload</h2>
                  </div>
                  <FileUploader onDataParsed={setUploadedData} />
                  
                  {uploadedData.length > 0 && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                        </svg>
                        <span className="text-sm font-medium text-green-800">
                          Successfully uploaded {uploadedData.length} rows of data
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Carrier Selection */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Insurance Carrier</h2>
                  </div>
                  <CarrierSelector selected={selectedCarrier} onSelect={setSelectedCarrier} />
                </div>

                {/* Configuration Parameters */}
                {renderOverrides()}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                      </svg>
                      <span className="text-sm font-medium text-red-800">{error}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Action Panel */}
              <div className="space-y-6">
                {/* Action Panel */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={handleSampleData}
                      className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      Load Sample Data
                    </button>
                    
                    <button 
                      onClick={handleRunProjection}
                      disabled={!uploadedData.length || !selectedCarrier}
                      className={`
                        w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center
                        ${(!uploadedData.length || !selectedCarrier)
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        }
                      `}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                      Run Projection Analysis
                    </button>
                  </div>

                  {(uploadedData.length > 0 || selectedCarrier) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Status Overview</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Data Uploaded</span>
                          <span className={uploadedData.length > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {uploadedData.length > 0 ? '✓ Complete' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Carrier Selected</span>
                          <span className={selectedCarrier ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {selectedCarrier ? `✓ ${selectedCarrier}` : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Ready to Project</span>
                          <span className={(uploadedData.length > 0 && selectedCarrier) ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {(uploadedData.length > 0 && selectedCarrier) ? '✓ Ready' : 'Not Ready'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results Section */}
            {result && (
              <div className="mt-8">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Projection Results</h2>
                  </div>
                  {renderTemplate()}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Data Audit View */
          <DataAuditView />
        )}
      </div>
    </div>
  );
};

export default ProjectionDashboard; 