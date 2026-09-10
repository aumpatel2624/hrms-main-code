import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Demo Panel API",
      version: "1.0.0",
      description: "API documentation for the Demo Panel backend server",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API V1",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
      },
      schemas: {
        // Common response schemas
        SuccessResponse: {
          type: "object",
          properties: {
            isOk: { type: "boolean", example: true },
            message: { type: "string" },
            data: { type: "object" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            isOk: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
        PaginatedResponse: {
          type: "object",
          properties: {
            isOk: { type: "boolean", example: true },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  data: { type: "array", items: { type: "object" } },
                  count: { type: "integer" },
                },
              },
            },
          },
        },
        SearchParams: {
          type: "object",
          properties: {
            skip: {
              type: "integer",
              default: 0,
              description: "Number of records to skip",
            },
            per_page: {
              type: "integer",
              default: 10,
              description: "Records per page",
            },
            sorton: { type: "string", description: "Field to sort on" },
            sortdir: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort direction",
            },
            match: { type: "string", description: "Search query" },
            isActive: {
              type: "boolean",
              description: "Filter by active status",
            },
          },
        },
        // Country schemas
        Country: {
          type: "object",
          properties: {
            _id: { type: "string" },
            countryName: { type: "string" },
            countryCode: { type: "string" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateCountry: {
          type: "object",
          required: ["countryName"],
          properties: {
            countryName: { type: "string", example: "India" },
            countryCode: { type: "string", example: "IN" },
            isActive: { type: "boolean", default: true },
          },
        },
        // State schemas
        State: {
          type: "object",
          properties: {
            _id: { type: "string" },
            stateName: { type: "string" },
            stateCode: { type: "string" },
            countryId: { type: "string" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateState: {
          type: "object",
          required: ["stateName", "countryId"],
          properties: {
            stateName: { type: "string", example: "Maharashtra" },
            stateCode: { type: "string", example: "MH" },
            countryId: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // City schemas
        City: {
          type: "object",
          properties: {
            _id: { type: "string" },
            cityName: { type: "string" },
            stateId: { type: "string" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateCity: {
          type: "object",
          required: ["cityName", "stateId"],
          properties: {
            cityName: { type: "string", example: "Mumbai" },
            stateId: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Currency schemas
        Currency: {
          type: "object",
          properties: {
            _id: { type: "string" },
            currencyName: { type: "string" },
            currencyCode: { type: "string" },
            currencySymbol: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateCurrency: {
          type: "object",
          required: ["currencyName", "currencyCode"],
          properties: {
            currencyName: { type: "string", example: "Indian Rupee" },
            currencyCode: { type: "string", example: "INR" },
            currencySymbol: { type: "string", example: "₹" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Role schemas
        Role: {
          type: "object",
          properties: {
            _id: { type: "string" },
            roleName: { type: "string" },
            description: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateRole: {
          type: "object",
          required: ["roleName"],
          properties: {
            roleName: { type: "string", example: "Manager" },
            description: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Menu Group schemas
        MenuGroup: {
          type: "object",
          properties: {
            _id: { type: "string" },
            menuGroupName: { type: "string" },
            icon: { type: "string" },
            displayOrder: { type: "integer" },
            isActive: { type: "boolean" },
          },
        },
        CreateMenuGroup: {
          type: "object",
          required: ["menuGroupName"],
          properties: {
            menuGroupName: { type: "string", example: "Master" },
            icon: { type: "string", example: "ri-settings-line" },
            displayOrder: { type: "integer", example: 1 },
            isActive: { type: "boolean", default: true },
          },
        },
        // Menu schemas
        Menu: {
          type: "object",
          properties: {
            _id: { type: "string" },
            menuName: { type: "string" },
            menuGroupId: { type: "string" },
            parentMenuId: { type: "string" },
            menuPath: { type: "string" },
            icon: { type: "string" },
            displayOrder: { type: "integer" },
            isActive: { type: "boolean" },
          },
        },
        CreateMenu: {
          type: "object",
          required: ["menuName", "menuGroupId"],
          properties: {
            menuName: { type: "string", example: "Country" },
            menuGroupId: { type: "string" },
            parentMenuId: { type: "string" },
            menuPath: { type: "string", example: "/master/country" },
            icon: { type: "string" },
            displayOrder: { type: "integer", example: 1 },
            isActive: { type: "boolean", default: true },
          },
        },
        // Department schemas
        Department: {
          type: "object",
          properties: {
            _id: { type: "string" },
            departmentName: { type: "string" },
            departmentCode: { type: "string" },
            companyId: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateDepartment: {
          type: "object",
          required: ["departmentName", "companyId"],
          properties: {
            departmentName: { type: "string", example: "Sales" },
            departmentCode: { type: "string" },
            companyId: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Organization Setup schemas (ADR-017)
        Company: {
          type: "object",
          properties: {
            _id: { type: "string" },
            companyName: { type: "string" },
            companyCode: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateCompany: {
          type: "object",
          required: ["companyName"],
          properties: {
            companyName: { type: "string", example: "Apidel" },
            companyCode: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        Branch: {
          type: "object",
          properties: {
            _id: { type: "string" },
            branchName: { type: "string" },
            companyId: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateBranch: {
          type: "object",
          required: ["branchName", "companyId"],
          properties: {
            branchName: { type: "string", example: "Vadodara" },
            companyId: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        Designation: {
          type: "object",
          properties: {
            _id: { type: "string" },
            designationName: { type: "string" },
            companyId: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateDesignation: {
          type: "object",
          required: ["designationName", "companyId"],
          properties: {
            designationName: { type: "string", example: "Sr. Executive" },
            companyId: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        EmploymentType: {
          type: "object",
          properties: {
            _id: { type: "string" },
            employmentTypeName: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmploymentType: {
          type: "object",
          required: ["employmentTypeName"],
          properties: {
            employmentTypeName: { type: "string", example: "Full-time" },
            isActive: { type: "boolean", default: true },
          },
        },
        EmployeeGrade: {
          type: "object",
          properties: {
            _id: { type: "string" },
            gradeName: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmployeeGrade: {
          type: "object",
          required: ["gradeName"],
          properties: {
            gradeName: { type: "string", example: "L1" },
            isActive: { type: "boolean", default: true },
          },
        },
        EmployeeHealthInsurance: {
          type: "object",
          properties: {
            _id: { type: "string" },
            providerName: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmployeeHealthInsurance: {
          type: "object",
          required: ["providerName"],
          properties: {
            providerName: { type: "string", example: "Aetna" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Employee Records schemas (ADR-018)
        Employee: {
          type: "object",
          properties: {
            _id: { type: "string" },
            employeeCode: { type: "string" },
            employeeName: { type: "string" },
            userId: { type: "string", nullable: true },
            companyId: { type: "string" },
            departmentId: { type: "string" },
            designationId: { type: "string" },
            branchId: { type: "string" },
            reportsToId: { type: "string", nullable: true },
            status: { type: "string", enum: ["Active", "Inactive", "Suspended", "Left"] },
            dateOfJoining: { type: "string", format: "date" },
            relievingDate: { type: "string", format: "date", nullable: true },
            dateOfBirth: { type: "string", format: "date", nullable: true },
            gender: { type: "string", enum: ["Male", "Female", "Other"], nullable: true },
            employmentTypeId: { type: "string", nullable: true },
            gradeId: { type: "string", nullable: true },
            expenseApproverId: { type: "string", nullable: true },
            leaveApproverId: { type: "string", nullable: true },
            shiftRequestApproverId: { type: "string", nullable: true },
            healthInsuranceProviderId: { type: "string", nullable: true },
            healthInsuranceNo: { type: "string", nullable: true },
            shiftPreference: { type: "string", enum: ["Day", "Night", "UK"], nullable: true },
            workMode: { type: "string", enum: ["WFO", "WFH"], nullable: true },
            isActive: { type: "boolean" },
          },
        },
        CreateEmployee: {
          type: "object",
          required: ["employeeCode", "employeeName", "companyId", "departmentId", "designationId", "branchId", "dateOfJoining"],
          properties: {
            employeeCode: { type: "string", example: "A005" },
            employeeName: { type: "string", example: "Hemant Patel" },
            companyId: { type: "string" },
            departmentId: { type: "string" },
            designationId: { type: "string" },
            branchId: { type: "string" },
            reportsToId: { type: "string" },
            status: { type: "string", enum: ["Active", "Inactive", "Suspended", "Left"], default: "Active" },
            dateOfJoining: { type: "string", format: "date" },
            gender: { type: "string", enum: ["Male", "Female", "Other"] },
            employmentTypeId: { type: "string" },
            gradeId: { type: "string" },
            healthInsuranceProviderId: { type: "string" },
            shiftPreference: { type: "string", enum: ["Day", "Night", "UK"] },
            workMode: { type: "string", enum: ["WFO", "WFH"] },
            isActive: { type: "boolean", default: true },
          },
        },
        // SEO management schemas
        SeoPage: {
          type: "object",
          properties: {
            _id: { type: "string" },
            path: { type: "string", example: "/about" },
            pageName: { type: "string", example: "About us" },
            focusKeyword: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            canonicalUrl: { type: "string" },
            robots: {
              type: "object",
              properties: {
                index: { type: "boolean" },
                follow: { type: "boolean" },
                noarchive: { type: "boolean" },
                nosnippet: { type: "boolean" },
                noimageindex: { type: "boolean" },
                maxSnippet: { type: "integer" },
                maxImagePreview: { type: "string", enum: ["none", "standard", "large"] },
              },
            },
            og: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                image: { type: "string" },
                imageAlt: { type: "string" },
                type: { type: "string" },
              },
            },
            twitter: {
              type: "object",
              properties: {
                card: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                image: { type: "string" },
              },
            },
            jsonLd: {
              type: "object",
              properties: {
                schemaType: { type: "string" },
                body: { type: "string" },
              },
            },
            sitemap: {
              type: "object",
              properties: {
                include: { type: "boolean" },
                priority: { type: "number" },
                changefreq: { type: "string" },
              },
            },
            isActive: { type: "boolean" },
          },
        },
        CreateSeoPage: {
          type: "object",
          required: ["path", "pageName"],
          properties: {
            path: { type: "string", example: "/about" },
            pageName: { type: "string", example: "About us" },
            title: { type: "string", example: "About us" },
            description: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        SeoRedirect: {
          type: "object",
          properties: {
            _id: { type: "string" },
            fromPath: { type: "string", example: "/old-about" },
            toPath: { type: "string", example: "/about" },
            statusCode: { type: "integer", enum: [301, 302, 307, 308, 410], example: 301 },
            hits: { type: "integer" },
            lastHitAt: { type: "string", format: "date-time" },
            notes: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateSeoRedirect: {
          type: "object",
          required: ["fromPath"],
          properties: {
            fromPath: { type: "string", example: "/old-about" },
            toPath: { type: "string", example: "/about" },
            statusCode: { type: "integer", default: 301 },
            notes: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        SeoTags: {
          type: "object",
          description: "Helmet-ready output of POST /public/seo/resolve",
          properties: {
            title: { type: "string" },
            meta: { type: "array", items: { type: "object" } },
            link: { type: "array", items: { type: "object" } },
            script: { type: "array", items: { type: "object" } },
          },
        },
        // Dashboard widget schemas (ADR-003)
        DashboardWidget: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            source: { type: "string", example: "users" },
            metric: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["count", "sum", "avg"] },
                field: { type: "string", nullable: true },
              },
            },
            groupBy: { type: "string", nullable: true },
            dateField: { type: "string", nullable: true },
            dateRange: { type: "string", enum: ["last7", "last30", "last90", "last365", "all"] },
            filters: { type: "array", items: { type: "object" } },
            chartType: { type: "string", enum: ["stat", "bar", "line", "pie", "table"] },
            isActive: { type: "boolean" },
          },
        },
        CreateDashboardWidget: {
          type: "object",
          required: ["title", "source", "chartType"],
          properties: {
            title: { type: "string", example: "Users by department" },
            source: { type: "string", example: "users" },
            metric: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["count", "sum", "avg"], default: "count" },
                field: { type: "string", nullable: true },
              },
            },
            groupBy: { type: "string", nullable: true, example: "departmentId" },
            dateField: { type: "string", nullable: true },
            dateRange: { type: "string", default: "all" },
            filters: { type: "array", items: { type: "object" } },
            chartType: { type: "string", example: "bar" },
            isActive: { type: "boolean", default: true },
          },
        },
        // User schemas
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userName: { type: "string" },
            email: { type: "string" },
            mobileNumber: { type: "string" },
            departmentId: { type: "string" },
            roleId: { type: "string" },
            countryId: { type: "string" },
            stateId: { type: "string" },
            cityId: { type: "string" },
            address: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateUser: {
          type: "object",
          required: ["userName", "email", "password", "departmentId", "roleId"],
          properties: {
            userName: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john@example.com" },
            mobileNumber: { type: "string" },
            departmentId: { type: "string" },
            roleId: { type: "string" },
            password: { type: "string" },
            countryId: { type: "string" },
            stateId: { type: "string" },
            cityId: { type: "string" },
            address: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // User Roles schemas
        UserRoles: {
          type: "object",
          properties: {
            _id: { type: "string" },
            roleId: { type: "string" },
            roles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  menuId: { type: "string" },
                  read: { type: "boolean" },
                  write: { type: "boolean" },
                  edit: { type: "boolean" },
                  delete: { type: "boolean" },
                  print: { type: "boolean" },
                  mail: { type: "boolean" },
                },
              },
            },
          },
        },
        // Email Setup schemas
        EmailSetup: {
          type: "object",
          properties: {
            _id: { type: "string" },
            emailHost: { type: "string" },
            emailPort: { type: "integer" },
            emailUser: { type: "string" },
            emailPassword: { type: "string" },
            emailFrom: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmailSetup: {
          type: "object",
          required: ["emailHost", "emailPort", "emailUser"],
          properties: {
            emailHost: { type: "string", example: "smtp.gmail.com" },
            emailPort: { type: "integer", example: 587 },
            emailUser: { type: "string", example: "user@gmail.com" },
            emailPassword: { type: "string" },
            emailFrom: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Email For schemas
        EmailFor: {
          type: "object",
          properties: {
            _id: { type: "string" },
            emailFor: { type: "string" },
            triggerKey: { type: "string", description: "Machine key from apps/server/config/emailTriggers.js (ADR-015), picked from a dropdown fed by GET /email-for/triggers" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmailFor: {
          type: "object",
          required: ["emailFor", "triggerKey"],
          properties: {
            emailFor: { type: "string", example: "Forget Password" },
            triggerKey: { type: "string", example: "password.forgot" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Email Template schemas
        EmailTemplate: {
          type: "object",
          properties: {
            _id: { type: "string" },
            templateName: { type: "string" },
            emailForId: { type: "string" },
            emailSetupId: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateEmailTemplate: {
          type: "object",
          required: ["templateName", "emailForId"],
          properties: {
            templateName: { type: "string", example: "User Welcome" },
            emailForId: { type: "string" },
            emailSetupId: { type: "string" },
            subject: { type: "string" },
            body: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Admin User schemas
        AdminUser: {
          type: "object",
          properties: {
            _id: { type: "string" },
            adminName: { type: "string" },
            email: { type: "string" },
            mobileNumber: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateAdminUser: {
          type: "object",
          required: ["adminName", "email", "password"],
          properties: {
            adminName: { type: "string", example: "Jane Admin" },
            email: { type: "string", example: "admin@example.com" },
            password: { type: "string" },
            mobileNumber: { type: "string" },
            isActive: { type: "boolean", default: true },
          },
        },
        // Auth schemas
        // Travel schemas (ADR-023). Note: modules 3-6 (Recruitment onward)
        // didn't add their own schemas here despite the convention — a
        // pre-existing gap, not introduced or fixed by this module.
        PurposeOfTravel: {
          type: "object",
          properties: {
            _id: { type: "string" },
            purposeOfTravelName: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreatePurposeOfTravel: {
          type: "object",
          required: ["purposeOfTravelName"],
          properties: {
            purposeOfTravelName: { type: "string", example: "Client Visit" },
            isActive: { type: "boolean", default: true },
          },
        },
        IdentificationDocumentType: {
          type: "object",
          properties: {
            _id: { type: "string" },
            identificationDocumentTypeName: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateIdentificationDocumentType: {
          type: "object",
          required: ["identificationDocumentTypeName"],
          properties: {
            identificationDocumentTypeName: { type: "string", example: "Passport" },
            isActive: { type: "boolean", default: true },
          },
        },
        TravelRequest: {
          type: "object",
          properties: {
            _id: { type: "string" },
            employeeId: { type: "string" },
            travelType: { type: "string", enum: ["Domestic", "International"] },
            travelFunding: { type: "string" },
            purposeOfTravelId: { type: "string" },
            detailsOfSponsor: { type: "string" },
            description: { type: "string" },
            personalIdTypeId: { type: "string" },
            personalIdNumber: { type: "string" },
            itinerary: { type: "array", items: { type: "object" } },
            costings: { type: "array", items: { type: "object" } },
            status: { type: "string", enum: ["Draft", "Submitted", "Cancelled"] },
            companyId: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        CreateTravelRequest: {
          type: "object",
          required: ["employeeId", "travelType", "purposeOfTravelId"],
          properties: {
            employeeId: { type: "string" },
            travelType: { type: "string", enum: ["Domestic", "International"] },
            purposeOfTravelId: { type: "string" },
            status: { type: "string", default: "Draft" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "admin@example.com" },
            password: { type: "string", example: "password123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            isOk: { type: "boolean", example: true },
            message: { type: "string" },
            token: { type: "string" },
            role: { type: "string" },
            data: { type: "object" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication endpoints" },
      { name: "Admin - Auth", description: "Admin account and login-attempt management" },
      { name: "Admin Users", description: "Admin user management" },
      { name: "Countries", description: "Country management" },
      { name: "States", description: "State management" },
      { name: "Cities", description: "City management" },
      { name: "Currencies", description: "Currency management" },
      { name: "Roles", description: "Role management" },
      { name: "Menu Groups", description: "Menu group management" },
      { name: "Menus", description: "Menu management" },
      { name: "Departments", description: "Department management" },
      { name: "Users", description: "User management" },
      { name: "User Roles", description: "Role-based menu permissions" },
      { name: "Email Setup", description: "Email SMTP configuration" },
      { name: "Email For", description: "Email purpose/category management" },
      { name: "Email Templates", description: "Email template management" },
    ],
  },
  apis: ["./routes/v1/*.js"], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
  // Swagger UI route
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Demo Panel API Documentation",
    }),
  );

  // Serve swagger spec as JSON
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log("📚 Swagger UI available at /api-docs");
};

export default swaggerSpec;
