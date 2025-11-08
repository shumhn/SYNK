"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

const ROLE_OPTIONS = ["admin", "hr", "manager", "employee", "viewer"];
const DESIGNATION_ROLES = [
  { value: "software_engineer", label: "Software Engineer" },
  { value: "senior_software_engineer", label: "Senior Software Engineer" },
  { value: "lead_software_engineer", label: "Lead Software Engineer" },
  { value: "engineering_manager", label: "Engineering Manager" },
  { value: "director_of_engineering", label: "Director of Engineering" },
  { value: "vp_of_engineering", label: "VP of Engineering" },
  { value: "chief_technology_officer", label: "Chief Technology Officer" },
  { value: "frontend_developer", label: "Frontend Developer" },
  { value: "backend_developer", label: "Backend Developer" },
  { value: "full_stack_developer", label: "Full Stack Developer" },
  { value: "devops_engineer", label: "DevOps Engineer" },
  { value: "data_engineer", label: "Data Engineer" },
  { value: "data_scientist", label: "Data Scientist" },
  { value: "product_manager", label: "Product Manager" },
  { value: "architect", label: "Architect" },
  { value: "security_engineer", label: "Security Engineer" },
  { value: "qa_engineer", label: "QA Engineer" },
  { value: "chief_executive_officer", label: "Chief Executive Officer" },
  { value: "chief_operating_officer", label: "Chief Operating Officer" },
  { value: "chief_financial_officer", label: "Chief Financial Officer" },
  { value: "sales_representative", label: "Sales Representative" },
  { value: "senior_sales_representative", label: "Senior Sales Representative" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "director_of_sales", label: "Director of Sales" },
  { value: "vp_of_sales", label: "VP of Sales" },
  { value: "marketing_specialist", label: "Marketing Specialist" },
  { value: "marketing_manager", label: "Marketing Manager" },
  { value: "director_of_marketing", label: "Director of Marketing" },
  { value: "vp_of_marketing", label: "VP of Marketing" },
  { value: "content_marketing_manager", label: "Content Marketing Manager" },
  { value: "growth_hacker", label: "Growth Hacker" },
  { value: "hr_specialist", label: "HR Specialist" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "director_of_human_resources", label: "Director of Human Resources" },
  { value: "vp_of_human_resources", label: "VP of Human Resources" },
  { value: "recruiter", label: "Recruiter" },
  { value: "talent_acquisition_manager", label: "Talent Acquisition Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "financial_analyst", label: "Financial Analyst" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "business_analyst", label: "Business Analyst" },
  { value: "ux_ui_designer", label: "UX/UI Designer" },
  { value: "graphic_designer", label: "Graphic Designer" },
  { value: "creative_director", label: "Creative Director" },
  { value: "customer_support_specialist", label: "Customer Support Specialist" },
  { value: "customer_success_manager", label: "Customer Success Manager" },
  { value: "technical_support_engineer", label: "Technical Support Engineer" },
  { value: "office_manager", label: "Office Manager" },
  { value: "executive_assistant", label: "Executive Assistant" },
  { value: "project_coordinator", label: "Project Coordinator" },
];
const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contractor", label: "Contractor" },
  { value: "intern", label: "Intern" },
];

