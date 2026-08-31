import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosInstance';
import axios from 'axios';

interface Board {
    id: string;
    title: string;
    createdAt: string;
    isOwner: boolean;
}

export default function Dashboard() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isCreating, setIsCreating] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');

    const [editingBoard, setEditingBoard] = useState<Board | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<Board | null>(null);

    const navigate = useNavigate();

    // KUSURSUZ USEEFFECT YAPISI
    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const response = await api.get('/Boards');
                setBoards(response.data);
            } catch (err) {
                setError(axios.isAxiosError(err) ? err.response?.data || 'Panolar çekilemedi.' : 'Beklenmeyen bir hata.');
            } finally {
                setLoading(false);
            }
        };

        fetchBoards();
    }, []);

    // ÇIKIŞ YAPMA FONKSİYONU
    const handleLogout = async () => {
        try {
            await api.post('/Auth/logout');
        } catch (error) {
            console.error("Çıkış yapılırken hata oluştu", error);
        } finally {
            localStorage.removeItem('redirectAfterLogin');
            localStorage.removeItem('isAuthenticated');
            navigate('/login');
        }
    };

    const handleCreateBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBoardTitle.trim()) return;
        try {
            const response = await api.post('/Boards', { title: newBoardTitle });
            setBoards([response.data, ...boards]);
            setNewBoardTitle('');
            setIsCreating(false);
        } catch (error) { console.error(error); }
    };

    const openEditModal = (e: React.MouseEvent, board: Board) => {
        e.preventDefault();
        setEditingBoard(board);
        setEditTitle(board.title);
    };

    const handleUpdateBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBoard || !editTitle.trim()) return;
        try {
            await api.put(`/Boards/${editingBoard.id}`, { title: editTitle });
            setBoards(boards.map(b => b.id === editingBoard.id ? { ...b, title: editTitle } : b));
            setEditingBoard(null);
        } catch (error) { console.error(error); }
    };

    const confirmDeleteBoard = async () => {
        if (!showDeleteConfirm) return;
        try {
            await api.delete(`/Boards/${showDeleteConfirm.id}`);
            setBoards(boards.filter(b => b.id !== showDeleteConfirm.id));
            setShowDeleteConfirm(null);
            setEditingBoard(null);
        } catch (error) { console.error(error); }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 text-xl text-gray-500">Panolar yükleniyor...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-12 font-sans">
            {/* Üst Karşılama Alanı (Hero Section) */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 pb-24 pt-8 px-4 sm:px-6 lg:px-8 shadow-inner">
                <div className="max-w-7xl mx-auto">
                    <header className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-extrabold text-white tracking-tight">TaskFlow</h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white hover:bg-white/20 transition-all backdrop-blur-sm border border-white/10 shadow-sm"
                        >
                            Çıkış Yap
                        </button>
                    </header>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Hoş geldiniz </h2>
                        <p className="text-blue-100 text-lg max-w-xl">Pano yaratın veya mevcut pano üzerinden iş akışını yönetin</p>
                    </div>
                </div>
            </div>

            {/* Ana İçerik ve Pano Kartları (Üst alana hafifçe biner) */}
            <main className="-pt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 shadow-sm flex items-center">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {/* Yeni Pano Oluştur Butonu / Formu */}
                    {isCreating ? (
                        <div className="flex h-40 flex-col rounded-xl bg-white p-4 shadow-lg border-2 border-blue-500 transform transition-all">
                            <form onSubmit={handleCreateBoard} className="flex h-full flex-col justify-between">
                                <input
                                    type="text"
                                    autoFocus
                                    value={newBoardTitle}
                                    onChange={(e) => setNewBoardTitle(e.target.value)}
                                    placeholder="Pano adı..."
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
                                />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setIsCreating(false)} className="text-sm font-medium text-gray-500 hover:text-gray-800">İptal</button>
                                    <button type="submit" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 shadow-sm">Oluştur</button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <button onClick={() => setIsCreating(true)} className="group flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm font-medium">
                            <span className="transform group-hover:scale-125 transition-transform duration-200 text-2xl mr-2">+</span> Yeni Pano
                        </button>
                    )}

                    {/* Mevcut Panolar */}
                    {boards.map(board => (
                        <div key={board.id} className="group relative block h-40 rounded-xl bg-white p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 cursor-pointer overflow-hidden">
                            {/* Arka plan dekoratif dokunuşu */}
                            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50 group-hover:scale-150 transition-transform duration-500"></div>

                            <Link to={`/board/${board.id}`} className="absolute inset-0 z-0"></Link>

                            <div className="relative z-10 flex h-full flex-col justify-between pointer-events-none">
                                <h2 className="text-xl font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{board.title}</h2>
                                <span className="text-xs font-medium text-gray-400 flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    {new Date(board.createdAt).toLocaleDateString('tr-TR')}
                                </span>
                            </div>

                            {board.isOwner && (
                                <button
                                    onClick={(e) => openEditModal(e, board)}
                                    className="absolute right-3 top-3 z-20 rounded-md bg-white p-1.5 text-gray-400 opacity-100 md:opacity-0 shadow-sm hover:bg-blue-50 hover:text-blue-600 group-hover:opacity-100 transition-all border border-gray-100"
                                    title="Düzenle"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            {/* Düzenleme Modalı */}
            {editingBoard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-opacity">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl transform transition-all">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Panoyu Düzenle</h2>
                            <button onClick={() => setEditingBoard(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateBoard}>
                            <div className="mb-6">
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">Pano Adı</label>
                                <input type="text" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all" />
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => setShowDeleteConfirm(editingBoard)} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">Sil</button>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditingBoard(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">İptal</button>
                                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">Kaydet</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Silme Onay Modalı */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl transform transition-all">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-center text-gray-900 mb-2">Panoyu Sil</h3>
                        <p className="text-sm text-center text-gray-500 mb-6">
                            "<span className="font-semibold text-gray-800">{showDeleteConfirm.title}</span>" panosunu ve içindeki tüm verileri silmek istediğinize emin misiniz?
                        </p>
                        <div className="flex justify-center gap-3 w-full">
                            <button type="button" onClick={() => setShowDeleteConfirm(null)} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Vazgeç</button>
                            <button type="button" onClick={confirmDeleteBoard} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}