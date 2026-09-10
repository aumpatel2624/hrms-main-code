/**
 * Input Validation & Sanitization Middleware
 * Implements OWASP best practices for input validation:
 * - Schema-based validation using express-validator
 * - Type checking
 * - Length limits
 * - Reject unexpected fields
 * - Sanitize inputs to prevent XSS/NoSQL injection
 * 
 * OWASP Input Validation Cheat Sheet:
 * https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 */

import { body, param, query, validationResult } from 'express-validator';
import mongoSanitize from 'express-mongo-sanitize';
import { PASSWORD, EMAIL } from '@demo-panel/shared/validation';
import { OTP } from '@demo-panel/shared/auth';
import { METRIC_TYPES, CHART_TYPES, DATE_RANGES, WIDGET_SIZES } from '@demo-panel/shared/widgets';
import {
    CHANGE_FREQUENCIES,
    MAX_IMAGE_PREVIEW,
    OG_TYPES,
    REDIRECT_STATUSES,
    SCHEMA_TYPES,
    TITLE_SEPARATORS,
    TWITTER_CARDS,
} from '@demo-panel/shared/seo';

// ============ CONSTANTS ============

// Maximum length limits for common fields
const MAX_LENGTHS = {
    EMAIL: EMAIL.MAX_LENGTH,
    PASSWORD: PASSWORD.MAX_LENGTH,
    NAME: 100,
    SHORT_TEXT: 255,
    MEDIUM_TEXT: 1000,
    LONG_TEXT: 5000,
    PHONE: 20,
    URL: 2048,
    MONGODB_ID: 24,
    IP_ADDRESS: 45, // IPv6 max length
    COORDINATES: 20,
};

// Minimum length limits. Password minimums live in the shared PASSWORD policy.
const MIN_LENGTHS = {
    NAME: 1,
};

// ============ SANITIZATION HELPERS ============

/**
 * Sanitize string input - trim whitespace and escape HTML entities
 * @param {string} value - Input value
 * @returns {string} Sanitized value
 */
const sanitizeString = (value) => {
    if (typeof value !== 'string') return value;
    return value
        .trim()
        .replace(/[<>]/g, '') // Remove < and > to prevent basic XSS
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, ''); // Remove event handlers like onclick=
};

/**
 * Create MongoDB sanitization middleware instance
 * Prevents NoSQL injection attacks
 */
export const mongoSanitizer = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`[SECURITY] Sanitized potentially malicious input in key: ${key}`);
    },
});

// ============ VALIDATION RESULT HANDLER ============

/**
 * Middleware to check validation results
 * Returns 400 with detailed error messages if validation fails
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value !== undefined ? '[REDACTED]' : undefined, // Don't expose sensitive values
        }));

        return res.status(400).json({
            isOk: false,
            status: 400,
            error: 'Validation Error',
            message: 'Invalid input data',
            details: formattedErrors,
        });
    }

    next();
};

// ============ REUSABLE VALIDATORS ============

/**
 * Email validation chain
 */
export const emailValidator = body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .isLength({ max: MAX_LENGTHS.EMAIL }).withMessage(`Email must not exceed ${MAX_LENGTHS.EMAIL} characters`)
    .normalizeEmail();

/**
 * Login password chain - deliberately NOT the strong policy.
 * Accounts predating the policy must still be able to sign in; rejecting them
 * at login would lock them out permanently, since the reset flow is only
 * reachable from the login screen. Strength is enforced wherever a password is
 * SET, never where it is checked.
 */
export const passwordValidator = body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: PASSWORD.MAX_LENGTH })
    .withMessage(`Password must not exceed ${PASSWORD.MAX_LENGTH} characters`);

/**
 * Strong password chain for any field that SETS a password.
 * Single definition, applied to whichever field name the endpoint uses.
 */
