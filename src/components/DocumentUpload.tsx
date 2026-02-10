import React, { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { formatCurrency } from '../utils/taxCalculations';

interface DocumentUploadProps {
  onOCRResult: (amount: number) => void;
  onFileUpload: (file: File, extractedAmount?: number) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onOCRResult, onFileUpload }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractedAmounts, setExtractedAmounts] = useState<number[]>([]);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  // Extract monetary amounts from text
  const extractAmounts = (text: string): number[] => {
    // Match various formats: ₦1,234.56, N1234.56, NGN 1,234, 1,234.56, etc.
    const patterns = [
      /[₦N]?\s*([0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{2})?)/gi,
      /NGN\s*([0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{2})?)/gi,
      /(?:Total|Amount|Sum|Price|Cost)[\s:]*[₦N]?\s*([0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{2})?)/gi,
    ];

    const amounts: Set<number> = new Set();

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const numStr = match[1].replace(/,/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0 && num < 1000000000) {
          amounts.add(num);
        }
      }
    });

    // Sort amounts in descending order (larger amounts first, likely totals)
    return Array.from(amounts).sort((a, b) => b - a);
  };

  // Convert file to base64 data URL for Tesseract
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Validate if file is a valid image
  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };

      img.src = url;
    });
  };

  const processFile = useCallback(async (file: File) => {
    setError('');
    setExtractedText('');
    setExtractedAmounts([]);
    setSelectedAmount(null);
    setPreviewUrl('');

    // Validate file type - only accept images (not PDF as Tesseract.js doesn't support it directly)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload an image file (JPG, PNG, GIF, BMP, or WebP). PDF files are not supported for OCR.');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size too large. Please upload an image smaller than 10MB.');
      return;
    }

    // Validate the image can be loaded
    const isValidImage = await validateImage(file);
    if (!isValidImage) {
      setError('The file appears to be corrupted or not a valid image. Please try another file.');
      return;
    }

    // Create preview
    const previewURL = URL.createObjectURL(file);
    setPreviewUrl(previewURL);

    // Process with OCR
    setIsProcessing(true);
    setProgress(0);

    try {
      // Convert file to data URL for better compatibility with Tesseract
      const dataUrl = await fileToDataUrl(file);

      const result = await Tesseract.recognize(dataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          } else if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
            setProgress(5);
          } else if (m.status === 'loading language traineddata') {
            setProgress(10);
          } else if (m.status === 'initializing api') {
            setProgress(15);
          }
        },
      });

      const text = result.data.text;
      setExtractedText(text);

      const amounts = extractAmounts(text);
      setExtractedAmounts(amounts);

      if (amounts.length === 0) {
        if (text.trim().length === 0) {
          setError('No text could be detected in the image. Please ensure the image is clear and contains readable text.');
        } else {
          setError('No monetary amounts detected in the document. You can still use this as a supporting document.');
        }
      }

      // Notify parent about file upload with the largest amount (likely the total)
      onFileUpload(file, amounts.length > 0 ? amounts[0] : 0);
    } catch (err: any) {
      console.error('OCR Error:', err);

      // Provide more specific error messages
      if (err.message?.includes('read image') || err.message?.includes('load image')) {
        setError('Could not process this image. Please try a different image format (JPG or PNG recommended).');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Network error while loading OCR engine. Please check your internet connection and try again.');
      } else {
        setError('Failed to process the document. Please try again with a clearer image (JPG or PNG format recommended).');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [onFileUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragActive(true);
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [isProcessing, processFile]);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
  };

  const handleConfirmAmount = () => {
    if (selectedAmount !== null) {
      onOCRResult(selectedAmount);
      setSelectedAmount(null);
      setExtractedAmounts([]);
      setExtractedText('');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl('');
    }
  };

  const handleClear = () => {
    setExtractedText('');
    setExtractedAmounts([]);
    setSelectedAmount(null);
    setError('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Upload Receipt/Document (OCR)
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload receipts or documents to automatically extract amounts for deductions.
        <span className="block text-xs text-gray-500 mt-1">
          Supported formats: JPG, PNG, GIF, BMP, WebP (max 10MB)
        </span>
      </p>

      {/* File Upload Area */}
      <div className="mb-4">
        <label
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          isProcessing
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : isDragActive
            ? 'border-primary-500 bg-primary-100'
            : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50'
        }`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isProcessing ? (
              <>
                <svg className="w-8 h-8 mb-3 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-gray-500">Processing...</p>
              </>
            ) : (
              <>
                <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">PNG, JPG, GIF, BMP or WebP</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Processing document...</span>
            <span className="text-sm text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {progress < 15 ? 'Loading OCR engine...' :
             progress < 50 ? 'Analyzing image...' :
             'Extracting text...'}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        </div>
      )}

      {/* Preview Image */}
      {previewUrl && !isProcessing && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Document Preview:</p>
          <img
            src={previewUrl}
            alt="Uploaded document"
            className="max-w-full h-auto max-h-48 rounded-lg border border-gray-200"
          />
        </div>
      )}

      {/* Extracted Amounts */}
      {extractedAmounts.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Detected Amounts (select one to use as deduction):
          </p>
          <div className="flex flex-wrap gap-2">
            {extractedAmounts.slice(0, 10).map((amount, index) => (
              <button
                key={index}
                onClick={() => handleAmountSelect(amount)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedAmount === amount
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {formatCurrency(amount)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Amount Confirmation */}
      {selectedAmount !== null && (
        <div className="mb-4 p-4 bg-primary-50 rounded-lg border border-primary-100">
          <p className="text-sm text-primary-700 mb-3">
            Selected amount: <span className="font-bold">{formatCurrency(selectedAmount)}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmAmount}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              Add to Deductions
            </button>
            <button
              onClick={() => setSelectedAmount(null)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Extracted Text Preview */}
      {extractedText && (
        <div className="mt-4">
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              View extracted text
            </summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-40">
              {extractedText}
            </pre>
          </details>
        </div>
      )}

      {/* Clear Button */}
      {(extractedText || previewUrl) && !isProcessing && (
        <button
          onClick={handleClear}
          className="mt-4 text-sm text-red-600 hover:text-red-800"
        >
          Clear and upload another
        </button>
      )}
    </div>
  );
};

export default DocumentUpload;
