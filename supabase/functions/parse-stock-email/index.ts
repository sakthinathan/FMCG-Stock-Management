import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import * as XLSX from "https://esm.sh/xlsx@0.18.5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not configured.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const contentType = req.headers.get('content-type') || ''
    let agencyId = ''
    let fileName = 'StockMRP.xlsx'
    let fileBytes: Uint8Array

    if (contentType.includes('application/json')) {
      // ── Scenario A: JSON Inbound Email Webhook (Postmark / CloudMailin) ──
      const body = await req.json()
      
      const toEmail = body.To || (body.headers && body.headers.to) || ""
      const agencyIdMatch = toEmail.match(/([a-fA-F0-9-]{36})/)
      if (!agencyIdMatch) {
        throw new Error("Could not find a valid 36-character Agency UUID in the recipient address ('To' header).")
      }
      agencyId = agencyIdMatch[1]

      const attachments = body.Attachments || body.attachments || []
      const excelAttachment = attachments.find((att: any) => {
        const name = att.Name || att.file_name || ''
        const contentTypeAttr = att.ContentType || att.content_type || ''
        return name.endsWith('.xlsx') || contentTypeAttr === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      if (!excelAttachment) {
        throw new Error("No valid Excel (.xlsx) file attachment found in the email payload.")
      }
      fileName = excelAttachment.Name || excelAttachment.file_name
      
      const base64Content = excelAttachment.Content || excelAttachment.content
      const binaryString = atob(base64Content)
      const len = binaryString.length
      fileBytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        fileBytes[i] = binaryString.charCodeAt(i)
      }
    } 
    else if (contentType.includes('multipart/form-data')) {
      // ── Scenario B: Multipart Form Upload ──
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        throw new Error("No file found in multipart/form-data under key 'file'.")
      }
      fileName = file.name
      const buffer = await file.arrayBuffer()
      fileBytes = new Uint8Array(buffer)

      agencyId = (formData.get('agency_id') as string) || 
                 req.headers.get('x-agency-id') || 
                 req.headers.get('X-Agency-ID') || ''
      if (!agencyId) {
        throw new Error("Missing 'agency_id' in form fields or 'x-agency-id' in headers.")
      }
    } 
    else {
      // ── Scenario C: Direct Raw Binary Upload ──
      const buffer = await req.arrayBuffer()
      fileBytes = new Uint8Array(buffer)
      if (fileBytes.length === 0) {
        throw new Error("Request body is empty.")
      }

      agencyId = req.headers.get('x-agency-id') || req.headers.get('X-Agency-ID') || ''
      fileName = req.headers.get('x-file-name') || req.headers.get('X-File-Name') || 'StockMRP.xlsx'

      if (!agencyId) {
        throw new Error("Missing 'x-agency-id' header for raw binary upload.")
      }
    }

    // 4. Parse workbook using SheetJS
    const workbook = XLSX.read(fileBytes, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet)

    if (rawData.length === 0) {
      throw new Error("Excel sheet contains 0 records.")
    }

    // 5. Map Excel rows to product master format
    const products: any[] = []
    const prevVariances = new Map<string, number>()

    // Try to fetch previous variances from the last upload of this agency
    try {
      const { data: lastUploads } = await supabase
        .from('stock_uploads')
        .select('id')
        .eq('agency_id', agencyId)
        .order('uploaded_at', { ascending: false })
        .limit(1)

      if (lastUploads && lastUploads.length > 0) {
        const prevId = lastUploads[0].id
        const { data: prevSnaps } = await supabase
          .from('system_stock_snapshots')
          .select('id, material')
          .eq('upload_id', prevId)

        if (prevSnaps) {
          const { data: prevCounts } = await supabase
            .from('physical_stock_counts')
            .select('snapshot_id, variance')
            .in('snapshot_id', prevSnaps.map(s => s.id))

          if (prevCounts) {
            const cm = new Map(prevCounts.map(c => [c.snapshot_id, c.variance]))
            prevSnaps.forEach(s => {
              if (cm.has(s.id)) prevVariances.set(s.material, cm.get(s.id)!)
            })
          }
        }
      }
    } catch (e) {
      console.warn("Failed fetching previous variances:", e)
    }

    // 6. Map and filter records
    rawData.forEach((row: any) => {
      const material = row['Material'] || row['Material Code'] || row['material']
      const description = row['Material Desc'] || row['Description'] || row['description']
      const brand = row['Brand Desc'] || row['Brand'] || row['brand'] || 'Unknown Brand'
      const mrp = parseFloat(row['MRP'] || row['mrp'] || '0')
      const goodQty = parseFloat(row['Good Qty'] || row['good_qty'] || row['Good Quantity'] || '0')
      
      let conversion = parseInt(row['Conversion_2'], 10)
      if (isNaN(conversion) || conversion <= 0) {
        conversion = parseInt(row['Conversion'] || row['conversion'] || '1', 10)
      }

      if (!material || goodQty <= 0) return

      products.push({
        material: String(material),
        description: String(description || material),
        brand: String(brand),
        mrp: isNaN(mrp) ? 0 : mrp,
        good_qty: isNaN(goodQty) ? 0 : goodQty,
        conversion: isNaN(conversion) || conversion <= 0 ? 1 : conversion,
        system_qty_pcs: isNaN(goodQty) ? 0 : Math.round(goodQty),
        prev_variance: prevVariances.get(String(material)) || 0,
      })
    })

    if (products.length === 0) {
      throw new Error("No active products with Good Qty > 0 found in sheet.")
    }

    // 7. Insert upload header
    const { data: uploadData, error: uploadErr } = await supabase
      .from('stock_uploads')
      .insert({
        file_name: fileName,
        total_records: products.length,
        agency_id: agencyId
      })
      .select()
      .single()

    if (uploadErr) throw uploadErr

    // 8. Insert snapshots (bulk insert)
    const snapshotRows = products.map(p => ({
      upload_id: uploadData.id,
      material: p.material,
      material_desc: p.description,
      brand: p.brand,
      mrp: p.mrp,
      good_qty: p.good_qty,
      conversion: p.conversion,
      system_qty_pcs: p.system_qty_pcs,
      prev_variance: p.prev_variance
    }))

    const { error: snapErr } = await supabase
      .from('system_stock_snapshots')
      .insert(snapshotRows)

    if (snapErr) throw snapErr

    return new Response(
      JSON.stringify({
        success: true,
        message: `Stock sheet parsed and uploaded successfully. Created stock_upload record ${uploadData.id} with ${products.length} snapshots for agency ${agencyId}.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
