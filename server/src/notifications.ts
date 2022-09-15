import mailer from 'nodemailer';
import { queryFunc } from './sql';
import log from './log';
import { limitStr } from './util';

let transporter: mailer.Transporter | undefined;

function setUpTransporter() {
    transporter = mailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_Id,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN
        }
    });

    log.log`Set up Gmail mailer`;
    log.log`Gmail user: ${process.env.GMAIL_USER}`;
}

async function mail({
                        to,
                        subject,
                        html,
                        attachments = []
                    }: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content: string;
        contentType: string;
    }>;
}): Promise<true | string> {
    if (process.env.ALLOW_MAIL !== '1') {
        log.warn`Cannot send emails because ALLOW_MAIL is not set`;
        log.log`Tried to send email to ${to} '${subject}' with html: ${limitStr(html)}`;
        return true;
    }

    if (process.env.REROUTE_MAIL) {
        html = `<p>This email was rerouted from '${to}' (REROUTE_MAIL is set)</p>` + html;
        to = process.env.REROUTE_MAIL;
    }

    if (!transporter) {
        setUpTransporter();
    }

    const emailFooter = `
        <hr>
        <p>
            <small>
                This is an automated email from
                <a href="${process.env.WEB_URL}">${process.env.WEB_URL}</a>.
                <br>
                Please contact us at
                <a href="mailto:${process.env.GMAIL_USER}">${process.env.GMAIL_USER}</a> 
                if you have any questions.
            </small>
        </p>
    `;

    return await new Promise((resolve, reject) => {
        transporter?.sendMail(
            {
                from: process.env.GMAIL_USER,
                to,
                subject,
                html: html + emailFooter,
                attachments
            },
            (err, info) => {
                if (err) {
                    log.error`Error sending email: ${JSON.stringify(err)}`;
                    reject(`Error sending email: ${JSON.stringify(err)}`);
                    return;
                }
                if (!info['accepted'].includes(to)) {
                    reject(`Email failed to send`);
                    log.warn`Sent email to ${to} failed: ${JSON.stringify(info)}`;
                    return;
                }
                log.log`Sent email to ${to}`;
                resolve(true);
            }
        );
    });
}

async function sendEmailToUser(query: queryFunc, userId: string, subject: string, html: string) {
    const users = await query`
        SELECT email
        FROM users
        WHERE id = ${userId}
    `;
    if (!users[0] || !users.length) {
        return 'Invalid userId';
    }
    const email = users[0].email;
    return await mail({
        to: email,
        subject,
        html
    });
}

// Exposed

export async function forgottenPasswordEmail(
    query: queryFunc,
    userId: string,
    newSessionId: string
): Promise<string | true> {
    return await sendEmailToUser(
        query,
        userId,
        'Forgotten Password',
        `
        <h3>You have requested to reset your password.</h3>
        <p style="padding: 20px;">
            To reset your password, click the link, which will expire in 1 hour.
            <b>
            <a href="${process.env.SITE_ROOT}/set-password?s=${newSessionId}">
                Reset Password
            </a>
        </p>
    `
    );
}