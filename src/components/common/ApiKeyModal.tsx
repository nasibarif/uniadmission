import React, { useState } from 'react';
import { Modal } from './Modal';
import { GeminiService } from '../../services/geminiService';
import { Key, Sparkles, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [keyInput, setKeyInput] = useState<string>(() => GeminiService.getApiKey());
  const [selectedModel, setSelectedModel] = useState<string>(() => GeminiService.getModel());
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState<boolean>(false);

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await GeminiService.testApiKey(keyInput, selectedModel);
    setTesting(false);
    setTestResult(result);
  };

  const handleSave = () => {
    GeminiService.setApiKey(keyInput.trim());
    GeminiService.setModel(selectedModel);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setKeyInput('');
    GeminiService.setApiKey('');
    setTestResult(null);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Google Gemini AI Integration"
      subtitle="Connect your free Google Gemini API key to enable live unbounded LLM counselor dialogues, tailored SOP drafting, and AI CV enhancements."
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-950">Dual-Mode AI Intelligence</p>
            <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">
              When connected, UniAdmission queries live Google Gemini hosted models in real-time. If offline or without an API key, our high-precision built-in admissions engine provides comprehensive guidance automatically.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Google Gemini API Key
          </label>
          <div className="relative">
            <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="password"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setTestResult(null);
              }}
              placeholder="AIzaSy..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-400">Stored strictly in browser LocalStorage.</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              <span>Get free key at Google AI Studio</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Preferred Gemini Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fastest & High Reasoning)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Strategy & Complex SOP Polish)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy High Speed)</option>
          </select>
        </div>

        {/* Test Connection Button & Live Feedback */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testing || !keyInput.trim()}
              onClick={handleTestKey}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-blue-600" />}
              <span>{testing ? 'Testing connection...' : 'Test API Connection'}</span>
            </button>
          </div>

          {testResult && (
            <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {testResult.valid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{testResult.message}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-red-600 transition font-medium"
          >
            Clear Key / Reset
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs transition"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
