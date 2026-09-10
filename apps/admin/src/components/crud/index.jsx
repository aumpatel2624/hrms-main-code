import CrudList from "./crud-list";
import CrudForm from "./crud-form";
import CrudView from "./crud-view";

export { CrudList, CrudForm, CrudView };

/**
 * Expands one entity config into its four routes.
 *
 * React Router ranks static segments above dynamic ones, so /add is matched
 * before /:id regardless of the order here.
 *
 * The `key` matters: every entity renders the same component at the same
 * position in the tree, so without it React reuses the instance when you move
 * between two lists. Local state (page, query, filter) would carry over and the
 * fetch effect would never re-fire, leaving the previous entity's rows on
 * screen. Keying by entity forces a remount.
 */
export const crudRoutes = (config) => [
    { path: config.path, component: <CrudList key={config.key} config={config} /> },
    { path: `${config.path}/add`, component: <CrudForm key={`${config.key}-add`} config={config} mode="add" /> },
    { path: `${config.path}/:id`, component: <CrudView key={`${config.key}-view`} config={config} /> },
    { path: `${config.path}/:id/edit`, component: <CrudForm key={`${config.key}-edit`} config={config} mode="edit" /> },
];
