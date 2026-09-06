import { TaxCalculation } from '../context/AuthContext';
import { formatCurrency } from './taxCalculations';

const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;

// WittyTax brand green theme (matches tailwind.config.js `primary` palette)
const BRAND_PRIMARY_700: [number, number, number] = [0, 82, 50]; // #005232
const BRAND_PRIMARY_50: [number, number, number] = [240, 250, 244]; // #f0faf4
const GRAY_700: [number, number, number] = [55, 65, 81];
const GRAY_400: [number, number, number] = [156, 163, 175];
const RED_600: [number, number, number] = [220, 38, 38];
const GREEN_700: [number, number, number] = [21, 128, 61];

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

function renderPieChartDataUrl(slices: PieSlice[], size = 400): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;

  if (total > 0) {
    let startAngle = -Math.PI / 2;
    positive.forEach((slice) => {
      const sliceAngle = (slice.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();
      startAngle += sliceAngle;
    });
  }

  return canvas.toDataURL('image/png');
}

export async function downloadTaxCalculationPDF(calc: TaxCalculation): Promise<void> {
  // Loaded on demand — jsPDF is only needed once someone actually
  // downloads a report, not on every visit to the dashboard.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const amountX = pageWidth - MARGIN_RIGHT;
  const isPersonal = calc.type === 'personal';
  const r: any = calc.result || {};
  let yPos = 20;

  const sectionHeader = (title: string) => {
    doc.setFillColor(...BRAND_PRIMARY_50);
    doc.rect(MARGIN_LEFT, yPos - 6, amountX - MARGIN_LEFT, 9, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_PRIMARY_700);
    doc.text(title, MARGIN_LEFT + 2, yPos);
    doc.setTextColor(...GRAY_700);
    yPos += 12;
  };

  const row = (label: string, value: string, opts?: { bold?: boolean; color?: [number, number, number] }) => {
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setTextColor(...GRAY_700);
    doc.text(label, MARGIN_LEFT, yPos);
    doc.setTextColor(...(opts?.color ?? GRAY_700));
    doc.text(value, amountX, yPos, { align: 'right' });
    doc.setTextColor(...GRAY_700);
    yPos += 8;
  };

  // Header — brand green banner
  doc.setFillColor(...BRAND_PRIMARY_700);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('WittyTax', MARGIN_LEFT, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${isPersonal ? 'Personal' : 'Company'} Income Tax Report — NTA 2025`, MARGIN_LEFT, 27);
  doc.text(`Calculated: ${calc.date.toLocaleDateString('en-NG', { dateStyle: 'medium' })}`, amountX, 27, { align: 'right' });
  doc.setTextColor(...GRAY_700);
  yPos = 46;

  // Summary
  sectionHeader('Summary');
  doc.setFontSize(10);

  if (isPersonal) {
    row('Gross Income', formatCurrency(r.grossIncome || 0));
    row('Total Deductions', `-${formatCurrency(r.totalDeductions || 0)}`);
    row('Taxable Income', formatCurrency(r.taxableIncome || 0), { bold: true });
  } else {
    row('Annual Turnover', formatCurrency(r.annualTurnover || 0));
    row('Assessable Profit', formatCurrency(r.assessableProfit || 0));
    row('Total Deductions', `-${formatCurrency(r.totalDeductions || 0)}`);
    row('Taxable Profit', formatCurrency(r.taxableProfit || 0), { bold: true });
    row('Company Classification', r.companySize === 'small' ? 'Small' : r.companySize === 'large' ? 'Large' : 'Big');
  }

  yPos += 6;

  // Pie chart — matches the in-app "Tax vs Net Income/Profit" chart colors
  const isBigOrLarge = r.companySize === 'big' || r.companySize === 'large';
  const slices: PieSlice[] = isPersonal
    ? [
        { label: 'Tax Liability', value: r.totalTax || 0, color: '#ef4444' },
        { label: 'Net Income', value: r.netIncome || 0, color: '#3b82f6' },
      ]
    : isBigOrLarge
    ? [
        { label: 'Corporate Tax', value: r.corporateTax || 0, color: '#ef4444' },
        { label: 'Development Levy', value: r.developmentLevy || 0, color: '#f97316' },
        { label: 'Net Profit', value: r.netProfit || 0, color: '#22c55e' },
      ]
    : [
        { label: 'Total Tax', value: r.totalTax || 0, color: '#ef4444' },
        { label: 'Net Profit', value: r.netProfit || 0, color: '#22c55e' },
      ];

  const chartTotal = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  if (chartTotal > 0) {
    sectionHeader(isPersonal ? 'Tax vs Net Income' : 'Tax vs Net Profit');
    const chartDataUrl = renderPieChartDataUrl(slices);
    const chartSize = 38;
    const chartY = yPos - 4;
    doc.addImage(chartDataUrl, 'PNG', MARGIN_LEFT, chartY, chartSize, chartSize);

    let legendY = chartY + 4;
    const legendX = MARGIN_LEFT + chartSize + 10;
    doc.setFontSize(9);
    slices.forEach((slice) => {
      const [r1, g1, b1] = hexToRgb(slice.color);
      doc.setFillColor(r1, g1, b1);
      doc.rect(legendX, legendY - 3, 4, 4, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_700);
      const pct = ((Math.max(0, slice.value) / chartTotal) * 100).toFixed(1);
      doc.text(`${slice.label}: ${formatCurrency(slice.value)} (${pct}%)`, legendX + 7, legendY);
      legendY += 7;
    });

    yPos = chartY + chartSize + 8;
  }

  // Tax breakdown
  if (Array.isArray(r.taxBreakdown) && r.taxBreakdown.length > 0) {
    sectionHeader('Tax Breakdown');
    doc.setFontSize(10);

    r.taxBreakdown.forEach((band: any) => {
      const label = band.band
        ? `${band.band} (${band.rate.toFixed(0)}%)`
        : band.description;
      row(label, formatCurrency(band.tax ?? band.amount ?? 0));
    });

    yPos += 6;
  }

  // Result
  sectionHeader('Result');
  doc.setFontSize(10);
  row('Total Tax Liability', formatCurrency(r.totalTax || 0), { bold: true, color: RED_600 });
  row(isPersonal ? 'Net Income' : 'Net Profit', formatCurrency((isPersonal ? r.netIncome : r.netProfit) || 0), { bold: true, color: GREEN_700 });
  row('Effective Tax Rate', `${(r.effectiveRate || 0).toFixed(2)}%`);

  // Footer
  yPos += 6;
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_400);
  doc.text('This report is generated by WittyTax based on Nigeria Tax Act (NTA) 2025.', MARGIN_LEFT, yPos);
  yPos += 5;
  doc.text('For official tax filing, please consult Nigeria Revenue Service.', MARGIN_LEFT, yPos);
  yPos += 8;
  doc.text('© Tech84', pageWidth / 2, yPos, { align: 'center' });

  doc.save(`WittyTax_${isPersonal ? 'Personal' : 'Company'}_Report_${calc.date.toISOString().split('T')[0]}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
