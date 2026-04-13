const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const sendMail = async ({ to, subject, html }) => {
    try {
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        // Trigger the token refresh
        const { token } = await oauth2Client.getAccessToken();

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const message = [
            `To: ${to}`,
            `Subject: ${subject}`,
            `Content-Type: text/html; charset=utf-8`,
            `MIME-Version: 1.0`,
            ``,
            html
        ].join('\n');

        const encodedMail = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMail }
        });

        console.log("✅ New Gmail Client Authorized and Email Sent");
    } catch (err) {
        console.error("❌ Gmail Error:", err.response ? err.response.data : err.message);
        throw err;
    }
};

const sendOTP = async (email, otp) => {
    const html = `<h2>Verify Your Account</h2><p>Your code is: <b>${otp}</b></p>`;
    return await sendMail({ to: email, subject: "Verification Code", html });
};

module.exports = { sendMail, sendOTP };