export const strongPasswordFor = (field) => body(field)
    .notEmpty().withMessage('Password is required')
    .isLength({ min: PASSWORD.MIN_LENGTH, max: PASSWORD.MAX_LENGTH })
    .withMessage(PASSWORD.MESSAGE)
    .matches(PASSWORD.PATTERN)
    .withMessage(PASSWORD.MESSAGE);

export const strongPasswordValidator = strongPasswordFor('password');

/**
 * MongoDB ObjectId validation chain
 */
export const mongoIdValidator = (fieldName, location = 'param') => {
    const validator = location === 'param' ? param : body;
    return validator(fieldName)
        .notEmpty().withMessage(`${fieldName} is required`)
        .isMongoId().withMessage(`${fieldName} must be a valid ID`);
};

/**
 * Name field validation chain
 */
export const nameValidator = (fieldName) => body(fieldName)
    .trim()
    .notEmpty().withMessage(`${fieldName} is required`)
    .isLength({ min: MIN_LENGTHS.NAME, max: MAX_LENGTHS.NAME })
    .withMessage(`${fieldName} must be between ${MIN_LENGTHS.NAME} and ${MAX_LENGTHS.NAME} characters`)
    .customSanitizer(sanitizeString);

/**
 * Optional name field validation chain
 */
export const optionalNameValidator = (fieldName) => body(fieldName)
    .optional()
    .trim()
    .isLength({ max: MAX_LENGTHS.NAME })
    .withMessage(`${fieldName} must not exceed ${MAX_LENGTHS.NAME} characters`)
    .customSanitizer(sanitizeString);

/**
 * Phone number validation chain
 */
export const phoneValidator = (fieldName = 'mobileNumber') => body(fieldName)
    .optional()
    .trim()
    .isLength({ max: MAX_LENGTHS.PHONE })
    .withMessage(`${fieldName} must not exceed ${MAX_LENGTHS.PHONE} characters`)
    .matches(/^[+\d\s\-()]*$/)
    .withMessage(`${fieldName} contains invalid characters`);

/**
 * Boolean validation chain
 */
export const booleanValidator = (fieldName) => body(fieldName)
    .optional()
    .isBoolean().withMessage(`${fieldName} must be a boolean value`)
    .toBoolean();

/**
 * Pagination validation chain
 */
export const paginationValidators = [
    body('skip')
        .optional()
        .isInt({ min: 0 }).withMessage('skip must be a non-negative integer')
        .toInt(),
    body('per_page')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('per_page must be between 1 and 100')
        .toInt(),
    body('sorton')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('sorton must not exceed 50 characters')
        .matches(/^[a-zA-Z_]+$/).withMessage('sorton contains invalid characters'),
    body('sortdir')
        .optional()
        .trim()
        .isIn(['asc', 'desc', 'ASC', 'DESC']).withMessage('sortdir must be asc or desc'),
    body('match')
        .optional()
        .trim()
        .isLength({ max: MAX_LENGTHS.SHORT_TEXT }).withMessage(`match must not exceed ${MAX_LENGTHS.SHORT_TEXT} characters`)
        .customSanitizer(sanitizeString),
];

// ============ ENDPOINT-SPECIFIC VALIDATORS ============

/**
 * Login request validation
 */
export const loginValidation = [
    emailValidator,
    passwordValidator,
    body('locationConsent')
        .optional()
        .isBoolean().withMessage('locationConsent must be a boolean'),
    body('ipConsent')
        .optional()
        .isBoolean().withMessage('ipConsent must be a boolean'),
    body('clientIP')
        .optional()
        .trim()
        .isLength({ max: MAX_LENGTHS.IP_ADDRESS }).withMessage('Invalid IP address format'),
    body('clientLatitude')
        .optional({ nullable: true })
        .isFloat({ min: -90, max: 90 }).withMessage('clientLatitude must be between -90 and 90'),
    body('clientLongitude')
        .optional({ nullable: true })
        .isFloat({ min: -180, max: 180 }).withMessage('clientLongitude must be between -180 and 180'),
    handleValidationErrors,
];

/**
 * User creation validation
 */
