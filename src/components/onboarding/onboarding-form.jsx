"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contractor", label: "Contractor" },
  { value: "intern", label: "Intern" },
];

const DESIGNATION_ROLES = [
  // Engineering Roles
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

  // Business & Operations
  { value: "chief_executive_officer", label: "Chief Executive Officer" },
  { value: "chief_operating_officer", label: "Chief Operating Officer" },
  { value: "chief_financial_officer", label: "Chief Financial Officer" },

  // Sales & Marketing
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

  // Human Resources
  { value: "hr_specialist", label: "HR Specialist" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "director_of_human_resources", label: "Director of Human Resources" },
  { value: "vp_of_human_resources", label: "VP of Human Resources" },
  { value: "recruiter", label: "Recruiter" },
  { value: "talent_acquisition_manager", label: "Talent Acquisition Manager" },

  // Finance & Operations
  { value: "accountant", label: "Accountant" },
  { value: "financial_analyst", label: "Financial Analyst" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "business_analyst", label: "Business Analyst" },

  // Design & Creative
  { value: "ux_ui_designer", label: "UX/UI Designer" },
  { value: "graphic_designer", label: "Graphic Designer" },
  { value: "creative_director", label: "Creative Director" },

  // Support & Customer Success
  { value: "customer_support_specialist", label: "Customer Support Specialist" },
  { value: "customer_success_manager", label: "Customer Success Manager" },
  { value: "technical_support_engineer", label: "Technical Support Engineer" },

  // Administrative
  { value: "office_manager", label: "Office Manager" },
  { value: "executive_assistant", label: "Executive Assistant" },
  { value: "project_coordinator", label: "Project Coordinator" },
];

