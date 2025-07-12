import nodemailer from "nodemailer";
import { mailId, mailPassword } from "./environment";
interface EmailConfig {
  subject: string;
  text: string;
  html: string;
  email: string;
}
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: mailId,
      pass: mailPassword,
    },
  });
};
export const sendEmail = async ({ email, subject, text, html }: EmailConfig) => {
  const mailOptions = {
    from: mailId,
    to: email,
    subject,
    text,
    html,
  };
  const transporter = createTransporter();
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    return { success: false, error };
  }
};
