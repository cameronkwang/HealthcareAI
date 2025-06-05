import React, { ChangeEvent } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FileUploaderProps {
  onDataParsed: (data: any) => void;
}

const universalTemplateHeaders = [
  'carrier', 'caseId', 'renewalStart', 'renewalEnd',
  'Month', 'memberMonthsMedical', 'memberMonthsRx', 'Medical Claims', 'Pharmacy Claims', 'paidClaimsMedical', 'paidClaimsRx',
  'largeClaimantId', 'largeClaimantPeriod', 'largeClaimantTotal', 'largeClaimantMedical', 'largeClaimantRx', 'largeClaimantDiagnosis',
  'manualRateMedical', 'manualRateRx',
  // Carrier-specific parameters (add more as needed for each carrier)
  'poolingThreshold', 'poolingFactor', 'deductibleSuppressionFactor', 'annualTrendFactor', 'experienceWeightingCurrent', 'experienceWeightingPrior',
  'retentionAdmin', 'retentionRisk', 'retentionProfit', 'retentionOther',
  'trendFactor', 'planChangeAdjustment', 'memberChangeAdjustment',
  'credibilityWeightingCurrent', 'credibilityWeightingPrior',
  'enrollmentMonth', 'enrollmentSubscribers', 'enrollmentMembers'
];

function downloadTemplate() {
  const csv = Papa.unparse([universalTemplateHeaders]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'insurance-renewal-universal-template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper function to process Excel workbook with multiple sheets
function processExcelWorkbook(workbook: XLSX.WorkBook): any[] {
  console.log('Excel workbook sheets found:', workbook.SheetNames);
  
  let allData: any[] = [];
  
  // Process each sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`Processing sheet ${index + 1}: "${sheetName}"`);
    
    const worksheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`Sheet "${sheetName}" contains ${sheetData.length} rows`);
    
    if (sheetData.length > 0) {
      console.log(`Sample data from "${sheetName}":`, sheetData[0]);
      
      // Tag data with sheet source for debugging
      const taggedData = sheetData.map((row: any) => ({
        ...row,
        _sourceSheet: sheetName,
        _sheetIndex: index
      }));
      
      allData = allData.concat(taggedData);
    }
  });
  
  console.log('Combined data from all sheets:', allData.length, 'total rows');
  
  // Debug: Show unique values for renewal dates
  const renewalStarts = Array.from(new Set(allData.map(row => row.renewalStart).filter(Boolean)));
  const renewalEnds = Array.from(new Set(allData.map(row => row.renewalEnd).filter(Boolean)));
  
  console.log('Unique renewalStart values found:', renewalStarts);
  console.log('Unique renewalEnd values found:', renewalEnds);
  
  return allData;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onDataParsed }) => {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('Processing file:', file.name);
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!data) return;
      
      const validate = (rows: any[]) => {
        console.log('Validating data with', rows.length, 'rows');
        
        // Only require Medical Claims and Pharmacy Claims if present
        const requiredFields = ['Medical Claims', 'Pharmacy Claims'];
        for (const field of requiredFields) {
          const hasField = rows.some(row => row[field] && row[field] !== '');
          if (!hasField) {
            alert(`Missing required field: ${field} in all rows`);
            return false;
          }
        }
        
        // Check for large claimants data
        const largeClaimantRows = rows.filter(row => row.largeClaimantId && row.largeClaimantId !== '');
        console.log('Found', largeClaimantRows.length, 'large claimant rows');
        
        // If any row has largeClaimantId, require largeClaimantTotal
        for (const row of largeClaimantRows) {
          if (!row.largeClaimantTotal || row.largeClaimantTotal === '') {
            alert('Missing largeClaimantTotal for a large claimant row.');
            return false;
          }
        }
        
        return true;
      };
      
      if (ext === 'csv') {
        Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('CSV parsed:', results.data.length, 'rows');
            if (validate(results.data)) onDataParsed(results.data);
          },
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Process all sheets and combine data
        const combinedData = processExcelWorkbook(workbook);
        
        if (validate(combinedData)) {
          console.log('Sending combined data to dashboard:', combinedData.length, 'rows');
          onDataParsed(combinedData);
        }
      }
    };
    
    if (ext === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="mb-4">
      <label className="block mb-2 font-semibold">Upload Claims Data (CSV or Excel):</label>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
      <button
        className="ml-4 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition"
        type="button"
        onClick={downloadTemplate}
      >
        Download Template
      </button>
      <div className="mt-2 text-sm text-gray-600">
        <strong>Note:</strong> Excel files with multiple sheets are supported. <br />
        Large claimants data can be in a separate sheet. Only medical claims and Rx claims are required. <br />
        All other fields are auto-calculated or use industry defaults, and can be overridden after upload.
      </div>
    </div>
  );
};

export default FileUploader; 