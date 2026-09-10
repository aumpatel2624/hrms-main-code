import AuditLog from "../../models/AuditLog.js";
import { runListQuery } from "../../utils/listQuery.js";

/**
 * Reading the audit trail.
 *
 * **Read-only on purpose.** There is no create, update or delete here and there
 * never should be — a log the panel can edit answers no question worth asking.
 * The only writer is `models/auditPlugin.js`.
 */

export const listAuditLogByParams = async (req, res) => {
  try {
    const list = await runListQuery(AuditLog, req.body, {
      searchFields: ["model", "recordLabel", "actor.name", "actor.email"],
      filterable: {
        model: "string",
        documentId: "objectId",
        recordLabel: "string",
        action: "enum",
        "actor.userId": "string",
        "actor.name": "string",
        "actor.email": "string",
        "actor.role": "enum",
        ip: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.error("Error in listAuditLogByParams:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getAuditLogById = async (req, res) => {
  try {
    const entry = await AuditLog.findById(req.params.auditLogId).lean();
    if (!entry) {
      return res.status(404).json({ isOk: false, status: 404, message: "Audit entry not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: entry });
  } catch (error) {
    console.error("Error in getAuditLogById:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/**
 * Every recorded change to one record, newest first — the "what happened to
 * this?" question, answered from the record rather than from the log.
 *
 * Capped rather than paginated: this feeds a history panel, and a record with
 * more than 100 changes needs the full log screen and its filters anyway.
 */
export const getRecordHistory = async (req, res) => {
  try {
    const entries = await AuditLog.find({
      model: req.params.model,
      documentId: req.params.documentId,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.status(200).json({ isOk: true, status: 200, data: entries });
  } catch (error) {
    console.error("Error in getRecordHistory:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

/** The distinct model names present in the log, for the filter dropdown. */
export const listAuditedModels = async (req, res) => {
  try {
    const models = await AuditLog.distinct("model");
    return res.status(200).json({ isOk: true, status: 200, data: models.sort() });
  } catch (error) {
    console.error("Error in listAuditedModels:", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
