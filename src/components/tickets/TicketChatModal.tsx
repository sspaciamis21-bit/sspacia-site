'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Image as ImageIcon, Loader2, MessageSquare, ShieldCheck, User as UserIcon, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface TicketComment {
  id: number;
  senderName: string;
  senderEmail: string | null;
  senderRole: 'USER' | 'CM' | 'ADMIN' | 'SYSTEM';
  message: string;
  attachmentsJson: string | null;
  createdAt: string;
}

interface TicketChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number;
  ticketNumber: string;
  ticketTitle: string;
  statusName: string;
  userRole: 'USER' | 'CM' | 'ADMIN';
}

export function TicketChatModal({
  isOpen,
  onClose,
  ticketId,
  ticketNumber,
  ticketTitle,
  statusName,
  userRole,
}: TicketChatModalProps) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const apiEndpoint = userRole === 'USER' ? `/api/user/tickets/${ticketId}/comments` : `/api/admin/tickets/${ticketId}/comments`;
  const uploadEndpoint = userRole === 'USER' ? '/api/user/upload-image' : '/api/admin/upload-image';

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setComments(json.data || []);
      }
    } catch (err) {
      console.warn('Ticket chat sync paused temporarily:', err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    if (isOpen && ticketId) {
      setLoading(true);
      fetchComments();
      const interval = setInterval(fetchComments, 6000);
      return () => clearInterval(interval);
    }
  }, [isOpen, ticketId, fetchComments]);

  useEffect(() => {
    if (comments.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(uploadEndpoint, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json();
      const url = json.data?.url || json.url;
      if (url) {
        setAttachmentUrl(url);
        toast.success('Image attached successfully');
      }
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachmentUrl) return;

    setSending(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          attachments: attachmentUrl ? [attachmentUrl] : [],
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      setNewMessage('');
      setAttachmentUrl(null);
      await fetchComments();
    } catch {
      toast.error('Could not send message');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative max-w-2xl w-full h-[85vh] bg-white border border-[var(--outline-variant)] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Top Bar */}
          <div className="p-5 bg-[#006064] text-white flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest bg-white/20 px-2 py-0.5 uppercase">
                  #{ticketNumber}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                  Status: {statusName}
                </span>
              </div>
              <h3 className="text-sm md:text-base font-bold text-white mt-1 truncate max-w-md">
                {ticketTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 space-y-4 no-scrollbar">
            {loading ? (
              <div className="h-full flex items-center justify-center flex-col gap-3">
                <Loader2 className="w-8 h-8 text-[#006064] animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading conversation...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No chat history yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">Start the conversation with your Community Manager below.</p>
              </div>
            ) : (
              comments.map((c) => {
                const isSystem = c.senderRole === 'SYSTEM';
                const isMe = (userRole === 'USER' && c.senderRole === 'USER') || (userRole !== 'USER' && (c.senderRole === 'CM' || c.senderRole === 'ADMIN'));

                if (isSystem) {
                  return (
                    <div key={c.id} className="flex justify-center my-3">
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-200/80 px-3 py-1 uppercase tracking-widest rounded-full">
                        ⚙️ {c.message}
                      </span>
                    </div>
                  );
                }

                let attachments: string[] = [];
                if (c.attachmentsJson) {
                  try { attachments = JSON.parse(c.attachmentsJson); } catch {}
                }

                return (
                  <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      {c.senderRole === 'CM' || c.senderRole === 'ADMIN' ? (
                        <ShieldCheck className="w-3 h-3 text-[#006064]" />
                      ) : (
                        <UserIcon className="w-3 h-3 text-gray-400" />
                      )}
                      <span>{c.senderName} ({c.senderRole})</span>
                      <span>•</span>
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`max-w-md p-4 text-[13px] font-medium leading-relaxed shadow-sm ${
                        isMe
                          ? 'bg-[#006064] text-white rounded-l-lg rounded-tr-lg'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-r-lg rounded-tl-lg'
                      }`}
                    >
                      {c.message}

                      {attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                          {attachments.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold underline text-emerald-200 hover:text-white"
                            >
                              <Paperclip className="w-3 h-3" /> View Attachment {idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex flex-col gap-2 shrink-0">
            {attachmentUrl && (
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#006064] bg-teal-50 px-3 py-1.5 border border-teal-200">
                <Paperclip className="w-3.5 h-3.5" /> Attached file ready to send
                <button type="button" onClick={() => setAttachmentUrl(null)} className="ml-auto text-red-500 font-bold">Remove</button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="p-3 text-gray-500 hover:text-[#006064] hover:bg-gray-100 transition-colors border border-gray-200"
                title="Attach file/image"
              >
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to Community Manager..."
                className="flex-1 px-4 py-3 border border-gray-200 focus:border-[#006064] outline-none text-xs font-bold text-gray-800"
              />

              <button
                type="submit"
                disabled={sending || (!newMessage.trim() && !attachmentUrl)}
                className="px-5 py-3 bg-[#006064] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#004d40] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
