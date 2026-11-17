// O Resend fornece a chave e o domínio verificado pela integração conectada.
function getEmailSender() {
  const explicitSender = process.env.EMAIL_FROM?.trim()
  if (explicitSender) return explicitSender

  const domain = process.env.RESEND_EMAIL_DOMAIN?.trim().toLowerCase()
  if (!domain || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) return null
  return `Minha Vitrine <nao-responda@${domain}>`
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && getEmailSender())
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = getEmailSender()
  if (!apiKey || !from) {
    throw new Error('Provedor de e-mail não configurado (RESEND_API_KEY e RESEND_EMAIL_DOMAIN)')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  })

  if (!response.ok) {
    throw new Error(`Falha ao enviar e-mail pelo Resend (${response.status})`)
  }
}

export async function sendPasswordResetEmail(input: { to: string; name: string; url: string }) {
  const name = escapeHtml(input.name)
  const url = escapeHtml(input.url)

  await sendEmail({
    to: input.to,
    subject: 'Redefinir sua senha da Minha Vitrine',
    html: `
      <div style="margin:0;background:#f7f5f8;padding:32px 16px;font-family:Arial,sans-serif;color:#19171a">
        <div style="max-width:560px;margin:0 auto;border-radius:20px;background:#ffffff;padding:32px">
          <p style="margin:0 0 24px;font-size:14px;font-weight:700;color:#466c4d">Minha Vitrine</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">Redefina sua senha</h1>
          <p style="font-size:16px;line-height:1.6">Olá, ${name}.</p>
          <p style="font-size:16px;line-height:1.6">Recebemos uma solicitação para criar uma nova senha para sua conta. Use o botão abaixo para continuar.</p>
          <p style="margin:28px 0">
            <a href="${url}" style="display:inline-block;border-radius:999px;background:#111111;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700">Criar nova senha</a>
          </p>
          <p style="font-size:14px;line-height:1.6;color:#66616a">O link expira em 1 hora e só pode ser usado uma vez. Se você não pediu a redefinição, ignore este e-mail.</p>
        </div>
      </div>
    `,
  })
}
