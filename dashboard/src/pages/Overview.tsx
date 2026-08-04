import { useMemo } from 'react';
import { useLogs } from '../context/LogContext';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { motion } from 'framer-motion';

export default function Overview() {
  const { results, error } = useLogs();

  const totalLogs = results.length;
  const criticalLogs = results.filter(r => r.classification.log_level === 'CRITICAL' || r.classification.log_level === 'ERROR').length;
  const llmLogs = results.filter(r => r.classification.engine.includes('LLM')).length;
  
  const classificationRate = totalLogs > 0 ? (((totalLogs - llmLogs) / totalLogs) * 100).toFixed(1) : "0.0";
  
  // Calculate average confidence
  let avgConfidence = 0;
  if (totalLogs > 0) {
    avgConfidence = results.reduce((acc, r) => acc + (r.classification.confidence_score || 0), 0) / totalLogs;
  }

  // Derived data for Bar Chart (Logs by Category)
  const severityData = useMemo(() => {
    const counts: Record<string, number> = { INFO: 0, DEBUG: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 };
    results.forEach(r => {
      const level = r.classification.log_level || 'UNKNOWN';
      if (counts[level] !== undefined) counts[level]++;
      else counts[level] = 1;
    });
    
    const colors: Record<string, string> = {
      INFO: '#2DD4BF', DEBUG: '#6366F1', WARNING: '#F59E0B', ERROR: '#EF4444', CRITICAL: '#45464d'
    };

    return Object.entries(counts).filter(([_, v]) => v > 0).map(([id, value]) => ({
      id,
      label: id,
      value,
      color: colors[id] || '#94a3b8'
    }));
  }, [results]);

  // Derived data for Pie Chart (Model Delegation)
  const engineData = useMemo(() => {
    const counts = { Regex: 0, BERT: 0, LLM: 0 };
    results.forEach(r => {
      const engine = r.classification.engine || '';
      if (engine.includes('Regex')) counts.Regex++;
      else if (engine.includes('BERT')) counts.BERT++;
      else if (engine.includes('LLM')) counts.LLM++;
    });
    
    return [
      { id: 'Regex', label: 'Regex', value: counts.Regex, color: '#44e2cd' },
      { id: 'BERT', label: 'BERT', value: counts.BERT, color: '#2DD4BF' },
      { id: 'LLM', label: 'LLM', value: counts.LLM, color: '#6366F1' }
    ].filter(d => d.value > 0);
  }, [results]);

  const recentAnomalies = useMemo(() => {
    return [...results]
      .filter(r => r.classification.log_level === 'CRITICAL' || r.classification.log_level === 'ERROR')
      .slice(0, 5);
  }, [results]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-full">
        <div className="bg-error-container/20 border border-error/30 text-error p-6 rounded-lg max-w-lg text-center">
          <span className="material-symbols-outlined text-[48px] mb-4">error</span>
          <h2 className="font-headline-sm mb-2">Analysis Failed</h2>
          <p className="font-body-md">{error}</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center h-full opacity-60">
        <span className="material-symbols-outlined text-[64px] mb-4 text-on-surface-variant">monitoring</span>
        <h2 className="font-headline-sm mb-2 text-on-surface">No Data Loaded</h2>
        <p className="font-body-md text-on-surface-variant">Please ingest a log file using the sidebar button to begin analysis.</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-grid-gutter"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-grid-gutter">
        {/* Metric 1 */}
        <motion.div variants={itemVariants} className="bg-[#1E293B] border border-[#334155] rounded-lg flex flex-col justify-between hover:border-outline-variant transition-colors relative group p-6">
          <div className="absolute inset-0 bg-[#6366F1] opacity-0 group-hover:opacity-5 rounded-lg transition-opacity"></div>
          <div>
            <h3 className="font-label-caps text-on-surface-variant mb-2 tracking-wider uppercase">Total Logs Processed</h3>
            <div className="font-display-lg text-on-surface">{totalLogs.toLocaleString()}</div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-secondary">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span className="font-code-sm">+100% (Upload)</span>
          </div>
        </motion.div>

        {/* Metric 2 */}
        <motion.div variants={itemVariants} className="bg-[#1E293B] border border-[#334155] rounded-lg flex flex-col justify-between hover:border-outline-variant transition-colors relative group p-6">
          <div className="absolute inset-0 bg-[#6366F1] opacity-0 group-hover:opacity-5 rounded-lg transition-opacity"></div>
          <div>
            <h3 className="font-label-caps text-on-surface-variant mb-2 tracking-wider uppercase">Classification Rate</h3>
            <div className="font-display-lg text-on-surface">{classificationRate}%</div>
          </div>
          <div className="mt-4 w-full h-1 bg-surface-variant rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${classificationRate}%` }} 
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-secondary"
            />
          </div>
          <div className="mt-2 text-right font-code-sm text-on-surface-variant">Fast Path (Non-LLM)</div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div variants={itemVariants} className="bg-[#1E293B] border border-[#334155] rounded-lg flex flex-col justify-between hover:border-outline-variant transition-colors relative group p-6">
          <div className="absolute inset-0 bg-[#6366F1] opacity-0 group-hover:opacity-5 rounded-lg transition-opacity"></div>
          <div>
            <h3 className="font-label-caps text-on-surface-variant mb-2 tracking-wider uppercase">Model Confidence (AVG)</h3>
            <div className="font-display-lg text-[#c0c1ff]">{avgConfidence.toFixed(3)}</div>
          </div>
          <div className="mt-4 w-full h-1 bg-surface-variant rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${avgConfidence * 100}%` }} 
              transition={{ duration: 1, delay: 0.6 }}
              className="h-full bg-[#6366F1]"
            />
          </div>
        </motion.div>

        {/* Metric 4 */}
        <motion.div variants={itemVariants} className="bg-[#1E293B] border border-[#334155] rounded-lg flex flex-col justify-between hover:border-outline-variant transition-colors relative group p-6">
          <div className="absolute inset-0 bg-[#6366F1] opacity-0 group-hover:opacity-5 rounded-lg transition-opacity"></div>
          <div>
            <h3 className="font-label-caps text-on-surface-variant mb-2 tracking-wider uppercase">Critical Anomalies</h3>
            <div className="font-display-lg text-error flex items-baseline gap-1">
              {criticalLogs}
            </div>
          </div>
          <div className="mt-4 h-8 flex items-end gap-1 opacity-70">
            <motion.div initial={{ height: 0 }} animate={{ height: '33%' }} transition={{ duration: 0.5, delay: 0.2 }} className="w-1/6 bg-surface-variant rounded-t"></motion.div>
            <motion.div initial={{ height: 0 }} animate={{ height: '50%' }} transition={{ duration: 0.5, delay: 0.3 }} className="w-1/6 bg-surface-variant rounded-t"></motion.div>
            <motion.div initial={{ height: 0 }} animate={{ height: '100%' }} transition={{ duration: 0.5, delay: 0.4 }} className="w-1/6 bg-surface-variant rounded-t"></motion.div>
            <motion.div initial={{ height: 0 }} animate={{ height: '25%' }} transition={{ duration: 0.5, delay: 0.5 }} className="w-1/6 bg-error rounded-t"></motion.div>
            <motion.div initial={{ height: 0 }} animate={{ height: '33%' }} transition={{ duration: 0.5, delay: 0.6 }} className="w-1/6 bg-surface-variant rounded-t"></motion.div>
            <motion.div initial={{ height: 0 }} animate={{ height: '50%' }} transition={{ duration: 0.5, delay: 0.7 }} className="w-1/6 bg-surface-variant rounded-t"></motion.div>
          </div>
        </motion.div>
      </div>

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-grid-gutter h-[400px]">
        {/* Bar Chart: Logs by Category (Span 2) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-[#1E293B] border border-[#334155] rounded-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-sm font-bold text-on-surface">Logs by Category</h3>
          </div>
          <div className="flex-1 min-h-0 w-full relative">
            <ResponsiveBar
              data={severityData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
              padding={0.4}
              colors={{ datum: 'data.color' }}
              borderRadius={4}
              animate={true}
              motionConfig="slow"
              theme={{
                grid: { line: { stroke: '#334155', strokeDasharray: '4 4' } },
                axis: {
                  ticks: { text: { fill: '#909097', fontSize: 11, fontFamily: 'JetBrains Mono' } }
                },
                tooltip: { container: { background: '#1c2b3c', color: '#d4e4fa', borderRadius: '4px', border: '1px solid #45464d', fontSize: 13 } }
              }}
              enableGridY={true}
              enableLabel={false}
              axisBottom={{ tickSize: 0, tickPadding: 16 }}
              axisLeft={{ tickSize: 0, tickPadding: 10, tickValues: 4 }}
            />
          </div>
        </motion.div>

        {/* Donut Chart: Model Delegation (Span 1) */}
        <motion.div variants={itemVariants} className="lg:col-span-1 bg-[#1E293B] border border-[#334155] rounded-lg p-6 flex flex-col relative">
          <h3 className="font-headline-sm font-bold text-on-surface mb-6">Model Delegation</h3>
          <div className="flex-1 min-h-0 w-full relative">
            <ResponsivePie
              data={engineData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              innerRadius={0.65}
              padAngle={2}
              cornerRadius={4}
              activeOuterRadiusOffset={8}
              colors={{ datum: 'data.color' }}
              enableArcLinkLabels={false}
              arcLabel={e => String(e.value)}
              arcLabelsTextColor="#051424"
              animate={true}
              motionConfig="slow"
              theme={{
                labels: { text: { fontSize: 12, fontWeight: 700, fontFamily: 'Inter' } },
                tooltip: { container: { background: '#1c2b3c', color: '#d4e4fa', borderRadius: '4px', border: '1px solid #45464d' } }
              }}
            />
            {/* Center Text */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            >
              <span className="font-display-lg text-on-surface">{(classificationRate)}%</span>
              <span className="font-label-caps text-secondary">FAST PATH</span>
            </motion.div>
          </div>
          
          <div className="w-full mt-4 flex justify-center gap-4 font-code-sm">
            {engineData.map(d => (
              <div key={d.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }}></div>
                <span className="text-on-surface-variant">{d.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Anomalies Table */}
      <motion.div variants={itemVariants} className="bg-[#1E293B] border border-[#334155] rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#334155] flex justify-between items-center bg-[#161E2E]">
          <div>
            <h3 className="font-label-caps text-on-surface-variant tracking-wider">RECENT ANOMALIES</h3>
            <p className="font-body-sm text-on-surface mt-1">High-confidence structural deviations detected in stream.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="font-code-sm text-outline bg-[#0F172A] border-b border-[#334155]">
                <th className="py-2 px-4 font-normal w-24">SEVERITY</th>
                <th className="py-2 px-4 font-normal">MESSAGE PREVIEW</th>
                <th className="py-2 px-4 font-normal w-32">MODEL CONF</th>
                <th className="py-2 px-4 font-normal w-24 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="font-code-md text-on-surface">
              {recentAnomalies.length > 0 ? recentAnomalies.map((r, i) => {
                const lvl = r.classification.log_level || 'UNKNOWN';
                let lvlBadge = "bg-surface-variant text-on-surface-variant";
                if (lvl === 'INFO') lvlBadge = "bg-[#2DD4BF]/15 text-[#2DD4BF]";
                if (lvl === 'DEBUG') lvlBadge = "bg-[#6366F1]/15 text-[#6366F1]";
                if (lvl === 'WARNING') lvlBadge = "bg-[#F59E0B]/15 text-[#F59E0B]";
                if (lvl === 'ERROR') lvlBadge = "bg-[#EF4444]/15 text-[#EF4444]";
                if (lvl === 'CRITICAL') lvlBadge = "bg-[#EF4444]/25 text-[#EF4444] font-bold";

                const isRegex = r.classification.engine.includes('Regex');
                const conf = ((r.classification.confidence_score || 0) * 100).toFixed(0);

                return (
                  <tr key={i} className="bg-[#161E2E] border-b border-[#334155]/50 hover:bg-[#1E293B] transition-colors h-[40px]">
                    <td className="py-2 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${lvlBadge}`}>{lvl}</span>
                    </td>
                    <td className="py-2 px-4 font-code-md truncate max-w-md">
                      <span className="text-on-surface truncate block" title={r.raw_log}>{r.raw_log}</span>
                    </td>
                    <td className="py-2 px-4 flex items-center gap-2 h-[40px]">
                      {isRegex ? (
                        <span className="font-code-sm text-outline tracking-wider font-bold">N/A</span>
                      ) : (
                        <>
                          <div className="w-16 h-[4px] bg-surface-variant rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${conf}%` }}
                              transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                              className="h-full bg-[#6366F1]" 
                            />
                          </div>
                          <span className="text-[11px] text-on-surface-variant">{conf}%</span>
                        </>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant hover:text-secondary cursor-pointer">open_in_new</span>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-on-surface-variant">No anomalies detected.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
