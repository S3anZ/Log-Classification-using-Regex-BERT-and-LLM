import { ResponsiveRadar } from '@nivo/radar';
import { ResponsiveLine } from '@nivo/line';
import { motion } from 'framer-motion';

export default function Performance() {

  const radarData = [
    { metric: 'Accuracy', bert: 92, llm: 85 },
    { metric: 'Precision', bert: 88, llm: 82 },
    { metric: 'Recall', bert: 94, llm: 90 },
    { metric: 'F1-Score', bert: 91, llm: 86 },
    { metric: 'Speed', bert: 99, llm: 40 },
  ];

  const lineData = [
    {
      id: 'BERT Latency',
      color: '#44e2cd', // secondary
      data: [
        { x: '00:00', y: 40 },
        { x: '06:00', y: 42 },
        { x: '12:00', y: 45 },
        { x: '18:00', y: 41 },
        { x: 'Now', y: 43 },
      ]
    },
    {
      id: 'LLM Latency',
      color: '#c0c1ff', // tertiary
      data: [
        { x: '00:00', y: 150 },
        { x: '06:00', y: 180 },
        { x: '12:00', y: 220 },
        { x: '18:00', y: 190 },
        { x: 'Now', y: 185 },
      ]
    }
  ];

  return (
    <div className="h-full flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-4 flex justify-between items-end shrink-0">
        <div>
          <p className="font-label-caps text-secondary mb-1">EVALUATION METRICS</p>
          <h2 className="font-display-lg text-on-surface">Model Performance Comparison</h2>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-on-surface-variant font-code-sm">
            <span className="w-3 h-3 rounded-full bg-secondary inline-block"></span> BERT Base (v2.4)
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant font-code-sm">
            <span className="w-3 h-3 rounded-full bg-tertiary inline-block"></span> LLM-Turbo (v1.0)
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-12 gap-grid-gutter flex-1 min-h-0">
        {/* Radar Charts (Side by side) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="col-span-12 md:col-span-6 bg-surface-container border border-outline-variant rounded-lg relative group hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all p-6 flex flex-col"
        >
          <div className="mb-4 shrink-0">
            <span className="font-label-caps text-on-surface-variant">BERT BASE (V2.4)</span>
            <h3 className="font-headline-sm text-on-surface mt-1">Classification Efficacy</h3>
          </div>
          <div className="h-[300px] border-t border-outline-variant/30 mt-4 pt-4 relative">
            <ResponsiveRadar
              data={radarData}
              keys={['bert']}
              indexBy="metric"
              valueFormat=">-.2f"
              margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
              borderColor={{ from: 'color' }}
              gridLabelOffset={20}
              dotSize={8}
              dotColor={{ theme: 'background' }}
              dotBorderWidth={2}
              colors={['#44e2cd']}
              blendMode="screen"
              motionConfig="wobbly"
              theme={{
                text: { fill: '#909097' },
                grid: { line: { stroke: '#45464d', strokeWidth: 1 } },
                dots: { text: { fill: '#d4e4fa' } }
              }}
            />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="col-span-12 md:col-span-6 bg-surface-container border border-outline-variant rounded-lg relative group hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all p-6 flex flex-col"
        >
          <div className="mb-4 shrink-0">
            <span className="font-label-caps text-on-surface-variant">LLM-TURBO (V1.0)</span>
            <h3 className="font-headline-sm text-on-surface mt-1">Classification Efficacy</h3>
          </div>
          <div className="h-[300px] border-t border-outline-variant/30 mt-4 pt-4 relative">
            <ResponsiveRadar
              data={radarData}
              keys={['llm']}
              indexBy="metric"
              valueFormat=">-.2f"
              margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
              borderColor={{ from: 'color' }}
              gridLabelOffset={20}
              dotSize={8}
              dotColor={{ theme: 'background' }}
              dotBorderWidth={2}
              colors={['#c0c1ff']}
              blendMode="screen"
              motionConfig="wobbly"
              theme={{
                text: { fill: '#909097' },
                grid: { line: { stroke: '#45464d', strokeWidth: 1 } },
                dots: { text: { fill: '#d4e4fa' } }
              }}
            />
          </div>
        </motion.div>

        {/* Latency Line Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="col-span-12 bg-surface-container border border-outline-variant rounded-lg hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all p-6 flex flex-col min-h-[300px]"
        >
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <span className="font-label-caps text-on-surface-variant">LATENCY OVER TIME</span>
              <h3 className="font-headline-sm text-on-surface mt-1">Inference Latency (Last 24h)</h3>
            </div>
            <div className="text-right">
              <span className="block font-code-md text-secondary">Avg: 42ms (BERT)</span>
              <span className="block font-code-md text-tertiary">Avg: 185ms (LLM)</span>
            </div>
          </div>
          <div className="h-[300px] relative border-l border-b border-outline-variant/50">
            <ResponsiveLine
              data={lineData}
              margin={{ top: 20, right: 20, bottom: 30, left: 50 }}
              xScale={{ type: 'point' }}
              yScale={{
                type: 'linear',
                min: 'auto',
                max: 'auto',
                stacked: false,
                reverse: false
              }}
              yFormat=" >-.2f"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
              }}
              pointSize={10}
              pointColor={{ theme: 'background' }}
              pointBorderWidth={2}
              pointBorderColor={{ from: 'serieColor' }}
              pointLabel="y"
              pointLabelYOffset={-12}
              useMesh={true}
              colors={{ datum: 'color' }}
              theme={{
                text: { fill: '#909097' },
                grid: { line: { stroke: '#45464d', strokeDasharray: '4 4' } },
                axis: { ticks: { text: { fontFamily: 'JetBrains Mono', fontSize: 11 } } },
                tooltip: { container: { background: '#1c2b3c', color: '#d4e4fa', borderRadius: '4px', border: '1px solid #45464d', fontSize: 13 } }
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
