import assert from "node:assert/strict";
import {
  NUMBER_OF_STARS,
  validateWeightageSum,
  calculateAutomatedGoalScore,
  calculateManualGoalScore,
  calculateSelfScore,
  calculateFinalScore,
  deriveGoalStatus,
  averageGoalProgress,
} from "./appraisalCalc.js";

console.log("Running appraisalCalc.test.js...");

// ============================================================================
// 1. validateWeightageSum
// ============================================================================

{
  // Sums to exactly 100 — no throw.
  assert.doesNotThrow(() => validateWeightageSum([{ weightage: 60 }, { weightage: 40 }]));
}

{
  // Empty array — skipped entirely, no forced non-empty rule.
  assert.doesNotThrow(() => validateWeightageSum([]));
  assert.doesNotThrow(() => validateWeightageSum(undefined));
}

{
  // Sums to 99 — throws, message names the actual total.
  assert.throws(
    () => validateWeightageSum([{ weightage: 60 }, { weightage: 39 }]),
    /Currently, it is 99%/,
    "Should throw when weightage sum is not exactly 100",
  );
}

{
  // Rounds to 2dp before comparing — 33.333+33.333+33.334 = 100.000 exactly.
  assert.doesNotThrow(() => validateWeightageSum([{ weightage: 33.333 }, { weightage: 33.333 }, { weightage: 33.334 }]));
}

{
  // Custom weightage key.
  assert.throws(() => validateWeightageSum([{ pct: 50 }], "pct"), /Currently, it is 50%/);
}

// ============================================================================
// 2. calculateAutomatedGoalScore
// ============================================================================

{
  // k1: goalCompletion = avg(80,100) = 90; goalScore = 90*60/100 = 54
  // k2: goalCompletion = 50; goalScore = 50*40/100 = 20
  // goalScorePercentage = 74; totalScore = 74/20 = 3.7
  const result = calculateAutomatedGoalScore({
    appraisalKra: [
      { kraId: "k1", weightage: 60 },
      { kraId: "k2", weightage: 40 },
    ],
    goalsByKra: {
      k1: [{ progress: 80 }, { progress: 100 }],
      k2: [{ progress: 50 }],
    },
  });
  assert.equal(result.rows[0].goalCompletion, 90);
  assert.equal(result.rows[0].goalScore, 54);
  assert.equal(result.rows[1].goalCompletion, 50);
  assert.equal(result.rows[1].goalScore, 20);
  assert.equal(result.goalScorePercentage, 74);
  assert.equal(result.totalScore, 3.7, "0-100 percentage must be rescaled to 0-5 by dividing by 20");
}

{
  // A KRA with no tagged goals at all -> goalCompletion 0, goalScore 0 (not
  // a crash / not NaN) — this is exactly the foundation-half state before
  // Goal exists (second branch).
  const result = calculateAutomatedGoalScore({
    appraisalKra: [{ kraId: "k1", weightage: 100 }],
    goalsByKra: {},
  });
  assert.equal(result.rows[0].goalCompletion, 0);
  assert.equal(result.rows[0].goalScore, 0);
  assert.equal(result.totalScore, 0);
}

{
  // goalsByKra also accepted as a flat array (second branch can wire real
  // Goal rows in without reshaping into a map).
  const result = calculateAutomatedGoalScore({
    appraisalKra: [{ kraId: "k1", weightage: 100 }],
    goalsByKra: [{ kraId: "k1", progress: 40 }, { kraId: "k1", progress: 60 }, { kraId: "k2", progress: 999 }],
  });
  assert.equal(result.rows[0].goalCompletion, 50, "Only goals matching this row's kraId should be averaged");
  assert.equal(result.totalScore, 2.5);
}

// ============================================================================
// 3. calculateManualGoalScore
// ============================================================================

{
  // a: scoreEarned = 4*70/100 = 2.8; b: scoreEarned = 5*30/100 = 1.5
  // total = 4.3
  const result = calculateManualGoalScore([
    { label: "a", weightage: 70, score: 4 },
    { label: "b", weightage: 30, score: 5 },
  ]);
  assert.equal(result.rows[0].scoreEarned, 2.8);
  assert.equal(result.rows[1].scoreEarned, 1.5);
  assert.equal(result.totalScore, 4.3);
}

