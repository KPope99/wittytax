import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartOptions } from 'chart.js';

// Chart.js + react-chartjs-2 are only needed once a result exists to chart,
// so this component is loaded via React.lazy() from the calculators rather
// than bundled into the main app chunk that every visitor downloads upfront.
ChartJS.register(ArcElement, Tooltip, Legend);

interface TaxPieChartProps {
  data: ChartData<'pie'>;
  options: ChartOptions<'pie'>;
}

export default function TaxPieChart({ data, options }: TaxPieChartProps) {
  return <Pie data={data} options={options} />;
}
