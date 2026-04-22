"use client";

import { useState } from "react";
import type { ContractNegotiation } from "@/types/clm";




export default function NegotiationThread({ negotiation, role, onReply }: {
  negotiation: ContractNegotiation;
  role: "ADMIN" | "USER";
  onReply: (nid: number, message: string, action?: "ACCEPT" | "REJECT") => Promise<void>;
}) {

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(negotiation.status === "OPEN");

  const statusColor =
    negotiation.status === "OPEN"
      ? "#FF5722"
      : negotiation.status === "ACCEPTED"
      ? "#10B981"
      : negotiation.status === "REJECTED"
      ? "#EF4444"
      : "#94A3B8";


  async function handleSend(action?: "ACCEPT" | "REJECT") {
    if (!message.trim() && !action) return;
    setLoading(true);
    try {
      await onReply(negotiation.id, message || (action === "ACCEPT" ? "Accepted." : "Rejected."), action);
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="clm-negotiation-thread group"
      style={{
        border: "1px solid var(--outline-variant)",
        borderRadius: 0,
        overflow: "hidden",
        marginBottom: 20,
        background: "var(--surface-low)",
        boxShadow: "none"
      }}
    >

      {/* Thread header */}
      <div
        className="clm-thread-header"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid var(--outline-variant)" : "none",
          background: "var(--surface-lowest)",
        }}
      >

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 0,
              background: statusColor,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1B1C1C", textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {negotiation.title}
          </span>
          <span
            style={{
              fontSize: 9,
              color: "#9E9E9E",
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              background: 'rgba(0,0,0,0.05)',
              padding: '2px 8px',
              borderRadius: 0
            }}
          >
            {negotiation.messages.length} msg
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: statusColor,
              padding: "4px 12px",
              borderRadius: 0,
              background: `${statusColor}08`,
              border: `1px solid ${statusColor}33`,
            }}
          >
            {negotiation.status}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0)",
              transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              color: "rgba(255,255,255,0.2)",
            }}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>


      {expanded && (
        <div className="clm-thread-content">
          <div className="custom-scrollbar" style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, maxHeight: "350px", overflowY: "auto" }}>
            {negotiation.messages.map((msg) => {
              const isStaff = msg.authorType === "STAFF";
              const authorName = isStaff
                ? msg.authorUser?.name ?? "Admin"
                : msg.authorCustomer?.name ?? "Customer";
              const initials = authorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    flexDirection: isStaff ? "row-reverse" : "row",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 0,
                      background: isStaff ? "var(--clm-primary)" : "var(--surface-lowest)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color: isStaff ? "#fff" : "#616161",
                      flexShrink: 0,
                      border: isStaff ? "none" : "1px solid var(--outline-variant)",
                    }}
                  >
                    {initials}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                        flexDirection: isStaff ? "row-reverse" : "row",
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#1B1C1C", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {authorName}
                      </span>
                      <span style={{ fontSize: 9, color: "#9E9E9E", fontWeight: 600 }}>
                        {new Date(msg.createdAt).toLocaleString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>

                    </div>
                    <div
                      className="clm-message-bubble"
                      style={{
                        padding: "12px 16px",
                        borderRadius: 0,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: isStaff ? "#fff" : "#1B1C1C",
                        background: isStaff ? "var(--clm-primary)" : "var(--surface-lowest)",
                        border: isStaff ? "none" : "1px solid var(--outline-variant)",
                        textAlign: "left",
                        width: 'fit-content',
                        maxWidth: '85%',
                        marginLeft: isStaff ? 'auto' : '0'
                      }}
                    >
                      {msg.body}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply box — only if thread is OPEN */}
          {negotiation.status === "OPEN" && (
            <div
              className="clm-thread-reply"
              style={{
                padding: "24px",
                borderTop: "1px solid var(--outline-variant)",
                background: "var(--surface-lowest)",
              }}
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Compose a response..."
                rows={3}
                style={{
                  width: "100%",
                  background: "var(--surface-lowest)",
                  border: "1px solid var(--outline-variant)",
                  borderRadius: 0,
                  color: "#1B1C1C",
                  fontSize: 13,
                  padding: "16px",
                  resize: "none",
                  outline: "none",
                  marginBottom: 16,
                  transition: 'all 0.3s',
                  boxShadow: 'none'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--clm-primary)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: 'wrap' }}>
                {role === "ADMIN" && (
                  <>
                    <button
                      onClick={() => handleSend("REJECT")}
                      disabled={loading}
                      style={{ 
                        padding: '10px 18px',
                        borderRadius: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        border: '1px solid #FF5A5A',
                        background: 'rgba(255,90,90,0.05)',
                        color: '#FF5A5A',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,90,90,0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,90,90,0.05)'}
                    >
                      Reject Thread
                    </button>
                    <button
                      onClick={() => handleSend("ACCEPT")}
                      disabled={loading}
                      style={{ 
                        padding: '10px 18px',
                        borderRadius: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        border: '1px solid #00D4AA',
                        background: 'rgba(0,212,170,0.05)',
                        color: '#00D4AA',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,212,170,0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,212,170,0.05)'}
                    >
                      Accept & Close
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !message.trim()}
                  style={{ 
                    padding: '10px 24px',
                    borderRadius: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    background: 'var(--clm-primary)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: 'none',
                    transition: 'all 0.3s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {loading ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>

          )}
        </div>
      )}
    </div>
  );
}
