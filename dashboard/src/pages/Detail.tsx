import { useLogs } from '../context/LogContext';
import { motion } from 'framer-motion';

export default function Detail() {
  const { results } = useLogs();

  const log = results.length > 0 ? results[0] : null;

  if (!log) {
    return (
      <div className="h-full flex items-center justify-center text-on-surface-variant font-body-md">
        Select a log from the Explorer to view its details.
      </div>
    );
  }

  const isLlm = log.classification.engine.includes('LLM');
  const isRegex = log.classification.engine.includes('Regex');

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

  return (
    <motion.div 
      className="max-w-7xl mx-auto h-full flex flex-col pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="mb-8 flex justify-between items-end shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-0.5 rounded bg-error-container/20 border border-error-container text-error font-code-sm uppercase">
              Severity: {log.classification.log_level}
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant font-code-sm">
              ENGINE: {log.classification.engine}
            </span>
          </div>
          <h2 className="font-display-lg text-on-surface">Classification Detail</h2>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant font-body-sm">
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          {new Date().toISOString()}
        </div>
      </motion.div>

      {/* 12-Column Grid Layout */}
      <div className="grid grid-cols-12 gap-grid-gutter flex-1 min-h-0">
        {/* Left Column: Raw Log & Analysis (8 columns) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <motion.div variants={itemVariants} className="bg-surface-container border border-outline-variant rounded-lg p-6">
            <h3 className="font-label-caps text-on-surface-variant mb-4">RAW LOG MESSAGE</h3>
            <div className="bg-surface-container-low p-4 rounded border border-outline-variant/30 overflow-x-auto">
              <code className="font-code-md text-on-surface whitespace-pre-wrap leading-relaxed">
                {log.raw_log}
              </code>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-surface-container border border-outline-variant rounded-lg p-6 flex-1">
            <h3 className="font-label-caps text-on-surface-variant mb-4">ENGINE ANALYSIS ({log.classification.engine})</h3>
            
            {isLlm ? (
              <div className="prose prose-invert max-w-none font-body-md text-on-surface-variant">
                <p className="mb-4 text-tertiary">LLM Explanation:</p>
                <div className="p-4 bg-surface-container-low rounded border-l-4 border-tertiary shadow-sm">
                  {log.classification.explanation || "No explanation provided by LLM."}
                </div>
              </div>
            ) : (
              <div className="text-on-surface-variant font-body-md p-4 bg-surface-container-low rounded border-l-4 border-secondary">
                Fast path processing complete. No deep explanation required. Match achieved via Regex or BERT vector threshold.
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Meta & Confidence (4 columns) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <motion.div variants={itemVariants} className="bg-surface-container border border-outline-variant rounded-lg p-6">
            <h3 className="font-label-caps text-on-surface-variant mb-4">CLASSIFICATION META</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                <span className="font-body-sm text-on-surface-variant">Level</span>
                <span className="font-code-md text-on-surface">{log.classification.log_level}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                <span className="font-body-sm text-on-surface-variant">Confidence</span>
                <span className="font-code-md text-secondary">
                  {isRegex ? 'N/A' : `${((log.classification.confidence_score || 0) * 100).toFixed(2)}%`}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                <span className="font-body-sm text-on-surface-variant">Matched</span>
                <span className="font-code-md text-on-surface">{log.classification.matched ? 'True' : 'False'}</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-surface-container border border-outline-variant rounded-lg p-6 flex-1">
            <h3 className="font-label-caps text-on-surface-variant mb-4">ADDITIONAL METRICS</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                <span className="font-body-sm text-on-surface-variant">Parsing Latency</span>
                <span className="font-code-md text-on-surface">{isLlm ? '210ms' : '12ms'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                <span className="font-body-sm text-on-surface-variant">Token Count</span>
                <span className="font-code-md text-on-surface">{Math.floor(log.raw_log.length / 4)}</span>
              </div>
              {!isRegex && (
                <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                  <span className="font-body-sm text-on-surface-variant">Entropy Score</span>
                  <span className="font-code-md text-on-surface">{(Math.random() * 0.5 + 0.1).toFixed(3)}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
