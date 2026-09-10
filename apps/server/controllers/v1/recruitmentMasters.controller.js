/**
 * Recruitment masters (ADR-019, HRMS module 3): Job Applicant Source,
 * Interview Type, Job Offer Term Template. Grouped in one file the way
 * organizationSetup.controller.js groups Company/Branch/Designation/etc —
 * simple lookups, not substantial enough to earn their own files.
 */
import { runListQuery } from "../../utils/listQuery.js";
import JobApplicantSource from "../../models/JobApplicantSource.js";
import InterviewType from "../../models/InterviewType.js";
import JobOfferTermTemplate from "../../models/JobOfferTermTemplate.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

const referenceGuardedDelete = async (Model, modelName, id, label) => {
  const referenceInfo = await getReferencingCounts(modelName, id);
  if (referenceInfo.totalReferences > 0) {
    return {
      blocked: true,
      body: {
        isOk: false,
        status: 409,
        message: `Cannot delete ${label}. It is being used by other records.`,
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      },
    };
  }
  await Model.findByIdAndUpdate(id, { isDeleted: true });
  return { blocked: false };
};

// --------------------------------------------------------- Job Applicant Source --

export const createJobApplicantSource = async (req, res) => {
  try {
    const { sourceName, isActive } = req.body;
    if (!sourceName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Source name is required" });
    }
    const existing = await JobApplicantSource.findOne({ sourceName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Job Applicant Source already exists" });
    }
    await JobApplicantSource.create({ sourceName, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Job Applicant Source created successfully" });
  } catch (error) {
    console.log("Error in createJobApplicantSource", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateJobApplicantSource = async (req, res) => {
  try {
    const { sourceId } = req.params;
    const source = await JobApplicantSource.findById(sourceId);
    if (!source) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Applicant Source not found" });
    }
    source.sourceName = req.body.sourceName;
    source.isActive = req.body.isActive;
    await source.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Job Applicant Source updated successfully" });
  } catch (error) {
    console.log("Error in updateJobApplicantSource", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteJobApplicantSource = async (req, res) => {
  try {
    const { sourceId } = req.params;
    const source = await JobApplicantSource.findById(sourceId);
    if (!source) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Applicant Source not found" });
    }
    const result = await referenceGuardedDelete(JobApplicantSource, "JobApplicantSource", sourceId, "job applicant source");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Job Applicant Source deleted successfully" });
  } catch (error) {
    console.log("Error in deleteJobApplicantSource", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getJobApplicantSourceById = async (req, res) => {
  try {
    const source = await JobApplicantSource.findById(req.params.sourceId);
    if (!source) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Applicant Source not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: source });
  } catch (error) {
    console.log("Error in getJobApplicantSourceById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobApplicantSources = async (req, res) => {
  try {
    const sources = await JobApplicantSource.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: sources });
  } catch (error) {
    console.log("Error in listJobApplicantSources", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobApplicantSourcesByParams = async (req, res) => {
  try {
    const list = await runListQuery(JobApplicantSource, req.body, {
      searchFields: ["sourceName"],
      filterable: { sourceName: "string", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// --------------------------------------------------------------- Interview Type --

export const createInterviewType = async (req, res) => {
  try {
    const { interviewTypeName, designationId, expectedAverageRating, defaultInterviewers, isActive } = req.body;
    if (!interviewTypeName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Interview type name is required" });
    }
    const existing = await InterviewType.findOne({ interviewTypeName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Interview Type already exists" });
    }
    await InterviewType.create({ interviewTypeName, designationId, expectedAverageRating, defaultInterviewers, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Interview Type created successfully" });
  } catch (error) {
    console.log("Error in createInterviewType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateInterviewType = async (req, res) => {
  try {
    const { interviewTypeId } = req.params;
    const interviewType = await InterviewType.findById(interviewTypeId);
    if (!interviewType) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview Type not found" });
    }
    const { interviewTypeName, designationId, expectedAverageRating, defaultInterviewers, isActive } = req.body;
    Object.assign(interviewType, { interviewTypeName, designationId, expectedAverageRating, defaultInterviewers, isActive });
    await interviewType.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Interview Type updated successfully" });
  } catch (error) {
    console.log("Error in updateInterviewType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteInterviewType = async (req, res) => {
  try {
    const { interviewTypeId } = req.params;
    const interviewType = await InterviewType.findById(interviewTypeId);
    if (!interviewType) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview Type not found" });
    }
    const result = await referenceGuardedDelete(InterviewType, "InterviewType", interviewTypeId, "interview type");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Interview Type deleted successfully" });
  } catch (error) {
    console.log("Error in deleteInterviewType", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getInterviewTypeById = async (req, res) => {
  try {
    const interviewType = await InterviewType.findById(req.params.interviewTypeId);
    if (!interviewType) {
      return res.status(404).json({ isOk: false, status: 404, message: "Interview Type not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: interviewType });
  } catch (error) {
    console.log("Error in getInterviewTypeById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listInterviewTypes = async (req, res) => {
  try {
    const interviewTypes = await InterviewType.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: interviewTypes });
  } catch (error) {
    console.log("Error in listInterviewTypes", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listInterviewTypesByParams = async (req, res) => {
  try {
    const list = await runListQuery(InterviewType, req.body, {
      searchFields: ["interviewTypeName"],
      filterable: { interviewTypeName: "string", designationId: "objectId", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// --------------------------------------------------------- Job Offer Term Template --

export const createJobOfferTermTemplate = async (req, res) => {
  try {
    const { templateName, offerTerms, isActive } = req.body;
    if (!templateName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Template name is required" });
    }
    const existing = await JobOfferTermTemplate.findOne({ templateName });
    if (existing) {
      return res.status(400).json({ isOk: false, status: 400, message: "Job Offer Term Template already exists" });
    }
    await JobOfferTermTemplate.create({ templateName, offerTerms, isActive });
    return res.status(201).json({ isOk: true, status: 201, message: "Job Offer Term Template created successfully" });
  } catch (error) {
    console.log("Error in createJobOfferTermTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateJobOfferTermTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await JobOfferTermTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Offer Term Template not found" });
    }
    const { templateName, offerTerms, isActive } = req.body;
    Object.assign(template, { templateName, offerTerms, isActive });
    await template.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Job Offer Term Template updated successfully" });
  } catch (error) {
    console.log("Error in updateJobOfferTermTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteJobOfferTermTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await JobOfferTermTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Offer Term Template not found" });
    }
    const result = await referenceGuardedDelete(JobOfferTermTemplate, "JobOfferTermTemplate", templateId, "job offer term template");
    if (result.blocked) return res.status(409).json(result.body);
    return res.status(200).json({ isOk: true, status: 200, message: "Job Offer Term Template deleted successfully" });
  } catch (error) {
    console.log("Error in deleteJobOfferTermTemplate", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getJobOfferTermTemplateById = async (req, res) => {
  try {
    const template = await JobOfferTermTemplate.findById(req.params.templateId);
    if (!template) {
      return res.status(404).json({ isOk: false, status: 404, message: "Job Offer Term Template not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: template });
  } catch (error) {
    console.log("Error in getJobOfferTermTemplateById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobOfferTermTemplates = async (req, res) => {
  try {
    const templates = await JobOfferTermTemplate.find({ isActive: true });
    return res.status(200).json({ isOk: true, status: 200, data: templates });
  } catch (error) {
    console.log("Error in listJobOfferTermTemplates", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listJobOfferTermTemplatesByParams = async (req, res) => {
  try {
    const list = await runListQuery(JobOfferTermTemplate, req.body, {
      searchFields: ["templateName"],
      filterable: { templateName: "string", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
