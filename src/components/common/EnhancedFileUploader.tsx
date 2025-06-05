import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// @ts-ignore
const MotionDiv: any = motion.div;

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
  columns: string[];
  preview: any[];
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  required: boolean;
  dataType: 'string' | 'number' | 'date' | 'currency';
}

interface EnhancedFileUploaderProps {
  onFileUpload: (file: File, mapping: ColumnMapping[]) => void;
  onValidationComplete: (result: FileValidationResult) => void;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  requiredColumns?: string[];
  loading?: boolean;
}

const EnhancedFileUploader: React.FC<EnhancedFileUploaderProps> = ({
  onFileUpload,
  onValidationComplete,
  acceptedTypes = ['.csv', '.xlsx', '.xls'],
  maxFileSize = 10,
  requiredColumns = [
    'Month', 
    'Medical Claims', 
    'Pharmacy Claims', 
    'Total Claims', 
    'Earned Premium', 
    'Members', 
    'Subscribers',
    'Capitation'
  ],
  loading = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = async (file: File): Promise<FileValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // File size validation
    if (file.size > maxFileSize * 1024 * 1024) {
      errors.push(`File size exceeds ${maxFileSize}MB limit`);
    }
    
    // File type validation
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      errors.push(`File type ${fileExtension} not supported. Accepted types: ${acceptedTypes.join(', ')}`);
    }
    
    // Mock file parsing and validation (in real app, use a library like Papa Parse)
    const mockColumns = ['Member ID', 'First Name', 'Last Name', 'Claims Amount', 'Service Date', 'Provider'];
    const mockPreview = [
      { 'Member ID': '12345', 'First Name': 'John', 'Last Name': 'Doe', 'Claims Amount': '$1,250.00', 'Service Date': '2024-01-15', 'Provider': 'ABC Medical' },
      { 'Member ID': '12346', 'First Name': 'Jane', 'Last Name': 'Smith', 'Claims Amount': '$850.00', 'Service Date': '2024-01-16', 'Provider': 'XYZ Clinic' },
      { 'Member ID': '12347', 'First Name': 'Bob', 'Last Name': 'Johnson', 'Claims Amount': '$2,100.00', 'Service Date': '2024-01-17', 'Provider': 'DEF Hospital' }
    ];
    
    // Check for required columns
    const missingColumns = requiredColumns.filter(col => !mockColumns.includes(col));
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    // Mock warnings
    if (mockColumns.length > 10) {
      warnings.push('File contains many columns. Consider mapping only necessary fields.');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      rowCount: 1247, // Mock row count
      columnCount: mockColumns.length,
      columns: mockColumns,
      preview: mockPreview
    };
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    setUploadedFile(file);
    setUploadProgress(0);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
    
    try {
      const result = await validateFile(file);
      setValidationResult(result);
      onValidationComplete(result);
      
      if (result.isValid) {
        // Initialize column mappings
        const mappings: ColumnMapping[] = result.columns.map(col => ({
          sourceColumn: col,
          targetField: requiredColumns.find(req => req === col) || '',
          required: requiredColumns.includes(col),
          dataType: col.toLowerCase().includes('amount') || col.toLowerCase().includes('cost') ? 'currency' :
                   col.toLowerCase().includes('date') ? 'date' : 
                   col.toLowerCase().includes('id') || col.toLowerCase().includes('count') ? 'number' : 'string'
        }));
        setColumnMappings(mappings);
        setShowColumnMapping(true);
      }
    } catch (error) {
      console.error('File validation error:', error);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleMappingChange = (index: number, field: 'targetField' | 'dataType', value: string) => {
    setColumnMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  const handleUploadConfirm = () => {
    if (uploadedFile && validationResult?.isValid) {
      onFileUpload(uploadedFile, columnMappings);
    }
  };

  const resetUploader = () => {
    setUploadedFile(null);
    setValidationResult(null);
    setUploadProgress(0);
    setShowColumnMapping(false);
    setColumnMappings([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Upload Area */}
      {!uploadedFile && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />
          
          <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Claims Data File
          </h3>
          <p className="text-gray-500 mb-4">
            Drag and drop your file here, or click to browse
          </p>
          <div className="text-sm text-gray-400">
            <p>Supported formats: {acceptedTypes.join(', ')}</p>
            <p>Maximum file size: {maxFileSize}MB</p>
          </div>
        </MotionDiv>
      )}

      {/* Upload Progress */}
      {uploadedFile && uploadProgress < 100 && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center space-x-4">
            <DocumentIcon className="w-8 h-8 text-blue-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{uploadedFile.name}</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        </MotionDiv>
      )}

      {/* Validation Results */}
      {validationResult && uploadProgress === 100 && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <DocumentIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">{uploadedFile?.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(uploadedFile?.size || 0)} • {validationResult.rowCount.toLocaleString()} rows • {validationResult.columnCount} columns
                </p>
              </div>
            </div>
            <button
              onClick={resetUploader}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Validation Status */}
          <div className="space-y-3 mb-6">
            {validationResult.isValid ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-medium">File validation passed</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <ExclamationTriangleIcon className="w-5 h-5" />
                <span className="font-medium">File validation failed</span>
              </div>
            )}

            {validationResult.errors.map((error, index) => (
              <div key={index} className="flex items-start space-x-2 text-red-600">
                <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            ))}

            {validationResult.warnings.map((warning, index) => (
              <div key={index} className="flex items-start space-x-2 text-yellow-600">
                <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{warning}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              <span>Preview Data</span>
            </button>
            
            {validationResult.isValid && (
              <button
                onClick={() => setShowColumnMapping(!showColumnMapping)}
                className="flex items-center space-x-2 px-4 py-2 text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Configure Mapping</span>
              </button>
            )}
          </div>
        </MotionDiv>
      )}

      {/* Data Preview */}
      <AnimatePresence>
        {showPreview && validationResult && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4"
          >
            <h4 className="text-lg font-medium text-gray-900 mb-4">Data Preview</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {validationResult.columns.map((column) => (
                      <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {validationResult.preview.map((row, index) => (
                    <tr key={index}>
                      {validationResult.columns.map((column) => (
                        <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row[column]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Column Mapping */}
      <AnimatePresence>
        {showColumnMapping && validationResult?.isValid && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Column Mapping</h4>
                <p className="text-sm text-gray-500">Map your file columns to the required data fields</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {columnMappings.map((mapping, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Column</label>
                    <div className="text-sm text-gray-900 font-medium">{mapping.sourceColumn}</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Field</label>
                    <select
                      value={mapping.targetField}
                      onChange={(e) => handleMappingChange(index, 'targetField', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select field...</option>
                      {requiredColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                      <option value="ignore">Ignore Column</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
                    <select
                      value={mapping.dataType}
                      onChange={(e) => handleMappingChange(index, 'dataType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="currency">Currency</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    {mapping.required && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowColumnMapping(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadConfirm}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                <span>Process File</span>
              </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedFileUploader; 