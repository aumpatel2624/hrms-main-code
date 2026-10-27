import mongoose from "mongoose";

// Mongoose's own wording for a required field left blank is "Path `status` is
// required.", which is what a person clearing a form's Status or Posting Date
// on edit used to be shown. Name the field the way the form does instead:
// "Status is required", "Posting Date is required", "Employee is required".
// Like the plugins, this only reaches schemas compiled after it is imported.
export const fieldLabel = (path) => path.split(".").pop()
  .replace(/Id$/, "")
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/^./, (first) => first.toUpperCase());

mongoose.Error.messages.general.required = ({ path }) => `${fieldLabel(path)} is required`;