export const createUserValidation = [
    nameValidator('userName'),
    mongoIdValidator('departmentId', 'body'),
    mongoIdValidator('roleId', 'body'),
    emailValidator,
    phoneValidator('mobileNumber'),
    mongoIdValidator('countryId', 'body'),
    mongoIdValidator('stateId', 'body'),
    mongoIdValidator('cityId', 'body'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: MAX_LENGTHS.MEDIUM_TEXT })
        .withMessage(`Address must not exceed ${MAX_LENGTHS.MEDIUM_TEXT} characters`)
        .customSanitizer(sanitizeString),
    booleanValidator('isActive'),
    handleValidationErrors,
];

/**
 * Admin user creation validation
 */
export const createAdminUserValidation = [
    nameValidator('adminName'),
    emailValidator,
    phoneValidator('mobileNumber'),
    booleanValidator('isActive'),
    handleValidationErrors,
];

/**
 * OTP validation
 */
export const otpValidation = [
    emailValidator,
    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: OTP.LENGTH, max: OTP.LENGTH })
        .withMessage(`OTP must be exactly ${OTP.LENGTH} digits`)
        .isNumeric().withMessage('OTP must contain only numbers'),
    handleValidationErrors,
];

/**
 * Password reset validation
 */
export const passwordResetValidation = [
    emailValidator,
    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: OTP.LENGTH, max: OTP.LENGTH })
        .withMessage(`OTP must be exactly ${OTP.LENGTH} digits`)
        .isNumeric().withMessage('OTP must contain only numbers'),
    strongPasswordFor('newPassword'),
    handleValidationErrors,
];

/**
 * Search/list validation
 */
/** Operators the structured filter accepts. Kept in step with utils/listQuery.js. */
export const FILTER_OPERATORS = [
    'eq', 'ne', 'contains', 'notContains', 'startsWith', 'endsWith',
    'in', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty',
];

const MAX_FILTERS = 20;
const MAX_FILTER_VALUES = 50;

/**
 * Shape validation for the structured filter payload.
 *
 * This only checks the shape - whether a given field may be filtered at all is
 * decided per entity by the allowlist in utils/listQuery.js, which is the layer
 * that actually builds the Mongo expression.
 */
export const filterValidators = [
    body('filters')
        .optional()
        .isArray({ max: MAX_FILTERS }).withMessage(`filters must be an array of at most ${MAX_FILTERS} entries`),
    body('filters.*.field')
        .exists().withMessage('each filter needs a field')
        .isString().withMessage('filter field must be a string')
        .isLength({ max: 60 }).withMessage('filter field is too long')
        // Field names are identifiers or dotted paths; nothing else can be a
        // real column, and this keeps operator syntax out of the key.
        .matches(/^[a-zA-Z][a-zA-Z0-9_.]*$/).withMessage('filter field contains invalid characters'),
    body('filters.*.op')
        .exists().withMessage('each filter needs an operator')
        .isIn(FILTER_OPERATORS).withMessage('unsupported filter operator'),
    body('filters.*.value')
        .optional()
        .custom((value) => {
            if (Array.isArray(value)) {
                if (value.length > MAX_FILTER_VALUES) throw new Error('too many filter values');
                if (!value.every((v) => ['string', 'number', 'boolean'].includes(typeof v) || v === null)) {
                    throw new Error('filter values must be primitives');
                }
                return true;
            }
            if (['string', 'number', 'boolean'].includes(typeof value) || value === null || value === undefined) return true;
            throw new Error('filter value must be a primitive or an array of primitives');
        }),
    body('matchType')
        .optional()
        .isIn(['all', 'any']).withMessage('matchType must be all or any'),
];

export const searchValidation = [
    ...paginationValidators,
    ...filterValidators,
    handleValidationErrors,
];

// ============ MIDDLEWARE TO REJECT UNEXPECTED FIELDS ============

/**
 * Create middleware to reject unexpected fields in request body
 * @param {string[]} allowedFields - Array of allowed field names
 * @returns {Function} Express middleware
 */
