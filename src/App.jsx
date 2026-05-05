import { Routes, Route } from 'react-router-dom';
import KidView from './routes/KidView.jsx';
import AdminView from './routes/AdminView.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<KidView />} />
      <Route path="/admin" element={<AdminView />} />
    </Routes>
  );
}
