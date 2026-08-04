import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LogProvider } from './context/LogContext';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Explorer from './pages/Explorer';
import Performance from './pages/Performance';
import Detail from './pages/Detail';

function App() {
  return (
    <LogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="explorer" element={<Explorer />} />
            <Route path="performance" element={<Performance />} />
            <Route path="detail" element={<Detail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LogProvider>
  );
}

export default App;
