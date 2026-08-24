import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import axios from 'axios';
import {
    DragDropContext, Droppable, Draggable,
    type DropResult, type DroppableProvided, type DroppableStateSnapshot,
    type DraggableProvided, type DraggableStateSnapshot
} from '@hello-pangea/dnd';
import { QRCodeSVG } from 'qrcode.react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import toast from 'react-hot-toast';

interface Task { id: string; title: string; description?: string; position: number; columnId: string; assigneeId?: string; }
interface Column { id: string; title: string; position: number; boardId: string; tasks: Task[]; }
interface Board { id: string; title: string; isOwner: boolean; columns: Column[]; }

export default function BoardDetail() {
    const { id } = useParams<{ id: string }>();

    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [addingTaskColumnId, setAddingTaskColumnId] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [editingColumn, setEditingColumn] = useState<Column | null>(null);
    const [editColTitle, setEditColTitle] = useState('');
    const [showColDeleteConfirm, setShowColDeleteConfirm] = useState<Column | null>(null);

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // 1. KUSURSUZ FETCH FONKSİYONU (useCallback ile hafızaya alındı)
    const fetchBoardDetails = useCallback(async () => {
        try {
            const response = await api.get(`/Boards/${id}`);
            setBoard(response.data);
        } catch (err) {
            setError(axios.isAxiosError(err) ? err.response?.data || 'Hata oluştu.' : 'Beklenmeyen hata.');
        } finally { setLoading(false); }
    }, [id]);

    // 2. SAYFA İLK AÇILDIĞINDA ÇALIŞIR
    useEffect(() => {
        // Linter'ı sakinleştirmek için asenkron bir sarmalayıcı (wrapper) kullanıyoruz
        const loadBoard = async () => {
            if (id) {
                await fetchBoardDetails();
            }
        };

        loadBoard();
    }, [id, fetchBoardDetails]);

    // 3. SIGNALR (CANLI YAYIN) BAĞLANTISI VE DİNLEYİCİ
    useEffect(() => {
        if (!id) return;

        const connection = new HubConnectionBuilder()
            .withUrl('https://taskflow-vio5.onrender.com/hubs/board', {
                withCredentials: true
            })
            .withAutomaticReconnect()
            .build();

        connection.start()
            .then(() => {
                console.log('📡 Canlı yayına bağlanıldı!');

                // Panonun frekansına (Odaya) katıl
                connection.invoke('JoinBoardGroup', id);

                // BACKEND'DEN "BoardUpdated" SİNYALİ GELDİĞİNDE:
                connection.on('BoardUpdated', (degistirenKisi) => {
                    const temizIsim = typeof degistirenKisi === 'string' ? degistirenKisi.trim() : "";
                    const isim = temizIsim.length > 0 ? temizIsim : "Birisi";
               
                    toast(`${isim} panoda değişiklik yaptı!`, {
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff',
                        }
                    })
                    fetchBoardDetails(); // Dışarıdaki fonksiyonu çağırıyoruz!
                });
            })
            .catch(e => console.log('SignalR Bağlantı Hatası: ', e));

        // Sayfadan çıkıldığında bağlantıyı temizle
        return () => {
            connection.invoke('LeaveBoardGroup', id)
                .then(() => connection.stop())
                .catch(e => console.log(e));
        };
    }, [id, fetchBoardDetails]);

    const inviteUrl = `${window.location.origin}/join/${board?.id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddTask = async (e: React.FormEvent, columnId: string) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !board) return;
        const column = board.columns.find(c => c.id === columnId);
        if (!column) return;
        const newPosition = column.tasks.length > 0 ? column.tasks[column.tasks.length - 1].position + 1024 : 1024;
        try {
            const response = await api.post('/Task', { title: newTaskTitle, position: newPosition, columnId });
            const updatedColumns = board.columns.map(c => c.id === columnId ? { ...c, tasks: [...c.tasks, response.data] } : c);
            setBoard({ ...board, columns: updatedColumns });
            setNewTaskTitle(''); setAddingTaskColumnId(null);
        } catch (error) { console.error(error); }
    };

    const openTaskModal = (task: Task) => { setEditingTask(task); setEditTitle(task.title); setEditDescription(task.description || ''); setShowDeleteConfirm(false); };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask || !editTitle.trim() || !board) return;
        try {
            await api.put(`/Task/${editingTask.id}`, { title: editTitle, description: editDescription });
            const updatedColumns = board.columns.map(col => col.id === editingTask.columnId ? { ...col, tasks: col.tasks.map(t => t.id === editingTask.id ? { ...t, title: editTitle, description: editDescription } : t) } : col);
            setBoard({ ...board, columns: updatedColumns });
            setEditingTask(null);
        } catch (error) { console.error(error); }
    };

    const confirmDeleteTask = async () => {
        if (!editingTask || !board) return;
        try {
            await api.delete(`/Task/${editingTask.id}`);
            const updatedColumns = board.columns.map(col => col.id === editingTask.columnId ? { ...col, tasks: col.tasks.filter(t => t.id !== editingTask.id) } : col);
            setBoard({ ...board, columns: updatedColumns }); //optimistic ui işlem gerçekleşmeden gerçekleşmiş varsayılıyor
            setShowDeleteConfirm(false); setEditingTask(null);
        } catch (error) { console.error(error); }
    };

    const handleAddColumn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newColumnTitle.trim() || !board) return;
        const newPosition = board.columns.length > 0 ? board.columns[board.columns.length - 1].position + 1024 : 1024;
        try {
            const response = await api.post('/Columns', { title: newColumnTitle, position: newPosition, boardId: board.id });
            setBoard({ ...board, columns: [...board.columns, response.data] });
            setNewColumnTitle(''); setIsAddingColumn(false);
        } catch (error) { console.error(error); }
    };

    const openColumnModal = (col: Column) => { setEditingColumn(col); setEditColTitle(col.title); };

    const handleUpdateColumn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingColumn || !editColTitle.trim() || !board) return;
        try {
            await api.put(`/Columns/${editingColumn.id}`, { title: editColTitle });
            const updatedColumns = board.columns.map(c => c.id === editingColumn.id ? { ...c, title: editColTitle } : c);
            setBoard({ ...board, columns: updatedColumns });
            setEditingColumn(null);
        } catch (error) { console.error(error); }
    };

    const confirmDeleteColumn = async () => {
        if (!showColDeleteConfirm || !board) return;
        try {
            await api.delete(`/Columns/${showColDeleteConfirm.id}`);
            const updatedColumns = board.columns.filter(c => c.id !== showColDeleteConfirm.id);
            setBoard({ ...board, columns: updatedColumns });
            setShowColDeleteConfirm(null); setEditingColumn(null);
        } catch (error) { console.error(error); }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, type } = result;
        //eğer kart aynı yere geri bırakılırsa işlemi iptal ediyoruz
        if (!destination || !board) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (type === 'COLUMN') {
            const newColumns = [...board.columns];
            const [movedColumn] = newColumns.splice(source.index, 1);
            const calculateColumnPosition = () => {
                if (newColumns.length === 0) return 1024;
                if (destination.index === 0) return newColumns[0].position / 2;
                if (destination.index === newColumns.length) return newColumns[newColumns.length - 1].position + 1024;
                return (newColumns[destination.index - 1].position + newColumns[destination.index].position) / 2;
            };
            movedColumn.position = calculateColumnPosition();
            newColumns.splice(destination.index, 0, movedColumn);
            setBoard({ ...board, columns: newColumns });
            try { await api.put('/Columns/update-position', { columnId: movedColumn.id, newPosition: movedColumn.position }); } catch (error) { console.error(error); }
            return;
        }

        if (type === 'TASK') {
            const newColumns = [...board.columns];
            const sourceColIndex = newColumns.findIndex(c => c.id === source.droppableId);
            const destColIndex = newColumns.findIndex(c => c.id === destination.droppableId);
            if (sourceColIndex === -1 || destColIndex === -1) return;
            const sourceCol = { ...newColumns[sourceColIndex], tasks: [...newColumns[sourceColIndex].tasks] };
            const destCol = source.droppableId === destination.droppableId ? sourceCol : { ...newColumns[destColIndex], tasks: [...newColumns[destColIndex].tasks] };
            const [movedTaskBase] = sourceCol.tasks.splice(source.index, 1);
            const destTasks = destCol.tasks;
            const calculateTaskPosition = () => {
                if (destTasks.length === 0) return 1024;
                if (destination.index === 0) return destTasks[0].position / 2;
                if (destination.index === destTasks.length) return destTasks[destTasks.length - 1].position + 1024;
                return (destTasks[destination.index - 1].position + destTasks[destination.index].position) / 2;
            };
            const newPosition = calculateTaskPosition();
            const movedTask = { ...movedTaskBase, position: newPosition, columnId: destCol.id };
            destCol.tasks.splice(destination.index, 0, movedTask);
            newColumns[sourceColIndex] = sourceCol;
            newColumns[destColIndex] = destCol;
            setBoard({ ...board, columns: newColumns });
            try { await api.put('/Task/update-position', { taskId: movedTask.id, newColumnId: destCol.id, newPosition: newPosition }); } catch (error) { console.error(error); }
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 text-xl font-medium text-gray-500">Pano yükleniyor...</div>;
    if (error || !board) return <div className="flex h-screen flex-col items-center justify-center bg-gray-50"><div className="text-red-500 mb-4 text-lg">{error || 'Pano bulunamadı.'}</div><Link to="/dashboard" className="text-blue-600 hover:underline">Panolarıma Dön</Link></div>;

    return (
        <div className="flex h-screen flex-col bg-blue-600">
            <header className="flex items-center justify-between bg-black/20 p-4 text-white">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="rounded bg-white/20 px-3 py-1 text-sm font-medium hover:bg-white/30 transition">← Geri</Link>
                    <h1 className="text-xl font-bold">{board.title}</h1>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 rounded bg-white/20 px-4 py-1.5 text-sm font-medium hover:bg-white/30 transition"
                >
                    <span className="text-lg leading-none">+</span> Davet Et
                </button>
            </header>

            <main className="flex-1 overflow-auto p-4">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="all-columns" direction={isMobile ? "vertical" : "horizontal"} type="COLUMN">
                        {(provided: DroppableProvided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className={`flex h-full items-start gap-4 ${isMobile ? 'flex-col pb-20' : ''}`}>
                                {board.columns.map((column, index) => (
                                    <Draggable key={column.id} draggableId={column.id} index={index}>
                                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} className={`flex max-h-full flex-shrink-0 flex-col rounded-lg bg-gray-100 p-2 shadow-sm ${isMobile ? 'w-full' : 'w-72'} ${snapshot.isDragging ? 'shadow-2xl rotate-2 opacity-90' : ''}`}>
                                                <div className="mb-3 flex items-center justify-between px-2 pt-1 group">
                                                    <div {...provided.dragHandleProps} className="flex-1 cursor-grab active:cursor-grabbing font-semibold text-gray-700 py-1">
                                                        {column.title}
                                                    </div>

                                                    {/* SADECE PANO SAHİBİ LİSTEYİ DÜZENLEYEBİLİR */}
                                                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                            <span className="text-xs font-medium text-gray-500">{column.tasks.length}</span>
                                                            <button onClick={() => openColumnModal(column)} className="text-gray-500 hover:text-gray-900 bg-gray-200 md:bg-transparent rounded px-1.5 py-0.5">✎</button>
                                                        </div>
                                                    
                                                </div>

                                                <Droppable droppableId={column.id} type="TASK">
                                                    {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                        <div {...provided.droppableProps} ref={provided.innerRef} className={`flex flex-1 flex-col gap-2 overflow-y-auto px-1 pb-1 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 rounded' : ''}`} style={{ minHeight: '10px' }}>
                                                            {column.tasks.map((task, index) => (
                                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                    {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => openTaskModal(task)} className={`group relative rounded bg-white p-3 shadow-sm border ${snapshot.isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200'} hover:border-blue-300 transition-all cursor-pointer`}>
                                                                            <h3 className="text-sm font-medium text-gray-800">{task.title}</h3>
                                                                            {task.description && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{task.description}</p>}
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>

                                                {addingTaskColumnId === column.id ? (
                                                    <form onSubmit={(e) => handleAddTask(e, column.id)} className="mt-2">
                                                        <textarea autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Bu kart için bir başlık girin..." className="w-full resize-none rounded bg-white p-2 text-sm shadow-sm border focus:border-blue-500 focus:outline-none" rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(e, column.id); } }} />
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition">Kart Ekle</button>
                                                            <button type="button" onClick={() => { setAddingTaskColumnId(null); setNewTaskTitle(''); }} className="rounded px-2 py-1 text-xl text-gray-500 hover:text-gray-800 transition">×</button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <button onClick={() => setAddingTaskColumnId(column.id)} className="mt-2 flex w-full items-center gap-1 rounded py-1.5 px-2 text-sm text-gray-600 hover:bg-gray-200 transition">
                                                        <span className="text-lg leading-none">+</span> Kart Ekle
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

                                <div className={`flex-shrink-0 ${isMobile ? 'w-full' : 'w-72'}`}>
                                    {isAddingColumn ? (
                                        <form onSubmit={handleAddColumn} className="rounded-lg bg-gray-100 p-2 shadow-sm">
                                            <input type="text" autoFocus value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} placeholder="Liste başlığı girin..." className="w-full rounded-md border-2 border-blue-500 p-2 text-sm focus:outline-none" />
                                            <div className="mt-2 flex items-center gap-2">
                                                <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition">Liste Ekle</button>
                                                <button type="button" onClick={() => setIsAddingColumn(false)} className="rounded px-2 py-1 text-xl text-gray-500 hover:text-gray-800 transition">×</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <button onClick={() => setIsAddingColumn(true)} className="flex w-full items-center gap-2 rounded-lg bg-white/20 p-3 text-white hover:bg-white/30 transition text-sm font-medium shadow-sm"><span className="text-lg leading-none">+</span> Başka liste ekle</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </main>

            {showInviteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl text-center relative">
                        <button onClick={() => setShowInviteModal(false)} className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Panoya Davet Et</h3>
                        <p className="text-sm text-gray-500 mb-6">İş arkadaşlarınız QR kodu okutarak veya linke tıklayarak panoya katılabilir.</p>
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <QRCodeSVG value={inviteUrl} size={180} level={"H"} />
                            </div>
                        </div>
                        <div className="flex items-center bg-gray-100 rounded border border-gray-200 p-1">
                            <input type="text" readOnly value={inviteUrl} className="w-full bg-transparent p-2 text-sm text-gray-600 focus:outline-none" />
                            <button onClick={handleCopyLink} className={`rounded px-4 py-2 text-sm font-medium text-white transition whitespace-nowrap ${copied ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {copied ? 'Kopyalandı!' : 'Kopyala'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Kart Detayı</h2>
                            <button onClick={() => setEditingTask(null)} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateTask}>
                            <div className="mb-4"><label className="mb-1 block text-sm font-medium text-gray-700">Başlık</label><input type="text" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none" /></div>
                            <div className="mb-4"><label className="mb-1 block text-sm font-medium text-gray-700">Açıklama</label><textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="w-full resize-none rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none" /></div>
                            <div className="mt-6 flex items-center justify-between">
                                {/* SADECE PANO SAHİBİ GÖREVİ SİLEBİLİR */}
                              
                                    <button type="button" onClick={() => setShowDeleteConfirm(true)} className="rounded bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200 transition">Sil</button>
  
                                    <div></div>
                             
                                <div className="flex gap-2"><button type="button" onClick={() => setEditingTask(null)} className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">İptal</button><button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">Kaydet</button></div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Görevi Sil</h3>
                        <p className="text-sm text-gray-600 mb-6">"<span className="font-semibold text-gray-800">{editingTask?.title}</span>" başlıklı kartı silmek istediğinize emin misiniz?</p>
                        <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowDeleteConfirm(false)} className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Vazgeç</button><button type="button" onClick={confirmDeleteTask} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition shadow-sm">Evet, Sil</button></div>
                    </div>
                </div>
            )}

            {editingColumn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Listeyi Düzenle</h2>
                            <button onClick={() => setEditingColumn(null)} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateColumn}>
                            <div className="mb-6"><label className="mb-1 block text-sm font-medium text-gray-700">Liste Adı</label><input type="text" autoFocus value={editColTitle} onChange={(e) => setEditColTitle(e.target.value)} className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none" /></div>
                            <div className="flex items-center justify-between"><button type="button" onClick={() => setShowColDeleteConfirm(editingColumn)} className="rounded bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200 transition">Listeyi Sil</button><div className="flex gap-2"><button type="button" onClick={() => setEditingColumn(null)} className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">İptal</button><button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">Kaydet</button></div></div>
                        </form>
                    </div>
                </div>
            )}

            {showColDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Listeyi Sil</h3>
                        <p className="text-sm text-gray-600 mb-6">"<span className="font-semibold text-gray-800">{showColDeleteConfirm.title}</span>" listesini ve içindeki tüm kartları silmek istediğinize emin misiniz?</p>
                        <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowColDeleteConfirm(null)} className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">Vazgeç</button><button type="button" onClick={confirmDeleteColumn} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition shadow-sm">Evet, Sil</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}