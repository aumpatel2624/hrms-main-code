import assert from "node:assert/strict";
import { getWorkExperience, getGratuityAmount } from "./gratuityCalc.js";

console.log("Running gratuityCalc.test.js...");

// ============================================================================
// 1. getWorkExperience — rounding modes
// ============================================================================

{
  // dateOfJoining -> relievingDate spans exactly 14 calendar days.
  // totalWorkingDaysPerYear=4, lwpDays=0 => rawExperience = 14/4 = 3.5
  const args = {
    dateOfJoining: "2020-01-01",
    relievingDate: "2020-01-15",
    lwpDays: 0,
    totalWorkingDaysPerYear: 4,
    minimumYearForGratuity: 0,
  };

  const roundedOff = getWorkExperience({ ...args, workExperienceCalculationFunction: "Round off Work Experience" });
  assert.equal(roundedOff, 4, "Round off Work Experience should round 3.5 to nearest whole number (4)");

  const exact = getWorkExperience({ ...args, workExperienceCalculationFunction: "Take Exact Completed Years" });
  assert.equal(exact, 3.5, "Take Exact Completed Years must keep the fractional value (not truncate)");
}

{
  // Manual mode returns the manual value untouched, no rounding at all.
  const manual = getWorkExperience({
    workExperienceCalculationFunction: "Manual",
    manualValue: 7.456,
    minimumYearForGratuity: 0,
  });
  assert.equal(manual, 7.456, "Manual mode must return manualValue untouched");
}

// ============================================================================
// 2. getWorkExperience — LWP days subtracted from the calendar span
// ============================================================================

{
  // Same 14-day span, but 4 of those days are LWP => working days = 10.
  // totalWorkingDaysPerYear=5 => rawExperience = 10/5 = 2.0 exactly.
  const experience = getWorkExperience({
    dateOfJoining: "2020-01-01",
    relievingDate: "2020-01-15",
    lwpDays: 4,
    totalWorkingDaysPerYear: 5,
    workExperienceCalculationFunction: "Round off Work Experience",
    minimumYearForGratuity: 0,
  });
  assert.equal(experience, 2, "LWP days must be subtracted before dividing by totalWorkingDaysPerYear");
}

// ============================================================================
// 3. getWorkExperience — minimumYearForGratuity throw
// ============================================================================

{
  assert.throws(
    () => getWorkExperience({
      dateOfJoining: "2020-01-01",
      relievingDate: "2020-01-15",
      lwpDays: 0,
      totalWorkingDaysPerYear: 4,
      workExperienceCalculationFunction: "Round off Work Experience",
      minimumYearForGratuity: 5,
    }),
    /minimum 5 years/,
    "Should throw when computed experience (4) is below minimumYearForGratuity (5)",
  );
}

// ============================================================================
// 4. getGratuityAmount — input validation throws
// ============================================================================

{
  assert.throws(
    () => getGratuityAmount({
      workExperience: 5,
      applicableComponentIds: [],
      latestSlipEarnings: [{ salaryComponentId: "a", defaultAmount: 1000 }],
      calculateGratuityAmountBasedOn: "Current Slab",
      slabs: [{ fromYear: 0, toYear: null, fractionOfApplicableEarnings: 1 }],
    }),
    /No applicable Earning components found/,
    "Should throw when applicableComponentIds is empty",
  );
}

{
  assert.throws(
    () => getGratuityAmount({
      workExperience: 5,
      applicableComponentIds: ["a"],
      latestSlipEarnings: [],
      calculateGratuityAmountBasedOn: "Current Slab",
      slabs: [{ fromYear: 0, toYear: null, fractionOfApplicableEarnings: 1 }],
    }),
    /No Salary Slip found/,
    "Should throw when latestSlipEarnings is empty (no submitted slip)",
  );
}

{
  assert.throws(
    () => getGratuityAmount({
      workExperience: 5,
      applicableComponentIds: ["a"],
      latestSlipEarnings: [{ salaryComponentId: "b", defaultAmount: 1000 }],
      calculateGratuityAmountBasedOn: "Current Slab",
      slabs: [{ fromYear: 0, toYear: null, fractionOfApplicableEarnings: 1 }],
    }),
    /No applicable Earning component found in last salary slip/,
    "Should throw when none of the applicable components appear on the slip",
  );
}

// ============================================================================
// 5. getGratuityAmount — "Current Slab" mode
// ============================================================================

{
  // workExperience=6 falls into slab [5,9] @ fraction 0.5; totalComponentAmount=1000.
  // amount = 1000 * 6 * 0.5 = 3000
  const amount = getGratuityAmount({
    workExperience: 6,
    applicableComponentIds: ["comp1"],
    latestSlipEarnings: [{ salaryComponentId: "comp1", defaultAmount: 1000 }],
    calculateGratuityAmountBasedOn: "Current Slab",
    slabs: [
      { fromYear: 0, toYear: 4, fractionOfApplicableEarnings: 0.2 },
      { fromYear: 5, toYear: 9, fractionOfApplicableEarnings: 0.5 },
      { fromYear: 10, toYear: null, fractionOfApplicableEarnings: 1 },
    ],
  });
  assert.equal(amount, 3000, "Current Slab: amount = totalComponentAmount * experience * matching slab fraction");
}

