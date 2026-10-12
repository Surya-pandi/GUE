import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { forgotAction } from "@/app/actions";
import { configured } from "@/lib/config";
export const metadata = { title: "Reset your password" };
export default function Forgot() {
  return (
    <div className="container">
      <div className="form-card">
        <h1>A fresh start.</h1>
        <p>Enter your account email and we’ll send a recovery link.</p>
        {!configured && (
          <p className="alert">Account services are not connected yet.</p>
        )}
        <ActionForm
          action={forgotAction}
          submit="Send recovery link"
          disabled={!configured}
        >
          <Field label="Email address" name="email" type="email" required />
        </ActionForm>
      </div>
    </div>
  );
}