export default function OnboardingForm({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const [form, setForm] = useState({
    username: user.username || "",
    email: user.email || "",
    designation: "",
    employmentType: "",
    department: "",
    team: "",
    skills: "", // comma separated input
    experience: [],
    linkedin: "",
    github: "",
    twitter: "",
    website: "",
  });

  // Compute gamified profile completion for onboarding
  const completion = useMemo(() => {
    let score = 0;
    let total = 5; // Align with server completion: skills, experience, social (linkedin/github), designation, department
    const skillsCount = (form.skills || "").split(",").map((s)=>s.trim()).filter(Boolean).length;
    if (skillsCount > 0) score += 1;
    const hasExperience = Array.isArray(form.experience) && form.experience.some((e) => (e.company && e.company.trim()) || (e.title && e.title.trim()));
    if (hasExperience) score += 1;
    if (form.linkedin || form.github) score += 1;
    if (form.designation) score += 1;
    if (form.department) score += 1;
    return Math.round((score / total) * 100);
  }, [form.skills, form.experience, form.linkedin, form.github, form.designation, form.department]);

  async function onSubmit(e) {
    e.preventDefault();
    setErrors(null);
    setLoading(true);

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        designation: form.designation || undefined,
        employmentType: form.employmentType || undefined,
        department: form.department || undefined,
        team: form.team || undefined,
        profile: {
          skills: (form.skills || "").split(",").map((s)=>s.trim()).filter(Boolean),
          experience: (form.experience || [])
            .filter((exp) => (exp.company && exp.company.trim()) || (exp.title && exp.title.trim()))
            .map((exp) => ({
              company: exp.company || undefined,
              title: exp.title || undefined,
              startDate: exp.startDate ? new Date(exp.startDate).toISOString() : undefined,
              endDate: exp.endDate ? new Date(exp.endDate).toISOString() : undefined,
              description: exp.description || undefined,
            })),
          social: {
            linkedin: form.linkedin || undefined,
            github: form.github || undefined,
            twitter: form.twitter || undefined,
            website: form.website || undefined,
          },
        },
      };

      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrors(data.message || data);
        return;
      }

      // Notify admins about new onboarding submission
      try {
        await fetch('/api/notifications/onboarding-submitted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user._id,
            username: form.username,
            email: form.email,
          }),
        });
      } catch (notificationError) {
        console.error('Failed to send admin notification:', notificationError);
        // Don't fail the onboarding submission if notification fails
      }

      // Show success message and redirect to pending approval page
      alert(
        "Profile submitted successfully! Your request is pending admin approval. You will be notified once approved."
      );
      router.push("/pending-approval");
    } catch (e) {
      setErrors({ global: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  // Fetch departments and teams on mount
  useMemo(async () => {
    try {
      const [deptRes, teamRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/teams"),
      ]);

      if (deptRes.ok) {
        const deptData = await deptRes.json();
        setDepartments(deptData.data || []);
      }

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeams(teamData.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch departments/teams:", e);
    }
  }, []);

  // Filter teams by selected department (supports populated department object or id)
  const availableTeams = teams.filter((team) => {
    if (!form.department) return true;
    const deptId = typeof team.department === "string" ? team.department : team.department?._id;
    return deptId === form.department;
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {errors && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {typeof errors === "string" ? errors : JSON.stringify(errors)}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-[#E8E2D7] space-y-4">
        <h2 className="text-lg font-semibold text-[#151515]">Profile Completion</h2>
        <div>
          <div className="w-full bg-white border border-[#E8E2D7] rounded-full h-2 overflow-hidden">
            <div className="bg-[#151515] h-2" style={{ width: `${completion}%` }} />
          </div>
          <div className="text-sm text-neutral-600 mt-2">{completion}% complete</div>
          <ul className="mt-3 text-sm text-neutral-700 space-y-1">
            <li className={form.designation ? "text-green-600" : "text-neutral-500"}>• Choose a designation</li>
            <li className={form.employmentType ? "text-green-600" : "text-neutral-500"}>• Select employment type</li>
            <li className={form.department ? "text-green-600" : "text-neutral-500"}>• Select a department</li>
            <li className={form.team ? "text-green-600" : "text-neutral-500"}>• Select a team</li>
            <li className={(form.linkedin || form.github || form.twitter || form.website) ? "text-green-600" : "text-neutral-500"}>• Add at least one social link</li>
          </ul>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[#E8E2D7] space-y-4">
        <h2 className="text-lg font-semibold text-[#151515]">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Username
            </label>
            <input
              name="username"
              value={form.username}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Designation
            </label>
            <select
              name="designation"
              value={form.designation}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
            >
              <option value="">Select Your Role</option>
              {DESIGNATION_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Employment Type
            </label>
            <select
              name="employmentType"
              value={form.employmentType}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
            >
              <option value="">Select</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[#E8E2D7] space-y-4">
        <h2 className="text-lg font-semibold text-[#151515]">
          Company Information
        </h2>
        <p className="text-sm text-neutral-600">
          Select your department and team (this will be reviewed by HR)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Department
            </label>
            <select
              name="department"
              value={form.department}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Team
            </label>
            <select
              name="team"
              value={form.team}
              onChange={onChange}
              disabled={!form.department}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Team</option>
              {availableTeams.map((team) => (
                <option key={team._id} value={team._id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[#E8E2D7] space-y-4">
        <h2 className="text-lg font-semibold text-[#151515]">Skills</h2>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Skills (comma separated)</label>
          <input
            name="skills"
            value={form.skills}
            onChange={onChange}
            placeholder="e.g. React, Node.js, MongoDB"
            className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[#E8E2D7] space-y-4">
        <h2 className="text-lg font-semibold text-[#151515]">Experience</h2>
        {form.experience.map((exp, i) => (
          <div key={i} className="mb-4 p-4 border border-[#E8E2D7] rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <input
                placeholder="Company"
                value={exp.company || ""}
                onChange={(e) => {
                  const list = [...form.experience];
                  list[i] = { ...list[i], company: e.target.value };
                  setForm((f) => ({ ...f, experience: list }));
                }}
                className="px-4 py-3 rounded-lg bg-white border border-[#E8E2D7]"
              />
              <input
                placeholder="Title"
                value={exp.title || ""}
                onChange={(e) => {
                  const list = [...form.experience];
                  list[i] = { ...list[i], title: e.target.value };
                  setForm((f) => ({ ...f, experience: list }));
                }}
                className="px-4 py-3 rounded-lg bg-white border border-[#E8E2D7]"
              />
              <input
                type="date"
                placeholder="Start Date"
                value={exp.startDate || ""}
                onChange={(e) => {
                  const list = [...form.experience];
                  list[i] = { ...list[i], startDate: e.target.value };
                  setForm((f) => ({ ...f, experience: list }));
                }}
                className="px-4 py-3 rounded-lg bg-white border border-[#E8E2D7]"
              />
              <input
                type="date"
                placeholder="End Date"
                value={exp.endDate || ""}
                onChange={(e) => {
                  const list = [...form.experience];
                  list[i] = { ...list[i], endDate: e.target.value };
                  setForm((f) => ({ ...f, experience: list }));
                }}
                className="px-4 py-3 rounded-lg bg-white border border-[#E8E2D7]"
              />
            </div>
            <textarea
              placeholder="Description"
              value={exp.description || ""}
              onChange={(e) => {
                const list = [...form.experience];
                list[i] = { ...list[i], description: e.target.value };
                setForm((f) => ({ ...f, experience: list }));
              }}
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7]"
              rows={2}
            />
            <button
              type="button"
              onClick={() => {
                const list = form.experience.filter((_, idx) => idx !== i);
                setForm((f) => ({ ...f, experience: list }));
              }}
              className="text-sm text-red-600 mt-2"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, experience: [...f.experience, { company: "", title: "", startDate: "", endDate: "", description: "" }] }))}
          className="text-sm bg-white border border-[#E8E2D7] px-3 py-1 rounded"
        >
          Add Experience
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-[#E8E2D7] space-y-4">
        <h2 className="text-lg font-semibold text-[#151515]">Social Links</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              LinkedIn
            </label>
            <input
              name="linkedin"
              value={form.linkedin}
              onChange={onChange}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              GitHub
            </label>
            <input
              name="github"
              value={form.github}
              onChange={onChange}
              placeholder="https://github.com/username"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Twitter
            </label>
            <input
              name="twitter"
              value={form.twitter}
              onChange={onChange}
              placeholder="https://twitter.com/username"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Website
            </label>
            <input
              name="website"
              value={form.website}
              onChange={onChange}
              placeholder="https://yourwebsite.com"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-full bg-[#151515] text-white font-semibold shadow-[0_18px_30px_rgba(21,21,21,0.18)] hover:shadow-[0_22px_36px_rgba(21,21,21,0.22)] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Submitting..." : "Submit Profile"}
      </button>
    </form>
  );
}
