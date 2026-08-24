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
        <div className="min-h-screen bg-gray-50">
            <header className="bg-blue-600 p-4 text-white shadow-md">
                <div className="container mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold">TaskFlow Panolarım</h1>

                    <button
                        onClick={handleLogout}
                        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </header>

            <main className="container mx-auto p-6">
                {error && <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

                    {isCreating ? (
                        <div className="flex h-32 flex-col rounded-lg bg-white p-3 shadow-sm border-2 border-blue-500">
                            <form onSubmit={handleCreateBoard} className="flex h-full flex-col justify-between">
                                <input type="text" autoFocus value={newBoardTitle} onChange={(e) => setNewBoardTitle(e.target.value)} placeholder="Pano adı..." className="w-full rounded border border-gray-300 p-2 text-sm focus:outline-none" />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setIsCreating(false)} className="text-sm text-gray-500 hover:text-gray-800">İptal</button>
                                    <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">Oluştur</button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <button onClick={() => setIsCreating(true)} className="flex h-32 items-center justify-center rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition shadow-sm font-medium">
                            + Yeni Pano Oluştur
                        </button>
                    )}

                    {boards.map(board => (
                        <div key={board.id} className="group relative block h-32 rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition border border-gray-200 cursor-pointer">
                            <Link to={`/board/${board.id}`} className="absolute inset-0 z-0"></Link>

                            <div className="relative z-10 flex h-full flex-col justify-between pointer-events-none">
                                <h2 className="text-lg font-bold text-gray-800 truncate">{board.title}</h2>
                                <span className="text-xs text-gray-400">Oluşturulma: {new Date(board.createdAt).toLocaleDateString('tr-TR')}</span>
                            </div>

                            {board.isOwner && (
                                <button
                                    onClick={(e) => openEditModal(e, board)}
                                    className="absolute right-2 top-2 z-20 rounded bg-white/90 p-1.5 text-gray-700 opacity-100 md:opacity-0 shadow-sm hover:bg-gray-100 hover:text-blue-600 group-hover:opacity-100 transition"
                                >
                                    ✎ Düzenle
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            {editingBoard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Panoyu Düzenle</h2>
                            <button onClick={() => setEditingBoard(null)} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateBoard}>
                            <div className="mb-6">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Pano Adı</label>
                                <input type="text" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => setShowDeleteConfirm(editingBoard)} className="rounded bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200 transition">Panoyu Sil</button>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditingBoard(null)} className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">İptal</button>
                                    <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">Kaydet</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Panoyu Sil</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            "<span className="font-semibold text-gray-800">{showDeleteConfirm.title}</span>" panosunu ve içindeki <strong>tüm liste ve kartları</strong> silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowDeleteConfirm(null)} className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Vazgeç</button>
                            <button type="button" onClick={confirmDeleteBoard} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition shadow-sm">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}