export const allowOnlyFields = (allowedFields) => {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            const bodyFields = Object.keys(req.body);
            const unexpectedFields = bodyFields.filter(field => !allowedFields.includes(field));

            if (unexpectedFields.length > 0) {
                return res.status(400).json({
                    isOk: false,
                    status: 400,
                    error: 'Validation Error',
                    message: 'Unexpected fields in request body',
                    unexpectedFields: unexpectedFields,
                });
            }
        }
        next();
    };
};

// ============ ALLOWED FIELDS FOR ENDPOINTS ============

export const allowedLoginFields = [
    'email', 'password', 'locationConsent', 'ipConsent',
    'clientIP', 'clientLatitude', 'clientLongitude'
];

export const allowedUserFields = [
    'userName', 'departmentId', 'roleId', 'email',
    'mobileNumber', 'countryId', 'stateId', 'cityId',
    'address', 'password', 'isActive'
];

export const allowedAdminUserFields = [
    'adminName', 'email', 'password', 'mobileNumber', 'isActive'
];

export const allowedSearchFields = [
    'skip', 'per_page', 'sorton', 'sortdir', 'match', 'isActive', 'filters', 'matchType'
];

// ============ DASHBOARD WIDGETS (ADR-003) ============
// Shape checks only — field names are validated against the widget source
// registry in the controller (utils/widgetQuery.js validateWidget), which is
// the actual allowlist.

export const allowedWidgetFields = [
    'title', 'description', 'source', 'metric', 'groupBy', 'dateField',
    'dateRange', 'filters', 'chartType', 'seriesColors', 'isActive'
];

export const widgetValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ max: MAX_LENGTHS.SHORT_TEXT })
        .withMessage(`Title must not exceed ${MAX_LENGTHS.SHORT_TEXT} characters`),
    body('source').trim().notEmpty().withMessage('Source is required'),
    body('chartType').isIn(CHART_TYPES).withMessage('Unknown chart type'),
    body('dateRange').optional({ nullable: true }).isIn(DATE_RANGES).withMessage('Unknown date range'),
    body('metric').optional({ nullable: true }).isObject().withMessage('Metric must be an object'),
    body('metric.type').optional({ nullable: true }).isIn(METRIC_TYPES).withMessage('Unknown metric type'),
    body('filters').optional({ nullable: true }).isArray({ max: 20 }).withMessage('Filters must be an array of at most 20'),
    body('filters.*.field').isString().withMessage('Filter field must be a string'),
    body('filters.*.op').isString().withMessage('Filter operator must be a string'),
    // Category colours: { label: slot }. Shape only — the slot values are
    // checked against SERIES_SLOTS by validateWidget, which also knows whether
    // this chart type has categories to colour at all.
    body('seriesColors').optional({ nullable: true }).isObject().withMessage('seriesColors must be an object'),
    booleanValidator('isActive'),
    // Kept last: widgetPreviewValidation slices off the first rule (title),
    // so anything inserted above would shift what that slice drops.
    body('description')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 280 })
        .withMessage('Description must not exceed 280 characters'),
    handleValidationErrors,
];

// Preview runs an unsaved definition; title is optional there.
export const widgetPreviewValidation = [
    body('title').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.SHORT_TEXT }),
    ...widgetValidation.slice(1),
];

export const allowedRoleDashboardFields = ['roleId', 'widgets'];

export const roleDashboardValidation = [
    body('roleId')
        .optional({ nullable: true })
        .custom((value) => value === null || /^[0-9a-fA-F]{24}$/.test(String(value)))
        .withMessage('roleId must be a valid ID or null'),
    body('widgets').isArray({ max: 30 }).withMessage('Widgets must be an array of at most 30'),
    body('widgets.*.widgetId').isMongoId().withMessage('widgetId must be a valid ID'),
    body('widgets.*.sequence').optional({ nullable: true }).isInt({ min: 0 }).withMessage('sequence must be a non-negative integer'),
    body('widgets.*.size').optional({ nullable: true }).isIn(WIDGET_SIZES).withMessage('Unknown widget size'),
    handleValidationErrors,
];


