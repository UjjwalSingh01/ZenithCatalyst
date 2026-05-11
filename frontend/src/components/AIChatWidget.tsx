import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { useAIChat } from '../lib/hooks';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIChatWidget() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hi! I\'m your AI habit coach. Ask me anything about your habits — like "Which habit should I focus on next week?" or "How can I improve my consistency?"' },
    ]);
    const chat = useAIChat();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    async function handleSend() {
        const text = input.trim();
        if (!text || chat.isPending) return;
        setInput('');

        const userMsg: Message = { role: 'user', content: text };
        setMessages((prev) => [...prev, userMsg]);

        try {
            const res = await chat.mutateAsync(text);
            setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
        } catch {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t process that. Please try again.' }]);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <>
            {/* FAB */}
            <AnimatePresence>
                {!open && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onClick={() => setOpen(true)}
                        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-violet to-accent-cyan text-white flex items-center justify-center shadow-lg shadow-accent-violet/30 hover:shadow-xl hover:shadow-accent-violet/40 transition-shadow z-50"
                    >
                        <MessageCircle size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 w-[380px] max-h-[520px] rounded-2xl overflow-hidden flex flex-col z-50"
                        style={{
                            background: 'linear-gradient(135deg, rgba(17,22,38,0.98) 0%, rgba(11,15,26,0.98) 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center">
                                    <Bot size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">AI Coach</p>
                                    <p className="text-xs text-dark-400">Ask me about your habits</p>
                                </div>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-dark-400 hover:text-white transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="w-6 h-6 rounded-lg bg-accent-violet/20 flex items-center justify-center shrink-0 mt-1">
                                            <Bot size={12} className="text-accent-violet" />
                                        </div>
                                    )}
                                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user'
                                            ? 'bg-accent-violet/20 text-white'
                                            : 'bg-white/5 text-dark-200'
                                        }`}>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="w-6 h-6 rounded-lg bg-accent-cyan/20 flex items-center justify-center shrink-0 mt-1">
                                            <User size={12} className="text-accent-cyan" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {chat.isPending && (
                                <div className="flex gap-2 justify-start">
                                    <div className="w-6 h-6 rounded-lg bg-accent-violet/20 flex items-center justify-center shrink-0 mt-1">
                                        <Bot size={12} className="text-accent-violet" />
                                    </div>
                                    <div className="bg-white/5 rounded-xl px-4 py-3">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 rounded-full bg-dark-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-dark-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-dark-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about your habits..."
                                    className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-dark-400 outline-none focus:border-accent-violet/50 transition-colors"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || chat.isPending}
                                    className="p-2.5 rounded-xl bg-accent-violet/20 text-accent-violet hover:bg-accent-violet/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
