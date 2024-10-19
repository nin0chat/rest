import { config } from "../config";

export async function sendEmail(
    to: string[],
    subject: string,
    template_id: string,
    template_data?: object,
    bcc?: string[]
) {
    console.log(`Sending email to ${to} with ${bcc} with template ${template_id}`);
    const q = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Smtp2go-Api-Key": config.smtp2goKey,
            accept: "application/json"
        },
        body: JSON.stringify({
            sender: "nin0chat <chat@nin0.dev>",
            subject,
            to,
            bcc,
            template_id,
            template_data
        })
    });
    const r = await q.json();
    console.log(r);
}
