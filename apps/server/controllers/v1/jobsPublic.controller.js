/**
 * Public job board (ADR-019) — the second public router in this codebase
 * (see ADR-004 for the first, SEO). Deliberately NOT built on runListQuery/
 * the generic `filterable` mechanism: that trust boundary is designed for
 * authenticated internal screens, and reusing it for an anonymous caller is
 * a wider surface than a hardcoded, field-allowlisted read path needs.
 * status="Open" and publish=true are hardcoded server-side, never
 * client-supplied. No public write endpoint here — see OPEN-QUESTIONS.md Q-7.
 */
import JobOpening from "../../models/JobOpening.js";
import Company from "../../models/Company.js";
import Department from "../../models/Department.js";
import EmploymentType from "../../models/EmploymentType.js";
import Branch from "../../models/Branch.js";

const PAGE_SIZE = 20;
const ALLOWED_FILTER_KEYS = ["company", "department", "employmentType", "location"];

const baseMatch = () => ({
  status: "Open",
  publish: true,
  $or: [{ closesOn: null }, { closesOn: { $gte: new Date(new Date().toDateString()) } }],
});

const buildTextSearch = (query) => {
  if (!query) return null;
  const escaped = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { $or: [{ jobTitle: { $regex: escaped, $options: "i" } }, { description: { $regex: escaped, $options: "i" } }] };
};

const toPublicShape = (opening, lookups) => {
  const shape = {
    route: opening.route,
    jobTitle: opening.jobTitle,
    company: lookups.companies.get(String(opening.companyId)) || null,
    department: lookups.departments.get(String(opening.departmentId)) || null,
    employmentType: lookups.employmentTypes.get(String(opening.employmentTypeId)) || null,
    location: lookups.branches.get(String(opening.branchId)) || null,
    postedOn: opening.postedOn,
    closesOn: opening.closesOn || null,
  };
  if (opening.publishSalaryRange) {
    shape.salary = {
      lowerRange: opening.lowerRange,
      upperRange: opening.upperRange,
      currency: opening.currency,
      salaryPer: opening.salaryPer,
    };
  }
  return shape;
};

const idsOf = (openings, field) =>
  [...new Set(openings.map((o) => o[field]).filter(Boolean).map(String))];

const buildLookups = async (openings) => {
  const companyIds = idsOf(openings, "companyId");
  const departmentIds = idsOf(openings, "departmentId");
  const employmentTypeIds = idsOf(openings, "employmentTypeId");
  const branchIds = idsOf(openings, "branchId");

  const [companies, departments, employmentTypes, branches] = await Promise.all([
    Company.find({ _id: { $in: companyIds } }).select("companyName"),
    Department.find({ _id: { $in: departmentIds } }).select("departmentName"),
    EmploymentType.find({ _id: { $in: employmentTypeIds } }).select("employmentTypeName"),
    Branch.find({ _id: { $in: branchIds } }).select("branchName"),
  ]);
  return {
    companies: new Map(companies.map((c) => [String(c._id), c.companyName])),
    departments: new Map(departments.map((d) => [String(d._id), d.departmentName])),
    employmentTypes: new Map(employmentTypes.map((e) => [String(e._id), e.employmentTypeName])),
    branches: new Map(branches.map((b) => [String(b._id), b.branchName])),
  };
};

export const listPublicJobs = async (req, res) => {
  try {
    const match = baseMatch();
    for (const key of ALLOWED_FILTER_KEYS) {
      const raw = req.query[key];
      if (!raw) continue;
      const values = Array.isArray(raw) ? raw : [raw];
      const field = key === "company" ? "companyId" : key === "department" ? "departmentId" : key === "employmentType" ? "employmentTypeId" : "branchId";
      match[field] = { $in: values };
    }
    const textSearch = buildTextSearch(req.query.query);
    const finalMatch = textSearch ? { $and: [match, textSearch] } : match;

    const sort = req.query.sort === "asc" ? { postedOn: 1 } : { postedOn: -1 };
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const [total, openings] = await Promise.all([
      JobOpening.countDocuments(finalMatch),
      JobOpening.find(finalMatch).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    ]);

    const lookups = await buildLookups(openings);
    return res.status(200).json({
      isOk: true,
      status: 200,
      data: {
        jobs: openings.map((o) => toPublicShape(o, lookups)),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    });
  } catch (error) {
    console.log("Error in listPublicJobs", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getPublicJobByRoute = async (req, res) => {
  try {
    const route = `${req.params.company}/${req.params.jobSlug}`;
    const opening = await JobOpening.findOne({ route, status: "Open", publish: true });
    if (!opening) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job not found" });
    }
    const lookups = await buildLookups([opening]);
    const shape = toPublicShape(opening, lookups);
    shape.description = opening.description || "";
    return res.status(200).json({ isOk: true, status: 200, data: shape });
  } catch (error) {
    console.log("Error in getPublicJobByRoute", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
