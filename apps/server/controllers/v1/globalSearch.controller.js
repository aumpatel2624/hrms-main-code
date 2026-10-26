import { buildSearchTargets, runGlobalSearch } from "../../utils/globalSearch.js";

// Resolved from the mounted routes on first use — every router is mounted by
// then, and a registry entry with no gated route fails loudly here.
let targets = null;

/**
 * POST /global-search — the header search box (ADR-044). Replays each
 * registered screen's own list search as the caller; see utils/globalSearch.js
 * for why that keeps every result inside what the caller's lists already show.
 *
 * data: [{ screen, count, rows }] — `rows` is at most PER_SCREEN list rows.
 */
export const globalSearch = async (req, res) => {
  try {
    targets ??= buildSearchTargets(req.app._router);
    const term = String(req.body.match).trim();
    const stop = new AbortController();
    res.on("close", () => stop.abort());
    const { groups, failed } = await runGlobalSearch(req, term, targets, stop.signal);
    return res.status(200).json({ isOk: true, status: 200, data: groups, failed });
  } catch (error) {
    console.log("Error in globalSearch", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
