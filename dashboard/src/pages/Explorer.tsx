import { useState } from 'react';
import Papa from 'papaparse';
import { useLogs } from '../context/LogContext';

export default function Explorer() {
  const { results } = useLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const filteredResults = results.filter(r => {
    const matchesSearch = searchTerm === '' || 
      (r.raw_log || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = levelFilter === 'all' || 
      (r.classification.log_level || '').toLowerCase() === levelFilter.toLowerCase();

    return matchesSearch && matchesLevel;
  });

  const handleDownload = () => {
    if (filteredResults.length === 0) return;
    const csvData = Papa.unparse(filteredResults.map(r => ({
      raw_log: r.raw_log,
      log_level: r.classification.log_level,
      engine: r.classification.engine,
      confidence_score: r.classification.confidence_score
    })));
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'log_classification_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Controls & Filters Bar */}
      <section className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-outline-variant bg-surface-container-low shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">filter_alt</span>
            <span className="font-label-caps text-on-surface-variant uppercase">Filters</span>
          </div>
          <div className="w-px h-4 bg-outline-variant"></div>
          
          {/* Filter: Search */}
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">search</span>
            <input 
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded pl-8 pr-3 py-1.5 font-body-sm text-on-surface hover:border-outline focus:outline-none focus:border-tertiary"
            />
          </div>

          {/* Filter: Label */}
          <div className="relative group">
            <select 
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="appearance-none bg-surface-container border border-outline-variant rounded pl-3 pr-8 py-1.5 font-body-sm text-on-surface hover:border-outline focus:outline-none focus:border-tertiary cursor-pointer"
            >
              <option value="all">Classification: All</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="font-code-sm text-on-surface-variant">Showing {filteredResults.length} records</span>
          <button 
            onClick={handleDownload}
            className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-body-sm"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            CSV
          </button>
        </div>
      </section>

      {/* Data Table Widget */}
      <section className="flex-1 rounded-lg border border-outline-variant bg-surface-dim overflow-hidden flex flex-col shadow-sm min-h-0">
        <div className="grid grid-cols-[1fr_150px_180px_120px_60px] gap-6 px-4 py-2 bg-surface-container-high border-b border-outline-variant items-center shrink-0">
          <div className="font-label-caps text-on-surface-variant uppercase tracking-wider">Raw Message</div>
          <div className="font-label-caps text-on-surface-variant uppercase tracking-wider">Classification</div>
          <div className="font-label-caps text-on-surface-variant uppercase tracking-wider">Model</div>
          <div className="font-label-caps text-on-surface-variant uppercase tracking-wider">Confidence</div>
          <div className="font-label-caps text-on-surface-variant uppercase tracking-wider text-right">Action</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface-dim">
          {filteredResults.length > 0 ? filteredResults.map((r, i) => {
            const lvl = r.classification.log_level || 'UNKNOWN';
            
            // Map colors matching the Stitch CSS definitions
            let lvlBadge = "bg-surface-variant text-on-surface-variant";
            let rowBg = "bg-surface-container hover:bg-surface-variant/50";
            
            if (lvl === 'INFO') {
              lvlBadge = "bg-primary-container/40 text-primary border border-primary/30";
              rowBg = "bg-surface-container-low hover:bg-surface-variant/50";
            } else if (lvl === 'DEBUG') {
              lvlBadge = "bg-surface-variant text-on-surface-variant border border-outline-variant/50";
              rowBg = "bg-surface-container-low hover:bg-surface-variant/50";
            } else if (lvl === 'WARNING') {
              lvlBadge = "bg-secondary-container/20 text-secondary border border-secondary/30";
              rowBg = "bg-surface-container hover:bg-surface-variant/50";
            } else if (lvl === 'ERROR') {
              lvlBadge = "bg-error-container/20 text-error border border-error/30";
              rowBg = "bg-surface-container-low hover:bg-surface-variant/50";
            } else if (lvl === 'CRITICAL') {
              lvlBadge = "bg-error-container/40 text-error border border-error/50 font-bold";
              rowBg = "bg-surface-container hover:bg-surface-variant/50";
            }

            const isRegex = r.classification.engine.includes('Regex');
            const conf = ((r.classification.confidence_score || 0) * 100).toFixed(0);

            return (
              <div key={i} className={`grid grid-cols-[1fr_150px_180px_120px_60px] gap-6 px-4 py-3 border-b border-outline-variant/30 items-center transition-colors group ${rowBg}`}>
                <div className="font-code-md text-on-surface truncate" title={r.raw_log}>
                  {r.raw_log}
                </div>
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded font-label-caps uppercase ${lvlBadge}`}>
                    {lvl}
                  </span>
                </div>
                <div className="font-body-sm text-on-surface-variant">{r.classification.engine}</div>
                <div className={`flex items-center gap-2 ${isRegex ? 'opacity-70' : ''}`}>
                  {isRegex ? (
                    <span className="font-code-sm text-outline tracking-wider font-bold">N/A</span>
                  ) : (
                    <>
                      <div className="flex-1 h-1 bg-surface-variant rounded-full overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${conf}%` }}></div>
                      </div>
                      <span className="font-code-sm text-secondary">{conf}%</span>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <button className="text-on-surface-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
               <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">search_off</span>
               <p>No records found matching your filters.</p>
            </div>
          )}
        </div>
        
        {/* Table Footer */}
        <div className="bg-surface-container-high border-t border-outline-variant px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-body-sm text-on-surface-variant">Rows per page:</span>
            <select className="bg-transparent border-none text-on-surface font-code-sm focus:ring-0 cursor-pointer">
              <option>50</option>
              <option>100</option>
              <option>500</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-body-sm text-on-surface-variant">1-{Math.min(50, filteredResults.length)} of {filteredResults.length}</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-surface-variant text-on-surface-variant disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button className="p-1 rounded hover:bg-surface-variant text-on-surface" disabled={filteredResults.length <= 50}>
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
