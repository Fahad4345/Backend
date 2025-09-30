import sgMail from "@sendgrid/mail";

console.log(
  "SendGrid API Key loaded:",
  process.env.SENDGRID_API_KEY ? "✓ Key exists" : "✗ Key missing"
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendResetEmail(to, resetUrl) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("Environment check:");
  console.log("- API Key exists:", !!process.env.SENDGRID_API_KEY);
  console.log(
    "- API Key starts with:",
    process.env.SENDGRID_API_KEY?.substring(0, 8)
  );
  console.log("- Email From:", process.env.EMAIL_FROM);
  console.log("Preparing to send reset email to:", to);

  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" target="_blank">Reset your password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("✅ Controller email sent successfully");
    return { success: true };
  } catch (error) {
    console.error(
      "❌ Controller SendGrid error:",
      error.response?.body || error
    );
    throw error;
  }
}
