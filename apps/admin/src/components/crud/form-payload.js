const CHOICE_TYPES = ["select", "enum", "date"];

/**
 * The last step before a form is saved. A dropdown or date left blank holds
 * "", which the server cannot cast to an ObjectId, an enum value or a Date
 * ("Cast to ObjectId failed"). On create a blank one is left out, so the
 * server's own default (a starting status, today's posting date) applies;
 * on edit it goes as null, so clearing a field really clears it. Required
 * fields never get here blank — the form's validation stops them first.
 */
export const formPayload = (fields, payload, mode) => {
    const out = { ...payload };
    fields.forEach((field) => {
        if (!CHOICE_TYPES.includes(field.type) || out[field.name] !== "") return;
        if (mode === "edit") out[field.name] = null;
        else delete out[field.name];
    });
    return out;
};
