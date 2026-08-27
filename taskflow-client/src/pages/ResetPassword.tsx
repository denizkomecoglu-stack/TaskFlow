import { useState, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance'; // Axios iletişim istasyonumuz
import axios from 'axios';

export default function ResetPassword() {
    // 1. KURAL: Tüm Hook'lar en tepede
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 2. KURAL: Erken Çıkış (Early Return) Hook'lardan sonra
    if (!token) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Geçersiz Bağlantı</h2>
                    <p className="text-gray-600">Lütfen e-postanızdaki şifre sıfırlama linkine tekrar tıklayın veya yeni bir link talep edin.</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            // Fetch yerine Axios kullanıyoruz, URL'i otomatik tamamlıyor
            const response = await api.post('/Auth/reset-password', {
                token,
                newPassword
            });

            setIsSuccess(true);
            setMessage(response.data.mesaj || 'Şifreniz başarıyla güncellendi! Giriş sayfasına yönlendiriliyorsunuz...');

            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error) {
            console.error("İstek sırasında hata oluştu", error);
            setIsSuccess(false);

            // Hata mesajını düzgünce yakalıyoruz (Çökme engellendi)
            if (axios.isAxiosError(error) && error.response) {
                // Eğer backend nesne döndüyse .mesaj, düz metin döndüyse direkt data'yı al
                const errorMessage = error.response.data.mesaj || error.response.data;
                setMessage(typeof errorMessage === 'string' ? errorMessage : 'Bağlantı geçersiz veya süresi dolmuş.');
            } else {
                setMessage('Sunucuya bağlanırken bir hata oluştu.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
                <h2 className="mb-4 text-2xl font-bold text-gray-800">Yeni Şifre Belirle</h2>
                <p className="mb-6 text-sm text-gray-600">
                    Lütfen yeni şifrenizi girin.
                </p>

                {message && (
                    <div className={`mb-4 rounded-md p-3 text-sm border ${isSuccess ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <input
                            type="password"
                            placeholder="Yeni Şifreniz"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || isSuccess}
                        className="w-full rounded-md bg-green-600 py-2 text-white hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Güncelleniyor...' : isSuccess ? 'Yönlendiriliyor...' : 'Şifreyi Kaydet'}
                    </button>
                </form>
            </div>
        </div>
    );
}