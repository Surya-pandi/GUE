"use client";
import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { saveCourseSelectionAction } from "@/app/actions";
import { courseCatalog, degreeOptions, feePeriods } from "@/lib/course-catalog";
import {
  programmeKey,
  uniqueProgrammes,
  type ProgrammeSelection,
} from "@/lib/course-selection";

function CustomOption({
  label,
  onAdd,
}: {
  label: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="custom-programme-option">
      <label className="field">
        <span>{label}</span>
        <input
          value={value}
          maxLength={100}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={value.trim().length < 2}
        onClick={() => {
          onAdd(value.trim());
          setValue("");
        }}
      >
        Add option
      </button>
    </div>
  );
}

export function CourseSelection({
  categories,
  institutionId,
  existing,
  continueSetup,
}: {
  categories: string[];
  institutionId: string;
  existing: ProgrammeSelection[];
  continueSetup: boolean;
}) {
  const [streams, setStreams] = useState<string[]>([]);
  const [degrees, setDegrees] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState<Record<string, string>>({});
  const [shared, setShared] = useState<Record<string, string>>({
    fee_period: "Per year",
  });
  const [scope, setScope] = useState("all");
  const [sharedMessage, setSharedMessage] = useState("");
  const [customCourses, setCustomCourses] = useState<Record<string, string[]>>(
    {},
  );
  const [customDegrees, setCustomDegrees] = useState<string[]>([]);
  const [selected, setSelected] = useState<ProgrammeSelection[]>([]);
  const [details, setDetails] = useState<
    Record<string, Record<string, string>>
  >({});
  const fieldProps = (
    programme: ProgrammeSelection,
    field: string,
    fallback = "",
  ) => ({
    value: details[programmeKey(programme)]?.[field] ?? fallback,
    onChange: (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const value = event.target.value;
      setDetails((previous) => ({
        ...previous,
        [programmeKey(programme)]: {
          ...previous[programmeKey(programme)],
          [field]: value,
        },
      }));
    },
  });
  const existingKeys = new Set(existing.map(programmeKey));
  const active = uniqueProgrammes(
    selected.filter(
      (item) =>
        streams.includes(item.stream) &&
        degrees[item.stream]?.includes(item.degree_type) &&
        !existingKeys.has(programmeKey(item)),
    ),
  );
  function toggleDegree(programme: ProgrammeSelection, checked: boolean) {
    setSelected((previous) =>
      checked
        ? uniqueProgrammes([...previous, programme])
        : previous.filter(
            (item) => programmeKey(item) !== programmeKey(programme),
          ),
    );
  }
  return (
    <div className="form-card wide course-selection">
      <h3>Select available programmes</h3>
      <p>
        Select multiple streams and degrees, then mark the courses available for
        each. Use a course checkbox to select it for all checked degrees, or
        choose individual combinations below it.
      </p>
      <ActionForm
        action={saveCourseSelectionAction}
        submitDisabled={active.length === 0 || active.length > 100}
        submit={
          continueSetup
            ? "Save selected programmes and continue"
            : "Save selected programmes"
        }
      >
        <input type="hidden" name="institution_id" value={institutionId} />
        <input
          type="hidden"
          name="continue_setup"
          value={String(continueSetup)}
        />
        <input type="hidden" name="programmes" value={JSON.stringify(active)} />
        <h4>1. Available streams</h4>
        <div className="programme-checkbox-grid">
          {categories.map((stream) => (
            <label className="check" key={stream}>
              <input
                type="checkbox"
                checked={streams.includes(stream)}
                onChange={(e) =>
                  setStreams(
                    e.target.checked
                      ? [...streams, stream]
                      : streams.filter((item) => item !== stream),
                  )
                }
              />
              {stream}
            </label>
          ))}
        </div>
        <h4>2. Select degrees and courses for each stream</h4>
        {!streams.length && (
          <p>Select one or more streams above to get started.</p>
        )}
        {streams.map((stream) => {
          const chosenDegrees = degrees[stream] || [];
          const names = [
            ...new Set([
              ...(courseCatalog[stream] || []),
              ...(customCourses[stream] || []),
            ]),
          ].filter((name) =>
            name.toLowerCase().includes((search[stream] || "").toLowerCase()),
          );
          const choicesFor = (name: string) =>
            chosenDegrees.map((degree_type) => ({ stream, name, degree_type }));
          const choices = names.flatMap(choicesFor);
          const isChecked = (item: ProgrammeSelection) =>
            existingKeys.has(programmeKey(item)) ||
            selected.some(
              (selection) => programmeKey(selection) === programmeKey(item),
            );
          const toggleChoices = (
            items: ProgrammeSelection[],
            checked: boolean,
          ) =>
            setSelected((previous) =>
              checked
                ? uniqueProgrammes([
                    ...previous,
                    ...items.filter(
                      (item) => !existingKeys.has(programmeKey(item)),
                    ),
                  ])
                : previous.filter(
                    (item) =>
                      !items.some(
                        (choice) => programmeKey(choice) === programmeKey(item),
                      ),
                  ),
            );
          return (
            <section className="programme-stream" key={stream}>
              <h3>{stream}</h3>
              <p>
                Select all degrees offered in this stream. Unchecking a degree
                excludes its programmes from this submission; existing saved
                programmes are unchanged.
              </p>
              <div className="programme-checkbox-grid">
                {[...new Set([...degreeOptions, ...customDegrees])].map(
                  (degree) => (
                    <label className="check" key={degree}>
                      <input
                        type="checkbox"
                        checked={chosenDegrees.includes(degree)}
                        onChange={(event) =>
                          setDegrees((previous) => ({
                            ...previous,
                            [stream]: event.target.checked
                              ? [...(previous[stream] || []), degree]
                              : (previous[stream] || []).filter(
                                  (value) => value !== degree,
                                ),
                          }))
                        }
                      />
                      {degree}
                    </label>
                  ),
                )}
              </div>
              <details>
                <summary>Degree not listed?</summary>
                <CustomOption
                  label={`Add a degree for ${stream}`}
                  onAdd={(value) => {
                    setCustomDegrees([...new Set([...customDegrees, value])]);
                    setDegrees({
                      ...degrees,
                      [stream]: [...new Set([...chosenDegrees, value])],
                    });
                  }}
                />
              </details>
              {chosenDegrees.length > 0 ? (
                <>
                  <p>
                    <strong>Selected degrees:</strong>{" "}
                    {chosenDegrees.join(", ")}
                  </p>
                  <label className="field">
                    <span>Find courses</span>
                    <input
                      type="search"
                      value={search[stream] || ""}
                      onChange={(event) =>
                        setSearch({ ...search, [stream]: event.target.value })
                      }
                      placeholder="Search by course name"
                    />
                  </label>
                  <div className="tags">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => toggleChoices(choices, true)}
                    >
                      Select all shown courses for {chosenDegrees.length}{" "}
                      degrees
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => toggleChoices(choices, false)}
                    >
                      Clear shown selections
                    </button>
                  </div>
                  <p>
                    A course checkbox selects every checked degree for that
                    course. Use the individual degree checkboxes for exceptions.
                  </p>
                  <div className="programme-checkbox-grid">
                    {names.map((name) => {
                      const items = choicesFor(name);
                      const allSaved = items.every((item) =>
                        existingKeys.has(programmeKey(item)),
                      );
                      return (
                        <div className="programme-course-options" key={name}>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={items.every(isChecked)}
                              disabled={allSaved}
                              onChange={(event) =>
                                toggleChoices(items, event.target.checked)
                              }
                            />
                            <strong>{name}</strong>
                          </label>
                          <div className="tags">
                            {items.map((item) => {
                              const saved = existingKeys.has(
                                programmeKey(item),
                              );
                              return (
                                <label className="check" key={item.degree_type}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked(item)}
                                    disabled={saved}
                                    onChange={(event) =>
                                      toggleDegree(item, event.target.checked)
                                    }
                                  />
                                  {item.degree_type}
                                  {saved ? " (already added)" : ""}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!names.length && (
                    <p>No matching courses. Add an unlisted course below.</p>
                  )}
                  <CustomOption
                    label="Add an unlisted course for selected degrees"
                    onAdd={(name) => {
                      setCustomCourses({
                        ...customCourses,
                        [stream]: [
                          ...new Set([...(customCourses[stream] || []), name]),
                        ],
                      });
                      toggleChoices(choicesFor(name), true);
                    }}
                  />
                </>
              ) : (
                <p>Select one or more degrees to mark available courses.</p>
              )}
            </section>
          );
        })}
        <h4>3. Review programmes and fees</h4>
        <p role="status">
          {active.length} new programme(s) selected. Add up to 100 at a time.
          Fee details are optional and belong to each programme separately.
        </p>
        {active.length > 0 && (
          <details className="programme-stream">
            <summary>
              Apply shared duration and fees to multiple programmes
            </summary>
            <p>
              Enter shared values once. Applying them replaces those fields for
              the selected group; blank fields leave existing details unchanged.
              You can edit any programme below afterwards.
            </p>
            <label className="field">
              <span>Apply to</span>
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              >
                <option value="all">All selected programmes</option>
                {[
                  ...new Set(
                    active.map((item) =>
                      JSON.stringify([item.stream, item.degree_type]),
                    ),
                  ),
                ].map((group) => (
                  <option key={group} value={group}>
                    {JSON.parse(group).join(" / ")}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Shared duration</span>
                <input
                  value={shared.duration || ""}
                  maxLength={100}
                  placeholder="e.g. 4 years"
                  onChange={(event) =>
                    setShared({ ...shared, duration: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Fee period</span>
                <select
                  value={shared.fee_period}
                  onChange={(event) =>
                    setShared({ ...shared, fee_period: event.target.value })
                  }
                >
                  {feePeriods.map((period) => (
                    <option key={period}>{period}</option>
                  ))}
                </select>
              </label>
            </div>
            {(["counselling", "management"] as const).map((quota) => (
              <div key={quota}>
                <h4>
                  {quota === "counselling"
                    ? "Counselling quota"
                    : "Management quota"}
                </h4>
                <div className="form-grid">
                  {(["min", "max"] as const).map((bound) => (
                    <label className="field" key={bound}>
                      <span>{bound === "min" ? "From" : "To"} (INR)</span>
                      <input
                        type="number"
                        min={0}
                        max={1000000000}
                        step="0.01"
                        value={shared[`${quota}_fee_${bound}`] || ""}
                        onChange={(event) =>
                          setShared({
                            ...shared,
                            [`${quota}_fee_${bound}`]: event.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                const values: Record<string, string> = {};
                if (shared.duration?.trim())
                  values.duration = shared.duration.trim();
                for (const quota of ["counselling", "management"]) {
                  const min = shared[`${quota}_fee_min`] || "",
                    max = shared[`${quota}_fee_max`] || "";
                  if (
                    Boolean(min) !== Boolean(max) ||
                    (min &&
                      (!Number.isFinite(Number(min)) ||
                        !Number.isFinite(Number(max)) ||
                        Number(min) < 0 ||
                        Number(max) < Number(min) ||
                        Number(max) > 1000000000))
                  ) {
                    setSharedMessage(
                      `Enter a valid From and To range for ${quota} quota.`,
                    );
                    return;
                  }
                  if (min) {
                    values[`${quota}_fee_min`] = min;
                    values[`${quota}_fee_max`] = max;
                    values.fee_period = shared.fee_period;
                  }
                }
                if (!Object.keys(values).length) {
                  setSharedMessage("Enter a duration or fee range to apply.");
                  return;
                }
                const targets = active.filter(
                  (item) =>
                    scope === "all" ||
                    JSON.stringify([item.stream, item.degree_type]) === scope,
                );
                setDetails((previous) => {
                  const next = { ...previous };
                  for (const item of targets)
                    next[programmeKey(item)] = {
                      ...next[programmeKey(item)],
                      ...values,
                    };
                  return next;
                });
                setSharedMessage(
                  `Shared details applied to ${targets.length} programme(s). Review them below before saving.`,
                );
              }}
            >
              Apply shared details
            </button>
            {sharedMessage && <p role="status">{sharedMessage}</p>}
          </details>
        )}
        {active.map((programme, index) => (
          <details className="programme-review" key={programmeKey(programme)}>
            <summary>
              {programme.degree_type} — {programme.name} · {programme.stream}
            </summary>
            <p>
              Confirm that this course and degree combination is offered by your
              university.
            </p>
            <label className="field">
              <span>Duration</span>
              <input
                name={`programme_${index}_duration`}
                {...fieldProps(programme, "duration")}
                maxLength={100}
                placeholder="e.g. 4 years"
              />
            </label>
            <label className="field">
              <span>Fee period</span>
              <select
                name={`programme_${index}_fee_period`}
                {...fieldProps(programme, "fee_period", "Per year")}
              >
                {feePeriods.map((period) => (
                  <option key={period}>{period}</option>
                ))}
              </select>
            </label>
            <p>
              Fees in INR. Enter both From and To, or leave both blank. Use
              equal amounts for a fixed fee.
            </p>
            {(
              [
                ["counselling", "Counselling quota"],
                ["management", "Management quota"],
              ] as const
            ).map(([quota, label]) => (
              <div key={quota}>
                <h4>{label}</h4>
                <div className="form-grid">
                  {(["min", "max"] as const).map((bound) => (
                    <label className="field" key={bound}>
                      <span>{bound === "min" ? "From" : "To"} (INR)</span>
                      <input
                        name={`programme_${index}_${quota}_fee_${bound}`}
                        {...fieldProps(programme, `${quota}_fee_${bound}`)}
                        type="number"
                        min={0}
                        max={1000000000}
                        step="0.01"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <label className="field">
              <span>Eligibility</span>
              <textarea
                name={`programme_${index}_eligibility`}
                {...fieldProps(programme, "eligibility")}
                maxLength={2000}
              />
            </label>
            <label className="field">
              <span>Additional details</span>
              <textarea
                name={`programme_${index}_description`}
                {...fieldProps(programme, "description")}
                maxLength={12000}
              />
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={() => toggleDegree(programme, false)}
            >
              Remove from selection
            </button>
          </details>
        ))}
        {active.length > 100 && (
          <p className="alert error">
            Select no more than 100 programmes in one save.
          </p>
        )}
      </ActionForm>
    </div>
  );
}
