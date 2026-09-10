/**
 * Training Program, Training Event, Training Feedback, Skill, Employee
 * Skill Map (ADR-022, HRMS module 6). No docstatus, no naming series
 * (ADR-016). Training Result/Training Result Employee are folded into
 * TrainingEvent.employees[] — markCompleted/markScheduled reproduce
 * source's real on_update_after_submit cascade explicitly.
 */
import TrainingProgram from "../../models/TrainingProgram.js";
import TrainingEvent from "../../models/TrainingEvent.js";
import TrainingFeedback from "../../models/TrainingFeedback.js";
import Skill from "../../models/Skill.js";
import EmployeeSkillMap from "../../models/EmployeeSkillMap.js";
import Employee from "../../models/Employee.js";
import Designation from "../../models/Designation.js";
import { runListQuery } from "../../utils/listQuery.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

// --------------------------------------------------------------- Training Program --

export const createTrainingProgram = async (req, res) => {
  try {
    const { trainingProgramName, companyId, description } = req.body;
    if (!trainingProgramName || !companyId || !description) {
      return res.status(400).json({ isOk: false, status: 400, message: "Training Program Name, Company and Description are required" });
    }
    const existing = await TrainingProgram.findOne({ trainingProgramName });
    if (existing) {
      return res.status(409).json({ isOk: false, status: 409, message: "Training Program already exists" });
    }
    await TrainingProgram.create(req.body);
    return res.status(201).json({ isOk: true, status: 201, message: "Training Program created successfully" });
  } catch (error) {
    console.log("Error in createTrainingProgram", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateTrainingProgram = async (req, res) => {
  try {
    const { trainingProgramId } = req.params;
    const doc = await TrainingProgram.findById(trainingProgramId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Program not found" });
    }
    if (req.body.trainingProgramName && req.body.trainingProgramName !== doc.trainingProgramName) {
      const conflict = await TrainingProgram.findOne({ trainingProgramName: req.body.trainingProgramName });
      if (conflict) {
        return res.status(409).json({ isOk: false, status: 409, message: "Training Program already exists" });
      }
    }
    Object.assign(doc, req.body);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Training Program updated successfully" });
  } catch (error) {
    console.log("Error in updateTrainingProgram", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteTrainingProgram = async (req, res) => {
  try {
    const { trainingProgramId } = req.params;
    const doc = await TrainingProgram.findById(trainingProgramId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Program not found" });
    }
    const referenceInfo = await getReferencingCounts("TrainingProgram", trainingProgramId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Training Program. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await TrainingProgram.findByIdAndUpdate(trainingProgramId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Training Program deleted successfully" });
  } catch (error) {
    console.log("Error in deleteTrainingProgram", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getTrainingProgramById = async (req, res) => {
  try {
    const doc = await TrainingProgram.findById(req.params.trainingProgramId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Program not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getTrainingProgramById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listTrainingPrograms = async (_req, res) => {
  try {
    const docs = await TrainingProgram.find({ isActive: true }).select("trainingProgramName");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listTrainingPrograms", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listTrainingProgramsByParams = async (req, res) => {
  try {
    const list = await runListQuery(TrainingProgram, req.body, {
      searchFields: ["trainingProgramName", "trainerName"],
      filterable: {
        trainingProgramName: "string", companyId: "objectId", status: "enum",
        isActive: "boolean", createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ----------------------------------------------------------------- Training Event --

export const createTrainingEvent = async (req, res) => {
  try {
    const { eventName, type, location, startTime, endTime, introduction } = req.body;
    if (!eventName || !type || !location || !startTime || !endTime || !introduction) {
      return res.status(400).json({ isOk: false, status: 400, message: "Event Name, Type, Location, Start Time, End Time and Introduction are required" });
    }
    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      return res.status(400).json({ isOk: false, status: 400, message: "End time cannot be before start time" });
    }
    const existing = await TrainingEvent.findOne({ eventName });
    if (existing) {
      return res.status(409).json({ isOk: false, status: 409, message: "Training Event already exists" });
    }
    await TrainingEvent.create(req.body);
    return res.status(201).json({ isOk: true, status: 201, message: "Training Event created successfully" });
  } catch (error) {
    console.log("Error in createTrainingEvent", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateTrainingEvent = async (req, res) => {
  try {
    const { trainingEventId } = req.params;
    const doc = await TrainingEvent.findById(trainingEventId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Event not found" });
    }
    const startTime = req.body.startTime ?? doc.startTime;
    const endTime = req.body.endTime ?? doc.endTime;
    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      return res.status(400).json({ isOk: false, status: 400, message: "End time cannot be before start time" });
    }
    if (req.body.eventName && req.body.eventName !== doc.eventName) {
      const conflict = await TrainingEvent.findOne({ eventName: req.body.eventName });
      if (conflict) {
        return res.status(409).json({ isOk: false, status: 409, message: "Training Event already exists" });
      }
    }
    Object.assign(doc, req.body);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Training Event updated successfully" });
  } catch (error) {
    console.log("Error in updateTrainingEvent", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteTrainingEvent = async (req, res) => {
  try {
    const { trainingEventId } = req.params;
    const doc = await TrainingEvent.findById(trainingEventId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Event not found" });
    }
    const referenceInfo = await getReferencingCounts("TrainingEvent", trainingEventId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Training Event. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await TrainingEvent.findByIdAndUpdate(trainingEventId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Training Event deleted successfully" });
  } catch (error) {
    console.log("Error in deleteTrainingEvent", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getTrainingEventById = async (req, res) => {
  try {
    const doc = await TrainingEvent.findById(req.params.trainingEventId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Event not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getTrainingEventById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listTrainingEvents = async (_req, res) => {
  try {
    const docs = await TrainingEvent.find({ isActive: true }).select("eventName eventStatus");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listTrainingEvents", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listTrainingEventsByParams = async (req, res) => {
  try {
    const list = await runListQuery(TrainingEvent, req.body, {
      searchFields: ["eventName", "location", "course"],
      filterable: {
        eventName: "string", eventStatus: "enum", type: "enum", companyId: "objectId",
        trainingProgramId: "objectId", isActive: "boolean", createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// Source's real on_update_after_submit cascade, run explicitly since there's
// no docstatus transition to trigger it (ADR-022).
export const markTrainingEventCompleted = async (req, res) => {
  try {
    const doc = await TrainingEvent.findById(req.params.trainingEventId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Event not found" });
    }
    for (const row of doc.employees) {
      if (row.attendance === "Present" && row.status !== "Feedback Submitted") {
        row.status = "Completed";
      }
    }
    doc.eventStatus = "Completed";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Training Event marked Completed" });
  } catch (error) {
    console.log("Error in markTrainingEventCompleted", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const markTrainingEventScheduled = async (req, res) => {
  try {
    const doc = await TrainingEvent.findById(req.params.trainingEventId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Event not found" });
    }
    for (const row of doc.employees) row.status = "Open";
    doc.eventStatus = "Scheduled";
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Training Event reopened as Scheduled" });
  } catch (error) {
    console.log("Error in markTrainingEventScheduled", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// -------------------------------------------------------------- Training Feedback --

export const createTrainingFeedback = async (req, res) => {
  try {
    const { employeeId, trainingEventId, feedback } = req.body;
    if (!employeeId || !trainingEventId || !feedback) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee, Training Event and Feedback are required" });
    }
    const event = await TrainingEvent.findById(trainingEventId);
    if (!event) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Event not found" });
    }
    if (event.eventStatus !== "Completed") {
      return res.status(400).json({ isOk: false, status: 400, message: "Training Event must be Completed" });
    }
    const attendeeRow = event.employees.find((e) => String(e.employeeId) === String(employeeId));
    if (!attendeeRow) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee not found in Training Event Participants" });
    }
    if (attendeeRow.attendance === "Absent") {
      return res.status(400).json({ isOk: false, status: 400, message: "Feedback cannot be recorded for an absent Employee" });
    }

    await TrainingFeedback.create({ employeeId, trainingEventId, feedback });
    attendeeRow.status = "Feedback Submitted";
    await event.save();

    return res.status(201).json({ isOk: true, status: 201, message: "Training Feedback created successfully" });
  } catch (error) {
    console.log("Error in createTrainingFeedback", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteTrainingFeedback = async (req, res) => {
  try {
    const { trainingFeedbackId } = req.params;
    const doc = await TrainingFeedback.findById(trainingFeedbackId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Feedback not found" });
    }
    const referenceInfo = await getReferencingCounts("TrainingFeedback", trainingFeedbackId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Training Feedback. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await TrainingFeedback.findByIdAndUpdate(trainingFeedbackId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Training Feedback deleted successfully" });
  } catch (error) {
    console.log("Error in deleteTrainingFeedback", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getTrainingFeedbackById = async (req, res) => {
  try {
    const doc = await TrainingFeedback.findById(req.params.trainingFeedbackId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Training Feedback not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getTrainingFeedbackById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listTrainingFeedbacks = async (_req, res) => {
  try {
    const docs = await TrainingFeedback.find({ isActive: true }).select("employeeId trainingEventId");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listTrainingFeedbacks", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listTrainingFeedbacksByParams = async (req, res) => {
  try {
    const list = await runListQuery(TrainingFeedback, req.body, {
      searchFields: ["feedback"],
      filterable: { employeeId: "objectId", trainingEventId: "objectId", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// -------------------------------------------------------------------------- Skill --

export const createSkill = async (req, res) => {
  try {
    const { skillName } = req.body;
    if (!skillName) {
      return res.status(400).json({ isOk: false, status: 400, message: "Skill Name is required" });
    }
    const existing = await Skill.findOne({ skillName });
    if (existing) {
      return res.status(409).json({ isOk: false, status: 409, message: "Skill already exists" });
    }
    await Skill.create(req.body);
    return res.status(201).json({ isOk: true, status: 201, message: "Skill created successfully" });
  } catch (error) {
    console.log("Error in createSkill", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const doc = await Skill.findById(skillId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Skill not found" });
    }
    if (req.body.skillName && req.body.skillName !== doc.skillName) {
      const conflict = await Skill.findOne({ skillName: req.body.skillName });
      if (conflict) {
        return res.status(409).json({ isOk: false, status: 409, message: "Skill already exists" });
      }
    }
    Object.assign(doc, req.body);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Skill updated successfully" });
  } catch (error) {
    console.log("Error in updateSkill", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const doc = await Skill.findById(skillId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Skill not found" });
    }
    const referenceInfo = await getReferencingCounts("Skill", skillId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Skill. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await Skill.findByIdAndUpdate(skillId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Skill deleted successfully" });
  } catch (error) {
    console.log("Error in deleteSkill", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getSkillById = async (req, res) => {
  try {
    const doc = await Skill.findById(req.params.skillId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Skill not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getSkillById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listSkills = async (_req, res) => {
  try {
    const docs = await Skill.find({ isActive: true }).select("skillName");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listSkills", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listSkillsByParams = async (req, res) => {
  try {
    const list = await runListQuery(Skill, req.body, {
      searchFields: ["skillName", "description"],
      filterable: { skillName: "string", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// ----------------------------------------------------------- Employee Skill Map --

export const createEmployeeSkillMap = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee is required" });
    }
    const existing = await EmployeeSkillMap.findOne({ employeeId });
    if (existing) {
      return res.status(409).json({ isOk: false, status: 409, message: "Employee Skill Map already exists for this Employee" });
    }
    await EmployeeSkillMap.create(req.body);
    return res.status(201).json({ isOk: true, status: 201, message: "Employee Skill Map created successfully" });
  } catch (error) {
    console.log("Error in createEmployeeSkillMap", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateEmployeeSkillMap = async (req, res) => {
  try {
    const { skillMapId } = req.params;
    const doc = await EmployeeSkillMap.findById(skillMapId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Skill Map not found" });
    }
    Object.assign(doc, req.body);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Skill Map updated successfully" });
  } catch (error) {
    console.log("Error in updateEmployeeSkillMap", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteEmployeeSkillMap = async (req, res) => {
  try {
    const { skillMapId } = req.params;
    const doc = await EmployeeSkillMap.findById(skillMapId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Skill Map not found" });
    }
    await EmployeeSkillMap.findByIdAndUpdate(skillMapId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Employee Skill Map deleted successfully" });
  } catch (error) {
    console.log("Error in deleteEmployeeSkillMap", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getEmployeeSkillMapById = async (req, res) => {
  try {
    const doc = await EmployeeSkillMap.findById(req.params.skillMapId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Skill Map not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getEmployeeSkillMapById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeSkillMaps = async (_req, res) => {
  try {
    const docs = await EmployeeSkillMap.find({ isActive: true }).select("employeeId");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listEmployeeSkillMaps", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listEmployeeSkillMapsByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmployeeSkillMap, req.body, {
      searchFields: [],
      filterable: { employeeId: "objectId", isActive: "boolean", createdAt: "date" },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

// Server-side version of source's client-only "copy Designation.skills into
// employeeSkills, proficiency defaulted" convenience (ADR-022). Proficiency
// defaults to the schema's own default (3, a mid value on the 1-5 scale) —
// source hardcoded 1 ("lowest"), which reads oddly as an auto-populate
// default; a mid value reads as "unassessed," not "rated poorly."
export const populateEmployeeSkillMapFromDesignation = async (req, res) => {
  try {
    const doc = await EmployeeSkillMap.findById(req.params.skillMapId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Employee Skill Map not found" });
    }
    const employee = await Employee.findById(doc.employeeId);
    if (!employee || !employee.designationId) {
      return res.status(400).json({ isOk: false, status: 400, message: "Employee has no Designation set" });
    }
    const designation = await Designation.findById(employee.designationId);
    if (!designation) {
      return res.status(404).json({ isOk: false, status: 404, message: "Designation not found" });
    }
    doc.employeeSkills = (designation.skills || []).map((skillId) => ({ skillId }));
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: `Populated ${doc.employeeSkills.length} skill(s) from Designation` });
  } catch (error) {
    console.log("Error in populateEmployeeSkillMapFromDesignation", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
