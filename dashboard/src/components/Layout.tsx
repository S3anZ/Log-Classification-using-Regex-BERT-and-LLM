import { useRef } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useLogs } from '../context/LogContext';

export default function Layout() {
  const { results, setResults, setLoading, setError, loading } = useLogs();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    if (results.length === 0) return alert('No data to export.');
    const csvData = Papa.unparse(results.map(r => ({
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

  const handleExportExcel = () => {
    if (results.length === 0) return alert('No data to export.');
    const data = results.map(r => ({
      raw_log: r.raw_log,
      log_level: r.classification.log_level,
      engine: r.classification.engine,
      confidence_score: r.classification.confidence_score
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");
    XLSX.writeFile(wb, "log_classification_export.xlsx");
  };

  const handleExportPDF = () => {
    alert('PDF Export is coming soon! Please use CSV or Excel.');
  };

  const processLogsAndCallApi = async (data: any[]) => {
    if (data.length === 0) {
      setError('The file is empty.');
      setLoading(false);
      return;
    }

    const firstRow = data[0];
    const logCol = firstRow['raw_log_message'] !== undefined ? 'raw_log_message' : 
                   (firstRow['log'] !== undefined ? 'log' : 
                   (firstRow['message'] !== undefined ? 'message' : Object.keys(firstRow)[0]));
    
    const logs = data.map(row => row[logCol]).filter(log => log && String(log).trim() !== '');

    try {
      const response = await fetch('http://localhost:8000/api/v1/classify/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log_messages: logs })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const apiResult = await response.json();
      setResults(apiResult.data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the FastAPI server.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (file.name.endsWith('.pdf')) {
      setError('PDF OCR parsing is currently in beta. Please use CSV or Excel.');
      return;
    }

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setError('Please upload a valid CSV or Excel file.');
      return;
    }

    setError(null);
    setLoading(true);

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (parseResult) => {
          processLogsAndCallApi(parseResult.data as any[]);
        },
        error: (err) => {
          setError(err.message);
          setLoading(false);
        }
      });
    } else if (file.name.endsWith('.xlsx')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          processLogsAndCallApi(data);
        } catch (error) {
          setError('Failed to parse Excel file.');
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file.');
        setLoading(false);
      };
      reader.readAsBinaryString(file);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'flex items-center gap-3 px-3 py-2.5 rounded-md text-secondary bg-surface-container-high border-r-2 border-secondary scale-95 transition-transform duration-150 font-body-md font-semibold'
      : 'flex items-center gap-3 px-3 py-2.5 rounded-md text-on-surface-variant hover:bg-surface-variant transition-colors group font-body-md';

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".csv,.xlsx,.pdf"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />
      {/* TopAppBar */}
      <header className="fixed top-0 right-0 left-64 z-50 flex justify-between items-center px-container-padding h-16 bg-surface-dim border-b border-outline-variant flat no-shadows font-label-caps focus-within:ring-2 focus-within:ring-tertiary">
        <div className="flex items-center gap-6">
          <h1 className="font-headline-md font-extrabold text-on-surface">LogIntel BERT/LLM</h1>
          <nav className="hidden md:flex items-center space-x-6 relative group z-50">
            <button className="text-on-surface-variant hover:text-primary transition-opacity flex items-center gap-1 font-label-caps">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Logs
              <span className="material-symbols-outlined text-[18px] group-hover:rotate-180 transition-transform">arrow_drop_down</span>
            </button>
            <div className="absolute top-full -left-4 mt-4 w-48 bg-surface-container-high border border-outline-variant rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col overflow-hidden">
              <button onClick={handleExportCSV} className="text-left px-4 py-3 hover:bg-surface-variant text-on-surface-variant hover:text-primary font-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">data_table</span> Export as CSV
              </button>
              <button onClick={handleExportExcel} className="text-left px-4 py-3 hover:bg-surface-variant text-on-surface-variant hover:text-primary font-body-sm flex items-center gap-2 border-t border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px]">table_chart</span> Export as Excel
              </button>
              <button onClick={handleExportPDF} className="text-left px-4 py-3 hover:bg-surface-variant text-on-surface-variant hover:text-primary font-body-sm flex items-center gap-2 border-t border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> Export as PDF
              </button>
            </div>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined">dark_mode</span>
          </button>
          <div className="ml-2 w-8 h-8 rounded-full overflow-hidden border border-outline-variant flex-shrink-0">
            <img alt="Administrator Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjv1Bvmsr6TcxbRX1i1k4tbAcrfHkOX6OG_cPeHdRsVzT-SzEADFEWLXw3HAOVJUB5O01HyvnIfcs6gR48tJuRQ47VamYZRg0a2F2WHUoJH3PmBhLs1wR9aHW6mwrksXwis15STLRp3AECC2gr67DAMV-vUZcMozI2AIMYAHDh3P60PTcmqBK3P4XM43CNMvUS_frZqhCPCMfV9AsAglatRuCgGxFjASrlgWVntQo684pg5aDONWoa" />
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <nav className="fixed left-0 top-0 h-full flex flex-col w-64 bg-surface-container-lowest border-r border-outline-variant flat no-shadows font-body-md z-40">
        <div className="p-6 border-b border-outline-variant/30 flex flex-col gap-3">
          <div className="w-12 h-12 rounded bg-surface-variant flex items-center justify-center border border-outline-variant overflow-hidden">
            <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdpt-9e4tKfnukANqckaxSSaOcsKKviLmfwTiS9WRlwOlWwD5nwJnsdosxcVaze9_7aJ8O67r5Cly8ULx56ztuuCC_T-dP7W8a1vY0e7KIHM79rZ4RQmGAdf2vGU0zlN50NFs9bLMrxgHuIcQp9xD5an8QuEWaEPkbtHrz0pk6XH5ps0723GxIEdONPWTqiJNDjAxSwdKvvmSGnb0l5pigikItr5Tz7oAM5mDpiU_KF7nKF3am5quX" />
          </div>
          <div>
            <h2 className="font-headline-sm font-bold text-on-surface">BERT Analysis</h2>
            <p className="font-body-sm text-secondary">System Active</p>
          </div>
          <button 
            onClick={() => !loading && fileInputRef.current?.click()}
            className="mt-2 w-full py-2 px-4 rounded border border-[#334155] text-[#2DD4BF] hover:bg-surface-variant transition-colors font-label-caps flex items-center justify-center gap-2"
          >
            {loading ? <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">upload</span>}
            {loading ? 'INGESTING...' : 'INGEST LOGS'}
          </button>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            <li>
              <NavLink to="/" className={navLinkClass}>
                <span className="material-symbols-outlined group-hover:text-primary transition-colors">dashboard</span>
                <span>Overview</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/explorer" className={navLinkClass}>
                <span className="material-symbols-outlined group-hover:text-primary transition-colors">list_alt</span>
                <span>Explorer</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/performance" className={navLinkClass}>
                <span className="material-symbols-outlined group-hover:text-primary transition-colors">analytics</span>
                <span>Performance</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/detail" className={navLinkClass}>
                <span className="material-symbols-outlined group-hover:text-primary transition-colors">description</span>
                <span>Detail</span>
              </NavLink>
            </li>
          </ul>
        </div>


      </nav>

      {/* Main Content Canvas */}
      <main className="ml-64 mt-16 p-container-padding h-[calc(100vh-64px)] overflow-y-auto relative">
        <Outlet />
      </main>
    </>
  );
}
