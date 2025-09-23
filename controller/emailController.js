import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: `"My App" ${process.env.EMAIL_USER}`,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error(" Error sending email:", error);
  }
};
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "fahadrehan723@gmail.com",
    pass: "vsvdakafnlrnkayt",
  },
});
