export type CourseFees = {
  published_fee_amount: number | null;
  counselling_fee_min?: number | null;
  counselling_fee_max?: number | null;
  management_fee_min?: number | null;
  management_fee_max?: number | null;
  fee_period?: string;
};
const rupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
export function courseFeeSummary(course: CourseFees) {
  const ranges: string[] = [];
  for (const [key, label] of [
    ["counselling", "Counselling quota"],
    ["management", "Management quota"],
  ] as const) {
    const min = course[`${key}_fee_min`],
      max = course[`${key}_fee_max`];
    if (min != null && max != null)
      ranges.push(
        `${label}: ${rupees(min)}${min === max ? "" : ` to ${rupees(max)}`}`,
      );
  }
  return ranges.length
    ? `${ranges.join("; ")} (${(course.fee_period || "Per year").toLowerCase()})`
    : course.published_fee_amount != null
      ? `Published fee: ${rupees(course.published_fee_amount)} (confirm fee period with university)`
      : "Fees not published";
}
