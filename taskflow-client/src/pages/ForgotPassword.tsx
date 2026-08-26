import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosInstance'; // 1. Standart İletişim İstasyonumuz
import axios from 'axios';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            // 2. Fetch yerine Axios kullanıyoruz. Adresi otomatik alacak.
            const response = await api.post('/Auth/forgot-password', { email });

            // Backend'den dönen "Mesaj" alanını yakalıyoruz
            setMessage(response.data.mesaj || 'Sıfırlama bağlantısı gönderildi.');

        } catch (err) {
            console.error("İstek sırasında hata oluştu:", err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data || 'Sunucuya bağlanırken bir hata oluştu.');
            } else {
                setError('Beklenmeyen bir sistem hatası oluştu.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Inline-style yerine Tailwind CSS kullanıyoruz (Login ekranıyla birebir uyumlu)
    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
                <h2 className="mb-4 text-2xl font-bold text-gray-800">Şifremi Unuttum</h2>
                <p className="mb-6 text-sm text-gray-600">
                    Hesabınıza kayıtlı e-posta adresini girin. Size şifrenizi sıfırlamanız için bir bağlantı göndereceğiz.
                </p>

                {/* Başarı Mesajı */}
                {message && (
                    <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200">
                        {message}
                    </div>
                )}

                {/* Hata Mesajı */}
                {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <input
                            type="email"
                            placeholder="E-posta adresiniz"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                    </button>
                </form>

                <div className="mt-6 text-sm text-gray-600">
                    <Link to="/login" className="text-blue-600 hover:underline font-medium">
                        &larr; Giriş sayfasına dön
                    </Link>
                </div>
            </div>
        </div>
    );
}