// ============ SEO MANAGEMENT ============
// Shape and vocabulary checks only. Paths are normalised and structured data is
// parsed in the controller, which is where the actual rules live.

const robotsValidation = (prefix) => [
    body(`${prefix}.index`).optional({ nullable: true }).isBoolean().withMessage('index must be true or false'),
    body(`${prefix}.follow`).optional({ nullable: true }).isBoolean().withMessage('follow must be true or false'),
    body(`${prefix}.noarchive`).optional({ nullable: true }).isBoolean(),
    body(`${prefix}.nosnippet`).optional({ nullable: true }).isBoolean(),
    body(`${prefix}.noimageindex`).optional({ nullable: true }).isBoolean(),
    body(`${prefix}.maxSnippet`).optional({ nullable: true }).isInt({ min: -1, max: 10000 }).withMessage('maxSnippet must be -1 or a positive number'),
    body(`${prefix}.maxImagePreview`).optional({ nullable: true }).isIn(MAX_IMAGE_PREVIEW).withMessage('Unknown max image preview'),
];

export const allowedSeoPageFields = [
    'path', 'pageName', 'focusKeyword', 'title', 'description', 'canonicalUrl',
    'robots', 'og', 'twitter', 'jsonLd', 'sitemap', 'isActive',
];

export const seoPageValidation = [
    body('path')
        .trim()
        .notEmpty().withMessage('Path is required')
        .isLength({ max: MAX_LENGTHS.URL }).withMessage('Path is too long'),
    body('pageName')
        .trim()
        .notEmpty().withMessage('Page name is required')
        .isLength({ max: MAX_LENGTHS.NAME }).withMessage(`Page name must not exceed ${MAX_LENGTHS.NAME} characters`),
    body('focusKeyword').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.NAME }),
    body('title').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.SHORT_TEXT }),
    body('description').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.MEDIUM_TEXT }),
    body('canonicalUrl').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    ...robotsValidation('robots'),
    body('og.type').optional({ nullable: true }).isIn(OG_TYPES).withMessage('Unknown Open Graph type'),
    body('og.image').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    body('twitter.card').optional({ nullable: true }).isIn(TWITTER_CARDS).withMessage('Unknown Twitter card type'),
    body('twitter.image').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    body('jsonLd.schemaType').optional({ nullable: true }).isIn(SCHEMA_TYPES).withMessage('Unknown schema type'),
    body('jsonLd.body').optional({ nullable: true }).isLength({ max: MAX_LENGTHS.LONG_TEXT }).withMessage('Structured data is too long'),
    body('sitemap.include').optional({ nullable: true }).isBoolean(),
    body('sitemap.priority').optional({ nullable: true }).isFloat({ min: 0, max: 1 }).withMessage('Priority must be between 0 and 1'),
    body('sitemap.changefreq').optional({ nullable: true }).isIn(CHANGE_FREQUENCIES).withMessage('Unknown change frequency'),
    booleanValidator('isActive'),
    handleValidationErrors,
];

export const allowedSeoSettingsFields = [
    'siteName', 'baseUrl', 'titleSeparator', 'defaultTitleTemplate', 'defaultDescription',
    'defaultOgImage', 'defaultTwitterCard', 'organization', 'verification', 'robots',
    'globalNoindex', 'robotsTxt', 'isActive',
];

