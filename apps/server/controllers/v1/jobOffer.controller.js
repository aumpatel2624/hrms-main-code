/**
 * Job Offer (ADR-019, HRMS module 3) — compensation/terms extended to a
 * candidate. Duplicate-offer-per-applicant guard on create; a status change
 * to Accepted/Rejected syncs the linked Job Applicant (application-code
 * equivalent of source's `on_change` hook). `makeEmployee` builds a
 * prefilled payload only — the client still POSTs it to /employees itself.
 *
 * Vacancy-cap check against Staffing Plan added by ADR-021 (module 5),
 * closing OPEN-QUESTIONS.md Q-8 — applied at create, the closest analog to
 * source's submit-time `validate_vacancies` since this doctype has no
 * docstatus (ADR-016).
 */
import { runListQuery } from "../../utils/listQuery.js";
import JobOffer from "../../models/JobOffer.js";
import JobApplicant from "../../models/JobApplicant.js";
import { findActivePlanDetail, getDesignationCounts } from "./staffingPlan.controller.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const validateVacancyCap = async (designationId, companyId, onDate) => {
  if (!designationId) return null;
  const found = await findActivePlanDetail(designationId, companyId, onDate || new Date());
  if (!found) return null;
  const { plan, detail } = found;
  if (!detail.numberOfPositions) return null;
  const { employeeCount, jobOpenings } = await getDesignationCounts(designationId, companyId);
  if (employeeCount + jobOpenings >= detail.numberOfPositions) {
    return `There are no vacancies under Staffing Plan ${plan._id} for this designation`;
  }
  return null;
};

const REQUIRED_FIELDS = ["jobApplicantId", "offerDate", "companyId"];
const OPTIONAL_FIELDS = [
  "status", "designationId", "offerTerms", "jobOfferTermTemplateId", "terms", "isActive",
];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

const syncApplicantStatus = async (jobApplicantId, status) => {
  if (status === "Accepted" || status === "Rejected") {
    await JobApplicant.findByIdAndUpdate(jobApplicantId, { status });
  }
};

export const createJobOffer = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    const { jobApplicantId } = req.body;

    const duplicate = await JobOffer.findOne({ jobApplicantId, status: { $ne: "Cancelled" } });
    if (duplicate) {
      return res.status(409).json({
        isOk: false, status: 409,
        message: `A Job Offer already exists for this Job Applicant`,
      });
    }

    const fields = pickFields(req.body);
    if (!fields.designationId) {
      const applicant = await JobApplicant.findById(jobApplicantId);
      if (applicant?.designationId) fields.designationId = applicant.designationId;
    }

    const vacancyError = await validateVacancyCap(fields.designationId, fields.companyId, fields.offerDate);
    if (vacancyError) {
      return res.status(409).json({ isOk: false, status: 409, message: vacancyError });
    }

    const doc = await JobOffer.create(fields);
    if (doc.status) await syncApplicantStatus(jobApplicantId, doc.status);

    return res.status(201).json({ isOk: true, status: 201, message: "Job Offer created successfully" });
  } catch (error) {
    console.log("Error in createJobOffer", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateJobOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const doc = await JobOffer.findById(offerId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Offer not found" });
    }
    Object.assign(doc, pickFields(req.body));
    await doc.save();
    if (doc.status) await syncApplicantStatus(doc.jobApplicantId, doc.status);
    return res.status(200).json({ isOk: true, status: 200, message: "Job Offer updated successfully" });
  } catch (error) {
    console.log("Error in updateJobOffer", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteJobOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const doc = await JobOffer.findById(offerId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Offer not found" });
    }
    const referenceInfo = await getReferencingCounts("JobOffer", offerId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Job Offer. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await JobOffer.findByIdAndUpdate(offerId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Job Offer deleted successfully" });
  } catch (error) {
    console.log("Error in deleteJobOffer", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getJobOfferById = async (req, res) => {
  try {
    const doc = await JobOffer.findById(req.params.offerId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Offer not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getJobOfferById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobOffers = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.jobApplicantId) filter.jobApplicantId = req.query.jobApplicantId;
    const docs = await JobOffer.find(filter).select("jobApplicantId status offerDate companyId");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listJobOffers", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobOffersByParams = async (req, res) => {
  try {
    const list = await runListQuery(JobOffer, req.body, {
      searchFields: [],
      filterable: {
        jobApplicantId: "objectId", companyId: "objectId", designationId: "objectId",
        status: "enum", offerDate: "date", isActive: "boolean", createdAt: "date",
      },
      stages: [
        { $lookup: { from: "jobapplicants", localField: "jobApplicantId", foreignField: "_id", as: "jobApplicant" } },
        {
          $addFields: {
            applicantName: { $arrayElemAt: ["$jobApplicant.applicantName", 0] },
            applicantEmail: { $arrayElemAt: ["$jobApplicant.emailId", 0] },
          },
        },
      ],
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// Prefilled Employee payload for the client to review/POST — never
// auto-creates the Employee (source: `make_employee`, manual by design).
export const makeEmployeeFromJobOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const offer = await JobOffer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Offer not found" });
    }
    const applicant = await JobApplicant.findById(offer.jobApplicantId);
    if (!applicant) {
      return res.status(404).json({ isOk: false, status: 404, message: "Linked Job Applicant not found" });
    }
    const payload = {
      employeeName: applicant.applicantName,
      companyId: offer.companyId,
      designationId: offer.designationId || applicant.designationId,
      dateOfJoining: offer.offerDate,
      jobApplicantId: applicant._id,
    };
    return res.status(200).json({ isOk: true, status: 200, data: payload });
  } catch (error) {
    console.log("Error in makeEmployeeFromJobOffer", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
