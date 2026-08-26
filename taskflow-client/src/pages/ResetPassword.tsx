import { useState, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
    //urldeki tokenı yakalıyoruz
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    //eğer linkte token yoksa (kullanıcı sayfaya elle girdiyse) formu hiç göstermiyoruz
    if (!token) {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px', color: '#dc2626' }}>
                <h2>Geçersiz Bağlantı</h2>
                <p>Lütfen e-postanızdaki şifre sıfırlama linkine tekrar tıklayın.</p>
            </div>
        );
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('https://taskflow-vio5.onrender.com/api/Auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setIsSuccess(true);
                setMessage('Şifreniz başarıylaa güncellendi! Giriş sayfasına yönlendiriliyorsunuz...');
                //3 saniye sonra kullanıcıyı logine atıyoruz
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setMessage(data.mesaj || 'Bir hata oluştu. Linkin süresi dolmuş olabilir.');
            }
        } catch (error) {
            console.error("İstek sırasında hata oluştu", error);
            setMessage('Sunucuya bağlanırken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h2>Yeni Şifre Belirle</h2>
            <p style={{ color: '#555', marginBottom: '20px' }}>
                Lütfen yeni şifrenizi girin
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                    type="password"
                    placeholder="Yeni Şifreniz"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
                />

                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        padding: '10px',
                        fontSize: '16px',
                        backgroundColor: isLoading ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isLoading ? 'Güncelleniyor...' : isSuccess ? 'Yönlendiriliyor...' : 'Şifreyi Kaydet'}
                </button>
            </form>

            {message && (
                <div style={{ marginTop: '20px', padding: '10px', backgroundColor: message.includes('başarıyla') ? '#065f46' : '#991b1b', borderRadius: '5px' }}>
                </div>
            )}
        </div>
    );
};

export default ResetPassword;