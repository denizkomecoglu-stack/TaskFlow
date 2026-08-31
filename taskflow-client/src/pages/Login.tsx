import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import axios from 'axios';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            // api (axiosInstance) kullandığımız için baseURL zaten ayarlıdır, 
            // sadece '/Auth/login' yazmamız yeterli. (Eğer hata verirse eski uzun URL'yi koyabilirsin)
            await api.post('/Auth/login', { email, password });
            localStorage.setItem('isAuthenticated', 'true');

            const redirectUrl = localStorage.getItem('redirectAfterLogin');
            if (redirectUrl) {
                localStorage.removeItem('redirectAfterLogin');
                navigate(redirectUrl);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Giriş hatası:', err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data || 'Giriş başarısız. Bilgilerinizi kontrol edin.');
            } else {
                setError('Beklenmeyen bir hata oluştu.');
            }
        }
    };

    return (
        <div className="relative flex h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-800 to-slate-900 overflow-hidden font-sans">

            {/* Arka Plan Dekoratif Işık Efektleri (Blur) */}
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>

            {/* Giriş Kartı */}
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-white/10">
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        TaskFlow
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 font-medium">Çalışma alanınıza giriş yapın</p>
                </div>

                {error && (
                    <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 shadow-sm">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@gmail.com"
                            className="w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="block text-sm font-semibold text-gray-700">Şifre</label>
                            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                                Şifremi unuttum
                            </Link>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all"
                    >
                        Giriş Yap
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-600">
                    Hesabınız yok mu?{' '}
                    <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                        Ücretsiz Kayıt Olun
                    </Link>
                </div>
            </div>
        </div>
    );
}