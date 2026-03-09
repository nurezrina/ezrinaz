import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Star, Smile, X, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

type FeedbackType = 'CSAT' | 'NPS' | 'TEXT';

export const FeedbackWidget: React.FC = () => {
  const { user, actingAs } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>(() => {
    return (sessionStorage.getItem('feedback_type') as FeedbackType) || 'CSAT';
  });
  const [score, setScore] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'Bug' | 'Feature Request' | 'UX' | 'Performance' | 'Other'>('UX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    sessionStorage.setItem('feedback_type', type);
  }, [type]);

  // Accessibility: Handle Esc key and focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Focus the first interactive element in the panel
      const focusable = panelRef.current?.querySelectorAll('button, input, textarea, select');
      if (focusable && focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      type,
      score,
      message,
      category: type === 'TEXT' ? category : null,
      pageUrl: window.location.href,
      routeName: document.title || window.location.pathname,
      clientMeta: {
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        locale: navigator.language
      }
    };

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('virtus_token')}`,
          'x-app-session': localStorage.getItem('virtus_session') || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
        setMessage('');
        setScore(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center">
      {/* Feedback Tab */}
      {!isOpen && (
        <button
          ref={triggerRef}
          onClick={() => setIsOpen(true)}
          className="bg-virtus-navy text-white px-3 py-6 rounded-l-xl shadow-lg hover:bg-virtus-brand-blue transition-all flex flex-col items-center gap-2 group focus:ring-2 focus:ring-virtus-teal outline-none"
          aria-label="Open Feedback Panel"
          aria-expanded={isOpen}
        >
          <MessageSquare size={20} className="group-hover:scale-110 transition-transform" />
          <span className="[writing-mode:vertical-rl] font-bold tracking-widest uppercase text-[10px]">Feedback</span>
        </button>
      )}

      {/* Slide-out Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white w-80 h-[500px] shadow-2xl rounded-l-2xl border-l border-slate-200 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            {/* Header */}
            <div className="bg-virtus-navy p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-virtus-teal" />
                <h2 id="feedback-title" className="font-bold text-sm uppercase tracking-wider">Your Feedback</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close Feedback Panel"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isSuccess ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-virtus-navy text-lg">Thank You!</p>
                    <p className="text-slate-500 text-sm">Your feedback helps us build a better VIRTUS.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Type Selector */}
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['CSAT', 'NPS', 'TEXT'] as FeedbackType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setType(t);
                          setScore(null);
                          setError(null);
                        }}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                          type === t ? 'bg-white text-virtus-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* CSAT Rating */}
                  {type === 'CSAT' && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">How satisfied are you?</p>
                      <div className="flex justify-between gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setScore(s)}
                            className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center font-bold ${
                              score === s 
                                ? 'border-virtus-teal bg-virtus-teal/10 text-virtus-navy' 
                                : 'border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Poor</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  )}

                  {/* NPS Rating */}
                  {type === 'NPS' && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Likelihood to recommend?</p>
                      <div className="grid grid-cols-6 gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setScore(s)}
                            className={`h-8 rounded-lg border transition-all flex items-center justify-center text-xs font-bold ${
                              score === s 
                                ? 'border-virtus-blue bg-virtus-blue text-white' 
                                : 'border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>Not Likely</span>
                        <span>Very Likely</span>
                      </div>
                    </div>
                  )}

                  {/* Category Selector for TEXT */}
                  {type === 'TEXT' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-virtus-teal"
                      >
                        <option value="Bug">Bug Report</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="UX">UX Improvement</option>
                        <option value="Performance">Performance</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  {/* Message */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {type === 'TEXT' ? 'Description' : 'Comments (Optional)'}
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={type === 'TEXT' ? 'Please describe in detail (min 10 chars)...' : 'Tell us more...'}
                      className="w-full h-24 p-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-virtus-teal resize-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium">
                      <AlertCircle size={14} />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || (type === 'TEXT' && message.length < 10) || (type !== 'TEXT' && score === null)}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-virtus-navy border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={16} />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Powered by VIRTUS</span>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Star size={10} className="fill-current" />
                <span>v1.0.0</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
