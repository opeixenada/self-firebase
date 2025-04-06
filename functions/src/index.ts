import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import {defineString} from "firebase-functions/params";

// Define params using Firebase Parameters
const emailUser = defineString("EMAIL_USER");
const emailPassword = defineString("EMAIL_PASSWORD");
const emailRecipient = defineString("EMAIL_RECIPIENT");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Define an interface for your contacts collection
interface ContactData {
  name: string;
  email: string;
  message: string;
  createdAt?: admin.firestore.Timestamp;
}

const sendEmail = async (
  transporter: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions
): Promise<void> => {
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email notification");
  }
};

const formatContactData = (data: ContactData, docId: string): string => {
  return `
    Contact ID: ${docId}
    Name: ${data.name || "Not provided"}
    Email: ${data.email || "Not provided"}
    Message: ${data.message || "Not provided"}
    Submitted: ${data.createdAt ?
    data.createdAt.toDate().toLocaleString() :
    new Date().toLocaleString()}
  `;
};

// Firestore trigger function
export const sendEmailOnNewContact = functions.firestore
  .onDocumentCreated("contacts/{docId}", async (event) => {
    // If data is not available, end function
    if (!event.data) {
      console.log("No data associated with the event");
      return;
    }

    // Validate environment variables at runtime
    if (!emailUser.value()) {
      console.error("EMAIL_USER is not set");
      throw new Error("EMAIL_USER is not set");
    }

    if (!emailPassword.value()) {
      console.error("EMAIL_PASSWORD is not set");
      throw new Error("EMAIL_PASSWORD is not set");
    }

    if (!emailRecipient.value()) {
      console.error("EMAIL_RECIPIENT is not set");
      throw new Error("EMAIL_RECIPIENT is not set");
    }

    const snapshot = event.data;
    const data = snapshot.data() as ContactData;
    const docId = event.params.docId;

    // Configure the email transporter at runtime
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser.value(),
        pass: emailPassword.value(),
      },
    });

    // Configure email content
    const mailOptions: nodemailer.SendMailOptions = {
      from: `Anna <${emailUser.value()}>`,
      to: emailRecipient.value(),
      subject: `New Contact Form Submission from ${data.name}`,
      text:
        `You've received a new contact form submission!\n${formatContactData(
          data,
          docId
        )}`,
    };

    return sendEmail(transporter, mailOptions);
  });
