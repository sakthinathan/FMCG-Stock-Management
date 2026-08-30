import * as XLSX from 'xlsx';

export interface Product {
  material: string;
  description: string;
  brand: string;
  mrp: number;
  goodQty: number;
  conversion: number;
  systemQtyPcs: number;
  prevVariance?: number;
}

export interface ParseResult {
  products: Product[];
  totalRows: number;
  filteredZeroQty: number;
  errors: string[];
}

export const parseExcelFile = async (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Assuming the first sheet holds the data
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);
        
        const products: Product[] = [];
        let totalRows = rawData.length;
        let filteredZeroQty = 0;
        const errors: string[] = [];

        rawData.forEach((originalRow, index) => {
          // Normalize row keys to lowercase and trimmed
          const row: any = {};
          Object.keys(originalRow).forEach(k => {
            row[k.trim().toLowerCase()] = originalRow[k];
          });

          // Map to normalized columns
          const material = row['material'] || row['material code'] || row['material_code'];
          const description = row['material desc'] || row['material description'] || row['description'] || row['material_desc'];
          const brand = row['brand desc'] || row['brand description'] || row['brand'] || row['brand_desc'] || 'Unknown Brand';
          const mrp = parseFloat(row['mrp'] || '0');

          // Robust conversion factor extraction
          let conversion = 1;
          const convValues: number[] = [];
          Object.keys(row).forEach(key => {
            if (key.includes('conversion')) {
              const val = parseInt(row[key], 10);
              if (!isNaN(val) && val > 0) {
                convValues.push(val);
              }
            }
          });
          if (convValues.length > 0) {
            conversion = Math.max(...convValues);
          }

          // Fetch goodQty with fallback to Stock in CBB / Stock in PKT
          let goodQty = parseFloat(row['good qty'] || row['good_qty'] || row['good quantity'] || row['good_quantity'] || '0');
          if (isNaN(goodQty) || goodQty <= 0) {
            const stockCbb = parseFloat(row['stock in cbb'] || row['stock_in_cbb'] || '0');
            const stockPkt = parseFloat(row['stock in pkt'] || row['stock_in_pkt'] || '0');
            if (!isNaN(stockCbb) && !isNaN(stockPkt) && (stockCbb > 0 || stockPkt > 0)) {
              goodQty = (stockCbb * conversion) + stockPkt;
            }
          }

          if (!material) {
            errors.push(`Row ${index + 2}: Missing Material Code`);
            return;
          }

          if (goodQty <= 0) {
            filteredZeroQty++;
            return; // Skip records with Good Qty = 0
          }

          products.push({
            material: String(material),
            description: String(description || material),
            brand: String(brand),
            mrp: isNaN(mrp) ? 0 : mrp,
            goodQty: isNaN(goodQty) ? 0 : goodQty,
            conversion: conversion,
            systemQtyPcs: isNaN(goodQty) ? 0 : Math.round(goodQty),
            prevVariance: Math.floor(Math.random() * 50) - 25, // Mock previous variance between -25 and +25 for testing
          });
        });

        resolve({
          products,
          totalRows,
          filteredZeroQty,
          errors,
        });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
