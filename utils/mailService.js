

const nodemailer = require('nodemailer');

const sendEmail = async (option) => {

    // const transport = nodemailer.createTransport({
    //     host: process.env.TRANSPORTER_HOST,
    //     port: process.env.TRANSPORTER_PORT*1,
    //     auth: {
    //       user: process.env.TRANSPORTER_USER,
    //       pass: process.env.TRANSPORTER_PASS
    //     }
    //   });
    const transport = nodemailer.createTransport({
        service: "gmail",  
        auth: {
          user: process.env.GMAIL_USER, 
          pass: process.env.GMAIL_PASS 
        }
    });

    const emailOptions = {
        from: `SceneIt Support <${process.env.GMAIL_USER}>`,
        to: option.email,
        subject: option.subject,
        text: option.message,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
                <h2 style="color: #2C3E50;">Hello,</h2>
                <p>${option.message}</p>
                <a href="${option.requestURL}" 
                style="display: inline-block; padding: 10px 20px; text-decoration: none;">
                ${option.requestURL}
                </a>
                <p style="margin-top:20px; font-size: 12px; color: #888;">
                If you didn’t request this, please ignore this email.
                </p>
            </div>`
    }

    await transport.sendMail(emailOptions)
}

module.exports = sendEmail;