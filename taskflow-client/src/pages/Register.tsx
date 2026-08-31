import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import axios from 'axios';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Şifreler birbiriyle eşleşmiyor.');
            return;
        }

        if (password.length < 6) {
            setError('Şifreniz en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);

        try {
            await api.post('/Auth/register', { username, email, password });
            navigate('/login');
        } catch (err) {
            console.error("Kayıt hatası:", err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data || 'Kayıt işlemi başarısız oldu.');
            } else {
                setError('Beklenmeyen bir hata oluştu.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-800 to-slate-900 overflow-hidden font-sans p-4">

            {/* Arka Plan Dekoratif Işık Efektleri (Blur) */}
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none"></div>

            {/* Kayıt Kartı */}
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border border-white/10">
                <div className="mb-6 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        TaskFlow
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 font-medium">Yeni bir hesap oluşturun</p>
                </div>

                {error && (
                    <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 shadow-sm">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Kullanıcı Adı</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Kullanıcı Adı"
                            className="w-full rounded-xl border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@gmail.com"
                            className="w-full rounded-xl border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Şifre</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="En az 6 karakter"
                            className="w-full rounded-xl border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Şifre Tekrar</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Şifrenizi doğrulayın"
                            className="w-full rounded-xl border border-gray-300 bg-gray-50 p-2.5 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`mt-4 w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg'
                            }`}
                    >
                        {loading ? 'Bekleyin...' : 'Kayıt Ol'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Zaten hesabınız var mı?{' '}
                    <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                        Giriş Yapın
                    </Link>
                </div>
            </div>
        </div>
    );
}