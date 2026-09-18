import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { leads, format } = await request.json()

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      )
    }

    if (format === 'excel') {
      // Gerar Excel usando uma estrutura XML simples (compatível com Excel)
      const headers = Object.keys(leads[0])
      
      let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Leads">
    <Table>
      <Row>
        ${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('\n        ')}
      </Row>
      ${leads.map(row => `
      <Row>
        ${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(String(row[h] || ''))}</Data></Cell>`).join('\n        ')}
      </Row>`).join('')}
    </Table>
  </Worksheet>
</Workbook>`

      return new NextResponse(xmlContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="leads_${new Date().toISOString().split('T')[0]}.xls"`,
        },
      })
    }

    // Fallback para CSV
    const headers = Object.keys(leads[0])
    const csvContent = [
      headers.join(';'),
      ...leads.map(row => 
        headers.map(h => {
          const value = String(row[h] || '')
          if (value.includes(';') || value.includes('\n') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(';')
      )
    ].join('\n')

    return new NextResponse('\ufeff' + csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Erro na exportação:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
