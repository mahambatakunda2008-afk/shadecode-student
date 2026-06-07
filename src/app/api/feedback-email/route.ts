import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    const { type, message, userId } = await req.json();

    const email = await resend.emails.send({
      from: "Shadecode <onboarding@resend.dev>",
      to: process.env.FEEDBACK_EMAIL!,
      subject: `🧠 New Feedback: ${type}`,
      text: `
NEW FEEDBACK RECEIVED

Type: ${type}
User: ${userId ?? "anonymous"}

Message:
${message}

---
Shadecode Feedback System
      `,
    });

    if (email.error) {
      console.error(email.error);
      return Response.json({ success: false }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Email route error:", err);
    return Response.json({ success: false }, { status: 500 });
  }
}