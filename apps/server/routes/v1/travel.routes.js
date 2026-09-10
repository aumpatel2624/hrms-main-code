import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createPurposeOfTravel, updatePurposeOfTravel, deletePurposeOfTravel,
  getPurposeOfTravelById, listPurposeOfTravels, listPurposeOfTravelByParams,
  createIdentificationDocumentType, updateIdentificationDocumentType, deleteIdentificationDocumentType,
  getIdentificationDocumentTypeById, listIdentificationDocumentTypes, listIdentificationDocumentTypeByParams,
  createTravelRequest, updateTravelRequest, deleteTravelRequest,
  getTravelRequestById, listTravelRequests, listTravelRequestByParams,
} from "../../controllers/v1/travel.controller.js";

const router = express.Router();

// --------------------------------------------------------- Purpose of Travel --

/**
 * @swagger
 * /purpose-of-travels:
 *   post:
 *     summary: Create a new purpose of travel
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreatePurposeOfTravel' }
 *     responses:
 *       201: { description: Purpose of Travel created successfully }
 */
router.post("/purpose-of-travels", authMiddleware(ANY_ROLE), checkPermission("/purpose-of-travel", "write"), createPurposeOfTravel);

/**
 * @swagger
 * /purpose-of-travels:
 *   get:
 *     summary: List all active purposes of travel (dropdown source)
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of purposes of travel }
 */
router.get("/purpose-of-travels", authMiddleware(ANY_ROLE), listPurposeOfTravels);

/**
 * @swagger
 * /purpose-of-travels/{purposeOfTravelId}:
 *   get:
 *     summary: Get purpose of travel by ID
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: purposeOfTravelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Purpose of Travel details }
 *       404: { description: Purpose of Travel not found }
 */
router.get("/purpose-of-travels/:purposeOfTravelId", authMiddleware(ANY_ROLE), checkPermission("/purpose-of-travel", "read"), getPurposeOfTravelById);

/**
 * @swagger
 * /purpose-of-travels/{purposeOfTravelId}:
 *   put:
 *     summary: Update purpose of travel
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: purposeOfTravelId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreatePurposeOfTravel' }
 *     responses:
 *       200: { description: Purpose of Travel updated successfully }
 */
router.put("/purpose-of-travels/:purposeOfTravelId", authMiddleware(ANY_ROLE), checkPermission("/purpose-of-travel", "edit"), updatePurposeOfTravel);

/**
 * @swagger
 * /purpose-of-travels/{purposeOfTravelId}:
 *   delete:
 *     summary: Delete purpose of travel
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: purposeOfTravelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Purpose of Travel deleted successfully }
 *       409: { description: Cannot delete — referenced by other records }
 */
router.delete("/purpose-of-travels/:purposeOfTravelId", authMiddleware(ANY_ROLE), checkPermission("/purpose-of-travel", "delete"), deletePurposeOfTravel);

/**
 * @swagger
 * /purpose-of-travels/search:
 *   post:
 *     summary: Search purposes of travel with pagination
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of purposes of travel }
 */
router.post("/purpose-of-travels/search", authMiddleware(ANY_ROLE), checkPermission("/purpose-of-travel", "read"), listPurposeOfTravelByParams);

// ------------------------------------------------ Identification Document Type --

/**
 * @swagger
 * /identification-document-types:
 *   post:
 *     summary: Create a new identification document type
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateIdentificationDocumentType' }
 *     responses:
 *       201: { description: Identification Document Type created successfully }
 */
router.post("/identification-document-types", authMiddleware(ANY_ROLE), checkPermission("/identification-document-type", "write"), createIdentificationDocumentType);

/**
 * @swagger
 * /identification-document-types:
 *   get:
 *     summary: List all active identification document types (dropdown source)
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of identification document types }
 */
router.get("/identification-document-types", authMiddleware(ANY_ROLE), listIdentificationDocumentTypes);

