import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GeminiService } from '../../services/geminiService';
import type { ChatMessage } from '../../types';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  RefreshCw,
  Download,
  Key
} from 'lucide-react';

export const AiCounselorChat: React.FC = () => {
  const { profile, universities, scholarships, setActiveTab } = useApp();
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('uniadmission_chat_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `### 🎓 Welcome ${profile.personal.fullName || 'Student'}!
I am your **24/7 AI Admission Counselor** at UniAdmission.

I have evaluated your profile credentials:
- **Curriculum:** ${profile.academic.qualification} (GPA: ${profile.academic.rawGpaText})
- **Target Degree & Major:** ${profile.intendedStudy.degreeLevel} in ${profile.intendedStudy.major} (Intake: ${profile.intendedStudy.targetIntake})
- **Financial Ceiling:** $${profile.financial.maxYearlyBudgetUSD} USD/year (${profile.financial.scholarshipNeed} scholarship dependency)
- **Standardized Credentials:** ${profile.standardizedTests.englishTest.type} ${profile.standardizedTests.englishTest.overallScore || 'Not taken'} | ${profile.standardizedTests.standardizedTest.type} ${profile.standardizedTests.standardizedTest.totalScore || 'Not taken'}

What strategy or university questions can I solve for you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Recommend my Reach / Target / Safe portfolio',
          'Which full-ride scholarships match my profile?',
          'How should I approach my Statement of Purpose (SOP)?',
          'Is my SAT score competitive for US scholarships?',
          'Compare Canada vs Germany for my budget'
        ]
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasApiKey = Boolean(GeminiService.getApiKey());
  const activeModel = GeminiService.getModel();

  useEffect(() => {
    localStorage.setItem('uniadmission_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputQuery('');
    setIsTyping(true);

    // Build history for Gemini
    const history = nextMessages.map(m => ({
      role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      text: m.text
    }));

    try {
      const replyText = await GeminiService.queryAiCounselor(
        text, 
        profile, 
        universities, 
        scholarships,
        history
      );
      
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'View Matched Universities',
          'Explore Eligible Scholarships',
          'Open SOP Assistant',
          'Check Application Deadlines'
        ]
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === 'View Matched Universities') {
      setActiveTab('universities');
    } else if (suggestion === 'Explore Eligible Scholarships') {
      setActiveTab('scholarships');
    } else if (suggestion === 'Open SOP Assistant') {
      setActiveTab('sop');
    } else if (suggestion === 'Check Application Deadlines') {
      setActiveTab('roadmap');
    } else {
      handleSendMessage(suggestion);
    }
  };

  const exportChatTranscript = () => {
    const transcriptText = messages.map(m => `[${m.timestamp}] ${m.sender.toUpperCase()}:\n${m.text}\n\n`).join('---\n\n');
    const blob = new Blob([transcriptText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UniAdmission_Counseling_Transcript_${profile.personal.fullName || 'Student'}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-4 pb-12 h-[calc(100vh-8rem)] flex flex-col">
      
      {/* Header */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                UniAdmission AI Counselor
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                hasApiKey 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {hasApiKey ? <Key className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                <span>{hasApiKey ? `Live Gemini (${activeModel})` : 'Expert Engine'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Personalized admissions guidance calibrated to {profile.personal.fullName || 'Student'}'s profile
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportChatTranscript}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition text-xs flex items-center gap-1 border border-slate-200"
            title="Download chat transcript as Markdown"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">Export</span>
          </button>

          <button
            onClick={() => {
              setMessages([messages[0]]);
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition text-xs flex items-center gap-1 border border-slate-200"
            title="Reset Conversation"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">Clear</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                isUser ? 'bg-slate-900' : 'bg-blue-600'
              }`}>
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div className="max-w-2xl space-y-2">
                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-xs'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
                }`}>
                  <div className="prose prose-sm max-w-none text-xs space-y-2 whitespace-pre-wrap">
                    {msg.text}
                  </div>
                </div>

                <div className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </div>

                {/* Suggestion Chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(sug)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-medium transition flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3 text-blue-500" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>AI Counselor is analyzing global admissions data...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        className="p-2 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask anything: 'Can I get into U of T?', 'Explain how to win the KAIST full-ride', 'Chevening tips'..."
          className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isTyping}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

    </div>
  );
};
