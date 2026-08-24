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
            await api.post('https://taskflow-vio5.onrender.com/api/Auth/register', { email, password });
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
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Hesap Oluştur</h2>

                {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>

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

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Şifre Tekrar</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-md bg-green-600 py-2 text-white hover:bg-green-700 font-medium disabled:bg-green-400"
                    >
                        {loading ? 'Bekleyin...' : 'Kayıt Ol'}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-600">
                    Zaten hesabınız var mı?{' '}
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">
                        Giriş Yapın
                    </Link>
                </div>
            </div>
        </div>
    );
}