export const seoSettingsValidation = [
    body('siteName').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.NAME }),
    body('baseUrl').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    body('titleSeparator').optional({ nullable: true }).isIn(TITLE_SEPARATORS).withMessage('Unknown title separator'),
    body('defaultTitleTemplate').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.SHORT_TEXT }),
    body('defaultDescription').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.MEDIUM_TEXT }),
    body('defaultOgImage').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    body('defaultTwitterCard').optional({ nullable: true }).isIn(TWITTER_CARDS).withMessage('Unknown Twitter card type'),
    body('organization.type').optional({ nullable: true }).isIn(['Organization', 'Person']).withMessage('Organization type must be Organization or Person'),
    body('organization.name').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.NAME }),
    body('organization.sameAs').optional({ nullable: true }).isArray({ max: 20 }).withMessage('At most 20 social profiles'),
    body('organization.sameAs.*').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    ...robotsValidation('robots'),
    body('globalNoindex').optional({ nullable: true }).isBoolean(),
    body('robotsTxt').optional({ nullable: true }).isLength({ max: MAX_LENGTHS.LONG_TEXT }).withMessage('robots.txt is too long'),
    booleanValidator('isActive'),
    handleValidationErrors,
];

export const allowedSeoRedirectFields = ['fromPath', 'toPath', 'statusCode', 'notes', 'isActive'];

export const seoRedirectValidation = [
    body('fromPath')
        .trim()
        .notEmpty().withMessage('From path is required')
        .isLength({ max: MAX_LENGTHS.URL }).withMessage('From path is too long'),
    body('toPath').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    body('statusCode').optional({ nullable: true }).isIn(REDIRECT_STATUSES).withMessage('Unknown redirect status code'),
    body('notes').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.SHORT_TEXT }),
    booleanValidator('isActive'),
    handleValidationErrors,
];

// The 404 log supplies fromPath from the logged row, so only the target is sent.
export const allowedSeoNotFoundRedirectFields = ['toPath', 'statusCode', 'notes'];

export const seoNotFoundRedirectValidation = [
    body('toPath').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    body('statusCode').optional({ nullable: true }).isIn(REDIRECT_STATUSES).withMessage('Unknown redirect status code'),
    body('notes').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.SHORT_TEXT }),
    handleValidationErrors,
];

export const allowedSeoImportFields = ['rows'];

export const seoImportValidation = [
    body('rows').isArray({ min: 1, max: 2000 }).withMessage('Rows must be an array of 1 to 2000 entries'),
    body('rows.*.fromPath').trim().notEmpty().withMessage('Every row needs a from path'),
    body('rows.*.toPath').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    body('rows.*.statusCode').optional({ nullable: true }).isIn(REDIRECT_STATUSES).withMessage('Unknown redirect status code'),
    handleValidationErrors,
];

// ---- public endpoints ----
// These take input from an anonymous caller, so the shape checks here are the
// outer trust boundary, not a convenience.

export const allowedPublicResolveFields = ['path'];

export const publicResolveValidation = [
    body('path').trim().notEmpty().withMessage('A path is required').isLength({ max: MAX_LENGTHS.URL }),
    handleValidationErrors,
];

export const allowedPublicUrlFields = ['urls', 'replace'];

export const publicUrlsValidation = [
    body('urls').isArray({ min: 1, max: 5000 }).withMessage('Urls must be an array of 1 to 5000 entries'),
    body('replace').optional({ nullable: true }).isBoolean().withMessage('replace must be true or false'),
    handleValidationErrors,
];

export const allowedPublicNotFoundFields = ['path', 'referrer'];

export const publicNotFoundValidation = [
    body('path').trim().notEmpty().withMessage('A path is required').isLength({ max: MAX_LENGTHS.URL }),
    body('referrer').optional({ nullable: true }).trim().isLength({ max: MAX_LENGTHS.URL }),
    handleValidationErrors,
];


export default {
    handleValidationErrors,
    mongoSanitizer,
    loginValidation,
    strongPasswordValidator,
    strongPasswordFor,
    createUserValidation,
    createAdminUserValidation,
    otpValidation,
    passwordResetValidation,
    searchValidation,
    allowOnlyFields,
    allowedLoginFields,
    allowedUserFields,
    allowedAdminUserFields,
    allowedSearchFields,
    filterValidators,
    FILTER_OPERATORS,
};
