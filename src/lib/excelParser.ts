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

        rawData.forEach((row, index) => {
          // Map to Britannia Excel Columns
          const material = row['Material'] || row['Material Code'] || row['material'];
          const description = row['Material Desc'] || row['Description'] || row['description'];
          const brand = row['Brand Desc'] || row['Brand'] || row['brand'] || 'Unknown Brand';
          const mrp = parseFloat(row['MRP'] || row['mrp'] || '0');
          const goodQty = parseFloat(row['Good Qty'] || row['good_qty'] || row['Good Quantity'] || '0');
          
          // Conversion handling: Britannia uses 'Conversion' (e.g. 1), 'Conversion_1' (e.g. NOS), 'Conversion_2' (e.g. 96), 'Conversion_3' (e.g. PAK)
          // We need the numeric multiplier, which is usually in Conversion_2 if it exists, otherwise fallback to Conversion
          let conversion = parseInt(row['Conversion_2'], 10);
          if (isNaN(conversion) || conversion <= 0) {
            conversion = parseInt(row['Conversion'] || row['conversion'] || '1', 10);
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
            conversion: isNaN(conversion) || conversion <= 0 ? 1 : conversion,
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
