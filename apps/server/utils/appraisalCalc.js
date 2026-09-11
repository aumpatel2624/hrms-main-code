/**
 * ADR-032 (Performance, module 16, foundation half). The whole appraisal
 * scoring engine, kept in its own small dedicated file — same "one calc file
 * per module" pattern as `gratuityCalc.js`/`incomeTaxCalc.js`/`arrearCalc.js`.
 * Every function here is pure (no DB access) so it can be unit-tested with
 * hand-computed numbers; the controller is responsible for fetching
 * whatever DB rows a caller needs to pass in.
 *
 * `NUMBER_OF_STARS` replaces source's two divergent star-count reads
 * (`Appraisal.calculate_self_appraisal_score` reads a Frappe Rating field's
 * configured max dynamically; `Employee Performance Feedback.set_total_score`
 * hardcodes `5`) with one constant, used everywhere in this port — not a
 * "fix" of a business rule, just the natural consequence of not modelling
 * Frappe's per-field metadata (see DECISIONS.md ADR-032).
 */
import { evaluateFormula } from "./payrollFormula.js";

export const NUMBER_OF_STARS = 5;

const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

/**
 * The single most-repeated business rule in this module: whenever `rows` is
 * non-empty, the sum of its `weightageKey` values (rounded to 2dp) must
 * equal exactly 100. Reused across every weight-bearing child array in the
 * module (`AppraisalTemplate.goals`/`.ratingCriteria`,
 * `Appraisal.appraisalKra`/`.goals`/`.selfRatings`) instead of six inline
 * copies. Empty arrays are skipped entirely — no forced non-empty rule here.
 */
export const validateWeightageSum = (rows, weightageKey = "weightage") => {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const total = round2(rows.reduce((sum, row) => sum + (Number(row?.[weightageKey]) || 0), 0));
  if (total !== 100) {
    const error = new Error(`Total weightage must add up to 100. Currently, it is ${total}%`);
    error.status = 400;
    throw error;
  }
};

/**
 * Automated ("Based on Goal Progress") mode. For each `appraisalKra` row,
 * `goalCompletion` is the average `progress` of every Goal tagged to that
 * row's `kraId` — `goalsByKra` is a plain lookup the controller builds
 * (since `Goal` itself is the second branch, not built here); it accepts
 * either a map of `{ [kraId]: [{ progress }, ...] }` or a flat array of
 * `{ kraId, progress }` rows, so the second branch can wire in real Goal
 * data without this function's shape changing.
 *
 * `goalScore = goalCompletion * weightage / 100` per row, summed into
 * `goalScorePercentage` (a 0-100 scale), then rescaled to a 0-5 scale by
 * dividing by 20 (`Appraisal.md`'s exact `total = goal_score_percentage / 20`).
 */
export const calculateAutomatedGoalScore = ({ appraisalKra = [], goalsByKra = {} } = {}) => {
  const goalsForKra = (kraId) => {
    const key = String(kraId);
    if (Array.isArray(goalsByKra)) return goalsByKra.filter((g) => String(g.kraId) === key);
    return goalsByKra[key] || [];
  };

  let goalScorePercentage = 0;
  const rows = appraisalKra.map((row) => {
    const goals = goalsForKra(row.kraId);
    const goalCompletion = goals.length
      ? round2(goals.reduce((sum, g) => sum + (Number(g.progress) || 0), 0) / goals.length)
      : 0;
    const goalScore = round2((goalCompletion * (Number(row.weightage) || 0)) / 100);
    goalScorePercentage += goalScore;
    return { ...row, goalCompletion, goalScore };
  });

  goalScorePercentage = round2(goalScorePercentage);
  return { rows, goalScorePercentage, totalScore: round2(goalScorePercentage / 20) };
};

/**
 * Manual ("Manual Rating") mode. `score` is already on a 0-`NUMBER_OF_STARS`
 * scale (no rescale, unlike the automated path) — throws if any row's score
 * exceeds `NUMBER_OF_STARS` (source's `calculate_total_score` guard: "Goal
 * Score cannot be greater than {number_of_stars}"). Sum of
 * `score * weightage / 100` across rows.
 */
export const calculateManualGoalScore = (goals = []) => {
  let total = 0;
  const rows = goals.map((row, idx) => {
    const score = Number(row.score) || 0;
    if (score > NUMBER_OF_STARS) {
      const error = new Error(`Row ${idx + 1}: Goal Score cannot be greater than ${NUMBER_OF_STARS}`);
      error.status = 400;
      throw error;
    }
    const scoreEarned = round2((score * (Number(row.weightage) || 0)) / 100);
    total += scoreEarned;
    return { ...row, score, scoreEarned };
  });
  return { rows, totalScore: round2(total) };
};

/**
 * `Σ(rating * NUMBER_OF_STARS * weightage / 100)` across `selfRatings` rows.
 * `rating` arrives already on the 0..1 fractional scale (this project's own
 * `FeedbackRatingSchema` convention, matching Frappe's Rating fieldtype
 * storage) — multiplying by `NUMBER_OF_STARS` converts it back to a
 * "stars earned" value before weighting, same order of operations as source.
 */
export const calculateSelfScore = (selfRatings = []) =>
  round2(
    selfRatings.reduce((sum, row) => {
      const rating = Number(row.rating) || 0;
      const weightage = Number(row.weightage) || 0;
      return sum + rating * NUMBER_OF_STARS * (weightage / 100);
    }, 0),
  );

/**
 * Simple average of goal/self/feedback scores by default, or the cycle's
 * `finalScoreFormula` (evaluated via `payrollFormula.js`'s existing
 * evaluator — the same hand-written, no-`eval` interpreter already used
 * twice for `SalarySlip`/`Taxable Salary Slab`, not a third evaluator) when
 * `useFormula` is set. `evalContext` carries whatever extra fields the
 * caller wants exposed to the formula (Employee/Appraisal/AppraisalCycle
 * fields) — `goalScore`/`selfScore`/`feedbackScore` are always provided and
 * win over any same-named key in `evalContext` (Appraisal's own computed
 * scores are the authoritative ones).
 */
export const calculateFinalScore = ({
  goalScore = 0,
  selfScore = 0,
  feedbackScore = 0,
  useFormula = false,
  formula = "",
  evalContext = {},
} = {}) => {
  if (useFormula) {
    const context = { ...evalContext, goalScore: Number(goalScore) || 0, selfScore: Number(selfScore) || 0, feedbackScore: Number(feedbackScore) || 0 };
    return round2(evaluateFormula(formula, context));
  }
  return round2((Number(goalScore) + Number(selfScore) + Number(feedbackScore)) / 3);
};
