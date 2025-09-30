import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

console.log(
  "SendGrid Key prefix:",
  process.env.SENDGRID_API_KEY?.substring(0, 10)
);
console.log("From email:", process.env.EMAIL_FROM);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: "fahadrehan723@gmail.com", // 👈 put your personal Gmail or any inbox
  from: process.env.EMAIL_FROM, // 👈 must match verified sender in SendGrid
  subject: "SendGrid API Test",
  text: "Hello, this is a SendGrid test email!",
};

sgMail
  .send(msg)
  .then(() => console.log("✅ Test email sent successfully"))
  .catch((err) => {
    console.error("❌ SendGrid error code:", err.code);
    console.error("❌ SendGrid error body:", err.response?.body);
  });
