import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom'; // Giriş sayfasına geri dönmek için

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            
            const response = await fetch('https://taskflow-vio5.onrender.com/api/Auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            // Backend'den gelen cevabı yakalıyoruz
            const data = await response.json();
            setMessage(data.mesaj || 'Eğer sistemde böyle bir e-posta varsa, sıfırlama bağlantısı gönderilmiştir.');

        } catch (error) {
            console.error("İstek sırasında hata oluştu:", error);
            setMessage('Sunucuya bağlanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h2>Şifremi Unuttum</h2>
            <p style={{ color: '#555', marginBottom: '20px' }}>
                Hesabınıza kayıtlı e-posta adresini girin. Size şifrenizi sıfırlamanız için bir bağlantı göndereceğiz.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                    type="email"
                    placeholder="E-posta adresiniz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ccc' }}
                />

                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        padding: '10px',
                        fontSize: '16px',
                        backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isLoading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                </button>
            </form>

            {/* Mesaj Kutusu (Sadece message state'i doluysa görünür) */}
            {message && (
                <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '5px' }}>
                    {message}
                </div>
            )}

            <div style={{ marginTop: '20px' }}>
                <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>
                    &larr; Giriş sayfasına dön
                </Link>
            </div>
        </div>
    );
};

export default ForgotPassword;