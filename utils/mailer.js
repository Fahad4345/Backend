import sgMail from "@sendgrid/mail";

export async function sendResetPassword(to, resetUrl) {
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
      <a href="${resetUrl}" target="_blank"><button classname=" border-[1px] rounded-[4px] px-[14px] py-[14px] flex justify-center items-center text-white bg-black">Reset your password</button></a>
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

export async function sendContactEmail(to, text) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject: "Ecommerce Contact Mail",
    html: `
      <p>You have received a new contact form submission.</p>
      <p><strong>Message:</strong> ${text}</p>
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

export async function sendSubscribeEmail(email) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: " Promo Code",
    html: `
      <p>You Promo Code is Y78op0g.</p>
      <p>Use it at checkout to get a discount!</p>
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
