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
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">TaskFlow</h2>

                {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Şifre</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 transition-colors font-medium"
                    >
                        Giriş Yap
                    </button>
                </form>
                <div className="mt-4 text-center text-sm text-gray-600">
                    Hesabınız yok mu?{' '}
                    <Link to="/register" className="text-blue-600 hover:underline font-medium">
                        Kayıt Olun
                    </Link>
                </div>
            </div>
        </div>
    );
}