export default function NewUserForm({ departments = [], teams = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [pwd, setPwd] = useState("");
  const [expCount, setExpCount] = useState(0);

  const teamsByDept = useMemo(() => {
    const map = {};
    for (const t of teams) {
      const key = t.department?._id || "";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [teams]);

  async function onSubmit(e) {
    e.preventDefault();
    setErrors(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    let payload = {
      username: fd.get("username")?.toString().trim(),
      email: fd.get("email")?.toString().trim(),
      password: fd.get("password")?.toString(),
      designation: fd.get("designation")?.toString().trim() || undefined,
      employmentType: fd.get("employmentType") || undefined,
      department: fd.get("department") || undefined,
      team: fd.get("team") || undefined,
      roles: Array.from(e.currentTarget.querySelectorAll('input[name="roles"]:checked')).map((i) => i.value),
    };
    const social = {
      linkedin: fd.get("linkedin")?.toString().trim() || undefined,
      github: fd.get("github")?.toString().trim() || undefined,
      twitter: fd.get("twitter")?.toString().trim() || undefined,
      website: fd.get("website")?.toString().trim() || undefined,
    };
    const skillsInput = fd.get("skills")?.toString().trim();
    const companies = fd.getAll("exp_company[]").map((v) => v?.toString().trim());
    const titles = fd.getAll("exp_title[]").map((v) => v?.toString().trim());
    const starts = fd.getAll("exp_start[]").map((v) => v?.toString().trim());
    const ends = fd.getAll("exp_end[]").map((v) => v?.toString().trim());
    const descs = fd.getAll("exp_desc[]").map((v) => v?.toString().trim());

    const experience = (companies || []).map((_, i) => ({
      company: companies[i] || undefined,
      title: titles[i] || undefined,
      startDate: starts[i] ? new Date(starts[i]).toISOString() : undefined,
      endDate: ends[i] ? new Date(ends[i]).toISOString() : undefined,
      description: descs[i] || undefined,
    })).filter((exp) => (exp.company && exp.company.length) || (exp.title && exp.title.length));

    let profile = {};
    if (skillsInput) {
      profile.skills = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (experience.length > 0) {
      profile.experience = experience;
    }
    if (Object.values(social).some(Boolean)) {
      profile.social = social;
    }
    if (Object.keys(profile).length > 0) {
      payload = { ...payload, profile };
    }
    const sendInvite = fd.get("sendInvite") === "on";

    try {
      if (payload.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(payload.password)) {
        setErrors({ password: ["Password must be at least 8 characters, with uppercase, lowercase, number, and special character"] });
        setLoading(false);
        return;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrors(data.message || data);
        return;
      }
      // If admin chose to send invite and no password was set, trigger password reset email
      if (sendInvite && !payload.password && payload.email) {
        try {
          await fetch("/api/auth/password-reset/request", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: payload.email }),
          });
        } catch (err) {
          // ignore invite failures to not block user creation flow
        }
      }
      router.push("/admin/users");
    } catch (e) {
      setErrors({ global: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errors && (
        <div className="p-3 bg-red-600 text-white rounded">
          {typeof errors === "string" ? errors : JSON.stringify(errors)}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input name="username" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" name="email" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            name="password"
            className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            minLength={8}
            placeholder="Leave blank to send invite or use Google SSO"
            value={pwd}
            onChange={(e)=> setPwd(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Must include uppercase, lowercase, number, and special character. Or leave blank and send invite.</p>
          {errors?.password && <p className="text-xs text-red-400 mt-1">{Array.isArray(errors.password) ? errors.password[0] : String(errors.password)}</p>}
          {pwd && (
            <ul className="text-xs mt-2 space-y-1">
              <li className={(pwd.length >= 8 ? "text-green-400" : "text-gray-400")}>• At least 8 characters</li>
              <li className={( /[A-Z]/.test(pwd) ? "text-green-400" : "text-gray-400")}>• Contains an uppercase letter</li>
              <li className={( /[a-z]/.test(pwd) ? "text-green-400" : "text-gray-400")}>• Contains a lowercase letter</li>
              <li className={( /\d/.test(pwd) ? "text-green-400" : "text-gray-400")}>• Contains a number</li>
              <li className={( /[!@#$%^&*]/.test(pwd) ? "text-green-400" : "text-gray-400")}>• Contains a special character (!@#$%^&*)</li>
            </ul>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">Designation</label>
          <select name="designation" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Select Your Role</option>
            {DESIGNATION_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Employment Type</label>
          <select name="employmentType" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Select</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Department</label>
          <select name="department" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" onChange={(e)=>{
            const deptId = e.target.value;
            const teamSelect = document.querySelector('select[name="team"]');
            if (teamSelect) {
              teamSelect.value = "";
              teamSelect.disabled = !deptId;
              const options = teamSelect.querySelectorAll('option[data-dept]');
              options.forEach((o)=>{
                const d = o.getAttribute('data-dept');
                o.hidden = !!(d && deptId && d !== deptId);
              });
            }
          }}>
            <option value="">Unassigned</option>
            {departments.map((d)=> (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Team</label>
          <select name="team" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" disabled>
            <option value="">Unassigned</option>
            {teams.map((t)=> (
              <option key={t._id} value={t._id} data-dept={t.department?._id || ""}>{t.name}{t.department?.name ? ` (${t.department.name})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Skills (comma separated)</label>
          <input name="skills" placeholder="e.g. React, Node.js, MongoDB" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
      </div>

      <div className="border-t border-neutral-800 pt-4">
        <h3 className="text-lg mb-3">Experience</h3>
        {Array.from({ length: expCount }).map((_, i) => (
          <div key={i} className="mb-4 p-3 border border-neutral-700 rounded">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              <input name="exp_company[]" placeholder="Company" className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
              <input name="exp_title[]" placeholder="Title" className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
              <input name="exp_start[]" type="date" placeholder="Start Date" className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
              <input name="exp_end[]" type="date" placeholder="End Date" className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
            </div>
            <textarea name="exp_desc[]" placeholder="Description" className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" rows={2} />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setExpCount((c) => c + 1)} className="text-sm bg-neutral-800 px-3 py-1 rounded">Add Experience</button>
          {expCount > 0 && (
            <button type="button" onClick={() => setExpCount((c) => Math.max(0, c - 1))} className="text-sm text-red-400">Remove Last</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">LinkedIn</label>
          <input name="linkedin" placeholder="https://linkedin.com/in/username" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">GitHub</label>
          <input name="github" placeholder="https://github.com/username" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Twitter</label>
          <input name="twitter" placeholder="https://twitter.com/username" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Website</label>
          <input name="website" placeholder="https://yourwebsite.com" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2">Roles</label>
        <div className="flex flex-wrap gap-3">
          {ROLE_OPTIONS.map((r)=> (
            <label key={r} className="inline-flex items-center gap-2">
              <input type="checkbox" name="roles" value={r} defaultChecked={r === "employee"} />
              <span className="text-sm">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="sendInvite" defaultChecked />
          <span className="text-sm">Send invite email to set password if left blank</span>
        </label>
      </div>

      <div className="pt-2">
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>
    </form>
  );
}
