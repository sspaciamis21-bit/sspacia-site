'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Shield, MessageSquare } from 'lucide-react';

interface Message {
  id: number;
  authorType: 'CUSTOMER' | 'STAFF';
  authorUser?: { name: string };
  authorCustomer?: { name: string };
  body: string;
  createdAt: string;
}

interface NegotiationChatProps {
  negotiationId?: number;
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading?: boolean;
}

export const NegotiationChat: React.FC<NegotiationChatProps> = ({ 
  messages, 
  onSendMessage, 
  isLoading = false 
}) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(inputText.trim());
      setInputText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-[var(--surface-lowest)] rounded-3xl border border-[var(--outline-variant)]/30 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-[var(--outline-variant)]/20 bg-[var(--surface-low)]/50 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
          <MessageSquare size={18} />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] italic text-[#1B1C1C]">Negotiation Thread</h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-center space-y-3">
             <MessageSquare size={32} />
             <p className="text-[10px] font-bold uppercase tracking-widest">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isStaff = msg.authorType === 'STAFF';
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: isStaff ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex gap-3 ${isStaff ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isStaff ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-white border border-gray-100 text-gray-400'
                }`}>
                  {isStaff ? <Shield size={14} /> : <User size={14} />}
                </div>
                
                <div className={`flex flex-col max-w-[80%] ${isStaff ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isStaff 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'bg-[var(--surface-low)] text-[#1B1C1C]'
                  }`}>
                    {msg.body}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest mt-1.5 opacity-40 italic">
                    {isStaff ? (msg.authorUser?.name || 'Staff') : (msg.authorCustomer?.name || 'Customer')} 
                    • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[var(--surface-low)]/30 border-t border-[var(--outline-variant)]/20">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your feedback or message..."
            className="w-full bg-white border border-[var(--outline-variant)]/30 rounded-2xl p-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all resize-none min-h-[80px]"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending || isLoading}
            className={`
              absolute right-3 bottom-3 p-3 rounded-xl transition-all
              ${!inputText.trim() || sending || isLoading 
                ? 'bg-gray-100 text-gray-300' 
                : 'bg-[var(--primary)] text-white hover:scale-110 active:scale-95 shadow-lg shadow-[var(--primary)]/20'}
            `}
          >
            {sending ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                 <Send size={18} />
              </motion.div>
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
