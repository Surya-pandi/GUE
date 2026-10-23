"use client";
import { useState } from "react";
import type { Course } from "@/lib/data";
import { courseCatalog, degreeOptions, feePeriods } from "@/lib/course-catalog";

function Choice({
  label,
  name,
  options,
  initial = "",
  required = false,
}: {
  label: string;
  name: string;
  options: string[];
  initial?: string;
  required?: boolean;
}) {
  const [choice, setChoice] = useState(
    initial && !options.includes(initial) ? "__custom" : initial,
  );
  return (
    <label className="field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <select
        name={choice === "__custom" ? undefined : name}
        value={choice}
        required={required}
        onChange={(e) => setChoice(e.target.value)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
        <option value="__custom">Other (enter your own)</option>
      </select>
      {choice === "__custom" && (
        <input
          name={name}
          aria-label={`Custom ${label.toLowerCase()}`}
          placeholder={`Enter ${label.toLowerCase()}`}
          required
          maxLength={name === "name" ? 180 : 100}
          defaultValue={initial && !options.includes(initial) ? initial : ""}
        />
      )}
    </label>
  );
}
export function CourseFields({
  course,
  categories,
}: {
  course?: Course;
  categories: string[];
}) {
  const [stream, setStream] = useState(
    course?.stream || categories[0] || "Engineering",
  );
  const options = [
    ...new Set([...categories, ...(course?.stream ? [course.stream] : [])]),
  ];
  return (
    <>
      {course &&
        course.counselling_fee_min == null &&
        course.management_fee_min == null && (
          <input
            type="hidden"
            name="published_fee_amount"
            value={course.published_fee_amount ?? ""}
          />
        )}
      <div className="form-grid">
        <label className="field">
          <span>Stream *</span>
          <select
            name="stream"
            required
            value={stream}
            onChange={(e) => setStream(e.target.value)}
          >
            {options.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <Choice
          key={stream}
          label="Course / specialisation"
          name="name"
          required
          options={courseCatalog[stream] || []}
          initial={stream === course?.stream ? course.name : ""}
        />
        <Choice
          label="Degree"
          name="degree_type"
          required
          options={degreeOptions}
          initial={course?.degree_type}
        />
        <Choice
          label="Duration"
          name="duration"
          options={[
            "6 months",
            "1 year",
            "2 years",
            "3 years",
            "4 years",
            "5 years",
            "5.5 years",
            "6 years",
          ]}
          initial={course?.duration}
        />
      </div>
      <h3>Fee structure (INR)</h3>
      <p>
        Enter the minimum and maximum tuition fees for each quota. Leave both
        fields blank if a quota does not apply or fees are not yet available.
        For a fixed fee, enter the same amount in both fields.
      </p>
      <label className="field">
        <span>Fee period</span>
        <select
          name="fee_period"
          defaultValue={course?.fee_period || "Per year"}
        >
          {feePeriods.map((period) => (
            <option key={period}>{period}</option>
          ))}
        </select>
      </label>
      {(
        [
          ["counselling", "Counselling quota"],
          ["management", "Management quota"],
        ] as const
      ).map(([quota, label]) => (
        <fieldset key={quota} className="quota-fees">
          <legend>{label}</legend>
          <div className="form-grid">
            {(["min", "max"] as const).map((bound) => (
              <label className="field" key={bound}>
                <span>{bound === "min" ? "From" : "To"} (INR, optional)</span>
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  name={`${quota}_fee_${bound}`}
                  defaultValue={course?.[`${quota}_fee_${bound}`] ?? ""}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}
