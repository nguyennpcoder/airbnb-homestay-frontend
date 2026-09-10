'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bookingAPI, messageAPI, phongAPI, userAPI, Message } from '@/lib/api';
import BackendImage from '@/components/BackendImage';
import { webSocketService } from '@/lib/websocket';
import { FiFilter, FiSettings, FiSearch, FiMoreHorizontal, FiPaperclip, FiSmile, FiImage, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { getValidSrc } from '@/lib/image';
import BookingDetailsPanel from '@/components/BookingDetailsPanel';
import RoomDetailsPanel from '@/components/RoomDetailsPanel';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const STICKERS = [
  '😂', '😍', '🥰', '😘', '😊', '🤗',
  '🥳', '😎', '🤩', '😭', '😅', '🤔',
  '🙃', '😴', '🤤', '😡', '💩', '🙏',
  '👏', '💪', '👍', '👌', '🤝', '🔥',
  '❤️', '💯', '✨', '🎉', '🚀', '🎯',
];

interface Conversation {
  id: number;
  title: string;
  partnerName: string;
  partnerAvatar?: string | null;
  partnerId: number | null;
  statusLabel: string;
  subLabel?: string;
  checkIn?: string;
  checkOut?: string;
  isSupport?: boolean;
  bookingData?: any;
  lastMessageTime?: string;
  connectionStatus?: string;
  hasUnread?: boolean;
  partnerRating?: number;
  partnerReviews?: number;
  isLocked?: boolean;
  lockReason?: string;
  /** Room id for pre-booking contact (survives URL param cleanup). */
  roomId?: number | null;
  /** True for pre-booking contact threads (no DatCho — saved directly in tin_nhan). */
  isInquiry?: boolean;
}

interface MessagesPanelProps {
  userId?: number;
  hostId?: number | null;
  roomId?: number | null;
}

const SUPPORT_CONVERSATION_ID = -1;
const SUPPORT_CONVERSATION: Conversation = {
  id: SUPPORT_CONVERSATION_ID,
  title: 'Đội ngũ hỗ trợ Airbnb',
  partnerName: 'Đội ngũ hỗ trợ Airbnb',
  partnerAvatar: null,
  partnerId: null,
  statusLabel: 'SUPPORT',
  subLabel: 'Vui lòng mô tả vấn đề của bạn...',
  isSupport: true,
};

/** Hội thoại liên hệ trước đặt chỗ được định danh bằng id âm theo maPhong. */
const INQUIRY_BASE = 100000;
// ID hội thoại liên hệ mã hóa cả phòng lẫn đối tác — 2 khách hỏi cùng 1 phòng
// không được trùng id (tránh click khách này thấy hội thoại khách kia)
const inquiryConvId = (maPhong: number, partnerId?: number) => -(INQUIRY_BASE + maPhong * 10000 + (partnerId || 0));
const inquiryPhongId = (id: number) => Math.floor((-id - INQUIRY_BASE) / 10000);
const isInquiryConvId = (id: number) => id < 0 && id !== SUPPORT_CONVERSATION_ID && id !== -2;

const SUPPORT_MESSAGES: Message[] = [
  {
    maTinNhan: -1,
    noiDung: 'Chào bạn! Chúng tôi có thể giúp gì cho bạn?',
    nguoiGui: { maNguoiDung: 0, hoTen: 'Nhóm hỗ trợ Airbnb' },
    ngayTao: new Date().toISOString(),
  },
];

const getBookingStatusBadge = (status: string) => {
  const s = status?.toUpperCase() || '';
  if (['DA_XAC_NHAN', 'DA_THANH_TOAN', 'THANH_CONG', 'ACCEPTED'].includes(s)) {
    return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">HOÀN THÀNH</span>;
  }
  if (['CHO_XAC_NHAN', 'PENDING'].includes(s)) {
    return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold">Chờ xác nhận</span>;
  }
  if (['TU_CHOI', 'DA_HUY', 'CANCELLED', 'REJECTED'].includes(s)) {
    return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">Đã hủy</span>;
  }
  if (s === 'SUPPORT') {
    return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">Hỗ trợ</span>;
  }
  if (s === 'NEW') {
    return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">Tin nhắn mới</span>;
  }
  return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">{status}</span>;
};

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

function truncateTitle(text?: string, max = 40) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Resolve host display fields from booking.phong.chuNha OR room.hostInfo (PhongDTO). */
function resolveHostPerson(source: any): { id?: number; name: string; avatar?: string | null } {
  const host = source?.chuNha || source?.hostInfo || source;
  if (!host || typeof host !== 'object') {
    return { name: 'Chủ nhà', avatar: null };
  }
  let name = host.hoTen;
  if (!name && (host.ho || host.ten)) {
    name = `${host.ho || ''} ${host.ten || ''}`.trim();
  }
  if (!name) name = 'Chủ nhà';
  const avatar = host.urlAnhDaiDien || host.avatarUrl || null;
  return {
    id: host.maNguoiDung,
    name,
    avatar,
  };
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
        <BackendImage
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

function getAmenityNames(room: any): string[] {
  const raw = room?.tienNghi;
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const names: string[] = [];
        const walk = (val: any) => {
          if (Array.isArray(val)) {
            val.forEach((v) => { if (typeof v === 'string' && v.trim()) names.push(v.trim()); });
          } else if (val && typeof val === 'object') {
            Object.values(val).forEach(walk);
          }
        };
        walk(parsed.amenities || parsed);
        const unique = [...new Set(names)];
        if (unique.length) return unique;
      }
    } catch { }
    return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

export default function MessagesPanel({ userId, hostId, roomId }: MessagesPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([SUPPORT_CONVERSATION]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'chat'>('list');

  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [draftMessage, setDraftMessage] = useState('');

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for "Liên hệ chủ nhà" flow (no booking)
  const [targetRoom, setTargetRoom] = useState<any>(null);
  const [virtualConversation, setVirtualConversation] = useState<Conversation | null>(null);
  const virtualConversationRef = useRef<Conversation | null>(null);
  const initialRoomIdRef = useRef<number | null>(roomId ?? null);
  useEffect(() => { virtualConversationRef.current = virtualConversation; }, [virtualConversation]);
  const [autoReplySent, setAutoReplySent] = useState(false);

  const cachedMessagesRef = useRef<Record<number, Message[]>>({
    [SUPPORT_CONVERSATION_ID]: SUPPORT_MESSAGES,
  });
  const activeConversationRef = useRef<number | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(
    () => virtualConversation || conversations.find((conv) => conv.id === activeConversationId),
    [conversations, activeConversationId, virtualConversation]
  );

  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter(
      (c) =>
        c.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // Add virtual conversation at the top if exists
    if (virtualConversation) {
      return [virtualConversation, ...filtered.filter(c => c.id !== -2)];
    }
    return filtered;
  }, [conversations, searchTerm, virtualConversation]);

  const scrollToBottom = () => {
    if (messageContainerRef.current) {
      const { scrollHeight, clientHeight } = messageContainerRef.current;
      messageContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, activeConversationId]);
  useEffect(() => { activeConversationRef.current = activeConversationId; }, [activeConversationId]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const loadMessages = useCallback(async (conversationId: number, force = false) => {
    if (conversationId === SUPPORT_CONVERSATION_ID) {
      setMessages(SUPPORT_MESSAGES);
      return;
    }

    const cached = cachedMessagesRef.current[conversationId];
    if (!force && cached) {
      setMessages(cached);
      setTimeout(scrollToBottom, 50);
      return;
    }

    setLoadingMessages(true);
    try {
      let data: Message[];
      if (isInquiryConvId(conversationId)) {
        // Hội thoại liên hệ (chưa đặt chỗ) — đọc từ tin_nhan theo phòng
        const conv = conversationsRef.current.find((c) => c.id === conversationId);
        if (!conv?.roomId || !conv.partnerId || !userId) {
          setMessages([]);
          return;
        }
        data = await messageAPI.listByPhong(conv.roomId, userId, conv.partnerId);
      } else {
        data = await messageAPI.listByBooking(conversationId);
        messageAPI.readAll(conversationId, userId!).catch(() => {});
      }
      const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) => {
        return new Date(a.ngayTao).getTime() - new Date(b.ngayTao).getTime();
      });
      cachedMessagesRef.current[conversationId] = sorted;
      setMessages(sorted);
    } catch (error) {
      console.error('Lỗi tải tin nhắn', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [userId]);

  const markAsRead = async (conversationId: number) => {
    if (!userId || conversationId === SUPPORT_CONVERSATION_ID) return;
    try {
      if (isInquiryConvId(conversationId)) {
        const conv = conversationsRef.current.find((c) => c.id === conversationId);
        if (conv?.roomId) await messageAPI.readAllByPhong(conv.roomId, userId);
      } else {
        await messageAPI.readAll(conversationId, userId);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('notifications-updated'));
      }
    } catch (e) { console.error("Mark read failed", e); }
  };

  const fetchConversations = useCallback(async (uid: number, isBackground = false) => {
    if (!isBackground) setLoadingConversations(true);
    try {
      const bookings = await bookingAPI.byUser(uid);

      const filteredSelf = (Array.isArray(bookings) ? bookings : []).filter((b: any) => {
        const hostId = b?.phong?.chuNha?.maNguoiDung || b?.phong?.hostInfo?.maNguoiDung;
        return hostId !== uid;
      });

      const mapped: Conversation[] = filteredSelf.map((booking: any) => {
        const host = booking?.phong?.chuNha || booking?.phong?.hostInfo;
        const resolved = resolveHostPerson(host || booking?.phong);

        return {
          id: booking.maDatCho,
          title: booking?.phong?.tieuDe || 'Nhà nghỉ',
          partnerName: resolved.name,
          partnerAvatar: resolved.avatar,
          partnerId: resolved.id ?? host?.maNguoiDung,
          statusLabel: booking.trangThaiDatCho || 'PENDING',
          subLabel: booking.lastMessage || 'Chưa có tin nhắn',
          lastMessageTime: booking.lastMessageTime,
          bookingData: booking,
          connectionStatus: 'ACCEPTED',
          hasUnread: booking.hasUnread,
          partnerRating: host?.diemDanhGia,
          partnerReviews: host?.soLuongDanhGia,
          isLocked: host?.biKhoa === true,
          lockReason: host?.lyDoKhoa || 'Vi phạm cộng đồng',
        };
      });

      const uniqueMapped = mapped.filter((conv, index, self) => index === self.findIndex((c) => c.id === conv.id));

      // Hội thoại liên hệ trước đặt chỗ (tin_nhan.ma_phong — không tạo dat_cho)
      let inquiryConvs: Conversation[] = [];
      try {
        const inquiries = await messageAPI.listInquiries(uid);
        // Tab tin nhắn profile chỉ hiện hội thoại phía khách —
        // loại hội thoại mà user là chủ nhà (đã có ở /hosting/inbox)
        inquiryConvs = (Array.isArray(inquiries) ? inquiries : [])
          .filter((i: any) => i.chuNhaId !== uid)
          .map((i: any) => ({
          id: inquiryConvId(i.maPhong, i.partner?.maNguoiDung),
          title: i.tieuDe || 'Phòng',
          partnerName: i.partner?.hoTen || 'Chủ nhà',
          partnerAvatar: i.partner?.urlAnhDaiDien,
          partnerId: i.partner?.maNguoiDung ?? null,
          statusLabel: 'NEW',
          subLabel: i.lastMessage || 'Tin liên hệ về phòng',
          lastMessageTime: i.lastMessageTime,
          hasUnread: i.hasUnread,
          roomId: i.maPhong,
          connectionStatus: 'PENDING',
          isInquiry: true,
        }));
      } catch (e) {
        console.error('Lỗi tải hội thoại liên hệ', e);
      }

      const allConvs = [SUPPORT_CONVERSATION, ...uniqueMapped, ...inquiryConvs];
      allConvs.sort((a, b) => {
        if (a.isSupport) return -1;
        const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return t2 - t1;
      });

      setConversations(allConvs);
    } catch (e) { console.error(e); } finally { if (!isBackground) setLoadingConversations(false); }
  }, []);

  useEffect(() => {
    if (userId) fetchConversations(userId);
  }, [userId, fetchConversations]);

  // Fetch room data when roomId is provided (from "Liên hệ chủ nhà" flow)
  useEffect(() => {
    if (!roomId) return;
    phongAPI.getById(roomId)
      .then(data => {
        if (data && !(data as any).error) {
          setTargetRoom(data);
        }
      })
      .catch(() => {});
  }, [roomId]);

  // Auto-select conversation when hostId is provided (from "Liên hệ chủ nhà" button)
  useEffect(() => {
    if (!hostId) return;

    if (initialRoomIdRef.current === null && roomId != null) {
      initialRoomIdRef.current = roomId;
    }

    const hasInquiryForRoom = roomId != null && conversations.some(
      (c) => isInquiryConvId(c.id) && c.roomId === roomId && c.partnerId === hostId
    );

    // Nếu đã có hội thoại liên hệ với phòng này → mở lại tin nhắn cũ (giữ lịch sử),
    // KHÔNG tạo hội thoại mới để tránh đè lên/mất tin nhắn cũ.
    if (hasInquiryForRoom) {
      const existingInquiry = conversations.find(
        (c) => isInquiryConvId(c.id) && c.roomId === roomId && c.partnerId === hostId
      );
      if (existingInquiry && (activeConversationId === null || activeConversationId === -2)) {
        // Bỏ hội thoại ảo (nếu đang ở đó) và mở lại thread cũ
        if (virtualConversation) setVirtualConversation(null);
        setActiveConversationId(existingInquiry.id);
        setActiveView('chat');
        setConversations(prev => prev.map(c => c.id === existingInquiry.id ? { ...c, hasUnread: false } : c));
        if (userId) {
          messageAPI.readAllByPhong(roomId, userId).catch(() => {});
        }
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('hostId');
          url.searchParams.delete('roomId');
          window.history.replaceState({}, '', url.toString());
        }
        return;
      }
      // Đã có thread cũ nhưng user đang xem hội thoại khác → không giật user về
      if (activeConversationId !== null && activeConversationId !== -2) return;
    }

    // If roomId is provided → always create NEW virtual conversation about this room
    // (Guest is viewing a room and wants to ask host about it - no booking yet)
    // (Không tạo nếu phòng này đã có hội thoại liên hệ)
    if (roomId && targetRoom && !virtualConversation && !hasInquiryForRoom) {
      const resolved = resolveHostPerson(targetRoom);
      const vConv: Conversation = {
        id: -2, // Virtual ID
        title: targetRoom?.tieuDe || 'Phòng',
        partnerName: resolved.name,
        partnerAvatar: resolved.avatar,
        partnerId: hostId,
        statusLabel: 'NEW',
        subLabel: `Bạn quan tâm đến: ${targetRoom?.tieuDe || 'phòng này'}`,
        bookingData: null,
        connectionStatus: 'PENDING',
        roomId, // Keep room id — URL params are cleared below
      };
      setVirtualConversation(vConv);
      setActiveConversationId(-2);
      setActiveView('chat');

      // PhongDTO returns hostInfo.avatarUrl (not chuNha.urlAnhDaiDien).
      // If still missing, fetch host profile by id so avatar/name are correct.
      if ((!resolved.avatar || resolved.name === 'Chủ nhà') && hostId) {
        userAPI.getProfile(hostId)
          .then((profile) => {
            if (!profile) return;
            const enriched = resolveHostPerson(profile);
            setVirtualConversation((prev) => prev ? {
              ...prev,
              partnerName: enriched.name !== 'Chủ nhà' ? enriched.name : prev.partnerName,
              partnerAvatar: enriched.avatar || prev.partnerAvatar,
            } : prev);
          })
          .catch(() => {});
      }

      // Set initial auto message from guest
      const autoMsg: Message = {
        maTinNhan: -100,
        noiDung: `Chào bạn! Mình quan tâm đến phòng "${targetRoom?.tieuDe || ''}". Phòng này còn trống không ạ?`,
        nguoiGui: { maNguoiDung: userId || 0, hoTen: 'Bạn' },
        ngayTao: new Date().toISOString(),
      };
      setMessages([autoMsg]);
      setAutoReplySent(false);

      // Clean up URL params (roomId stays on conversation object)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('hostId');
        url.searchParams.delete('roomId');
        window.history.replaceState({}, '', url.toString());
      }
      return;
    }

    // If no roomId (and never had one) → find existing conversation with this host
    // (Tránh: sau khi xóa URL params, nhánh này chọn nhầm hội thoại phòng khác của cùng host)
    if (initialRoomIdRef.current != null) return;
    if (conversations.length <= 1) return;
    const existingConv = conversations.find(c => c.partnerId === hostId && !c.isSupport);
    if (existingConv) {
      setActiveConversationId(existingConv.id);
      setActiveView('chat');
      setConversations(prev => prev.map(c => c.id === existingConv.id ? { ...c, hasUnread: false } : c));
      if (userId) {
        if (isInquiryConvId(existingConv.id) && existingConv.roomId) {
          messageAPI.readAllByPhong(existingConv.roomId, userId).catch(() => {});
        } else {
          messageAPI.readAll(existingConv.id, userId).catch(() => {});
        }
      }
      // Clean up URL params
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('hostId');
        url.searchParams.delete('roomId');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [hostId, conversations, roomId, targetRoom, virtualConversation, userId, activeConversationId]);

  useEffect(() => {
    if (activeConversationId !== null) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (activeConversationId && activeConversationId !== SUPPORT_CONVERSATION_ID) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId]);

  const handleIncoming = useCallback((message: Message & {
    isInquiry?: boolean;
    yeuCauDacBiet?: string;
    maPhong?: number;
    tieuDePhong?: string;
  }) => {
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

    // Skip messages sent by the current user (already added from HTTP response)
    if (message.nguoiGui?.maNguoiDung === userId) return;

    // Deduplicate by message id
    const existingCache = cachedMessagesRef.current[threadId] || [];
    if (message.maTinNhan && existingCache.some(m => m.maTinNhan === message.maTinNhan)) {
      return;
    }
    cachedMessagesRef.current[threadId] = [...existingCache, message];

    const virtual = virtualConversationRef.current;

    // If still on virtual inquiry (-2) for same host/room, promote to real thread id
    if (activeConversationRef.current === -2 || virtual?.id === -2) {
      const alreadyExists = conversationsRef.current.some(c => c.id === threadId);
      setVirtualConversation(null);

      if (alreadyExists) {
        // Đã có hội thoại liên hệ với phòng này → merge vào thread cũ,
        // xóa cache để load lại đầy đủ lịch sử (không mất tin nhắn cũ).
        delete cachedMessagesRef.current[threadId];
        setConversations(prev => prev.map(c => c.id === threadId
          ? {
              ...c,
              statusLabel: 'NEW',
              subLabel: message.noiDung,
              lastMessageTime: message.ngayTao,
              hasUnread: activeConversationRef.current !== threadId,
            }
          : c));
        setActiveConversationId(threadId);
        // activeConversationId có thể không đổi → effect loadMessages không chạy lại,
        // nên chủ động load lại full history
        loadMessages(threadId, true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('chat-messages-updated'));
        }
        return;
      }

      const promoted: Conversation = {
        ...(virtual || {
          id: threadId,
          title: message.tieuDePhong || 'Phòng',
          partnerName: message.nguoiGui?.hoTen || 'Chủ nhà',
          partnerAvatar: message.nguoiGui?.urlAnhDaiDien,
          partnerId: message.nguoiGui?.maNguoiDung ?? null,
          statusLabel: 'NEW',
          connectionStatus: 'PENDING',
        }),
        id: threadId,
        statusLabel: 'NEW',
        subLabel: message.noiDung,
        lastMessageTime: message.ngayTao,
        roomId: message.maPhong || virtual?.roomId,
        isInquiry: isInquiryMsg,
      };
      setConversations(prev => [promoted, ...prev.filter(c => c.id !== -2 && c.id !== threadId)]);
      setActiveConversationId(threadId);
      // Xóa cache và load lại đầy đủ lịch sử (có thể WS đến trước HTTP response
      // → cache chỉ chứa tin auto-reply, thiếu tin "hi" vừa gửi)
      delete cachedMessagesRef.current[threadId];
      loadMessages(threadId, true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('chat-messages-updated'));
      }
      return;
    }

    if (activeConversationRef.current === threadId) {
      setMessages(prev => {
        if (message.maTinNhan && prev.some(m => m.maTinNhan === message.maTinNhan)) return prev;
        return [...prev, message];
      });
    }

    setConversations(prev => {
      const exists = prev.some(c => c.id === threadId);
      if (!exists) {
        const isInquiry = isInquiryMsg || message.yeuCauDacBiet === 'LIEN_HE_PHONG';
        const partner = message.nguoiGui;
        const optimistic: Conversation = {
          id: threadId,
          title: message.tieuDePhong || 'Nhà nghỉ',
          partnerName: partner?.hoTen || 'Chủ nhà',
          partnerAvatar: partner?.urlAnhDaiDien,
          partnerId: partner?.maNguoiDung ?? null,
          statusLabel: isInquiry ? 'NEW' : 'PENDING',
          subLabel: message.noiDung,
          lastMessageTime: message.ngayTao,
          hasUnread: activeConversationRef.current !== threadId,
          roomId: message.maPhong,
          connectionStatus: 'ACCEPTED',
          isInquiry,
        };
        const next = [optimistic, ...prev.filter(c => c.id !== -2)];
        next.sort((a, b) => {
          if (a.isSupport) return -1;
          const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return t2 - t1;
        });
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
        if (a.isSupport) return -1;
        const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return t2 - t1;
      });
      return updated;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('chat-messages-updated'));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    webSocketService.connect(userId, handleIncoming);
    return () => {
      webSocketService.removeMessageHandler(userId, handleIncoming);
    };
  }, [userId, handleIncoming]);

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
    if ((!draftMessage.trim() && !selectedFile && !stickerEmoji) || !activeConversation || activeConversation.isSupport || activeConversation.isLocked || !userId) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      let fileData = null;
      if (selectedFile) {
        fileData = await uploadFile(selectedFile);
      }

      const partnerId = activeConversation.partnerId || activeConversation.bookingData?.phong?.chuNha?.maNguoiDung;
      if (!partnerId) { toast.error('Không tìm thấy người nhận'); return; }

      // Handle virtual conversation (no booking yet)
      const isVirtual = activeConversation.id === -2;

      const payload: any = {
        maNguoiGui: userId,
        maNguoiNhan: partnerId,
        noiDung: stickerEmoji || draftMessage.trim() || (selectedFile ? 'Đã gửi một tệp đính kèm' : ''),
        fileUrl: stickerEmoji ? stickerEmoji : fileData?.url,
        fileType: stickerEmoji ? 'STICKER' : fileData ? (String(fileData?.fileType || '').startsWith('image/') ? 'IMAGE' : 'FILE') : undefined,
      };

      // Gửi tin liên hệ (chưa đặt chỗ): dùng maPhong, không tạo dat_cho
      const isInquiryConv = isVirtual || isInquiryConvId(activeConversation.id);
      if (isInquiryConv) {
        // Prefer roomId stored on conversation — prop is cleared after URL cleanup
        const phongId = activeConversation.roomId
          || (isVirtual ? (roomId || targetRoom?.maPhong || targetRoom?.maSanPham) : null);
        if (!phongId) {
          toast.error('Thiếu mã phòng — không thể gửi tin liên hệ');
          return;
        }
        payload.maPhong = phongId;
      } else {
        payload.maDatCho = activeConversation.id;
      }

      const res = await messageAPI.send(payload);
      if (res) {
        const messagesToAdd: Message[] = Array.isArray(res) ? res : [res];

        if (isVirtual) {
          // Backend chỉ lưu tin_nhan gắn với phòng (không tạo dat_cho) —
          // hội thoại chuyển từ ảo (-2) sang hội thoại liên hệ thật (id âm theo maPhong)
          const realMsg = messagesToAdd.find((m: any) => m.maPhong);
          if (realMsg?.maPhong) {
            const newConvId = inquiryConvId(realMsg.maPhong, realMsg.nguoiNhan?.maNguoiDung || partnerId);
            const lastMsg = messagesToAdd[messagesToAdd.length - 1];
            const alreadyExists = conversationsRef.current.some(c => c.id === newConvId);

            setVirtualConversation(null);

            if (alreadyExists) {
              // Đã có hội thoại liên hệ với phòng này → merge vào thread cũ,
              // xóa cache để load lại đầy đủ lịch sử (không mất tin nhắn cũ).
              delete cachedMessagesRef.current[newConvId];
              setConversations(prev => prev.map(c => c.id === newConvId
                ? {
                    ...c,
                    statusLabel: 'NEW',
                    subLabel: lastMsg?.noiDung || c.subLabel,
                    lastMessageTime: lastMsg?.ngayTao,
                    hasUnread: false,
                  }
                : c));
              setActiveConversationId(newConvId);
              // activeConversationId có thể không đổi → effect loadMessages không chạy lại,
              // nên chủ động load lại full history
              loadMessages(newConvId, true);
            } else {
              const newConv: Conversation = {
                ...activeConversation,
                id: newConvId,
                statusLabel: 'NEW',
                subLabel: lastMsg?.noiDung || activeConversation.subLabel,
                lastMessageTime: lastMsg?.ngayTao,
                roomId: realMsg.maPhong,
                isInquiry: true,
              };
              setConversations(prev => [newConv, ...prev.filter(c => c.id !== -2 && c.id !== newConvId)]);
              setActiveConversationId(newConvId);
              const greeting = messages.find(m => m.maTinNhan === -100);
              const finalMsgs = greeting ? [greeting, ...messagesToAdd] : messagesToAdd;
              setMessages(finalMsgs);
              cachedMessagesRef.current[newConvId] = finalMsgs;
            }
          } else {
            toast.error('Không tạo được hội thoại với chủ nhà. Thử lại.');
            setMessages(prev => [...prev, ...messagesToAdd]);
          }
        } else {
          // WS có thể đã đẩy tin đến trước HTTP response (vd: tin auto-reply)
          // → dedupe theo maTinNhan + sắp xếp đúng thứ tự thời gian
          setMessages(prev => {
            const known = new Set(prev.map(m => m.maTinNhan).filter((id): id is number => !!id));
            const fresh = messagesToAdd.filter(m => m.maTinNhan && !known.has(m.maTinNhan));
            if (!fresh.length) return prev;
            const merged = [...prev, ...fresh];
            return merged.sort((a, b) => new Date(a.ngayTao || 0).getTime() - new Date(b.ngayTao || 0).getTime());
          });
          const cacheKey = activeConversation.id;
          cachedMessagesRef.current[cacheKey] = [
            ...(cachedMessagesRef.current[cacheKey] || []),
            ...messagesToAdd,
          ].filter((m, idx, arr) => !m.maTinNhan || arr.findIndex(x => x.maTinNhan === m.maTinNhan) === idx)
            .sort((a, b) => new Date(a.ngayTao || 0).getTime() - new Date(b.ngayTao || 0).getTime());
          const lastMsg = messagesToAdd[messagesToAdd.length - 1];
          setConversations(prev => {
            const updated = prev.map(c => {
              if (c.id === activeConversation.id) {
                return {
                  ...c,
                  subLabel: lastMsg.noiDung,
                  lastMessageTime: lastMsg.ngayTao,
                };
              }
              return c;
            });
            updated.sort((a, b) => {
              if (a.isSupport) return -1;
              const t1 = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
              const t2 = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
              return t2 - t1;
            });
            return updated;
          });
        }
      }
      setDraftMessage('');
      setSelectedFile(null);
      setShowEmojiPicker(false);
      setShowStickerPicker(false);
    } catch (error) {
      console.error('Send error', error);
      toast.error('Gửi tin nhắn thất bại');
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
        <aside className={`w-full lg:w-[300px] border-r border-gray-200 flex flex-col bg-white transition-all duration-300 ${activeView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-white">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Trò chuyện</h2>
            <div className="flex gap-1">
              <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors" title="Cài đặt"><FiSettings className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="px-4 py-3 bg-white border-b border-gray-100 relative">
            <div className="relative group">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" />
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-black transition-all"
                placeholder="Tìm kiếm người liên hệ..."
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
                    // Handle virtual conversation
                    if (conv.id === -2 && virtualConversation) {
                      setActiveConversationId(-2);
                      setActiveView('chat');
                      return;
                    }
                    setActiveConversationId(conv.id);
                    setActiveView('chat');
                    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, hasUnread: false } : c));
                    if (userId && !conv.isSupport) {
                      try {
                        if (isInquiryConvId(conv.id) && conv.roomId) {
                          await messageAPI.readAllByPhong(conv.roomId, userId);
                        } else {
                          await messageAPI.readAll(conv.id, userId);
                        }
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new Event('chat-messages-updated'));
                        }
                      } catch (e) {
                        console.error("Failed to mark read", e);
                      }
                    }
                  }}
                  className={`flex items-center gap-4 p-4 cursor-pointer transition-all border-l-4 ${conv.isLocked ? 'opacity-50 bg-gray-50/50' : ''} ${activeConversationId === conv.id ? 'bg-gray-50 border-black' : 'hover:bg-gray-50/80 border-transparent'} ${conv.id === -2 || isInquiryConvId(conv.id) ? 'bg-purple-50/50' : ''}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-14 h-14 rounded-full overflow-hidden border border-gray-100 shadow-sm relative ${conv.isLocked ? 'bg-gray-200' : 'bg-gray-100'}`}>
                      {conv.isSupport ? (
                        <div className="w-full h-full bg-black flex items-center justify-center text-white">
                          <svg viewBox="0 0 32 32" className="w-6 h-6 fill-current"><path d="M16 .7C7.56.7.7 7.56.7 16S7.56 31.3 16 31.3 31.3 24.44 31.3 16 24.44.7 16 .7zm0 28c-4.02 0-7.6-1.88-9.93-4.81a12.43 12.43 0 0 1 6.45-4.4A6.5 6.5 0 0 1 9.5 14a6.5 6.5 0 0 1 13 0 6.51 6.51 0 0 1-3.02 5.5 12.42 12.42 0 0 1 6.45 4.4c-2.33 2.93-5.91 4.8-9.93 4.8z"></path></svg>
                        </div>
                      ) : (
                        <HostAvatar avatar={conv.partnerAvatar} name={conv.partnerName} className={conv.isLocked ? 'grayscale' : ''} />
                      )}
                    </div>
                    {conv.isLocked && !conv.isSupport && (
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
                        {conv.partnerName}
                        {conv.isLocked && !conv.isSupport && <span className="ml-1.5 text-[10px] text-gray-400 font-normal normal-case tracking-normal">Đã khóa</span>}
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter ml-2">{formatTime(conv.lastMessageTime)}</span>
                    </div>
                    <p className={`text-sm truncate leading-tight ${conv.isLocked ? 'text-gray-400 italic' : conv.hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {conv.isLocked ? 'Tài khoản đã ngừng hoạt động' : conv.subLabel}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 opacity-60">
                      <span className={`w-1.5 h-1.5 rounded-full ${conv.isLocked ? 'bg-gray-400' : conv.isSupport ? 'bg-blue-500' : conv.id === -2 || isInquiryConvId(conv.id) ? 'bg-purple-500' : 'bg-green-500'}`}></span>
                      <span className="text-[10px] font-bold uppercase tracking-widest truncate">{conv.title}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                <FiX className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-sm text-gray-400 font-medium italic">Không tìm thấy cuộc trò chuyện</p>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <main className={`flex-1 min-w-0 flex flex-col bg-white h-full relative transition-all duration-300 ${activeView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center gap-3 bg-white z-10 shadow-sm">
                <button
                  onClick={() => setActiveView('list')}
                  className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                {!activeConversation.isSupport && (
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative border border-gray-100 shadow-sm">
                    <HostAvatar avatar={activeConversation.partnerAvatar} name={activeConversation.partnerName} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">
                      {activeConversation.partnerName}
                    </h3>
                    {!activeConversation.isSupport && getBookingStatusBadge(activeConversation.statusLabel)}
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">
                    {activeConversation.id === -2 ? (
                      <span className="hidden sm:inline text-purple-500">Tin nhắn mới về phòng</span>
                    ) : isInquiryConvId(activeConversation.id) ? (
                      <span className="hidden sm:inline text-purple-500">Tin nhắn về phòng #{inquiryPhongId(activeConversation.id)}</span>
                    ) : (
                      <>
                        <span className="hidden sm:inline">BOOKING #{activeConversation.id}</span>
                        {!activeConversation.isSupport && <span className="hidden sm:inline"> · </span>}
                      </>
                    )}
                    <span className="text-gray-500 truncate max-w-[280px] inline-block align-bottom">{truncateTitle(activeConversation.title)}</span>
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><FiSearch className="w-5 h-5" /></button>
                  <button className="hidden sm:block p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><FiMoreHorizontal className="w-5 h-5" /></button>
                </div>
              </div>

              {activeConversation.isLocked && !activeConversation.isSupport && (
                <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Tài khoản đã ngừng hoạt động</p>
                    <p className="text-xs text-red-600 mt-0.5">Tài khoản của {activeConversation.partnerName} đã bị khóa vì lý do: {activeConversation.lockReason}. Không thể gửi tin nhắn.</p>
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
                          {msg.isAutoReply && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full mb-1 border border-blue-100">
                              Tin nhắn tự động
                            </span>
                          )}
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
                    <button
                      onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                      className={`p-3 rounded-full transition-all flex-shrink-0 active:scale-90 ${showStickerPicker ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100 hover:text-black'}`}
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
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center"><FiPaperclip className="w-10 h-10 text-gray-200" /></div>
              <p className="font-medium text-gray-500">Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          )}
        </main>

        {/* Booking Details Panel */}
        {activeConversation && !activeConversation.isSupport && activeConversation.bookingData && (
          <aside className="hidden lg:flex w-[300px] flex-shrink-0 border-l border-gray-200 bg-white flex-col overflow-y-auto">
            <BookingDetailsPanel booking={activeConversation.bookingData} />
          </aside>
        )}

        {/* Room Details Panel (no booking yet) */}
        {activeConversation && !activeConversation.isSupport && !activeConversation.bookingData && (
          (() => {
            const phongId = targetRoom?.maPhong || targetRoom?.maSanPham || activeConversation.roomId;
            if (!phongId) return null;
            return (
              <aside className="hidden lg:flex w-[300px] flex-shrink-0 border-l border-gray-200 bg-white flex-col overflow-y-auto">
                <RoomDetailsPanel
                  maPhong={phongId}
                  fallback={{
                    tieuDe: activeConversation.title || targetRoom?.tieuDe,
                    urlAnhChinh: targetRoom?.urlAnhChinh,
                    maPhong: phongId,
                    giaMoiKhach: targetRoom?.giaMoiKhach,
                    phiVeSinh: targetRoom?.phiVeSinh,
                    soKhachToiDa: targetRoom?.soKhachToiDa,
                    diemTrungBinh: targetRoom?.diemTrungBinh,
                    soLuongDanhGia: targetRoom?.soLuongDanhGia,
                    tienNghi: targetRoom?.tienNghi,
                  }}
                />
              </aside>
            );
          })()
        )}
      </div>
    </div>
  );
}
