'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { messageAPI, Message } from '@/lib/api';
import { webSocketService } from '@/lib/websocket';
import Image from 'next/image';
import { getValidSrc } from '@/lib/image';
import { FiPaperclip, FiSmile, FiImage, FiX } from 'react-icons/fi';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface AdminInfo {
    maNguoiDung: number;
    hoTen: string;
    urlAnhDaiDien?: string;
}

const TOPIC_CHIPS = [
    {
        label: 'Nội quy & quy định',
        icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M12 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7l-5-4z" />
            </svg>
        ),
    },
    {
        label: 'Phòng bị khóa',
        icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        ),
    },
    {
        label: 'Thanh toán / phí dịch vụ',
        icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h2m4 0h4M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
            </svg>
        ),
    },
    {
        label: 'Câu hỏi khác',
        icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
];

const STICKERS = [
    '😂', '😍', '🥰', '😘', '😊', '🤗',
    '🥳', '😎', '🤩', '😭', '😅', '🤔',
    '🙃', '😴', '🤤', '😡', '💩', '🙏',
    '👏', '💪', '👍', '👌', '🤝', '🔥',
    '❤️', '💯', '✨', '🎉', '🚀', '🎯',
];

export default function HostAdminChatWidget() {
    const [open, setOpen] = useState(false);
    const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const userIdRef = useRef<number>(0);
    const adminIdRef = useRef<number>(0);
    const openRef = useRef(false);
    const sendingRef = useRef(false);
    openRef.current = open;

    const scrollToBottom = useCallback(() => {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, []);

    const checkUnread = useCallback(async () => {
        const userId = userIdRef.current;
        if (!userId || !adminIdRef.current) return;
        try {
            const threads = await messageAPI.listAdminThreads(userId);
            setHasUnread(threads.some((t: any) => t.hasUnread));
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchThread = useCallback(async () => {
        const userId = userIdRef.current;
        if (!userId || !adminIdRef.current) return;
        try {
            const data = await messageAPI.listAdminThread(userId, adminIdRef.current);
            setMessages(data);
            const unread = data.filter(m => m.nguoiNhan?.maNguoiDung === userId && !m.daDoc).length;
            setHasUnread(unread > 0);
            if (unread > 0) {
                await messageAPI.readAllAdminThread(userId, adminIdRef.current);
            }
            scrollToBottom();
        } catch (e) {
            console.error(e);
        }
    }, [scrollToBottom]);

    const handleIncoming = useCallback((message: Message & { isAdminThread?: boolean }) => {
        // Read receipt: người nhận đã đọc → đổi tin của mình thành 2 tích (daDoc = true)
        if ((message as any)?.isReadReceipt) {
            const ids = new Set<number>((message as any).messageIds || []);
            if (ids.size) {
                setMessages(prev => prev.map(m => (m.maTinNhan != null && ids.has(m.maTinNhan)) ? { ...m, daDoc: true } : m));
            }
            return;
        }
        if (!message?.isAdminThread) return;
        const userId = userIdRef.current;
        const involved = message.nguoiGui?.maNguoiDung === userId || message.nguoiNhan?.maNguoiDung === userId;
        if (!involved) return;
        const isMine = message.nguoiGui?.maNguoiDung === userId;
        if (openRef.current) {
            setMessages(prev => {
                if (message.maTinNhan && prev.some(m => m.maTinNhan === message.maTinNhan)) return prev;
                return [...prev, message];
            });
            if (!isMine && adminIdRef.current) {
                messageAPI.readAllAdminThread(userId, adminIdRef.current);
            }
            scrollToBottom();
        } else if (!isMine) {
            setHasUnread(true);
        }
    }, [scrollToBottom]);

    useEffect(() => {
        const userId = typeof window !== 'undefined' ? Number(localStorage.getItem('userId')) : 0;
        if (!userId) return;
        userIdRef.current = userId;

        const init = async () => {
            try {
                const info = await messageAPI.getAdminInfo();
                setAdminInfo(info);
                adminIdRef.current = info.maNguoiDung;
                setLoading(false);
                checkUnread();
                if (openRef.current) await fetchThread();
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        init();

        webSocketService.connect(userId, handleIncoming, () => { });

        window.addEventListener('ws-chat-message', (e: Event) => handleIncoming((e as CustomEvent).detail));
        const pollInterval = setInterval(checkUnread, 30000);

        return () => {
            webSocketService.removeMessageHandler(userId, handleIncoming);
            window.removeEventListener('ws-chat-message', (e: Event) => handleIncoming((e as CustomEvent).detail));
            clearInterval(pollInterval);
        };
    }, [handleIncoming, checkUnread, fetchThread]);

    const handleOpen = async () => {
        setOpen(true);
        await fetchThread();
        const userId = userIdRef.current;
        if (userId && adminIdRef.current) {
            await messageAPI.readAllAdminThread(userId, adminIdRef.current);
            setHasUnread(false);
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

    const sendMessage = async (payload: { noiDung: string; fileUrl?: string; fileType?: string }) => {
        const userId = userIdRef.current;
        if (!userId || !adminIdRef.current || sendingRef.current) return null;
        sendingRef.current = true;
        setSending(true);
        try {
            const sent = await messageAPI.sendAdminThread({
                maNguoiGui: userId,
                maNguoiNhan: adminIdRef.current,
                ...payload,
            });
            if (sent) {
                setMessages(prev => {
                    if (sent.maTinNhan && prev.some(m => m.maTinNhan === sent.maTinNhan)) return prev;
                    return [...prev, sent];
                });
                setInput('');
                setSelectedFile(null);
                setShowEmojiPicker(false);
                setShowStickerPicker(false);
                scrollToBottom();
            }
            return sent;
        } catch (e) {
            console.error(e);
            return null;
        } finally {
            sendingRef.current = false;
            setSending(false);
        }
    };

    const handleSend = async () => {
        const text = input.trim();
        if ((!text && !selectedFile) || sending) return;
        let fileData = null;
        if (selectedFile) {
            fileData = await uploadFile(selectedFile).catch(() => null);
            if (!fileData) return;
        }
        await sendMessage({
            noiDung: text || (selectedFile ? 'Đã gửi một tệp đính kèm' : ''),
            fileUrl: fileData?.url,
            fileType: fileData ? (String(fileData?.fileType || '').startsWith('image/') ? 'IMAGE' : 'FILE') : undefined,
        });
    };

    const handleSendSticker = async (emoji: string) => {
        if (sending) return;
        await sendMessage({ noiDung: emoji, fileUrl: emoji, fileType: 'STICKER' });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const onEmojiClick = (emojiObject: any) => {
        setInput(prev => prev + emojiObject.emoji);
    };

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
        }).format(d);
    };

    const renderMessageContent = (m: Message) => {
        if (m.fileType === 'STICKER') {
            return (
                <div className="text-6xl leading-none select-none" title="Sticker">
                    {m.noiDung}
                </div>
            );
        }
        if (m.fileType === 'IMAGE' && m.fileUrl) {
            return (
                <div>
                    {m.noiDung && !['Đã gửi một tệp đính kèm', 'Đã gửi một tệp đính kèm.'].includes(m.noiDung) && (
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap mb-2">{m.noiDung}</p>
                    )}
                    <div className="rounded-xl overflow-hidden border border-gray-200/20 relative max-w-[220px] aspect-auto min-h-[80px]">
                        <Image
                            src={getValidSrc(m.fileUrl.startsWith('http') ? m.fileUrl : `/uploads${m.fileUrl.startsWith('/uploads') ? m.fileUrl.substring(8) : m.fileUrl}`)}
                            alt="Ảnh đính kèm"
                            width={400}
                            height={300}
                            className="w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => {
                                const fullPath = m.fileUrl!.startsWith('http') ? m.fileUrl! : `/uploads${m.fileUrl!.startsWith('/uploads') ? m.fileUrl!.substring(8) : m.fileUrl!}`;
                                window.open(fullPath, '_blank');
                            }}
                        />
                    </div>
                </div>
            );
        }
        if (m.fileType === 'FILE' && m.fileUrl) {
            return (
                <a
                    href={m.fileUrl.startsWith('http') ? m.fileUrl : `/uploads${m.fileUrl.startsWith('/uploads') ? m.fileUrl.substring(8) : m.fileUrl}`}
                    target="_blank"
                    className="flex items-center gap-3 bg-gray-50/10 p-2.5 rounded-xl border border-white/10 hover:bg-gray-50/20 transition-colors"
                >
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-black">
                        <FiPaperclip className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-[11px] font-bold truncate text-white">Tập đính kèm</span>
                        <span className="text-[9px] opacity-60 font-medium">Click để tải về</span>
                    </div>
                </a>
            );
        }
        return <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.noiDung}</p>;
    };

    return (
        <>
            {/* Nút mở chat — cố định góc dưới bên phải */}
            <button
                onClick={() => (open ? setOpen(false) : handleOpen())}
                className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-[#FF385C] to-[#E61E4D] text-white shadow-lg shadow-[#FF385C]/30 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center"
                aria-label="Hỗ trợ nền tảng"
            >
                {open ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                    </svg>
                )}
                {!open && hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 text-slate-900 text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                        1
                    </span>
                )}
            </button>

            {/* Khung chat nổi */}
            {open && (
                <div className="fixed bottom-24 right-6 z-[90] w-[min(380px,calc(100vw-3rem))] h-[540px] max-h-[calc(100vh-8rem)] bg-white dark:bg-[#161616] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#2a2a2a] overflow-hidden flex flex-col">
                    {/* Header — trắng hồng, không tối */}
                    <div className="px-4 py-3 bg-gradient-to-r from-[#FFF0F3] to-[#FFE3E9] dark:from-[#2a151a] dark:to-[#261a1f] border-b border-[#FFD6DE]/60 dark:border-[#3a232a] flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF385C] to-[#E61E4D] flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden">
                                {adminInfo?.urlAnhDaiDien ? (
                                    <Image
                                        src={getValidSrc(adminInfo.urlAnhDaiDien)}
                                        alt={adminInfo?.hoTen || 'Admin'}
                                        width={40}
                                        height={40}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 1l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4z" />
                                    </svg>
                                )}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#161616]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                Trung tâm hỗ trợ nền tảng
                            </p>
                            <p className="text-[11px] text-[#E61E4D] dark:text-[#FF7A9C] flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                {adminInfo?.hoTen || 'Admin Airbnb'} • đang trực
                            </p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="flex-shrink-0 w-8 h-8 rounded-full bg-white/70 dark:bg-white/5 text-[#E61E4D] hover:bg-white dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Gợi ý chủ đề */}
                    <div className="px-3 py-2.5 bg-[#FFF7F8] dark:bg-white/[0.02] border-b border-[#FFE3E9]/60 dark:border-[#2a2a2a]">
                        <p className="text-[10px] uppercase tracking-wide font-bold text-[#E61E4D] dark:text-[#FF7A9C] mb-1.5">
                            Bạn cần hỗ trợ về?
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {TOPIC_CHIPS.map(chip => (
                                <button
                                    key={chip.label}
                                    onClick={() => setInput(prev => (prev ? `${prev}\n${chip.label}: ` : `${chip.label}: `))}
                                    className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-[#222] border border-[#FFD6DE] dark:border-[#333] text-[#C2174B] dark:text-[#FF9CB5] hover:border-[#FF385C] hover:text-[#FF385C] hover:shadow-sm transition-all"
                                >
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-[#FFE3E9] to-[#FFD6DE] dark:from-[#FF385C]/20 dark:to-[#E61E4D]/20 text-[#E61E4D] dark:text-[#FF9CB5] flex items-center justify-center transition-colors group-hover:from-[#FF385C] group-hover:to-[#E61E4D] group-hover:text-white">
                                        {chip.icon}
                                    </span>
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tin nhắn */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 bg-[#FEFBFB] dark:bg-transparent">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#FF385C]" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="w-14 h-14 rounded-full bg-[#FFE3E9] dark:bg-[#FF385C]/10 flex items-center justify-center mb-3">
                                    <svg className="w-7 h-7 text-[#FF385C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Chưa có hội thoại hỗ trợ</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[240px] leading-relaxed">
                                    Nhắn tin cho {adminInfo?.hoTen || 'admin'} khi cần hỏi về nội quy hoặc khi phòng của bạn bị khóa.
                                </p>
                            </div>
                        ) : (
                            messages.map((m, idx) => {
                                const mine = m.nguoiGui?.maNguoiDung === userIdRef.current;
                                const isAdmin = m.nguoiGui?.maNguoiDung === adminIdRef.current;
                                const isSticker = m.fileType === 'STICKER';
                                return (
                                    <div key={m.maTinNhan || idx} className={`flex items-end gap-2 mb-3 ${mine ? 'justify-end' : 'justify-start'}`}>
                                        {!mine && (
                                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#FF385C] to-[#E61E4D] flex items-center justify-center text-white text-[9px] font-bold overflow-hidden">
                                                {adminInfo?.urlAnhDaiDien ? (
                                                    <Image
                                                        src={getValidSrc(adminInfo.urlAnhDaiDien)}
                                                        alt=""
                                                        width={28}
                                                        height={28}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 1l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4z" />
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
                                            {!mine && isAdmin && (
                                                <span className="text-[9px] font-bold uppercase tracking-wide text-[#E61E4D] dark:text-[#FF7A9C] mb-1 block">
                                                    Admin
                                                </span>
                                            )}
                                            {isSticker ? (
                                                <div className={mine ? '' : ''}>
                                                    {renderMessageContent(m)}
                                                    <span className={`text-[9px] text-gray-400 mt-1 block ${mine ? 'text-right' : ''}`}>
                                                        <span className="inline-flex items-center gap-1">
                                                            {formatTime(m.ngayTao)}
                                                            {mine && (
                                                                m.daDoc ? (
                                                                    <span className="relative inline-block w-[16px] h-3 text-[#FF385C]" title="Đã đọc">
                                                                        <svg className="w-3 h-3 absolute -left-[3px] top-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                        <svg className="w-3 h-3 absolute left-[3px] top-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                        </span>
                                                                ) : (
                                                                    <svg className="w-3 h-3 text-[#FF385C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                )
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            ) : (
                                                <div
                                                    className={`px-3.5 py-2 text-[13px] leading-relaxed break-words whitespace-pre-wrap shadow-sm ${
                                                        mine
                                                            ? 'bg-gradient-to-br from-[#FF385C] to-[#E61E4D] text-white rounded-2xl rounded-br-sm'
                                                            : 'bg-white dark:bg-[#222] border border-[#FFE3E9] dark:border-[#333] text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-sm'
                                                    }`}
                                                >
                                                    {renderMessageContent(m)}
                                                </div>
                                            )}
                                            {!isSticker && (
                                                <span className={`text-[9px] text-gray-400 mt-1 block ${mine ? 'text-right' : ''}`}>
                                                    <span className="inline-flex items-center gap-1">
                                                        {formatTime(m.ngayTao)}
                                                        {mine && (
                                                            m.daDoc ? (
                                                                <span className="relative inline-block w-[16px] h-3 text-[#FF385C]" title="Đã đọc">
                                                                    <svg className="w-3 h-3 absolute -left-[3px] top-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                    <svg className="w-3 h-3 absolute left-[3px] top-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                    </span>
                                                            ) : (
                                                                <svg className="w-3 h-3 text-[#FF385C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                            )
                                                        )}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Khung nhập */}
                    <div className="px-3 py-2.5 border-t border-[#FFE3E9] dark:border-[#2a2a2a] bg-white dark:bg-[#161616]">
                        {selectedFile && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-[#FFF0F3] dark:bg-white/5 border border-[#FFD6DE] dark:border-[#333] rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                <div className="w-8 h-8 bg-white dark:bg-[#222] rounded-lg flex items-center justify-center shadow-sm text-[#E61E4D]">
                                    <FiImage className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">{selectedFile.name}</p>
                                    <p className="text-[9px] text-gray-400 font-medium tracking-tight">Sẵn sàng để gửi</p>
                                </div>
                                <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-full transition-all"><FiX className="w-4 h-4" /></button>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 relative">
                            {/* Toolbar: sticker + emoji + file */}
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                                    className="p-2 text-[#E61E4D] dark:text-[#FF7A9C] hover:bg-[#FFF0F3] dark:hover:bg-white/5 rounded-full transition-all active:scale-90"
                                    title="Sticker"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20.245c-3.667-.5-6.4-3.24-6.9-6.9C2.6 10.85 3.3 8.5 5 6.5c1.7-2 4.3-3.3 7-3.3 3.4 0 6.4 1.9 7.6 5 .6 1.6.9 3.3.8 5-0.7 0-1.3.5-1.4 1.2-.1.7.3 1.3.9 1.6-.8.6-1.7 1.1-2.7 1.5-1 .4-2.1.7-3.2.7-1 0-1.9-.1-2.9-.3l-.1.3a2.1 2.1 0 01-2.2 1.5z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.5 4.5v3a2 2 0 002 2h3" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
                                    className="p-2 text-[#E61E4D] dark:text-[#FF7A9C] hover:bg-[#FFF0F3] dark:hover:bg-white/5 rounded-full transition-all active:scale-90"
                                    title="Emoji"
                                >
                                    <FiSmile className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-[#E61E4D] dark:text-[#FF7A9C] hover:bg-[#FFF0F3] dark:hover:bg-white/5 rounded-full transition-all active:scale-90"
                                    title="Đính kèm ảnh"
                                >
                                    <FiImage className="w-5 h-5" />
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />
                            </div>

                            {/* Sticker picker */}
                            {showStickerPicker && (
                                <div className="absolute bottom-14 left-0 z-50 w-full bg-white dark:bg-[#222] border border-[#FFD6DE] dark:border-[#333] rounded-2xl shadow-2xl p-3 animate-in slide-in-from-bottom-4 duration-200">
                                    <p className="text-[10px] uppercase tracking-wide font-bold text-[#E61E4D] dark:text-[#FF7A9C] mb-2">
                                        Sticker
                                    </p>
                                    <div className="grid grid-cols-6 gap-1">
                                        {STICKERS.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleSendSticker(s)}
                                                className="w-full aspect-square flex items-center justify-center text-3xl rounded-xl hover:bg-[#FFF0F3] dark:hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Emoji picker */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl border border-[#FFD6DE] dark:border-[#333] overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                                    <EmojiPicker
                                        onEmojiClick={emojiObject => {
                                            setInput(prev => prev + emojiObject.emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                        width={320}
                                        height={320}
                                    />
                                </div>
                            )}

                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Nhập nội dung cần hỗ trợ..."
                                disabled={!adminInfo}
                                className="flex-1 min-w-0 px-4 py-2.5 rounded-full text-[13px] bg-[#FFF0F3] dark:bg-white/5 border border-transparent focus:border-[#FF385C] focus:bg-white dark:focus:bg-[#222] focus:outline-none transition-all placeholder:text-gray-400"
                            />
                            <button
                                onClick={handleSend}
                                disabled={(!input.trim() && !selectedFile) || sending || !adminInfo}
                                className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#FF385C] to-[#E61E4D] hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-white/10 text-white flex items-center justify-center transition-all shadow-sm"
                            >
                                {sending ? (
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1.5 text-center">
                            Hỗ trợ bởi đội ngũ Admin nền tảng
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}