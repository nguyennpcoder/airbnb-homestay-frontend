'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { bookingAPI, messageAPI, quickReplyAPI, hostAPI, Message, QuickReply } from '@/lib/api';
import { FiFilter, FiSettings, FiSearch, FiMoreHorizontal, FiZap, FiPlus, FiTrash2, FiImage, FiSmile, FiX, FiPaperclip } from 'react-icons/fi';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import BackendImage from '@/components/BackendImage';
import RoomDetailsPanel from '@/components/RoomDetailsPanel';
import { getValidSrc } from '@/lib/image';
import EmptyState from './EmptyState';
import { FiMessageSquare } from 'react-icons/fi';
import BookingDetailsPanel from '@/components/BookingDetailsPanel';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const STICKERS = [
    '😂', '😍', '🥰', '😘', '😊', '🤗',
    '🥳', '😎', '🤩', '😭', '😅', '🤔',
    '🙃', '😴', '🤤', '😡', '💩', '🙏',
    '👏', '💪', '👍', '👌', '🤝', '🔥',
    '❤️', '💯', '✨', '🎉', '🚀', '🎯',
];

/** Hội thoại liên hệ trước đặt chỗ được định danh bằng id âm theo maPhong. */
const INQUIRY_BASE = 100000;
// ID hội thoại liên hệ mã hóa cả phòng lẫn đối tác — 2 khách hỏi cùng 1 phòng
// không được trùng id (tránh click khách này thấy hội thoại khách kia)
const inquiryConvId = (maPhong: number, partnerId?: number) => -(INQUIRY_BASE + maPhong * 10000 + (partnerId || 0));
const inquiryPhongId = (id: number) => Math.floor((-id - INQUIRY_BASE) / 10000);
const inquiryPartnerId = (id: number) => (-id - INQUIRY_BASE) % 10000;
const isInquiryConvId = (id: number) => id < 0 && id !== -1 && id !== -2;

// Types are now imported from @/lib/api

interface Conversation {
  id: number;

  guestName: string;
  guestId: number;
  guestAvatar?: string;
  propertyName: string;
  propertyImage?: string;
  statusLabel: string;
  lastMessageTime?: string;
  subLabel?: string;
  bookingData?: any;
  hasUnread?: boolean;
  isLocked?: boolean;
  lockReason?: string;
  /** Phòng của hội thoại liên hệ trước đặt chỗ (không có dat_cho). */
  roomId?: number;
  isInquiry?: boolean;
}

const getBookingStatusBadge = (status: string, bookingData?: any) => {
  // Pre-booking contact inquiry (created when guest messages without booking)
  const isInquiry = bookingData?.yeuCauDacBiet === 'LIEN_HE_PHONG'
    || (Number(bookingData?.tongTien || 0) === 0 && !bookingData?.ngayNhanPhong
        && ['CHO_XAC_NHAN', 'PENDING', 'NEW'].includes((status || '').toUpperCase()));
  if (isInquiry || ['NEW'].includes((status || '').toUpperCase())) {
    return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">Tin nhắn mới</span>;
  }
  const s = status?.toUpperCase() || '';
  if (['DA_XAC_NHAN', 'DA_THANH_TOAN', 'THANH_CONG', 'ACCEPTED', 'HOAN_THANH'].includes(s)) {
    return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">HOÀN THÀNH</span>;
  }
  if (['CHO_XAC_NHAN', 'PENDING'].includes(s)) {
    return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold">Đang chờ</span>;
  }
  if (['TU_CHOI', 'DA_HUY', 'CANCELLED', 'REJECTED'].includes(s)) {
    return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">Đã hủy</span>;
  }
  return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">{status}</span>;
};

// QuickReply is now imported from @/lib/api

interface HostMessagesPanelProps {
  userId?: number;
  onMessageRead?: () => void;
}

function formatTime(value?: string) {
  if (!value) return '';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  } catch {
    return value;
  }
}

