// Role screens, found by the pre-production simulation:
//   1. any signed-in user could read any role's permission matrix through
//      GET /user-roles/:roleId; now only their own role's (the menu is built
//      from it), or any role's with read on the User Roles screen,
//   2. a duplicate role name answered "Internal server error" (F19).
// Drives the real mounted routes over in-memory stand-ins, like
// accessLifecycle.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import AdminUser from "../../models/AdminUser.js";
import Employee from "../../models/Employee.js";
import MenuMaster from "../../models/MenuMaster.js";
import RoleMaster from "../../models/RoleMaster.js";
import UserRoles from "../../models/UserRoles.js";
import rolesRoutes from "../../routes/v1/roles.routes.js";
import userRolesRoutes from "../../routes/v1/userRoles.routes.js";

// ---------------------------------------------------------------- stand-ins --
const same = (a, b) => String(a) === String(b);
const query = (result) => {
  const chain = {
    select: () => chain, populate: () => chain, lean: () => chain, sort: () => chain,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
};
const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; },
  clearCookie() {},
});
const routeOf = (router, method, path) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods[method]);
  assert.ok(layer, `${method.toUpperCase()} ${path} is mounted`);
  return layer.route.stack.map((entry) => entry.handle);
};
const call = async (router, method, path, sessionUser, { params = {}, body = {} } = {}) => {
  const req = { session: { user: { ...sessionUser } }, method: method.toUpperCase(), path, params, body, query: {} };
  const res = fakeRes();
  for (const handle of routeOf(router, method, path)) {
    let advanced = false;
    await handle(req, res, () => { advanced = true; });
    if (!advanced) break;
  }
  return res;
};
const expectStatus = (res, status, label) => assert.equal(res.statusCode, status, `${label}: ${JSON.stringify(res.body)}`);

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
const userRolesMenuId = oid();
const employeeRoleId = oid();
const hrRoleId = oid();
const matrices = [
  { _id: oid(), roleId: employeeRoleId, isActive: true, roles: [] },
  { _id: oid(), roleId: hrRoleId, isActive: true, roles: [{ menuId: userRolesMenuId, read: true, write: false, edit: true, delete: false }] },
];
const people = [
  { _id: oid(), roleId: employeeRoleId, isActive: true, status: "Active" },
  { _id: oid(), roleId: hrRoleId, isActive: true, status: "Active" },
];
const [rohan, hema] = people;
const admin = { _id: oid(), isActive: true };
AdminUser.findById = (id) => query(same(id, admin._id) ? admin : null);
Employee.findById = (id) => query(people.find((row) => same(row._id, id)) ?? null);
MenuMaster.find = () => query([{ _id: userRolesMenuId, menuUrl: "/user-roles" }]);
UserRoles.findOne = (filter) => query(matrices.find((row) => same(row.roleId, filter.roleId)) ?? null);
UserRoles.find = (filter) => query(matrices.filter((row) => same(row.roleId, filter.roleId)));
const sessionOf = (person) => ({ id: String(person._id), role: "USER", roleId: String(person.roleId), departmentId: null });
const adminSession = { id: String(admin._id), role: "ADMIN" };

// ------------------------------------------------- 1. reading a role matrix --
{
  const read = (sessionUser, roleId) => call(userRolesRoutes, "get", "/user-roles/:roleId", sessionUser, { params: { roleId: String(roleId) } });

  const own = await read(sessionOf(rohan), employeeRoleId);
  expectStatus(own, 200, "an employee reads their own role (their menu)");
  assert.ok(same(own.body.data[0].roleId, employeeRoleId));
  expectStatus(await read(sessionOf(rohan), hrRoleId), 403, "an employee reads another role's matrix");
  expectStatus(await read(sessionOf(hema), employeeRoleId), 200, "a role with read on User Roles reads any role");
  expectStatus(await read(adminSession, hrRoleId), 200, "an admin reads any role");
}
console.log("roleAccess: a role's matrix is readable by its own members and the User Roles screen");

// ------------------------------------------------------- 2. duplicate name --
{
  const duplicate = Object.assign(new Error("E11000 duplicate key error collection: roles index: roleName_1"), { code: 11000 });
  RoleMaster.prototype.save = async () => { throw duplicate; };
  RoleMaster.findByIdAndUpdate = async () => { throw duplicate; };

  const created = await call(rolesRoutes, "post", "/roles", adminSession, { body: { roleName: "Employee" } });
  expectStatus(created, 409, "add a role whose name exists");
  assert.equal(created.body.message, "A role with this name already exists");

  const renamed = await call(rolesRoutes, "put", "/roles/:roleId", adminSession, { params: { roleId: String(hrRoleId) }, body: { roleName: "Employee" } });
  expectStatus(renamed, 409, "rename a role to a name that exists");
  assert.equal(renamed.body.message, "A role with this name already exists");
}
console.log("roleAccess: a duplicate role name gets a clear message");

console.log("roleAccess: all cases passed");