{
  assert.throws(
    () => calculateManualGoalScore([{ label: "a", weightage: 100, score: NUMBER_OF_STARS + 1 }]),
    /Goal Score cannot be greater than 5/,
    "Should throw when a row's score exceeds NUMBER_OF_STARS",
  );
}

{
  // Exactly at the cap is fine (not "greater than").
  assert.doesNotThrow(() => calculateManualGoalScore([{ label: "a", weightage: 100, score: NUMBER_OF_STARS }]));
}

// ============================================================================
// 4. calculateSelfScore
// ============================================================================

{
  // c1: 0.8*5*0.5 = 2; c2: 0.6*5*0.5 = 1.5; total = 3.5
  const score = calculateSelfScore([
    { criteriaId: "c1", weightage: 50, rating: 0.8 },
    { criteriaId: "c2", weightage: 50, rating: 0.6 },
  ]);
  assert.equal(score, 3.5);
}

{
  assert.equal(calculateSelfScore([]), 0, "No rows -> zero self score, not NaN");
}

// ============================================================================
// 5. calculateFinalScore
// ============================================================================

{
  // Default (no formula): simple average of the three scores.
  // (3.7 + 3.5 + 0) / 3 = 2.4
  const score = calculateFinalScore({ goalScore: 3.7, selfScore: 3.5, feedbackScore: 0 });
  assert.equal(score, 2.4);
}

{
  // Formula path reuses payrollFormula.js's evaluator — a real formula that
  // is NOT the same as the default average, to prove it actually runs the
  // formula rather than silently falling back.
  // goalScore*2 + selfScore = 3.7*2 + 3.5 = 10.9
  const score = calculateFinalScore({
    goalScore: 3.7,
    selfScore: 3.5,
    feedbackScore: 0,
    useFormula: true,
    formula: "goalScore * 2 + selfScore",
  });
  assert.equal(score, 10.9);
}

{
  // evalContext values are exposed to the formula, but goalScore/selfScore/
  // feedbackScore always win over a same-named evalContext key.
  const score = calculateFinalScore({
    goalScore: 4,
    selfScore: 0,
    feedbackScore: 0,
    useFormula: true,
    formula: "goalScore + bonus",
    evalContext: { bonus: 1, goalScore: 999 },
  });
  assert.equal(score, 5, "The computed goalScore must win over an evalContext value of the same name");
}

{
  // No eval()/Function() anywhere — formula evaluation goes through the
  // hand-written parser, which raises a clear Error on garbage input rather
  // than executing it.
  assert.throws(
    () => calculateFinalScore({ goalScore: 1, selfScore: 1, feedbackScore: 1, useFormula: true, formula: "process.exit(1)" }),
    Error,
    "A non-arithmetic expression must raise, not execute, arbitrary code",
  );
}

// ============================================================================
// 6. deriveGoalStatus (ADR-032, transactional half)
// ============================================================================

{
  assert.equal(deriveGoalStatus({ progress: 0, currentStatus: "Pending" }), "Pending");
  assert.equal(deriveGoalStatus({ progress: 100, currentStatus: "In Progress" }), "Completed");
  assert.equal(deriveGoalStatus({ progress: 45, currentStatus: "Pending" }), "In Progress");
  assert.equal(deriveGoalStatus({ progress: 1, currentStatus: "Pending" }), "In Progress");
  assert.equal(deriveGoalStatus({ progress: 99, currentStatus: "Completed" }), "In Progress");
}

{
  // Archived/Closed are sticky — no recompute regardless of progress.
  assert.equal(deriveGoalStatus({ progress: 100, currentStatus: "Archived" }), "Archived");
  assert.equal(deriveGoalStatus({ progress: 0, currentStatus: "Closed" }), "Closed");
}

// ============================================================================
// 7. averageGoalProgress (ADR-032, transactional half)
// ============================================================================

{
  assert.equal(averageGoalProgress([80, 100]), 90);
  assert.equal(averageGoalProgress([50]), 50);
  assert.equal(averageGoalProgress([]), 0, "No children -> 0, not NaN/throw");
  assert.equal(averageGoalProgress([33.33, 33.33, 33.34]), 33.33);
}

console.log("✅ All appraisalCalc.test.js assertions passed!");
