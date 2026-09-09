import React, { useState } from 'react';
import { SchoolB2bService } from '../../services/schoolB2bService';
import { 
  Building, 
  Users, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Search, 
  Mail, 
  GraduationCap,
  Globe,
  Layers
} from 'lucide-react';

export const SchoolCounselorPortal: React.FC = () => {
  const org = SchoolB2bService.getOrganization();
  const cohorts = SchoolB2bService.getCohorts();
  const [selectedCohortId, setSelectedCohortId] = useState<string>(cohorts[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Urgent' | 'On Track'>('All');

  const analytics = SchoolB2bService.getCohortAnalytics(selectedCohortId);
  const rawStudents = SchoolB2bService.getStudentsByCohort(selectedCohortId);

  const filteredStudents = rawStudents.filter(s => {
    if (statusFilter === 'Urgent' && s.readinessScore >= 50 && s.criticalBlockersCount === 0) return false;
    if (statusFilter === 'On Track' && (s.readinessScore < 50 || s.criticalBlockersCount > 0)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchMajor = s.targetMajor.toLowerCase().includes(q);
      if (!matchName && !matchMajor) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Organization Banner (Step 45) */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Building className="h-3.5 w-3.5" />
              <span>School & Counselor Enterprise Portal (Step 45)</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {org.name}
            </h1>
            <p className="text-xs text-slate-300">
              Department of College Counseling • {org.activeCohortsCount} Active Cohorts • {org.totalStudentsCount} Enrolled Applicants
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300 font-medium">Active Cohort:</span>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl bg-white/10 border border-white/20 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {cohorts.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name} ({c.academicYear})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FERPA / GDPR Privacy Notice */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Student Ownership Principle:</strong> Student accounts remain individually owned. Counselors can view application readiness and review authorized documents without controlling student encryption keys.
            </span>
          </div>
        </div>
      </div>

      {/* Aggregate Cohort Analytics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Cohort Students</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.totalStudents}</div>
          <p className="text-[11px] text-slate-500 font-medium">Active college candidates</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Average Readiness</span>
            <GraduationCap className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{analytics.averageReadinessScore}%</div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full" 
              style={{ width: `${analytics.averageReadinessScore}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Needs Intervention</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">
            {analytics.studentsNeedingUrgentAttention}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Critical blockers or score &lt; 50%</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Applications</span>
            <Globe className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {analytics.totalApplicationsSubmitted}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Tracked in Command Centers</p>
        </div>
      </div>

      {/* Top Destination Distribution */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-blue-600" />
          <span>Cohort Destination Preferences</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {analytics.topDestinationCountries.map((dest, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{dest.flag}</span>
                <span className="text-xs font-bold text-slate-800">{dest.country}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-700">
                {dest.count} apps
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cohort Student Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Student Progress Roster</h3>
            <p className="text-xs text-slate-500">Monitor readiness benchmarks, missing blocker items, and application pipelines.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or major..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Urgent">Needs Action</option>
              <option value="On Track">On Track</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-3">Student Candidate</th>
                <th className="p-3">Intended Major & Degree</th>
                <th className="p-3">Target Countries</th>
                <th className="p-3">Application Readiness</th>
                <th className="p-3">Blockers</th>
                <th className="p-3">Privacy Consent</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-semibold text-slate-900">
                    <div className="font-bold text-slate-900">{student.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{student.email}</div>
                  </td>

                  <td className="p-3">
                    <div className="font-medium text-slate-800">{student.targetMajor}</div>
                    <div className="text-[11px] text-slate-500">{student.targetDegree}</div>
                  </td>

                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {student.targetCountries.map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-[10px] text-slate-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="space-y-1 w-28">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className={student.readinessScore >= 75 ? 'text-emerald-700' : student.readinessScore >= 50 ? 'text-blue-700' : 'text-amber-700'}>
                          {student.readinessScore}%
                        </span>
                        <span className="text-slate-400 font-normal">{student.applicationsCount} apps</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            student.readinessScore >= 75 ? 'bg-emerald-500' : student.readinessScore >= 50 ? 'bg-blue-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${student.readinessScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    {student.criticalBlockersCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1 w-max">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span>{student.criticalBlockersCount} Blocker{student.criticalBlockersCount > 1 ? 's' : ''}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 w-max">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span>All Clear</span>
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {student.hasGrantedCounselorAccess ? (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold flex items-center gap-1 w-max">
                        <ShieldCheck className="h-3 w-3 text-blue-600" />
                        <span>Access Granted</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold flex items-center gap-1 w-max">
                        <Lock className="h-3 w-3 text-slate-400" />
                        <span>Restricted by Student</span>
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <button 
                      onClick={() => alert(`Counselor reminder sent to ${student.fullName} (${student.email})`)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                    >
                      <Mail className="h-3 w-3 text-slate-400" />
                      <span>Nudge</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
