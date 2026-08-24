import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BoardDetail from './pages/BoardDetail';
import JoinBoard from './pages/JoinBoard';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/board/:id" element={<BoardDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/join/:id" element={<JoinBoard />} />

                {/* Kullanıcı rastgele bir adres girerse, mantıksal olarak onu Login sayfasına yönlendir (Catch-all) */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;