function truncateTitle(text?: string, max = 40) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export default function HostMessagesPanel({ userId, onMessageRead }: HostMessagesPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [draftMessage, setDraftMessage] = useState('');

  // Quick Reply State
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showCreateReply, setShowCreateReply] = useState(false);
  const [newReplyShortcut, setNewReplyShortcut] = useState('');
  const [newReplyContent, setNewReplyContent] = useState('');

  // File & Emoji State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSidebar, setShowSidebar] = useState(true);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const cachedMessagesRef = useRef<Record<number, Message[]>>({});
  const activeConversationRef = useRef<number | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter(
      (c) =>
        c.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversations, searchTerm]);

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      const { scrollHeight, clientHeight } = messageContainerRef.current;
      messageContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  };

  // Scroll to bottom when messages update — useLayoutEffect fires after DOM mutations
  // but before paint, so the user never sees the scroll jump
  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => { activeConversationRef.current = activeConversationId; }, [activeConversationId]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Load Quick Replies
  useEffect(() => {
    if (userId) {
      quickReplyAPI.listByHost(userId)
        .then(data => setQuickReplies(Array.isArray(data) ? data : []))
        .catch(err => console.error("Failed to load quick replies", err));
    }
  }, [userId]);

  const createQuickReply = async () => {
    if (!newReplyShortcut || !newReplyContent || !userId) return;
    try {
      const saved = await quickReplyAPI.create({ maChuNha: userId, phimTat: newReplyShortcut, noiDung: newReplyContent });
      setQuickReplies([...quickReplies, saved]);
      setNewReplyShortcut('');
      setNewReplyContent('');
      setShowCreateReply(false);
      toast.success('Đã tạo câu trả lời nhanh');
    } catch (e) {
      toast.error('Lỗi khi tạo câu trả lời nhanh');
    }
  };

  const deleteQuickReply = async (id: number) => {
    try {
      await quickReplyAPI.delete(id);
      setQuickReplies(prev => prev.filter(q => q.id !== id));
    } catch (e) { toast.error('Lỗi xóa'); }
  };

  // --- Load Data ---
  const fetchConversations = useCallback(async (uid: number, isBackground = false) => {
    if (!isBackground) setLoadingConversations(true);
    try {
      const bookings = await hostAPI.getBookings(uid);
      const filteredSelf = (Array.isArray(bookings) ? bookings : []).filter((b: any) => {
        const guestId = b.nguoiDat?.maNguoiDung || b.nguoiDung?.maNguoiDung || b.maKhach;
        return guestId !== uid;
      });

      let mapped: Conversation[] = filteredSelf.map((b: any) => {
        const guestObj = b.nguoiDat || b.nguoiDung || b.khach;
        let guestName = guestObj?.hoTen;
        if (!guestName && (guestObj?.ho || guestObj?.ten)) {
          guestName = ((guestObj.ho || '') + ' ' + (guestObj.ten || '')).trim();
        }
        if (!guestName) guestName = 'Khách';

        const isInquiry = b.yeuCauDacBiet === 'LIEN_HE_PHONG'
          || (Number(b.tongTien || 0) === 0 && !b.ngayNhanPhong);

        return {
          id: b.maDatCho,
          guestName,
          guestId: guestObj?.maNguoiDung || b.maKhach,
          guestAvatar: guestObj?.urlAnhDaiDien || guestObj?.avatarUrl,
          propertyName: b.phong?.tieuDe,
          propertyImage: b.phong?.urlAnhChinh,
          statusLabel: isInquiry ? 'NEW' : (b.trangThaiDatCho || 'Đang diễn ra'),
          bookingData: b,
          subLabel: b.lastMessage || (isInquiry ? 'Tin liên hệ về phòng' : 'Chưa có tin nhắn'),
          lastMessageTime: b.lastMessageTime,
          hasUnread: b.hasUnread,
          isLocked: guestObj?.biKhoa === true,
          lockReason: guestObj?.lyDoKhoa || 'Vi phạm cộng đồng'
        };
      });

      // Hội thoại liên hệ trước đặt chỗ (tin_nhan.ma_phong — không tạo dat_cho)
      let inquiryConvs: Conversation[] = [];
      try {
        const inquiries = await messageAPI.listInquiries(uid);
        inquiryConvs = (Array.isArray(inquiries) ? inquiries : [])
          .filter((i: any) => i.chuNhaId === uid)
          .map((i: any) => ({
            id: inquiryConvId(i.maPhong, i.partner?.maNguoiDung),
            guestName: i.partner?.hoTen || 'Khách',
            guestId: i.partner?.maNguoiDung || 0,
            guestAvatar: i.partner?.urlAnhDaiDien,
            propertyName: i.tieuDe || 'Phòng',
            propertyImage: i.urlAnhChinh,
            statusLabel: 'NEW',
            subLabel: i.lastMessage || 'Tin liên hệ về phòng',
            lastMessageTime: i.lastMessageTime,
            hasUnread: i.hasUnread,
            roomId: i.maPhong,
            isInquiry: true,
          }));
      } catch (error) {
        console.error('Lỗi tải hội thoại liên hệ', error);
      }

      mapped = [...mapped, ...inquiryConvs];

      // Sort by last message time descending
      mapped.sort((a, b) => {
        const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return t2 - t1;
      });

      setConversations(mapped);

    } catch (error) {
      console.error(error);
    } finally {
      if (!isBackground) setLoadingConversations(false);
    }
  }, []);

  useEffect(() => { if (userId) fetchConversations(userId); }, [userId, fetchConversations]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  // --- Load Messages ---
  const loadMessages = useCallback(async (conversationId: number) => {
    if (!conversationId) return;

    // Check cache first
    const cached = cachedMessagesRef.current[conversationId];
    if (cached) {
      setMessages(cached);
      return;
    }

    setLoadingMessages(true);
    try {
      let data: Message[];
      if (isInquiryConvId(conversationId)) {
        // Hội thoại liên hệ (chưa đặt chỗ) — đọc từ tin_nhan theo phòng
        const conv = conversationsRef.current.find((c) => c.id === conversationId);
        if (!conv?.roomId || !conv.guestId || !userId) {
          setMessages([]);
          return;
        }
        data = await messageAPI.listByPhong(conv.roomId, userId, conv.guestId);
      } else {
        data = await messageAPI.listByBooking(conversationId);
        messageAPI.readAll(conversationId, userId!).catch(() => {});
      }
      const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) => {
        return new Date(a.ngayTao!).getTime() - new Date(b.ngayTao!).getTime();
      });
      cachedMessagesRef.current[conversationId] = sorted;
      setMessages(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);


  // --- WebSocket via custom events from parent page ---
  useEffect(() => {
    const handleIncoming = (e: Event) => {
      const message = (e as CustomEvent).detail as Message & {
        isInquiry?: boolean;
        yeuCauDacBiet?: string;
        maPhong?: number;
        tieuDePhong?: string;
        urlAnhChinh?: string;
      };
      if (!message) return;
      // Read receipt: người nhận đã đọc → đổi tin của mình thành 2 tích (daDoc = true)
      if ((message as any)?.isReadReceipt) {
        const ids = new Set<number>((message as any).messageIds || []);
        if (ids.size) {
          setMessages(prev => prev.map(m => (m.maTinNhan != null && ids.has(m.maTinNhan)) ? { ...m, daDoc: true } : m));
          Object.keys(cachedMessagesRef.current).forEach(key => {
            const list = cachedMessagesRef.current[Number(key)];
            if (list) {
              cachedMessagesRef.current[Number(key)] = list.map(m =>
                (m.maTinNhan != null && ids.has(m.maTinNhan)) ? { ...m, daDoc: true } : m
              );
            }
          });
        }
        return;
      }
      // Hội thoại liên hệ (chưa đặt chỗ) dùng id âm theo phòng + đối tác
      const isInquiryMsg = !!message?.isInquiry || message?.yeuCauDacBiet === 'LIEN_HE_PHONG';
      const partnerId = message.nguoiGui?.maNguoiDung === userId
        ? message.nguoiNhan?.maNguoiDung
        : message.nguoiGui?.maNguoiDung;
      const threadId = isInquiryMsg && message?.maPhong
        ? inquiryConvId(message.maPhong, partnerId)
        : message?.maDatCho;
      if (!threadId) return;

      // Deduplicate
      const existingCache = cachedMessagesRef.current[threadId] || [];
      if (message.maTinNhan && existingCache.some(m => m.maTinNhan === message.maTinNhan)) {
        return;
      }
      cachedMessagesRef.current[threadId] = [...existingCache, message];

      // If the active conversation matches, show the message immediately
      if (activeConversationRef.current === threadId) {
        setMessages(prev => {
          if (message.maTinNhan && prev.some(m => m.maTinNhan === message.maTinNhan)) return prev;
          return [...prev, message];
        });
      }

      // Update conversation list instantly (same path as booking-id chats)
      setConversations(prev => {
        const exists = prev.some(c => c.id === threadId);
        if (!exists) {
          const isInquiry = isInquiryMsg || message.yeuCauDacBiet === 'LIEN_HE_PHONG';
          const guest = message.nguoiGui?.maNguoiDung === userId ? message.nguoiNhan : message.nguoiGui;
          const optimistic: Conversation = {
            id: threadId,
            guestName: guest?.hoTen || 'Khách',
            guestId: guest?.maNguoiDung || 0,
            guestAvatar: (guest as any)?.urlAnhDaiDien,
            propertyName: message.tieuDePhong || 'Phòng',
            propertyImage: message.urlAnhChinh,
            statusLabel: isInquiry ? 'NEW' : 'PENDING',
            subLabel: message.noiDung,
            lastMessageTime: message.ngayTao,
            hasUnread: activeConversationRef.current !== threadId,
            roomId: isInquiry ? message.maPhong : undefined,
            isInquiry,
            bookingData: isInquiry ? undefined : {
              maDatCho: threadId,
              yeuCauDacBiet: message.yeuCauDacBiet || (isInquiry ? 'LIEN_HE_PHONG' : undefined),
              trangThaiDatCho: 'cho_xac_nhan',
              tongTien: isInquiry ? 0 : undefined,
              phong: message.maPhong ? {
                maPhong: message.maPhong,
                tieuDe: message.tieuDePhong,
                urlAnhChinh: message.urlAnhChinh,
              } : undefined,
              nguoiDat: guest,
            },
          };
          const next = [optimistic, ...prev];
          next.sort((a, b) => {
            const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return t2 - t1;
          });
          // Enrich from API in background (avatar, full booking details)
          if (userId) fetchConversations(userId, true);
          return next;
        }

        const updated = prev.map(c => {
          if (c.id === threadId) {
            return {
              ...c,
              subLabel: message.noiDung,
              lastMessageTime: message.ngayTao,
              hasUnread: activeConversationRef.current !== threadId
            };
          }
          return c;
        });
        updated.sort((a, b) => {
          const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return t2 - t1;
        });
        return updated;
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('host-incoming-message', handleIncoming);
      // Also listen to global WS event (works even if inbox page handler missed)
      window.addEventListener('ws-chat-message', handleIncoming);
      return () => {
        window.removeEventListener('host-incoming-message', handleIncoming);
        window.removeEventListener('ws-chat-message', handleIncoming);
      };
    }
  }, [userId, fetchConversations]);

  // --- Upload ---
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

  // --- Send ---
  const handleSend = async (stickerEmoji?: string) => {
    if ((!draftMessage.trim() && !selectedFile && !stickerEmoji) || !activeConversation || activeConversation.isLocked || !userId) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      let fileData = null;
      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      const payload: any = {
        maNguoiGui: userId,
        maNguoiNhan: activeConversation.guestId,
        noiDung: stickerEmoji || draftMessage.trim() || (selectedFile ? 'Đã gửi file' : ''),
        fileUrl: stickerEmoji ? stickerEmoji : fileData?.url,
        fileType: stickerEmoji ? 'STICKER' : fileData ? (String(fileData?.fileType || '').startsWith('image/') ? 'IMAGE' : 'FILE') : undefined
      };
      if (isInquiryConvId(activeConversation.id)) {
        if (!activeConversation.roomId) {
          toast.error('Thiếu mã phòng — không thể gửi tin liên hệ');
          return;
        }
        payload.maPhong = activeConversation.roomId;
      } else {
        payload.maDatCho = activeConversation.id;
      }
      const res = await messageAPI.send(payload);
      if (res) {
        const sentMessage: Message = Array.isArray(res) ? res[0] : res;
        setMessages(prev => [...prev, sentMessage]);
        cachedMessagesRef.current[activeConversation.id] = [
          ...(cachedMessagesRef.current[activeConversation.id] || []),
          sentMessage,
        ];
        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.id === activeConversation.id) {
              return {
                ...c,
                subLabel: sentMessage.noiDung,
                lastMessageTime: sentMessage.ngayTao,
              };
            }
            return c;
          });
          updated.sort((a, b) => {
            const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return t2 - t1;
          });
          return updated;
        });
      }
      setDraftMessage('');
      setSelectedFile(null);
      setShowEmojiPicker(false);
      setShowStickerPicker(false);
    } catch (error) {
      toast.error('Gửi thất bại');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setDraftMessage(prev => prev + emojiObject.emoji);
  };


  return (
    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden flex flex-col shadow-xl transition-all duration-500" style={{ height: 'clamp(500px, 80vh, 850px)' }}>
      <div className="flex flex-col lg:flex-row h-full">
        {/* Sidebar */}
        <aside className={`w-full lg:w-[300px] border-r border-gray-200 flex flex-col bg-white transition-all duration-300 ${!showSidebar && activeConversationId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-white">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Tin nhắn khách</h2>
            <div className="flex gap-1">
              <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors" title="Cài đặt"><FiSettings className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="px-4 py-3 bg-white border-b border-gray-100 relative">
            <div className="relative group">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-black transition-all"
                placeholder="Tìm kiếm theo tên khách..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loadingConversations ? (
              <div className="flex-1 space-y-4 p-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-50 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={async () => {
                    setActiveConversationId(conv.id);
                    setShowSidebar(false); // Hide sidebar on mobile after selecting
                    // Mark as read locally
                    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, hasUnread: false } : c));
                    // Call API
                    if (userId) {
                      try {
                        if (isInquiryConvId(conv.id) && conv.roomId) {
                          await messageAPI.readAllByPhong(conv.roomId, userId);
                        } else {
                          await messageAPI.readAll(conv.id, userId);
                        }
                        onMessageRead?.();
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new Event('notifications-updated'));
                          window.dispatchEvent(new Event('chat-messages-updated'));
                        }
                      } catch (e) {
                        console.error("Failed to mark read", e);
                      }
                    }
                  }}
                  className={`flex items-center gap-4 p-4 cursor-pointer transition-all border-l-4 ${conv.isLocked ? 'opacity-50 bg-gray-50/50' : ''} ${activeConversationId === conv.id ? 'bg-gray-50 border-black' : 'hover:bg-gray-50/80 border-transparent'}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-14 h-14 rounded-full overflow-hidden border border-gray-100 shadow-sm relative ${conv.isLocked ? 'bg-gray-200' : 'bg-gray-100'}`}>
                      {conv.guestAvatar ? (
                        <BackendImage
                          src={getValidSrc(conv.guestAvatar)}
                          alt={conv.guestName}
                          fill
                          className={`object-cover ${conv.isLocked ? 'grayscale' : ''}`}
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white font-bold text-xl uppercase">
                          {conv.guestName[0]}
                        </div>
                      )}
                    </div>
                    {conv.isLocked && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gray-400 rounded-full border-2 border-white z-10 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                    {!conv.isLocked && conv.hasUnread && (
                      <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-[#FF385C] rounded-full border-2 border-white z-10 shadow-sm"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`text-[15px] truncate ${conv.isLocked ? 'text-gray-400 font-semibold' : conv.hasUnread ? 'font-black text-black' : 'font-bold text-gray-900'}`}>
                        {conv.guestName}
                        {conv.isLocked && <span className="ml-1.5 text-[10px] text-gray-400 font-normal normal-case tracking-normal">Đã khóa</span>}
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter ml-2">{formatTime(conv.lastMessageTime)}</span>
                    </div>
                    <p className={`text-sm truncate leading-tight ${conv.isLocked ? 'text-gray-400 italic' : conv.hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {conv.isLocked ? 'Tài khoản đã ngừng hoạt động' : conv.subLabel}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 opacity-60">
                      {conv.isLocked ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-widest truncate">{conv.propertyName}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                <FiMessageSquare className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-sm text-gray-400 font-medium italic">Không tìm thấy cuộc trò chuyện</p>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <main className={`flex-1 min-w-0 flex flex-col bg-white h-full relative transition-all duration-300 ${showSidebar && activeConversationId ? 'hidden lg:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center gap-3 bg-white z-10 shadow-sm">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative border border-gray-100 shadow-sm">
                  <BackendImage src={getValidSrc(activeConversation.guestAvatar, '/placeholder-user.jpg')} alt="Guest" fill className="object-cover" sizes="48px" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">
                      {activeConversation.guestName}
                    </h3>
                    {getBookingStatusBadge(activeConversation.isInquiry ? 'NEW' : activeConversation.bookingData?.trangThaiDatCho, activeConversation.bookingData)}
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">
                    {activeConversation.isInquiry ? (
                      <span className="hidden sm:inline text-purple-500">TIN NHẮN VỀ PHÒNG</span>
                    ) : (
                      <>
                        <span className="hidden sm:inline">BOOKING #{activeConversation.id}</span>
                        <span className="hidden sm:inline"> · </span>
                      </>
                    )}
                    <span className="text-gray-500 truncate max-w-[280px] inline-block align-bottom">{truncateTitle(activeConversation.propertyName)}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><FiSearch className="w-5 h-5" /></button>
                  <button className="hidden sm:block p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><FiMoreHorizontal className="w-5 h-5" /></button>
                </div>
              </div>

              {activeConversation.isLocked && (
                <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Tài khoản đã ngừng hoạt động</p>
                    <p className="text-xs text-red-600 mt-0.5">Tài khoản của {activeConversation.guestName} đã bị khóa vì lý do: {activeConversation.lockReason}. Không thể gửi tin nhắn.</p>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/50 scroll-smooth" ref={messageContainerRef}>
                {messages.map((msg, idx) => {
                  const isMine = msg.nguoiGui?.maNguoiDung === userId;
                  const isSticker = msg.fileType === 'STICKER';
                  const showTime = idx === 0 || new Date(msg.ngayTao!).getTime() - new Date(messages[idx - 1].ngayTao!).getTime() > 300000;

                  return (
                    <div key={idx} className="space-y-2">
                      {showTime && (
                        <div className="flex justify-center my-4">
                          <span className="text-[11px] bg-white border border-gray-100 text-gray-500 font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                            {new Date(msg.ngayTao!).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
                                {new Date(msg.ngayTao!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </>
                          ) : (
                          <>
                          <div className={`relative px-4 py-3 rounded-2xl shadow-sm ${isMine
                            ? 'bg-[#FF385C] text-white rounded-br-md'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                            }`}>
                            {msg.fileUrl && msg.fileType === 'IMAGE' && (
                              <div className={`${msg.noiDung && !['Đã gửi file', 'Đã gửi một tệp đính kèm', 'Đã gửi một tệp đính kèm.'].includes(msg.noiDung) ? 'mb-3' : ''}`}>
                                <div className="rounded-xl overflow-hidden border border-gray-200/20 relative max-w-sm aspect-auto min-h-[100px]">
                                  <BackendImage
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
                                  <span className={`text-xs font-bold truncate ${isMine ? 'text-white' : 'text-gray-900'}`}>Tập đính kèm</span>
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
                              {new Date(msg.ngayTao!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                })}
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 bg-white">
                {/* Quick Replies Panel ... */}
                {showQuickReplies && (
                  <div className="mb-4 bg-gray-50/50 backdrop-blur-md rounded-2xl p-4 border border-gray-100 shadow-inner animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-black text-[10px] text-gray-400 uppercase tracking-widest">Câu trả lời nhanh</h4>
                      <button onClick={() => setShowCreateReply(!showCreateReply)} className="bg-gray-900 text-white hover:bg-black p-1.5 rounded-lg transition-all active:scale-90 shadow-sm"><FiPlus className="w-4 h-4" /></button>
                    </div>
                    {showCreateReply && (
                      <div className="mb-4 space-y-3 p-4 bg-white rounded-xl border border-gray-100 animate-in fade-in duration-200 shadow-sm">
                        <input className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-black transition-all" placeholder="Phím tắt (vd: /wifi)" value={newReplyShortcut} onChange={e => setNewReplyShortcut(e.target.value)} />
                        <textarea className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-black transition-all resize-none" rows={3} placeholder="Nội dung" value={newReplyContent} onChange={e => setNewReplyContent(e.target.value)} />
                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={() => setShowCreateReply(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors">Hủy</button>
                          <button onClick={createQuickReply} className="px-5 py-2 text-xs font-bold bg-black text-white rounded-lg hover:shadow-lg active:scale-95 transition-all">Lưu phím tắt</button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                      {quickReplies.map(qr => (
                        <div key={qr.id} className="flex justify-between items-center group cursor-pointer bg-white/50 border border-transparent hover:border-gray-200 hover:bg-white p-3 rounded-xl transition-all" onClick={() => { setDraftMessage(qr.noiDung); setShowQuickReplies(false); }}>
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900 text-xs mb-0.5">{qr.phimTat}</span>
                            <span className="text-gray-500 text-[11px] font-medium truncate max-w-[250px]">{qr.noiDung}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteQuickReply(qr.id); }} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><FiTrash2 size={14} /></button>
                        </div>
                      ))}
                      {quickReplies.length === 0 && <p className="text-[11px] text-gray-400 font-bold italic text-center py-4">Chưa có câu trả lời nhanh nào.</p>}
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 border border-gray-100 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-black">
                      <FiImage className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium tracking-tight">Sẵn sàng để gửi</p>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all"><FiX className="w-5 h-5" /></button>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Thời gian phản hồi TB: 15 phút
                  </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 relative">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => setShowQuickReplies(!showQuickReplies)} className={`p-3 rounded-full flex-shrink-0 transition-all active:scale-90 ${showQuickReplies ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100 hover:text-black'}`} title="Câu trả lời nhanh">
                      <FiZap className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                      className={`p-3 rounded-full flex-shrink-0 transition-all active:scale-90 ${showStickerPicker ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100 hover:text-black'}`}
                      title="Sticker"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20.245c-3.667-.5-6.4-3.24-6.9-6.9C2.6 10.85 3.3 8.5 5 6.5c1.7-2 4.3-3.3 7-3.3 3.4 0 6.4 1.9 7.6 5 .6 1.6.9 3.3.8 5-0.7 0-1.3.5-1.4 1.2-.1.7.3 1.3.9 1.6-.8.6-1.7 1.1-2.7 1.5-1 .4-2.1.7-3.2.7-1 0-1.9-.1-2.9-.3l-.1.3a2.1 2.1 0 01-2.2 1.5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.5 4.5v3a2 2 0 002 2h3" />
                      </svg>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:bg-gray-100 hover:text-black rounded-full transition-all flex-shrink-0 active:scale-90">
                      <FiImage className="w-5 h-5" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf" />

                    <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }} className="p-3 text-gray-400 hover:bg-gray-100 hover:text-black rounded-full transition-all flex-shrink-0 active:scale-90 hidden sm:flex">
                      <FiSmile className="w-5 h-5" />
                    </button>
                  </div>

                  {showStickerPicker && (
                    <div className="absolute bottom-20 left-0 z-50 w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-100 shadow-2xl p-3 animate-in slide-in-from-bottom-4 duration-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sticker</p>
                      <div className="grid grid-cols-6 gap-1">
                        {STICKERS.map(s => (
                          <button
                            key={s}
                            onClick={() => handleSend(s)}
                            className="w-full aspect-square flex items-center justify-center text-3xl rounded-xl hover:bg-gray-50 transition-all hover:scale-110 active:scale-95"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {showEmojiPicker && (
                    <div className="absolute bottom-20 left-0 z-50 shadow-2xl rounded-2xl border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                      <EmojiPicker onEmojiClick={onEmojiClick} width={320} height={400} />
                    </div>
                  )}

                  <div className={`flex-1 rounded-2xl flex items-center px-2 transition-all group ${activeConversation.isLocked ? 'bg-gray-50' : 'bg-gray-100 hover:bg-gray-200/60 focus-within:bg-white focus-within:ring-2 focus-within:ring-gray-300'}`}>
                    <textarea
                      value={draftMessage}
                      onChange={e => setDraftMessage(e.target.value)}
                      placeholder={activeConversation.isLocked ? 'Tài khoản đã bị khóa...' : 'Nhập tin nhắn...'}
                      disabled={activeConversation.isLocked}
                      className="w-full bg-transparent border-none focus:ring-0 resize-none px-3 py-2.5 max-h-32 text-[15px] font-medium text-gray-800 placeholder-gray-400 disabled:cursor-not-allowed"
                      rows={1}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                  </div>

                  <button
                    onClick={() => handleSend()}
                    disabled={sending || activeConversation.isLocked || (!draftMessage.trim() && !selectedFile)}
                    className="p-3.5 bg-[#FF385C] text-white rounded-2xl hover:bg-[#E31C5F] hover:shadow-lg transition-all active:scale-95 disabled:opacity-20 disabled:scale-100 disabled:shadow-none flex-shrink-0"
                  >
                    <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current rotate-45 -translate-y-0.5"><path d="M2.5 16.5a.5.5 0 0 1 .5-.5h20.59l-5.3-5.3a.5.5 0 1 1 .71-.7l6.17 6.16a.5.5 0 0 1 0 .7L16.5 23a.5.5 0 1 1-.71-.7l5.3-5.3H1a.5.5 0 0 1-.5-.5z"></path></svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Cửa sổ trò chuyện"
              subtitle="Chọn một cuộc trò chuyện từ danh sách bên trái để xem tin nhắn và bắt đầu trao đổi với khách hàng."
              icon={<FiMessageSquare className="w-10 h-10 text-gray-300" />}
            />
          )}
        </main>

        {/* Booking Details Panel */}
        {activeConversation && activeConversation.bookingData && (
          <aside className="hidden lg:flex w-[300px] flex-shrink-0 border-l border-gray-200 bg-white flex-col overflow-y-auto">
            <BookingDetailsPanel booking={activeConversation.bookingData} />
          </aside>
        )}

        {/* Room Panel cho hội thoại liên hệ trước đặt chỗ (chưa có đơn) */}
        {activeConversation && activeConversation.isInquiry && !activeConversation.bookingData && activeConversation.roomId && (
          <aside className="hidden lg:flex w-[300px] flex-shrink-0 border-l border-gray-200 bg-white flex-col overflow-y-auto">
            <RoomDetailsPanel
              maPhong={activeConversation.roomId}
              fallback={{
                tieuDe: activeConversation.propertyName,
                urlAnhChinh: activeConversation.propertyImage,
                maPhong: activeConversation.roomId,
              }}
              title="Phòng khách quan tâm"
            />
          </aside>
        )}
      </div>
    </div>
  );
}
