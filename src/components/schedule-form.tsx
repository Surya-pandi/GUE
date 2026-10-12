"use client";
import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { manageAction } from "@/app/actions";
export function ScheduleForm({ institutionId }: { institutionId: string }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [kind, setKind] = useState("counselling");
  const utc = (value: string) => {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : "";
  };
  return (
    <div className="form-card wide">
      <h3>Make time for a new conversation.</h3>
      <p>
        Choose a date and time in your local time zone. Counselling sessions are
        assigned to you.
      </p>
      <ActionForm action={manageAction} submit="Add availability">
        <input type="hidden" name="operation" value="slot" />
        <input type="hidden" name="institution_id" value={institutionId} />
        <input type="hidden" name="starts_at" value={utc(start)} />
        <input type="hidden" name="ends_at" value={utc(end)} />
        <label className="field">
          <span>Booking type</span>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="counselling">Online counselling</option>
            <option value="visit">Campus visit</option>
          </select>
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Starts at</span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Ends at</span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
            />
          </label>
          {kind === "visit" && (
            <label className="field">
              <span>Maximum visitors</span>
              <input
                type="number"
                name="capacity"
                min={1}
                max={200}
                defaultValue={10}
                required
              />
            </label>
          )}
        </div>
        <p className="form-note">
          To make an exception for a particular date, close that slot below.
          Closing a slot does not cancel existing bookings.
        </p>
      </ActionForm>
    </div>
  );
}
