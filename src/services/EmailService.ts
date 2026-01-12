import nodemailer from 'nodemailer';
import dotenv from 'dotenv';


dotenv.config();

interface EmailOptions {
    from?: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
}

const emailSendingEnabled = () =>
    Boolean(
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    );

const createTransporter = () =>
    nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });


/**
* Send password reset OTP (6-digit)
* @param {string} email
* @param {string} otp - 6-digit code
*/

export const sendPasswordResetEmail = async (email: string, otp: string) => {
    if (!emailSendingEnabled()) {
        console.warn('Email sending is not configured.');
        return;
    }

    const transporter = createTransporter();

    const mailOptions: EmailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Password Reset OTP',
        text: `Hi there, \n\nYour password reset OTP is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
};

/**
 * Send account verification email
 * @param {string} email
 * @param {string} verificationLink
 */

export const sendAccountVerificationEmail = async (email: string, verificationLink: string) => {
    try {
        if (!emailSendingEnabled()) {
            console.warn('Email sending is not configured.');
            return;
        }
        const transporter = createTransporter();
        const mailOptions: EmailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'Account Verification',
            text: `Click the following link to verify your account: ${verificationLink}`,
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending account verification email:', error);
        throw error;
    }
}


// Send confirmation email after password has been reset
export const sendPasswordResetConfirmation = async (email: string) => {
    try {
        console.log("\n=== PASSWORD RESET CONFIRMATION ===");
        console.log(`To: ${email}`);
        console.log("Message: Password has been reset.\n");

        if (!emailSendingEnabled()) return true;

        const transporter = createTransporter();

        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: "Your Password Was Reset",
            text: `Your password has been successfully reset.`,
            html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Password Reset Successful</h2>
          <p>Your password has been updated.</p>
          <p>If this wasn't you, contact support immediately.</p>
        </div>
      `,
        });

        return true;
    } catch (error) {
        console.error("Error sending confirmation:", error);
        return false;
    }
};