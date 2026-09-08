import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GeminiService } from '../../services/geminiService';
import type { StarCvBulletResult } from '../../services/geminiService';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Award, 
  Briefcase, 
  GraduationCap,
  Printer,
  Wand2,
  Code
} from 'lucide-react';

export const CvBuilder: React.FC = () => {
  const { profile } = useApp();
  const [copied, setCopied] = useState<boolean>(false);
  const [activeEnhanceId, setActiveEnhanceId] = useState<string | null>(null);
  const [rawBulletInput, setRawBulletInput] = useState<string>('');
  const [roleInput, setRoleInput] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [starResult, setStarResult] = useState<StarCvBulletResult | null>(null);

  const formatCvMarkdown = () => {
    return `# ${profile.personal.fullName.toUpperCase()}
${profile.personal.email} | ${profile.personal.phone} | ${profile.personal.currentCity}
Target: ${profile.intendedStudy.degreeLevel} in ${profile.intendedStudy.major}

---

## EDUCATION
**${profile.academic.institution}** (${profile.academic.graduationYear})
- Qualification: ${profile.academic.qualification} — Result: ${profile.academic.rawGpaText}
${profile.academic.academicAwards?.map(a => `- Honor: ${a}`).join('\n')}

---

## STANDARDIZED TESTING
- English Proficiency: ${profile.standardizedTests.englishTest.type} (Overall Score: ${profile.standardizedTests.englishTest.overallScore || 'N/A'})
- Admissions Test: ${profile.standardizedTests.standardizedTest.type} (Score: ${profile.standardizedTests.standardizedTest.totalScore || 'N/A'})

---

## LEADERSHIP & EXTRACURRICULAR ACTIVITIES
${profile.extracurriculars.map(ec => `### ${ec.title} — ${ec.organization}
*${ec.role} (${ec.hoursPerWeek} hrs/week)*
- ${ec.description}
- Impact: ${ec.achievements}`).join('\n\n')}

---

## PROJECTS & HONORS
${profile.achievements.map(ach => `### ${ach.title} (${ach.year})
- ${ach.description} ${ach.link ? `[${ach.link}]` : ''}`).join('\n\n')}
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatCvMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEnhanceBullet = async () => {
    if (!rawBulletInput.trim()) return;
    setIsEnhancing(true);
    try {
      const result = await GeminiService.enhanceCvBullet(rawBulletInput, roleInput || 'Participant', profile.intendedStudy.major);
      setStarResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/50 rounded-full pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>ATS-Compliant Academic Resume Builder</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Academic Resume & Common App Activity List
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Formatted strictly for global admissions committees (Harvard, Oxford, Toronto, TUM) with STAR-method action bullets.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <button
            onClick={() => {
              setActiveEnhanceId(activeEnhanceId ? null : 'custom');
              setRawBulletInput(profile.extracurriculars[0]?.description || '');
              setRoleInput(profile.extracurriculars[0]?.role || '');
              setStarResult(null);
            }}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Wand2 className="h-4 w-4 text-purple-600" />
            <span>AI Bullet Optimizer</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            title="Print or Save as PDF"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>Print PDF</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            {copied ? <Check className="h-4 w-4 text-white" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied Resume!' : 'Copy Markdown'}</span>
          </button>
        </div>
      </div>

      {/* AI STAR Bullet Optimizer Panel */}
      {activeEnhanceId && (
        <div className="p-5 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                AI STAR-Method Action Bullet Optimizer
              </h3>
            </div>
            <button
              onClick={() => setActiveEnhanceId(null)}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Raw Project / Role Note</label>
                <textarea
                  rows={3}
                  value={rawBulletInput}
                  onChange={(e) => setRawBulletInput(e.target.value)}
                  placeholder="e.g. Led school coding club and made an IoT flood alert device with Arduino."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="Role (e.g. Team Lead / President)"
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                />
                <button
                  onClick={handleEnhanceBullet}
                  disabled={isEnhancing || !rawBulletInput.trim()}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isEnhancing ? 'Rewriting...' : 'Optimize to STAR'}</span>
                </button>
              </div>
            </div>

            {starResult ? (
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 text-[11px] uppercase tracking-wider">High-Impact STAR Result</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold">
                    {starResult.impactMetrics}
                  </span>
                </div>
                <p className="font-semibold text-slate-900 leading-relaxed bg-white p-2.5 rounded-lg border border-purple-100">
                  {starResult.improvedBullet}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 pt-1">
                  <div><strong>Action:</strong> {starResult.action}</div>
                  <div><strong>Result:</strong> {starResult.result}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-center text-xs text-slate-400">
                Enter your project note on the left and click 'Optimize to STAR' to generate high-impact bullets.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Resume Sheet (Printable) */}
      <div id="printable-cv" className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 font-sans max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {(profile.personal.fullName || 'YOUR FULL LEGAL NAME').toUpperCase()}
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {profile.personal.email} • {profile.personal.phone} • {profile.personal.currentCity}
          </p>
          <p className="text-xs text-blue-700 font-semibold mt-0.5">
            Prospective Candidate: {profile.intendedStudy.degreeLevel} in {profile.intendedStudy.major} ({profile.intendedStudy.targetIntake})
          </p>
        </div>

        {/* Education */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            <span>Academic Qualifications</span>
          </h3>
          <div className="flex justify-between text-xs font-bold text-slate-900">
            <span>{profile.academic.institution}</span>
            <span>Graduation: {profile.academic.graduationYear}</span>
          </div>
          <p className="text-xs text-slate-700">
            Curriculum: <strong>{profile.academic.qualification}</strong> — Cumulative Result: <strong className="text-emerald-700">{profile.academic.rawGpaText}</strong>
          </p>
          {profile.academic.subjects && profile.academic.subjects.length > 0 && (
            <p className="text-xs text-slate-600">
              Key Coursework: {profile.academic.subjects.map(s => `${s.subject} (${s.grade})`).join(', ')}
            </p>
          )}
          {profile.academic.academicAwards && profile.academic.academicAwards.length > 0 && (
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-2">
              {profile.academic.academicAwards.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Standardized Testing */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Code className="h-4 w-4 text-blue-600" />
            <span>Standardized Admissions & Language Testing</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
            <p>• {profile.standardizedTests.englishTest.type} English: <strong>Band {profile.standardizedTests.englishTest.overallScore || 'N/A'}</strong></p>
            <p>• {profile.standardizedTests.standardizedTest.type} Exam: <strong>Total Score {profile.standardizedTests.standardizedTest.totalScore || 'N/A'} {profile.standardizedTests.standardizedTest.math ? `(Math: ${profile.standardizedTests.standardizedTest.math})` : ''}</strong></p>
          </div>
        </div>

        {/* Activities */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-blue-600" />
            <span>Extracurricular Leadership & Community Initiatives</span>
          </h3>
          {profile.extracurriculars.map((ec) => (
            <div key={ec.id} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-900">
                <span>{ec.title} — {ec.organization}</span>
                <span className="text-slate-500 font-normal">{ec.hoursPerWeek} hrs/week</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed pl-2 border-l-2 border-blue-500">
                {ec.description}
                {ec.achievements && <span className="block font-semibold text-emerald-800 mt-0.5">✓ Impact: {ec.achievements}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-blue-600" />
            <span>Technical Projects & Academic Honors</span>
          </h3>
          {profile.achievements.map((ach) => (
            <div key={ach.id} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-900">
                <span>{ach.title}</span>
                <span className="text-slate-500 font-normal">{ach.year}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed pl-2 border-l-2 border-slate-300">
                {ach.description}
              </p>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
