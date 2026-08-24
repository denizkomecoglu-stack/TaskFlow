import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import axios from 'axios';

export default function JoinBoard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Panoya katılım isteğiniz işleniyor...');

    // Çift isteği engellemek için bayrak (flag)
    const hasJoined = useRef(false);

    useEffect(() => {
        if (hasJoined.current) return; // Zaten çalıştıysa durdur

        const joinBoard = async () => {
            hasJoined.current = true;

            const isAuthenticated = localStorage.getItem('isAuthenticated');

            if (!isAuthenticated) {
                setStatus('error');
                setMessage('Daveti kabul etmek için giriş yapmalısınız. Giriş ekranına yönlendiriliyorsunuz...');
                localStorage.setItem('redirectAfterLogin', `/join/${id}`);
                setTimeout(() => navigate('/login'), 2500);
                return;
            }

            try {
                await api.post(`/Boards/${id}/join`);
                setStatus('success');
                setMessage('Panoya başarıyla katıldınız! Yönlendiriliyorsunuz...');
                setTimeout(() => navigate(`/board/${id}`), 2000);
            } catch (error) {
                if (axios.isAxiosError(error) && error.response) {
                    const errorMsg = error.response.data.mesaj || error.response.data;

                    if (error.response.status === 401) {
                        setStatus('error');
                        setMessage('Oturum süreniz dolmuş. Giriş ekranına yönlendiriliyorsunuz...');
                        setTimeout(() => navigate('/login'), 2500);
                    }
                    else if (error.response.status === 400 && typeof errorMsg === 'string' && (errorMsg.toLowerCase().includes('zaten'))) {
                        setStatus('success');
                        setMessage('Panoya katılıyorsunuz...');
                        setTimeout(() => navigate(`/board/${id}`), 2000);
                    } else {
                        setStatus('error');
                        setMessage(typeof errorMsg === 'string' ? errorMsg : 'Bir hata oluştu.');
                    }
                } else {
                    setStatus('error');
                    setMessage('Sunucu ile iletişim kurulamadı.');
                }
            }
        };

        // İŞTE EKSİK OLAN SATIR BURASIYDI: Fonksiyonu çağırıyoruz!
        if (id) {
            joinBoard();
        }
    }, [id, navigate]);

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl border-t-4 border-blue-600">
                <h2 className="mb-6 text-2xl font-bold text-gray-800">Davet Onayı</h2>

                {status === 'loading' && (
                    <div className="text-blue-600 font-medium animate-pulse text-lg">{message}</div>
                )}

                {status === 'success' && (
                    <div className="text-green-600 font-medium text-lg">
                        <span className="block text-4xl mb-2">✓</span>
                        {message}
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <div className="text-red-500 font-medium mb-6 text-lg">
                            <span className="block text-4xl mb-2">✕</span>
                            {message}
                        </div>
                        <Link to="/login" className="rounded bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 transition shadow-sm">
                            Giriş Yap / Panolarıma Dön
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}