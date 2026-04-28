import React, { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { Button } from '@rs/ui';
import { Send, Bot, User, Loader2, Zap, MessageSquare } from 'lucide-react';
import { Streamdown } from 'streamdown';
import type { EquipmentNode, Cable } from '../../../shared/equipment-types';

interface Props {
  nodes: EquipmentNode[];
  cables: Cable[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const quickPrompts = [
  { label: 'Analyze my routing', prompt: '' },
  { label: 'Check gain staging', prompt: 'Is my gain staging correct? Are there any clipping issues?' },
  { label: 'Suggest improvements', prompt: 'What improvements would you suggest for my current signal flow?' },
  { label: 'Explain signal levels', prompt: 'Explain the difference between mic level, line level, and speaker level signals.' },
  { label: 'Phantom power safety', prompt: 'What are the safety rules for phantom power (+48V) and which microphones need it?' },
];

export default function AssistantPanel({ nodes, cables }: Props) {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analyzeMutation = trpc.assistant.analyze.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: String(data.response) }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (question?: string) => {
    const q = question ?? input.trim();
    if (nodes.length === 0 && !q) return;

    const userMsg = q || 'Analyze my current routing setup.';
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    analyzeMutation.mutate({
      nodes: nodes as any[],
      cables: cables as any[],
      question: q || undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col bg-[#111] border-l border-[#222]">
        <div className="p-3 border-b border-[#222]">
          <div className="text-sm font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#E8A020' }}>
            AI ASSISTANT
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <Bot className="w-10 h-10 text-[#333] mb-4" />
          <p className="text-sm text-[#A89F94] mb-2">Sign in to access the AI assistant</p>
          <p className="text-xs text-[#555] mb-4">Get real-time feedback on your routing, gain staging, and equipment choices.</p>
          <a href={getLoginUrl()}>
            <Button size="sm" className="bg-[#E8A020] text-[#0D0D0D] hover:bg-[#d4911c] text-xs font-bold tracking-wider">
              SIGN IN
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#111] border-l border-[#222]">
      {/* Header */}
      <div className="p-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#E8A020]" />
          <div className="text-sm font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", color: '#E8A020' }}>
            AI ASSISTANT
          </div>
        </div>
        <p className="text-[10px] text-[#555] mt-1">
          {nodes.length} devices · {cables.length} cables in workspace
        </p>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="p-3 border-b border-[#222] space-y-1.5">
          <div className="text-[9px] text-[#555] tracking-wider font-bold mb-1">QUICK ACTIONS</div>
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.prompt)}
              disabled={analyzeMutation.isPending}
              className="w-full text-left px-2.5 py-1.5 rounded bg-[#1a1a1a] border border-[#222] text-[10px] text-[#A89F94] hover:border-[#E8A020]/30 hover:text-[#F5F0E8] transition-colors flex items-center gap-2"
            >
              <Zap className="w-3 h-3 text-[#E8A020] shrink-0" />
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-8 h-8 text-[#222] mb-3" />
            <p className="text-xs text-[#555]">Ask me about your signal routing, gain staging, or audio engineering concepts.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-[#E8A020]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-[#E8A020]" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[#E8A020]/20 text-[#F5F0E8]'
                : 'bg-[#1a1a1a] border border-[#222] text-[#A89F94]'
            }`}>
              {msg.role === 'assistant' ? (
                <Streamdown>{msg.content}</Streamdown>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-[#A89F94]" />
              </div>
            )}
          </div>
        ))}
        {analyzeMutation.isPending && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-[#E8A020]/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#E8A020]" />
            </div>
            <div className="bg-[#1a1a1a] border border-[#222] rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 text-[#E8A020] animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#222]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about signal flow..."
            disabled={analyzeMutation.isPending}
            className="flex-1 bg-[#1a1a1a] border border-[#333] text-[#F5F0E8] text-xs rounded px-3 py-2 focus:border-[#E8A020] outline-none placeholder:text-[#555] disabled:opacity-50"
          />
          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={analyzeMutation.isPending}
            className="bg-[#E8A020] text-[#0D0D0D] hover:bg-[#d4911c] px-3"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
