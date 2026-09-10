'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { messageAPI, Message } from '@/lib/api';
import { webSocketService } from '@/lib/websocket';
import BackendImage from '@/components/BackendImage';
import { getValidSrc } from '@/lib/image';
import { FiSettings, FiSearch, FiMoreHorizontal, FiPaperclip, FiSmile, FiImage, FiX } from 'react-icons/fi';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const STICKERS = [
    '😂', '😍', '🥰', '😘', '😊', '🤗',
    '🥳', '😎', '🤩', '😭', '😅', '🤔',
    '🙃', '😴', '🤤', '😡', '💩', '🙏',
    '👏', '💪', '👍', '👌', '🤝', '🔥',
    '❤️', '💯', '✨', '🎉', '🚀', '🎯',
];

interface AdminThread {
    id: number;
    partnerName: string;
    partnerAvatar?: string | null;
    partnerId: number | null;
    subLabel?: string;
    lastMessageTime?: string;
    hasUnread?: boolean;
}

function HostAvatar({ avatar, name, className = '' }: { avatar?: string | null; name?: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    const src = getValidSrc(avatar);
    const showImage = !!avatar && src !== '/placeholder.jpg' && !failed;

    useEffect(() => {
        setFailed(false);
    }, [avatar]);

    return (
        <div className={`w-full h-full flex items-center justify-center bg-gray-900 text-white font-bold text-xl uppercase overflow-hidden relative ${className}`}>
            {showImage ? (
                <Image
                    src={src}
                    alt={name || 'Avatar'}
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized={src.startsWith('/uploads/')}
                    onError={() => setFailed(true)}
                />
            ) : (
                <span>{(name?.trim()?.[0]) || '?'}</span>
            )}
        </div>
    );
}

function formatTime(value?: string) {
    if (!value) return '';
    try {
        const date = new Date(value);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 86400000 && now.getDate() === date.getDate()) {
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
        return value;
    }
}

export default function AdminInboxPage() {
    const [threads, setThreads] = useState<AdminThread[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [activeView, setActiveView] = useState<'list' | 'chat'>('list');

    const [sending, setSending] = useState(false);
    const [draftMessage, setDraftMessage] = useState('');

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const adminIdRef = useRef<number>(0);
    const activeThreadRef = useRef<AdminThread | null>(null);
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const sendingRef = useRef(false);

    const activeThread = useMemo(
        () => threads.find(t => t.id === activeThreadId) || null,
        [threads, activeThreadId]
    );

    useEffect(() => { activeThreadRef.current = activeThread; }, [activeThread]);

    const filteredThreads = useMemo(() => {
        const filtered = threads.filter(
            t => t.partnerName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        filtered.sort((a, b) => {
            if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1;
            const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return t2 - t1;
        });
        return filtered;
    }, [threads, searchTerm]);

    const scrollToBottom = () => {
        if (messageContainerRef.current) {
            const { scrollHeight, clientHeight } = messageContainerRef.current;
            messageContainerRef.current.scrollTop = scrollHeight - clientHeight;
        }
    };

    useEffect(() => {
        const t = setTimeout(scrollToBottom, 80);
        return () => clearTimeout(t);
    }, [messages, activeThreadId, loadingMessages]);

    const fetchThreads = useCallback(async () => {
        const adminId = typeof window !== 'undefined'
            ? Number(localStorage.getItem('adminId') || localStorage.getItem('userId'))
            : 0;
        if (!adminId) return [];
        adminIdRef.current = adminId;
        try {
            const data = await messageAPI.listAdminThreads(adminId);
            const mapped: AdminThread[] = (Array.isArray(data) ? data : []).map((t: any) => ({
                id: t.partner?.maNguoiDung,
                partnerName: t.partner?.hoTen || 'Chủ nhà',
                partnerAvatar: t.partner?.urlAnhDaiDien || null,
                partnerId: t.partner?.maNguoiDung ?? null,
                subLabel: t.lastMessage || 'Bắt đầu hội thoại hỗ trợ',
                lastMessageTime: t.lastMessageTime,
                hasUnread: !!t.hasUnread,
            }));
            setThreads(mapped);
            return mapped;
        } catch (e) {
            console.error(e);
            return [];
        }
    }, []);

    const loadThread = useCallback(async (thread: AdminThread) => {
        const adminId = adminIdRef.current;
        if (!adminId) return;
        setActiveThreadId(thread.id);
        setActiveView('chat');
        setLoadingMessages(true);
        setMessages([]);
        try {
            const data = await messageAPI.listAdminThread(adminId, thread.partnerId as number);
            const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) =>
                new Date(a.ngayTao).getTime() - new Date(b.ngayTao).getTime()
            );
            setMessages(sorted);
            await messageAPI.readAllAdminThread(adminId, thread.partnerId as number);
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, hasUnread: false } : t
            ));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('chat-messages-updated'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    const handleIncoming = useCallback((message: Message & { isAdminThread?: boolean }) => {
        // Read receipt: người nhận đã đọc → đổi tin của mình thành 2 tích (daDoc = true)
        if ((message as any)?.isReadReceipt) {
            const ids = new Set<number>((message as any).messageIds || []);
            if (ids.size) {
                setMessages(prev => prev.map(m => (m.maTinNhan != null && ids.has(m.maTinNhan)) ? { ...m, daDoc: true } : m));
            }
            return;
        }
        if (!message?.isAdminThread || !adminIdRef.current) return;
        const isMine = message.nguoiGui?.maNguoiDung === adminIdRef.current;
        const involved = message.nguoiGui?.maNguoiDung === adminIdRef.current || message.nguoiNhan?.maNguoiDung === adminIdRef.current;
        if (!involved) return;
        if (isMine) return;

        const otherId = message.nguoiGui?.maNguoiDung;
        if (!otherId) return;
        const isSelected = activeThreadRef.current?.id === otherId;

        if (isSelected) {
            setMessages(prev => {
                if (message.maTinNhan && prev.some(m => m.maTinNhan === message.maTinNhan)) return prev;
                return [...prev, message];
            });
            messageAPI.readAllAdminThread(adminIdRef.current, otherId);
        } else {
            setThreads(prev => prev.map(t =>
                t.id === otherId
                    ? { ...t, subLabel: message.noiDung, lastMessageTime: message.ngayTao, hasUnread: true }
                    : t
            ));
        }
        fetchThreads();
    }, [fetchThreads]);

    useEffect(() => {
        const init = async () => {
            setLoadingConversations(true);
            const data = await fetchThreads();
            setLoadingConversations(false);
            if (data && data.length > 0) {
                const first = data.find(t => t.hasUnread) || data[0];
                loadThread(first);
            }
        };
        init();

        const adminId = typeof window !== 'undefined'
            ? Number(localStorage.getItem('adminId') || localStorage.getItem('userId'))
            : 0;
        if (adminId) {
            webSocketService.connect(adminId, handleIncoming, () => { });
        }

        return () => {
            webSocketService.removeMessageHandler(adminId, handleIncoming);
        };
    }, [fetchThreads, handleIncoming, loadThread]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await messageAPI.upload(formData);
            return res;
        } catch (error) {
            console.error('Upload failed', error);
            throw error;
        }
    };

    const handleSend = async (stickerEmoji?: string) => {
        if ((!draftMessage.trim() && !selectedFile && !stickerEmoji) || !activeThread || sending) return;
        if (sendingRef.current) return;
        sendingRef.current = true;
        const adminId = adminIdRef.current;
        if (!adminId) { sendingRef.current = false; return; }
        setSending(true);
        try {
            let fileData = null;
            if (selectedFile) {
                fileData = await uploadFile(selectedFile);
            }
            const sent = await messageAPI.sendAdminThread({
                maNguoiGui: adminId,
                maNguoiNhan: activeThread.partnerId as number,
                noiDung: stickerEmoji || draftMessage.trim() || (selectedFile ? 'Đã gửi một tệp đính kèm' : ''),
                fileUrl: stickerEmoji ? stickerEmoji : fileData?.url,
                fileType: stickerEmoji ? 'STICKER' : fileData ? (String(fileData?.fileType || '').startsWith('image/') ? 'IMAGE' : 'FILE') : undefined,
            });
            if (sent) {
                setMessages(prev => {
                    if (sent.maTinNhan && prev.some(m => m.maTinNhan === sent.maTinNhan)) return prev;
                    return [...prev, sent];
                });
                setThreads(prev => prev.map(t =>
                    t.id === activeThread.id
                        ? { ...t, subLabel: sent.noiDung, lastMessageTime: sent.ngayTao }
                        : t
                ));
            }
            setDraftMessage('');
            setSelectedFile(null);
            setShowEmojiPicker(false);
            setShowStickerPicker(false);
        } catch (error) {
            console.error('Send error', error);
        } finally {
            sendingRef.current = false;
            setSending(false);
        }
    };

    const onEmojiClick = (emojiObject: any) => {
        setDraftMessage(prev => prev + emojiObject.emoji);
    };

    return (
        <div className="admin-container admin-page-content relative admin-page-enter">
            <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#FF385C] mb-1">Hộp thư</p>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hỗ trợ chủ nhà</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Trả lời thắc mắc về nội quy, quy định và xử lý phòng bị khóa của chủ nhà
                    </p>
                </div>
                <button
                    onClick={fetchThreads}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333] rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Làm mới
                </button>
            </div>

            <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-3xl overflow-hidden flex flex-col shadow-xl" style={{ height: 'clamp(500px, 75vh, 800px)' }}>
                <div className="flex flex-col lg:flex-row h-full">
                    {/* Sidebar — danh sách chủ nhà */}
                    <aside className={`w-full lg:w-[300px] border-r border-gray-200 dark:border-[#2a2a2a] flex flex-col bg-white dark:bg-[#161616] transition-all duration-300 ${activeView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
                        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-[#2a2a2a] flex justify-between items-center bg-white dark:bg-[#161616]">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Trò chuyện</h2>
                            <div className="flex gap-1">
                                <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-600 dark:text-gray-400 transition-colors" title="Cài đặt"><FiSettings className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="px-4 py-3 bg-white dark:bg-[#161616] border-b border-gray-100 dark:border-[#2a2a2a] relative">
                            <div className="relative group">
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                                <input
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-gray-900 dark:text-gray-100"
                                    placeholder="Tìm kiếm chủ nhà..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-hide">
                            {loadingConversations ? (
                                <div className="flex-1 space-y-4 p-4">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                                            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/10 flex-shrink-0"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-gray-100 dark:bg-white/10 rounded w-1/2"></div>
                                                <div className="h-3 bg-gray-50 dark:bg-white/5 rounded w-3/4"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredThreads.length > 0 ? (
                                filteredThreads.map(thread => (
                                    <div
                                        key={thread.id}
                                        onClick={() => loadThread(thread)}
                                        className={`flex items-center gap-4 p-4 cursor-pointer transition-all border-l-4 ${activeThreadId === thread.id ? 'bg-gray-50 dark:bg-white/5 border-black dark:border-white' : 'hover:bg-gray-50/80 dark:hover:bg-white/5 border-transparent'}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-100 dark:border-[#333] shadow-sm relative bg-gray-100 dark:bg-white/5">
                                                <HostAvatar avatar={thread.partnerAvatar} name={thread.partnerName} />
                                            </div>
                                            {thread.hasUnread && (
                                                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-[#FF385C] rounded-full border-2 border-white dark:border-[#161616] z-10 shadow-sm"></div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h3 className={`text-[15px] truncate ${thread.hasUnread ? 'font-black text-gray-900 dark:text-gray-100' : 'font-bold text-gray-900 dark:text-gray-200'}`}>
                                                    {thread.partnerName}
                                                </h3>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter ml-2">{formatTime(thread.lastMessageTime)}</span>
                                            </div>
                                            <p className={`text-sm truncate leading-tight ${thread.hasUnread ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {thread.subLabel}
                                            </p>
                                            <div className="mt-1 flex items-center gap-1.5 opacity-60">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest truncate">Chủ nhà</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                                    <FiX className="w-12 h-12 text-gray-200 dark:text-white/10 mb-4" />
                                    <p className="text-sm text-gray-400 font-medium italic">Không có hội thoại hỗ trợ nào</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Chat Area */}
                    <main className={`flex-1 min-w-0 flex flex-col bg-white dark:bg-[#161616] h-full relative transition-all duration-300 ${activeView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
                        {activeThread ? (
                            <>
                                {/* Header */}
                                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 dark:border-[#2a2a2a] flex items-center gap-3 bg-white dark:bg-[#161616] z-10 shadow-sm">
                                    <button
                                        onClick={() => setActiveView('list')}
                                        className="lg:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-[#333] shadow-sm bg-gray-100 dark:bg-white/5">
                                        <HostAvatar avatar={activeThread.partnerAvatar} name={activeThread.partnerName} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 truncate">
                                                {activeThread.partnerName}
                                            </h3>
                                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">CHỦ NHÀ</span>
                                        </div>
                                        <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                            <span className="text-gray-500">Hội thoại hỗ trợ nền tảng</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-600 dark:text-gray-400 transition-colors"><FiSearch className="w-5 h-5" /></button>
                                        <button className="hidden sm:block p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-600 dark:text-gray-400 transition-colors"><FiMoreHorizontal className="w-5 h-5" /></button>
                                    </div>
                                </div>

                                {/* Tin nhắn */}
                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/50 dark:bg-transparent scroll-smooth" ref={messageContainerRef}>
                                    {loadingMessages ? (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF385C]" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                                                <FiPaperclip className="w-8 h-8 text-gray-300 dark:text-white/20" />
                                            </div>
                                            <p className="font-medium text-gray-500 dark:text-gray-400">Chưa có tin nhắn nào</p>
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => {
                                            const isMine = msg.nguoiGui?.maNguoiDung === adminIdRef.current;
                                            const isSticker = msg.fileType === 'STICKER';
                                            const prev = messages[idx - 1];
                                            const showTime = idx === 0 ||
                                                (prev?.ngayTao && msg.ngayTao &&
                                                    new Date(msg.ngayTao).getTime() - new Date(prev.ngayTao).getTime() > 300000);

                                            return (
                                                <div key={msg.maTinNhan || idx} className="space-y-2">
                                                    {showTime && (
                                                        <div className="flex justify-center my-4">
                                                            <span className="text-[11px] bg-white dark:bg-[#222] border border-gray-100 dark:border-[#333] text-gray-500 dark:text-gray-400 font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                                                                {msg.ngayTao
                                                                    ? new Date(msg.ngayTao).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                                    : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                        <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                                                            {isSticker ? (
                                                                <>
                                                                    <div className="text-6xl leading-none select-none" title="Sticker">
                                                                        {msg.noiDung}
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-400 font-medium mt-1">
                                                                        {msg.ngayTao ? new Date(msg.ngayTao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                            <>
                                                            <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${isMine
                                                                ? 'bg-[#FF385C] text-white rounded-br-md'
                                                                : 'bg-white dark:bg-[#222] border border-gray-200 dark:border-[#333] text-gray-800 dark:text-gray-200 rounded-bl-md'
                                                                }`}>
                                                                {msg.fileUrl && msg.fileType === 'IMAGE' && (
                                                                    <div className={`${msg.noiDung && !['Đã gửi file', 'Đã gửi một tệp đính kèm', 'Đã gửi một tệp đính kèm.'].includes(msg.noiDung) ? 'mb-3' : ''}`}>
                                                                        <div className="rounded-xl overflow-hidden border border-gray-200/20 relative max-w-sm aspect-auto min-h-[100px]">
                                                                            <Image
                                                                                src={getValidSrc(msg.fileUrl.startsWith('http') ? msg.fileUrl : `/uploads${msg.fileUrl.startsWith('/uploads') ? msg.fileUrl.substring(8) : msg.fileUrl}`)}
                                                                                alt="Attachment"
                                                                                width={400}
                                                                                height={300}
                                                                                className="w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                                                                                onClick={() => {
                                                                                    const fullPath = msg.fileUrl!.startsWith('http') ? msg.fileUrl! : `/uploads${msg.fileUrl!.startsWith('/uploads') ? msg.fileUrl!.substring(8) : msg.fileUrl!}`;
                                                                                    window.open(fullPath, '_blank');
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {msg.fileUrl && msg.fileType === 'FILE' && (
                                                                    <a
                                                                        href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `/uploads${msg.fileUrl.startsWith('/uploads') ? msg.fileUrl.substring(8) : msg.fileUrl}`}
                                                                        target="_blank"
                                                                        className="flex items-center gap-3 bg-gray-50/10 p-3 rounded-xl border border-white/10 hover:bg-gray-50/20 transition-colors"
                                                                    >
                                                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-black">
                                                                            <FiPaperclip className="w-5 h-5" />
                                                                        </div>
                                                                        <div className="flex flex-col overflow-hidden">
                                                                            <span className={`text-xs font-bold truncate ${isMine ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>Tập đính kèm</span>
                                                                            <span className="text-[10px] opacity-60 font-medium">Click để tải về</span>
                                                                        </div>
                                                                    </a>
                                                                )}
                                                                {msg.noiDung && !['Đã gửi file', 'Đã gửi một tệp đính kèm', 'Đã gửi một tệp đính kèm.'].includes(msg.noiDung) && (
                                                                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.noiDung}</p>
                                                                )}
                                                            </div>
                                                            <div className={`flex items-center gap-2 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                                                <span className="text-[10px] text-gray-400 font-medium">
                                                                    {msg.ngayTao ? new Date(msg.ngayTao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                </span>
                                                                {isMine && (
                                                                    msg.daDoc ? (
                                                                        <span className="relative inline-block w-[20px] h-4 text-blue-500" title="Đã đọc">
                                                                            <svg className="w-4 h-4 absolute -left-[3px] top-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                            <svg className="w-4 h-4 absolute left-[3px] top-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                        </span>
                                                                    ) : (
                                                                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                    )
                                                                )}
                                                            </div>
                                                            </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Khung nhập */}
                                <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#161616]">
                                    {selectedFile && (
                                        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-[#333] rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                                            <div className="w-10 h-10 bg-white dark:bg-[#222] rounded-lg flex items-center justify-center shadow-sm text-black dark:text-white">
                                                <FiImage className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{selectedFile.name}</p>
                                                <p className="text-[10px] text-gray-400 font-medium tracking-tight">Sẵn sàng để gửi</p>
                                            </div>
                                            <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all"><FiX className="w-5 h-5" /></button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 sm:gap-3 relative">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <button
                                                onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                                                className={`p-3 rounded-full transition-all flex-shrink-0 active:scale-90 ${showStickerPicker ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'}`}
                                                title="Sticker"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20.245c-3.667-.5-6.4-3.24-6.9-6.9C2.6 10.85 3.3 8.5 5 6.5c1.7-2 4.3-3.3 7-3.3 3.4 0 6.4 1.9 7.6 5 .6 1.6.9 3.3.8 5-0.7 0-1.3.5-1.4 1.2-.1.7.3 1.3.9 1.6-.8.6-1.7 1.1-2.7 1.5-1 .4-2.1.7-3.2.7-1 0-1.9-.1-2.9-.3l-.1.3a2.1 2.1 0 01-2.2 1.5z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.5 4.5v3a2 2 0 002 2h3" />
                                                </svg>
                                            </button>
                                            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-full transition-all flex-shrink-0 active:scale-90">
                                                <FiImage className="w-5 h-5" />
                                            </button>
                                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />

                                            <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }} className="p-3 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-black dark:hover:text-white rounded-full transition-all flex-shrink-0 active:scale-90 hidden sm:flex">
                                                <FiSmile className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {showStickerPicker && (
                                            <div className="absolute bottom-20 left-0 z-50 w-[320px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#222] rounded-2xl border border-gray-100 dark:border-[#333] shadow-2xl p-3 animate-in slide-in-from-bottom-4 duration-200">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sticker</p>
                                                <div className="grid grid-cols-6 gap-1">
                                                    {STICKERS.map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => handleSend(s)}
                                                            className="w-full aspect-square flex items-center justify-center text-3xl rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {showEmojiPicker && (
                                            <div className="absolute bottom-20 left-0 z-50 shadow-2xl rounded-2xl border border-gray-100 dark:border-[#333] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                                                <EmojiPicker onEmojiClick={onEmojiClick} width={320} height={400} />
                                            </div>
                                        )}

                                        <div className={`flex-1 rounded-2xl flex items-center px-2 transition-all group bg-gray-100 dark:bg-white/5 hover:bg-gray-200/60 dark:hover:bg-white/10 focus-within:bg-white dark:focus-within:bg-[#222] focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-white/20`}>
                                            <textarea
                                                value={draftMessage}
                                                onChange={e => setDraftMessage(e.target.value)}
                                                placeholder={`Trả lời ${activeThread.partnerName}...`}
                                                className="w-full bg-transparent border-none focus:ring-0 resize-none px-3 py-2.5 max-h-32 text-[15px] font-medium text-gray-800 dark:text-gray-200 placeholder-gray-400 disabled:cursor-not-allowed"
                                                rows={1}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                            />
                                        </div>

                                        <button
                                            onClick={() => handleSend()}
                                            disabled={sending || (!draftMessage.trim() && !selectedFile)}
                                            className="p-3.5 bg-[#FF385C] text-white rounded-2xl hover:bg-[#E31C5F] hover:shadow-lg transition-all active:scale-95 disabled:opacity-20 disabled:scale-100 disabled:shadow-none flex-shrink-0"
                                        >
                                            <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current rotate-45 -translate-y-0.5"><path d="M2.5 16.5a.5.5 0 0 1 .5-.5h20.59l-5.3-5.3a.5.5 0 1 1 .71-.7l6.17 6.16a.5.5 0 0 1 0 .7L16.5 23a.5.5 0 1 1-.71-.7l5.3-5.3H1a.5.5 0 0 1-.5-.5z"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-4">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                                    <FiPaperclip className="w-10 h-10 text-gray-200 dark:text-white/15" />
                                </div>
                                <p className="font-medium text-gray-500 dark:text-gray-400">Chọn một cuộc trò chuyện để bắt đầu</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}