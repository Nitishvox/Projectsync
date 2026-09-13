import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, Sparkles } from 'lucide-react';
import api from '../services/api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const quickPrompts = [
  'Create a high priority task: "Deploy staging build"',
  'What is the status of our projects?',
  'Create project: "Mobile App MVP"',
];

export function Copilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi! I am Momentum Copilot. I can create projects, create tasks, complete tasks, or summarize your progress. What would you like to do?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: queryText }]);
    setIsLoading(true);

    try {
      const response = await api.post('/agent/chat', {
        message: queryText,
        conversationHistory: messages.filter((m) => m.role !== 'system'),
      });

      if (response.data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: response.data.data.reply }]);
        window.dispatchEvent(new Event('copilot-action'));
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error: ' + (error.response?.data?.error || error.message),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(input);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-3.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all z-50 flex items-center justify-center cursor-pointer group"
          aria-label="Open AI Copilot"
        >
          <Bot className="w-6 h-6" />
          <span className="sr-only">Open Copilot</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 w-84 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden"
          style={{ height: '520px', maxHeight: '82vh' }}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3.5 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/20 rounded-md">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-xs leading-tight">Momentum Copilot</h3>
                <p className="text-[10px] text-blue-100">Groq LLM + Tool Execution</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-blue-50/70 dark:bg-slate-800/80 border-b border-blue-100/60 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendQuery(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-slate-700 font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-slate-950 flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Thinking & running tools...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Copilot to create tasks, projects..."
                className="w-full py-2 pl-3.5 pr-10 border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-2xs"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
