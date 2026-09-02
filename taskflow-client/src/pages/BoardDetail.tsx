import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult, DroppableProvided, DroppableStateSnapshot, DraggableProvided, DraggableStateSnapshot } from '@hello-pangea/dnd';
import { QRCodeSVG } from 'qrcode.react';


import { HubConnectionBuilder } from '@microsoft/signalr';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Column { id: string; title: string; position: number; category: number; boardId: string; tasks: Task[]; }
interface Task { id: string; title: string; description?: string; position: number; columnId: string; assignees?: TaskAssignee[]; dueDate?: string | null; comments?: TaskComment[]; }
interface Board { id: string; title: string; isOwner: boolean; columns: Column[]; members?: Member[]; }
interface ActivityLog { id: string; actionType: string; entity: string; message: string; createdAt: string; }
interface User { id: string; username: string; email: string; }
interface TaskAssignee { userId: string; user: User; }
interface Member { id: string; username: string; email: string; }
interface TaskComment { id: string; content: string; createdat: string; user: { id: string; username: string; }; }

export default function BoardDetail() {
    const { id } = useParams<{ id: string }>();

    const [board, setBoard] = useState<Board | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const navigate = useNavigate();
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [newComment, setNewComment] = useState("");

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const [newColumnCategory, setNewColumnCategory] = useState<number>(1);
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
    const [editDueDate, setEditDueDate] = useState<string>("");

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

                connection.on('UserJoined', (katilanKisi) => {
                    const temizIsim = typeof katilanKisi === 'string' ? katilanKisi.trim() : "";
                    const isim = temizIsim.length > 0 ? temizIsim : "Yeni bir kullanıcı";

                    toast(`${isim} davete katıldı!`, {
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff'
                        }
                    });
                    fetchBoardDetails();
                });

                connection.on('UserLeft', (ayrilanKisi) => {
                    const temizIsim = typeof ayrilanKisi === 'string' ? ayrilanKisi.trim() : "";
                    const isim = temizIsim.length > 0 ? temizIsim : "Bir kullanıcı";

                    toast(`${isim} panodan ayrıldı!`, {
                        style: {
                            borderRadius: '10px',
                            background: '#333',
                            color: '#fff'
                        }
                    });

                    fetchBoardDetails();
                });
            })
            .catch(e => console.log('SignalR Bağlantı Hatası: ', e));

        // Sayfadan çıkıldığında bağlantıyı temizle
        return () => {
            connection.off('BoardUpdated');
            connection.off('UserJoined');
            connection.off('UserLeft');

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

    const handleLeaveBoard = async () => {
        if (!window.confirm("Bu panodan ayrılmak istediğinize emin misiniz?")) return;

        try {
            await api.post(`/Boards/${id}/leave`);

            toast.success("Panodan ayrıldınız.");

            //ayrıldıktan sonra dashboarda yönlendir
            navigate('/dashboard');
        } catch (err: unknown) {
            console.error("Ayrılma hatası:", err);
            if (axios.isAxiosError(err)) {
                toast.error(err.response?.data?.Mesaj || "Panodan ayrılırken bir hata oluştu(belki de panonun sahibisiniz).");
            } else {
                toast.error("Panodan ayrılırken bir hata oluştu.");
            }
        }
    };

    const getDueDateStyles = (dueDate?: string | null, columnCategory?: number) => {
        if (!dueDate) return null; //tarih yoksa stil yok

        if (columnCategory === 4) {
            return { text: "Tamamlandı", style: "bg-green-100 text-green-700 line-through"}; 
        }
        const now = new Date();
        const due = new Date(dueDate);
        const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

        //tarihi format
        const formattedDate = due.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        if (diffHours <= 24) {
            return { text: formattedDate, style: "bg-red-100 text-red-700 font-bold border border-red-300"}; //kırmızı"
        } else if (diffHours <= 72) {
            return { text: formattedDate, style: "bg-yellow-100 text-yellow-800" }; //sarı
        } else {
            return { text: formattedDate, style: "bg-gray-100 text-gray-600" }; 
        }
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

    const openTaskModal = (task: Task) => { setEditingTask(task); setEditTitle(task.title || ''); setEditDescription(task.description || ''); setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : ''); setShowDeleteConfirm(false); };

    const confirmDeleteTask = async () => {
        if (!editingTask || !board) return;
        try {
            await api.delete(`/Task/${editingTask.id}`);
            const updatedColumns = board.columns.map(col => col.id === editingTask.columnId ? { ...col, tasks: col.tasks.filter(t => t.id !== editingTask.id) } : col);
            setBoard({ ...board, columns: updatedColumns }); //optimistic ui işlem gerçekleşmeden gerçekleşmiş varsayılıyor
            setShowDeleteConfirm(false); setEditingTask(null);
        } catch (error) { console.error(error); }
    };

    const handleAssignTask = async (taskId: string, userId: string) => {
        try {
            await api.post(`/Task/${taskId}/assign`, { userId });

            // 1. Eklenen kişiyi panodaki mevcut üyeler arasından bul
            const selectedMember = board?.members?.find(m => m.id === userId);

            if (selectedMember) {
                const newAssignee = { userId: userId, user: selectedMember };

                // 2. Açık olan modal penceresini (editingTask) ANINDA güncelle
                setEditingTask(prev => {
                    if (!prev) return prev;
                    // Zaten ekliyse çift eklemeyi önle
                    if (prev.assignees?.some(a => a.userId === userId)) return prev;
                    return { ...prev, assignees: [...(prev.assignees || []), newAssignee] };
                });

                // 3. Arka plandaki panoyu (görev kartlarını) ANINDA güncelle
                setBoard(prevBoard => {
                    if (!prevBoard) return prevBoard;
                    return {
                        ...prevBoard,
                        columns: prevBoard.columns.map(col => ({
                            ...col,
                            tasks: col.tasks.map(task => {
                                if (task.id === taskId) {
                                    // Zaten ekliyse aynen bırak, değilse ekle
                                    if (task.assignees?.some(a => a.userId === userId)) return task;
                                    return { ...task, assignees: [...(task.assignees || []), newAssignee] };
                                }
                                return task;
                            })
                        }))
                    };
                });
            }
        } catch (error) {
            console.error("❌ Atama Hatası:", error); 
        }
    };

    const handleRemoveAssignee = async (taskId: string, userId: string) => {
        try {
            await api.delete(`/Task/${taskId}/assign/${userId}`);

            // 1. Modaldan ANINDA sil
            setEditingTask(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    assignees: prev.assignees?.filter(a => a.userId !== userId) || []
                };
            });

            // 2. Arka plandaki görev kartından ANINDA sil
            setBoard(prevBoard => {
                if (!prevBoard) return prevBoard;
                return {
                    ...prevBoard,
                    columns: prevBoard.columns.map(col => ({
                        ...col,
                        tasks: col.tasks.map(task => {
                            if (task.id === taskId) {
                                return {
                                    ...task,
                                    assignees: task.assignees?.filter(a => a.userId !== userId) || []
                                };
                            }
                            return task;
                        })
                    }))
                };
            });
        } catch (error) {
            console.error("❌ Silme Hatası:", error);
        }
    };

    const handleUpdateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTask) return;

        try {
            await api.put(`/Task/${editingTask.id}`, {
                title: editTitle,
                description: editDescription,
                dueDate: editDueDate ? new Date(editDueDate).toISOString() : null
            });

            // Atamaları (assignees) EZMEDEN arka planı güncelliyoruz
            setBoard((prevBoard) => {
                if (!prevBoard) return prevBoard;

                return {
                    ...prevBoard,
                    columns: prevBoard.columns.map((col) => {
                        return {
                            ...col,
                            tasks: col.tasks.map((task) => {
                                // Eğer güncellediğimiz görev ise, başlık ve açıklamayı değiştir
                                if (task.id === editingTask.id) {
                                    return {
                                        ...task,
                                        title: editTitle,
                                        description: editDescription,
                                        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null
                                    };
                                }
                                // Diğer görevlere dokunma aynen geri döndür
                                return task;
                            })
                        };
                    })
                };
            });

            // Modalı sorunsuz şekilde kapatıyoruz
            setEditingTask(null);

        } catch (error) {
            console.error("Görev güncellenirken hata:", error);
        }
    };

    // YENİ YORUM EKLEME FONKSİYONU
    const handleAddComment = async () => {
        // Yorum boşsa veya açık bir görev yoksa işlemi durdur
        if (!newComment.trim() || !editingTask) return;

        try {
            // 1. C# API'ye yorumu gönder
            const response = await api.post(`/Task/${editingTask.id}/comments`, {
                content: newComment
            });

            const addedComment = response.data; // C#'tan geri dönen DTO

            // 2. Modalı (Açık olan pencereyi) anında güncelle
            setEditingTask(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    comments: [...(prev.comments || []), addedComment]
                };
            });

            // 3. Arka plandaki panoyu (Board) anında güncelle
            setBoard(prevBoard => {
                if (!prevBoard) return prevBoard;
                return {
                    ...prevBoard,
                    columns: prevBoard.columns.map(col => ({
                        ...col,
                        tasks: col.tasks.map(task =>
                            task.id === editingTask.id
                                ? { ...task, comments: [...(task.comments || []), addedComment] }
                                : task
                        )
                    }))
                };
            });

            // 4. Input kutusunu temizle
            setNewComment("");

        } catch (error) {
            console.error("Yorum eklenirken hata:", error);
        }
    };
        

    const handleAddColumn = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalTitle = newColumnTitle;
        if (newColumnCategory === 1) finalTitle = "Yapılacaklar";
        if (newColumnCategory === 2) finalTitle = "Devam Ediyor";
        if (newColumnCategory === 3) finalTitle = "İncelemede";
        if (newColumnCategory === 4) finalTitle = "Tamamlandı";

        if (!finalTitle.trim() || !board) return;
        const newPosition = board.columns.length > 0 ? board.columns[board.columns.length - 1].position + 1024 : 1024;
        try {
            //kategori bilgisini apiye gönder
            const response = await api.post("/Columns", { title: finalTitle, position: newPosition, category: newColumnCategory, boardId: board.id });
            setBoard({ ...board, columns: [...board.columns, response.data] });

            //işlem bitince formu sıfırla
            setNewColumnTitle('');
            setNewColumnCategory(1);
            setIsAddingColumn(false);
        } catch (error) { console.error(error); }
    }

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

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await api.get(`/Boards/${id}/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(response.data);
        } catch (error) {
            console.error("Loglar çekilirken hata oluştu:", error);
        }
    };

    const toggleLogSidebar = () => {
        if (!isLogOpen) {
            fetchLogs();
        }
        setIsLogOpen(!isLogOpen);
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 text-xl font-medium text-gray-500">Pano yükleniyor...</div>;
    if (error || !board) return <div className="flex h-screen flex-col items-center justify-center bg-gray-50"><div className="text-red-500 mb-4 text-lg">{error || 'Pano bulunamadı.'}</div><Link to="/dashboard" className="text-blue-600 hover:underline">Panolarıma Dön</Link></div>;

    return (
        <div className="flex h-screen flex-col bg-gradient-to-br from-indigo-900 via-blue-800 to-slate-900 overflow-hidden font-sans">

            {/* --- ÜST MENÜ --- */}
            <header className="flex items-center justify between px-6 py-4 bg-white/10 backdrop-blur-md border-b border-white/10 shadow-sm z-10">
                {/*SOl alan geri butonu*/}
                <div className="flex-1 flex justify-start">
                    <Link to="/dashboard" className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition shadow-sm border border-white/10">
                        ← Geri
                    </Link>
                </div>

                {/* Orta alan sadece pano ismi*/}
                <div className="flex-1 flex justify-center">
                    <h1 className="text-2xl font-bold text-white tracking-wide">
                        {board?.title || "Yükleniyor..."}
                    </h1>
                </div>

                {/* Sağ alan işlem butonları */}
                <div className="flex-1 flex items-center justify-end gap-3">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition shadow-sm border border-white/10">
                    <span className="text-lg leading-none">+</span> Davet et
                    </button>
                    <button
                        onClick={toggleLogSidebar}
                        className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-lg backdrop-blur-sm transition-all shadow-sm border border-white/10"
                    >
                      Geçmiş
                    </button>

                    {!board.isOwner && (
                        <button
                            onClick={handleLeaveBoard}
                            className="ml-2 rounded-lg bg-red-500/80 hover:bg-red-600 px-4 py-2 text-white font-medium backdrop-blur-sm transition shadow-sm border border-red-500/50"
                        >
                            Panodan ayrıl
                        </button>

                    )}
                </div>
            </header>

            {/* --- ANA PANO (SÜRÜKLE BIRAK ALANI) --- */}
            <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex items-start">
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="all-columns" direction={isMobile ? "vertical" : "horizontal"} type="COLUMN">
                        {(provided: DroppableProvided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className={`flex h-full items-start gap-6 ${isMobile ? 'flex-col pb-20' : ''}`}>

                                {board.columns.map((column, index) => (
                                    <Draggable key={column.id} draggableId={column.id} index={index}>
                                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (

                                            /* SÜTUN DIŞ KUTUSU (GLASSMORPHISM) */
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                style={provided.draggableProps.style}
                                                className={`flex max-h-full flex-shrink-0 flex-col rounded-2xl bg-slate-100/95  shadow-xl border border-gray-200 ${isMobile ? 'w-full' : 'w-72'} ${snapshot.isDragging ? 'rotate-2 scale-105 opacity-90' : ''}`}
                                            >
                                                {/* SÜTUN BAŞLIĞI */}
                                                <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/40 rounded-t-2xl group">
                                                    <div {...provided.dragHandleProps} className="flex-1 cursor-grab active:cursor-grabbing font-bold text-gray-800 py-1">
                                                        {column.title}
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-0.5 rounded-full shadow-sm">{column.tasks.length}</span>
                                                        <button onClick={() => openColumnModal(column)} className="text-gray-400 hover:text-blue-600 bg-white/50 hover:bg-white rounded p-1 transition-colors shadow-sm">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* KARTLARIN DİZİLDİĞİ ALAN */}
                                                <Droppable droppableId={column.id} type="TASK">
                                                    {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                        <div
                                                            {...provided.droppableProps}
                                                            ref={provided.innerRef}
                                                            className={`flex flex-1 flex-col gap-3 overflow-y-auto p-3 transition-colors ${snapshot.isDraggingOver ? 'bg-black/5 rounded-b-2xl' : ''}`}
                                                            style={{ minHeight: '50px' }}
                                                        >
                                                            {column.tasks.map((task, index) => {
                                                                const isCompleted = column.category === 4;

                                                                return (
                                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (

                                                                            /* TEKİL KART (MODERN TASARIM) */
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                style={provided.draggableProps.style}
                                                                                onClick={() => openTaskModal(task)}
                                                                                className={`group relative rounded-xl p-3.5 shadow-sm border cursor-grab active:cursor-grabbing 
                                                                                    ${isCompleted ? 'bg-slate-50 border-gray-200 border-l-4 border-l-emerald-500 opacity-75' : 'bg-white border-gray-200 hover:border-blue-400'} 
                                                                                    ${snapshot.isDragging ? 'border-blue-500 shadow-2xl rotate-2 opacity-100' : ''}`}
                                                                            >
                                                                                <div className="flex items-start justify-between">
                                                                                    <h3 className={`text-sm font-semibold leading-tight ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                                                        {task.title}
                                                                                    </h3>
                                                                                    {isCompleted && (
                                                                                        <span className="text-emerald-500 ml-2 flex-shrink-0">
                                                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {task.description && (
                                                                                    <p className={`mt-2 text-xs line-clamp-2 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                                                                                        {task.description}
                                                                                    </p>
                                                                                )}
                                                                                {/* Görev kartının içindeki uygun bir yere (örn: başlığın altına veya atanmış kişilerin yanına) */}
                                                                                {task.dueDate && (
                                                                                    <div className="mt-2 mb-1">
                                                                                        {(() => {
                                                                                            const dueInfo = getDueDateStyles(task.dueDate, column.category); // col.category kolonun durumunu belirtir
                                                                                            if (!dueInfo) return null;
                                                                                            return (
                                                                                                <span className={`text-xs px-2 py-1 rounded-md ${dueInfo.style}`}>
                                                                                                    ⏳ {dueInfo.text}
                                                                                                </span>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                )}
                                                                                {task.assignees && task.assignees.length > 0 && (
                                                                                    <div className="mt-3 flex justify-end gap-1">
                                                                                        {task.assignees.map(assignee => (
                                                                                            <div
                                                                                                key={assignee.userId}
                                                                                                title={assignee.user?.username}
                                                                                                className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 border border-blue-200 text-[10px] font-bold text-blue-700 shadow-sm"
                                                                                            >
                                                                                                {assignee.user?.username?.substring(0, 2).toUpperCase()}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>

                                                {/* YENİ KART EKLEME ALANI */}
                                                {addingTaskColumnId === column.id ? (
                                                    <form onSubmit={(e) => handleAddTask(e, column.id)} className="px-3 pb-3">
                                                        <textarea autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Kart başlığı..." className="w-full resize-none rounded-lg bg-white p-2.5 text-sm shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(e, column.id); } }} />
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm">Ekle</button>
                                                            <button type="button" onClick={() => { setAddingTaskColumnId(null); setNewTaskTitle(''); }} className="rounded-lg px-2 py-1 text-xl text-gray-500 hover:text-gray-800 transition bg-white/50 hover:bg-white">&times;</button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div className="px-3 pb-3 pt-1">
                                                        <button onClick={() => setAddingTaskColumnId(column.id)} className="flex w-full items-center gap-2 rounded-lg py-2 px-3 text-sm font-medium text-gray-600 hover:bg-white/60 hover:text-gray-900 transition">
                                                            <span className="text-lg leading-none">+</span> Kart Ekle
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}

                                {/* --- YENİ LİSTE EKLE BUTONU --- */}
                                <div className={`flex-shrink-0 ${isMobile ? 'w-full' : 'w-72'}`}>
                                    {isAddingColumn ? (
                                        <form onSubmit={handleAddColumn} className="flex flex-col bg-slate-100/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 p-4">
                                            <select
                                                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mb-3 bg-white"
                                                value={newColumnCategory}
                                                onChange={(e) => setNewColumnCategory(Number(e.target.value))}
                                            >
                                                <option value={1}> Yapılacaklar (To Do)</option>
                                                <option value={2}> Devam Ediyor (In Progress)</option>
                                                <option value={3}> İncelemede (In Review)</option>
                                                <option value={4}> Tamamlandı (Done)</option>
                                                <option value={5}> Özel İsimli Liste...</option>
                                            </select>

                                            {newColumnCategory === 5 && (
                                                <input type="text" autoFocus value={newColumnTitle} onChange={(e) => setNewColumnTitle(e.target.value)} placeholder="Liste başlığı..." className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none mb-3" />
                                            )}

                                            <div className="flex items-center gap-2">
                                                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm">Liste Ekle</button>
                                                <button type="button" onClick={() => { setIsAddingColumn(false); setNewColumnCategory(1); }} className="rounded-lg px-3 py-1.5 text-xl text-gray-500 hover:text-gray-800 transition bg-white/50 hover:bg-white">&times;</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <button onClick={() => setIsAddingColumn(true)} className="flex w-full items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 border-dashed backdrop-blur-sm font-medium shadow-sm p-4">
                                            <span className="text-xl leading-none">+</span> Başka liste ekle
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </main>

            {/* --- MODALLAR (Tümü cam efektiyle güncellendi) --- */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center relative">
                        <button onClick={() => setShowInviteModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Panoya Davet Et</h3>
                        <p className="text-sm text-gray-500 mb-6">İş arkadaşlarınız QR kodu okutarak veya linke tıklayarak panoya katılabilir.</p>
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                <QRCodeSVG value={inviteUrl} size={180} level={"H"} />
                            </div>
                        </div>
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1.5">
                            <input type="text" readOnly value={inviteUrl} className="w-full bg-transparent p-2 text-sm text-gray-600 focus:outline-none" />
                            <button onClick={handleCopyLink} className={`rounded-md px-4 py-2 text-sm font-medium text-white transition whitespace-nowrap shadow-sm ${copied ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                {copied ? 'Kopyalandı!' : 'Kopyala'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Kart Detayı</h2>
                            <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateTask}>
                            <div className="mb-4">
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">Başlık</label>
                                <input type="text" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                            </div>
                            <div className="mb-6">
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">Açıklama</label>
                                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} className="w-full resize-none rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                                <input
                                    type="datetime-local"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">Kişi ata</label>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none"
                                        onChange={(e) => {
                                            if (e.target.value) handleAssignTask(editingTask.id, e.target.value);
                                            e.target.value = "";
                                        }}
                                    >
                                        <option value="">+ Yeni kişi seç....</option>
                                        {board?.members?.map(member => (
                                            <option key={member.id} value={member.id}>{member.username}</option>
                                        ))}
                                    </select>
                                </div>
                                {/*zaten atanmış olanları listeleme ve çıkarma butonu */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {editingTask.assignees?.map(assignee => (
                                         <span key={assignee.userId} className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                                            {assignee.user?.username}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAssignee(editingTask.id, assignee.userId)}
                                                className="ml-1 text-blue-400 hover:text-red-500 font-bold"
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition">Sil</button>
                                <div className="flex gap-2">
                                    {/* YORUMLAR BÖLÜMÜ */}
                                    <div className="mt-6 border-t pt-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-3">Yorumlar</h3>

                                        {/* Yorum Listesi */}
                                        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
                                            {editingTask.comments && editingTask.comments.length > 0 ? (
                                                editingTask.comments.map(comment => (
                                                    <div key={comment.id} className="bg-gray-50 border border-gray-100 p-3 rounded-md">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-bold text-gray-800">{comment.user.username}</span>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(comment.createdat).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600">{comment.content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">Henüz yorum yapılmamış.</p>
                                            )}
                                        </div>

                                        {/* Yorum Ekleme Kutusu */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }} // Enter ile gönderme
                                                placeholder="Bir yorum yazın..."
                                                className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddComment}
                                                disabled={!newComment.trim()} // Kutucuk boşsa butonu pasif yap
                                                className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Gönder
                                            </button>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setEditingTask(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">İptal</button>
                                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm">Kaydet</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-center text-gray-900 mb-2">Görevi Sil</h3>
                        <p className="text-sm text-center text-gray-500 mb-6">"<span className="font-semibold text-gray-800">{editingTask?.title}</span>" kartını silmek istediğinize emin misiniz?</p>
                        <div className="flex justify-center gap-3 w-full">
                            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition">Vazgeç</button>
                            <button type="button" onClick={confirmDeleteTask} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition shadow-sm">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            {editingColumn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Listeyi Düzenle</h2>
                            <button onClick={() => setEditingColumn(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleUpdateColumn}>
                            <div className="mb-6">
                                <label className="mb-1.5 block text-sm font-medium text-gray-700">Liste Adı</label>
                                <input type="text" autoFocus value={editColTitle} onChange={(e) => setEditColTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                            </div>
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => setShowColDeleteConfirm(editingColumn)} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition">Sil</button>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditingColumn(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition">İptal</button>
                                    <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm">Kaydet</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showColDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-center text-gray-900 mb-2">Listeyi Sil</h3>
                        <p className="text-sm text-center text-gray-500 mb-6">"<span className="font-semibold text-gray-800">{showColDeleteConfirm.title}</span>" listesini ve içindeki tüm kartları silmek istediğinize emin misiniz?</p>
                        <div className="flex justify-center gap-3 w-full">
                            <button type="button" onClick={() => setShowColDeleteConfirm(null)} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition">Vazgeç</button>
                            <button type="button" onClick={confirmDeleteColumn} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition shadow-sm">Evet, Sil</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SAĞDAN AÇILAN LOG MENÜSÜ --- */}
            <div
                className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isLogOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800">Aktivite Geçmişi</h2>
                    <button onClick={toggleLogSidebar} className="text-gray-400 hover:text-red-500 text-2xl leading-none">
                        &times;
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-65px)]">
                    {logs.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center mt-10 font-medium">Henüz bir hareket yok.</p>
                    ) : (
                        <ul className="space-y-5">
                            {logs.map((log) => (
                                <li key={log.id} className="text-sm relative pl-6">
                                    <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm border-2 border-white"></span>
                                    <span className="font-bold text-gray-800 block mb-0.5">{log.actionType}</span>
                                    <p className="text-gray-600 leading-relaxed">{log.message}</p>
                                    <p className="text-xs font-medium text-gray-400 mt-1">
                                        {new Date(log.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}