{
  // Sums multiple matching earning rows (defaultAmount fallback to amount).
  const amount = getGratuityAmount({
    workExperience: 6,
    applicableComponentIds: ["comp1", "comp2"],
    latestSlipEarnings: [
      { salaryComponentId: "comp1", defaultAmount: 1000 },
      { salaryComponentId: "comp2", amount: 500 },
      { salaryComponentId: "comp3", defaultAmount: 99999 }, // not applicable, ignored
    ],
    calculateGratuityAmountBasedOn: "Current Slab",
    slabs: [{ fromYear: 0, toYear: null, fractionOfApplicableEarnings: 0.5 }],
  });
  // totalComponentAmount = 1500; amount = 1500 * 6 * 0.5 = 4500
  assert.equal(amount, 4500, "Should sum only applicable-component earning rows");
}

// ============================================================================
// 6. getGratuityAmount — "Current Slab" fraction===0 skip-and-continue quirk
// ============================================================================

{
  // workExperience=2 matches slab [0,4] first, whose fraction is 0 — per
  // ADR-031 this is treated as "not found", so the loop must keep scanning
  // rather than stopping there. No later slab matches experience=2, so the
  // walk ends with no slab found at all.
  assert.throws(
    () => getGratuityAmount({
      workExperience: 2,
      applicableComponentIds: ["comp1"],
      latestSlipEarnings: [{ salaryComponentId: "comp1", defaultAmount: 1000 }],
      calculateGratuityAmountBasedOn: "Current Slab",
      slabs: [
        { fromYear: 0, toYear: 4, fractionOfApplicableEarnings: 0 },
        { fromYear: 5, toYear: 9, fractionOfApplicableEarnings: 0.5 },
      ],
    }),
    /No applicable slab found/,
    "fraction===0 must not stop the scan; if nothing else matches, it should throw 'no applicable slab found'",
  );
}

// ============================================================================
// 7. getGratuityAmount — "Sum of all previous slabs" mode
// ============================================================================

{
  // workExperience=12, totalComponentAmount=1000.
  // Slab [0,4] @ 0.1: fully passed -> width=4-0+1=5 -> +5*1000*0.1=500; yearsLeft=12-5=7
  // Slab [5,9] @ 0.15: fully passed -> width=9-5+1=5 -> +5*1000*0.15=750 (=1250); yearsLeft=7-5=2
  // Slab [10,null] @ 0.2: contains 12 -> +yearsLeft(2)*1000*0.2=400 (=1650)
  const amount = getGratuityAmount({
    workExperience: 12,
    applicableComponentIds: ["comp1"],
    latestSlipEarnings: [{ salaryComponentId: "comp1", defaultAmount: 1000 }],
    calculateGratuityAmountBasedOn: "Sum of all previous slabs",
    slabs: [
      { fromYear: 0, toYear: 4, fractionOfApplicableEarnings: 0.1 },
      { fromYear: 5, toYear: 9, fractionOfApplicableEarnings: 0.15 },
      { fromYear: 10, toYear: null, fractionOfApplicableEarnings: 0.2 },
    ],
  });
  assert.equal(amount, 1650, "Sum of all previous slabs: hand-computed progressive walk should equal 1650");
}

{
  // Single open-ended slab only (no earlier brackets to sum) — the generic
  // "isWithin" branch handles this without a special case.
  const amount = getGratuityAmount({
    workExperience: 3,
    applicableComponentIds: ["comp1"],
    latestSlipEarnings: [{ salaryComponentId: "comp1", defaultAmount: 2000 }],
    calculateGratuityAmountBasedOn: "Sum of all previous slabs",
    slabs: [{ fromYear: 0, toYear: null, fractionOfApplicableEarnings: 0.25 }],
  });
  // amount = 3 * 2000 * 0.25 = 1500
  assert.equal(amount, 1500, "Sole open-ended slab: amount = workExperience * totalComponentAmount * fraction");
}

{
  // workExperience (2) is below every defined slab's fromYear (5) — neither
  // the "fully passed" nor the "currently within" branch ever matches, so
  // slabFound never flips true and the walk throws.
  assert.throws(
    () => getGratuityAmount({
      workExperience: 2,
      applicableComponentIds: ["comp1"],
      latestSlipEarnings: [{ salaryComponentId: "comp1", defaultAmount: 1000 }],
      calculateGratuityAmountBasedOn: "Sum of all previous slabs",
      slabs: [{ fromYear: 5, toYear: 9, fractionOfApplicableEarnings: 0.1 }],
    }),
    /No applicable slab found/,
    "Should throw when experience is below every defined slab's range",
  );
}

console.log("✅ All gratuityCalc.test.js assertions passed!");