/**
 * @swagger
 * /identification-document-types/{identificationDocumentTypeId}:
 *   get:
 *     summary: Get identification document type by ID
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: identificationDocumentTypeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Identification Document Type details }
 *       404: { description: Identification Document Type not found }
 */
router.get(
  "/identification-document-types/:identificationDocumentTypeId",
  authMiddleware(ANY_ROLE),
  checkPermission("/identification-document-type", "read"),
  getIdentificationDocumentTypeById,
);

/**
 * @swagger
 * /identification-document-types/{identificationDocumentTypeId}:
 *   put:
 *     summary: Update identification document type
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: identificationDocumentTypeId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateIdentificationDocumentType' }
 *     responses:
 *       200: { description: Identification Document Type updated successfully }
 */
router.put(
  "/identification-document-types/:identificationDocumentTypeId",
  authMiddleware(ANY_ROLE),
  checkPermission("/identification-document-type", "edit"),
  updateIdentificationDocumentType,
);

/**
 * @swagger
 * /identification-document-types/{identificationDocumentTypeId}:
 *   delete:
 *     summary: Delete identification document type
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: identificationDocumentTypeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Identification Document Type deleted successfully }
 *       409: { description: Cannot delete — referenced by other records }
 */
router.delete(
  "/identification-document-types/:identificationDocumentTypeId",
  authMiddleware(ANY_ROLE),
  checkPermission("/identification-document-type", "delete"),
  deleteIdentificationDocumentType,
);

/**
 * @swagger
 * /identification-document-types/search:
 *   post:
 *     summary: Search identification document types with pagination
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of identification document types }
 */
router.post(
  "/identification-document-types/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/identification-document-type", "read"),
  listIdentificationDocumentTypeByParams,
);

// ------------------------------------------------------------- Travel Request --

/**
 * @swagger
 * /travel-requests:
 *   post:
 *     summary: Create a new travel request
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTravelRequest' }
 *     responses:
 *       201: { description: Travel Request created successfully }
 *       400: { description: Missing required fields, or the employee is Inactive }
 */
router.post("/travel-requests", authMiddleware(ANY_ROLE), checkPermission("/travel-request", "write"), createTravelRequest);

/**
 * @swagger
 * /travel-requests:
 *   get:
 *     summary: List all active travel requests (dropdown source)
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of travel requests }
 */
router.get("/travel-requests", authMiddleware(ANY_ROLE), listTravelRequests);

/**
 * @swagger
 * /travel-requests/{travelRequestId}:
 *   get:
 *     summary: Get travel request by ID
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: travelRequestId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Travel Request details }
 *       404: { description: Travel Request not found }
 */
router.get("/travel-requests/:travelRequestId", authMiddleware(ANY_ROLE), checkPermission("/travel-request", "read"), getTravelRequestById);

/**
 * @swagger
 * /travel-requests/{travelRequestId}:
 *   put:
 *     summary: Update travel request
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: travelRequestId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTravelRequest' }
 *     responses:
 *       200: { description: Travel Request updated successfully }
 */
router.put("/travel-requests/:travelRequestId", authMiddleware(ANY_ROLE), checkPermission("/travel-request", "edit"), updateTravelRequest);

/**
 * @swagger
 * /travel-requests/{travelRequestId}:
 *   delete:
 *     summary: Delete travel request
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: travelRequestId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Travel Request deleted successfully }
 *       409: { description: Cannot delete — referenced by other records }
 */
router.delete("/travel-requests/:travelRequestId", authMiddleware(ANY_ROLE), checkPermission("/travel-request", "delete"), deleteTravelRequest);

/**
 * @swagger
 * /travel-requests/search:
 *   post:
 *     summary: Search travel requests with pagination
 *     tags: [Travel]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SearchParams' }
 *     responses:
 *       200: { description: Paginated list of travel requests }
 */
router.post("/travel-requests/search", authMiddleware(ANY_ROLE), checkPermission("/travel-request", "read"), listTravelRequestByParams);

export default router;
