import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GeminiService } from '../../services/geminiService';
import type { SopSection, SopCritique } from '../../services/geminiService';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  CheckCircle2, 
  Download, 
  Award, 
  AlertCircle, 
  FileText,
  History,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react';

export interface SopRevision {
  id: string;
  timestamp: string;
  universityName: string;
  major: string;
  tone: string;
  sections: SopSection[];
  wordCount: number;
}

export const SopAssistant: React.FC = () => {
  const { profile, universities, userTier } = useApp();

  const [selectedUniName, setSelectedUniName] = useState<string>(universities[0]?.name || 'Purdue University');
  const [targetMajor, setTargetMajor] = useState<string>(profile.intendedStudy.major);
  const [keyProjects, setKeyProjects] = useState<string>(
    profile.extracurriculars[0]?.title ? `${profile.extracurriculars[0]?.title} (${profile.extracurriculars[0]?.organization})` : 'an IoT-enabled Flood Alert telemetry device'
  );
  const [careerGoals, setCareerGoals] = useState<string>(profile.intendedStudy.careerGoal || 'Lead software innovation in scalable distributed systems');
  const [reasonsForChoosing, setReasonsForChoosing] = useState<string>('Cutting-edge AI research labs, world-class faculty, and innovative undergraduate engineering co-op programs.');
  const [selectedTone, setSelectedTone] = useState<'Balanced & Narrative' | 'Academic & Research-Heavy' | 'Bold & Entrepreneurial' | 'Concise & Direct'>('Balanced & Narrative');
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);
  const [critique, setCritique] = useState<SopCritique | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);
  const [revisionSavedToast, setRevisionSavedToast] = useState<boolean>(false);

  // Step 30: Revision Tracking & Version History
  const [revisions, setRevisions] = useState<SopRevision[]>(() => {
    const saved = localStorage.getItem('uniadmission_sop_revisions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  // Default initial structured SOP sections
  const [sections, setSections] = useState<SopSection[]>(() => {
    return GeminiService.generateStructuredSop({
      universityName: selectedUniName,
      major: targetMajor,
      degreeLevel: profile.intendedStudy.degreeLevel,
      keyProjects,
      careerGoals,
      reasonsForChoosing,
      tone: selectedTone,
      profile
    });
  });

  const saveRevisionSnapshot = (customSections?: SopSection[]) => {
    const secToSave = customSections || sections;
    const count = secToSave.map(s => s.content).join(' ').split(/\s+/).filter(Boolean).length;
    const newRevision: SopRevision = {
      id: `rev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      universityName: selectedUniName,
      major: targetMajor,
      tone: selectedTone,
      sections: JSON.parse(JSON.stringify(secToSave)),
      wordCount: count
    };
    const updated = [newRevision, ...revisions.slice(0, 19)]; // Keep latest 20
    setRevisions(updated);
    localStorage.setItem('uniadmission_sop_revisions', JSON.stringify(updated));
    setRevisionSavedToast(true);
    setTimeout(() => setRevisionSavedToast(false), 2500);
  };

  const restoreRevision = (rev: SopRevision) => {
    setSections(rev.sections);
    setSelectedUniName(rev.universityName);
    setTargetMajor(rev.major);
    setSelectedTone(rev.tone as any);
    setIsRevisionModalOpen(false);
  };

  const deleteRevision = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = revisions.filter(r => r.id !== id);
    setRevisions(updated);
    localStorage.setItem('uniadmission_sop_revisions', JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCritique(null);
    try {
      const generated = await GeminiService.generateSopWithAi({
        universityName: selectedUniName,
        major: targetMajor,
        degreeLevel: profile.intendedStudy.degreeLevel,
        keyProjects,
        careerGoals,
        reasonsForChoosing,
        tone: selectedTone,
        profile
      }, userTier);
      setSections(generated);
      // Auto-save generated version as a revision snapshot
      saveRevisionSnapshot(generated);
    } catch (err) {
      console.error('SOP generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSectionContentChange = (index: number, newContent: string) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, content: newContent } : s));
  };

  const getFullSopText = () => {
    return sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullSopText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const text = `# Statement of Purpose\n**Applicant:** ${profile.personal.fullName || 'Student'}\n**Target University:** ${selectedUniName}\n**Program:** ${profile.intendedStudy.degreeLevel} in ${targetMajor}\n\n---\n\n` + getFullSopText();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOP_${(profile.personal.fullName || 'Student').replace(/\s+/g, '_')}_${selectedUniName.slice(0, 15).replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleRunCritique = async () => {
    setIsCritiquing(true);
    const fullText = getFullSopText();
    const result = await GeminiService.critiqueSop(fullText, selectedUniName, targetMajor, userTier);
    setCritique(result);
    setIsCritiquing(false);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>AI Statement of Purpose (SOP) Studio</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Statement of Purpose Structurer & AI Reviewer
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Synthesize academic coursework, key projects, leadership anecdotes, and institutional fit into a cohesive 5-part admissions committee SOP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 relative z-10">
          <button
            onClick={() => setIsRevisionModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="View revision history"
          >
            <History className="h-4 w-4 text-blue-600" />
            <span>Revisions ({revisions.length})</span>
          </button>

          <button
            onClick={() => saveRevisionSnapshot()}
            className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="Save manual revision snapshot"
          >
            <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
            <span>{revisionSavedToast ? 'Snapshot Saved!' : 'Save Snapshot'}</span>
          </button>

          <button
            onClick={handleRunCritique}
            disabled={isCritiquing}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Award className={`h-4 w-4 ${isCritiquing ? 'animate-spin' : ''}`} />
            <span>{isCritiquing ? 'Analyzing...' : 'AI Critique'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="Download formatted markdown"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Export .MD</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied!' : 'Copy Draft'}</span>
          </button>
        </div>
      </div>

      {/* AI Scorecard Modal/Panel if generated */}
      {critique && (
        <div className="p-5 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                {critique.overallScore}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  AI Admissions Committee Evaluation Score: <span className="text-purple-600">{critique.overallScore}/100</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Calibrated for {selectedUniName} • {targetMajor}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="text-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Readability</span>
                <span className="font-bold text-slate-800">{critique.readabilityScore}%</span>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Hook Impact</span>
                <span className="font-bold text-slate-800">{critique.hookStrengthScore}%</span>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Uni Alignment</span>
                <span className="font-bold text-slate-800">{critique.institutionalAlignmentScore}%</span>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold">Specificity</span>
                <span className="font-bold text-slate-800">{critique.specificityScore}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1.5">
              <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Key Strengths</span>
              </h4>
              <ul className="space-y-1 text-slate-700 list-disc list-inside text-[11px] leading-relaxed">
                {critique.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 space-y-1.5">
              <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span>Areas to Elevate</span>
              </h4>
              <ul className="space-y-1 text-slate-700 list-disc list-inside text-[11px] leading-relaxed">
                {critique.areasForImprovement.map((a, idx) => <li key={idx}>{a}</li>)}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1.5">
              <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span>Actionable Revisions</span>
              </h4>
              <ul className="space-y-1 text-slate-700 list-disc list-inside text-[11px] leading-relaxed">
                {critique.keyActionItems.map((k, idx) => <li key={idx}>{k}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 2 Columns: Input Controls & Interactive Section Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Context & Prompt Customization */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            SOP Parameters & Profile Context
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target University
            </label>
            <select
              value={selectedUniName}
              onChange={(e) => setSelectedUniName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {universities.map(u => (
                <option key={u.id} value={u.name}>{u.flag} {u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Degree & Major
            </label>
            <input
              type="text"
              value={targetMajor}
              onChange={(e) => setTargetMajor(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tone & Voice
            </label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Balanced & Narrative">Balanced & Narrative (Story-driven)</option>
              <option value="Academic & Research-Heavy">Academic & Research-Heavy (STEM focus)</option>
              <option value="Bold & Entrepreneurial">Bold & Entrepreneurial (Leadership focus)</option>
              <option value="Concise & Direct">Concise & Direct (European format)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Key Anchor Project / Anecdote
            </label>
            <textarea
              rows={2}
              value={keyProjects}
              onChange={(e) => setKeyProjects(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Why this specific university?
            </label>
            <textarea
              rows={2}
              value={reasonsForChoosing}
              onChange={(e) => setReasonsForChoosing(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Post-Graduation 5-Year Goal
            </label>
            <textarea
              rows={2}
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Synthesizing with Gemini AI...' : 'Generate / Polish SOP'}</span>
          </button>
        </div>

        {/* Right 2 Columns: 5-Part Structured SOP Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Structured 5-Paragraph Draft
            </h3>
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Admissions Committee Standard</span>
            </span>
          </div>

          <div className="space-y-4">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-blue-700 uppercase tracking-wider">
                    {sec.title}
                  </h4>
                  <span className="text-[11px] text-slate-400 italic">
                    💡 {sec.tips}
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={sec.content}
                  onChange={(e) => handleSectionContentChange(idx, e.target.value)}
                  className="w-full p-3 text-xs leading-relaxed rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans"
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Revisions History Modal (Step 30) */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  SOP Revision History & Draft Snapshots
                </h3>
              </div>
              <button 
                onClick={() => setIsRevisionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Each AI generation and manual snapshot is tracked with word count and timestamp. Restore any previous draft at any time.
            </p>

            {revisions.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-slate-50 rounded-xl border border-slate-100">
                <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No revisions saved yet</p>
                <p className="text-[11px] text-slate-400">Click "Save Snapshot" or generate an SOP to record a version.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 space-y-1">
                {revisions.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-xl hover:bg-slate-50 transition flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{rev.universityName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                          {rev.tone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{rev.timestamp}</span>
                        <span>•</span>
                        <span>{rev.wordCount} words</span>
                        <span>•</span>
                        <span>{rev.major}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => restoreRevision(rev)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={(e) => deleteRevision(rev.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete snapshot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[11px]">{revisions.length} total snapshots stored</span>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
